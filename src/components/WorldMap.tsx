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
import { useFactStateMap } from "@/lib/factState";
import { countryAverageWeight } from "@/lib/simulatedDistance";

interface CountryMeta {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  status: "draft" | "reviewed";
  factIds: string[]; // learnable (non-blank) fact ids, for the knowledge shade
}

interface WorldMapProps {
  countries: CountryMeta[];
}

type ShadeMode = "tier" | "knowledge";

// Tier drives brightness — tier 1 pulls the eye first.
const TIER_FILL: Record<1 | 2 | 3, string> = {
  1: "#67e8f9",
  2: "#3f7fd6",
  3: "#2b4a8a",
};

const NO_DATA_FILL = "#141c2b";
const NO_DATA_STROKE = "#26314a";
const OCEAN = "#0a111e";
const HOVER_FILL = "#a5f3fc";

// Knowledge ramp: unknown blue-grey -> cyan -> mint at mastery.
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lerp(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${m(ar, br)} ${m(ag, bg)} ${m(ab, bb)})`;
}
function knowledgeFill(weight: number): string {
  const t = Math.min(1, Math.max(0, weight));
  return t < 0.5
    ? lerp("#33415e", "#22d3ee", t * 2)
    : lerp("#22d3ee", "#a7f3d0", (t - 0.5) * 2);
}

export default function WorldMap({ countries }: WorldMapProps) {
  const router = useRouter();
  const factState = useFactStateMap();
  const [hovered, setHovered] = useState<string | null>(null);
  const [shadeBy, setShadeBy] = useState<ShadeMode>("tier");

  const byId = useMemo(() => {
    const m = new Map<string, CountryMeta>();
    for (const c of countries) m.set(c.id, c);
    return m;
  }, [countries]);

  const knowledge = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of countries) {
      m.set(c.id, countryAverageWeight(c.factIds, factState));
    }
    return m;
  }, [countries, factState]);

  const hoveredMeta = hovered ? byId.get(hovered) : undefined;

  return (
    <div className="absolute inset-0" style={{ background: OCEAN }}>
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 175 }}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup
          zoom={1}
          minZoom={1}
          maxZoom={6}
          center={[12, 12]}
          // macOS-style zoom: a trackpad pinch reaches the browser as a
          // ctrlKey wheel event — allow only that to zoom (spread fingers =
          // zoom in, pinch together = zoom out). A plain two-finger scroll
          // (wheel without ctrlKey) no longer zooms. Non-wheel gestures
          // (drag to pan, double-click, touch pinch) pass through unless a
          // non-primary mouse button is held.
          filterZoomEvent={(raw) => {
            // @types/react-simple-maps mistypes this as SVGElement; it is
            // really the source DOM event from d3-zoom.
            const event = raw as unknown as WheelEvent & MouseEvent;
            return event.type === "wheel" ? event.ctrlKey : !event.button;
          }}
        >
          <Geographies geography={WORLD_TOPOJSON_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const alpha2 = geoIdToAlpha2(geo.id as string);
                const meta = alpha2 ? byId.get(alpha2) : undefined;
                const hasData = Boolean(meta);
                const isHover = hasData && hovered === alpha2;

                const fill = !meta
                  ? NO_DATA_FILL
                  : shadeBy === "knowledge"
                    ? knowledgeFill(knowledge.get(meta.id) ?? 0)
                    : TIER_FILL[meta.tier];

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
                        fill: isHover ? HOVER_FILL : fill,
                        stroke: hasData ? "#0a111e" : NO_DATA_STROKE,
                        strokeWidth: hasData ? 0.5 : 0.35,
                        outline: "none",
                        cursor: hasData ? "pointer" : "default",
                        transition: "fill 120ms ease",
                      },
                      hover: {
                        fill: hasData ? HOVER_FILL : NO_DATA_FILL,
                        stroke: hasData ? "#e0fbff" : NO_DATA_STROKE,
                        strokeWidth: hasData ? 0.75 : 0.35,
                        outline: "none",
                        cursor: hasData ? "pointer" : "default",
                      },
                      pressed: { fill: "#22d3ee", outline: "none" },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {hoveredMeta && (
        <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-full border border-cyan-400/30 bg-slate-950/80 px-4 py-1.5 text-sm font-medium tracking-wide text-cyan-100 backdrop-blur">
          {hoveredMeta.name}
          {shadeBy === "knowledge" && (
            <span className="ml-2 font-mono text-cyan-300/80">
              {Math.round((knowledge.get(hoveredMeta.id) ?? 0) * 100)}% known
            </span>
          )}
          {hoveredMeta.status === "draft" && (
            <span
              className="ml-2 text-amber-400"
              title="unverified — fact-check before trusting"
            >
              ● draft
            </span>
          )}
        </div>
      )}

      {/* shade toggle */}
      <div className="absolute bottom-3 left-4 flex items-center gap-2">
        <div className="flex overflow-hidden rounded-full border border-slate-700/70 bg-slate-950/70 backdrop-blur">
          {(["tier", "knowledge"] as ShadeMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setShadeBy(mode)}
              className={`px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
                shadeBy === mode
                  ? "bg-cyan-400/15 text-cyan-100"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        {shadeBy === "knowledge" && (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wide text-slate-500">
              less
            </span>
            <span
              className="h-1.5 w-16 rounded-full"
              style={{
                background:
                  "linear-gradient(to right, #33415e, #22d3ee, #a7f3d0)",
              }}
            />
            <span className="font-mono text-[10px] uppercase tracking-wide text-slate-500">
              more
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
