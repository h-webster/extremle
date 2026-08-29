import type { CSSProperties } from "react";
import type { Difficulty, GuessResponse } from "@/types/game";
import { TriangleGlyph } from "@/components/game/glyphs";

function DirectionLabel({ guess }: { guess: GuessResponse }) {
  if (guess.correct) {
    return <span className="text-[12px] font-semibold text-correct">Correct</span>;
  }
  const harder = guess.positionDirection === "harder";
  return (
    <span
      className="anim-nudge flex items-center gap-1.5 text-[12px] text-text-secondary"
      style={{ "--nudge-from": harder ? "3px" : "-3px" } as CSSProperties}
    >
      <TriangleGlyph direction={harder ? "up" : "down"} />
      {harder ? "ranks harder" : "ranks easier"}
    </span>
  );
}

export default function GuessLog({
  guesses,
  difficulty,
}: {
  guesses: GuessResponse[];
  difficulty: Difficulty;
}) {
  return (
    <ol className="border-t border-border">
      {[...guesses].reverse().map((guess) => (
        <li
          key={guess.guessNumber}
          className="anim-row-in flex items-center justify-between gap-4 border-b border-border py-2.5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="shrink-0 text-[12px] text-text-muted">{guess.guessNumber}.</span>
            <span className="truncate text-[14px] font-medium text-text-primary">
              {guess.guessedLevel.name}
            </span>
            {difficulty !== "extreme" && (
              <span className="shrink-0 text-[12px] text-text-muted">
                #{guess.guessedLevel.position}
              </span>
            )}
          </div>
          <DirectionLabel guess={guess} />
        </li>
      ))}
    </ol>
  );
}
