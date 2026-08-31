import type { Difficulty } from "@/types/game";

/**
 * Owner-curated overrides for the daily target, nested per difficulty.
 *
 * Key = puzzle date (YYYY-MM-DD). Value = a partial map of difficulty ->
 * pointercrate demon `id` (its stable numeric id, not its list `position` —
 * positions drift as the list moves, ids don't). Run `npm run list-pool` to
 * print every current top-150 demon as "id  position  name" so you can look
 * one up.
 *
 * A difficulty left out of a date's entry (or a date left out entirely) falls
 * back to the normal date-seeded pick for that difficulty. If an id here has
 * since dropped out of the top 150, it's also ignored and falls back — the id
 * must be in the current pool for the override to take effect. The three
 * difficulties' targets must differ from each other for a given date — a
 * console.warn fires at request time if an override collides with another
 * difficulty's resolved target, so watch the server logs after editing this.
 */
export const SCHEDULE: Record<string, Partial<Record<Difficulty, number>>> = {
  "2026-08-04": { easy: 646 },
  "2026-08-05": { easy: 547 },
  "2026-08-06": { easy: 577 },
  "2026-08-07": { easy: 428 },
  "2026-08-08": { easy: 425 },
  "2026-08-09": { easy: 629 },
  "2026-08-10": { easy: 599 },
  "2026-08-11": { easy: 429 },
  "2026-08-12": { easy: 274 },
  "2026-08-13": { easy: 555 },
  "2026-08-14": { easy: 649 },
  "2026-08-15": { easy: 670 },
  "2026-08-16": { easy: 617 },
  "2026-08-17": { easy: 668 },
  "2026-08-18": { easy: 633 },
  "2026-08-19": { easy: 439 },
  "2026-08-20": { easy: 680 },
  "2026-08-21": { easy: 464 },
  "2026-08-22": { easy: 582 },
  "2026-08-23": { easy: 698 },
  "2026-08-24": { easy: 521 },
  "2026-08-25": { easy: 435 },
  "2026-08-26": { easy: 667, hard: 707, extreme: 116},
  "2026-08-27": { easy: 412, hard: 709, extreme: 638},
  "2026-08-28": { easy: 662, hard: 687, extreme: 551},
  "2026-08-29": { easy: 614, hard: 672, extreme: 708},
  "2026-08-30": { easy: 380, hard: 682, extreme: 669 },
  "2026-08-31": { easy: 594, hard: 558, extreme: 525 },
  "2026-09-01": { easy: 613, hard: 656, extreme: 671 },
  "2026-09-02": { easy: 335, hard: 676, extreme: 699 },
  "2026-09-03": { easy: 250, hard: 707, extreme: 675 },
  "2026-09-04": { easy: 467, hard: 664, extreme: 674 },
  "2026-09-05": { easy: 636, hard: 579, extreme: 613 },
  "2026-09-06": { easy: 623, hard: 620, extreme: 696 },
  "2026-09-07": { easy: 478, hard: 572, extreme: 622 },
  "2026-09-08": { easy: 595, hard: 568, extreme: 681 },
  "2026-09-09": { easy: 635, hard: 468, extreme: 642},
  "2026-09-10": { easy: 649, hard: 475, extreme: 677},
};
