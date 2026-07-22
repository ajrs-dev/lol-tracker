import Image from "next/image";
import Link from "next/link";
import {
  championIconUrl,
  itemIconUrl,
  spellIconUrl,
} from "@/lib/ddragon";
import {
  compactNumber,
  formatDuration,
  formatKda,
  formatNumber,
  timeAgo,
} from "@/lib/format";
import { positionLabel } from "@/lib/lol";
import type {
  ChampionSummary,
  MatchSummary,
  SummonerSpellData,
} from "@/lib/types";

interface Props {
  matches: MatchSummary[];
  version: string;
  spells: Map<number, SummonerSpellData>;
  championsByKey: Map<number, ChampionSummary>;
}

/** Six item slots plus the trinket, which Riot reports separately. */
function ItemRow({
  items,
  trinket,
  version,
}: {
  items: number[];
  trinket: number;
  version: string;
}) {
  const slots = [...items.slice(0, 6)];
  while (slots.length < 6) slots.push(0);

  return (
    <div className="flex gap-1">
      {[...slots, trinket].map((itemId, index) => (
        <div
          key={index}
          className="h-7 w-7 overflow-hidden rounded-sm border border-void-300 bg-void-700"
        >
          {itemId > 0 && (
            <Image
              unoptimized
              src={itemIconUrl(version, itemId)}
              alt=""
              width={28}
              height={28}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function MatchList({
  matches,
  version,
  spells,
  championsByKey,
}: Props) {
  if (matches.length === 0) {
    return (
      <p className="panel rounded-lg px-6 py-10 text-center text-sm text-void-100">
        No recent matches found.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {matches.map((match) => {
        const champion = championsByKey.get(match.championId);
        const position = positionLabel(match.teamPosition);

        // A remake is neither a win nor a loss; colouring it green reads wrong.
        const accent = match.remake
          ? "border-s-void-200"
          : match.win
            ? "border-s-win"
            : "border-s-loss";

        return (
          <li
            key={match.matchId}
            className={`panel flex flex-wrap items-center gap-x-5 gap-y-3 rounded-lg border-s-4 p-3 ${accent}`}
          >
            {/* Outcome + queue */}
            <div className="w-28 shrink-0">
              <p
                className={`font-display text-base ${
                  match.remake
                    ? "text-void-100"
                    : match.win
                      ? "text-win"
                      : "text-loss"
                }`}
              >
                {match.remake ? "Remake" : match.win ? "Victory" : "Defeat"}
              </p>
              <p className="truncate text-xs text-void-100">
                {match.queueLabel}
              </p>
              <p className="text-xs text-void-200">
                {formatDuration(match.gameDuration)}
              </p>
            </div>

            {/* Champion + summoner spells */}
            <div className="flex shrink-0 items-center gap-2">
              <div className="relative">
                {champion && (
                  <Image
                    unoptimized
                    src={championIconUrl(version, champion.image.full)}
                    alt={match.championName}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded border border-void-300"
                  />
                )}
                <span className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-void-300 bg-void-900 px-1 text-[10px] text-gold-100">
                  {match.champLevel}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                {match.summonerSpells.map((spellKey, index) => {
                  const spell = spells.get(spellKey);
                  return (
                    <div
                      key={index}
                      className="h-[22px] w-[22px] overflow-hidden rounded-sm border border-void-300 bg-void-700"
                      title={spell?.name}
                    >
                      {spell && (
                        <Image
                          unoptimized
                          src={spellIconUrl(version, spell.image.full)}
                          alt=""
                          width={22}
                          height={22}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* KDA */}
            <div className="w-32 shrink-0">
              <p className="text-sm text-gold-50">
                {match.kills} / <span className="text-loss">{match.deaths}</span>{" "}
                / {match.assists}
              </p>
              <p className="text-xs text-void-100">
                {formatKda(match.kills, match.deaths, match.assists)} KDA
              </p>
              {/* Already a rounded 0-100 percentage — see toMatchSummary. */}
              <p className="text-xs text-void-200">
                {match.killParticipation}% KP
              </p>
            </div>

            {/* Secondary stats */}
            <dl className="hidden w-40 shrink-0 text-xs text-void-100 sm:block">
              <div className="flex justify-between gap-2">
                <dt className="text-void-200">CS</dt>
                <dd>
                  {match.csTotal} ({match.csPerMinute.toFixed(1)}/m)
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-void-200">Gold</dt>
                <dd>{compactNumber(match.goldEarned)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-void-200">Damage</dt>
                <dd>{formatNumber(match.damageToChampions)}</dd>
              </div>
            </dl>

            <ItemRow
              items={match.items}
              trinket={match.trinket}
              version={version}
            />

            <div className="ms-auto shrink-0 text-right">
              {position && (
                <Link
                  href={`/champions/${champion?.id ?? match.championName}`}
                  className="text-xs text-void-100 underline-offset-4 hover:text-gold-100 hover:underline"
                >
                  {position}
                </Link>
              )}
              <p className="text-xs text-void-200">
                {timeAgo(match.gameEndTimestamp)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
