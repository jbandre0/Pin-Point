// Country data schema — mirrors SCHEMA.md exactly.
// Every leaf field is a potential quiz "fact", keyed by its dot-path
// (e.g. `bg.language.script`). Keep this in sync with SCHEMA.md; propose
// schema changes back to the user rather than diverging per-country.

export type CountryStatus = "draft" | "reviewed";

export interface QuickId {
  driving_side: string;
  flag_emoji: string;
  capital: string;
}

export interface LanguageSection {
  official_languages: string[];
  script: string;
  sample_text: string;
  script_notes: string;
  false_friends: string[];
}

export interface RoadFurnitureSection {
  bollard_color: string;
  bollard_shape: string;
  guardrail_type: string;
  line_paint: string;
  curb_style: string;
  km_marker_style: string;
}

export interface ArchitectureSection {
  roof_style: string;
  roof_material: string;
  wall_construction: string;
  wall_color_palette: string;
  distinctive_building_types: string;
}

export interface NatureSection {
  vegetation: string;
  terrain: string;
  climate_signature: string;
}

export interface VehiclesSection {
  common_brands: string[];
  plate_color: string;
  plate_format: string;
  distinctive_vehicles: string;
}

export interface GoogleCoverageSection {
  camera_generation: string;
  blur_style: string;
  coverage_notes: string;
}

export interface ConfusionEntry {
  country: string;
  shared_traits: string;
  tiebreaker: string;
}

export interface RegionalVariant {
  region_id: string;
  region_name: string;
  parent: string;
  notes_override: Record<string, unknown>;
}

export interface Country {
  id: string; // ISO 3166-1 alpha-2, lowercase
  name: string;
  aliases: string[];
  continent: string;
  tier: 1 | 2 | 3;
  status: CountryStatus;
  sources: string[];
  quick_id: QuickId;
  language: LanguageSection;
  road_furniture: RoadFurnitureSection;
  architecture: ArchitectureSection;
  nature: NatureSection;
  vehicles: VehiclesSection;
  google_coverage: GoogleCoverageSection;
  confusion_set: ConfusionEntry[];
  regional_variants: RegionalVariant[];
}

// The six quiz-able leaf categories, in the fixed render order used on every
// country page (this consistency is the point — muscle memory for where to look).
export const FACT_CATEGORIES = [
  "language",
  "road_furniture",
  "architecture",
  "nature",
  "vehicles",
  "google_coverage",
] as const;

export type FactCategory = (typeof FACT_CATEGORIES)[number];

// Manual self-assessment state. No SRS, no boxes, no dates (per BUILD_BRIEF.md).
// "new" is the default and is never stored — absence means "new".
export type FactState = "familiar" | "mastered";
export type FactStateOrNew = "new" | FactState;

// Flat localStorage map: { "bg.language.script": "mastered", ... }
export type FactStateMap = Record<string, FactState>;
