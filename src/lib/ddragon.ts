import { cache } from "react";
import type {
  ChampionDetail,
  ChampionSkin,
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

/** Long enough for a cold CDN edge, short enough not to stall a build. */
const ART_CHECK_TIMEOUT = 10_000;

/** A dropped connection costs a real skin, so give each check another look. */
const ART_CHECK_ATTEMPTS = 3;

/**
 * A skin entry is only worth rendering if Riot published art for it. Missing
 * art answers 403 rather than 404, so `res.ok` is the signal either way.
 */
async function hasLoadingArt(
  championId: string,
  skinNum: number,
): Promise<boolean> {
  const url = championLoadingUrl(championId, skinNum);

  for (let attempt = 1; attempt <= ART_CHECK_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        // HEAD is enough — we only need the status, not the JPEG. Next only
        // caches 2xx, so the hits come free on a warm build and it's the
        // misses that get re-checked; keeping them cheap is the point.
        method: "HEAD",
        cache: "force-cache",
        next: { revalidate: STATIC_TTL, tags: ["ddragon"] },
        // Bounds the wait, and opts out of request-level memoization — which
        // is what lets a retry reach the network at all, since Next remembers
        // the rejected promise from the previous attempt.
        signal: AbortSignal.timeout(ART_CHECK_TIMEOUT),
      });
      return res.ok;
    } catch {
      if (attempt < ART_CHECK_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
      }
    }
  }

  // Don't render art we couldn't confirm. A prerender lasts until the next
  // revalidation, so guessing wrong here would pin a broken image to the page
  // for half a day; a missing tile is the cheaper mistake.
  return false;
}

/**
 * A champion can carry 100 skin entries. Firing them all at once — across the
 * workers `next build` runs in parallel — makes the CDN drop connections, and
 * every dropped check costs a real skin, so keep a lid on it.
 */
const ART_CHECK_LIMIT = 6;

async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await worker(items[index]);
      }
    }),
  );
  return results;
}

/**
 * Data Dragon's `skins` array lists chromas next to real skins — roughly three
 * quarters of the entries — and Riot ships no art for them, so rendering the
 * raw list gives a wall of broken images (Fiora: 100 entries, 17 with art).
 *
 * Nothing in the payload separates the two. `chromas` flags the *parent* skin
 * rather than the chromas themselves, and the names are no help: "Praetorian
 * Fiddlesticks" reads like a skin but has no art, while "Prestige K/DA Ahri
 * (2022)" reads like a chroma and does. Asking the CDN is the only rule that
 * holds, and it self-corrects whenever Riot fills a gap in.
 */
export const getSkinsWithArt = cache(
  async (champion: ChampionDetail): Promise<ChampionSkin[]> => {
    const available = await mapWithLimit(
      champion.skins,
      ART_CHECK_LIMIT,
      (skin) => hasLoadingArt(champion.id, skin.num),
    );
    return champion.skins.filter((_, index) => available[index]);
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
