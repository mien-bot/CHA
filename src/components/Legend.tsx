"use client";

import { ZONING_LEGEND } from "@/lib/zoning-colors";

interface LegendProps {
  visible: boolean;
}

export default function Legend({ visible }: LegendProps) {
  if (!visible) return null;

  return (
    <div className="bg-white/95 backdrop-blur rounded-lg shadow-lg border border-zinc-200 p-3">
      <h4 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2">
        Zoning
      </h4>
      <div className="space-y-1">
        {ZONING_LEGEND.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div
              className="w-3.5 h-3.5 rounded-sm border border-zinc-300"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-zinc-600">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
