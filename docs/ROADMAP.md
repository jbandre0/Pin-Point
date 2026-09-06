# GeoStudy — scaffold notes for Claude Code

## What's in this folder
- `SCHEMA.md` — the uniform data schema. Every country/region file follows this.
- `countries/bg.json` — a fully worked example (Bulgaria), researched and
  sourced, `status: "draft"` pending your fact-check.
- `scripts/research-agent.js` — run this to auto-draft new country entries
  via the Anthropic API + web search. See comments in the file for how it
  works and why it never overwrites your reviewed work.

## Suggested build order for Claude Code
1. Static map UI (Natural Earth GeoJSON, public domain, no licensing issue)
   that renders clickable countries and routes to a country detail page.
2. Country detail page component that renders any `countries/*.json` file
   against the schema — build this against `bg.json` first since it's fully
   populated.
3. SRS engine: port the box-routing logic from your mufradaati Leitner
   system, but key cards by fact-ID (`{country}.{category}.{field}`)
   instead of vocab word IDs.
4. Quiz modes (category-isolated, discriminator, reverse-recall) as views
   on top of the same SRS engine.
5. "Simulated distance" dashboard metric, derived from SRS box levels.
6. Field-notes feature (user's own tagged gameplay screenshots) — this is
   the only place images live, and they're always user-owned, never
   shipped with the app's data.

## Suggested Tier 1 country list to research first (~40-50)
The countries with well-documented, high-frequency GeoGuessr meta:
United States (regional), Brazil (regional), Russia, Japan, Indonesia,
France, Germany, UK, Poland, Turkey, South Korea, Thailand, Argentina,
Chile, South Africa, Kenya, Nigeria, India, Australia, New Zealand,
Mexico, Spain, Italy, Netherlands, Sweden, Norway, Finland, Romania,
Bulgaria, Ukraine, Czechia, Slovakia, Hungary, Colombia, Peru, Ecuador,
Malaysia, Philippines, Taiwan, Bangladesh, Ghana, Uganda, Botswana,
Israel, Jordan, UAE.

Large/diverse countries on this list should get `regional_variants`
entries fairly early (US, Brazil, Russia, Indonesia, India) since a
single national-level page loses too much signal for them.

## Real talk: the "log in" part
This is the one piece that's a genuinely different scope of project than
"scaffold a study app," so flagging it plainly rather than quietly
absorbing it into the plan:

A login system means you need:
- **Auth** (something has to verify who you are)
- **A real database** (progress/SRS state needs to persist per-user, not
  just in browser localStorage)
- **Hosting** (something has to be running 24/7 for you to log into)

The pragmatic path, if you want this live and login-able without standing
up your own server infrastructure: **Supabase** (Postgres + auth +
storage, generous free tier) for the backend, a **Next.js** frontend, and
deploy on **Vercel**. Claude Code can scaffold all three pieces — this
isn't a blocker, it's just worth knowing going in that "online app with
login" is phase 2 territory, built on top of a working local version, not
something to bolt on at the very end as an afterthought. Get the map +
schema + SRS engine solid locally first; auth/hosting is a clean,
separate layer to add once the core loop is fun to use.
