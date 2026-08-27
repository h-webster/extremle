import type { Difficulty, StoredGameState, StoredStats, StoredUnlockState } from "@/types/game";

const STATS_PREFIX = "demonle:stats:";
const GAME_PREFIX = "demonle:game:";
const UNLOCK_KEY = "demonle:unlocked";

// Pre-difficulty-tier key shapes, kept only for the one-time migration below.
const LEGACY_STATS_KEY = "demonle:stats";
const LEGACY_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const EMPTY_STATS: StoredStats = {
  played: 0,
  won: 0,
  currentStreak: 0,
  maxStreak: 0,
  guessDistribution: [0, 0, 0, 0, 0, 0],
  lastPlayedDate: null,
};

const EMPTY_UNLOCK_STATE: StoredUnlockState = {
  hard: false,
  extreme: false,
};

function isBrowser() {
  return typeof window !== "undefined";
}

function statsKey(difficulty: Difficulty) {
  return `${STATS_PREFIX}${difficulty}`;
}

function gamePrefix(difficulty: Difficulty) {
  return `${GAME_PREFIX}${difficulty}:`;
}

export function getStats(difficulty: Difficulty): StoredStats {
  if (!isBrowser()) return EMPTY_STATS;
  try {
    const raw = window.localStorage.getItem(statsKey(difficulty));
    if (!raw) return EMPTY_STATS;
    return { ...EMPTY_STATS, ...(JSON.parse(raw) as StoredStats) };
  } catch {
    return EMPTY_STATS;
  }
}

function saveStats(difficulty: Difficulty, stats: StoredStats) {
  if (!isBrowser()) return;
  window.localStorage.setItem(statsKey(difficulty), JSON.stringify(stats));
}

export function recordResult(
  difficulty: Difficulty,
  date: string,
  won: boolean,
  guessCount: number
): StoredStats {
  const stats = getStats(difficulty);
  if (stats.lastPlayedDate === date) {
    return stats; // already recorded today's result
  }

  const next: StoredStats = {
    ...stats,
    played: stats.played + 1,
    won: stats.won + (won ? 1 : 0),
    currentStreak: won ? stats.currentStreak + 1 : 0,
    lastPlayedDate: date,
    guessDistribution: [...stats.guessDistribution],
  };
  next.maxStreak = Math.max(next.maxStreak, next.currentStreak);
  if (won && guessCount >= 1 && guessCount <= 6) {
    next.guessDistribution[guessCount - 1] += 1;
  }

  saveStats(difficulty, next);
  return next;
}

export function getGameState(difficulty: Difficulty, date: string): StoredGameState | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(gamePrefix(difficulty) + date);
    if (!raw) return null;
    return JSON.parse(raw) as StoredGameState;
  } catch {
    return null;
  }
}

export function saveGameState(difficulty: Difficulty, state: StoredGameState) {
  if (!isBrowser()) return;
  window.localStorage.setItem(gamePrefix(difficulty) + state.date, JSON.stringify(state));
}

export function getUnlockedTiers(): StoredUnlockState {
  if (!isBrowser()) return EMPTY_UNLOCK_STATE;
  try {
    const raw = window.localStorage.getItem(UNLOCK_KEY);
    if (!raw) return EMPTY_UNLOCK_STATE;
    return { ...EMPTY_UNLOCK_STATE, ...(JSON.parse(raw) as StoredUnlockState) };
  } catch {
    return EMPTY_UNLOCK_STATE;
  }
}

/** Permanently unlocks a tier (once ever won, stays unlocked — no daily re-lock). */
export function unlockTier(tier: "hard" | "extreme") {
  if (!isBrowser()) return;
  const state = getUnlockedTiers();
  if (state[tier]) return;
  window.localStorage.setItem(UNLOCK_KEY, JSON.stringify({ ...state, [tier]: true }));
}

function isManagedKey(key: string): boolean {
  return key.startsWith(STATS_PREFIX) || key.startsWith(GAME_PREFIX) || key === UNLOCK_KEY;
}

export function exportSave(): string {
  if (!isBrowser()) return "{}";
  const dump: Record<string, unknown> = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && isManagedKey(key)) {
      dump[key] = JSON.parse(window.localStorage.getItem(key) as string);
    }
  }
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data: dump }, null, 2);
}

export function importSave(json: string): { ok: true } | { ok: false; error: string } {
  if (!isBrowser()) return { ok: false, error: "Not in browser" };
  try {
    const parsed = JSON.parse(json) as { data?: Record<string, unknown> };
    if (!parsed.data) return { ok: false, error: "Missing data field" };
    for (const [key, value] of Object.entries(parsed.data)) {
      if (isManagedKey(key)) {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not parse save file" };
  }
}

export function resetSave() {
  if (!isBrowser()) return;
  const toRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && isManagedKey(key)) {
      toRemove.push(key);
    }
  }
  toRemove.forEach((key) => window.localStorage.removeItem(key));
}

/**
 * One-time migration from the pre-difficulty-tier key shapes (`demonle:stats`,
 * `demonle:game:{date}`) to the difficulty-scoped ones (`demonle:stats:easy`,
 * `demonle:game:easy:{date}`), so existing players' streaks/history survive
 * the switch to difficulty tiers instead of silently vanishing. Safe to call
 * on every mount — idempotent, and a no-op once the legacy keys are gone.
 */
export function migrateLegacyStorage() {
  if (!isBrowser()) return;

  const legacyStats = window.localStorage.getItem(LEGACY_STATS_KEY);
  if (legacyStats !== null) {
    if (window.localStorage.getItem(statsKey("easy")) === null) {
      window.localStorage.setItem(statsKey("easy"), legacyStats);
    }
    window.localStorage.removeItem(LEGACY_STATS_KEY);
  }

  const legacyGameKeys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(GAME_PREFIX)) continue;
    const rest = key.slice(GAME_PREFIX.length);
    // New-format keys look like "easy:2026-08-04"; legacy ones are just the date.
    if (LEGACY_DATE_PATTERN.test(rest)) {
      legacyGameKeys.push(key);
    }
  }

  for (const legacyKey of legacyGameKeys) {
    const date = legacyKey.slice(GAME_PREFIX.length);
    const value = window.localStorage.getItem(legacyKey);
    if (value === null) continue;
    const newKey = gamePrefix("easy") + date;
    if (window.localStorage.getItem(newKey) === null) {
      window.localStorage.setItem(newKey, value);
    }
    window.localStorage.removeItem(legacyKey);
  }
}
