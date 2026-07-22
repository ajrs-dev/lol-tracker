"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SummonerSearch } from "./summoner-search";

const NAV = [
  { href: "/champions", label: "Champions" },
  { href: "/summoner", label: "Summoner" },
  { href: "/docs", label: "API" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-void-300/60 bg-void-900/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-3">
        <Link href="/" className="group flex items-center gap-2.5">
          <span
            aria-hidden
            className="h-6 w-6 rotate-45 border border-gold-300 bg-gradient-to-br from-gold-200/40 to-transparent transition-colors group-hover:bg-gold-300/30"
          />
          <span className="font-display text-lg tracking-wide text-gold-50">
            Rift Index
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded px-3 py-1.5 transition-colors ${
                  active
                    ? "bg-gold-400/15 text-gold-100"
                    : "text-void-100 hover:bg-void-400/60 hover:text-gold-50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ms-auto w-full sm:w-auto">
          <SummonerSearch compact />
        </div>
      </div>
    </header>
  );
}
