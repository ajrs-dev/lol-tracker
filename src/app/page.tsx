import Image from "next/image";
import Link from "next/link";
import { SummonerSearch } from "@/components/summoner-search";
import { championIconUrl, getChampions, getLatestVersion } from "@/lib/ddragon";
import { formatNumber } from "@/lib/format";
import { CHAMPION_TAGS, TAG_COLORS } from "@/lib/lol";
import type { ChampionSummary } from "@/lib/types";

/** Matches the champion pages — Data Dragon only moves on patch day. */
export const revalidate = 43200;

const FEATURED_COUNT = 12;

/**
 * A deterministic spread across the roster rather than `Math.random`: the set
 * stays stable inside a patch (so the page can be cached) but rotates when Riot
 * ships a new version.
 */
function featuredChampions(
  champions: ChampionSummary[],
  version: string,
): ChampionSummary[] {
  if (champions.length === 0) return [];

  const seed = [...version].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const stride = Math.floor(champions.length / FEATURED_COUNT) || 1;

  return Array.from({ length: FEATURED_COUNT }, (_, index) => {
    const at = (seed + index * stride) % champions.length;
    return champions[at];
  });
}

export default async function Home() {
  const [champions, version] = await Promise.all([
    getChampions(),
    getLatestVersion(),
  ]);
  const featured = featuredChampions(champions, version);

  return (
    <div className="mx-auto max-w-6xl space-y-20 px-6 py-16">
      {/* Hero ---------------------------------------------------------- */}
      <section className="text-center">
        <p className="eyebrow">Patch {version}</p>
        <h1 className="mx-auto mt-3 max-w-3xl font-display text-5xl leading-tight text-gold-50 sm:text-6xl">
          Every champion, every match, one index.
        </h1>
        <p className="mx-auto mt-4 max-w-xl leading-relaxed text-void-100">
          Browse all {formatNumber(champions.length)} champions on the live
          patch, or look up any player&apos;s rank, champion mastery, and recent
          games.
        </p>

        <div className="mx-auto mt-8 max-w-md">
          <SummonerSearch />
        </div>

        <p className="mt-3 text-sm text-void-200">
          The tag is optional — try{" "}
          <span className="text-void-50">Doublelift</span> or{" "}
          <span className="text-void-50">Doublelift#NA1</span>
        </p>
      </section>

      {/* Entry points -------------------------------------------------- */}
      <section className="grid gap-4 md:grid-cols-2">
        <Link
          href="/champions"
          className="panel group rounded-lg p-6 transition-colors hover:border-gold-300"
        >
          <h2 className="font-display text-2xl text-gold-50 transition-colors group-hover:text-gold-100">
            Champions
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-void-100">
            Search and filter the full roster by class, then open any champion
            for its kit, base stats, and skin gallery.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {CHAMPION_TAGS.map((tag) => (
              <span
                key={tag}
                style={{
                  borderColor: TAG_COLORS[tag],
                  color: TAG_COLORS[tag],
                  backgroundColor: `${TAG_COLORS[tag]}22`,
                }}
                className="rounded-full border px-2.5 py-1 text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        </Link>

        <Link
          href="/docs"
          className="panel group rounded-lg p-6 transition-colors hover:border-gold-300"
        >
          <h2 className="font-display text-2xl text-gold-50 transition-colors group-hover:text-gold-100">
            API &amp; data sources
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-void-100">
            Which Riot and Data Dragon endpoints back each page, how long every
            response is cached, and how to configure an API key.
          </p>
          <p className="mt-4 text-sm text-hex-300 underline-offset-4 group-hover:underline">
            Read the reference →
          </p>
        </Link>
      </section>

      {/* Featured ------------------------------------------------------ */}
      <section>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-2xl text-gold-50">
            Champion spotlight
          </h2>
          <Link
            href="/champions"
            className="text-sm text-hex-300 underline-offset-4 hover:underline"
          >
            View all {formatNumber(champions.length)} →
          </Link>
        </div>
        <div className="rule-gold mt-3" />

        <ul className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {featured.map((champion) => (
            <li key={champion.id}>
              <Link
                href={`/champions/${champion.id}`}
                className="group block rounded-md border border-void-300 bg-void-600/60 p-1.5 transition-all hover:-translate-y-0.5 hover:border-gold-300 hover:bg-void-500"
              >
                <Image
                  unoptimized
                  src={championIconUrl(version, champion.image.full)}
                  alt=""
                  width={120}
                  height={120}
                  className="aspect-square w-full rounded-sm object-cover grayscale-[35%] transition-all group-hover:grayscale-0"
                />
                <p className="mt-1.5 truncate px-0.5 text-center text-xs font-medium text-void-50 transition-colors group-hover:text-gold-50">
                  {champion.name}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
