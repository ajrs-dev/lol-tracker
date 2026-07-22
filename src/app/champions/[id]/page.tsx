import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  championLoadingUrl,
  championSplashUrl,
  getChampion,
  getChampions,
  getLatestVersion,
  passiveIconUrl,
  resolveChampionId,
  spellIconUrl,
} from "@/lib/ddragon";
import { statWithGrowth, stripGameMarkup } from "@/lib/format";
import { TAG_COLORS } from "@/lib/lol";
import type { ChampionDetail, ChampionStats } from "@/lib/types";

/** Matches the champions index: rebuild twice a day, well ahead of patches. */
export const revalidate = 43200;

/**
 * Prerender the canonical ids at build time. `dynamicParams` stays on by
 * default so loose spellings ("aatrox", "missfortune") still resolve on demand.
 */
export async function generateStaticParams() {
  const champions = await getChampions();
  return champions.map((champion) => ({ id: champion.id }));
}

/** Shared by the page and its metadata; `cache` keeps it to one fetch. */
async function load(id: string): Promise<ChampionDetail | null> {
  const resolved = await resolveChampionId(id);
  return resolved ? getChampion(resolved) : null;
}

export async function generateMetadata(
  props: PageProps<"/champions/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const champion = await load(id);
  if (!champion) return { title: "Champion not found" };

  return {
    title: `${champion.name}, ${champion.title}`,
    description: champion.blurb,
    openGraph: {
      title: `${champion.name}, ${champion.title}`,
      description: champion.blurb,
      images: [championSplashUrl(champion.id)],
    },
  };
}

const SPELL_KEYS = ["Q", "W", "E", "R"];

/** The four champion-select ratings, in Riot's own order. */
const INFO_BARS = [
  { key: "attack", label: "Attack" },
  { key: "defense", label: "Defense" },
  { key: "magic", label: "Magic" },
  { key: "difficulty", label: "Difficulty" },
] as const;

/** Base stats worth surfacing, paired with their per-level growth field. */
const STAT_ROWS: {
  label: string;
  base: keyof ChampionStats;
  growth?: keyof ChampionStats;
}[] = [
  { label: "Health", base: "hp", growth: "hpperlevel" },
  { label: "Health regen", base: "hpregen", growth: "hpregenperlevel" },
  { label: "Resource", base: "mp", growth: "mpperlevel" },
  { label: "Resource regen", base: "mpregen", growth: "mpregenperlevel" },
  { label: "Attack damage", base: "attackdamage", growth: "attackdamageperlevel" },
  { label: "Attack speed", base: "attackspeed", growth: "attackspeedperlevel" },
  { label: "Armor", base: "armor", growth: "armorperlevel" },
  { label: "Magic resist", base: "spellblock", growth: "spellblockperlevel" },
  { label: "Move speed", base: "movespeed" },
  { label: "Attack range", base: "attackrange" },
];

