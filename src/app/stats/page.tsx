"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { exportSave, getStats, importSave, resetSave } from "@/lib/storage";
import type { Difficulty, StoredStats } from "@/types/game";

const EMPTY: StoredStats = {
  played: 0,
  won: 0,
  currentStreak: 0,
  maxStreak: 0,
  guessDistribution: [0, 0, 0, 0, 0, 0],
  lastPlayedDate: null,
};

const TIERS: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "Easy" },
  { id: "hard", label: "Hard" },
  { id: "extreme", label: "Extreme" },
];

export default function StatsPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [stats, setStats] = useState<StoredStats>(EMPTY);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client hydration from localStorage, re-runs when the tab switches
    setStats(getStats(difficulty));
  }, [difficulty]);

  const winPercent = stats.played === 0 ? 0 : Math.round((stats.won / stats.played) * 100);
  const maxDistribution = Math.max(1, ...stats.guessDistribution);

  function handleExport() {
    const blob = new Blob([exportSave()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extremle-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Save exported.");
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = importSave(String(reader.result));
      if (result.ok) {
        setStats(getStats(difficulty));
        setMessage("Save imported.");
      } else {
        setMessage(`Import failed: ${result.error}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleReset() {
    if (!window.confirm("Reset all local stats and puzzle history? This can't be undone.")) {
      return;
    }
    resetSave();
    setStats(EMPTY);
    setMessage("Local save reset.");
  }

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
      <h1 className="text-xl font-bold text-text-primary">Your stats</h1>

      <div className="mt-4 flex border-b border-border">
        {TIERS.map((tier) => (
          <button
            key={tier.id}
            type="button"
            onClick={() => setDifficulty(tier.id)}
            className={`flex-1 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition-colors ${
              difficulty === tier.id
                ? "border-accent text-text-primary"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            {tier.label}
          </button>
        ))}
      </div>

      <dl className="mt-6 grid grid-cols-4 gap-4 border-y border-border py-6">
        {[
          { label: "Played", value: stats.played },
          { label: "Win %", value: `${winPercent}%` },
          { label: "Streak", value: stats.currentStreak },
          { label: "Best", value: stats.maxStreak },
        ].map((stat) => (
          <div key={stat.label}>
            <dt className="text-[11px] text-text-muted">{stat.label}</dt>
            <dd className="text-2xl font-semibold text-text-primary">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-8">
        <h2 className="text-[14px] font-semibold text-text-primary">Guess distribution</h2>
        <div className="mt-3 flex flex-col gap-1.5">
          {stats.guessDistribution.map((count, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-3 text-[12px] text-text-muted">{i + 1}</span>
              <div className="h-5 flex-1 bg-bg-card">
                {count > 0 && (
                  <div
                    className="flex h-full items-center justify-end bg-accent px-1.5 text-[11px] font-semibold text-accent-ink"
                    style={{ width: `${Math.max(8, (count / maxDistribution) * 100)}%` }}
                  >
                    {count}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-[14px] font-semibold text-text-primary">Save data</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
          Stats live only in this browser. Export a backup before clearing
          your cache, or import one to move devices.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleImportClick}
            className="border border-border px-4 py-2 text-[13px] font-semibold text-text-primary transition-transform duration-100 hover:bg-bg-card-hover active:scale-95"
          >
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={handleExport}
            className="border border-correct px-4 py-2 text-[13px] font-semibold text-correct transition-transform duration-100 hover:bg-correct-soft active:scale-95"
          >
            Export
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="border border-danger px-4 py-2 text-[13px] font-semibold text-danger transition-transform duration-100 hover:bg-danger-soft active:scale-95"
          >
            Reset
          </button>
        </div>
        {message && <p className="mt-2 text-[12px] text-text-muted">{message}</p>}
      </section>

      <Link
        href="/"
        className="mt-10 inline-block border border-border px-5 py-2.5 text-[14px] font-semibold text-text-primary transition-transform duration-100 hover:bg-bg-card-hover active:scale-95"
      >
        Back to today&rsquo;s puzzle
      </Link>
    </div>
  );
}
