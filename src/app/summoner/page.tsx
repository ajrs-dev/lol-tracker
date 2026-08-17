import type { Metadata } from "next";
import { SummonerSearch } from "@/components/summoner-search";
import { IN_DEVELOPMENT, KEY_FAULT_NOTICE } from "@/lib/key-notice";
import { hasApiKey } from "@/lib/riot";

export const metadata: Metadata = {
  title: "Summoner lookup",
  description:
    "Look up any League of Legends player by Riot ID to see their rank, champion mastery, and recent matches.",
};

export default function SummonerLandingPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20">
      <header className="text-center">
        <p className="eyebrow">Player lookup</p>
        <h1 className="mt-2 font-display text-4xl text-gold-50">
          Find a summoner
        </h1>
        <p className="mx-auto mt-3 max-w-md text-void-100">
          Enter a Riot ID to pull up rank, champion mastery, and recent matches.
        </p>
      </header>

      <div className="mt-8">
        <SummonerSearch />
      </div>

      <p className="mt-4 text-center text-sm text-void-200">
        Pick the region, then enter the Riot ID — like{" "}
        <span className="text-void-50">Faker#KR</span>. The tag after the{" "}
        <span className="text-void-50">#</span> is optional: leave it off and
        the region&apos;s usual tags get tried. Include it when you know it,
        since tags aren&apos;t always the region code.
      </p>

      {!hasApiKey() && (
        <div className="panel-gold mt-10 rounded-lg p-5 text-sm">
          <p className="font-display text-lg text-gold-100">
            {IN_DEVELOPMENT
              ? "No Riot API key configured"
              : KEY_FAULT_NOTICE.heading}
          </p>
          <p className="mt-2 leading-relaxed text-void-50">
            {IN_DEVELOPMENT ? (
              <>
                Player lookup needs a Riot API key. Grab one at{" "}
                <a
                  href="https://developer.riotgames.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-hex-300 underline-offset-4 hover:underline"
                >
                  developer.riotgames.com
                </a>
                , add it to <code className="text-gold-200">.env.local</code> as{" "}
                <code className="text-gold-200">RIOT_API_KEY</code>, and restart
                the dev server. Champion browsing works without one.
              </>
            ) : (
              KEY_FAULT_NOTICE.message
            )}
          </p>
        </div>
      )}
    </div>
  );
}
