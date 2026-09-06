"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Country, FactCategory, FactStateOrNew } from "@/lib/types";
import { FACT_CATEGORIES } from "@/lib/types";
import { CATEGORY_LABEL } from "@/lib/facts";
import {
  demoteFactState,
  setFactState,
  useFactStateMap,
} from "@/lib/factState";
import {
  buildSession,
  factPool,
  isMasteredOnlyFilter,
  matchesCountry,
  type Question,
  type QuizFilter,
  type QuizMode,
} from "@/lib/quiz";

const ALL_STATES: FactStateOrNew[] = ["new", "familiar", "mastered"];
const STATE_LABEL: Record<FactStateOrNew, string> = {
  new: "New",
  familiar: "Familiar",
  mastered: "Mastered",
};
const LENGTH_CHOICES = [10, 20, 0] as const; // 0 = All

const CARD = "rounded-xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6";
const HEADING =
  "font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/70";

interface Result {
  correct: boolean;
  userAnswer: string;
  demoted: boolean;
}

const MODES: { id: QuizMode; name: string; blurb: string; ready: boolean }[] = [
  {
    id: "category-isolated",
    name: "Category-isolated",
    blurb: "See one field's value with the country blanked. Name the country.",
    ready: true,
  },
  {
    id: "discriminator",
    name: "Discriminator",
    blurb: "Given a tiebreaker clue, pick which lookalike country it confirms.",
    ready: false,
  },
  {
    id: "reverse-recall",
    name: "Reverse-recall",
    blurb: "See a country name, recall what you can, then self-grade.",
    ready: false,
  },
];

