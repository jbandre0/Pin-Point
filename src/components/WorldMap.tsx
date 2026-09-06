"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { geoIdToAlpha2, WORLD_TOPOJSON_URL } from "@/lib/geo";

interface CountryMeta {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  status: "draft" | "reviewed";
}

interface WorldMapProps {
  countries: CountryMeta[];
}

// Tier drives brightness — tier 1 pulls the eye first.
const TIER_FILL: Record<1 | 2 | 3, string> = {
  1: "#67e8f9",
  2: "#3f7fd6",
  3: "#2b4a8a",
};

const NO_DATA_FILL = "#141c2b";
const NO_DATA_STROKE = "#26314a";
const OCEAN = "#0a111e";

export default function WorldMap({ countries }: WorldMapProps) {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);

  const byId = useMemo(() => {
    const m = new Map<string, CountryMeta>();
    for (const c of countries) m.set(c.id, c);
    return m;
  }, [countries]);

  return (
    <div className="absolute inset-0" style={{ background: OCEAN }}>
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 175 }}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup zoom={1} minZoom={1} maxZoom={6} center={[12, 12]}>
          <Geographies geography={WORLD_TOPOJSON_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const alpha2 = geoIdToAlpha2(geo.id as string);
                const meta = alpha2 ? byId.get(alpha2) : undefined;
                const hasData = Boolean(meta);
                const isHover = hasData && hovered === alpha2;
                const fill = meta
                  ? TIER_FILL[meta.tier]
                  : NO_DATA_FILL;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    tabIndex={hasData ? 0 : -1}
                    role={hasData ? "button" : undefined}
                    aria-label={
                      hasData
                        ? `${meta!.name} — open study page`
                        : `${(geo.properties as { name?: string }).name ?? "Region"} — not yet available`
                    }
                    onMouseEnter={() => hasData && setHovered(alpha2)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => hasData && router.push(`/country/${alpha2}`)}
                    onKeyDown={(e) => {
                      if (hasData && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        router.push(`/country/${alpha2}`);
                      }
                    }}
                    style={{
                      default: {
                        fill: isHover ? "#a5f3fc" : fill,
                        stroke: hasData ? "#0a111e" : NO_DATA_STROKE,
                        strokeWidth: hasData ? 0.5 : 0.35,
                        outline: "none",
                        cursor: hasData ? "pointer" : "default",
                        transition: "fill 120ms ease",
                      },
                      hover: {
                        fill: hasData ? "#a5f3fc" : NO_DATA_FILL,
                        stroke: hasData ? "#e0fbff" : NO_DATA_STROKE,
                        strokeWidth: hasData ? 0.75 : 0.35,
                        outline: "none",
                        cursor: hasData ? "pointer" : "default",
                      },
                      pressed: {
                        fill: "#22d3ee",
                        outline: "none",
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {hovered && byId.has(hovered) && (
        <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-full border border-cyan-400/30 bg-slate-950/80 px-4 py-1.5 text-sm font-medium tracking-wide text-cyan-100 backdrop-blur">
          {byId.get(hovered)!.name}
          {byId.get(hovered)!.status === "draft" && (
            <span className="ml-2 text-amber-400" title="unverified — fact-check before trusting">
              ● draft
            </span>
          )}
        </div>
      )}
    </div>
  );
}
