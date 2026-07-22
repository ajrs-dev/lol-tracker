import { isApexTier, tierColors } from "@/lib/lol";
import { formatNumber, titleCase } from "@/lib/format";
import type { RankedSummary } from "@/lib/types";

/**
 * One ranked queue. Riot doesn't ship tier emblems on Data Dragon, so the tier
 * is rendered as its gradient (see TIER_COLORS) rather than an image.
 */
export function RankCard({ entry }: { entry: RankedSummary }) {
  const colors = tierColors(entry.tier);
  const division = isApexTier(entry.tier) ? "" : ` ${entry.rank}`;

  return (
    <div className="panel flex items-center gap-4 rounded-lg p-4">
      <div
        aria-hidden
        className="flex h-14 w-14 shrink-0 rotate-45 items-center justify-center rounded-md border border-void-300"
        style={{
          background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
        }}
      >
        <span
          className="-rotate-45 font-display text-lg"
          style={{ color: colors.text }}
        >
          {entry.tier.charAt(0)}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="eyebrow">{entry.queueLabel}</p>
        <p className="font-display text-lg" style={{ color: colors.text }}>
          {titleCase(entry.tier)}
          {division}
        </p>
        <p className="text-sm text-void-100">
          {formatNumber(entry.leaguePoints)} LP
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm text-gold-100">{entry.winRate}%</p>
        <p className="text-xs text-void-100">
          {entry.wins}W {entry.losses}L
        </p>
        {entry.hotStreak && (
          <p className="mt-1 text-xs text-gold-200" title="On a win streak">
            ▲ Hot streak
          </p>
        )}
      </div>
    </div>
  );
}

/** Shown in place of the cards when a player has no ranked history. */
export function UnrankedCard() {
  const colors = tierColors("UNRANKED");
  return (
    <div className="panel flex items-center gap-4 rounded-lg p-4">
      <div
        aria-hidden
        className="h-14 w-14 shrink-0 rotate-45 rounded-md border border-void-300"
        style={{
          background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
        }}
      />
      <div>
        <p className="eyebrow">Ranked</p>
        <p className="font-display text-lg text-void-50">Unranked</p>
        <p className="text-sm text-void-100">
          No ranked games played this season.
        </p>
      </div>
    </div>
  );
}
