"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { puzzleNumber, todayLocal } from "@/lib/daily";
import type { CompletionTotalsResponse } from "@/app/api/completions/route";

const LAUNCH_DATE = "2026-08-04";

function formatLabel(dateStr: string) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function pastDates(today: string): string[] {
  const [ty, tm, td] = today.split("-").map(Number);
  const todayMs = Date.UTC(ty, tm - 1, td);
  const [ly, lm, ld] = LAUNCH_DATE.split("-").map(Number);
  const launchMs = Date.UTC(ly, lm - 1, ld);

  const dates: string[] = [];
  for (let ms = todayMs - 86_400_000; ms >= launchMs; ms -= 86_400_000) {
    dates.push(new Date(ms).toISOString().slice(0, 10));
  }
  return dates;
}

function plays(count: number) {
  return `${count.toLocaleString("en-US")} ${count === 1 ? "play" : "plays"}`;
}

/**
 * `header` (the page title/subtitle) is rendered below the all-time play
 * total, so the total can sit above the title while the fetch stays here.
 */
export default function ArchiveList({ header }: { header: ReactNode }) {
  const [dates, setDates] = useState<string[] | null>(null);
  // Cross-player counts are a nice-to-have: if the request fails (or Redis
  // isn't configured), the archive just renders without them.
  const [totals, setTotals] = useState<CompletionTotalsResponse | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client read of the local calendar date
    setDates(pastDates(todayLocal()));
    fetch("/api/completions")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: CompletionTotalsResponse | null) => setTotals(data))
      .catch(() => {});
  }, []);

  const total = totals && (
    <p className="mb-8 text-center text-[18px] text-text-secondary">
      <span className="block text-[44px] font-bold leading-tight text-accent">
        {totals.total.toLocaleString("en-US")}
      </span>
      games completed by everyone so far
    </p>
  );

  if (dates === null) {
    return header;
  }

  if (dates.length === 0) {
    return (
      <>
        {total}
        {header}
        <p className="mt-8 text-[14px] text-text-muted">
          Puzzle #1 just dropped. The archive fills in from tomorrow.
        </p>
      </>
    );
  }

  return (
    <>
      {total}
      {header}
      <ol className="mt-6 border-t border-border">
        {dates.map((date) => (
          <li key={date} className="border-b border-border">
            <Link
              href={`/archive/${date}`}
              className="flex items-center justify-between py-2.5 text-[14px] hover:bg-bg-card-hover"
            >
              <span className="font-medium text-text-primary">
                Puzzle #{puzzleNumber(date)}
              </span>
              <span className="flex items-baseline gap-3">
                {totals && (
                  <span className="text-[12px] text-text-muted">
                    {plays(totals.byDate[date] ?? 0)}
                  </span>
                )}
                <span className="text-text-secondary">{formatLabel(date)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}
