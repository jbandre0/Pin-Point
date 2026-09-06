"use client";

import { useMemo } from "react";
import { useFactStateMap } from "@/lib/factState";
import { overallSimulatedMiles } from "@/lib/simulatedDistance";

export interface CountryFacts {
  id: string;
  name: string;
  factIds: string[];
}

interface StatWidgetsProps {
  perCountry: CountryFacts[];
}

function Widget({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-auto w-40 rounded-lg border border-cyan-400/20 bg-slate-950/70 px-3 py-2.5 shadow-lg shadow-black/40 backdrop-blur ${className ?? ""}`}
    >
      <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-cyan-300/70">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-2xl leading-tight text-cyan-50 tabular-nums">
        {value}
      </div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

export default function StatWidgets({ perCountry }: StatWidgetsProps) {
  const states = useFactStateMap();

  const { reviewed, toLearn, miles, totalFacts } = useMemo(() => {
    let reviewedCount = 0;
    let toLearnCount = 0;
    let total = 0;
    for (const c of perCountry) {
      total += c.factIds.length;
      let touched = false;
      for (const id of c.factIds) {
        const s = states[id];
        if (s === "familiar" || s === "mastered") touched = true;
        if (s !== "mastered") toLearnCount += 1;
      }
      if (touched) reviewedCount += 1;
    }
    return {
      reviewed: reviewedCount,
      toLearn: toLearnCount,
      totalFacts: total,
      miles: overallSimulatedMiles(
        perCountry.map((c) => c.factIds),
        states,
      ),
    };
  }, [perCountry, states]);

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {/* North Pacific — clear of land */}
      <Widget
        className="absolute left-[3%] top-[24%]"
        label="Countries reviewed"
        value={`${reviewed}`}
        sub={`of ${perCountry.length} available`}
      />
      {/* South Pacific */}
      <Widget
        className="absolute left-[13%] bottom-[8%]"
        label="Facts to learn"
        value={toLearn.toLocaleString()}
        sub={`of ${totalFacts.toLocaleString()} total`}
      />
      {/* South Atlantic */}
      <Widget
        className="absolute right-[6%] bottom-[12%]"
        label="Avg simulated miss"
        value={miles.toLocaleString()}
        sub="miles"
      />
    </div>
  );
}
