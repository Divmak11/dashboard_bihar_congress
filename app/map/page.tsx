"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { fetchSheetData, MeetingRow } from "../utils/fetchSheetData";

// Dynamically import React-Leaflet components to avoid SSR issues
// TypeScript: Cast to 'any' to suppress prop type errors due to dynamic import and ESM-only modules
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
) as any;
const GeoJSON = dynamic(
  () => import("react-leaflet").then((mod) => mod.GeoJSON),
  { ssr: false }
) as any;

// Add a MapResizer component to force Leaflet to resize after mount
const MapResizer = dynamic(
  async () => {
    const { useMap } = await import("react-leaflet");
    return function MapResizer() {
      const map = useMap();
      useEffect(() => {
        setTimeout(() => map.invalidateSize(), 100);
      }, [map]);
      return null;
    };
  },
  { ssr: false }
);

// FitBoundsHandler: fits the map to the geoData bounds when loaded
const FitBoundsHandler = dynamic(
  async () => {
    const { useMap } = await import("react-leaflet");
    return function FitBoundsHandler({ geoData }: { geoData: any }) {
      const map = useMap();
      useEffect(() => {
        if (geoData) {
          import("leaflet").then(L => {
            const layer = L.geoJSON(geoData);
            map.fitBounds(layer.getBounds(), { padding: [20, 20] });
          });
        }
      }, [geoData, map]);
      return null;
    };
  },
  { ssr: false }
);

// Pastel and vibrant color generators
function pastelColor(seed: number) {
  const hue = (seed * 137.508) % 360;
  return `hsl(${hue}, 60%, 85%)`;
}
function vibrantColor(seed: number) {
  const hue = (seed * 137.508) % 360;
  return `hsl(${hue}, 90%, 55%)`;
}

// Utility to darken an HSL color string
function darkenHSL(hsl: string, amount: number = 0.15) {
  // hsl(hue, sat%, light%)
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/);
  if (!match) return hsl;
  const [_, h, s, l] = match;
  const newL = Math.max(0, Math.min(100, parseInt(l) - amount * 100));
  return `hsl(${h}, ${s}%, ${newL}%)`;
}

