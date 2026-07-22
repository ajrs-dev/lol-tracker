import { cache } from "react";
import type {
  ChampionDetail,
  ChampionSummary,
  SummonerSpellData,
} from "./types";

/**
 * Data Dragon is Riot's public static-asset CDN. No API key, no rate limit —
 * it serves the patch-versioned champion/item/spell data and all the art.
 */
const CDN = "https://ddragon.leagueoflegends.com";

/** Static data only changes on patch day; a half-day window is plenty. */
const STATIC_TTL = 60 * 60 * 12;

async function ddragon<T>(path: string): Promise<T> {
  // Next 16 leaves fetch uncached by default — `force-cache` opts in, and
  // `revalidate` sets how long an entry stays fresh.
  const res = await fetch(`${CDN}${path}`, {
    cache: "force-cache",
    next: { revalidate: STATIC_TTL, tags: ["ddragon"] },
  });
  if (!res.ok) {
    throw new Error(`Data Dragon ${res.status} for ${path}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Latest live patch, e.g. "16.14.1". `cache` dedupes this within a request so
 * a page that needs the version in five places still makes one call.
 */
export const getLatestVersion = cache(async (): Promise<string> => {
  const versions = await ddragon<string[]>("/api/versions.json");
  return versions[0];
});

export const getChampions = cache(async (): Promise<ChampionSummary[]> => {
  const version = await getLatestVersion();
  const payload = await ddragon<{ data: Record<string, ChampionSummary> }>(
    `/cdn/${version}/data/en_US/champion.json`,
  );
  return Object.values(payload.data).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
});

export const getChampion = cache(
  async (id: string): Promise<ChampionDetail | null> => {
    const version = await getLatestVersion();
    try {
      const payload = await ddragon<{ data: Record<string, ChampionDetail> }>(
        `/cdn/${version}/data/en_US/champion/${id}.json`,
      );
      return payload.data[id] ?? Object.values(payload.data)[0] ?? null;
    } catch {
      return null;
    }
  },
);

/**
 * Mastery and match payloads identify champions by numeric key, so we need the
 * reverse index to get back to names and art.
 */
export const getChampionsByKey = cache(
  async (): Promise<Map<number, ChampionSummary>> => {
    const champions = await getChampions();
    return new Map(champions.map((c) => [Number(c.key), c]));
  },
);

/** Resolve a URL-ish champion identifier ("missfortune") to its real id. */
export const resolveChampionId = cache(
  async (input: string): Promise<string | null> => {
    const champions = await getChampions();
    const needle = input.toLowerCase().replace(/[^a-z0-9]/g, "");
    const match = champions.find(
      (c) =>
        c.id.toLowerCase() === needle ||
        c.name.toLowerCase().replace(/[^a-z0-9]/g, "") === needle,
    );
    return match?.id ?? null;
  },
);

/** Summoner spell icons are keyed by their numeric id inside the payload. */
export const getSummonerSpellsByKey = cache(
  async (): Promise<Map<number, SummonerSpellData>> => {
    const version = await getLatestVersion();
    const payload = await ddragon<{ data: Record<string, SummonerSpellData> }>(
      `/cdn/${version}/data/en_US/summoner.json`,
    );
    return new Map(
      Object.values(payload.data).map((spell) => [Number(spell.key), spell]),
    );
  },
);

/* ------------------------------------------------------------------ */
/* Asset URLs                                                          */
/* ------------------------------------------------------------------ */

export function championIconUrl(version: string, imageFull: string): string {
  return `${CDN}/cdn/${version}/img/champion/${imageFull}`;
}

/** Wide 1215x717 key art. Not patch-versioned. */
export function championSplashUrl(championId: string, skinNum = 0): string {
  return `${CDN}/cdn/img/champion/splash/${championId}_${skinNum}.jpg`;
}

/** Portrait 308x560 art — better for cards than the wide splash. */
export function championLoadingUrl(championId: string, skinNum = 0): string {
  return `${CDN}/cdn/img/champion/loading/${championId}_${skinNum}.jpg`;
}

export function spellIconUrl(version: string, imageFull: string): string {
  return `${CDN}/cdn/${version}/img/spell/${imageFull}`;
}

export function passiveIconUrl(version: string, imageFull: string): string {
  return `${CDN}/cdn/${version}/img/passive/${imageFull}`;
}

export function profileIconUrl(version: string, iconId: number): string {
  return `${CDN}/cdn/${version}/img/profileicon/${iconId}.png`;
}

export function itemIconUrl(version: string, itemId: number): string {
  return `${CDN}/cdn/${version}/img/item/${itemId}.png`;
}
