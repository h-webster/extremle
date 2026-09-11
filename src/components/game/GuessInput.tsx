"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Difficulty, LevelOption } from "@/types/game";

interface GuessInputProps {
  disabled: boolean;
  excludeIds: Set<number>;
  onSubmit: (option: LevelOption) => void;
  date: string;
  difficulty: Difficulty;
}

export default function GuessInput({
  disabled,
  excludeIds,
  onSubmit,
  date,
  difficulty,
}: GuessInputProps) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<LevelOption[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmedQuery = query.trim();
  const visibleOptions = trimmedQuery.length < 1 ? [] : options;

  useEffect(() => {
    if (trimmedQuery.length < 1) {
      return;
    }
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off the debounced fetch below
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/levels?q=${encodeURIComponent(trimmedQuery)}&date=${encodeURIComponent(date)}&difficulty=${difficulty}`
        );
        if (!res.ok) {
          if (!cancelled) setOptions([]);
          return;
        }
        const data: LevelOption[] = await res.json();
        if (!cancelled) {
          setOptions(data.filter((o) => !excludeIds.has(o.id)));
          setHighlighted(0);
          setOpen(true);
        }
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [trimmedQuery, excludeIds, date, difficulty]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function commit(option: LevelOption) {
    onSubmit(option);
    setQuery("");
    setOptions([]);
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || visibleOptions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, visibleOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      commit(visibleOptions[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor="guess-input" className="sr-only">
        Guess a level
      </label>
      <div className="flex items-center gap-2 border border-border bg-bg px-3 py-2.5 focus-within:border-text-secondary">
        <input
          id="guess-input"
          type="text"
          autoComplete="off"
          disabled={disabled}
          placeholder={disabled ? "Puzzle finished" : "Guess a level"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => visibleOptions.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full bg-transparent text-[15px] text-text-primary placeholder:text-text-muted focus:outline-none disabled:cursor-not-allowed"
        />
        {loading && <span className="text-[11px] text-text-muted">…</span>}
      </div>

      {open && visibleOptions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full border border-border bg-bg">
          {visibleOptions.map((option, i) => (
            <li key={option.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(option)}
                onMouseEnter={() => setHighlighted(i)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-[14px] transition-transform duration-100 active:scale-[0.98] ${
                  i === highlighted
                    ? "bg-bg-card-hover text-text-primary"
                    : "text-text-secondary"
                }`}
              >
                <span className="truncate">{option.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
