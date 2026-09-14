import { NextRequest, NextResponse } from "next/server";
import { getPoolForDate } from "@/lib/daily";
import { getDailyPool, resolveDemonById } from "@/lib/pointercrate";
import { getFrozenTargetId } from "@/lib/targets";
import type { Difficulty, LevelOption } from "@/types/game";

// Required: pointercrate.com is fronted by Cloudflare, which serves an
// interactive JS challenge ("Just a moment...", 403) to requests from
// Vercel's default Node serverless IPs. Edge Runtime routes through a
// different network path that isn't challenged. Confirmed by testing —
// don't remove this without re-verifying against production.
export const runtime = "edge";

const MAX_RESULTS = 8;
const DIFFICULTIES: Difficulty[] = ["easy", "hard", "extreme"];

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  if (query.length < 1) {
    return NextResponse.json<LevelOption[]>([]);
  }

  // A date-scoped search (always sent by GuessInput, for "today" and archive
  // alike) reads from that date's frozen pool snapshot once one exists, so
  // the guessable options match what was actually available the day the
  // puzzle was first played instead of drifting with the live top-150.
  const date = request.nextUrl.searchParams.get("date");

  let pool;
  try {
    pool = date ? await getPoolForDate(date) : await getDailyPool();
  } catch (err) {
    console.error("GET /api/levels: failed to load pool", err);
    return NextResponse.json({ error: "Failed to load level pool" }, { status: 502 });
  }

  const starts: LevelOption[] = [];
  const contains: LevelOption[] = [];

  for (const level of pool) {
    const name = level.name.toLowerCase();
    if (name.startsWith(query)) {
      starts.push({ id: level.id, name: level.name, position: level.position });
    } else if (name.includes(query)) {
      contains.push({ id: level.id, name: level.name, position: level.position });
    }
    if (starts.length >= MAX_RESULTS) break;
  }

  const results = [...starts, ...contains].slice(0, MAX_RESULTS);

  // Safety net for dates whose target was frozen before pool-snapshotting
  // existed (or where freezing the pool itself failed transiently): the
  // frozen pool above won't contain that target, so without this it wouldn't
  // otherwise ever be searchable/selectable again — merge it in here so it
  // stays guessable regardless.
  const difficultyParam = request.nextUrl.searchParams.get("difficulty");
  if (date && difficultyParam && DIFFICULTIES.includes(difficultyParam as Difficulty)) {
    const difficulty = difficultyParam as Difficulty;
    const frozenId = await getFrozenTargetId(date, difficulty);
    if (frozenId != null && !pool.some((d) => d.id === frozenId) && results.length < MAX_RESULTS) {
      const demon = await resolveDemonById(frozenId, pool);
      if (demon && demon.name.toLowerCase().includes(query)) {
        results.push({ id: demon.id, name: demon.name, position: demon.position });
      }
    }
  }

  return NextResponse.json<LevelOption[]>(results);
}
