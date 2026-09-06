// "Simulated miss distance" — a motivational visualisation, NOT a real distance.
//
// Per country: weight each fact-id (new = 0, familiar = 0.5, mastered = 1),
// average across the country's facts, then map that average onto a decay curve
// from ~5000 miles (all new) down toward ~0 (all mastered). Curve shape is a
// pure tuning choice — normalised exponential decay so early progress produces
// a visibly big drop, which feels good, then it eases toward zero.

import type { FactStateMap } from "./types";

export const MAX_MILES = 5000;
const DECAY_K = 2.5;

const E_NEG_K = Math.exp(-DECAY_K);

/** avg in [0,1] -> miles in [0, MAX_MILES], f(0)=MAX_MILES, f(1)=0. */
export function milesForAverage(avg: number): number {
  const a = Math.min(1, Math.max(0, avg));
  const decayed = (Math.exp(-DECAY_K * a) - E_NEG_K) / (1 - E_NEG_K);
  return Math.round(MAX_MILES * decayed);
}

export function countryAverageWeight(
  factIds: string[],
  states: FactStateMap,
): number {
  if (factIds.length === 0) return 0;
  let sum = 0;
  for (const id of factIds) {
    const s = states[id];
    sum += s === "mastered" ? 1 : s === "familiar" ? 0.5 : 0;
  }
  return sum / factIds.length;
}

export function countrySimulatedMiles(
  factIds: string[],
  states: FactStateMap,
): number {
  return milesForAverage(countryAverageWeight(factIds, states));
}

/** Mean simulated miles across every country that has a data file. */
export function overallSimulatedMiles(
  perCountryFactIds: string[][],
  states: FactStateMap,
): number {
  if (perCountryFactIds.length === 0) return MAX_MILES;
  const total = perCountryFactIds.reduce(
    (acc, ids) => acc + countrySimulatedMiles(ids, states),
    0,
  );
  return Math.round(total / perCountryFactIds.length);
}