export default function BiharMapPage() {
  const [geoData, setGeoData] = useState<any>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [sheetData, setSheetData] = useState<MeetingRow[]>([]);
  const [assemblyStats, setAssemblyStats] = useState<Record<string, { meetings: number; slp: number; onboarded: number }>>({});
  const [selectedAssembly, setSelectedAssembly] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>("shakti");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Fetch GeoJSON
  useEffect(() => {
    fetch("/bihar_AC.json")
      .then((res) => res.json())
      .then((data) => setGeoData(data));
  }, []);

  // Fetch sheet data and compute stats
  useEffect(() => {
    fetchSheetData().then((data) => {
      setSheetData(data);
      // Compute stats for each assembly (normalize to lower case and trim)
      const stats: Record<string, { meetings: number; slp: number; onboarded: number }> = {};
      data.forEach((row) => {
        const assembly = row["assembly name"]?.trim().toLowerCase();
        if (!assembly) return;
        if (!stats[assembly]) stats[assembly] = { meetings: 0, slp: 0, onboarded: 0 };
        stats[assembly].meetings++;
        if ((row["recommended position"] || "").toLowerCase().includes("slp")) stats[assembly].slp++;
        if ((row["onboarding status"] || "").toLowerCase() === "onboarded") stats[assembly].onboarded++;
      });
      setAssemblyStats(stats);
    });
  }, []);

  // Use AC_NO as the unique region key (string)
  const regionColors = useMemo(() => {
    if (!geoData || !geoData.features) return {};
    const colors: Record<string, { pastel: string; vibrant: string; name: string }> = {};
    geoData.features.forEach((feature: any, idx: number) => {
      const id = feature.properties?.AC_NO;
      const name = feature.properties?.AC_NAME?.trim();
      colors[id] = {
        pastel: pastelColor(idx),
        vibrant: vibrantColor(idx),
        name: name,
      };
    });
    return colors;
  }, [geoData]);

  // onEachFeature for hover highlight and tooltip
  function onEachFeature(feature: any, layer: any) {
    const id = feature.properties?.AC_NO;
    const idx = geoData?.features?.findIndex((f: any) => f.properties?.AC_NO === id) ?? 0;
    const fillColor = hoveredId === id ? regionColors[id]?.vibrant : regionColors[id]?.pastel;
    const defaultStyle = {
      fillColor: regionColors[id]?.pastel || "#eee",
      weight: 2.5,
      opacity: 1,
      color: "#fff",
      fillOpacity: 0.85,
    };
    const highlightStyle = {
      fillColor: regionColors[id]?.vibrant || "#eee",
      weight: 0,
      opacity: 1,
      color: "rgba(0,0,0,0)",
      fillOpacity: 1,
    };
    layer.setStyle(hoveredId === id ? highlightStyle : defaultStyle);
    const assemblyName = feature.properties?.AC_NAME?.trim();
    const assemblyKey = assemblyName?.toLowerCase();
    const stats = assemblyStats[assemblyKey] || { meetings: 0, slp: 0, onboarded: 0 };
    // Overlay metrics (replace with your real data extraction logic as needed)
    const overlayMetrics = [
      { label: "Total Meetings Done", value: stats.meetings },
      { label: "Total Onboarded", value: stats.onboarded },
      { label: "Total WA Groups", value: 0 },
      { label: "Total YT Channels", value: 0 },
      { label: "Total Hostels", value: 0 },
    ];
    layer.on({
      mouseover: function () {
        setHoveredId(id);
        layer.setStyle(highlightStyle);
        layer.bringToFront();
        // Tooltip content
        const tooltipHtml = `
          <div class='font-semibold text-base mb-1'>${assemblyName || "Constituency"}</div>
          <div class='flex flex-col gap-1'>
            ${overlayMetrics
              .map(
                (m) => `<div class='flex items-center gap-2'><span class='font-semibold text-gray-700'>${m.label}:</span> <span class='text-gray-900 font-bold'>${m.value}</span></div>`
              )
              .join("")}
          </div>
        `;
        layer.setTooltipContent(tooltipHtml);
      },
      mouseout: function () {
        setHoveredId(null);
        layer.setStyle(defaultStyle);
      },
      click: function () {
        setSelectedAssembly(assemblyName);
        setSelectedTab("shakti");
      },
    });
    // Initial tooltip
    const tooltipHtml = `
      <div class='font-semibold text-base mb-1'>${assemblyName || "Constituency"}</div>
      <div class='flex flex-col gap-1'>
        ${overlayMetrics
          .map(
            (m) => `<div class='flex items-center gap-2'><span class='font-semibold text-gray-700'>${m.label}:</span> <span class='text-gray-900 font-bold'>${m.value}</span></div>`
          )
          .join("")}
      </div>
    `;
    layer.bindTooltip(tooltipHtml, {
      direction: "top",
      sticky: true,
      className: "leaflet-tooltip leaflet-tooltip-custom",
    });
  }

  const isDataReady = geoData && Object.keys(assemblyStats).length > 0;

  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4 text-center">Bihar Assembly Constituency Map</h1>
      <div className="relative w-full h-[900px] rounded-lg overflow-hidden">
        {mounted && isDataReady && (
          <MapContainer
            center={[25.5, 85.2]}
            zoom={7}
            scrollWheelZoom={false}
            touchZoom={false}
            dragging={true}
            doubleClickZoom={false}
            zoomControl={true}
            attributionControl={false}
            className="w-full h-full"
            style={{ backgroundColor: "transparent", cursor: "pointer" }}
          >
            <MapResizer />
            <FitBoundsHandler geoData={geoData} />
            <GeoJSON
              data={geoData}
              style={(feature: any) => {
                const id = feature.properties?.AC_NO;
                const isHovered = hoveredId === id;
                return {
                  fillColor: isHovered
                    ? regionColors[id]?.vibrant || "#eee"
                    : regionColors[id]?.pastel || "#eee",
                  weight: isHovered ? 0 : 2.5,
                  opacity: 1,
                  color: isHovered ? "rgba(0,0,0,0)" : "#fff",
                  fillOpacity: isHovered ? 1 : 0.85,
                  interactive: true,
                };
              }}
              onEachFeature={onEachFeature}
            />
          </MapContainer>
        )}
      </div>
      {/* Detailed section below the map for selected assembly */}
      {selectedAssembly && (
        <div className="mt-10 bg-white rounded-xl shadow-lg border border-gray-200 p-6 max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
            <div>
              <div className="text-lg font-bold text-gray-800">{selectedAssembly}</div>
              <div className="text-sm text-gray-500">Detailed Metrics</div>
            </div>
            <div className="flex gap-2 mt-2 md:mt-0 flex-wrap">
              <button
                className={`px-4 py-2 rounded-lg font-semibold transition text-sm ${selectedTab === "hostel" ? "bg-purple-200 text-purple-900" : "bg-gray-100 text-gray-700"}`}
                onClick={() => setSelectedTab("hostel")}
              >
                Hostel
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-semibold transition text-sm ${selectedTab === "whatsapp" ? "bg-green-200 text-green-900" : "bg-gray-100 text-gray-700"}`}
                onClick={() => setSelectedTab("whatsapp")}
              >
                Whatsapp Groups
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-semibold transition text-sm ${selectedTab === "shakti" ? "bg-pink-200 text-pink-900" : "bg-gray-100 text-gray-700"}`}
                onClick={() => setSelectedTab("shakti")}
              >
                Shakti Professionals
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-semibold transition text-sm ${selectedTab === "wt-slp" ? "bg-red-200 text-red-900" : "bg-gray-100 text-gray-700"}`}
                onClick={() => setSelectedTab("wt-slp")}
              >
                WT-SLP Professionals
              </button>
            </div>
          </div>
          {/* Tab content */}
          <div className="mt-4">
            {selectedTab === "hostel" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Metric label="Total Meetings" value={0} />
                <div className="flex flex-col">
                  <Metric label="Total Volunteers" value={0} />
                  <div className="ml-4 mt-1 flex flex-col gap-1">
                    <Metric label="Total SLPs" value={0} small />
                    <Metric label="Total Non-SLPs" value={0} small />
                  </div>
                </div>
                <div className="flex flex-col">
                  <Metric label="Total WA Groups" value={0} />
                  <div className="ml-4 mt-1 flex flex-col gap-1">
                    <Metric label="Number" value={0} small />
                    <Metric label="Members" value={0} small />
                  </div>
                </div>
              </div>
            )}
            {selectedTab === "whatsapp" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Metric label="Total Members" value={0} />
                <Metric label="Groups in Assembly" value={0} />
                <Metric label="Members in Assembly" value={0} />
                <Metric label="Panchayat Groups" value={0} />
                <Metric label="Panchayat Members" value={0} />
              </div>
            )}
            {selectedTab === "shakti" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Metric label="Total Meetings" value={0} />
                <div className="flex flex-col">
                  <Metric label="Total Volunteers" value={0} />
                  <div className="ml-4 mt-1 flex flex-col gap-1">
                    <Metric label="Total SLPs" value={0} small />
                    <Metric label="Total Onboarded" value={0} small />
                  </div>
                </div>
                <Metric label="Total Panchayats" value={0} />
                <Metric label="Total SM users" value={0} />
                <Metric label="Total Videos" value={0} />
                <div className="flex flex-col">
                  <Metric label="Training" value={"-"} />
                  <div className="ml-4 mt-1 flex flex-col gap-1">
                    <Metric label="Status" value={"-"} small />
                    <Metric label="Date" value={"-"} small />
                  </div>
                </div>
                <div className="flex flex-col">
                  <Metric label="Total Whatsapp Groups" value={0} />
                  <div className="ml-4 mt-1 flex flex-col gap-1">
                    <Metric label="Number" value={0} small />
                    <Metric label="Members" value={0} small />
                  </div>
                </div>
              </div>
            )}
            {selectedTab === "wt-slp" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Metric label="Total Meetings" value={0} />
                <div className="flex flex-col">
                  <Metric label="Total Volunteers" value={0} />
                  <div className="ml-4 mt-1 flex flex-col gap-1">
                    <Metric label="Total SLPs" value={0} small />
                    <Metric label="Total Onboarded" value={0} small />
                  </div>
                </div>
                <Metric label="Total Panchayats" value={0} />
                <Metric label="Total SM users" value={0} />
                <Metric label="Total Videos" value={0} />
                <div className="flex flex-col">
                  <Metric label="Training" value={"-"} />
                  <div className="ml-4 mt-1 flex flex-col gap-1">
                    <Metric label="Status" value={"-"} small />
                    <Metric label="Date" value={"-"} small />
                  </div>
                </div>
                <div className="flex flex-col">
                  <Metric label="Total Whatsapp Groups" value={0} />
                  <div className="ml-4 mt-1 flex flex-col gap-1">
                    <Metric label="Number" value={0} small />
                    <Metric label="Members" value={0} small />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Simple metric display component
function Metric({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div className={`rounded-lg bg-gray-50 p-4 flex flex-col items-start shadow-sm border border-gray-100 ${small ? 'text-xs py-2 px-3' : ''}`}>
      <span className={`text-xs text-gray-500 font-medium mb-1 ${small ? 'text-[10px]' : ''}`}>{label}</span>
      <span className={`text-lg font-bold text-gray-800 ${small ? 'text-base' : ''}`}>{value}</span>
    </div>
  );
} 