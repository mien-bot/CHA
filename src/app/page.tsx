"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-zinc-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-zinc-900 mx-auto mb-3" />
        <p className="text-sm text-zinc-500">Loading map...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return (
    <main style={{ width: "100vw", height: "100dvh", overflow: "hidden" }}>
      <MapView />
    </main>
  );
}
