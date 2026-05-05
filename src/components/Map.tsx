"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { ParcelDetail } from "@/types/parcel";
import ParcelPanel from "./ParcelPanel";
import SearchBar from "./SearchBar";
import LayerToggle from "./LayerToggle";
import MeasureTool from "./MeasureTool";

const CHICAGO_CENTER: [number, number] = [-87.6298, 41.8781];
const INITIAL_ZOOM = 11;

// Proxied through our API routes to avoid CORS issues
const PARCEL_TILES_URL = "/api/tiles/parcels/{z}/{y}/{x}";
const ZONING_EXPORT_URL = "/api/tiles/zoning?bbox={bbox-epsg-3857}";
const WARDS_EXPORT_URL = "/api/tiles/wards?bbox={bbox-epsg-3857}";

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [selectedParcel, setSelectedParcel] = useState<ParcelDetail | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [layerState, setLayerState] = useState([
    { id: "parcels", label: "Parcels", active: true },
    { id: "zoning", label: "Zoning", active: false },
    { id: "wards", label: "Wards", active: false },
    { id: "flood", label: "Flood Plain (FEMA)", active: false },
    { id: "satellite", label: "Satellite", active: false },
  ]);

  const fetchParcelByLocation = useCallback(
    async (lng: number, lat: number) => {
      setPanelOpen(true);
      setPanelLoading(true);
      setPanelError(null);
      setSelectedParcel(null);

      try {
        const res = await fetch(`/api/parcel/location?lng=${lng}&lat=${lat}`);
        if (!res.ok) throw new Error("No parcel found at this location");
        const data: ParcelDetail = await res.json();
        setSelectedParcel(data);
      } catch (err) {
        setPanelError(err instanceof Error ? err.message : "Failed to load parcel data");
      } finally {
        setPanelLoading(false);
      }
    },
    []
  );

  const fetchParcel = useCallback(async (pin: string) => {
    setPanelOpen(true);
    setPanelLoading(true);
    setPanelError(null);
    setSelectedParcel(null);

    try {
      const res = await fetch(`/api/parcel/${encodeURIComponent(pin)}`);
      if (!res.ok) throw new Error("Parcel not found");
      const data: ParcelDetail = await res.json();
      setSelectedParcel(data);
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : "Failed to load parcel data");
    } finally {
      setPanelLoading(false);
    }
  }, []);

  const handleLayerToggle = useCallback((id: string) => {
    setLayerState((prev) =>
      prev.map((l) => (l.id === id ? { ...l, active: !l.active } : l))
    );
  }, []);

  const handleSearchSelect = useCallback(
    (pin: string) => {
      fetchParcel(pin);
    },
    [fetchParcel]
  );

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
        },
        layers: [
          {
            id: "osm-tiles",
            type: "raster",
            source: "osm",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: CHICAGO_CENTER,
      zoom: INITIAL_ZOOM,
      maxZoom: 19,
      minZoom: 8,
    });

    map.addControl(new maplibregl.NavigationControl(), "bottom-right");
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      "bottom-right"
    );

    map.on("load", () => {
      // Satellite imagery — Esri World Imagery
      map.addSource("satellite", {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution: "Esri, Maxar, Earthstar Geographics",
      });

      map.addLayer({
        id: "satellite-imagery",
        type: "raster",
        source: "satellite",
        layout: { visibility: "none" },
      });

      // FEMA Flood Hazard Zones
      map.addSource("flood", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        attribution: '<a href="https://www.fema.gov/flood-maps">FEMA NFHL</a>',
      });

      map.addLayer({
        id: "flood-zones-fill",
        type: "fill",
        source: "flood",
        minzoom: 10,
        layout: { visibility: "none" },
        paint: {
          "fill-color": [
            "match",
            ["get", "FLD_ZONE"],
            "A", "#1e40af",
            "AE", "#1e40af",
            "AH", "#1e40af",
            "AO", "#2563eb",
            "VE", "#7c3aed",
            "V", "#7c3aed",
            "X", "#60a5fa",
            "#3b82f6",
          ],
          "fill-opacity": [
            "match",
            ["get", "FLD_ZONE"],
            "A", 0.45,
            "AE", 0.45,
            "AH", 0.45,
            "AO", 0.4,
            "VE", 0.5,
            "V", 0.5,
            "X", 0.2,
            0.35,
          ],
        },
      });

      map.addLayer({
        id: "flood-zones-outline",
        type: "line",
        source: "flood",
        minzoom: 10,
        layout: { visibility: "none" },
        paint: {
          "line-color": "#1e3a8a",
          "line-width": 1.5,
          "line-opacity": 0.8,
        },
      });

      map.addLayer({
        id: "flood-zones-label",
        type: "symbol",
        source: "flood",
        minzoom: 13,
        layout: {
          visibility: "none",
          "text-field": ["concat", "Zone ", ["get", "FLD_ZONE"]],
          "text-size": 11,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#1e3a8a",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });

      // Zoning overlay — dynamic ArcGIS export from City of Chicago
      map.addSource("zoning", {
        type: "raster",
        tiles: [ZONING_EXPORT_URL],
        tileSize: 512,
        attribution: '<a href="https://gisapps.chicago.gov">City of Chicago GIS</a>',
      });

      map.addLayer({
        id: "zoning-fill",
        type: "raster",
        source: "zoning",
        minzoom: 11,
        layout: { visibility: "none" },
        paint: { "raster-opacity": 0.55 },
      });

      // Ward boundaries — Chicago 311 service
      map.addSource("wards", {
        type: "raster",
        tiles: [WARDS_EXPORT_URL],
        tileSize: 512,
        attribution: '<a href="https://gisapps.chicago.gov">City of Chicago</a>',
      });

      map.addLayer({
        id: "wards-fill",
        type: "raster",
        source: "wards",
        minzoom: 9,
        layout: { visibility: "none" },
        paint: { "raster-opacity": 0.6 },
      });

      // Parcel outlines — Cook County GIS dynamic export
      map.addSource("parcels", {
        type: "raster",
        tiles: [PARCEL_TILES_URL],
        tileSize: 512,
        minzoom: 14,
        maxzoom: 19,
        attribution:
          '<a href="https://www.cookcountyassessor.com">Cook County Assessor</a>',
      });

      map.addLayer({
        id: "parcels-raster",
        type: "raster",
        source: "parcels",
        minzoom: 14,
        paint: { "raster-opacity": 0.85 },
      });

      // Highlight layer for selected parcel
      map.addSource("parcel-highlight", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "parcel-highlight-fill",
        type: "fill",
        source: "parcel-highlight",
        paint: {
          "fill-color": "#3b82f6",
          "fill-opacity": 0.25,
        },
      });

      map.addLayer({
        id: "parcel-highlight-outline",
        type: "line",
        source: "parcel-highlight",
        paint: {
          "line-color": "#2563eb",
          "line-width": 3,
        },
      });

      // Click anywhere — spatial query to get parcel details + drop pin
      map.on("click", (e) => {
        if (map.getZoom() >= 14) {
          if (markerRef.current) {
            markerRef.current.remove();
          }
          markerRef.current = new maplibregl.Marker({ color: "#ef4444" })
            .setLngLat(e.lngLat)
            .addTo(map);

          fetchParcelByLocation(e.lngLat.lng, e.lngLat.lat);
        }
      });

      // Cursor style based on zoom
      map.on("zoomend", () => {
        map.getCanvas().style.cursor = map.getZoom() >= 14 ? "pointer" : "";
      });
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [fetchParcelByLocation]);

  // Sync layer visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sync = () => {
      try {
        const parcelActive = layerState.find((l) => l.id === "parcels")?.active;
        const zoningActive = layerState.find((l) => l.id === "zoning")?.active;
        const wardsActive = layerState.find((l) => l.id === "wards")?.active;
        const floodActive = layerState.find((l) => l.id === "flood")?.active;
        const satelliteActive = layerState.find((l) => l.id === "satellite")?.active;
        map.setLayoutProperty("parcels-raster", "visibility", parcelActive ? "visible" : "none");
        map.setLayoutProperty("zoning-fill", "visibility", zoningActive ? "visible" : "none");
        map.setLayoutProperty("wards-fill", "visibility", wardsActive ? "visible" : "none");
        map.setLayoutProperty("flood-zones-fill", "visibility", floodActive ? "visible" : "none");
        map.setLayoutProperty("flood-zones-outline", "visibility", floodActive ? "visible" : "none");
        map.setLayoutProperty("flood-zones-label", "visibility", floodActive ? "visible" : "none");
        map.setLayoutProperty("satellite-imagery", "visibility", satelliteActive ? "visible" : "none");
      } catch {
        map.once("idle", sync);
      }
    };

    sync();
  }, [layerState]);

  // Load flood data when flood layer is active
  useEffect(() => {
    const map = mapRef.current;
    const floodActive = layerState.find((l) => l.id === "flood")?.active;
    if (!map || !floodActive) return;

    const loadFloodData = async () => {
      if (map.getZoom() < 10) return;
      const bounds = map.getBounds();
      const toMerc = (lng: number, lat: number) => {
        const x = (lng * 20037508.3427892) / 180;
        const y =
          (Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180)) *
          (20037508.3427892 / 180);
        return { x, y };
      };
      const sw = toMerc(bounds.getWest(), bounds.getSouth());
      const ne = toMerc(bounds.getEast(), bounds.getNorth());
      const bbox = `${sw.x},${sw.y},${ne.x},${ne.y}`;

      try {
        const res = await fetch(`/api/tiles/flood?bbox=${bbox}`);
        if (res.ok) {
          const data = await res.json();
          const source = map.getSource("flood") as maplibregl.GeoJSONSource | undefined;
          source?.setData(data);
        }
      } catch {
        // ignore fetch errors
      }
    };

    loadFloodData();
    map.on("moveend", loadFloodData);
    return () => {
      map.off("moveend", loadFloodData);
    };
  }, [layerState]);

  // Update parcel highlight when selection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateHighlight = () => {
      try {
        const source = map.getSource("parcel-highlight") as maplibregl.GeoJSONSource | undefined;
        if (!source) return false;

        if (selectedParcel?.geometry) {
          source.setData({
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: selectedParcel.geometry,
            },
            properties: {},
          });
        } else {
          source.setData({ type: "FeatureCollection", features: [] });
        }
        return true;
      } catch {
        return false;
      }
    };

    if (!updateHighlight()) {
      map.once("idle", updateHighlight);
    }
  }, [selectedParcel]);

  return (
    <div id="map-root">
      <div id="map-container" ref={containerRef} />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-2 sm:p-3 flex flex-col sm:flex-row items-stretch sm:items-start gap-2 sm:gap-3 pointer-events-none">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 pointer-events-auto">
          <h1 className="text-base sm:text-lg font-bold text-zinc-900 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm border border-zinc-200 whitespace-nowrap">
            CHA <span className="text-zinc-500 font-normal text-xs sm:text-sm">Chicago</span>
          </h1>
        </div>
        <div className="flex-1 pointer-events-auto">
          <SearchBar onSelectResult={handleSearchSelect} />
        </div>
      </div>

      {/* Zoom hint */}
      <ZoomHint mapRef={mapRef} />

      {/* HYLO logo */}
      <a
        href="https://hylo.work"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-3 right-3 z-10"
      >
        <img
          src="/hylo-logo.png"
          alt="HYLO"
          className="h-8 sm:h-10 opacity-80 hover:opacity-100 transition-opacity"
        />
      </a>

      {/* Bottom controls */}
      <div className="absolute bottom-16 left-3 z-10 flex flex-col gap-2">
        <MeasureTool mapRef={mapRef} />
        <LayerToggle layers={layerState} onToggle={handleLayerToggle} />
      </div>

      {/* Detail panel */}
      {panelOpen && (
        <ParcelPanel
          parcel={selectedParcel}
          loading={panelLoading}
          error={panelError}
          onClose={() => {
            setPanelOpen(false);
            setSelectedParcel(null);
            setPanelError(null);
            if (markerRef.current) {
              markerRef.current.remove();
              markerRef.current = null;
            }
            const source = mapRef.current?.getSource("parcel-highlight") as maplibregl.GeoJSONSource | undefined;
            source?.setData({ type: "FeatureCollection", features: [] });
          }}
        />
      )}
    </div>
  );
}

function ZoomHint({ mapRef }: { mapRef: React.RefObject<maplibregl.Map | null> }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const check = () => setShow(map.getZoom() < 13);
    map.on("zoomend", check);
    map.on("load", check);
    return () => {
      map.off("zoomend", check);
      map.off("load", check);
    };
  }, [mapRef]);

  if (!show) return null;

  return (
    <div className="absolute bottom-24 sm:bottom-20 left-1/2 -translate-x-1/2 z-10 bg-zinc-900/80 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur pointer-events-none">
      Zoom in to see parcels
    </div>
  );
}
