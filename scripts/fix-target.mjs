/**
 * Manually overwrites a permanently-frozen daily target (see src/lib/targets.ts).
 * Escape hatch for a date+difficulty whose frozen answer turns out to be wrong —
 * either it drifted before freezing shipped, or was frozen incorrectly.
 *
 * Usage: npm run fix-target -- 2026-08-15 hard 646        (dry run — prints only)
 *        npm run fix-target -- 2026-08-15 hard 646 --yes  (actually overwrites)
 *
 * Find the correct id with `npm run list-pool`.
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

const args = process.argv.slice(2).filter((a) => a !== "--yes");
const apply = process.argv.includes("--yes");
const [date, difficulty, idArg] = args;

if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error("Usage: npm run fix-target -- <YYYY-MM-DD> <easy|hard|extreme> <demon-id> [--yes]");
  process.exit(1);
}
if (!["easy", "hard", "extreme"].includes(difficulty)) {
  console.error(`difficulty must be one of easy, hard, extreme — got "${difficulty}"`);
  process.exit(1);
}
const id = Number(idArg);
if (!Number.isInteger(id) || id <= 0) {
  console.error(`demon id must be a positive integer — got "${idArg}"`);
  process.exit(1);
}

const key = `demonle:target:${date}:${difficulty}`;
const current = await redis.get(key);
console.log(`${key}: currently ${current ?? "(not frozen)"} -> ${id}`);

if (!apply) {
  console.log("Dry run — pass --yes to actually overwrite.");
  process.exit(0);
}

await redis.set(key, id);
console.log("Done.");
