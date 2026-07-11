<div align="center">
  <img src="public/kirkit.png"  alt="KirKit" width="200" />
</div>

# KirKit — Boundary League

A gully cricket scoring and series tracker built with Next.js 15, React 19, and TypeScript.

## Features

- **Live Scoring** — Ball-by-ball tracking (4s, 6s, dots, wides, no-balls, wickets)
- **Series Management** — Multi-match tournament with cumulative standings
- **MVP System** — Proportional batting, bowling, and fielding points across the series
- **Batting Order** — Auto-generated order based on cumulative MVP rankings
- **Treat Zone** — Tracks the lowest-ranked active player who owes the group a treat (MVP-based)
- **Absconded Players** — Series-persisted exclusion from batting queue and Treat eligibility
- **Escape Target** — Live run targets during innings so every batter knows what to chase
- **Dismissal Tracking** — Records bowler and fielder for every wicket
- **Series Results** — End-of-series MVP awards, Treat sponsor, and absconded summary

## Tech Stack

- **Framework** — Next.js 15 (App Router)
- **UI** — Tailwind CSS v4, Framer Motion, Lucide icons
- **State** — React Context + localStorage persistence
- **Language** — TypeScript

## Getting Started

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Optional: copy env template
cp .env.example .env.local

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/                  Next.js App Router pages
├── dashboard/        Home screen
├── match/
│   ├── create/       New match setup
│   └── scoring/      Live ball-by-ball scoring
├── leaderboard/      Hall of Fame (runs + MVP treat zone)
├── mvp/              Full MVP leaderboard
├── results/          End-of-series results (canonical)
├── profile/          Player profile
└── applet/app/results/  Legacy re-export → app/results

components/           React components
lib/                  Pure logic (types, store, MVP engine, escape target, standings)
```

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```
