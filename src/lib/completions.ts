import { Redis } from "@upstash/redis";
import type { Difficulty } from "@/types/game";

/**
 * Cross-player completion counts, per puzzle date. This is the one piece of
 * state that genuinely can't live in localStorage — it has to be shared and
 * mutated by every player, so it lives in Upstash Redis instead. Everything
 * else in this app stays client-side/localStorage on purpose.
 *
 * If UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN aren't set (e.g. local
 * dev without a Redis instance wired up), this quietly no-ops — the game
 * itself must never fail or block because this stat is unavailable.
 */
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

function playedKey(date: string, difficulty: Difficulty) {
  return `demonle:completions:${date}:${difficulty}:played`;
}

function wonKey(date: string, difficulty: Difficulty) {
  return `demonle:completions:${date}:${difficulty}:won`;
}

export interface CompletionStats {
  played: number;
  won: number;
}

/** Records one finished game (win or loss) and returns the updated counts, including this one. */
export async function recordCompletion(
  date: string,
  difficulty: Difficulty,
  won: boolean
): Promise<CompletionStats | null> {
  if (!redis) return null;
  try {
    const pipeline = redis.pipeline();
    pipeline.incr(playedKey(date, difficulty));
    if (won) {
      pipeline.incr(wonKey(date, difficulty));
    } else {
      pipeline.get<number>(wonKey(date, difficulty));
    }
    const [played, wonCount] = await pipeline.exec<[number, number | null]>();
    return { played, won: wonCount ?? 0 };
  } catch (err) {
    console.error("Failed to record completion stats", err);
    return null;
  }
}
