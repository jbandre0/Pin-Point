import WorldMap from "@/components/WorldMap";
import StatWidgets from "@/components/StatWidgets";
import { getAllCountries } from "@/lib/countries";
import { learnableFactIds } from "@/lib/facts";

export default function HomePage() {
  const countries = getAllCountries();

  const mapMeta = countries.map((c) => ({
    id: c.id,
    name: c.name,
    tier: c.tier,
    status: c.status,
  }));

  const perCountry = countries.map((c) => ({
    id: c.id,
    name: c.name,
    factIds: learnableFactIds(c),
  }));

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-[#0a111e] text-slate-100">
      <WorldMap countries={mapMeta} />
      <StatWidgets perCountry={perCountry} />

      <header className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 text-center">
        <h1 className="font-mono text-sm font-semibold uppercase tracking-[0.4em] text-cyan-200/80">
          Pin&nbsp;Point
        </h1>
      </header>

      <footer className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] text-slate-500">
        {countries.length} of ~250 countries loaded · brighter = higher-value meta
      </footer>
    </main>
  );
}