export default function Quiz({ countries }: { countries: Country[] }) {
  const factState = useFactStateMap();
  const byId = useMemo(
    () => new Map(countries.map((c) => [c.id, c] as const)),
    [countries],
  );

  const [mode, setMode] = useState<QuizMode>("category-isolated");
  const [category, setCategory] = useState<FactCategory | "any">("any");
  const [selStates, setSelStates] = useState<FactStateOrNew[]>([...ALL_STATES]);
  const [lengthChoice, setLengthChoice] = useState<number>(10);

  const filter: QuizFilter = useMemo(
    () => ({ category, states: selStates }),
    [category, selStates],
  );
  const pool = useMemo(
    () => factPool(countries, factState, filter),
    [countries, factState, filter],
  );

  const [session, setSession] = useState<{
    questions: Question[];
    filter: QuizFilter;
    mode: QuizMode;
  } | null>(null);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<(Result | undefined)[]>([]);
  const [ended, setEnded] = useState(false);

  const [text, setText] = useState("");
  const [freeText, setFreeText] = useState(false);
  useEffect(() => {
    setText("");
    setFreeText(false);
  }, [idx, session]);

  function start() {
    const length = lengthChoice === 0 ? pool.length : lengthChoice;
    const questions = buildSession(countries, factState, mode, filter, length);
    if (questions.length === 0) return;
    setSession({ questions, filter: { ...filter }, mode });
    setIdx(0);
    setResults([]);
    setEnded(false);
  }

  function submit(answer: string) {
    if (!session || results[idx]) return;
    const q = session.questions[idx];
    const country = byId.get(q.countryId);
    const correct = country ? matchesCountry(answer, country) : false;
    let demoted = false;
    if (!correct && isMasteredOnlyFilter(session.filter)) {
      demoteFactState(q.fact.id);
      demoted = true;
    }
    setResults((prev) => {
      const next = prev.slice();
      next[idx] = { correct, userAnswer: answer.trim(), demoted };
      return next;
    });
  }

  function next() {
    if (!session) return;
    if (idx + 1 >= session.questions.length) setEnded(true);
    else setIdx(idx + 1);
  }

  // ---- setup ----
  if (!session) {
    const canStart = pool.length > 0 && selStates.length > 0;
    return (
      <Shell>
        <h1 className="text-3xl font-semibold text-slate-50">Quiz</h1>
        <p className="mt-2 text-sm text-slate-400">
          Pick a mode and a slice of your facts to drill.
        </p>

        <section className={`${CARD} mt-6`}>
          <h2 className={HEADING}>Mode</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={!m.ready}
                onClick={() => setMode(m.id)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  mode === m.id && m.ready
                    ? "border-cyan-400/60 bg-cyan-400/10"
                    : "border-slate-700 hover:border-slate-500"
                } ${!m.ready ? "cursor-not-allowed opacity-40" : ""}`}
              >
                <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
                  {m.name}
                  {!m.ready && (
                    <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
                      soon
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400">{m.blurb}</p>
              </button>
            ))}
          </div>
        </section>

        <section className={`${CARD} mt-4`}>
          <h2 className={HEADING}>Category</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip active={category === "any"} onClick={() => setCategory("any")}>
              Any
            </Chip>
            {FACT_CATEGORIES.map((c) => (
              <Chip
                key={c}
                active={category === c}
                onClick={() => setCategory(c)}
              >
                {CATEGORY_LABEL[c]}
              </Chip>
            ))}
          </div>

          <h2 className={`${HEADING} mt-5`}>Familiarity</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {ALL_STATES.map((s) => {
              const on = selStates.includes(s);
              return (
                <Chip
                  key={s}
                  active={on}
                  onClick={() =>
                    setSelStates((prev) =>
                      prev.includes(s)
                        ? prev.filter((x) => x !== s)
                        : [...prev, s],
                    )
                  }
                >
                  {STATE_LABEL[s]}
                </Chip>
              );
            })}
          </div>

          <h2 className={`${HEADING} mt-5`}>Length</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {LENGTH_CHOICES.map((n) => (
              <Chip
                key={n}
                active={lengthChoice === n}
                onClick={() => setLengthChoice(n)}
              >
                {n === 0 ? "All" : n}
              </Chip>
            ))}
          </div>
        </section>

        <div className="mt-5 flex items-center gap-4">
          <button
            type="button"
            onClick={start}
            disabled={!canStart}
            className="rounded-lg bg-cyan-500/90 px-4 py-2 text-sm font-medium text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            Start quiz
          </button>
          <span className="font-mono text-xs text-slate-400">
            {pool.length} fact{pool.length === 1 ? "" : "s"} in pool
          </span>
        </div>
        {!canStart && (
          <p className="mt-3 text-xs text-slate-500">
            {selStates.length === 0
              ? "Select at least one familiarity state."
              : "No facts match. Widen the filter, or mark some facts on a country page first."}
          </p>
        )}

        <div className="mt-8">
          <Link
            href="/"
            className="text-sm text-cyan-300/80 hover:text-cyan-200"
          >
            ← World map
          </Link>
        </div>
      </Shell>
    );
  }

  const answered = results.filter(Boolean).length;

  // ---- summary ----
  if (ended) {
    const score = results.filter((r) => r?.correct).length;
    return (
      <Shell>
        <h1 className="text-3xl font-semibold text-slate-50">Results</h1>
        <p className="mt-2 font-mono text-sm text-slate-300">
          <span className="text-cyan-200">{score}</span>
          <span className="text-slate-500"> / {answered}</span> correct
        </p>
        <FilterRecap mode={session.mode} filter={session.filter} />

        <ol className="mt-6 space-y-2">
          {session.questions.map((q, i) => {
            const r = results[i];
            if (!r) return null;
            return (
              <li
                key={i}
                className={`${CARD} flex flex-wrap items-baseline gap-x-2 gap-y-1 py-3 text-sm`}
              >
                <span
                  className={r.correct ? "text-emerald-400" : "text-rose-400"}
                >
                  {r.correct ? "✓" : "✗"}
                </span>
                <span className="font-mono text-xs text-slate-500">
                  {q.prompt}
                </span>
                <span className="text-slate-200">→ {q.answer}</span>
                {!r.correct && (
                  <span className="text-slate-500">
                    (you: {r.userAnswer || "—"})
                  </span>
                )}
                {r.demoted && (
                  <span className="text-amber-400">↓ demoted</span>
                )}
              </li>
            );
          })}
        </ol>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={start}
            className="rounded-lg bg-cyan-500/90 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400"
          >
            Retry same filter
          </button>
          <button
            type="button"
            onClick={() => setSession(null)}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
          >
            New quiz
          </button>
          <Link
            href="/"
            className="self-center text-sm text-cyan-300/80 hover:text-cyan-200"
          >
            ← World map
          </Link>
        </div>
      </Shell>
    );
  }

  // ---- question ----
  const q = session.questions[idx];
  const res = results[idx];
  const country = byId.get(q.countryId);
  const total = session.questions.length;
  const liveState: FactStateOrNew =
    (factState[q.fact.id] as FactStateOrNew | undefined) ?? "new";
  const useChoices = q.options.length > 0 && !freeText;

  return (
    <Shell>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="font-mono">
          Question {idx + 1} / {total}
        </span>
        <button
          type="button"
          onClick={() => setEnded(true)}
          className="text-slate-500 hover:text-slate-300"
        >
          End quiz
        </button>
      </div>
      <div className="mt-2 h-1 w-full rounded bg-slate-800">
        <div
          className="h-1 rounded bg-cyan-400/70 transition-all"
          style={{ width: `${((idx + (res ? 1 : 0)) / total) * 100}%` }}
        />
      </div>
      <FilterRecap mode={session.mode} filter={session.filter} />

      <section className={`${CARD} mt-5`}>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
          {q.prompt}
        </p>
        <p className="mt-3 text-lg text-slate-100">{q.clue}</p>
        <p className="mt-4 text-sm text-slate-400">Which country?</p>

        {!res && useChoices && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {q.options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => submit(opt)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-left text-sm text-slate-100 transition-colors hover:border-cyan-400/60 hover:bg-cyan-400/10"
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {!res && !useChoices && (
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit(text);
            }}
          >
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type the country…"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/60"
            />
            <button
              type="submit"
              className="rounded-lg bg-cyan-500/90 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400"
            >
              Submit
            </button>
          </form>
        )}

        {!res && q.options.length > 0 && (
          <button
            type="button"
            onClick={() => setFreeText((v) => !v)}
            className="mt-3 text-xs text-slate-500 hover:text-slate-300"
          >
            {freeText ? "Choose from a list instead" : "Type answer instead"}
          </button>
        )}

        {res && (
          <div className="mt-4 border-t border-slate-800 pt-4">
            <p
              className={`text-sm font-medium ${
                res.correct ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {res.correct ? "Correct" : "Not quite"} — it&rsquo;s{" "}
              {country?.quick_id.flag_emoji} {q.answer}.
              {!res.correct && res.userAnswer && (
                <span className="font-normal text-slate-500">
                  {" "}
                  You said &ldquo;{res.userAnswer}&rdquo;.
                </span>
              )}
            </p>

            {res.demoted && (
              <p className="mt-2 text-xs text-amber-400">
                This fact was Mastered — dropped to Familiar.
              </p>
            )}

            <div className="mt-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">
                Update this fact
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Chip
                  active={liveState === "familiar"}
                  onClick={() => setFactState(q.fact.id, "familiar")}
                >
                  Mark familiar
                </Chip>
                <Chip
                  active={liveState === "mastered"}
                  onClick={() => setFactState(q.fact.id, "mastered")}
                >
                  Mark mastered
                </Chip>
                <Chip
                  active={liveState === "new"}
                  onClick={() => setFactState(q.fact.id, "new")}
                >
                  Reset to new
                </Chip>
              </div>
            </div>

            <button
              type="button"
              onClick={next}
              className="mt-5 rounded-lg bg-cyan-500/90 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400"
            >
              {idx + 1 >= total ? "See results" : "Next question"}
            </button>
          </div>
        )}
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 sm:py-14">{children}</main>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-100"
          : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function FilterRecap({
  mode,
  filter,
}: {
  mode: QuizMode;
  filter: QuizFilter;
}) {
  const parts = [
    mode.replace("-", " "),
    filter.category === "any" ? "any category" : CATEGORY_LABEL[filter.category],
    filter.states.map((s) => STATE_LABEL[s]).join(" / "),
  ];
  return (
    <p className="mt-3 font-mono text-[11px] text-slate-500">
      {parts.join("  ·  ")}
    </p>
  );
}
