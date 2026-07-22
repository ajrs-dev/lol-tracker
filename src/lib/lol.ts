/** Game-domain constants: queues, tiers, roles. */

/** Riot's queue ids. Only the ones a player is likely to see. */
const QUEUE_LABELS: Record<number, string> = {
  0: "Custom",
  400: "Normal Draft",
  420: "Ranked Solo/Duo",
  430: "Normal Blind",
  440: "Ranked Flex",
  450: "ARAM",
  490: "Quickplay",
  700: "Clash",
  720: "ARAM Clash",
  830: "Co-op vs AI (Intro)",
  840: "Co-op vs AI (Beginner)",
  850: "Co-op vs AI (Intermediate)",
  900: "ARURF",
  1020: "One for All",
  1300: "Nexus Blitz",
  1400: "Ultimate Spellbook",
  1700: "Arena",
  1710: "Arena",
  1900: "URF",
};

export function queueLabel(queueId: number): string {
  return QUEUE_LABELS[queueId] ?? "Custom";
}

const RANKED_QUEUE_LABELS: Record<string, string> = {
  RANKED_SOLO_5x5: "Ranked Solo/Duo",
  RANKED_FLEX_SR: "Ranked Flex",
  RANKED_FLEX_TT: "Ranked Flex 3v3",
  CHERRY: "Arena",
};

export function rankedQueueLabel(queueType: string): string {
  return RANKED_QUEUE_LABELS[queueType] ?? queueType.replaceAll("_", " ");
}

/** Solo queue first, then flex, then everything else. */
export function rankedQueueOrder(queueType: string): number {
  if (queueType === "RANKED_SOLO_5x5") return 0;
  if (queueType === "RANKED_FLEX_SR") return 1;
  return 2;
}

export const TIERS = [
  "IRON",
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "EMERALD",
  "DIAMOND",
  "MASTER",
  "GRANDMASTER",
  "CHALLENGER",
] as const;

export type Tier = (typeof TIERS)[number];

/**
 * Riot doesn't ship rank emblems on Data Dragon, so tiers are rendered as CSS
 * gradients instead of images — no broken art when Riot moves an asset.
 */
export const TIER_COLORS: Record<string, { from: string; to: string; text: string }> = {
  IRON: { from: "#6b5f57", to: "#453c36", text: "#cfc4ba" },
  BRONZE: { from: "#a3663a", to: "#6b3f21", text: "#f0c9a8" },
  SILVER: { from: "#9fadb8", to: "#697884", text: "#e8f0f5" },
  GOLD: { from: "#f0c674", to: "#b8862f", text: "#fff4d6" },
  PLATINUM: { from: "#4ec1c1", to: "#25787d", text: "#d6fbfb" },
  EMERALD: { from: "#43c47c", to: "#1e7245", text: "#d4fbe4" },
  DIAMOND: { from: "#7d92f0", to: "#3f4fae", text: "#e0e6ff" },
  MASTER: { from: "#c874ee", to: "#7b2fa8", text: "#f5ddff" },
  GRANDMASTER: { from: "#e8536b", to: "#992034", text: "#ffdde2" },
  CHALLENGER: { from: "#f4d792", to: "#4fd3e8", text: "#ffffff" },
  UNRANKED: { from: "#3c3c41", to: "#1e2328", text: "#a09b8c" },
};

export function tierColors(tier: string) {
  return TIER_COLORS[tier?.toUpperCase()] ?? TIER_COLORS.UNRANKED;
}

/** Apex tiers are single-division; showing "I" next to them is noise. */
export function isApexTier(tier: string): boolean {
  const t = tier?.toUpperCase();
  return t === "MASTER" || t === "GRANDMASTER" || t === "CHALLENGER";
}

const POSITION_LABELS: Record<string, string> = {
  TOP: "Top",
  JUNGLE: "Jungle",
  MIDDLE: "Mid",
  BOTTOM: "Bot",
  UTILITY: "Support",
};

export function positionLabel(position: string): string {
  return POSITION_LABELS[position] ?? "";
}

/** Champion class tags, in the order Riot lists them in champion select. */
export const CHAMPION_TAGS = [
  "Assassin",
  "Fighter",
  "Mage",
  "Marksman",
  "Support",
  "Tank",
] as const;

export const TAG_COLORS: Record<string, string> = {
  Assassin: "#e8536b",
  Fighter: "#e08c3c",
  Mage: "#4b9df0",
  Marksman: "#43c47c",
  Support: "#43c4bd",
  Tank: "#a08fd8",
};

/**
 * Mastery crossed level 7 in the 2024 rework and now climbs indefinitely.
 * Colour bands keep the grid readable at a glance.
 */
export function masteryColor(level: number): string {
  if (level >= 10) return "#f4d792";
  if (level >= 7) return "#c874ee";
  if (level >= 6) return "#e8536b";
  if (level >= 5) return "#4b9df0";
  if (level >= 4) return "#43c47c";
  return "#5b5a56";
}
