"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import type { Country, FactCategory, FactStateOrNew } from "@/lib/types";
import { FACT_CATEGORIES } from "@/lib/types";
import { CATEGORY_LABEL, enumerateFacts, type Fact } from "@/lib/facts";
import {
  demoteFactState,
  setFactState,
  useFactStateMap,
} from "@/lib/factState";
import {
  buildSession,
  countryPoolSize,
  discriminatorPoolSize,
  factPool,
  isMasteredOnlyFilter,
  matchesCountry,
  type CategoryIsolatedQuestion,
  type DiscriminatorQuestion,
  type Question,
  type QuizFilter,
  type QuizMode,
  type ReverseRecallQuestion,
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
const PRIMARY_BTN =
  "rounded-lg bg-cyan-500/90 px-4 py-2 text-sm font-medium text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400";

type RecallGrade = "recalled" | "partial" | "missed";

interface Result {
  correct: boolean; // reverse-recall: true only for "recalled"
  userAnswer: string;
  demoted: boolean;
  grade?: RecallGrade;
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
    ready: true,
  },
  {
    id: "reverse-recall",
    name: "Reverse-recall",
    blurb: "See a country name, recall what you can, then self-grade.",
    ready: true,
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
  const countryCount = useMemo(
    () => countryPoolSize(countries, factState, filter),
    [countries, factState, filter],
  );
  const discCount = useMemo(
    () => discriminatorPoolSize(countries, factState, filter),
    [countries, factState, filter],
  );
  const isRecall = mode === "reverse-recall";
  const isDisc = mode === "discriminator";

  const [session, setSession] = useState<{
    questions: Question[];
    filter: QuizFilter;
    mode: QuizMode;
  } | null>(null);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<(Result | undefined)[]>([]);
  const [ended, setEnded] = useState(false);

  function start() {
    const cap = isRecall ? countryCount : isDisc ? discCount : pool.length;
    const length = lengthChoice === 0 ? cap : lengthChoice;
    const questions = buildSession(countries, factState, mode, filter, length);
    if (questions.length === 0) return;
    setSession({ questions, filter: { ...filter }, mode });
    setIdx(0);
    setResults([]);
    setEnded(false);
  }

  function recordResult(result: Result) {
    setResults((prev) => {
      const next = prev.slice();
      next[idx] = result;
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
    const available = isRecall ? countryCount : isDisc ? discCount : pool.length;
    const canStart = available > 0 && selStates.length > 0;
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
            {ALL_STATES.map((s) => (
              <Chip
                key={s}
                active={selStates.includes(s)}
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
            ))}
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
            className={PRIMARY_BTN}
          >
            Start quiz
          </button>
          <span className="font-mono text-xs text-slate-400">
            {isRecall
              ? `${countryCount} countr${countryCount === 1 ? "y" : "ies"} in pool`
              : isDisc
                ? `${discCount} round${discCount === 1 ? "" : "s"} in pool`
                : `${pool.length} fact${pool.length === 1 ? "" : "s"} in pool`}
          </span>
        </div>
        {!canStart && (
          <p className="mt-3 text-xs text-slate-500">
            {selStates.length === 0
              ? "Select at least one familiarity state."
              : isDisc
                ? "No country with a confusion set matches this filter yet."
                : "No facts match. Widen the filter, or mark some facts on a country page first."}
          </p>
        )}

        <div className="mt-8">
          <Link href="/" className="text-sm text-cyan-300/80 hover:text-cyan-200">
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
          <span className="text-slate-500"> / {answered}</span>{" "}
          {session.mode === "reverse-recall" ? "fully recalled" : "correct"}
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
                <span className={r.correct ? "text-emerald-400" : "text-rose-400"}>
                  {r.correct ? "✓" : "✗"}
                </span>
                {q.mode === "category-isolated" && (
                  <>
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
                  </>
                )}
                {q.mode === "reverse-recall" && (
                  <>
                    <span className="font-mono text-xs text-slate-500">
                      Reverse-recall
                    </span>
                    <span className="text-slate-200">{q.countryName}</span>
                    {r.grade && (
                      <span className="text-slate-500">— {r.grade}</span>
                    )}
                  </>
                )}
                {q.mode === "discriminator" && (
                  <>
                    <span className="font-mono text-xs text-slate-500">
                      Discriminator
                    </span>
                    <span className="text-slate-200">
                      {q.answer} vs {q.lookalike}
                    </span>
                    {!r.correct && (
                      <span className="text-slate-500">
                        (you: {r.userAnswer || "—"})
                      </span>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ol>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={start} className={PRIMARY_BTN}>
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
  const country = byId.get(q.countryId) ?? null;
  const total = session.questions.length;
  const isLast = idx + 1 >= total;

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

      {q.mode === "category-isolated" && (
        <CategoryIsolatedView
          key={idx}
          q={q}
          filter={session.filter}
          country={country}
          result={res}
          isLast={isLast}
          onResult={recordResult}
          onNext={next}
        />
      )}
      {q.mode === "reverse-recall" && (
        <ReverseRecallView
          key={idx}
          q={q}
          country={country}
          result={res}
          isLast={isLast}
          onResult={recordResult}
          onNext={next}
        />
      )}
      {q.mode === "discriminator" && (
        <DiscriminatorView
          key={idx}
          q={q}
          country={country}
          result={res}
          isLast={isLast}
          onResult={recordResult}
          onNext={next}
        />
      )}
    </Shell>
  );
}

// ---------------------------------------------------------------------------

function CategoryIsolatedView({
  q,
  filter,
  country,
  result,
  isLast,
  onResult,
  onNext,
}: {
  q: CategoryIsolatedQuestion;
  filter: QuizFilter;
  country: Country | null;
  result: Result | undefined;
  isLast: boolean;
  onResult: (r: Result) => void;
  onNext: () => void;
}) {
  const factState = useFactStateMap();
  const [text, setText] = useState("");
  const [freeText, setFreeText] = useState(false);
  const useChoices = q.options.length > 0 && !freeText;
  const liveState: FactStateOrNew =
    (factState[q.fact.id] as FactStateOrNew | undefined) ?? "new";

  function submit(answer: string) {
    if (result) return;
    const correct = country ? matchesCountry(answer, country) : false;
    let demoted = false;
    if (!correct && isMasteredOnlyFilter(filter)) {
      demoteFactState(q.fact.id);
      demoted = true;
    }
    onResult({ correct, userAnswer: answer.trim(), demoted });
  }

  return (
    <section className={`${CARD} mt-5`}>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
        {q.prompt}
      </p>
      <p className="mt-3 text-lg text-slate-100">{q.clue}</p>
      <p className="mt-4 text-sm text-slate-400">Which country?</p>

      {!result && useChoices && (
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

      {!result && !useChoices && (
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
          <button type="submit" className={PRIMARY_BTN}>
            Submit
          </button>
        </form>
      )}

      {!result && q.options.length > 0 && (
        <button
          type="button"
          onClick={() => setFreeText((v) => !v)}
          className="mt-3 text-xs text-slate-500 hover:text-slate-300"
        >
          {freeText ? "Choose from a list instead" : "Type answer instead"}
        </button>
      )}

      {result && (
        <div className="mt-4 border-t border-slate-800 pt-4">
          <p
            className={`text-sm font-medium ${
              result.correct ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {result.correct ? "Correct" : "Not quite"} — it&rsquo;s{" "}
            {country?.quick_id.flag_emoji} {q.answer}.
            {!result.correct && result.userAnswer && (
              <span className="font-normal text-slate-500">
                {" "}
                You said &ldquo;{result.userAnswer}&rdquo;.
              </span>
            )}
          </p>

          {result.demoted && (
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

          <button type="button" onClick={onNext} className={`${PRIMARY_BTN} mt-5`}>
            {isLast ? "See results" : "Next question"}
          </button>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------

function ReverseRecallView({
  q,
  country,
  result,
  isLast,
  onResult,
  onNext,
}: {
  q: ReverseRecallQuestion;
  country: Country | null;
  result: Result | undefined;
  isLast: boolean;
  onResult: (r: Result) => void;
  onNext: () => void;
}) {
  const [text, setText] = useState("");
  const [revealed, setRevealed] = useState(false);

  const grouped = useMemo(() => {
    if (!country) return [] as [FactCategory, Fact[]][];
    const facts = enumerateFacts(country).filter((f) => !f.isBlank);
    return FACT_CATEGORIES.map(
      (c) => [c, facts.filter((f) => f.category === c)] as [FactCategory, Fact[]],
    ).filter(([, fs]) => fs.length > 0);
  }, [country]);

  function grade(g: RecallGrade) {
    if (result) return;
    onResult({
      correct: g === "recalled",
      userAnswer: text.trim(),
      demoted: false,
      grade: g,
    });
  }

  const show = revealed || Boolean(result);

  return (
    <section className={`${CARD} mt-5`}>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
        Recall this country
      </p>
      <p className="mt-3 text-2xl font-semibold text-slate-50">
        {country?.quick_id.flag_emoji} {q.countryName}
      </p>
      {country && (
        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
          Tier {country.tier} · {country.continent}
        </p>
      )}

      {!show && (
        <>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Type what you remember — script, bollards, roofs, plates, terrain…"
            className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/60"
          />
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className={`${PRIMARY_BTN} mt-3`}
          >
            Reveal card
          </button>
        </>
      )}

      {show && (
        <div className="mt-4 border-t border-slate-800 pt-4">
          {text && (
            <p className="mb-4 whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs text-slate-400">
              <span className="text-slate-600">You wrote — </span>
              {text}
            </p>
          )}

          {country && (
            <p className="text-sm text-slate-400">
              Drives on the{" "}
              <span className="text-slate-200">
                {country.quick_id.driving_side}
              </span>
              {" · "}Capital{" "}
              <span className="text-slate-200">{country.quick_id.capital}</span>
            </p>
          )}

          <div className="mt-3 space-y-3">
            {grouped.map(([cat, facts]) => (
              <div key={cat}>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-300/60">
                  {CATEGORY_LABEL[cat]}
                </p>
                <dl className="mt-1 space-y-1">
                  {facts.map((f) => (
                    <div key={f.id} className="text-sm">
                      <dt className="inline text-slate-500">{f.label}: </dt>
                      <dd className="inline text-slate-200">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>

          {country && country.confusion_set.length > 0 && (
            <div className="mt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-300/60">
                Confusion set
              </p>
              <ul className="mt-1 space-y-1 text-sm text-slate-300">
                {country.confusion_set.map((c, i) => (
                  <li key={`${c.country}-${i}`}>
                    <span className="text-slate-500">{c.country} — </span>
                    {c.tiebreaker}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!result ? (
            <div className="mt-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">
                How did you do?
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Chip active={false} onClick={() => grade("recalled")}>
                  Recalled it
                </Chip>
                <Chip active={false} onClick={() => grade("partial")}>
                  Partial
                </Chip>
                <Chip active={false} onClick={() => grade("missed")}>
                  Missed
                </Chip>
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <p className="text-sm text-slate-400">
                Marked{" "}
                <span
                  className={
                    result.correct ? "text-emerald-400" : "text-slate-200"
                  }
                >
                  {result.grade}
                </span>
                .
              </p>
              <button
                type="button"
                onClick={onNext}
                className={`${PRIMARY_BTN} mt-3`}
              >
                {isLast ? "See results" : "Next country"}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------

function DiscriminatorView({
  q,
  country,
  result,
  isLast,
  onResult,
  onNext,
}: {
  q: DiscriminatorQuestion;
  country: Country | null;
  result: Result | undefined;
  isLast: boolean;
  onResult: (r: Result) => void;
  onNext: () => void;
}) {
  function submit(answer: string) {
    if (result) return;
    onResult({ correct: answer === q.answer, userAnswer: answer, demoted: false });
  }

  return (
    <section className={`${CARD} mt-5`}>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
        Discriminator
      </p>
      <p className="mt-3 text-xs text-slate-500">This tiebreaker clue:</p>
      <p className="mt-1 text-lg text-slate-100">{q.tiebreaker}</p>
      <p className="mt-3 text-sm text-slate-400">
        <span className="text-slate-500">They get confused because — </span>
        {q.sharedTraits}
      </p>
      <p className="mt-4 text-sm text-slate-400">
        Which country does the clue point you to?
      </p>

      {!result ? (
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
      ) : (
        <div className="mt-4 border-t border-slate-800 pt-4">
          <p
            className={`text-sm font-medium ${
              result.correct ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {result.correct ? "Correct" : "Not quite"} — it&rsquo;s{" "}
            {country?.quick_id.flag_emoji} {q.answer}, told apart here from{" "}
            {q.lookalike}.
            {!result.correct && (
              <span className="font-normal text-slate-500">
                {" "}
                You said &ldquo;{result.userAnswer}&rdquo;.
              </span>
            )}
          </p>
          <button type="button" onClick={onNext} className={`${PRIMARY_BTN} mt-4`}>
            {isLast ? "See results" : "Next question"}
          </button>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------

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

function FilterRecap({ mode, filter }: { mode: QuizMode; filter: QuizFilter }) {
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
