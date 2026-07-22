import "server-only";
import { cache } from "react";
import {
  accountHost,
  getRegion,
  platformHost,
  regionalHost,
  type RegionCode,
} from "./regions";
import { getChampionsByKey, getLatestVersion, profileIconUrl } from "./ddragon";
import { queueLabel, rankedQueueLabel, rankedQueueOrder } from "./lol";
import type {
  ChampionMasteryDTO,
  LeagueEntryDTO,
  MasteryEntry,
  MatchDTO,
  MatchSummary,
  RankedSummary,
  RiotAccount,
  SummonerDTO,
  SummonerProfile,
} from "./types";

/**
 * Riot API client. Every call runs server-side — `server-only` makes importing
 * this from a client component a build error, so the key can never leak into
 * the browser bundle.
 */

export type RiotErrorCode =
  | "NO_API_KEY"
  | "INVALID_API_KEY"
  | "KEY_FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "BAD_REQUEST"
  | "UPSTREAM_ERROR";

export class RiotApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: RiotErrorCode,
    message: string,
    /** Seconds to wait, when Riot sends a Retry-After header. */
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "RiotApiError";
  }
}

function apiKey(): string {
  const key = process.env.RIOT_API_KEY?.trim();
  if (!key) {
    throw new RiotApiError(
      503,
      "NO_API_KEY",
      "RIOT_API_KEY is not set. Add it to .env.local and restart the dev server.",
    );
  }
  return key;
}

/** True when a key is configured — lets pages render a setup state instead of an error. */
export function hasApiKey(): boolean {
  return Boolean(process.env.RIOT_API_KEY?.trim());
}

async function riotFetch<T>(url: string, revalidate: number): Promise<T> {
  // Explicit `force-cache` is required in Next 16 — `revalidate` alone leaves
  // the request uncached, which would burn the dev key's rate limit fast.
  const res = await fetch(url, {
    headers: { "X-Riot-Token": apiKey() },
    cache: "force-cache",
    next: { revalidate },
  });

  if (res.ok) return res.json() as Promise<T>;

  switch (res.status) {
    case 400:
      throw new RiotApiError(400, "BAD_REQUEST", "Riot rejected the request as malformed.");
    case 401:
      throw new RiotApiError(
        401,
        "INVALID_API_KEY",
        "Riot rejected the API key. Check RIOT_API_KEY in .env.local.",
      );
    case 403:
      // Overwhelmingly this means a development key aged out — they last 24h.
      throw new RiotApiError(
        403,
        "KEY_FORBIDDEN",
        "Riot returned 403. Development keys expire after 24 hours — regenerate yours at developer.riotgames.com and update .env.local.",
      );
    case 404:
      throw new RiotApiError(404, "NOT_FOUND", "Riot has no record matching that request.");
    case 429: {
      const retryAfter = Number(res.headers.get("Retry-After")) || undefined;
      throw new RiotApiError(
        429,
        "RATE_LIMITED",
        retryAfter
          ? `Rate limited by Riot. Try again in ${retryAfter}s.`
          : "Rate limited by Riot. Try again shortly.",
        retryAfter,
      );
    }
    default:
      throw new RiotApiError(
        res.status,
        "UPSTREAM_ERROR",
        `Riot API error ${res.status}. The platform may be down for maintenance.`,
      );
  }
}

/* ------------------------------------------------------------------ */
/* Endpoints                                                           */
/* ------------------------------------------------------------------ */

/** account-v1 — resolve a Riot ID ("Faker#KR1") to a PUUID. */
export const getAccount = cache(
  async (region: RegionCode, gameName: string, tagLine: string): Promise<RiotAccount> => {
    const url = `${accountHost(region)}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
      gameName,
    )}/${encodeURIComponent(tagLine)}`;
    try {
      return await riotFetch<RiotAccount>(url, 60 * 60);
    } catch (error) {
      if (error instanceof RiotApiError && error.status === 404) {
        throw new RiotApiError(
          404,
          "NOT_FOUND",
          `No Riot account found for ${gameName}#${tagLine}.`,
        );
      }
      throw error;
    }
  },
);

