# BUILD_BRIEF.md — GeoStudy App

## What this is
A GeoGuessr/WorldGuessr **study tool**, not a guessing game. The user
studies country-identifying characteristics (language, architecture,
road furniture, vehicles, etc.) via an interactive world map and a
spaced-repetition quiz system, so they get better at the real game
without this app itself showing them any Street View images.

Reference files in this folder — read all of them before starting:
- `SCHEMA.md` — the data structure every country file follows
- `countries/bg.json` — one fully worked example
- `scripts/research-agent.js` — separate utility for generating more
  country data later; not part of the app itself, don't wire it into
  the frontend
- `README.md` — background context and long-term roadmap

## Phase 1 scope (build this now)
Everything below runs **locally, no login, no backend.** Progress is
stored in browser `localStorage`. This is intentional — get the core
loop fun and correct before adding accounts/hosting.

### Stack
- **Next.js** (App Router) + **TypeScript** + **Tailwind CSS**
- **react-simple-maps** (or D3 directly if you hit limitations) rendered
  against a public-domain Natural Earth TopoJSON/GeoJSON world file for
  the map — no licensing concerns, this data is free to use
- No database, no auth, no external API calls at runtime. All country
  data ships as static JSON read from `/countries/*.json` at build time.
- `localStorage` for all user progress/SRS state, namespaced e.g.
  `geostudy:srs:{factId}`

### Screens/features to build, in this order

1. **World map home screen**
   - Full-viewport clickable world map, countries color-coded by
     `tier` from their JSON file (tier 1 = brightest, so the user's eye
     is drawn to the highest-value countries first)
   - 2-3 small stat widgets floating over open ocean (Pacific, South
     Atlantic) — not covering any landmass. Start with: "countries
     reviewed," "cards due today," "overall average simulated miss
     distance" (see #4 below for that metric's definition)
   - Click a country → navigate to `/country/[id]`
   - Countries with no JSON file yet should be visibly greyed out /
     "not yet available," not silently unclickable

2. **Country detail page** (`/country/[id]`)
   - Render every top-level section from the schema as its own card/
     section, in the same order for every country (this consistency is
     the whole point — the user should build muscle memory for *where*
     to look for each fact type)
   - Small visual distinction for `status: "draft"` vs `"reviewed"`
     (e.g. an amber dot + tooltip: "unverified — fact-check before
     trusting")
   - Each leaf field shows its checkmark/star toggle inline (see
     familiarity tracking below) so marking state happens naturally
     while reading, not as a separate step
   - If `regional_variants` is non-empty, render tabs/sub-navigation
     for each region

3. **Familiarity tracking (no SRS, no boxes, no dates)**
   - Every fact-ID (`{countryId}.{category}.{field}`) has exactly one
     of three states, set entirely by the user, never automatically:
     `"new"` (default, no icon) → `"familiar"` (checkmark) →
     `"mastered"` (star)
   - On the country detail page, each field gets a small checkmark/star
     toggle right next to it so the user can mark state while reading,
     no separate flow needed
   - No due dates, no intervals, no algorithmic scheduling. This is a
     manual self-assessment system, not spaced repetition — the user
     decides when something feels familiar or mastered
   - Store as a flat map in localStorage:
     `geostudy:factState` → `{ "bg.language.script": "mastered", ... }`
     (omit entries still at "new" to keep it small — absence = new)

4. **Quiz modes** (`/quiz`)
   - Before starting a quiz, the user picks filters: **category**
     (language / road_furniture / architecture / nature / vehicles /
     google_coverage / any) crossed with **state** (new / familiar /
     mastered / any combination) — e.g. "quiz me on Familiar
     Architecture" or "quiz me on New Bollard Styles across all
     countries." This filter combination is the core interaction,
     build it as a first-class control, not an afterthought
   - Mode select screen: Category-isolated / Discriminator / Reverse-
     recall
   - **Category-isolated**: show one field's value, blank the country,
     user guesses (free text or select from a shuffled list of
     plausible countries — include this country's `confusion_set`
     entries in the distractor list, that's literally what they're for)
   - **Discriminator**: pick 2-3 countries from a `confusion_set`
     relationship, show one's `tiebreaker` fact, user picks which
     country it describes
   - **Reverse-recall**: show country name only, user free-types what
     they remember, then reveals the full card for self-grading
   - After each quiz question, offer quick state-change buttons (mark
     familiar / mark mastered / no change) so the user can update
     state right there instead of going back to the country page
   - **Demotion rule**: when quizzing specifically within the
     "mastered" filter and the user marks an answer wrong/forgotten,
     automatically drop that fact-ID's state one level (mastered →
     familiar). Do not auto-promote on quiz sessions outside the
     mastered filter — promotion is always a deliberate user action

5. **"Simulated distance" dashboard metric**
   - Purely a motivational visualization, not a real distance
     calculation. Suggested formula: for a given country, weight its
     fact-IDs — new = 0, familiar = 0.5, mastered = 1 — average that
     across all its facts, then map the average onto a decay curve
     from ~5000 (all new) down toward ~0 (all mastered) miles. Exact
     curve shape is a tuning decision — make it feel satisfying, not
     scientifically rigorous
   - Home screen map can optionally shade countries by this metric
     instead of/in addition to tier, as a toggle

## Explicit constraints — do not violate these
- **No Street View or other copyrighted photographs anywhere in the
  app's shipped data.** Original SVG icons are fine. A future
  "field notes" feature will let the user attach their *own*
  screenshots locally, but that's Phase 3, not now, and even then
  those images stay client-side/user-owned, never bundled into the
  app's data files.
- **Do not build login, auth, or any backend/database in Phase 1.**
  If you think the architecture needs to anticipate it, that's fine —
  keep the data layer as plain JSON files and localStorage so a
  Phase 2 migration to Supabase is additive, not a rewrite — but do
  not implement auth now.
- **Every country file follows SCHEMA.md exactly.** If you need to add
  a field, propose the schema change back to the user rather than
  silently diverging per-country.

## Phase 2 (do not start yet, just architect Phase 1 so this is additive)
- Supabase for auth + persisting SRS state per user instead of
  localStorage
- Next.js deployed on Vercel
- Migrate localStorage progress into the user's account on first login

## First task
Confirm you've read SCHEMA.md and countries/bg.json, then scaffold the
Next.js project and build screen #1 (world map home screen) using bg.json
as the only populated country so there's something real to click into.
Stop and check in before moving to screen #2.

## Note on Phase 2 sync
If/when Phase 2 adds Supabase auth, the flat `factState` map is trivial
to sync — it's just a JSON blob keyed by fact-ID and state, no box
levels or timestamps to reconcile. Migrating it from localStorage to a
per-user database row is a straight copy, not a data model change.
