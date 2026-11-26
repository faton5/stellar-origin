# Stellar Origin Implementation Plan

> **For agentic workers:** Use focused red-green tests for behavior and verify the integrated application before calling it complete.

**Goal:** Build a bilingual, privacy-conscious cosmic birthday experience that presents authentic NASA APOD data and date-based astronomy in a cinematic interface.

**Architecture:** Next.js App Router serves the UI and a small POST APOD proxy. Astronomy Engine runs in the browser. The NASA response is schema checked and sanitized at the boundary; canvas passport export stays entirely in the browser. No database, account, or external paid service.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Tailwind 4, React Three Fiber, Drei, Astronomy Engine, Zod, Vitest, Playwright, pnpm.

**Spec:** User-supplied Stellar Origin brief, 26 November 2026.

## Constraints and proof

- No invented scientific measurements, APOD media, or image reuse rights.
- NASA APOD Basic uses `/wp-json/wp/v2/apod-basic/{YYMMDD}`; `url` is the article URL and `hdurl` may be media. Verify returned ISO date.
- Date-only astronomy uses 12:00 UTC, explicitly labeled. Birth date is kept in browser state; server route receives a date only to fetch public APOD and does not log it.
- Never embed APOD artwork in passport export; use procedural artwork. Sharing a date requires a separate user action.
- Mobile, keyboard, reduced motion, no WebGL, network failure, and pre-archive dates are first-class states.

## Tasks

- [x] Establish Next.js foundation, bilingual copy, visual identity, accessible date entry, and lightweight motion.
- [x] Add tested date handling and NASA APOD boundary: exact-date lookup, schema validation, safe media/HTML, unavailable states, and cache.
- [x] Add tested Astronomy Engine calculations for lunar details, planetary positions, and pedagogical cosmic age.
- [x] Build the journey: APOD reveal, moon, age, lazy 3D solar system with 2D fallback, date controls, and birthday archive.
- [x] Add browser-only passport exports, opt-in link sharing, and two-date comparison.
- [x] Add metadata, legal/scientific sources, privacy and project pages, CI, unit/E2E checks; run lint, types, tests, and production build.

## Review focus

- February 29 anniversaries in non-leap years use February 28 and say so.
- NASA response for a different date never appears as the requested APOD.
- NASA media not safely embeddable falls back to the official publication link.
- A birth before 1995-06-16 still reveals astronomy without claiming a birth-day APOD.
- All exported card variants omit the date when privacy mode is selected.
