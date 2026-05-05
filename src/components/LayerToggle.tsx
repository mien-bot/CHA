"use client";

import { useState, useRef, useEffect } from "react";
import { ZONING_LEGEND } from "@/lib/zoning-colors";

const FLOOD_LEGEND = [
  { label: "Zone A / AE / AH — High Risk", color: "#1e40af", opacity: 0.8 },
  { label: "Zone AO — Sheet Flow", color: "#2563eb", opacity: 0.75 },
  { label: "Zone V / VE — Coastal High Risk", color: "#7c3aed", opacity: 0.85 },
  { label: "Zone X — Moderate / Minimal", color: "#60a5fa", opacity: 0.5 },
];

interface LayerToggleProps {
  layers: { id: string; label: string; active: boolean }[];
  onToggle: (id: string) => void;
}

export default function LayerToggle({ layers, onToggle }: LayerToggleProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeCount = layers.filter((l) => l.active).length;
  const zoningActive = layers.find((l) => l.id === "zoning")?.active ?? false;
  const floodActive = layers.find((l) => l.id === "flood")?.active ?? false;
  const aduActive = layers.find((l) => l.id === "adu")?.active ?? false;

  return (
    <div ref={ref} className="relative">
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-white/95 backdrop-blur text-zinc-700 shadow-lg border border-zinc-200 hover:bg-zinc-50 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        Layers
        {activeCount > 0 && (
          <span className="bg-zinc-900 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-full mb-2 left-0 bg-white/95 backdrop-blur rounded-lg shadow-xl border border-zinc-200 min-w-[180px] overflow-hidden">
          <div className="px-3 py-2 border-b border-zinc-100">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              Map Layers
            </span>
          </div>
          {layers.map((layer) => (
            <div key={layer.id}>
              <button
                onClick={() => onToggle(layer.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-zinc-50 transition-colors"
              >
                <div
                  className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-colors ${
                    layer.active
                      ? "bg-zinc-900 border-zinc-900"
                      : "border-zinc-300 bg-white"
                  }`}
                >
                  {layer.active && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={layer.active ? "text-zinc-900 font-medium" : "text-zinc-500"}>
                  {layer.label}
                </span>
              </button>
              {/* Inline zoning legend */}
              {layer.id === "zoning" && zoningActive && (
                <div className="px-4 pb-2 pt-0.5 ml-7 border-b border-zinc-100">
                  <div className="space-y-0.5">
                    {ZONING_LEGEND.map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm border border-zinc-300 shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[11px] text-zinc-500">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Inline ADU legend */}
              {layer.id === "adu" && aduActive && (
                <div className="px-4 pb-2 pt-0.5 ml-7 border-b border-zinc-100">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm border border-zinc-300 shrink-0" style={{ backgroundColor: "#059669" }} />
                      <span className="text-[11px] text-zinc-500">No Limitations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm border border-zinc-300 shrink-0" style={{ backgroundColor: "#2563eb" }} />
                      <span className="text-[11px] text-zinc-500">Annual + Occupancy Limits</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm border border-zinc-300 shrink-0" style={{ backgroundColor: "#9333ea" }} />
                      <span className="text-[11px] text-zinc-500">Limits + Admin Adjustment</span>
                    </div>
                  </div>
                  <a
                    href="https://chicago.maps.arcgis.com/apps/instant/lookup/index.html?appid=9499e0bd623e42cda4e3af6b8382e866"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-600 hover:text-blue-800 underline mt-1 inline-block"
                  >
                    Chicago ADU Ordinance Map
                  </a>
                </div>
              )}
              {/* Inline flood legend */}
              {layer.id === "flood" && floodActive && (
                <div className="px-4 pb-2 pt-0.5 ml-7 border-b border-zinc-100">
                  <div className="space-y-0.5">
                    {FLOOD_LEGEND.map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm border border-zinc-300 shrink-0"
                          style={{ backgroundColor: item.color, opacity: item.opacity }}
                        />
                        <span className="text-[11px] text-zinc-500">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