/** summoner-v4 — level and profile icon. */
export const getSummoner = cache(
  async (region: RegionCode, puuid: string): Promise<SummonerDTO> =>
    riotFetch<SummonerDTO>(
      `${platformHost(region)}/lol/summoner/v4/summoners/by-puuid/${puuid}`,
      60 * 5,
    ),
);

/**
 * league-v4 — ranked entries. Riot migrated this to by-puuid; the by-summoner
 * path is kept as a fallback for platforms still serving the old shape.
 */
export const getLeagueEntries = cache(
  async (
    region: RegionCode,
    puuid: string,
    summonerId?: string,
  ): Promise<LeagueEntryDTO[]> => {
    try {
      return await riotFetch<LeagueEntryDTO[]>(
        `${platformHost(region)}/lol/league/v4/entries/by-puuid/${puuid}`,
        60 * 2,
      );
    } catch (error) {
      const recoverable =
        error instanceof RiotApiError &&
        (error.status === 404 || error.status === 400);
      if (recoverable && summonerId) {
        return riotFetch<LeagueEntryDTO[]>(
          `${platformHost(region)}/lol/league/v4/entries/by-summoner/${summonerId}`,
          60 * 2,
        );
      }
      if (recoverable) return [];
      throw error;
    }
  },
);

/** champion-mastery-v4 — every champion the player has points on. */
export const getMasteries = cache(
  async (region: RegionCode, puuid: string): Promise<ChampionMasteryDTO[]> =>
    riotFetch<ChampionMasteryDTO[]>(
      `${platformHost(region)}/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}`,
      60 * 5,
    ),
);

/** champion-mastery-v4 — total mastery score across all champions. */
export const getMasteryScore = cache(
  async (region: RegionCode, puuid: string): Promise<number> =>
    riotFetch<number>(
      `${platformHost(region)}/lol/champion-mastery/v4/scores/by-puuid/${puuid}`,
      60 * 5,
    ),
);

/** match-v5 — recent match ids, newest first. */
export const getMatchIds = cache(
  async (region: RegionCode, puuid: string, count = 8): Promise<string[]> =>
    riotFetch<string[]>(
      `${regionalHost(region)}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${count}`,
      60 * 2,
    ),
);

/** match-v5 — full match. Completed matches never change, so cache them hard. */
export const getMatch = cache(
  async (region: RegionCode, matchId: string): Promise<MatchDTO> =>
    riotFetch<MatchDTO>(
      `${regionalHost(region)}/lol/match/v5/matches/${matchId}`,
      60 * 60 * 24 * 7,
    ),
);

/* ------------------------------------------------------------------ */
/* Composition                                                         */
/* ------------------------------------------------------------------ */

function toRankedSummary(entries: LeagueEntryDTO[]): RankedSummary[] {
  return entries
    .filter((entry) => entry.tier)
    .map((entry) => {
      const total = entry.wins + entry.losses;
      return {
        queueType: entry.queueType,
        queueLabel: rankedQueueLabel(entry.queueType),
        tier: entry.tier,
        rank: entry.rank,
        leaguePoints: entry.leaguePoints,
        wins: entry.wins,
        losses: entry.losses,
        winRate: total === 0 ? 0 : Math.round((entry.wins / total) * 100),
        hotStreak: entry.hotStreak,
      };
    })
    .sort((a, b) => rankedQueueOrder(a.queueType) - rankedQueueOrder(b.queueType));
}

export async function buildMasteryEntries(
  masteries: ChampionMasteryDTO[],
  limit?: number,
): Promise<MasteryEntry[]> {
  const byKey = await getChampionsByKey();
  return masteries
    .slice(0, limit ?? masteries.length)
    .map((mastery) => {
      const champion = byKey.get(mastery.championId);
      return {
        championId: mastery.championId,
        championKey: champion?.id ?? String(mastery.championId),
        championName: champion?.name ?? `Champion ${mastery.championId}`,
        championTitle: champion?.title ?? "",
        championImage: champion?.image.full ?? "",
        tags: champion?.tags ?? [],
        level: mastery.championLevel,
        points: mastery.championPoints,
        pointsSinceLastLevel: mastery.championPointsSinceLastLevel,
        pointsUntilNextLevel: mastery.championPointsUntilNextLevel,
        lastPlayTime: mastery.lastPlayTime,
        tokensEarned: mastery.tokensEarned,
        chestGranted: mastery.chestGranted ?? false,
      };
    });
}

