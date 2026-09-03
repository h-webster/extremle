# Extremle

A daily Wordle-style guessing game for the Geometry Dash extreme-demon community. Each day there's a secret level, drawn from the top 150 of the [Pointercrate](https://pointercrate.com) demonlist. Guess it in 6 tries, choosing level names from an autocomplete list — every guess, right or wrong, reveals a new hint plus whether the secret level is harder or easier on the list than your guess.

Play it live at [extremle.io](https://www.extremle.io).

## Gameplay

- One puzzle per day, the same for everyone, seeded by date. The day rolls over at your own local midnight.
- 6 guesses. Guessing the exact level wins immediately; each wrong guess unlocks the next hint and tells you whether the secret level ranks harder or easier than your guess.
- An `/archive/[date]` route lets you replay any past day's puzzle.
- Stats and streaks are saved locally in your browser (export/import/reset from `/stats`).

### Difficulty tiers

Three tiers — **Easy**, **Hard**, **Extreme** — each a genuinely different daily puzzle drawn from the same top-150 pool, with progressively sparser hints:

| Tier | Hints (one per wrong guess) |
|---|---|
| Easy | List tier → Tags → Publisher & verified → Song → blurred thumbnail |
| Hard | List tier → Tags → Rough downloads/likes → Victors (record count) → Publisher & verified |
| Extreme | List tier → bucketed downloads/likes (only 2 hints total — exact list position is never shown, only harder/easier) |

You start on Easy. Winning a tier permanently unlocks the next one.

## Tech stack

- **Next.js (App Router) + TypeScript**, **Tailwind CSS v4**
- Data from the [Pointercrate API](https://pointercrate.com/api/v2) (levels, positions, publishers/verifiers, records) and the [AREDL API](https://api.aredl.net/v2/api) (gameplay tags), cross-referenced with [GDBrowser](https://gdbrowser.com) for song/downloads/likes
- Per-player stats/state live in `localStorage`; the one piece of shared state — the cross-player "% of people who solved it" stat — lives in [Upstash Redis](https://upstash.com)
- Deployed on Vercel

See [CLAUDE.md](CLAUDE.md) for the full design/implementation history and architectural notes.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The game works fully without any configuration — the only optional piece is the shared completion-rate stat, which needs Redis (see below).

### Environment variables

Copy `.env.local.example` to `.env.local`. Everything in it is optional:

```bash
# Powers the "X% of people guessed the level" stat on the result card.
# Get these from an Upstash Redis database (e.g. via the Vercel Marketplace
# integration: Storage -> Marketplace Database Providers -> Upstash).
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### Scripts

- `npm run dev` / `npm run build` / `npm run start` — standard Next.js dev/build/serve
- `npm run lint` — ESLint
- `npm run list-pool` — prints every demon currently in the top-150 pool as `id  position  name`, for use with owner-curated puzzle overrides in `src/lib/schedule.ts`
- `npm run merge-completion-stats` — one-off Redis migration helper (`--dry-run` to preview); not needed for normal development

## Deployment

Deployed on [Vercel](https://vercel.com). The API routes (`src/app/api/*`) run on the Edge runtime specifically because Pointercrate's Cloudflare bot-protection blocks Vercel's default Node serverless IPs — see [CLAUDE.md](CLAUDE.md) for details.
