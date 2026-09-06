"use client";

import type { FactStateOrNew } from "@/lib/types";

const NEXT_ACTION: Record<FactStateOrNew, string> = {
  new: "Mark familiar",
  familiar: "Mark mastered",
  mastered: "Reset to new",
};

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        d="M3.5 8.5l3 3 6-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        d="M8 1.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.9 4.2 13.9l.7-4.3L1.8 6l4.3-.6z"
        fill="currentColor"
      />
    </svg>
  );
}

interface Props {
  state: FactStateOrNew;
  onCycle: () => void;
}

/** One fact's familiarity control. Click cycles new -> familiar -> mastered -> new. */
export default function FamiliarityToggle({ state, onCycle }: Props) {
  const base =
    "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors";
  const look =
    state === "mastered"
      ? "border-amber-400/60 bg-amber-400/15 text-amber-300 hover:bg-amber-400/25"
      : state === "familiar"
        ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-200 hover:bg-cyan-400/25"
        : "border-slate-600 text-transparent hover:border-slate-400 hover:bg-slate-700/40";

  return (
    <button
      type="button"
      onClick={onCycle}
      aria-label={NEXT_ACTION[state]}
      title={`${state} — ${NEXT_ACTION[state].toLowerCase()}`}
      className={`${base} ${look}`}
    >
      {state === "mastered" ? (
        <StarIcon />
      ) : state === "familiar" ? (
        <CheckIcon />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
      )}
    </button>
  );
}
