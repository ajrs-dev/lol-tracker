import Image from "next/image";
import Link from "next/link";
import { championIconUrl } from "@/lib/ddragon";
import { compactNumber, timeAgo } from "@/lib/format";
import { masteryColor } from "@/lib/lol";
import type { MasteryEntry } from "@/lib/types";

interface Props {
  entries: MasteryEntry[];
  version: string;
}

export function MasteryGrid({ entries, version }: Props) {
  if (entries.length === 0) {
    return (
      <p className="panel rounded-lg px-6 py-10 text-center text-sm text-void-100">
        No champion mastery recorded yet.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {entries.map((entry) => {
        const color = masteryColor(entry.level);
        // Riot only reports progress while a champion is still levelling.
        const total =
          entry.pointsSinceLastLevel + entry.pointsUntilNextLevel || 0;
        const progress =
          total > 0
            ? Math.min(100, Math.round((entry.pointsSinceLastLevel / total) * 100))
            : 100;

        return (
          <li key={entry.championId}>
            <Link
              href={`/champions/${entry.championKey}`}
              className="panel group flex items-center gap-3 rounded-lg p-3 transition-colors hover:border-gold-300"
            >
              <div className="relative shrink-0">
                <Image
                  unoptimized
                  src={championIconUrl(version, entry.championImage)}
                  alt=""
                  width={56}
                  height={56}
                  className="h-12 w-12 rounded border"
                  style={{ borderColor: color }}
                />
                <span
                  className="absolute -bottom-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border border-void-900 px-1 text-[10px] font-semibold text-void-900"
                  style={{ backgroundColor: color }}
                >
                  {entry.level}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gold-50 transition-colors group-hover:text-gold-100">
                  {entry.championName}
                </p>
                <p className="text-xs text-void-100">
                  {compactNumber(entry.points)} pts
                </p>

                <div
                  role="presentation"
                  className="mt-1.5 h-1 overflow-hidden rounded-full bg-void-400"
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${progress}%`, backgroundColor: color }}
                  />
                </div>

                <p className="mt-1 truncate text-[11px] text-void-200">
                  {timeAgo(entry.lastPlayTime)}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
