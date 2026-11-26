# Stellar Origin

**Your birth. Your moment. Your universe.**

A bilingual, interactive web journey through a chosen date. Stellar Origin presents the [real NASA Astronomy Picture of the Day](https://science.nasa.gov/apod/) when one exists, calculates the Moon and heliocentric planet positions, and turns elapsed time into planetary years. It runs without an account, database, paid API, or required environment variable.

## What works

- Date entry with a short, skippable journey and reduced-motion support.
- Exact-date APOD lookup through NASA's **new APOD Basic** endpoint. The app checks the returned date, validates and sanitizes the record, shows original English explanation/credits, supports images and approved video embeds, and links to the NASA publication. It never substitutes another photograph as the requested APOD.
- The Moon's calculated phase, illuminated fraction, Earth distance and next full Moon; estimated lunar age.
- Eight planets at 12:00 UTC via Astronomy Engine, an interactive 3D scene with viewpoint, selection, time slider and comparison with today, plus a keyboard-friendly 2D fallback when WebGL is unavailable.
- Earth days, mean-period planetary years, approximate next orbital birthdays and approximate Earth orbital distance.
- One-at-a-time, on-demand APOD retrieval for birthday anniversaries. February 29 uses February 28 in non-leap years.
- A time machine with today, birth, random archive date and sourced exploration milestones.
- Four locally generated Cosmic Passport PNG formats. APOD images are never included in exports; inclusion of the date and APOD title is opt-in. Sharing a dated link is a separate action.
- A two-date comparison of APOD records, lunar phases/illumination, time span and planetary position diagrams.
- English and French UI, browser-language detection and local language preference. NASA prose stays in its original English.

Dates before **1995-06-16** still show calculated astronomy. The UI plainly states that no birth-day APOD exists in the archive.

## Stack and layout

Next.js App Router, React, TypeScript strict, Tailwind CSS 4, Three.js with React Three Fiber/Drei, Astronomy Engine, Zod, Vitest and Playwright. The code is split between `src/app` (routes and metadata), `src/components` (experience and scene), and `src/lib` (NASA boundary, dates, calculations, export and language copy).

The sole server operation is `POST /api/apod` with `{ "date": "YYYY-MM-DD" }`. It fetches `https://science.nasa.gov/wp-json/wp/v2/apod-basic/{YYMMDD}` and caches the public NASA record for 24 hours for archive dates, five minutes for the current UTC date. The image bytes go directly from NASA to the visitor's browser. The app does not log the submitted date. A hosting provider may retain ordinary request logs; see [Privacy](src/app/privacy/page.tsx).

## Local development

Requires Node.js 20.9+ and pnpm 11.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
pnpm analyze
```

The last command writes a Next.js Turbopack bundle analysis to `.next/diagnostics/analyze`. Playwright starts its own dev server on port 3100. The browser tests mock NASA responses so they remain deterministic; real NASA availability is a separate integration check.

## Deploy on Vercel Hobby

1. Put these files in a Git repository and push it to a provider supported by Vercel.
2. Import the repository in Vercel and choose the Next.js framework preset.
3. Set the install command to `pnpm install --frozen-lockfile` and leave the build command as `pnpm build`.
4. Deploy. No API key or database is needed. The public NASA APOD Basic endpoint is used.
5. Optionally set `NEXT_PUBLIC_SITE_URL` to a canonical custom domain. Without it, Vercel's provided production URL is used for metadata, sitemap and robots.

The application has no scheduled jobs or paid storage. Verify the NASA feed's availability and Vercel Hobby usage in the deployment you operate; a local green build is not deployment proof.

## Scientific and legal notes

Read [Scientific sources and methods](docs/SCIENCE_SOURCES.md) and [Credits and rights](CREDITS.md). Solar-system display distances and body sizes are intentionally rescaled. Planetary ages use **mean sidereal periods**, not a numerical search for exact orbital returns. Lunar age is a phase-based estimate. None of the illustrations are presented as observations.

## Current limits

- The advanced location-and-time birth sky, star catalogue, ambient sound and easter eggs are not implemented. The main experience does not present controls for these unfinished modes.
- Videos are embedded only when NASA's record contains a safe YouTube or Vimeo embed. Other formats fall back to the official NASA page.
- APOD media rights vary by author. The passport intentionally uses procedural artwork for every record.
- A date-only input has no birth hour or location. All astronomical snapshots use **12:00 UTC** on that date.
- This project has not been deployed from this workspace. Live APOD availability depends on NASA's service and the visitor's connection.

Stellar Origin is an independent project and is **not affiliated with NASA**.
