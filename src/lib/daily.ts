import { getDailyPool, resolveDemonById, type PointercrateDemon } from "@/lib/pointercrate";
import { SCHEDULE } from "@/lib/schedule";
import { freezePool, freezeTargetId, getFrozenPool, getFrozenTargetId, getFrozenTargetIds } from "@/lib/targets";
import type { Difficulty } from "@/types/game";

const DIFFICULTIES: Difficulty[] = ["easy", "hard", "extreme"];

/**
 * A seeded pick never lands on a level that was any tier's answer in this many
 * preceding days (3 tiers x 30 days = at most 90 of the 150 excluded, so there
 * are always plenty left). SCHEDULE overrides ignore this — those are deliberate.
 */
const NO_REPEAT_DAYS = 30;

/** First day the daily puzzle ran — used only to number puzzles for display ("Puzzle #12"). */
const LAUNCH_DATE = "2026-08-04";

export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Today's date in whatever timezone the caller is running in. Only meaningful
 * client-side — the server has no notion of a player's timezone, so this must
 * be called from a "use client" component, not during SSR.
 */
export function todayLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function puzzleNumber(dateStr: string = todayUTC()): number {
  const [ly, lm, ld] = LAUNCH_DATE.split("-").map(Number);
  const launch = Date.UTC(ly, lm - 1, ld);
  const [y, m, d] = dateStr.split("-").map(Number);
  const current = Date.UTC(y, m - 1, d);
  const days = Math.round((current - launch) / 86_400_000);
  return Math.max(1, days + 1);
}

/**
 * Deterministic 32-bit hash so every player gets the same daily target: FNV-1a
 * followed by murmur3's fmix32 finalizer. The finalizer matters — the old
 * plain djb2 hash barely changed between consecutive dates (only the last
 * character differs), so Easy walked down the list one spot per day and
 * Hard/Extreme kept landing on the same handful of spots. fmix32 makes every
 * input bit affect every output bit, so consecutive dates pick unrelated levels.
 *
 * Changing this only affects dates that were never frozen — every date that
 * was ever played keeps its frozen target (see targets.ts).
 */
function seedFromDate(dateStr: string, difficulty: Difficulty): number {
  const input = `${dateStr}:${difficulty}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

/** The `count` calendar dates immediately before dateStr, as YYYY-MM-DD. */
function previousDates(dateStr: string, count: number): string[] {
  const [y, m, d] = dateStr.split("-").map(Number);
  const base = Date.UTC(y, m - 1, d);
  return Array.from({ length: count }, (_, i) =>
    new Date(base - (i + 1) * 86_400_000).toISOString().slice(0, 10)
  );
}

/**
 * Returns the pool to use for a date: the frozen historical snapshot if one
 * exists, otherwise the live pool — which this then freezes for next time.
 * Without this, only the *target* was pinned per date; the surrounding pool
 * (everyone else's names/positions/etc., which drives autocomplete search and
 * the guess-position comparisons) still silently drifted to whatever the live
 * top-150 looks like today, which makes replaying an old puzzle feel wrong
 * even though the answer itself was correct. Freezing the whole pool the
 * first time a date is ever touched fixes that going forward. Shared by all
 * three difficulties (see freezePool in targets.ts), so this only actually
 * hits the network once per date, not once per date+difficulty.
 */
export async function getPoolForDate(dateStr: string): Promise<PointercrateDemon[]> {
  const frozen = await getFrozenPool(dateStr);
  if (frozen) return frozen;
  const pool = await getDailyPool();
  await freezePool(dateStr, pool);
  return pool;
}

/**
 * Resolves all three difficulties' targets for a date together, since each
 * day's three levels must be distinct from one another. Resolution order is
 * easy -> hard -> extreme. A seeded pick chooses among the pool minus the
 * levels already used today and minus anything that was an answer in the
 * last NO_REPEAT_DAYS days.
 *
 * Every date+difficulty is permanently pinned (see targets.ts) the first time
 * it's ever resolved, so replaying an old date always shows the same puzzle
 * that was actually played that day — even if the live Pointercrate list has
 * since reshuffled enough to change what the schedule/seed logic would now
 * compute. Pass 1 below applies any existing freeze; Pass 2 computes (via the
 * same SCHEDULE-then-seed logic as before) and freezes whatever's left.
 */
export async function getDailyTargets(
  dateStr: string = todayUTC()
): Promise<Record<Difficulty, PointercrateDemon>> {
  const pool = await getPoolForDate(dateStr);
  const usedIds = new Set<number>();
  const result = {} as Record<Difficulty, PointercrateDemon>;
  const pending: Difficulty[] = [];

  // Pass 1: honor any existing freeze. A frozen demon may have since fallen
  // off the live pool entirely — resolveDemonById falls back to a direct
  // detail fetch by id in that case, so it stays resolvable either way.
  for (const difficulty of DIFFICULTIES) {
    const frozenId = await getFrozenTargetId(dateStr, difficulty);
    if (frozenId == null) {
      pending.push(difficulty);
      continue;
    }
    const demon = await resolveDemonById(frozenId, pool);
    if (!demon) {
      // Extremely rare: pointercrate has fully deleted this demon. Don't
      // touch the frozen key over what may be a transient failure — just
      // fall back to a fresh computation for this one request.
      pending.push(difficulty);
      continue;
    }
    usedIds.add(demon.id);
    result[difficulty] = demon;
  }

  // Pass 2: compute (SCHEDULE override, else seeded pick avoiding today's other
  // targets and recent answers) and freeze whatever wasn't already frozen.
  const recentIds =
    pending.length > 0
      ? await getFrozenTargetIds(previousDates(dateStr, NO_REPEAT_DAYS), DIFFICULTIES)
      : new Set<number>();

  for (const difficulty of pending) {
    const scheduledId = SCHEDULE[dateStr]?.[difficulty];
    let demon: PointercrateDemon | undefined;

    if (scheduledId !== undefined) {
      const scheduled = pool.find((d) => d.id === scheduledId);
      if (scheduled) {
        if (usedIds.has(scheduled.id)) {
          console.warn(
            `SCHEDULE[${dateStr}].${difficulty} = ${scheduledId} collides with another difficulty's target for the same date — levels are supposed to differ.`
          );
        }
        demon = scheduled;
      } else {
        console.warn(
          `SCHEDULE[${dateStr}].${difficulty} = ${scheduledId}, but that id isn't in the current top-150 pool — falling back to the seeded pick.`
        );
      }
    }

    if (!demon) {
      let candidates = pool.filter((d) => !usedIds.has(d.id) && !recentIds.has(d.id));
      // Only reachable with a tiny pool; fall back to just avoiding today's other tiers.
      if (candidates.length === 0) candidates = pool.filter((d) => !usedIds.has(d.id));
      demon = candidates[seedFromDate(dateStr, difficulty) % candidates.length];
    }

    usedIds.add(demon.id);
    result[difficulty] = demon;
    await freezeTargetId(dateStr, difficulty, demon.id);
  }

  return result;
}

export async function getDailyTarget(
  dateStr: string = todayUTC(),
  difficulty: Difficulty = "easy"
): Promise<{ target: PointercrateDemon; pool: PointercrateDemon[] }> {
  const [pool, targets] = await Promise.all([getPoolForDate(dateStr), getDailyTargets(dateStr)]);
  return { target: targets[difficulty], pool };
}

