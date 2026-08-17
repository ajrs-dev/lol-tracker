import type { Metadata } from "next";
import { ChampionGrid } from "@/components/champion-grid";
import { getChampions, getLatestVersion } from "@/lib/ddragon";

export const metadata: Metadata = {
  title: "Champions",
  description:
    "Every League of Legends champion on the current patch — search by name, filter by class, and sort by attack, defense, magic, or difficulty.",
};

/** Static data; rebuild twice a day is well ahead of Riot's patch cadence. */
export const revalidate = 43200;

export default async function ChampionsPage() {
  const [champions, version] = await Promise.all([
    getChampions(),
    getLatestVersion(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <p className="eyebrow">Patch {version}</p>
        <h1 className="mt-1 font-display text-4xl text-gold-50">Champions</h1>
        <p className="mt-2 max-w-2xl text-void-100">
          All {champions.length}{" "}
          champions, straight from Riot&apos;s Data Dragon. Pick one for its
          full kit, base stats, and skin gallery.
        </p>
      </header>

      <ChampionGrid champions={champions} version={version} />
    </div>
  );
}
