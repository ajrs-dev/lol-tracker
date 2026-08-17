import type { Metadata } from "next";
import Link from "next/link";
import { hasApiKey } from "@/lib/riot";
import { REGIONS, REGION_CODES } from "@/lib/regions";

export const metadata: Metadata = {
  title: "API & data sources",
  description:
    "Where Rift Index gets its data: Riot's Data Dragon CDN for static game data, the Riot Games API for player data, and how each request is cached.",
};

interface EndpointRow {
  name: string;
  path: string;
  host: string;
  cache: string;
  note: string;
}

/** Mirrors the `riotFetch` calls in src/lib/riot.ts. */
const RIOT_ENDPOINTS: EndpointRow[] = [
  {
    name: "account-v1",
    path: "/riot/account/v1/accounts/by-riot-id/{name}/{tag}",
    host: "regional",
    cache: "1 hour",
    note: "Resolves a Riot ID to the PUUID every other call needs.",
  },
  {
    name: "summoner-v4",
    path: "/lol/summoner/v4/summoners/by-puuid/{puuid}",
    host: "platform",
    cache: "5 minutes",
    note: "Profile icon and summoner level.",
  },
  {
    name: "league-v4",
    path: "/lol/league/v4/entries/by-puuid/{puuid}",
    host: "platform",
    cache: "2 minutes",
    note: "Ranked tiers. Falls back to by-summoner on older responses.",
  },
  {
    name: "champion-mastery-v4",
    path: "/lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}",
    host: "platform",
    cache: "5 minutes",
    note: "Per-champion mastery levels and points.",
  },
  {
    name: "champion-mastery-v4",
    path: "/lol/champion-mastery/v4/scores/by-puuid/{puuid}",
    host: "platform",
    cache: "5 minutes",
    note: "Total mastery score. Non-critical — failures don't break the page.",
  },
  {
    name: "match-v5",
    path: "/lol/match/v5/matches/by-puuid/{puuid}/ids",
    host: "regional",
    cache: "2 minutes",
    note: "Recent match IDs. History doesn't reach back indefinitely.",
  },
  {
    name: "match-v5",
    path: "/lol/match/v5/matches/{matchId}",
    host: "regional",
    cache: "7 days",
    note: "A finished match never changes, so it's cached aggressively.",
  },
];

const DDRAGON_ENDPOINTS: EndpointRow[] = [
  {
    name: "versions",
    path: "/api/versions.json",
    host: "ddragon",
    cache: "12 hours",
    note: "Latest live patch. Everything else is versioned against it.",
  },
  {
    name: "champions",
    path: "/cdn/{version}/data/en_US/champion.json",
    host: "ddragon",
    cache: "12 hours",
    note: "The full champion list used by the index and grid.",
  },
  {
    name: "champion detail",
    path: "/cdn/{version}/data/en_US/champion/{id}.json",
    host: "ddragon",
    cache: "12 hours",
    note: "Lore, abilities, base stats, and skins for one champion.",
  },
  {
    name: "summoner spells",
    path: "/cdn/{version}/data/en_US/summoner.json",
    host: "ddragon",
    cache: "12 hours",
    note: "Keyed by numeric id so match rows can show spell icons.",
  },
  {
    name: "skin art (HEAD)",
    path: "/cdn/img/champion/loading/{id}_{skin}.jpg",
    host: "ddragon",
    cache: "12 hours",
    note: "Confirms a skin has art. Recognisable chromas skip the check.",
  },
];

