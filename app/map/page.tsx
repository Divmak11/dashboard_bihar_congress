"use client";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { fetchSheetData, MeetingRow } from "../utils/fetchSheetData";
import { fetchZones, fetchCumulativeMetrics } from "../utils/fetchHierarchicalData"; 
import { CumulativeMetrics } from "../../models/hierarchicalTypes";

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
  // Assemblies enabled for interaction (populated from zonal-incharge docs)
  const [enabledAssemblies, setEnabledAssemblies] = useState<string[]>([]);
  const [geoData, setGeoData] = useState<any>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [sheetData, setSheetData] = useState<MeetingRow[]>([]);
  const [assemblyStats, setAssemblyStats] = useState<Record<string, { meetings: number; slp: number; onboarded: number }>>({});
  const [selectedAssembly, setSelectedAssembly] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>("wt-slp");
  // Keep reference to the currently selected Leaflet layer for cleanup
  const selectedLayerRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  // Cumulative metrics for selected assembly
  const [cumulativeMetrics, setCumulativeMetrics] = useState<CumulativeMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  // Cache for metrics keyed by assembly name (case-sensitive as stored)
  const [metricsCache, setMetricsCache] = useState<Record<string, CumulativeMetrics>>({});

  useEffect(() => { setMounted(true); }, []);

  // Fetch cumulative metrics when assembly is selected
  useEffect(() => {
    if (!selectedAssembly) {
      setCumulativeMetrics(null);
      return;
    }

    async function loadMetrics() {
      setMetricsLoading(true);
      try {
        console.log('[MapPage] Fetching metrics for assembly:', selectedAssembly);
        
        // Try multiple assembly name variations to handle district vs constituency names
        const assemblyVariations = [
          selectedAssembly!, // Original name
          selectedAssembly!.toLowerCase(), // Lowercase
          selectedAssembly!.toUpperCase(), // Uppercase
          // Add common constituency suffixes
          `${selectedAssembly} (SC)`,
          `${selectedAssembly} (ST)`,
          `${selectedAssembly} (General)`
        ];
        
        const metrics = await fetchCumulativeMetrics({
          level: 'assembly',
          assemblies: assemblyVariations
          // No date filters - always show "All Time" data
        });
        console.log('[MapPage] Received metrics:', metrics);
        setCumulativeMetrics(metrics);
        setMetricsCache(prev => ({ ...prev, [selectedAssembly!]: metrics }));
      } catch (error) {
        console.error('[MapPage] Failed to fetch cumulative metrics:', error);
        setCumulativeMetrics(null);
      } finally {
        setMetricsLoading(false);
      }
    }

    loadMetrics();
  }, [selectedAssembly]);



  // Fetch assemblies list from all zones (zonal-incharge docs)
  useEffect(() => {
    async function loadAssemblies() {
      try {
        const zones = await fetchZones();
        const set = new Set<string>();
        zones.forEach((z) => {
          (z.assemblies || []).forEach((a) => set.add(a.trim().toLowerCase()));
        });
        setEnabledAssemblies(Array.from(set));
      } catch (err) {
        console.error('[MapPage] Failed to load zone assemblies', err);
      }
    }
    loadAssemblies();
  }, []);

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
      const id = String(feature.properties?.AC_NO);
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
  // Helper to create tooltip HTML from metrics
  const formatTooltipHtml = (name: string, m: CumulativeMetrics) => `
    <div class='font-semibold text-base mb-1'>${name || "Constituency"}</div>
    <div>Meetings: <b>${m.meetings}</b></div>
    <div>Samvidhan Leaders: <b>${m.slps}</b></div>
    <div>Shakti Leaders: <b>${m.shaktiLeaders}</b></div>
    <div>Samvidhan Clubs: <b>${m.clubs}</b></div>
    <div>Shakti Clubs: <b>${m.shaktiClubs}</b></div>
    <div>Assembly WA Groups: <b>${m.assemblyWaGroups}</b></div>
  `;

  const onEachFeature = useCallback((feature: any, layer: any) => {
    const assemblyName = feature.properties?.AC_NAME?.trim();
    const assemblyKey = assemblyName?.toLowerCase();
    const isEnabled = !enabledAssemblies.length || enabledAssemblies.includes(assemblyKey);
    // Disable interactions for greyed-out assemblies
    if (!isEnabled) {
      layer.options.interactive = false;
      return;
    }
    const id = String(feature.properties?.AC_NO);
    
    layer.on({
      mouseover: async function () {
        setHoveredId(id);
        layer.bringToFront();

        // Check cache first
        const cached = metricsCache[assemblyName];
        if (cached) {
          const html = formatTooltipHtml(assemblyName, cached);
          layer.setTooltipContent(html);
          return;
        }

        // Show loading placeholder
        layer.setTooltipContent(`
          <div class='font-semibold text-base mb-1'>${assemblyName || "Constituency"}</div>
          <div>Loading metrics...</div>
        `);

        try {
          const assemblyVariations = [
            assemblyName!,
            assemblyName!.toLowerCase(),
            assemblyName!.toUpperCase(),
            `${assemblyName} (SC)`,
            `${assemblyName} (ST)`,
            `${assemblyName} (General)`
          ];

          const hoverMetrics = await fetchCumulativeMetrics({
            level: 'assembly',
            assemblies: assemblyVariations
          });

          setMetricsCache(prev => ({ ...prev, [assemblyName!]: hoverMetrics }));

          const html = formatTooltipHtml(assemblyName, hoverMetrics);
          layer.setTooltipContent(html);
        } catch (err) {
          console.error('[MapPage] hover fetch error', err);
          layer.setTooltipContent(`
            <div class='font-semibold text-base mb-1'>${assemblyName || "Constituency"}</div>
            <div>Error loading metrics</div>
          `);
        }
      },
      mouseout: function () {
        setHoveredId(null);
      },
      click: function () {
        // Set new selection - let GeoJSON style callback handle the visual styling
        selectedLayerRef.current = layer;
        setSelectedAssembly(assemblyName);
        setSelectedId(String(id));
        setSelectedTab("wt-slp");
      },
    });
    
    // Initial tooltip
    const tooltipHtml = `
      <div class='font-semibold text-base mb-1'>${assemblyName || "Constituency"}</div>
      <div>Click to view detailed metrics</div>
    `;
    layer.bindTooltip(tooltipHtml, {
      direction: "top",
      sticky: true,
      className: "leaflet-tooltip leaflet-tooltip-custom",
    });
  }, [enabledAssemblies, metricsCache, setHoveredId, setSelectedAssembly, setSelectedId, setSelectedTab]);

  // Memoize GeoJSON to prevent layer recreation on re-renders
  const geoJsonLayer = useMemo(() => {
    if (!geoData) return null;
    
    const enabledSet = new Set(enabledAssemblies);
    return (
      <GeoJSON
        data={geoData}
        style={(feature: any) => {
          const id = String(feature.properties?.AC_NO);
          const assemblyName = feature.properties?.AC_NAME?.trim() ?? "";
          const assemblyKey = assemblyName.toLowerCase();
          const isHovered = hoveredId === id;
          const isSelected = selectedId === id;
          

          const enabled = !enabledAssemblies.length || enabledSet.has(assemblyKey);
          if (!enabled) {
            return {
              fillColor: "#cccccc",
              weight: 1,
              opacity: 0.6,
              color: "#ffffff",
              fillOpacity: 0.4,
              interactive: false,
            } as any;
          }
          return {
            fillColor: (isHovered || isSelected) ? regionColors[id]?.vibrant || "#eee" : regionColors[id]?.pastel || "#eee",
            weight: (isHovered || isSelected) ? 0 : 2.5,
            opacity: 1,
            color: (isHovered || isSelected) ? "rgba(0,0,0,0)" : "#fff",
            fillOpacity: (isHovered || isSelected) ? 1 : 0.6,
            interactive: true,
          } as any;
        }}
        onEachFeature={onEachFeature}
      />
    );
  }, [geoData, enabledAssemblies, hoveredId, selectedId, regionColors, onEachFeature]);

  const isDataReady = geoData && Object.keys(assemblyStats).length > 0;

  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4 text-center">Bihar Assembly Constituency Map</h1>
      <div className="relative w-full h-[900px] rounded-lg overflow-hidden">
        {(!isDataReady || !mounted) && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <svg className="animate-spin h-10 w-10 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
          </div>
        )}
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
            {geoJsonLayer}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {metricsLoading ? (
                  <div className="col-span-full text-center py-8">
                    <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading metrics...
                    </div>
                  </div>
                ) : cumulativeMetrics ? (
                  <>
                    <Metric label="Shakti Leaders" value={cumulativeMetrics.shaktiLeaders} />
                    <Metric label="Shakti Saathi" value={cumulativeMetrics.shaktiSaathi} />
                    <Metric label="Shakti Clubs" value={cumulativeMetrics.shaktiClubs} />
                    <Metric label="Shakti Mai-Bahin" value={cumulativeMetrics.shaktiForms} />
                    <Metric label="Shakti Baithaks" value={cumulativeMetrics.shaktiBaithaks} />
                    <Metric label="Shakti Local Issue Videos" value={cumulativeMetrics.shaktiVideos} />
                  </>
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No data available for this assembly
                  </div>
                )}
              </div>
            )}
            {selectedTab === "wt-slp" && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {metricsLoading ? (
                  <div className="col-span-full text-center py-8">
                    <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading metrics...
                    </div>
                  </div>
                ) : cumulativeMetrics ? (
                  <>
                    <Metric label="Meetings" value={cumulativeMetrics.meetings} />
                    <Metric label="Volunteers" value={cumulativeMetrics.volunteers} />
                    <Metric label="Samvidhan Leaders" value={cumulativeMetrics.slps} />
                    <Metric label="Samvidhan Saathi" value={cumulativeMetrics.saathi} />
                    <Metric label="Samvidhan Clubs" value={cumulativeMetrics.clubs} />
                    <Metric label="Mai-Bahin Forms" value={cumulativeMetrics.forms} />
                    <Metric label="Local Issue Videos" value={cumulativeMetrics.videos} />
                    <Metric label="AC Videos" value={cumulativeMetrics.acVideos} />
                    <Metric label="Samvidhan Chaupals" value={cumulativeMetrics.chaupals} />
                    <Metric label="Central WA Groups" value={cumulativeMetrics.centralWaGroups} />
                    <Metric label="Assembly WA Groups" value={cumulativeMetrics.assemblyWaGroups} />
                  </>
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No data available for this assembly
                  </div>
                )}
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