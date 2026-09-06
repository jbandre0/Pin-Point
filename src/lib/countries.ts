// Build-time country data loader.
//
// All country data ships as static JSON in `/countries/*.json` and is read
// from disk on the server (no database, no runtime fetch). These helpers run
// only in Server Components / route handlers.

import fs from "fs";
import path from "path";
import type { Country } from "./types";

const COUNTRIES_DIR = path.join(process.cwd(), "countries");

// Ignore the research agent's `*-draft.json` side-files — those are unmerged
// output waiting for a human, not part of the shipped deck.
function isCountryFile(file: string): boolean {
  return file.endsWith(".json") && !file.endsWith("-draft.json");
}

let _cache: Country[] | null = null;

export function getAllCountries(): Country[] {
  if (_cache) return _cache;

  let files: string[] = [];
  try {
    files = fs.readdirSync(COUNTRIES_DIR).filter(isCountryFile);
  } catch {
    files = [];
  }

  const countries: Country[] = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(COUNTRIES_DIR, file), "utf-8");
    let parsed: Country;
    try {
      parsed = JSON.parse(raw) as Country;
    } catch (err) {
      console.error(`Skipping ${file}: not valid JSON`, err);
      continue;
    }
    if (!parsed.id || parsed.id !== path.basename(file, ".json")) {
      console.warn(
        `${file}: "id" (${parsed.id}) does not match filename — using filename`,
      );
      parsed.id = path.basename(file, ".json");
    }
    countries.push(parsed);
  }

  countries.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
  _cache = countries;
  return countries;
}

export function getCountry(id: string): Country | null {
  return getAllCountries().find((c) => c.id === id.toLowerCase()) ?? null;
}

/** Lowercase alpha-2 ids of every country that has a data file. */
export function getAvailableCountryIds(): string[] {
  return getAllCountries().map((c) => c.id);
}