function EndpointTable({ rows }: { rows: EndpointRow[] }) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[44rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-void-300 text-left">
            <th className="eyebrow py-2 pe-4 font-normal">Endpoint</th>
            <th className="eyebrow py-2 pe-4 font-normal">Path</th>
            <th className="eyebrow py-2 pe-4 font-normal">Cached</th>
            <th className="eyebrow py-2 font-normal">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.name}${row.path}`}
              className="border-b border-void-300/50 align-top"
            >
              <td className="py-3 pe-4 text-gold-100">{row.name}</td>
              <td className="py-3 pe-4">
                <code className="text-xs text-void-50">{row.path}</code>
              </td>
              <td className="whitespace-nowrap py-3 pe-4 text-hex-300">
                {row.cache}
              </td>
              <td className="py-3 text-void-100">{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DocsPage() {
  const keyConfigured = hasApiKey();

  return (
    <div className="mx-auto max-w-5xl space-y-14 px-6 py-10">
      <header>
        <p className="eyebrow">Reference</p>
        <h1 className="mt-1 font-display text-4xl text-gold-50">
          API &amp; data sources
        </h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-void-100">
          Rift Index reads from two upstreams: Riot&apos;s Data Dragon CDN for
          static game data, and the Riot Games API for anything about a specific
          player. Every request runs server-side.
        </p>
      </header>

      {/* Data Dragon --------------------------------------------------- */}
      <section>
        <h2 className="font-display text-2xl text-gold-50">Data Dragon</h2>
        <div className="rule-gold mt-3" />
        <p className="mt-5 max-w-2xl leading-relaxed text-void-100">
          Public, versioned, and unauthenticated — no key and no rate limit. It
          serves champion data and all the art, so{" "}
          <Link
            href="/champions"
            className="text-hex-300 underline-offset-4 hover:underline"
          >
            champion browsing
          </Link>{" "}
          works with no setup at all.
        </p>
        <EndpointTable rows={DDRAGON_ENDPOINTS} />
      </section>

      {/* Riot API ------------------------------------------------------ */}
      <section>
        <h2 className="font-display text-2xl text-gold-50">Riot Games API</h2>
        <div className="rule-gold mt-3" />
        <p className="mt-5 max-w-2xl leading-relaxed text-void-100">
          Requires a key and is rate limited. Riot splits these across two host
          families — <span className="text-gold-100">platform</span> hosts
          (na1, euw1, kr…) and <span className="text-gold-100">regional</span>{" "}
          clusters (americas, europe, asia, sea) — and one region code maps to
          both.
        </p>
        <EndpointTable rows={RIOT_ENDPOINTS} />
      </section>

      {/* Setup --------------------------------------------------------- */}
      <section>
        <h2 className="font-display text-2xl text-gold-50">Setup</h2>
        <div className="rule-gold mt-3" />

        <div
          className={`mt-5 rounded-lg p-4 text-sm ${
            keyConfigured ? "panel" : "panel-gold"
          }`}
        >
          <p className={keyConfigured ? "text-win" : "text-gold-100"}>
            {keyConfigured
              ? "● A Riot API key is configured on this server."
              : "● No Riot API key configured — player lookup is unavailable."}
          </p>
        </div>

        <ol className="mt-5 max-w-2xl space-y-3 text-void-100">
          <li className="flex gap-3">
            <span className="text-gold-200">1.</span>
            <span>
              Sign in at{" "}
              <a
                href="https://developer.riotgames.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-hex-300 underline-offset-4 hover:underline"
              >
                developer.riotgames.com
              </a>{" "}
              and copy your development key.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-gold-200">2.</span>
            <span>
              Add it to <code className="text-gold-200">.env.local</code> as{" "}
              <code className="text-gold-200">RIOT_API_KEY=RGAPI-…</code>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-gold-200">3.</span>
            <span>
              Restart the dev server — env changes aren&apos;t picked up by
              hot reload.
            </span>
          </li>
        </ol>

        <div className="panel-gold mt-6 max-w-2xl rounded-lg p-4 text-sm">
          <p className="font-display text-base text-gold-100">
            Development keys expire after 24 hours
          </p>
          <p className="mt-2 leading-relaxed text-void-50">
            When yours lapses Riot returns 403 and player pages show an
            &ldquo;API key expired&rdquo; notice. Regenerate it and restart.
            Champion pages keep working either way.
          </p>
        </div>
      </section>

      {/* Regions ------------------------------------------------------- */}
      <section>
        <h2 className="font-display text-2xl text-gold-50">Regions</h2>
        <div className="rule-gold mt-3" />
        <p className="mt-5 max-w-2xl leading-relaxed text-void-100">
          The region code in a profile URL is the platform code. Note the tag in
          a Riot ID is <em>not</em> necessarily the region — it&apos;s whatever
          the player set.
        </p>

        <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {REGION_CODES.map((code) => (
            <li
              key={code}
              className="panel flex items-baseline gap-2 rounded px-3 py-2 text-sm"
            >
              <code className="text-gold-200">{code}</code>
              <span className="truncate text-void-100">
                {REGIONS[code].label}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-2xl text-gold-50">Caching</h2>
        <div className="rule-gold mt-3" />
        <p className="mt-5 max-w-2xl leading-relaxed text-void-100">
          Next 16 leaves <code className="text-gold-200">fetch</code> uncached by
          default, so every upstream call opts in explicitly with{" "}
          <code className="text-gold-200">force-cache</code> plus a revalidate
          window — without it a development key burns through its rate limit
          almost immediately. Champion pages revalidate every 12 hours; player
          pages every 2 minutes.
        </p>
      </section>
    </div>
  );
}
