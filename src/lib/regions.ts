/**
 * Riot splits its API across two host families:
 *
 *   platform host  — summoner-v4, league-v4, champion-mastery-v4  (e.g. na1)
 *   regional host  — account-v1, match-v5                          (e.g. americas)
 *
 * A single user-facing region code maps to both.
 */

export type RegionalRoute = "americas" | "europe" | "asia" | "sea";

export interface Region {
  /** Platform host prefix, also the code used in our URLs. */
  platform: string;
  /** Regional cluster for match-v5. */
  route: RegionalRoute;
  label: string;
  /** Short tag shown in the UI, e.g. "NA". */
  short: string;
}

export const REGIONS = {
  na1: { platform: "na1", route: "americas", label: "North America", short: "NA" },
  euw1: { platform: "euw1", route: "europe", label: "Europe West", short: "EUW" },
  eun1: { platform: "eun1", route: "europe", label: "Europe Nordic & East", short: "EUNE" },
  kr: { platform: "kr", route: "asia", label: "Korea", short: "KR" },
  br1: { platform: "br1", route: "americas", label: "Brazil", short: "BR" },
  jp1: { platform: "jp1", route: "asia", label: "Japan", short: "JP" },
  la1: { platform: "la1", route: "americas", label: "Latin America North", short: "LAN" },
  la2: { platform: "la2", route: "americas", label: "Latin America South", short: "LAS" },
  oc1: { platform: "oc1", route: "sea", label: "Oceania", short: "OCE" },
  tr1: { platform: "tr1", route: "europe", label: "Türkiye", short: "TR" },
  ru: { platform: "ru", route: "europe", label: "Russia", short: "RU" },
  me1: { platform: "me1", route: "europe", label: "Middle East", short: "ME" },
  ph2: { platform: "ph2", route: "sea", label: "Philippines", short: "PH" },
  sg2: { platform: "sg2", route: "sea", label: "Singapore", short: "SG" },
  th2: { platform: "th2", route: "sea", label: "Thailand", short: "TH" },
  tw2: { platform: "tw2", route: "sea", label: "Taiwan", short: "TW" },
  vn2: { platform: "vn2", route: "sea", label: "Vietnam", short: "VN" },
} as const satisfies Record<string, Region>;

export type RegionCode = keyof typeof REGIONS;

export const REGION_CODES = Object.keys(REGIONS) as RegionCode[];

export function isRegionCode(value: string): value is RegionCode {
  return Object.prototype.hasOwnProperty.call(REGIONS, value);
}

export function getRegion(code: string): Region {
  if (!isRegionCode(code)) {
    throw new Error(
      `Unknown region "${code}". Expected one of: ${REGION_CODES.join(", ")}`,
    );
  }
  return REGIONS[code];
}

/** Host for summoner-v4 / league-v4 / champion-mastery-v4. */
export function platformHost(code: RegionCode): string {
  return `https://${REGIONS[code].platform}.api.riotgames.com`;
}

/** Host for match-v5. */
export function regionalHost(code: RegionCode): string {
  return `https://${REGIONS[code].route}.api.riotgames.com`;
}

/**
 * Host for account-v1. The endpoint is global, but Riot only serves it from
 * americas / europe / asia — SEA platforms have to borrow the asia cluster.
 */
export function accountHost(code: RegionCode): string {
  const route = REGIONS[code].route;
  return `https://${route === "sea" ? "asia" : route}.api.riotgames.com`;
}

/**
 * Tagline candidates to try when a lookup omits one, likeliest first.
 *
 * Riot's defaults follow no single rule, so all three shapes are needed:
 *
 *   NA1  the platform code — Doublelift#NA1 resolves, Doublelift#NA doesn't
 *   KR1  platform codes without a digit still tag numbered — Hide on bush#KR1
 *        is the real account, Hide on bush#KR is a different one entirely
 *   EUW  the short label — Caps#EUW and Agurin#EUW resolve, Caps#EUW1 doesn't
 *
 * Verified against account-v1. Most regions collapse to two candidates.
 *
 * This stays a guess. Players can set any tagline they like, and Riot retired
 * lookup-by-name, so there is no way to enumerate the real one.
 */
export function defaultTagLines(code: RegionCode): string[] {
  const { platform, short } = REGIONS[code];
  const upper = platform.toUpperCase();
  const numbered = /\d$/.test(upper) ? upper : `${upper}1`;
  return [...new Set([numbered, upper, short])];
}
