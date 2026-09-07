# Country Data Schema

One JSON file per country in `/countries/{iso_code}.json` (e.g. `bulgaria.json`,
or better, `bg.json` keyed by ISO 3166-1 alpha-2 so regions/large countries can
nest cleanly — e.g. `br-se.json` for São Paulo state under Brazil).

## Design principles

1. **Every leaf field is a potential SRS card.** The quiz/SRS engine walks the
   JSON tree and treats each leaf value as an atomic "fact" keyed by its dot-path
   (e.g. `bg.language.script` or `bg.road_furniture.bollard_color`). This means
   the schema IS the flashcard deck — no separate duplication needed.
2. **`status` field on every record.** AI-drafted content starts as `"draft"`.
   You (or future-you) flip it to `"reviewed"` once you've fact-checked it.
   The app should visually distinguish draft vs. reviewed content (e.g. a
   small amber dot) so you never accidentally study a hallucinated fact as
   if it were verified.
3. **`sources` array is mandatory for anything researched.** Every draft
   should carry the URLs the research agent pulled from, so review is fast —
   you're checking the agent's homework, not starting from scratch.
4. **No photos, ever, in this data layer.** Images live in a *separate*
   user-owned `field_notes` store (your own screenshots), never in the
   shared country data.

## Top-level fields

```
{
  "id": "bg",                          // ISO 3166-1 alpha-2, lowercase
  "name": "Bulgaria",
  "aliases": [],                       // alternate names/spellings
  "continent": "Europe",
  "tier": 1,                           // 1 = high-frequency meta country, 2/3 = rarer
  "status": "draft",                   // "draft" | "reviewed"
  "sources": ["https://..."],

  "quick_id": {
    "driving_side": "right",
    "flag_emoji": "🇧🇬",
    "capital": "Sofia"
  },

  "language": {
    "official_languages": ["Bulgarian"],
    "script": "Cyrillic",
    "sample_text": "ВНИМАНИЕ — ОПАСНО",   // short, generic, non-copyrighted sample
    "script_notes": "Distinctive letters: ъ, ь used differently than Russian; ...",
    "false_friends": ["Russia", "Serbia", "North Macedonia", "Ukraine"]
  },

  "road_furniture": {
    "bollard_color": "",
    "bollard_shape": "",
    "guardrail_type": "",
    "line_paint": "",
    "curb_style": "",
    "km_marker_style": ""
  },

  "architecture": {
    "roof_style": "",
    "roof_material": "",
    "wall_construction": "",
    "wall_color_palette": "",
    "distinctive_building_types": ""
  },

  "nature": {
    "vegetation": "",
    "terrain": "",
    "climate_signature": ""
  },

  "vehicles": {
    "common_brands": [],
    "plate_color": "",
    "plate_format": "",
    "distinctive_vehicles": ""
  },

  "google_coverage": {
    "camera_generation": "",
    "blur_style": "",
    "coverage_notes": ""
  },

  "confusion_set": [
    {
      "country": "Serbia",
      "shared_traits": "Cyrillic script visible in places, similar terrain",
      "tiebreaker": "Serbia mostly uses Latin script on road signs; Bulgaria is Cyrillic-only on official signage"
    }
  ]
  // a regional profile adds one more key here: "parent": "br"
}
```

## Regional profiles (large / diverse countries)

A region is a **full standalone profile in its own file**, not a set of
overrides. `countries/br-se.json` looks exactly like a country file — every
top-level field populated — plus one extra key:

```
"parent": "br"     // the parent country's id
```

Conventions:

- `id` is `"{cc}-{region}"` lowercase (`br-se`, `br-n`). The filename matches.
- `name` is the region's own name, e.g.
  `"Southeast Brazil (São Paulo · Rio · Minas Gerais)"`.
- `quick_id.capital` is the region's representative city, not the national one.
- Repeat the genuinely national constants (language, plate format, driving
  side) — the region is a whole profile the user studies on its own.
- Children are discovered from files whose `parent` matches; there is no list
  on the parent. A country with no regions simply omits `parent` and has no
  child files.
- The parent country still gets its own `br.json` — a national overview
  covering the countrywide constants.

## Fact-ID convention

`{record_id}.{category}.{field}` — e.g. `bg.road_furniture.bollard_color` or
`br-se.architecture.roof_style`. Regions are region-scoped: their facts are
tracked, quizzed and scored independently of the national profile.
