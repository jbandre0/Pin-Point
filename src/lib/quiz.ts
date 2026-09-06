// Quiz logic — pure functions over country data + the familiarity map.
// No SRS: the quiz is just a filtered view of the fact pool.

import type {
  Country,
  FactCategory,
  FactStateMap,
  FactStateOrNew,
} from "./types";
import { CATEGORY_LABEL, enumerateFacts, type Fact } from "./facts";

export type QuizMode =
  | "category-isolated"
  | "discriminator"
  | "reverse-recall";

export interface QuizFilter {
  category: FactCategory | "any";
  states: FactStateOrNew[]; // non-empty subset of ["new","familiar","mastered"]
}

export interface PoolFact extends Fact {
  countryName: string;
  state: FactStateOrNew;
}

export interface CategoryIsolatedQuestion {
  mode: "category-isolated";
  fact: PoolFact;
  countryId: string;
  prompt: string; // "Road furniture · Bollard color"
  clue: string; // the field value, country blanked
  options: string[]; // shuffled country names incl. the answer ([] = free-text only)
  answer: string; // correct country name
}

export type Question = CategoryIsolatedQuestion;

// --- helpers -------------------------------------------------------------

export function shuffle<T>(items: readonly T[]): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function normalizeGuess(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.’']/g, "");
}

export function matchesCountry(guess: string, country: Country): boolean {
  const g = normalizeGuess(guess);
  if (!g) return false;
  return [country.name, ...country.aliases].some(
    (name) => normalizeGuess(name) === g,
  );
}

/** State filter that means "only quiz facts the user currently has at mastered". */
export function isMasteredOnlyFilter(filter: QuizFilter): boolean {
  return filter.states.length === 1 && filter.states[0] === "mastered";
}

// --- pool + session ----------------------------------------------------

export function factPool(
  countries: Country[],
  states: FactStateMap,
  filter: QuizFilter,
): PoolFact[] {
  const out: PoolFact[] = [];
  for (const country of countries) {
    for (const f of enumerateFacts(country)) {
      if (f.isBlank) continue;
      if (filter.category !== "any" && f.category !== filter.category) continue;
      const state: FactStateOrNew = states[f.id] ?? "new";
      if (!filter.states.includes(state)) continue;
      out.push({ ...f, countryName: country.name, state });
    }
  }
  return out;
}

function distractorNames(country: Country, all: Country[]): string[] {
  const names = new Set<string>();
  for (const c of all) if (c.id !== country.id) names.add(c.name);
  for (const entry of country.confusion_set) names.add(entry.country);
  return Array.from(names);
}

export function buildSession(
  countries: Country[],
  states: FactStateMap,
  mode: QuizMode,
  filter: QuizFilter,
  length: number,
): Question[] {
  const byId = new Map(countries.map((c) => [c.id, c] as const));
  const picks = shuffle(factPool(countries, states, filter)).slice(0, length);

  if (mode === "category-isolated") {
    return picks.map((fact): CategoryIsolatedQuestion => {
      const country = byId.get(fact.countryId)!;
      const distractors = shuffle(distractorNames(country, countries)).slice(
        0,
        3,
      );
      return {
        mode: "category-isolated",
        fact,
        countryId: fact.countryId,
        prompt: `${CATEGORY_LABEL[fact.category as FactCategory]} · ${fact.label}`,
        clue: fact.value,
        options:
          distractors.length > 0
            ? shuffle([country.name, ...distractors])
            : [],
        answer: country.name,
      };
    });
  }

  // discriminator / reverse-recall land in Stage 3b/3c
  return [];
}
