import { getDailyPool, type PointercrateDemon } from "@/lib/pointercrate";
import { SCHEDULE } from "@/lib/schedule";
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
 * Resolves all three difficulties' targets for a date together, since each
 * day's three levels must be distinct from one another. Resolution order is
 * easy -> hard -> extreme (easy is the backward-compatible anchor); a salted
 * pick that collides with an already-resolved tier's index is deterministically
 * walked forward (linear probing) until it lands on a free slot.
 */
export async function getDailyTargets(
  dateStr: string = todayUTC()
): Promise<Record<Difficulty, PointercrateDemon>> {
  const pool = await getDailyPool();
  const usedIndices = new Set<number>();
  const result = {} as Record<Difficulty, PointercrateDemon>;

  for (const difficulty of DIFFICULTIES) {
    const scheduledId = SCHEDULE[dateStr]?.[difficulty];
    if (scheduledId !== undefined) {
      const scheduledIndex = pool.findIndex((demon) => demon.id === scheduledId);
      if (scheduledIndex !== -1) {
        if (usedIndices.has(scheduledIndex)) {
          console.warn(
            `SCHEDULE[${dateStr}].${difficulty} = ${scheduledId} collides with another difficulty's target for the same date — levels are supposed to differ.`
          );
        }
        usedIndices.add(scheduledIndex);
        result[difficulty] = pool[scheduledIndex];
        continue;
      }
      console.warn(
        `SCHEDULE[${dateStr}].${difficulty} = ${scheduledId}, but that id isn't in the current top-150 pool — falling back to the seeded pick.`
      );
    }

    let index = seedFromDate(dateStr, difficulty) % pool.length;
    let attempt = 1;
    while (usedIndices.has(index)) {
      index = (index + attempt) % pool.length;
      attempt += 1;
    }
    usedIndices.add(index);
    result[difficulty] = pool[index];
  }

  return result;
}

export async function getDailyTarget(
  dateStr: string = todayUTC(),
  difficulty: Difficulty = "easy"
): Promise<{ target: PointercrateDemon; pool: PointercrateDemon[] }> {
  const [pool, targets] = await Promise.all([getDailyPool(), getDailyTargets(dateStr)]);
  return { target: targets[difficulty], pool };
}

