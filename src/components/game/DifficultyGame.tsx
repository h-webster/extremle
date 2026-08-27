"use client";

import { useEffect, useState } from "react";
import PlayGame from "@/components/game/PlayGame";
import { getUnlockedTiers, migrateLegacyStorage } from "@/lib/storage";
import type { Difficulty, StoredUnlockState } from "@/types/game";

const TIERS: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "Easy" },
  { id: "hard", label: "Hard" },
  { id: "extreme", label: "Extreme" },
];

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="inline-block">
      <rect x="5" y="11" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function DifficultyGame({ puzzleNumber }: { puzzleNumber?: number }) {
  const [selected, setSelected] = useState<Difficulty>("easy");
  const [unlocked, setUnlocked] = useState<StoredUnlockState>({ hard: false, extreme: false });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    migrateLegacyStorage();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client hydration from localStorage
    setUnlocked(getUnlockedTiers());
    setHydrated(true);
  }, []);

  function isLocked(tier: Difficulty) {
    return tier !== "easy" && !unlocked[tier as "hard" | "extreme"];
  }

  function handleTierUnlocked(tier: "hard" | "extreme") {
    setUnlocked((prev) => ({ ...prev, [tier]: true }));
  }

  if (!hydrated) {
    return <div className="py-20 text-center text-text-muted">Loading&hellip;</div>;
  }

  return (
    <>
      <div className="mx-auto w-full max-w-xl px-4 pt-4">
        <div className="flex border-b border-border">
          {TIERS.map((tier) => {
            const locked = isLocked(tier.id);
            return (
              <button
                key={tier.id}
                type="button"
                disabled={locked}
                onClick={() => setSelected(tier.id)}
                title={locked ? `Win ${tier.id === "hard" ? "Easy" : "Hard"} to unlock` : undefined}
                className={`flex-1 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                  selected === tier.id
                    ? "border-accent text-text-primary"
                    : "border-transparent text-text-muted"
                } ${locked ? "cursor-not-allowed opacity-50" : "hover:text-text-primary"}`}
              >
                {tier.label} {locked && <LockIcon />}
              </button>
            );
          })}
        </div>
      </div>
      <PlayGame
        key={selected}
        difficulty={selected}
        isToday
        puzzleNumber={puzzleNumber}
        onTierUnlocked={handleTierUnlocked}
        onSwitchTier={setSelected}
      />
    </>
  );
}
