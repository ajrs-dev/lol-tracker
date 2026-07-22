"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { REGION_CODES, REGIONS, type RegionCode } from "@/lib/regions";

interface Props {
  /** Header variant: single row, tighter controls. */
  compact?: boolean;
  defaultRegion?: RegionCode;
}

export function SummonerSearch({ compact = false, defaultRegion = "na1" }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [region, setRegion] = useState<RegionCode>(defaultRegion);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const raw = query.trim();

    if (!raw) {
      setError("Enter a Riot ID, like Faker#KR1");
      return;
    }

    // Game names may contain '#'? They may not, but splitting on the last one
    // is the safer read of "Name#TAG" either way.
    const hashAt = raw.lastIndexOf("#");

    // Riot retired lookup-by-name, so the tag is the only way to resolve a
    // player. Guessing one from the region is wrong more often than not
    // (Doublelift#NA1, not #NA) — better to ask than to navigate into a 404.
    if (hashAt === -1) {
      setError("Include the tag too, like Faker#KR1");
      return;
    }

    const gameName = raw.slice(0, hashAt).trim();
    const tagLine = raw.slice(hashAt + 1).trim();

    if (!gameName || !tagLine) {
      setError("Riot IDs look like Name#TAG");
      return;
    }

    setError(null);
    startTransition(() => {
      router.push(
        `/summoner/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
      );
    });
  }

  const fieldClass = compact ? "h-9 text-sm" : "h-12 text-base";

  return (
    <form
      onSubmit={handleSubmit}
      className={compact ? "flex items-center gap-2" : "space-y-3"}
    >
      <div className="flex items-stretch gap-2">
        <label className="sr-only" htmlFor={`${errorId}-region`}>
          Region
        </label>
        <select
          id={`${errorId}-region`}
          value={region}
          onChange={(event) => setRegion(event.target.value as RegionCode)}
          className={`${fieldClass} shrink-0 rounded border border-void-300 bg-void-600 px-2 font-medium text-gold-100 transition-colors hover:border-gold-400 focus:border-gold-300`}
        >
          {REGION_CODES.map((code) => (
            <option key={code} value={code} className="bg-void-600">
              {REGIONS[code].short}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor={`${errorId}-name`}>
          Riot ID
        </label>
        <input
          id={`${errorId}-name`}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (error) setError(null);
          }}
          placeholder="Name#TAG"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`${fieldClass} ${
            compact ? "w-44 sm:w-52" : "w-full"
          } rounded border border-void-300 bg-void-600 px-3 text-gold-50 placeholder:text-void-200 transition-colors hover:border-gold-400 focus:border-gold-300`}
        />

        <button
          type="submit"
          disabled={pending}
          className={`${fieldClass} shrink-0 rounded border border-gold-400 bg-gold-400/20 px-4 font-medium text-gold-100 transition-colors hover:bg-gold-400/35 hover:text-gold-50 disabled:cursor-wait disabled:opacity-60`}
        >
          {pending ? "…" : compact ? "Go" : "Search"}
        </button>
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-sm text-loss">
          {error}
        </p>
      )}
    </form>
  );
}
