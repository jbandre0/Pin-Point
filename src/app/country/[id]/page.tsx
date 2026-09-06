import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllCountries, getCountry } from "@/lib/countries";
import { enumerateFacts } from "@/lib/facts";

// Pre-render a route for every country that has a data file.
export function generateStaticParams() {
  return getAllCountries().map((c) => ({ id: c.id }));
}

export default function CountryPage({ params }: { params: { id: string } }) {
  const country = getCountry(params.id);
  if (!country) notFound();

  const facts = enumerateFacts(country);

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-6 py-10 text-slate-100">
      <Link
        href="/"
        className="text-sm text-cyan-300/80 hover:text-cyan-200"
      >
        ← World map
      </Link>

      <div className="mt-4 flex items-baseline gap-3">
        <h1 className="text-3xl font-semibold">
          {country.quick_id.flag_emoji} {country.name}
        </h1>
        <span className="text-sm uppercase tracking-widest text-slate-400">
          Tier {country.tier}
        </span>
        {country.status === "draft" && (
          <span
            className="text-amber-400"
            title="unverified — fact-check before trusting"
          >
            ● draft
          </span>
        )}
      </div>

      <p className="mt-6 rounded-lg border border-slate-700/60 bg-slate-900/40 p-4 text-sm text-slate-400">
        Full country detail page is Stage 2. This stub confirms routing and data
        loading work: <strong className="text-slate-200">{facts.length}</strong>{" "}
        quiz-able facts were enumerated from{" "}
        <code className="text-cyan-300">countries/{country.id}.json</code>.
      </p>

      <ul className="mt-6 space-y-1 font-mono text-xs text-slate-500">
        {facts.map((f) => (
          <li key={f.id}>
            {f.id}
            {f.isBlank && <span className="text-slate-700"> · (blank)</span>}
          </li>
        ))}
      </ul>
    </main>
  );
}
