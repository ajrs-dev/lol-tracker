import Link from "next/link";
import { SummonerSearch } from "@/components/summoner-search";

/**
 * Reached when Riot has no account for the searched Riot ID — from the profile
 * route when an explicit tag misses, and from the resolver above it when every
 * guessed tag misses. It sits at the `[name]` level so it covers both.
 *
 * `not-found.tsx` takes no props, so the copy stays generic — the failing ID is
 * already in the address bar.
 */
export default function SummonerNotFound() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20">
      <div className="panel rounded-lg p-6 text-center">
        <p className="eyebrow">No match</p>
        <h1 className="mt-2 font-display text-3xl text-gold-50">
          No player with that Riot ID
        </h1>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-void-100">
          Riot has no account matching that lookup on this region. If you left
          the tag off, try adding it — only the region&apos;s usual tags get
          tried, and players can pick anything they like. Otherwise check the
          spelling of the part after the{" "}
          <span className="text-void-50">#</span>, and that the region matches
          where the account is played.
        </p>
      </div>

      <div className="mt-8">
        <SummonerSearch />
      </div>

      <p className="mt-6 text-center text-sm text-void-200">
        Or head back to the{" "}
        <Link
          href="/champions"
          className="text-hex-300 underline-offset-4 hover:underline"
        >
          champion list
        </Link>
        .
      </p>
    </div>
  );
}
