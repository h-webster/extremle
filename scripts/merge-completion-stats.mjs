/**
 * One-time migration: before difficulty tiers existed, cross-player completion
 * counters were stored as `demonle:completions:{date}:played` / `:won` (no
 * difficulty segment). After the difficulty-tiers feature shipped, reads/writes
 * moved to `demonle:completions:{date}:{difficulty}:played` / `:won`, so those
 * older dates' historical counts were stranded under the old key shape and
 * never contribute to the (now difficulty-scoped) stat shown on the result card.
 *
 * This merges every old-format date's played/won counts into that date's new
 * `:easy:` counters (old dates only ever had one difficulty, equivalent to
 * Easy), additively (in case some overlap already exists), then deletes the
 * old keys so the merge is idempotent and safe to re-run.
 *
 * Usage: npm run merge-completion-stats -- --dry-run   (report only, no writes)
 *        npm run merge-completion-stats                (apply the merge)
 */
import { readFileSync } from "node:fs";
import { Redis } from "@upstash/redis";

function loadEnvLocal() {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // no .env.local — fine, env vars may already be set in the shell
  }
}

loadEnvLocal();

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) {
  console.error("Missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.");
  process.exit(1);
}
const redis = new Redis({ url, token });
const dryRun = process.argv.includes("--dry-run");

const allKeys = await redis.keys("demonle:completions:*");

// Old format: demonle:completions:{date}:played  (4 segments)
// New format: demonle:completions:{date}:{difficulty}:played  (5 segments)
const oldDates = new Set();
for (const key of allKeys) {
  const parts = key.split(":");
  if (parts.length === 4 && (parts[3] === "played" || parts[3] === "won")) {
    oldDates.add(parts[2]);
  }
}

if (oldDates.size === 0) {
  console.log("No old-format completion keys found. Nothing to merge.");
  process.exit(0);
}

console.log(`Found ${oldDates.size} date(s) with old-format keys: ${[...oldDates].sort().join(", ")}`);

for (const date of [...oldDates].sort()) {
  const oldPlayedKey = `demonle:completions:${date}:played`;
  const oldWonKey = `demonle:completions:${date}:won`;
  const newPlayedKey = `demonle:completions:${date}:easy:played`;
  const newWonKey = `demonle:completions:${date}:easy:won`;

  const [oldPlayed, oldWon, newPlayed, newWon] = await Promise.all([
    redis.get(oldPlayedKey),
    redis.get(oldWonKey),
    redis.get(newPlayedKey),
    redis.get(newWonKey),
  ]);

  const mergedPlayed = (Number(oldPlayed) || 0) + (Number(newPlayed) || 0);
  const mergedWon = (Number(oldWon) || 0) + (Number(newWon) || 0);

  if (!dryRun) {
    await redis.set(newPlayedKey, mergedPlayed);
    await redis.set(newWonKey, mergedWon);
    await redis.del(oldPlayedKey, oldWonKey);
  }

  console.log(
    `${date}: old(played=${oldPlayed ?? 0}, won=${oldWon ?? 0}) + easy(played=${newPlayed ?? 0}, won=${newWon ?? 0}) -> easy(played=${mergedPlayed}, won=${mergedWon})`
  );
}

console.log(dryRun ? "Dry run complete — no writes made." : "Done.");
