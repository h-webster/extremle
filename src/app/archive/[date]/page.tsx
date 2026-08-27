import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PlayGame from "@/components/game/PlayGame";
import { puzzleNumber, todayUTC } from "@/lib/daily";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LAUNCH_DATE = "2026-08-04";

function formatDateLabel(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<Metadata> {
  const { date } = await params;
  if (!DATE_PATTERN.test(date) || date < LAUNCH_DATE || date > todayUTC()) {
    return {};
  }
  const num = puzzleNumber(date);
  return {
    title: `Puzzle #${num} | Extremle`,
    description: `Replay Extremle puzzle #${num} from ${formatDateLabel(date)}. Guess that day's Geometry Dash extreme demon in six tries.`,
  };
}

export default async function ArchivePuzzlePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;

  // Upper bound is deliberately todayUTC() rather than "yesterday": a player's local
  // calendar date (which drives what counts as "today") can run up to a day ahead of
  // UTC, so a date equal to UTC-today can still be a legitimately past day for them.
  if (!DATE_PATTERN.test(date) || date < LAUNCH_DATE || date > todayUTC()) {
    notFound();
  }

  // Archive replay is Easy-only for now — Hard/Extreme archive support is a fast-follow.
  return <PlayGame difficulty="easy" date={date} puzzleNumber={puzzleNumber(date)} isToday={false} />;
}