/** Flatten a match to one player's perspective. */
function toMatchSummary(match: MatchDTO, puuid: string): MatchSummary | null {
  const me = match.info.participants.find((p) => p.puuid === puuid);
  if (!me) return null;

  // Riot switched gameDuration from millis to seconds in patch 11.20.
  const duration =
    match.info.gameDuration > 100_000
      ? Math.round(match.info.gameDuration / 1000)
      : match.info.gameDuration;

  const teamKills = match.info.participants
    .filter((p) => p.teamId === me.teamId)
    .reduce((sum, p) => sum + p.kills, 0);

  const cs = me.totalMinionsKilled + me.neutralMinionsKilled;
  const minutes = duration / 60;

  return {
    matchId: match.metadata.matchId,
    queueId: match.info.queueId,
    queueLabel: queueLabel(match.info.queueId),
    gameMode: match.info.gameMode,
    gameDuration: duration,
    gameEndTimestamp:
      match.info.gameEndTimestamp ?? match.info.gameCreation + duration * 1000,
    win: me.win,
    remake: duration < 300,
    championId: me.championId,
    championName: me.championName,
    champLevel: me.champLevel,
    teamPosition: me.teamPosition,
    kills: me.kills,
    deaths: me.deaths,
    assists: me.assists,
    csTotal: cs,
    csPerMinute: minutes > 0 ? Number((cs / minutes).toFixed(1)) : 0,
    goldEarned: me.goldEarned,
    visionScore: me.visionScore,
    damageToChampions: me.totalDamageDealtToChampions,
    killParticipation:
      teamKills > 0 ? Math.round(((me.kills + me.assists) / teamKills) * 100) : 0,
    items: [me.item0, me.item1, me.item2, me.item3, me.item4, me.item5],
    trinket: me.item6,
    summonerSpells: [me.summoner1Id, me.summoner2Id],
  };
}

export async function getRecentMatches(
  region: RegionCode,
  puuid: string,
  count = 8,
): Promise<MatchSummary[]> {
  const ids = await getMatchIds(region, puuid, count);
  // allSettled so one unavailable match doesn't blank the whole history.
  const results = await Promise.allSettled(ids.map((id) => getMatch(region, id)));
  return results
    .filter(
      (result): result is PromiseFulfilledResult<MatchDTO> =>
        result.status === "fulfilled",
    )
    .map((result) => toMatchSummary(result.value, puuid))
    .filter((summary): summary is MatchSummary => summary !== null);
}

/**
 * Everything a profile page needs, in as few round trips as the rate limit
 * allows. Mastery/rank/matches are fetched in parallel once the PUUID is known.
 */
export async function getSummonerProfile(
  region: RegionCode,
  gameName: string,
  tagLine: string,
  options: { masteryCount?: number; matchCount?: number } = {},
): Promise<SummonerProfile> {
  const { masteryCount = 24, matchCount = 8 } = options;

  const account = await getAccount(region, gameName, tagLine);
  const summoner = await getSummoner(region, account.puuid);

  const [version, entries, masteries, masteryScore, matches] = await Promise.all([
    getLatestVersion(),
    getLeagueEntries(region, account.puuid, summoner.id),
    getMasteries(region, account.puuid),
    // Non-critical: a failure here shouldn't cost the whole page.
    getMasteryScore(region, account.puuid).catch(() => 0),
    getRecentMatches(region, account.puuid, matchCount).catch(() => []),
  ]);

  return {
    account,
    region,
    regionLabel: getRegion(region).label,
    profileIconId: summoner.profileIconId,
    profileIconUrl: profileIconUrl(version, summoner.profileIconId),
    summonerLevel: summoner.summonerLevel,
    revisionDate: summoner.revisionDate,
    masteryScore,
    ranked: toRankedSummary(entries),
    mastery: await buildMasteryEntries(masteries, masteryCount),
    matches,
    version,
  };
}
