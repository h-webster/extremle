import { Redis } from "@upstash/redis";
import type { PointercrateDemon } from "@/lib/pointercrate";
import type { Difficulty } from "@/types/game";

/**
 * Permanent per-date-per-difficulty target pinning. Without this, the daily
 * target is recomputed from scratch against the LIVE Pointercrate pool every
 * time it's requested — so a past date's answer can silently drift (or, for
 * an owner-curated date, silently swap to a different demon) as the live list
 * reshuffles over time. The first time a date+difficulty is ever resolved,
 * that pick is written here and never recomputed again.
 *
 * Same conditional-client / graceful-no-op pattern as completions.ts: if the
 * Redis env vars aren't set (e.g. local dev), freezing simply never
 * activates and the game behaves exactly like it did before this existed.
 */
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

function targetKey(date: string, difficulty: Difficulty) {
  return `demonle:target:${date}:${difficulty}`;
}

/** Returns the permanently-pinned demon id for this date+difficulty, or null if never frozen (or Redis unavailable). */
export async function getFrozenTargetId(date: string, difficulty: Difficulty): Promise<number | null> {
  if (!redis) return null;
  try {
    const id = await redis.get<number>(targetKey(date, difficulty));
    return id ?? null;
  } catch (err) {
    console.error("Failed to read frozen target", date, difficulty, err);
    return null;
  }
}

/**
 * Pins a date+difficulty's target forever, the first time it's resolved.
 * Uses set-if-not-exists so concurrent first-time resolutions race safely —
 * whichever request's write lands first wins, the loser's write is a no-op.
 */
export async function freezeTargetId(date: string, difficulty: Difficulty, id: number): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(targetKey(date, difficulty), id, { nx: true });
  } catch (err) {
    console.error("Failed to freeze target", date, difficulty, err);
  }
}

function poolKey(date: string) {
  return `demonle:pool:${date}`;
}

/**
 * Returns the permanently-pinned pool snapshot for this date — the full top-150
 * roster exactly as it looked the first time this date was ever resolved — or
 * null if never frozen (or Redis unavailable). Shared across all three
 * difficulties: the pool doesn't vary by difficulty, only which demon within
 * it each tier's target is.
 */
export async function getFrozenPool(date: string): Promise<PointercrateDemon[] | null> {
  if (!redis) return null;
  try {
    const pool = await redis.get<PointercrateDemon[]>(poolKey(date));
    return pool ?? null;
  } catch (err) {
    console.error("Failed to read frozen pool", date, err);
    return null;
  }
}

/**
 * Pins a date's full pool snapshot forever, the first time it's resolved.
 * Same set-if-not-exists race safety as freezeTargetId — whichever concurrent
 * first-time resolution lands first wins.
 */
export async function freezePool(date: string, pool: PointercrateDemon[]): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(poolKey(date), pool, { nx: true });
  } catch (err) {
    console.error("Failed to freeze pool", date, err);
  }
}

/**
 * Overwrites an already-frozen target. Not called anywhere in the app itself —
 * exists only for scripts/fix-target.mjs, the manual escape hatch for
 * correcting a date that drifted before freezing existed, or was frozen wrong.
 */
export async function forceOverwriteTargetId(date: string, difficulty: Difficulty, id: number): Promise<void> {
  if (!redis) return;
  await redis.set(targetKey(date, difficulty), id);
}
