"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { championIconUrl } from "@/lib/ddragon";
import { CHAMPION_TAGS, TAG_COLORS } from "@/lib/lol";
import type { ChampionSummary } from "@/lib/types";

type SortKey = "name" | "difficulty" | "attack" | "defense" | "magic";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "name", label: "A–Z" },
  { key: "difficulty", label: "Difficulty" },
  { key: "attack", label: "Attack" },
  { key: "defense", label: "Defense" },
  { key: "magic", label: "Magic" },
];

interface Props {
  champions: ChampionSummary[];
  version: string;
}

/** Ignore case, spaces and punctuation so "missfortune" finds "Miss Fortune". */
function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function ChampionGrid({ champions, version }: Props) {
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("name");

  const visible = useMemo(() => {
    const needle = normalize(query);

    const filtered = champions.filter((champion) => {
      if (
        activeTags.length > 0 &&
        !activeTags.every((tag) => champion.tags.includes(tag))
      ) {
        return false;
      }
      if (!needle) return true;
      // Match the title too, so "blade" surfaces Aatrox the Darkin Blade.
      return (
        normalize(champion.name).includes(needle) ||
        normalize(champion.title).includes(needle)
      );
    });

    return filtered.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      return b.info[sort] - a.info[sort] || a.name.localeCompare(b.name);
    });
  }, [champions, query, activeTags, sort]);

  function toggleTag(tag: string) {
    setActiveTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag],
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search champions…"
          type="search"
          autoComplete="off"
          spellCheck={false}
          aria-label="Search champions"
          className="h-11 w-full max-w-xs rounded border border-void-300 bg-void-600 px-3 text-gold-50 placeholder:text-void-200 transition-colors hover:border-gold-400 focus:border-gold-300"
        />

        <div className="flex flex-wrap gap-1.5">
          {CHAMPION_TAGS.map((tag) => {
            const active = activeTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                aria-pressed={active}
                style={
                  active
                    ? {
                        borderColor: TAG_COLORS[tag],
                        color: TAG_COLORS[tag],
                        backgroundColor: `${TAG_COLORS[tag]}22`,
                      }
                    : undefined
                }
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? ""
                    : "border-void-300 text-void-100 hover:border-void-200 hover:text-gold-50"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>

        <div className="ms-auto flex items-center gap-1.5">
          <span className="eyebrow">Sort</span>
          {SORTS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setSort(option.key)}
              aria-pressed={sort === option.key}
              className={`rounded px-2.5 py-1.5 text-xs transition-colors ${
                sort === option.key
                  ? "bg-gold-400/20 text-gold-100"
                  : "text-void-100 hover:bg-void-400/60 hover:text-gold-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <p className="text-sm text-void-100">
          {visible.length} of {champions.length} champions
        </p>
        {(query || activeTags.length > 0) && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setActiveTags([]);
            }}
            className="text-sm text-hex-300 underline-offset-4 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="panel rounded-lg px-6 py-16 text-center">
          <p className="font-display text-xl text-gold-100">No champions match</p>
          <p className="mt-2 text-sm text-void-100">
            Try a different name, or clear the class filters.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {visible.map((champion) => (
            <li key={champion.id}>
              <Link
                href={`/champions/${champion.id}`}
                className="group block rounded-md border border-void-300 bg-void-600/60 p-1.5 transition-all hover:-translate-y-0.5 hover:border-gold-300 hover:bg-void-500"
              >
                <Image
                  // 173 tiny CDN icons: skip the optimizer, keep the layout box.
                  unoptimized
                  src={championIconUrl(version, champion.image.full)}
                  alt=""
                  width={120}
                  height={120}
                  loading="lazy"
                  className="aspect-square w-full rounded-sm object-cover grayscale-[35%] transition-all group-hover:grayscale-0"
                />
                <p className="mt-1.5 truncate px-0.5 text-center text-xs font-medium text-void-50 transition-colors group-hover:text-gold-50">
                  {champion.name}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
