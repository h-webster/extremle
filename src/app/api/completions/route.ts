import { NextResponse } from "next/server";
import { getPlayedTotals } from "@/lib/completions";

// Same Edge Runtime as the other API routes (see levels/route.ts). This one
// only talks to Redis, not pointercrate, but keeping all routes on one
// runtime avoids surprises.
export const runtime = "edge";

const LAUNCH_DATE = "2026-08-04";

/** Every date from launch through tomorrow (UTC) — covers every player's local "today". */
function allDates(): string[] {
  const [ly, lm, ld] = LAUNCH_DATE.split("-").map(Number);
  const end = Date.now() + 86_400_000;
  const dates: string[] = [];
  for (let ms = Date.UTC(ly, lm - 1, ld); ms <= end; ms += 86_400_000) {
    dates.push(new Date(ms).toISOString().slice(0, 10));
  }
  return dates;
}

export interface CompletionTotalsResponse {
  /** Finished games per puzzle date, all difficulties combined. */
  byDate: Record<string, number>;
  /** Finished games across every puzzle ever. */
  total: number;
}

/**
 * Cross-player finished-game counts for the archive page. Read-only, and
 * cached at the edge for a few minutes since the archive doesn't need
 * up-to-the-second numbers.
 */
export async function GET() {
  const byDate = await getPlayedTotals(allDates());
  if (!byDate) {
    return NextResponse.json({ error: "Completion stats unavailable" }, { status: 503 });
  }
  const total = Object.values(byDate).reduce((a, b) => a + b, 0);
  return NextResponse.json<CompletionTotalsResponse>(
    { byDate, total },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}
