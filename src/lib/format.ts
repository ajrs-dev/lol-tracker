/** Presentation helpers. Pure functions — safe on both server and client. */

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const plain = new Intl.NumberFormat("en-US");

/** 1234567 -> "1.2M". Used for mastery points and damage. */
export function compactNumber(value: number): string {
  return compact.format(value);
}

export function formatNumber(value: number): string {
  return plain.format(value);
}

/** Seconds -> "28:14". */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** Epoch millis -> "3 days ago". */
export function timeAgo(timestamp: number): string {
  if (!timestamp) return "unknown";
  const deltaSeconds = (timestamp - Date.now()) / 1000;
  for (const [unit, secondsInUnit] of RELATIVE_UNITS) {
    if (Math.abs(deltaSeconds) >= secondsInUnit) {
      return relative.format(Math.round(deltaSeconds / secondsInUnit), unit);
    }
  }
  return "just now";
}

/** Deaths of 0 are reported as "Perfect" by convention, not Infinity. */
export function kdaRatio(kills: number, deaths: number, assists: number): number {
  return deaths === 0 ? kills + assists : (kills + assists) / deaths;
}

export function formatKda(kills: number, deaths: number, assists: number): string {
  if (deaths === 0) return "Perfect";
  return `${kdaRatio(kills, deaths, assists).toFixed(2)}:1`;
}

export function winRate(wins: number, losses: number): number {
  const total = wins + losses;
  return total === 0 ? 0 : Math.round((wins / total) * 100);
}

/**
 * Data Dragon ability text is marked up with custom tags (`<magicDamage>`,
 * `<br>`) and unresolved `{{ e1 }}` placeholders. Strip both so the copy reads
 * as plain prose.
 */
export function stripGameMarkup(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\{\{\s*[^}]*\}\}/g, "?")
    .replace(/\s+/g, " ")
    .trim();
}

/** Growth stats read better as "650 (+114/lvl)" than two separate numbers. */
export function statWithGrowth(base: number, perLevel: number): string {
  const rounded = Math.round(base * 100) / 100;
  if (!perLevel) return `${rounded}`;
  return `${rounded} (+${Math.round(perLevel * 100) / 100}/lvl)`;
}

/** Turns "RANKED_SOLO_5x5" style values into something displayable. */
export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[\s_]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
