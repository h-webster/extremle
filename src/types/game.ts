export const MAX_GUESSES = 6;

export type Difficulty = "easy" | "hard" | "extreme";

export interface LevelOption {
  id: number;
  name: string;
  position: number;
}

export interface GuessedLevelInfo {
  id: number;
  name: string;
  position: number;
}

export type PositionDirection = "correct" | "harder" | "easier";

export interface SongInfo {
  name: string;
  author: string;
}

export interface DownloadsLikes {
  downloads: number;
  likes: number;
}

export interface RevealedHints {
  listTier?: string;
  /** null means no AREDL entry exists for this level — distinct from "not yet unlocked". */
  tags?: string[] | null;
  publisher?: string;
  verifier?: string;
  song?: SongInfo | null;
  thumbnailUrl?: string;
  downloadsLikes?: DownloadsLikes | null;
  recordsCount?: number | null;
}

export interface FullReveal {
  id: number;
  name: string;
  position: number;
  listTier: string;
  publisher: string;
  verifier: string;
  tags: string[] | null;
  song: SongInfo | null;
  thumbnailUrl: string;
  videoUrl: string | null;
  levelId: number | null;
  downloadsLikes: DownloadsLikes | null;
  recordsCount: number | null;
}

export interface CompletionStats {
  played: number;
  won: number;
}

export interface GuessResponse {
  correct: boolean;
  guessNumber: number;
  guessedLevel: GuessedLevelInfo;
  positionDirection: PositionDirection;
  hints: RevealedHints;
  gameOver: boolean;
  reveal?: FullReveal;
  /** Cross-player counts for this puzzle date, present only when gameOver. null if the counter isn't configured. */
  completionStats?: CompletionStats | null;
}

export interface StoredGameState {
  date: string;
  difficulty: Difficulty;
  guesses: GuessResponse[];
  status: "playing" | "won" | "lost";
}

export interface StoredStats {
  played: number;
  won: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: number[]; // length 6, index 0 = won in 1 guess
  lastPlayedDate: string | null;
}

export interface StoredUnlockState {
  hard: boolean;
  extreme: boolean;
}
