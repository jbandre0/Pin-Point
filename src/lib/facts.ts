// Fact enumeration.
//
// The quiz engine walks the country JSON tree and treats each leaf value in the
// six quiz-able categories as one atomic "fact", keyed `{countryId}.{category}.{field}`.
// A string[] leaf (e.g. official_languages) counts as a single fact, not one per item.

import type { Country, FactCategory } from "./types";
import { FACT_CATEGORIES } from "./types";

export interface Fact {
  id: string; // `${countryId}.${category}.${field}`
  countryId: string;
  category: FactCategory;
  field: string;
  label: string; // humanised field name
  value: string; // display string ("" when the source field is blank)
  isBlank: boolean;
}

function humanise(field: string): string {
  return field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function toDisplay(value: unknown): { text: string; blank: boolean } {
  if (Array.isArray(value)) {
    const joined = value.filter(Boolean).join(", ");
    return { text: joined, blank: joined.length === 0 };
  }
  if (typeof value === "string") {
    return { text: value.trim(), blank: value.trim().length === 0 };
  }
  return { text: String(value ?? ""), blank: value == null };
}

/** Every fact for one country, in the fixed category/field order. */
export function enumerateFacts(country: Country): Fact[] {
  const facts: Fact[] = [];
  for (const category of FACT_CATEGORIES) {
    const section = country[category] as unknown as
      | Record<string, unknown>
      | undefined;
    if (!section) continue;
    for (const [field, raw] of Object.entries(section)) {
      const { text, blank } = toDisplay(raw);
      facts.push({
        id: `${country.id}.${category}.${field}`,
        countryId: country.id,
        category: category as FactCategory,
        field,
        label: humanise(field),
        value: text,
        isBlank: blank,
      });
    }
  }
  return facts;
}

/** Fact ids only — cheap, for progress math that doesn't need values. */
export function factIds(country: Country): string[] {
  return enumerateFacts(country).map((f) => f.id);
}

/**
 * Fact ids for non-blank fields only. A blank field can't meaningfully be
 * "familiar", so these are what the learn/mastery counts and the simulated
 * distance are measured against. (The goal is to have as few blank fields as
 * possible anyway.)
 */
export function learnableFactIds(country: Country): string[] {
  return enumerateFacts(country)
    .filter((f) => !f.isBlank)
    .map((f) => f.id);
}
