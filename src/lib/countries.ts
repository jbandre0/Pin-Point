// Build-time country data loader.
//
// All country data ships as static JSON in `/countries/*.json` and is read
// from disk on the server (no database, no runtime fetch). These helpers run
// only in Server Components / route handlers.
//
// A "record" is either a country (no `parent`) or a regional profile
// (`parent` = the country's id, e.g. "br"). Regions are full standalone
// profiles with their own fact ids; they never render as their own shape on
// the map.

import fs from "fs";
import path from "path";
import type { Country } from "./types";

const COUNTRIES_DIR = path.join(process.cwd(), "countries");

// Ignore the research agent's `*-draft.json` side-files — those are unmerged
// output waiting for a human, not part of the shipped deck.
function isDataFile(file: string): boolean {
  return file.endsWith(".json") && !file.endsWith("-draft.json");
}

let _cache: Country[] | null = null;

/** Every record — countries and regional profiles alike. */
export function getAllRecords(): Country[] {
  if (_cache) return _cache;

  let files: string[] = [];
  try {
    files = fs.readdirSync(COUNTRIES_DIR).filter(isDataFile);
  } catch {
    files = [];
  }

  const records: Country[] = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(COUNTRIES_DIR, file), "utf-8");
    let parsed: Country;
    try {
      parsed = JSON.parse(raw) as Country;
    } catch (err) {
      console.error(`Skipping ${file}: not valid JSON`, err);
      continue;
    }
    const base = path.basename(file, ".json");
    if (!parsed.id || parsed.id !== base) {
      console.warn(
        `${file}: "id" (${parsed.id}) does not match filename — using filename`,
      );
      parsed.id = base;
    }
    records.push(parsed);
  }

  records.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
  _cache = records;
  return records;
}

/** Top-level countries only (no `parent`) — what the map renders. */
export function getTopLevelCountries(): Country[] {
  return getAllRecords().filter((r) => !r.parent);
}

/** Regional profiles whose `parent` is `countryId`. */
export function getChildren(countryId: string): Country[] {
  return getAllRecords().filter((r) => r.parent === countryId);
}

export function getRecord(id: string): Country | null {
  const key = id.toLowerCase();
  return getAllRecords().find((r) => r.id === key) ?? null;
}

/**
 * The nav family for a record: the national profile first, then any regions,
 * in load order. A country with no regions returns just itself.
 */
export function getFamily(id: string): Country[] {
  const record = getRecord(id);
  if (!record) return [];
  const nationalId = record.parent ?? record.id;
  const national = getRecord(nationalId);
  if (!national) return [record];
  return [national, ...getChildren(nationalId)];
}
