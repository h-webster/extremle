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

/**
 * Total finished games (all three difficulties combined) for each of the given
 * dates, in a single MGET. Dates nobody finished come back as 0. Returns null
 * if Redis is unavailable, so callers can just hide the numbers.
 */
export async function getPlayedTotals(dates: string[]): Promise<Record<string, number> | null> {
  if (!redis) return null;
  if (dates.length === 0) return {};
  const difficulties: Difficulty[] = ["easy", "hard", "extreme"];
  try {
    const keys = dates.flatMap((date) => difficulties.map((d) => playedKey(date, d)));
    const values = await redis.mget<(number | null)[]>(...keys);
    const totals: Record<string, number> = {};
    dates.forEach((date, i) => {
      let sum = 0;
      for (let j = 0; j < difficulties.length; j++) sum += Number(values[i * difficulties.length + j] ?? 0);
      totals[date] = sum;
    });
    return totals;
  } catch (err) {
    console.error("Failed to read completion totals", err);
    return null;
  }
}
