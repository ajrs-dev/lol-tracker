/**
 * Riot ID parsing shared by the search form and the summoner routes, so all
 * three agree on where the tag starts and how a profile path is built.
 */

export interface RiotId {
  gameName: string;
  tagLine: string;
}

/**
 * Split "Name#TAG". Null when there's no usable tag, which is the caller's cue
 * to fall back to inferring one from the region.
 *
 * Game names may not contain '#', but splitting on the last one is the safer
 * read of "Name#TAG" either way.
 */
export function splitRiotId(raw: string): RiotId | null {
  const hashAt = raw.lastIndexOf("#");
  if (hashAt === -1) return null;

  const gameName = raw.slice(0, hashAt).trim();
  const tagLine = raw.slice(hashAt + 1).trim();
  if (!gameName || !tagLine) return null;

  return { gameName, tagLine };
}

/** Profile path. Omit the tag to let the server infer one from the region. */
export function summonerPath(
  region: string,
  gameName: string,
  tagLine?: string,
): string {
  const base = `/summoner/${region}/${encodeURIComponent(gameName)}`;
  return tagLine ? `${base}/${encodeURIComponent(tagLine)}` : base;
}

/**
 * Route params arrive still percent-encoded ("Hide%20on%20bush"), and the Riot
 * client encodes what it's given — so decode here or names with spaces get
 * double-encoded and 404. A lone '%' isn't a valid escape; keep it literal.
 */
export function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
