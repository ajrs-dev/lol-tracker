/**
 * Shared types for Data Dragon (static game data) and the Riot Games API.
 * Field names mirror the upstream payloads exactly so responses can be passed
 * through without remapping.
 */

/* ------------------------------------------------------------------ */
/* Data Dragon                                                         */
/* ------------------------------------------------------------------ */

export interface DDImage {
  full: string;
  sprite: string;
  group: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Riot's 0-10 "at a glance" ratings shown on the champion select screen. */
export interface ChampionInfo {
  attack: number;
  defense: number;
  magic: number;
  difficulty: number;
}

export interface ChampionStats {
  hp: number;
  hpperlevel: number;
  mp: number;
  mpperlevel: number;
  movespeed: number;
  armor: number;
  armorperlevel: number;
  spellblock: number;
  spellblockperlevel: number;
  attackrange: number;
  hpregen: number;
  hpregenperlevel: number;
  mpregen: number;
  mpregenperlevel: number;
  crit: number;
  critperlevel: number;
  attackdamage: number;
  attackdamageperlevel: number;
  attackspeed: number;
  attackspeedperlevel: number;
}

/** Entry from `champion.json` — the trimmed record used for list views. */
export interface ChampionSummary {
  version: string;
  id: string;
  key: string;
  name: string;
  title: string;
  blurb: string;
  info: ChampionInfo;
  image: DDImage;
  tags: string[];
  partype: string;
  stats: ChampionStats;
}

export interface ChampionSkin {
  id: string;
  num: number;
  name: string;
  chromas: boolean;
}

export interface ChampionSpell {
  id: string;
  name: string;
  description: string;
  tooltip: string;
  maxrank: number;
  cooldownBurn: string;
  costBurn: string;
  rangeBurn: string;
  costType: string;
  resource?: string;
  image: DDImage;
}

export interface ChampionPassive {
  name: string;
  description: string;
  image: DDImage;
}

/** Entry from `champion/{id}.json` — the full record with kit and skins. */
export interface ChampionDetail {
  id: string;
  key: string;
  name: string;
  title: string;
  lore: string;
  blurb: string;
  image: DDImage;
  tags: string[];
  partype: string;
  info: ChampionInfo;
  stats: ChampionStats;
  allytips: string[];
  enemytips: string[];
  skins: ChampionSkin[];
  spells: ChampionSpell[];
  passive: ChampionPassive;
}

export interface SummonerSpellData {
  id: string;
  name: string;
  description: string;
  key: string;
  image: DDImage;
}

/* ------------------------------------------------------------------ */
/* Riot API                                                            */
/* ------------------------------------------------------------------ */

export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface SummonerDTO {
  /** Encrypted summoner ID. Riot is phasing this out — treat as optional. */
  id?: string;
  accountId?: string;
  puuid: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

export interface LeagueEntryDTO {
  leagueId: string;
  queueType: string;
  tier: string;
  rank: string;
  summonerId?: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
  inactive: boolean;
}

export interface ChampionMasteryDTO {
  puuid: string;
  championId: number;
  championLevel: number;
  championPoints: number;
  lastPlayTime: number;
  championPointsSinceLastLevel: number;
  championPointsUntilNextLevel: number;
  chestGranted?: boolean;
  tokensEarned: number;
  markRequiredForNextLevel?: number;
}

export interface MatchParticipant {
  puuid: string;
  riotIdGameName?: string;
  riotIdTagline?: string;
  championId: number;
  championName: string;
  champLevel: number;
  teamId: number;
  teamPosition: string;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  goldEarned: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  visionScore: number;
  totalDamageDealtToChampions: number;
  summoner1Id: number;
  summoner2Id: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
}

export interface MatchDTO {
  metadata: {
    matchId: string;
    participants: string[];
  };
  info: {
    gameCreation: number;
    gameDuration: number;
    gameEndTimestamp?: number;
    gameMode: string;
    gameType: string;
    gameVersion: string;
    queueId: number;
    participants: MatchParticipant[];
  };
}

/* ------------------------------------------------------------------ */
/* Application-shaped responses                                        */
/* ------------------------------------------------------------------ */

/** A mastery entry joined against Data Dragon so the UI has names + art. */
export interface MasteryEntry {
  championId: number;
  championKey: string;
  championName: string;
  championTitle: string;
  championImage: string;
  tags: string[];
  level: number;
  points: number;
  pointsSinceLastLevel: number;
  pointsUntilNextLevel: number;
  lastPlayTime: number;
  tokensEarned: number;
  chestGranted: boolean;
}

/** One match, flattened to the viewing player's perspective. */
export interface MatchSummary {
  matchId: string;
  queueId: number;
  queueLabel: string;
  gameMode: string;
  gameDuration: number;
  gameEndTimestamp: number;
  win: boolean;
  remake: boolean;
  championId: number;
  championName: string;
  champLevel: number;
  teamPosition: string;
  kills: number;
  deaths: number;
  assists: number;
  csTotal: number;
  csPerMinute: number;
  goldEarned: number;
  visionScore: number;
  damageToChampions: number;
  killParticipation: number;
  items: number[];
  trinket: number;
  summonerSpells: [number, number];
}

export interface RankedSummary {
  queueType: string;
  queueLabel: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  winRate: number;
  hotStreak: boolean;
}

export interface SummonerProfile {
  account: RiotAccount;
  region: string;
  regionLabel: string;
  profileIconId: number;
  profileIconUrl: string;
  summonerLevel: number;
  revisionDate: number;
  masteryScore: number;
  ranked: RankedSummary[];
  mastery: MasteryEntry[];
  matches: MatchSummary[];
  version: string;
}
