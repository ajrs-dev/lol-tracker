<div align="center">

# ⚔️ Rift Index
**[Live demo](https://lol-tracker-theta.vercel.app/)** — try it.

**A League of Legends stat tracker for people with opinions about their teammates.**

Look up any player on the planet — what they actually play, where they actually rank,
and how the last eight games actually went. Then browse the full champion roster
(kits, base stats, growth curves) without ever opening the client.

![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React 19](https://img.shields.io/badge/React-19-087ea4?logo=react&logoColor=white)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)

</div>

---

## Why this exists

Everyone in your lobby has a story. *"I'm smurfing."* *"My duo griefed."* *"I main this, trust me."*

Rift Index is the receipts. Type a Riot ID, get the whole picture: rank, win rate,
champion mastery down to the point, and a match-by-match account of the recent past.
It's op.gg energy in a codebase small enough to read over lunch.

## What you get

### 🔎 Summoner profiles — scout anyone

Enter a Riot ID in any of 17 regions and get:

- **Ranked at a glance** — Solo/Duo and Flex: tier, division, LP, win rate, and a flag when they're on a hot streak.
- **Champion mastery, sorted by devotion** — every champion they've ever touched, with levels, point totals, and progress to the next level. Find out whether their "main" is a 400k-point marriage or a 12k-point situationship.
- **The last 8 games, honestly told** — KDA, CS per minute, kill participation, damage, vision score, and the full item build for every game. Remakes are detected and excused. Everything else is on the record.

**The tag is optional.** Search `Hide on bush` and the region's usual taglines
get tried — `KR1`, then `KR` — redirecting to whichever actually has an account,
so the resolved tag ends up in the address bar. It's a guess, not a lookup: Riot
retired search-by-name, and players can set any tag they like. Include it when
you know it.

### 📖 Champion index — the whole roster, no client required

- Every champion on the current patch, served straight from Riot's Data Dragon CDN.
- Search by name, filter by class, sort by attack, defense, magic, or difficulty.
- Full detail pages: the complete kit (passive + Q/W/E/R), base stats with per-level growth, lore, and the skin gallery.
- Keeps itself current — static data revalidates twice a day, comfortably ahead of Riot's patch cadence.

## Quick start

```bash
git clone https://github.com/ajrs-dev/lol-tracker.git
cd lol-tracker
npm install
cp .env.example .env.local   # then paste your Riot API key into it
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and you're on the Rift.

Grab a free development key at [developer.riotgames.com](https://developer.riotgames.com) — it's on the dashboard after you sign in with your Riot account.

| Feature | Needs a key? |
|---|---|
| Champion browsing | No — Data Dragon is public |
| Summoner lookup, mastery, matches | Yes |

> [!NOTE]
> Development keys expire every **24 hours**. If summoner lookups suddenly start
> returning 403s, that's not a bug — that's Riot. Regenerate the key, update
> `.env.local`, restart the dev server. The in-app [`/docs`](http://localhost:3000/docs)
> page covers this and more.

## Under the hood

- **Next.js 16** (App Router + Turbopack), **React 19** Server Components, **Tailwind CSS 4**, **TypeScript**.
- The Riot client is `server-only` — importing it from a client component is a **build error**, so the API key physically cannot leak into the browser bundle.
- Caching is tuned per endpoint: finished matches are immutable, so they're cached for a week; champion data holds for 12 hours; live-ish data (rank, mastery) for minutes. Your dev key's rate limit is treated like the scarce resource it is.
- A profile page is one PUUID resolution followed by parallel fetches for rank, mastery, score, and matches — and the non-critical calls fail soft, so one flaky endpoint never blanks the page.
- Champion pages are prerendered at build time; loose spellings (`/champions/missfortune`) still resolve on demand.

**Regions:** NA · EUW · EUNE · KR · BR · JP · LAN · LAS · OCE · TR · RU · ME · PH · SG · TH · TW · VN

## Legal jibber jabber

Rift Index was created under Riot Games' [Legal Jibber Jabber](https://www.riotgames.com/en-us/legal) policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this project.
