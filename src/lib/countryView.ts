// Regional-variant resolution.
//
// A country JSON may carry `regional_variants[]`, each with a `notes_override`
// that replaces or extends any top-level section at regional granularity
// (SCHEMA.md "Regional variant sub-schema"). This merges an override on top of
// the national data to produce the country object the detail page renders.
//
// UNTESTED: no country with a non-empty `regional_variants` exists in the data
// yet (bg.json has `[]`). Verify against the first real multi-region country
// (US / Brazil) when one is added.

import type { Country } from "./types";

export function effectiveCountry(
  country: Country,
  regionId: string | null,
): Country {
  if (!regionId) return country;

  const variant = country.regional_variants.find(
    (v) => v.region_id === regionId,
  );
  if (!variant?.notes_override) return country;

  const merged: Country = { ...country };
  for (const [key, override] of Object.entries(variant.notes_override)) {
    const base = (country as unknown as Record<string, unknown>)[key];
    const isPlainObject =
      override && typeof override === "object" && !Array.isArray(override);

    (merged as unknown as Record<string, unknown>)[key] = isPlainObject
      ? {
          ...(base && typeof base === "object" && !Array.isArray(base)
            ? base
            : {}),
          ...(override as Record<string, unknown>),
        }
      : override;
  }
  return merged;
}
