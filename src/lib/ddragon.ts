import { cache } from "react";
import SKIN_ART from "./skin-art.json";
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

/** `champion.id` -> the skin numbers Riot publishes loading art for. */
const ART_BY_CHAMPION: Record<string, number[] | undefined> = SKIN_ART.skins;

/**
 * Chromas are named after the skin they recolour: "<skin name> (<colour>)",
 * where that skin is in the same list carrying the `chromas` flag. Matching
 * both halves is specific enough to drop an entry on sight — checked against
 * every skin Riot ships, it accounts for 6,044 of the 6,976 artless entries
 * and has never once matched an entry that does have art.
 *
 * It's only a naming rule, so it isn't the primary filter — the manifest is.
 * This is what catches a champion the manifest predates, and it misses the
 * chromas where Riot's data carries a stray double space ("Pumpkin Prince
 * Amumu (Ruby)"), which is why it isn't trusted alone.
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
 * Nothing in the payload separates the two, and no rule over the names does it
 * either: "Praetorian Fiddlesticks" reads like a skin and has no art, while
 * "Prestige K/DA Ahri (2022)" reads like a chroma and has some. Only the CDN
 * knows, and asking it here is what `skin-art.json` exists to avoid — 9,000
 * requests made while rendering left builds at the mercy of CDN latency, and a
 * burst of connection timeouts silently emptied whole galleries. The manifest
 * settles it offline instead; `npm run refresh-skin-art` rebuilds it.
 *
 * The manifest is the whole answer for a champion it lists, so a patch that
 * adds skins won't show them until it's refreshed — a missing tile, never a
 * broken one. A champion it has never seen is the one case that falls back to
 * the naming rule, so a new release isn't a blank gallery.
 */
export function getSkinsWithArt(champion: ChampionDetail): ChampionSkin[] {
  const known = ART_BY_CHAMPION[champion.id];
  if (!known) {
    return champion.skins.filter((skin) => !isChroma(skin, champion.skins));
  }

  const withArt = new Set(known);
  return champion.skins.filter((skin) => withArt.has(skin.num));
}

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
