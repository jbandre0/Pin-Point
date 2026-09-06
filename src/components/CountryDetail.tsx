"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import type { Country, FactCategory } from "@/lib/types";
import { FACT_CATEGORIES } from "@/lib/types";
import { enumerateFacts, type Fact } from "@/lib/facts";
import { effectiveCountry } from "@/lib/countryView";
import { cycleFactState, useFactStateMap } from "@/lib/factState";
import { countrySimulatedMiles } from "@/lib/simulatedDistance";
import FamiliarityToggle from "./FamiliarityToggle";

const CATEGORY_LABEL: Record<FactCategory, string> = {
  language: "Language",
  road_furniture: "Road furniture",
  architecture: "Architecture",
  nature: "Nature",
  vehicles: "Vehicles",
  google_coverage: "Google coverage",
};

const CARD =
  "rounded-xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6";
const CARD_HEADING =
  "font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/70";

export default function CountryDetail({ country }: { country: Country }) {
  const factState = useFactStateMap();
  const [regionId, setRegionId] = useState<string | null>(null);

  const view = useMemo(
    () => effectiveCountry(country, regionId),
    [country, regionId],
  );

  const factsByCategory = useMemo(() => {
    const groups = {} as Record<FactCategory, Fact[]>;
    for (const cat of FACT_CATEGORIES) groups[cat] = [];
    for (const f of enumerateFacts(view)) groups[f.category].push(f);
    return groups;
  }, [view]);

  const { learnable, mastered, miles } = useMemo(() => {
    const learnableFacts = FACT_CATEGORIES.flatMap((c) =>
      factsByCategory[c].filter((f) => !f.isBlank),
    );
    return {
      learnable: learnableFacts.length,
      mastered: learnableFacts.filter((f) => factState[f.id] === "mastered")
        .length,
      miles: countrySimulatedMiles(
        learnableFacts.map((f) => f.id),
        factState,
      ),
    };
  }, [factsByCategory, factState]);

  const isDraft = country.status === "draft";

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
      <Link
        href="/"
        className="text-sm text-cyan-300/80 transition-colors hover:text-cyan-200"
      >
        ← World map
      </Link>

      {/* ---- header ---- */}
      <header className="mt-5 border-b border-slate-800 pb-6">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-3xl font-semibold text-slate-50">
            <span className="mr-2">{country.quick_id.flag_emoji}</span>
            {country.name}
          </h1>
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
            Tier {country.tier}
          </span>
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
            {country.continent}
          </span>
          {isDraft ? (
            <span
              className="inline-flex items-center gap-1.5 text-xs text-amber-400"
              title="unverified — fact-check before trusting"
            >
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              draft
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              reviewed
            </span>
          )}
        </div>

        <p className="mt-2 text-sm text-slate-400">
          Drives on the{" "}
          <span className="text-slate-200">{country.quick_id.driving_side}</span>
          {" · "}
          Capital{" "}
          <span className="text-slate-200">{country.quick_id.capital}</span>
        </p>

        <p className="mt-3 font-mono text-xs text-slate-400">
          <span className="text-cyan-200">{mastered}</span>
          <span className="text-slate-500"> / {learnable}</span> facts mastered
          <span className="mx-2 text-slate-700">·</span>~
          <span className="text-cyan-200">{miles.toLocaleString()}</span> mi
          simulated miss
        </p>
      </header>

      {/* ---- regional variant tabs (untested — no data has variants yet) ---- */}
      {country.regional_variants.length > 0 && (
        <nav className="mt-6 flex flex-wrap gap-2">
          <TabButton
            active={regionId === null}
            onClick={() => setRegionId(null)}
          >
            National
          </TabButton>
          {country.regional_variants.map((v) => (
            <TabButton
              key={v.region_id}
              active={regionId === v.region_id}
              onClick={() => setRegionId(v.region_id)}
            >
              {v.region_name}
            </TabButton>
          ))}
        </nav>
      )}

      {/* ---- fact sections, fixed order ---- */}
      <div className="mt-6 space-y-4">
        {FACT_CATEGORIES.map((cat) => (
          <section key={cat} className={CARD}>
            <h2 className={CARD_HEADING}>{CATEGORY_LABEL[cat]}</h2>
            <dl className="mt-3 divide-y divide-slate-800/70">
              {factsByCategory[cat].map((fact) => (
                <FactRow
                  key={fact.id}
                  fact={fact}
                  state={factState[fact.id] ?? "new"}
                  onCycle={() => cycleFactState(fact.id)}
                />
              ))}
            </dl>
          </section>
        ))}

        {/* ---- confusion set ---- */}
        {view.confusion_set.length > 0 && (
          <section className={CARD}>
            <h2 className={CARD_HEADING}>Confusion set</h2>
            <ul className="mt-3 space-y-4">
              {view.confusion_set.map((c, i) => (
                <li
                  key={`${c.country}-${i}`}
                  className="border-l-2 border-slate-700 pl-3"
                >
                  <p className="text-sm font-medium text-slate-100">
                    {c.country}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    <span className="text-slate-500">Shared — </span>
                    {c.shared_traits}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    <span className="text-slate-500">Tiebreaker — </span>
                    {c.tiebreaker}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ---- sources ---- */}
        {country.sources.length > 0 && (
          <section className={CARD}>
            <h2 className={CARD_HEADING}>Sources</h2>
            <ol className="mt-3 space-y-1.5">
              {country.sources.map((url) => (
                <li key={url} className="text-sm">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-cyan-300/80 underline-offset-2 hover:text-cyan-200 hover:underline"
                  >
                    {url}
                  </a>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-slate-500">
              {isDraft
                ? "Draft — verify each field against these before trusting it."
                : "Reviewed against these sources."}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

function TabButton({
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

function FactRow({
  fact,
  state,
  onCycle,
}: {
  fact: Fact;
  state: "new" | "familiar" | "mastered";
  onCycle: () => void;
}) {
  const isSampleText =
    fact.category === "language" && fact.field === "sample_text";

  const tint =
    state === "mastered"
      ? "bg-amber-400/[0.04]"
      : state === "familiar"
        ? "bg-cyan-400/[0.04]"
        : "";

  return (
    <div className={`flex gap-3 py-3 ${tint}`}>
      <div className="pt-0.5">
        {fact.isBlank ? (
          <span
            className="inline-flex h-6 w-6 items-center justify-center"
            title="not documented — nothing to learn yet"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-slate-700" />
          </span>
        ) : (
          <FamiliarityToggle state={state} onCycle={onCycle} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
          {fact.label}
        </dt>
        <dd className="mt-1">
          {fact.isBlank ? (
            <span className="text-sm italic text-slate-600">not documented</span>
          ) : isSampleText ? (
            <span className="inline-block rounded border border-slate-700 bg-slate-950/60 px-2 py-1 font-mono text-sm text-slate-200">
              {fact.value}
            </span>
          ) : (
            <span className="text-sm text-slate-200">{fact.value}</span>
          )}
        </dd>
      </div>
    </div>
  );
}
