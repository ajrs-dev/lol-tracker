/**
 * Regenerates src/lib/skin-art.json — the list of skins Riot actually ships
 * loading art for.
 *
 * Data Dragon's `skins` array mixes chromas in with real skins and nothing in
 * the payload separates them, so the only reliable test is asking the CDN
 * whether the art exists. That's ~9,000 requests, which is far too fragile to
 * do while rendering pages: it made builds depend on CDN latency, and a burst
 * of connection timeouts silently cost whole galleries. So it happens here
 * instead, where it can afford to be slow and careful, and the result gets
 * committed.
 *
 *   npm run refresh-skin-art
 *
 * Run it after a patch adds skins. Anything the manifest hasn't heard of falls
 * back to a naming rule at runtime, so a stale manifest degrades rather than
 * breaks.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const CDN = "https://ddragon.leagueoflegends.com";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "lib", "skin-art.json");

/** Deliberately gentle: this runs rarely, so it never needs to race. */
const CONCURRENCY = 6;
const ATTEMPTS = 6;
const TIMEOUT = 20_000;

/** Art Riot doesn't have answers 403; 404 covers anything served normally. */
function isMissing(status) {
  return status === 403 || status === 404;
}

async function request(url, init = {}) {
  let last;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT) });
    } catch (error) {
      last = error;
      if (attempt < ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)));
      }
    }
  }
  throw new Error(`giving up on ${url}`, { cause: last });
}

async function json(path) {
  const res = await request(`${CDN}${path}`);
  if (!res.ok) throw new Error(`Data Dragon ${res.status} for ${path}`);
  return res.json();
}

async function mapWithLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await worker(items[index]);
      }
    }),
  );
  return results;
}

/**
 * Definitive answer or nothing. A guess here would be baked into the manifest
 * and committed, which is far worse than the script failing and being re-run.
 */
async function hasArt(championId, skinNum) {
  const url = `${CDN}/cdn/img/champion/loading/${championId}_${skinNum}.jpg`;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const res = await request(url, { method: "HEAD" });
    if (res.ok) return true;
    if (isMissing(res.status)) return false;
    process.stderr.write(`  ${res.status} on ${championId}_${skinNum}, retrying\n`);
    await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)));
  }
  throw new Error(`no definitive answer for ${championId}_${skinNum}`);
}

const [version] = await json("/api/versions.json");
console.log(`patch ${version}`);

const index = await json(`/cdn/${version}/data/en_US/champion.json`);
const ids = Object.keys(index.data).sort();
console.log(`${ids.length} champions`);

const skins = {};
let checked = 0;
let kept = 0;

for (const id of ids) {
  const payload = await json(`/cdn/${version}/data/en_US/champion/${id}.json`);
  const champion = Object.values(payload.data)[0];

  const flags = await mapWithLimit(champion.skins, CONCURRENCY, (skin) =>
    hasArt(champion.id, skin.num),
  );

  const nums = champion.skins.filter((_, i) => flags[i]).map((s) => s.num);
  skins[champion.id] = nums;
  checked += champion.skins.length;
  kept += nums.length;

  console.log(
    `  ${champion.id.padEnd(14)} ${String(nums.length).padStart(3)} / ${String(champion.skins.length).padStart(3)}`,
  );
}

writeFileSync(
  OUT,
  `${JSON.stringify({ version, generated: new Date().toISOString(), skins }, null, 1)}\n`,
);

console.log(`\n${kept} of ${checked} entries have art -> ${OUT}`);
