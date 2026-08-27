import { NextRequest, NextResponse } from "next/server";
import { recordCompletion } from "@/lib/completions";
import { getDailyTarget, todayUTC } from "@/lib/daily";
import { buildFullReveal, buildHints } from "@/lib/hints";
import { MAX_GUESSES, type Difficulty, type GuessResponse } from "@/types/game";

// See src/app/api/levels/route.ts for why this is required, not optional.
export const runtime = "edge";

const DIFFICULTIES: Difficulty[] = ["easy", "hard", "extreme"];

interface GuessBody {
  guessLevelId?: number;
  guessNumber?: number;
  date?: string;
  difficulty?: string;
}

export async function POST(request: NextRequest) {
  let body: GuessBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { guessLevelId, guessNumber, date, difficulty } = body;

  if (typeof guessLevelId !== "number") {
    return NextResponse.json({ error: "guessLevelId is required" }, { status: 400 });
  }
  if (!guessNumber || guessNumber < 1 || guessNumber > MAX_GUESSES) {
    return NextResponse.json(
      { error: `guessNumber must be between 1 and ${MAX_GUESSES}` },
      { status: 400 }
    );
  }
  if (!difficulty || !DIFFICULTIES.includes(difficulty as Difficulty)) {
    return NextResponse.json(
      { error: `difficulty must be one of ${DIFFICULTIES.join(", ")}` },
      { status: 400 }
    );
  }
  const resolvedDifficulty = difficulty as Difficulty;

  const resolvedDate = date ?? todayUTC();

  try {
    const { target, pool } = await getDailyTarget(resolvedDate, resolvedDifficulty);
    const guessed = pool.find((demon) => demon.id === guessLevelId);

    if (!guessed) {
      return NextResponse.json({ error: "Unknown level for today's pool" }, { status: 400 });
    }

    const correct = guessed.id === target.id;
    const positionDirection = correct
      ? "correct"
      : target.position < guessed.position
        ? "harder"
        : "easier";

    const hints = await buildHints(target, guessNumber, resolvedDifficulty);
    const gameOver = correct || guessNumber >= MAX_GUESSES;

    const response: GuessResponse = {
      correct,
      guessNumber,
      guessedLevel: {
        id: guessed.id,
        name: guessed.name,
        position: guessed.position,
      },
      positionDirection,
      hints,
      gameOver,
      ...(gameOver
        ? {
            reveal: await buildFullReveal(target),
            completionStats: await recordCompletion(resolvedDate, resolvedDifficulty, correct),
          }
        : {}),
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("POST /api/guess failed", err);
    return NextResponse.json({ error: "Failed to process guess" }, { status: 502 });
  }
}
