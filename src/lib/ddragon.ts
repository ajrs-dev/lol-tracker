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

/**
 * A refused check costs a real skin, so give each one several looks, backing
 * off far enough to be worth making — a throttled CDN wants less traffic, not
 * the same amount sooner.
 */
const ART_CHECK_ATTEMPTS = 4;

/**
 * Art Riot doesn't have answers 403 — the bucket denies the listing rather than
 * reporting a miss — and 404 covers anything served conventionally. Every other
 * status is the CDN declining to answer, which is not the same thing.
 */
function isMissing(status: number): boolean {
  return status === 403 || status === 404;
}

/**
 * A skin entry is only worth rendering if Riot published art for it.
 *
 * Treating every non-2xx as "no art" is the trap here: under load the CDN
 * starts answering 429 and 5xx, whole champions at a time, and reading those as
 * absence quietly deleted all of Renekton's skins on one build and all of
 * Vladimir's on another. Only 403 and 404 mean the art isn't there.
 */
async function hasLoadingArt(
  championId: string,
  skinNum: number,
): Promise<boolean> {
  const url = championLoadingUrl(championId, skinNum);
  let lastError: unknown;

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
      if (res.ok) return true;
      if (isMissing(res.status)) return false;
      lastError = new Error(`Data Dragon answered ${res.status} for ${url}`);
    } catch (error) {
      lastError = error;
    }

    if (attempt < ART_CHECK_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
    }
  }

  // Neither guess is safe once the CDN has stopped answering: rendering the art
  // risks a broken image, and dropping it silently is what deleted those
  // galleries, leaving "Skins (0)" with nothing to say why. Give up instead and
  // let the caller fail. `next build` retries a page three times before failing
  // the build, so a blip resolves itself and a real outage is loud; on
  // revalidation the throw keeps the last good prerender, stale but never wrong.
  throw new Error(`Data Dragon art check failed for ${championId}_${skinNum}`, {
    cause: lastError,
  });
}

/**
 * What breaks first here isn't the CDN, it's the number of sockets opened to it
 * at once: `next build` runs eleven workers, so this is multiplied by eleven,
 * and past roughly a hundred the connections start timing out before they're
 * established. Skipping the recognisable chromas cut the work to a third, which
 * buys back the room to keep this low — Master Yi needs the most checks at 80,
 * ten rounds, and a page has 180 seconds.
 */
const ART_CHECK_LIMIT = 8;

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
 * Chromas are named after the skin they recolour: "<skin name> (<colour>)",
 * where that skin is in the same list carrying the `chromas` flag. Matching
 * both halves is specific enough to drop an entry unasked — checked against
 * every skin Riot ships, it accounts for 6,044 of the 6,976 artless entries
 * and has never once matched an entry that does have art.
 *
 * It is still only a naming rule, so it is trusted to skip a request and
 * nothing more. Whatever it doesn't recognise gets verified as before,
 * including the chromas it misses where Riot's data carries a stray double
 * space ("Pumpkin Prince  Amumu (Ruby)").
 */
function isChroma(skin: ChampionSkin, skins: ChampionSkin[]): boolean {
  const parent = /^(.*) \(.+\)$/.exec(skin.name)?.[1];
  return (
    parent !== undefined &&
    skins.some(
      (other) => other !== skin && other.chromas && other.name === parent,
    )
  );
}

/**
 * Data Dragon's `skins` array lists chromas next to real skins — roughly three
 * quarters of the entries — and Riot ships no art for them, so rendering the
 * raw list gives a wall of broken images (Fiora: 100 entries, 17 with art).
 *
 * Nothing in the payload separates the two outright. `chromas` flags the
 * *parent* skin rather than the chromas themselves, and names alone are no
 * help: "Praetorian Fiddlesticks" reads like a skin but has no art, while
 * "Prestige K/DA Ahri (2022)" reads like a chroma and does. So the recognisable
 * chromas are dropped up front and everything else is put to the CDN, which
 * settles the rest and self-corrects whenever Riot fills a gap in.
 */
export const getSkinsWithArt = cache(
  async (champion: ChampionDetail): Promise<ChampionSkin[]> => {
    const candidates = champion.skins.filter(
      (skin) => !isChroma(skin, champion.skins),
    );
    const available = await mapWithLimit(candidates, ART_CHECK_LIMIT, (skin) =>
      hasLoadingArt(champion.id, skin.num),
    );
    return candidates.filter((_, index) => available[index]);
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
