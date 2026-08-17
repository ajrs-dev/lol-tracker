import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MasteryGrid } from "@/components/mastery-grid";
import { MatchList } from "@/components/match-list";
import { RankCard, UnrankedCard } from "@/components/rank-card";
import { getChampionsByKey, getSummonerSpellsByKey } from "@/lib/ddragon";
import { formatNumber, timeAgo } from "@/lib/format";
import { IN_DEVELOPMENT, KEY_FAULT_NOTICE, isKeyFault } from "@/lib/key-notice";
import { getRegion, isRegionCode } from "@/lib/regions";
import { RiotApiError, getSummonerProfile, hasApiKey } from "@/lib/riot";
import { decodeParam } from "@/lib/riot-id";
import type { SummonerProfile } from "@/lib/types";

/**
 * Profiles go stale as soon as the player finishes a game, but every Riot key
 * has a rate limit to respect — two minutes is a reasonable middle.
 */
export const revalidate = 120;

export async function generateMetadata(
  props: PageProps<"/summoner/[region]/[name]/[tag]">,
): Promise<Metadata> {
  const { region, name, tag } = await props.params;
  const riotId = `${decodeParam(name)}#${decodeParam(tag)}`;

  return {
    title: riotId,
    description: `Rank, champion mastery, and recent matches for ${riotId}${
      isRegionCode(region) ? ` on ${getRegion(region).label}` : ""
    }.`,
    // Player pages are per-request and rate-limited; keep them out of indexes.
    robots: { index: false, follow: true },
  };
}

/** Headings for the failure modes `riot.ts` distinguishes — operator wording. */
const ERROR_HEADINGS: Record<string, string> = {
  NO_API_KEY: "No Riot API key configured",
  INVALID_API_KEY: "Riot rejected the API key",
  KEY_FORBIDDEN: "Riot API key expired or unauthorized",
  RATE_LIMITED: "Rate limited by Riot",
  BAD_REQUEST: "Riot rejected the request",
  UPSTREAM_ERROR: "Riot API unavailable",
};

function ErrorPanel({ code, message }: { code: string; message: string }) {
  const keyFault = isKeyFault(code);
  const masked = keyFault && !IN_DEVELOPMENT; // visitors can't act on key faults
  const showFix = keyFault && IN_DEVELOPMENT; // the developer can

  return (
    <div className="mx-auto max-w-2xl px-6 py-20">
      <div className="panel-gold rounded-lg p-6">
        <p className="eyebrow">Lookup failed</p>
        <h1 className="mt-2 font-display text-2xl text-gold-100">
          {masked
            ? KEY_FAULT_NOTICE.heading
            : (ERROR_HEADINGS[code] ?? "Something went wrong")}
        </h1>
        <p className="mt-3 leading-relaxed text-void-50">
          {masked ? KEY_FAULT_NOTICE.message : message}
        </p>
        {showFix && (
          <p className="mt-3 text-sm text-void-100">
            Set <code className="text-gold-200">RIOT_API_KEY</code> in{" "}
            <code className="text-gold-200">.env.local</code> — grab a fresh key
            at{" "}
            <a
              href="https://developer.riotgames.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-hex-300 underline-offset-4 hover:underline"
            >
              developer.riotgames.com
            </a>{" "}
            if you need one — then restart the dev server.
          </p>
        )}
      </div>
    </div>
  );
}

export default async function SummonerPage(
  props: PageProps<"/summoner/[region]/[name]/[tag]">,
) {
  const { region, name: rawName, tag: rawTag } = await props.params;
  const name = decodeParam(rawName);
  const tag = decodeParam(rawTag);

  // A bad region can never resolve — treat it as a missing page, not an error.
  if (!isRegionCode(region)) notFound();

  if (!hasApiKey()) {
    return (
      <ErrorPanel
        code="NO_API_KEY"
        message="Player lookup needs a Riot API key. Champion browsing works without one."
      />
    );
  }

  let profile: SummonerProfile | null = null;
  let failure: RiotApiError | null = null;

  try {
    profile = await getSummonerProfile(region, name, tag);
  } catch (error) {
    if (error instanceof RiotApiError) {
      failure = error;
    } else {
      throw error;
    }
  }

  // `notFound()` throws a control-flow signal, so it must stay out of the catch.
  if (failure?.code === "NOT_FOUND") notFound();
  if (failure) return <ErrorPanel code={failure.code} message={failure.message} />;
  if (!profile) notFound();

  const [spells, championsByKey] = await Promise.all([
    getSummonerSpellsByKey(),
    getChampionsByKey(),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-6 py-10">
      {/* Identity ------------------------------------------------------ */}
      <header className="flex flex-wrap items-center gap-5">
        <Image
          unoptimized
          src={profile.profileIconUrl}
          alt=""
          width={96}
          height={96}
          priority
          className="h-20 w-20 rounded-lg border border-gold-400/60"
        />

        <div className="min-w-0">
          <p className="eyebrow">{profile.regionLabel}</p>
          <h1 className="mt-1 font-display text-4xl text-gold-50">
            {profile.account.gameName}
            <span className="text-void-100">#{profile.account.tagLine}</span>
          </h1>
          <p className="mt-1 text-sm text-void-100">
            Level {formatNumber(profile.summonerLevel)}
            {profile.masteryScore > 0 && (
              <> · {formatNumber(profile.masteryScore)} mastery score</>
            )}
            {profile.revisionDate > 0 && (
              <> · updated {timeAgo(profile.revisionDate)}</>
            )}
          </p>
        </div>
      </header>

      {/* Ranked -------------------------------------------------------- */}
      <section>
        <h2 className="font-display text-2xl text-gold-50">Ranked</h2>
        <div className="rule-gold mt-3" />

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {profile.ranked.length > 0 ? (
            profile.ranked.map((entry) => (
              <RankCard key={entry.queueType} entry={entry} />
            ))
          ) : (
            <UnrankedCard />
          )}
        </div>
      </section>

      {/* Mastery ------------------------------------------------------- */}
      <section>
        <h2 className="font-display text-2xl text-gold-50">
          Champion mastery{" "}
          {profile.mastery.length > 0 && (
            <span className="text-base text-void-100">
              (top {profile.mastery.length})
            </span>
          )}
        </h2>
        <div className="rule-gold mt-3" />

        <div className="mt-6">
          <MasteryGrid entries={profile.mastery} version={profile.version} />
        </div>
      </section>

      {/* Matches ------------------------------------------------------- */}
      <section>
        <h2 className="font-display text-2xl text-gold-50">Recent matches</h2>
        <div className="rule-gold mt-3" />

        <div className="mt-6">
          <MatchList
            matches={profile.matches}
            version={profile.version}
            spells={spells}
            championsByKey={championsByKey}
          />
        </div>
      </section>
    </div>
  );
}
