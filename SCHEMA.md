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
  ],

  "regional_variants": []   // only populated for large/diverse countries
}
```

## Regional variant sub-schema (large countries only)

```
{
  "region_id": "br-se",
  "region_name": "São Paulo, Brazil",
  "parent": "br",
  "notes_override": {
    // any top-level field can be overridden at regional granularity
    "architecture": { "distinctive_building_types": "..." }
  }
}
```

## Fact-ID convention for the SRS engine

`{country_id}.{category}.{field}` — e.g. `bg.road_furniture.bollard_color`.
This is what gets tracked in the user's progress store (see below), so the
SRS engine never needs to know anything about geography — it just moves
fact-IDs through Leitner boxes.
