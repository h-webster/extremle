import { getDailyPool, resolveDemonById, type PointercrateDemon } from "@/lib/pointercrate";
import { SCHEDULE } from "@/lib/schedule";
import { freezePool, freezeTargetId, getFrozenPool, getFrozenTargetId } from "@/lib/targets";
import type { Difficulty } from "@/types/game";

const DIFFICULTIES: Difficulty[] = ["easy", "hard", "extreme"];

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
 * Deterministic 32-bit hash (djb2) so every player gets the same daily target.
 * Easy stays unsalted (hashes the date alone) for backward compatibility with
 * puzzles already played before difficulty tiers existed — Hard/Extreme salt
 * the input with the difficulty name so they diverge from Easy's pick.
 */
function seedFromDate(dateStr: string, difficulty: Difficulty): number {
  const input = difficulty === "easy" ? dateStr : `${dateStr}:${difficulty}`;
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
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
 * easy -> hard -> extreme (easy is the backward-compatible anchor); a salted
 * pick that collides with an already-resolved tier's demon is deterministically
 * walked forward (linear probing) until it lands on a free slot.
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

  // Pass 2: compute (SCHEDULE override, else seeded pick with linear-probe
  // collision avoidance against usedIds) and freeze whatever wasn't already frozen.
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
      let index = seedFromDate(dateStr, difficulty) % pool.length;
      let attempt = 1;
      while (usedIds.has(pool[index].id)) {
        index = (index + attempt) % pool.length;
        attempt += 1;
      }
      demon = pool[index];
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