export default async function ChampionPage(
  props: PageProps<"/champions/[id]">,
) {
  const { id } = await props.params;
  const [champion, version] = await Promise.all([
    load(id),
    getLatestVersion(),
  ]);

  if (!champion) notFound();

  // Skin 0 is the base skin; it's already the hero splash above.
  const alternateSkins = champion.skins.filter((skin) => skin.num !== 0);

  return (
    <article>
      {/* Hero ---------------------------------------------------------- */}
      <header className="relative isolate">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <Image
            src={championSplashUrl(champion.id)}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[center_18%]"
          />
          {/* Fade the art into the page so the copy stays legible. */}
          <div className="absolute inset-0 bg-gradient-to-t from-void-900 via-void-900/85 to-void-900/40" />
        </div>

        <div className="mx-auto max-w-6xl px-6 pb-10 pt-28 sm:pt-40">
          <Link
            href="/champions"
            className="eyebrow transition-colors hover:text-gold-200"
          >
            ← All champions
          </Link>

          <h1 className="mt-4 font-display text-5xl text-gold-50 sm:text-6xl">
            {champion.name}
          </h1>
          <p className="mt-1 font-display text-xl text-gold-200">
            {champion.title}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {champion.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  borderColor: TAG_COLORS[tag],
                  color: TAG_COLORS[tag],
                  backgroundColor: `${TAG_COLORS[tag]}22`,
                }}
                className="rounded-full border px-3 py-1.5 text-xs font-medium"
              >
                {tag}
              </span>
            ))}
            <span className="rounded-full border border-void-300 px-3 py-1.5 text-xs text-void-100">
              {champion.partype}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-14 px-6 pb-4">
        {/* Lore + ratings ---------------------------------------------- */}
        <section className="grid gap-8 md:grid-cols-[1fr_18rem]">
          <div>
            <h2 className="eyebrow">Lore</h2>
            <p className="mt-3 leading-relaxed text-void-50">
              {stripGameMarkup(champion.lore)}
            </p>
          </div>

          <div className="panel h-fit rounded-lg p-5">
            <h2 className="eyebrow">At a glance</h2>
            <dl className="mt-4 space-y-3">
              {INFO_BARS.map((bar) => (
                <div key={bar.key}>
                  <div className="flex items-baseline justify-between text-sm">
                    <dt className="text-void-100">{bar.label}</dt>
                    <dd className="text-gold-100">
                      {champion.info[bar.key]}
                      <span className="text-void-200"> / 10</span>
                    </dd>
                  </div>
                  <div
                    role="presentation"
                    className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-void-400"
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-200"
                      style={{ width: `${champion.info[bar.key] * 10}%` }}
                    />
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Abilities ---------------------------------------------------- */}
        <section>
          <h2 className="font-display text-2xl text-gold-50">Abilities</h2>
          <div className="rule-gold mt-3" />

          <ul className="mt-6 space-y-3">
            <li className="panel flex gap-4 rounded-lg p-4">
              <Image
                unoptimized
                src={passiveIconUrl(version, champion.passive.image.full)}
                alt=""
                width={64}
                height={64}
                className="h-14 w-14 shrink-0 rounded border border-gold-400/60"
              />
              <div className="min-w-0">
                <p className="eyebrow">Passive</p>
                <p className="font-display text-lg text-gold-100">
                  {champion.passive.name}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-void-50">
                  {stripGameMarkup(champion.passive.description)}
                </p>
              </div>
            </li>

            {champion.spells.map((spell, index) => (
              <li key={spell.id} className="panel flex gap-4 rounded-lg p-4">
                <div className="relative shrink-0">
                  <Image
                    unoptimized
                    src={spellIconUrl(version, spell.image.full)}
                    alt=""
                    width={64}
                    height={64}
                    className="h-14 w-14 rounded border border-gold-400/60"
                  />
                  <span className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded border border-gold-400 bg-void-900 text-xs font-semibold text-gold-100">
                    {SPELL_KEYS[index]}
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="font-display text-lg text-gold-100">
                    {spell.name}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-void-50">
                    {stripGameMarkup(spell.description)}
                  </p>
                  <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-void-100">
                    <div className="flex gap-1.5">
                      <dt className="text-void-200">Cooldown</dt>
                      <dd>{spell.cooldownBurn}s</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="text-void-200">Cost</dt>
                      <dd>
                        {spell.costBurn === "0"
                          ? "No cost"
                          : `${spell.costBurn} ${spell.costType ? stripGameMarkup(spell.costType) : ""}`.trim()}
                      </dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="text-void-200">Range</dt>
                      <dd>{spell.rangeBurn}</dd>
                    </div>
                  </dl>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Base stats --------------------------------------------------- */}
        <section>
          <h2 className="font-display text-2xl text-gold-50">Base stats</h2>
          <div className="rule-gold mt-3" />

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {STAT_ROWS.map((row) => (
              <div key={row.label} className="panel rounded-lg px-4 py-3">
                <dt className="eyebrow">{row.label}</dt>
                <dd className="mt-1 text-sm text-gold-100">
                  {row.growth
                    ? statWithGrowth(
                        champion.stats[row.base],
                        champion.stats[row.growth],
                      )
                    : Math.round(champion.stats[row.base] * 100) / 100}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Tips --------------------------------------------------------- */}
        {(champion.allytips.length > 0 || champion.enemytips.length > 0) && (
          <section className="grid gap-6 md:grid-cols-2">
            {champion.allytips.length > 0 && (
              <div className="panel rounded-lg p-5">
                <h2 className="eyebrow">Playing as {champion.name}</h2>
                <ul className="mt-3 space-y-2.5">
                  {champion.allytips.map((tip) => (
                    <li
                      key={tip}
                      className="border-s-2 border-hex-300/60 ps-3 text-sm leading-relaxed text-void-50"
                    >
                      {stripGameMarkup(tip)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {champion.enemytips.length > 0 && (
              <div className="panel rounded-lg p-5">
                <h2 className="eyebrow">Playing against {champion.name}</h2>
                <ul className="mt-3 space-y-2.5">
                  {champion.enemytips.map((tip) => (
                    <li
                      key={tip}
                      className="border-s-2 border-loss/60 ps-3 text-sm leading-relaxed text-void-50"
                    >
                      {stripGameMarkup(tip)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Skins -------------------------------------------------------- */}
        {alternateSkins.length > 0 && (
          <section>
            <h2 className="font-display text-2xl text-gold-50">
              Skins{" "}
              <span className="text-base text-void-100">
                ({alternateSkins.length})
              </span>
            </h2>
            <div className="rule-gold mt-3" />

            <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {alternateSkins.map((skin) => (
                <li key={skin.id}>
                  <figure className="group overflow-hidden rounded-lg border border-void-300 bg-void-600/60 transition-colors hover:border-gold-300">
                    <Image
                      // A champion can carry 30+ skins; skip the optimizer.
                      unoptimized
                      src={championLoadingUrl(champion.id, skin.num)}
                      alt={skin.name}
                      width={308}
                      height={560}
                      loading="lazy"
                      className="aspect-[308/560] w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <figcaption className="truncate px-2.5 py-2 text-xs text-void-50">
                      {skin.name}
                      {skin.chromas && (
                        <span className="ms-1.5 text-hex-300">◆</span>
                      )}
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}
