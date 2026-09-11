const POINTERCRATE_BASE = "https://pointercrate.com/api/v2";

// Cloudflare (which fronts pointercrate.com) is more likely to block/challenge
// requests with no User-Agent — cloud-provider egress IPs like Vercel's get
// flagged harder than a browser's. A descriptive UA reduces false positives.
const REQUEST_HEADERS = {
  "User-Agent": "ExtremleBot/1.0 (+https://extremle.io)",
  Accept: "application/json",
};

/** The top 150 positions on the list — 1-75 is "Main List", 76-150 is "Extended List". */
export const MAIN_LIST_SIZE = 75;
export const EXTENDED_LIST_SIZE = 150;

export type ListTier = "main" | "extended";

export interface PointercratePlayer {
  id: number;
  name: string;
  banned: boolean;
}

/** One entry from GET /demons/listed/ — the shape used for the autocomplete pool and list-derived hints. */
export interface PointercrateDemon {
  id: number;
  position: number;
  name: string;
  requirement: number;
  video: string | null;
  thumbnail: string;
  publisher: PointercratePlayer;
  verifier: PointercratePlayer;
  level_id: number | null;
}

/** One entry from the demon detail endpoint's `records` array — used for the "victors" hint/reveal (approved records = players who've beaten the level). */
export interface PointercrateRecord {
  id: number;
  status: string;
  progress: number;
  player: PointercratePlayer;
}

export interface PointercrateDemonDetail extends PointercrateDemon {
  creators: PointercratePlayer[];
  records: PointercrateRecord[];
}

/**
 * Full position-ordered demonlist, paginated 100 at a time by pointercrate.
 * We only ever need the top EXTENDED_LIST_SIZE, so this stops as soon as
 * it has enough — no need to page through legacy demons past position 150.
 */
async function fetchListedPage(after: number, limit: number): Promise<PointercrateDemon[]> {
  const res = await fetch(
    `${POINTERCRATE_BASE}/demons/listed/?after=${after}&limit=${limit}`,
    { next: { revalidate: 21600 }, headers: REQUEST_HEADERS } // 6h — the list barely moves within a day
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Pointercrate demons fetch failed: ${res.status} ${body.slice(0, 300)}`);
  }
  return res.json();
}

/** The pool the daily puzzle is drawn from: the top 150 positions (main + extended list). */
export async function getDailyPool(): Promise<PointercrateDemon[]> {
  const demons: PointercrateDemon[] = [];
  let after = 0;
  while (demons.length < EXTENDED_LIST_SIZE) {
    const page = await fetchListedPage(after, 100);
    if (page.length === 0) break;
    demons.push(...page);
    after += page.length;
  }
  return demons
    .filter((d) => d.position <= EXTENDED_LIST_SIZE)
    .sort((a, b) => a.position - b.position);
}

export async function getDemonDetail(id: number): Promise<PointercrateDemonDetail> {
  const res = await fetch(`${POINTERCRATE_BASE}/demons/${id}/`, {
    next: { revalidate: 21600 },
    headers: REQUEST_HEADERS,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Pointercrate demon detail fetch failed: ${res.status} ${text.slice(0, 300)}`);
  }
  const body: { data: PointercrateDemonDetail } = await res.json();
  return body.data;
}

/**
 * Resolves a demon by id, preferring an already-fetched pool (no extra
 * request) and falling back to a direct detail fetch by id — which works
 * regardless of whether the demon is still in the top-150. Used to keep a
 * frozen (see targets.ts) target resolvable even after it's fallen off the
 * live pool. Returns null only if pointercrate has fully deleted the demon
 * (not just dropped its position below 150) — extremely rare in practice.
 */
export async function resolveDemonById(
  id: number,
  pool: PointercrateDemon[]
): Promise<PointercrateDemon | null> {
  const inPool = pool.find((d) => d.id === id);
  if (inPool) return inPool;
  try {
    return await getDemonDetail(id);
  } catch (err) {
    console.error(`resolveDemonById: demon ${id} not found in pool or by detail fetch`, err);
    return null;
  }
}

export function listTier(position: number): ListTier {
  return position <= MAIN_LIST_SIZE ? "main" : "extended";
}

export function listTierLabel(position: number): string {
  return listTier(position) === "main" ? "Main List" : "Extended List";
}
