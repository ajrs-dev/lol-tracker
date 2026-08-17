import { notFound, redirect } from "next/navigation";
import { defaultTagLines, isRegionCode, type RegionCode } from "@/lib/regions";
import { RiotApiError, getAccount, getSummoner } from "@/lib/riot";
import { decodeParam, splitRiotId, summonerPath } from "@/lib/riot-id";

/**
 * Tagless lookups: `/summoner/euw1/Agurin` with no `#TAG`.
 *
 * Riot retired lookup-by-name, so there's nothing to query without a tag — the
 * only option is to guess the region's defaults and see which one exists. This
 * route does that and redirects to the canonical `/…/[name]/[tag]` URL, so the
 * resolved tag ends up visible in the address bar rather than hidden, and the
 * profile page keeps a single entry point.
 */

/**
 * Which tagline to use, or null when every candidate 404s.
 *
 * A missing key, a rate limit, or Riot being down isn't the tag's fault, so
 * those hand back the first guess instead: the profile page already renders
 * each of those failures properly, and duplicating that here would mean two
 * places to keep in step.
 */
async function resolveTagLine(
  region: RegionCode,
  gameName: string,
): Promise<string | null> {
  const candidates = defaultTagLines(region);

  for (const tagLine of candidates) {
    try {
      const { puuid } = await getAccount(region, gameName, tagLine);
      // account-v1 spans every Riot game, so resolving there doesn't mean a
      // League account on this platform: Hide on bush#KR resolves but has no
      // summoner record, while Hide on bush#KR1 is the real one. Confirm the
      // summoner exists before committing to a tag, or we redirect to a 404.
      await getSummoner(region, puuid);
      return tagLine;
    } catch (error) {
      if (!(error instanceof RiotApiError)) throw error;
      if (error.status !== 404) return candidates[0];
    }
  }

  return null;
}

export default async function SummonerTagResolverPage(
  props: PageProps<"/summoner/[region]/[name]">,
) {
  const { region, name: rawName } = await props.params;

  // A bad region can never resolve — treat it as a missing page, not an error.
  if (!isRegionCode(region)) notFound();

  const name = decodeParam(rawName);

  // A whole Riot ID pasted into the name slot ("Agurin%23EUW") already carries
  // its tag; honour it rather than guessing over the top of it.
  const pasted = splitRiotId(name);
  if (pasted) {
    redirect(summonerPath(region, pasted.gameName, pasted.tagLine));
  }

  const tagLine = await resolveTagLine(region, name);
  if (!tagLine) notFound();

  redirect(summonerPath(region, name, tagLine));
}
