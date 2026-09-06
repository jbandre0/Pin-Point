// Map geometry helpers.
//
// The Natural Earth world file (public-domain, vendored at
// `public/geo/countries-110m.json`) identifies each country by its ISO 3166-1
// *numeric* code. Our country data files are keyed by ISO 3166-1 *alpha-2*
// (lowercase). This bridges the two.

import isoCountries from "i18n-iso-countries";

export const WORLD_TOPOJSON_URL = "/geo/countries-110m.json";

/** Geometry `id` on the Natural Earth topojson is the numeric ISO code. */
export interface GeoProperties {
  name: string;
}

/**
 * Lowercase alpha-2 id for a topojson geography, or null when the code has no
 * alpha-2 equivalent (a handful of disputed/uncoded polygons in the dataset).
 */
export function geoIdToAlpha2(numericId: string | number | undefined): string | null {
  if (numericId === undefined || numericId === null) return null;
  const numeric = String(numericId).padStart(3, "0");
  const alpha2 = isoCountries.numericToAlpha2(numeric);
  return alpha2 ? alpha2.toLowerCase() : null;
}
