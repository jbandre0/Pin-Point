# Pin Point

A GeoGuessr / WorldGuessr **study tool** — not a guessing game. Learn the
country-identifying meta (language, road furniture, architecture, nature,
vehicles, Google coverage) on an interactive world map, then drill it with a
filterable quiz. The app itself ships **no Street View imagery**.

## Status — Phase 1 (local only)

No login, no backend, no database. All country data is static JSON in
`countries/*.json`; all progress lives in browser `localStorage`
(`pinpoint:factState`). Phase 2 (Supabase auth + hosting) is designed to be
additive on top of this, not a rewrite.

See `BUILD_BRIEF.md` for the full Phase 1 scope and `docs/ROADMAP.md` for
long-term background.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
```

## Layout

| Path                             | What                                                    |
| -------------------------------- | ------------------------------------------------------- |
| `countries/*.json`               | One file per country, following `SCHEMA.md` exactly     |
| `scripts/research-agent.js`      | Standalone draft generator. **Not** wired into the app. |
| `public/geo/countries-110m.json` | Natural Earth world map (public domain, `world-atlas`)  |
| `src/lib/`                       | Data loader, fact enumeration, familiarity store, metrics |
| `src/components/`                | `WorldMap`, `StatWidgets`                               |
| `src/app/`                       | `page.tsx` (map home), `country/[id]` (detail)          |

## Familiarity model

Manual self-assessment, three states per fact-id
(`{countryId}.{category}.{field}`): `new` (default, unstored) → `familiar`
(checkmark) → `mastered` (star). No SRS, no boxes, no due dates — the user
decides. Stored as a flat map so a Phase 2 DB sync is a straight copy.

## Adding a country

1. `node scripts/research-agent.js "Country Name"` (needs `ANTHROPIC_API_KEY`)
   → writes `countries/{id}.json` as `status: "draft"`.
2. Fact-check every field against its `sources`, then flip `status` to
   `"reviewed"`.
3. Never add a schema field silently — propose the change in `SCHEMA.md` first.
