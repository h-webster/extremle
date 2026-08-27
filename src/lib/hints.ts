import { getAredlTagsByLevelId } from "@/lib/aredl";
import { getDemonDetail, listTierLabel, type PointercrateDemon } from "@/lib/pointercrate";
import type { Difficulty, FullReveal, RevealedHints, SongInfo } from "@/types/game";

interface GdBrowserLevel {
  songName?: string;
  songAuthor?: string;
  downloads?: number;
  likes?: number;
}

/** Single shared fetch — GDBrowser is an unofficial fallback keyed by the raw GD level_id, used for both song info and download/like counts. */
async function fetchGdBrowserLevel(levelId: number | null): Promise<GdBrowserLevel | null> {
  if (!levelId) return null;
  try {
    const res = await fetch(`https://gdbrowser.com/api/level/${levelId}`, {
      next: { revalidate: 21600 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function songFromLevel(level: GdBrowserLevel | null): SongInfo | null {
  if (!level?.songName) return null;
  return { name: level.songName, author: level.songAuthor ?? "Unknown" };
}

/** AREDL and pointercrate don't share IDs, so tags are matched by the underlying GD level_id. */
async function fetchTags(levelId: number | null): Promise<string[] | null> {
  if (!levelId) return null;
  const tagsByLevelId = await getAredlTagsByLevelId();
  return tagsByLevelId.get(levelId) ?? null;
}

type HintBuilder = (target: PointercrateDemon) => Promise<Partial<RevealedHints>> | Partial<RevealedHints>;

function listTierHint(target: PointercrateDemon): Partial<RevealedHints> {
  return { listTier: listTierLabel(target.position) };
}

async function tagsHint(target: PointercrateDemon): Promise<Partial<RevealedHints>> {
  return { tags: await fetchTags(target.level_id) };
}

function publisherVerifiedHint(target: PointercrateDemon): Partial<RevealedHints> {
  return { publisher: target.publisher.name, verifier: target.verifier.name };
}

async function songHint(target: PointercrateDemon): Promise<Partial<RevealedHints>> {
  return { song: songFromLevel(await fetchGdBrowserLevel(target.level_id)) };
}

function thumbnailHint(target: PointercrateDemon): Partial<RevealedHints> {
  return { thumbnailUrl: target.thumbnail };
}

async function downloadsLikesHint(target: PointercrateDemon): Promise<Partial<RevealedHints>> {
  const level = await fetchGdBrowserLevel(target.level_id);
  if (level?.downloads == null || level?.likes == null) return { downloadsLikes: null };
  return { downloadsLikes: { downloads: level.downloads, likes: level.likes } };
}

async function victorsHint(target: PointercrateDemon): Promise<Partial<RevealedHints>> {
  const detail = await getDemonDetail(target.id);
  return { recordsCount: detail.records.filter((r) => r.status === "approved").length };
}

const HINT_SCHEDULES: Record<Difficulty, HintBuilder[]> = {
  easy: [listTierHint, tagsHint, publisherVerifiedHint, songHint, thumbnailHint],
  hard: [listTierHint, tagsHint, downloadsLikesHint, victorsHint, publisherVerifiedHint],
  extreme: [],
};

export async function buildHints(
  target: PointercrateDemon,
  guessNumber: number,
  difficulty: Difficulty
): Promise<RevealedHints> {
  const unlocked = HINT_SCHEDULES[difficulty].slice(0, guessNumber);
  const results = await Promise.all(unlocked.map((build) => build(target)));
  return Object.assign({}, ...results) as RevealedHints;
}

export async function buildFullReveal(target: PointercrateDemon): Promise<FullReveal> {
  const [detail, level, tags] = await Promise.all([
    getDemonDetail(target.id),
    fetchGdBrowserLevel(target.level_id),
    fetchTags(target.level_id),
  ]);

  return {
    id: target.id,
    name: target.name,
    position: target.position,
    listTier: listTierLabel(target.position),
    publisher: detail.publisher.name,
    verifier: detail.verifier.name,
    tags,
    song: songFromLevel(level),
    thumbnailUrl: target.thumbnail,
    videoUrl: target.video,
    levelId: target.level_id,
    downloadsLikes:
      level?.downloads != null && level?.likes != null
        ? { downloads: level.downloads, likes: level.likes }
        : null,
    recordsCount: detail.records.filter((r) => r.status === "approved").length,
  };
}
