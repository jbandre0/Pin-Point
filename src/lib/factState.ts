"use client";

// Manual familiarity state — client-only, localStorage-backed.
//
// Three states per fact-id: "new" (default, never stored) -> "familiar" -> "mastered".
// Set entirely by the user, never automatically (no SRS, no dates). Stored as a flat
// map so a Phase 2 sync to a per-user DB row is a straight copy, not a remodel.

import { useCallback, useEffect, useState } from "react";
import type { FactState, FactStateMap, FactStateOrNew } from "./types";

const STORAGE_KEY = "pinpoint:factState";
const EMPTY: FactStateMap = Object.freeze({}) as FactStateMap;

function read(): FactStateMap {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return EMPTY;
    return parsed as FactStateMap;
  } catch {
    return EMPTY;
  }
}

function write(map: FactStateMap): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // storage disabled / full — progress just won't persist this session
  }
}

// Module-level source of truth on the client. Server renders always see EMPTY.
let current: FactStateMap = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  current = read();
  loaded = true;
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      current = read();
      listeners.forEach((l) => l());
    }
  });
}

// --- reads / mutations ---------------------------------------------------

export function getFactStateMap(): FactStateMap {
  ensureLoaded();
  return current;
}

export function getFactState(id: string): FactStateOrNew {
  return getFactStateMap()[id] ?? "new";
}

export function setFactState(id: string, state: FactStateOrNew): void {
  ensureLoaded();
  const next: FactStateMap = { ...current };
  if (state === "new") delete next[id];
  else next[id] = state;
  current = next;
  write(next);
  listeners.forEach((l) => l());
}

const ORDER: FactStateOrNew[] = ["new", "familiar", "mastered"];

/** Cycle new -> familiar -> mastered -> new. */
export function cycleFactState(id: string): FactStateOrNew {
  const next = ORDER[(ORDER.indexOf(getFactState(id)) + 1) % ORDER.length];
  setFactState(id, next);
  return next;
}

/** Drop one level (mastered -> familiar -> new). Used by the quiz demotion rule. */
export function demoteFactState(id: string): FactStateOrNew {
  const idx = Math.max(0, ORDER.indexOf(getFactState(id)) - 1);
  setFactState(id, ORDER[idx]);
  return ORDER[idx];
}

// --- hooks -------------------------------------------------------------

/**
 * The whole fact-state map. Server + first client render return EMPTY; a single
 * post-hydration effect swaps in the stored value and subscribes to changes.
 */
export function useFactStateMap(): FactStateMap {
  const [map, setMap] = useState<FactStateMap>(EMPTY);
  useEffect(() => {
    ensureLoaded();
    setMap(current);
    const onChange = () => setMap(current);
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);
  return map;
}

/** One fact's state plus a cycle handler. */
export function useFactState(id: string): [FactStateOrNew, () => void] {
  const map = useFactStateMap();
  const value = map[id] ?? "new";
  const cycle = useCallback(() => cycleFactState(id), [id]);
  return [value, cycle];
}

export function weightForState(state: FactStateOrNew): number {
  return state === "mastered" ? 1 : state === "familiar" ? 0.5 : 0;
}

export type { FactState, FactStateMap };
