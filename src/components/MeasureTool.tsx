"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";

interface MeasureToolProps {
  mapRef: React.RefObject<maplibregl.Map | null>;
}

function haversineDistance(
  [lng1, lat1]: [number, number],
  [lng2, lat2]: [number, number]
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(miles: number): string {
  if (miles < 0.1) {
    return `${Math.round(miles * 5280)} ft`;
  }
  return `${miles.toFixed(2)} mi`;
}

export default function MeasureTool({ mapRef }: MeasureToolProps) {
  const [active, setActive] = useState(false);
  const [points, setPoints] = useState<[number, number][]>([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const clearMeasurement = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    try {
      const source = map.getSource("measure-line") as maplibregl.GeoJSONSource | undefined;
      source?.setData({ type: "FeatureCollection", features: [] });
    } catch {
      // source may not exist yet
    }

    setPoints([]);
    setTotalDistance(0);
  }, [mapRef]);

  const toggleMeasure = useCallback(() => {
    if (active) {
      clearMeasurement();
    }
    setActive((v) => !v);
  }, [active, clearMeasurement]);

  // Add measure source/layer when map loads
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const setup = () => {
      if (map.getSource("measure-line")) return;

      map.addSource("measure-line", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "measure-line-layer",
        type: "line",
        source: "measure-line",
        paint: {
          "line-color": "#ef4444",
          "line-width": 3,
          "line-dasharray": [2, 2],
        },
      });
    };

    if (map.isStyleLoaded()) {
      setup();
    } else {
      map.on("load", setup);
    }
  }, [mapRef]);

  // Handle map clicks for measurement
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !active) return;

    map.getCanvas().style.cursor = "crosshair";

    const onClick = (e: maplibregl.MapMouseEvent) => {
      const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      setPoints((prev) => {
        const next = [...prev, lngLat];

        // Add marker
        const el = document.createElement("div");
        el.className = "measure-point";
        el.style.cssText =
          "width:12px;height:12px;background:#ef4444;border:2px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3);";
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(lngLat)
          .addTo(map);
        markersRef.current.push(marker);

        // Update line
        if (next.length > 1) {
          const source = map.getSource("measure-line") as maplibregl.GeoJSONSource | undefined;
          source?.setData({
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: next,
            },
            properties: {},
          });

          // Calculate total distance
          let dist = 0;
          for (let i = 1; i < next.length; i++) {
            dist += haversineDistance(next[i - 1], next[i]);
          }
          setTotalDistance(dist);
        }

        return next;
      });

      // Stop event from reaching parcel click handler
      e.originalEvent.stopPropagation();
    };

    map.on("click", onClick);

    return () => {
      map.off("click", onClick);
      map.getCanvas().style.cursor = "";
    };
  }, [active, mapRef]);

  // Clean up when deactivating
  useEffect(() => {
    if (!active) {
      const map = mapRef.current;
      if (map) {
        map.getCanvas().style.cursor = map.getZoom() >= 14 ? "pointer" : "";
      }
    }
  }, [active, mapRef]);

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={toggleMeasure}
        className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg shadow-lg border transition-colors ${
          active
            ? "bg-red-500 text-white border-red-600 hover:bg-red-600"
            : "bg-white/95 backdrop-blur text-zinc-700 border-zinc-200 hover:bg-zinc-50"
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 21l6-6m0 0l4-4m-4 4l4 4m-4-4l-4-4m8-4l4-4m0 0l3 3m-3-3l-3 3"
          />
        </svg>
        {active ? "Stop Measuring" : "Measure"}
      </button>

      {active && totalDistance > 0 && (
        <div className="bg-white/95 backdrop-blur rounded-lg shadow-lg border border-zinc-200 px-3 py-2 text-xs">
          <span className="font-medium text-zinc-900">{formatDistance(totalDistance)}</span>
          <span className="text-zinc-500 ml-1">({points.length} pts)</span>
          <button
            onClick={clearMeasurement}
            className="ml-2 text-red-500 hover:text-red-700 font-medium"
          >
            Clear
          </button>
        </div>
      )}

      {active && points.length === 0 && (
        <div className="bg-white/95 backdrop-blur rounded-lg shadow-lg border border-zinc-200 px-3 py-1.5 text-[11px] text-zinc-500">
          Click map to start measuring
        </div>
      )}
    </div>
  );
}
