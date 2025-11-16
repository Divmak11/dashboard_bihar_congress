"use client";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { fetchSheetData, MeetingRow } from "../utils/fetchSheetData";
import { fetchZones, fetchCumulativeMetrics, fetchDetailedNukkadAc, fetchDetailedNukkadSlp } from "../utils/fetchHierarchicalData"; 
import { CumulativeMetrics } from "../../models/hierarchicalTypes";
import { getWhatsappMetricsForAssembly } from "@/app/utils/mapWhatsappAggregator";
import type { WhatsappAssemblyMetrics } from "@/app/utils/mapWhatsappAggregator";
import { getTrainingMetricsForAssembly } from "@/app/utils/mapTrainingAggregator";
import type { TrainingAssemblyMetrics } from "@/app/utils/mapTrainingAggregator";
import { getGgyMetricsForAssembly } from "@/app/utils/mapGgyAggregator";
import type { GgyAssemblyMetrics } from "@/app/utils/mapGgyAggregator";
import { getManifestoComplaintsMetricsForAssembly } from "@/app/utils/mapManifestoComplaintsAggregator";
import type { ManifestoComplaintsAssemblyMetrics } from "@/app/utils/mapManifestoComplaintsAggregator";
import { getCallCenterNewMetricsForAssembly } from "@/app/utils/mapCallCenterNewAggregator";
import type { CallCenterNewAssemblyMetrics } from "@/app/utils/mapCallCenterNewAggregator";
import { getCombinedHoverMetricsForAssembly } from "@/app/utils/mapHoverCombinedAggregator";
import type { CombinedHoverMetrics } from "@/app/utils/mapHoverCombinedAggregator";
import { getSlpTrainingMetricsForAssembly } from "@/app/utils/mapSlpTrainingAggregator";
import type { SlpTrainingAssemblyMetrics } from "@/app/utils/mapSlpTrainingAggregator";

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
  // WhatsApp metrics (fuzzy matched) for selected assembly
  const [whatsappMetrics, setWhatsappMetrics] = useState<WhatsappAssemblyMetrics | null>(null);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  // Training metrics (WTM + Shakti) for selected assembly
  const [trainingMetrics, setTrainingMetrics] = useState<TrainingAssemblyMetrics | null>(null);
  const [trainingLoading, setTrainingLoading] = useState(false);
  // GGY metrics for selected assembly
  const [ggyMetrics, setGgyMetrics] = useState<GgyAssemblyMetrics | null>(null);
  const [ggyLoading, setGgyLoading] = useState(false);
  // Manifesto Complaints metrics (AC-level) for selected assembly
  const [manifestoMetrics, setManifestoMetrics] = useState<ManifestoComplaintsAssemblyMetrics | null>(null);
  const [manifestoLoading, setManifestoLoading] = useState(false);
  // Call Center New conversions for selected assembly
  const [callCenterNewMetrics, setCallCenterNewMetrics] = useState<CallCenterNewAssemblyMetrics | null>(null);
  const [callCenterNewLoading, setCallCenterNewLoading] = useState(false);
  // SLP Training metrics for selected assembly
  const [slpTrainingMetrics, setSlpTrainingMetrics] = useState<SlpTrainingAssemblyMetrics | null>(null);
  const [slpTrainingLoading, setSlpTrainingLoading] = useState(false);
  // Nukkad Meetings combined (WTM-AC + WTM-SLP + Shakti-AC)
  const [nukkadCount, setNukkadCount] = useState<number | null>(null);
  const [nukkadLoading, setNukkadLoading] = useState(false);
  // Hover tooltip combined cache (multi-vertical snapshot)
  const [hoverCombinedCache, setHoverCombinedCache] = useState<Record<string, CombinedHoverMetrics>>({});

  useEffect(() => { setMounted(true); }, []);

  // Fetch cumulative metrics when assembly is selected
  useEffect(() => {
    if (!selectedAssembly) {
      setCumulativeMetrics(null);
      setWhatsappMetrics(null);
      setTrainingMetrics(null);
      setGgyMetrics(null);
      setManifestoMetrics(null);
      setCallCenterNewMetrics(null);
      setSlpTrainingMetrics(null);
      setNukkadCount(null);
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

  // Fetch WhatsApp metrics when assembly is selected (fuzzy match)
  useEffect(() => {
    if (!selectedAssembly) return;
    let cancelled = false;
    setWhatsappLoading(true);
    getWhatsappMetricsForAssembly(selectedAssembly)
      .then((m) => { if (!cancelled) setWhatsappMetrics(m); })
      .catch((err) => { console.error('[MapPage] WhatsApp metrics error', err); if (!cancelled) setWhatsappMetrics(null); })
      .finally(() => { if (!cancelled) setWhatsappLoading(false); });
    return () => { cancelled = true; };
  }, [selectedAssembly]);

  // Fetch Training metrics (WTM + Shakti) when assembly is selected (fuzzy match)
  useEffect(() => {
    if (!selectedAssembly) return;
    let cancelled = false;
    setTrainingLoading(true);
    getTrainingMetricsForAssembly(selectedAssembly)
      .then((m) => { if (!cancelled) setTrainingMetrics(m); })
      .catch((err) => { console.error('[MapPage] Training metrics error', err); if (!cancelled) setTrainingMetrics(null); })
      .finally(() => { if (!cancelled) setTrainingLoading(false); });
    return () => { cancelled = true; };
  }, [selectedAssembly]);

  // Fetch GGY metrics when assembly is selected (fuzzy match)
  useEffect(() => {
    if (!selectedAssembly) return;
    let cancelled = false;
    setGgyLoading(true);
    getGgyMetricsForAssembly(selectedAssembly)
      .then((m) => { if (!cancelled) setGgyMetrics(m); })
      .catch((err) => { console.error('[MapPage] GGY metrics error', err); if (!cancelled) setGgyMetrics(null); })
      .finally(() => { if (!cancelled) setGgyLoading(false); });
    return () => { cancelled = true; };
  }, [selectedAssembly]);

  // Fetch Manifesto Complaints metrics when assembly is selected (fuzzy match)
  useEffect(() => {
    if (!selectedAssembly) return;
    let cancelled = false;
    setManifestoLoading(true);
    getManifestoComplaintsMetricsForAssembly(selectedAssembly)
      .then((m) => { if (!cancelled) setManifestoMetrics(m); })
      .catch((err) => { console.error('[MapPage] Manifesto Complaints metrics error', err); if (!cancelled) setManifestoMetrics(null); })
      .finally(() => { if (!cancelled) setManifestoLoading(false); });
    return () => { cancelled = true; };
  }, [selectedAssembly]);

  // Fetch Call Center New conversions when assembly is selected (fuzzy match)
  useEffect(() => {
    if (!selectedAssembly) return;
    let cancelled = false;
    setCallCenterNewLoading(true);
    getCallCenterNewMetricsForAssembly(selectedAssembly)
      .then((m) => { if (!cancelled) setCallCenterNewMetrics(m); })
      .catch((err) => { console.error('[MapPage] Call Center New metrics error', err); if (!cancelled) setCallCenterNewMetrics(null); })
      .finally(() => { if (!cancelled) setCallCenterNewLoading(false); });
    return () => { cancelled = true; };
  }, [selectedAssembly]);

  // Fetch SLP Training metrics when assembly is selected (fuzzy match)
  useEffect(() => {
    if (!selectedAssembly) return;
    let cancelled = false;
    setSlpTrainingLoading(true);
    getSlpTrainingMetricsForAssembly(selectedAssembly)
      .then((m) => { if (!cancelled) setSlpTrainingMetrics(m); })
      .catch((err) => { console.error('[MapPage] SLP Training metrics error', err); if (!cancelled) setSlpTrainingMetrics(null); })
      .finally(() => { if (!cancelled) setSlpTrainingLoading(false); });
    return () => { cancelled = true; };
  }, [selectedAssembly]);

  // Fetch Nukkad Meetings (WTM-AC + WTM-SLP + Shakti-AC) when assembly is selected (fuzzy match)
  useEffect(() => {
    if (!selectedAssembly) return;
    let cancelled = false;
    setNukkadLoading(true);
    const assemblyVariations = [
      selectedAssembly!,
      selectedAssembly!.toLowerCase(),
      selectedAssembly!.toUpperCase(),
      `${selectedAssembly} (SC)`,
      `${selectedAssembly} (ST)`,
      `${selectedAssembly} (General)`
    ];
    Promise.all([
      fetchDetailedNukkadAc({ level: 'assembly', assemblies: assemblyVariations, vertical: 'wtm' }),
      fetchDetailedNukkadSlp({ level: 'assembly', assemblies: assemblyVariations }),
      fetchDetailedNukkadAc({ level: 'assembly', assemblies: assemblyVariations, vertical: 'shakti-abhiyaan' })
    ])
      .then(([wtmAc, wtmSlp, shaktiAc]) => {
        if (cancelled) return;
        const total = (wtmAc?.length || 0) + (wtmSlp?.length || 0) + (shaktiAc?.length || 0);
        setNukkadCount(total);
      })
      .catch((err) => { console.error('[MapPage] Nukkad metrics error', err); if (!cancelled) setNukkadCount(0); })
      .finally(() => { if (!cancelled) setNukkadLoading(false); });
    return () => { cancelled = true; };
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
  const formatCombinedTooltipHtml = (name: string, m: CombinedHoverMetrics) => `
    <div class='font-semibold text-base mb-1'>${name || "Constituency"}</div>
    <div>Nukkad Meetings: <b>${m.nukkadMeetings}</b></div>
    <div>WhatsApp Groups: <b>${m.whatsappGroups}</b></div>
    <div>Training Sessions: <b>${m.trainingSessions}</b></div>
    <div>Manifesto Complaints: <b>${m.manifestoComplaints}</b></div>
    <div>SLP Training: <b>${m.slpTraining}</b></div>
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

        // Check combined hover cache first
        const cachedCombined = hoverCombinedCache[assemblyName];
        if (cachedCombined) {
          const html = formatCombinedTooltipHtml(assemblyName, cachedCombined);
          layer.setTooltipContent(html);
          return;
        }

        // Show loading placeholder for aggregated metrics
        layer.setTooltipContent(`
          <div class='font-semibold text-base mb-1'>${assemblyName || "Constituency"}</div>
          <div>Loading aggregated metrics...</div>
        `);

        try {
          const combined = await getCombinedHoverMetricsForAssembly(assemblyName!);
          setHoverCombinedCache((prev) => ({ ...prev, [assemblyName!]: combined }));
          const html = formatCombinedTooltipHtml(assemblyName!, combined);
          layer.setTooltipContent(html);
        } catch (err) {
          console.error('[MapPage] hover combined fetch error', err);
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
  }, [enabledAssemblies, hoverCombinedCache, setHoveredId, setSelectedAssembly, setSelectedId, setSelectedTab]);

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
                className={`px-4 py-2 rounded-lg font-semibold transition text-sm ${selectedTab === "training" ? "bg-purple-200 text-purple-900" : "bg-gray-100 text-gray-700"}`}
                onClick={() => setSelectedTab("training")}
              >
                Training
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-semibold transition text-sm ${selectedTab === "whatsapp" ? "bg-green-200 text-green-900" : "bg-gray-100 text-gray-700"}`}
                onClick={() => setSelectedTab("whatsapp")}
              >
                Whatsapp Groups
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-semibold transition text-sm ${selectedTab === "manifesto-complaints" ? "bg-indigo-200 text-indigo-900" : "bg-gray-100 text-gray-700"}`}
                onClick={() => setSelectedTab("manifesto-complaints")}
              >
                Manifesto Complaints
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-semibold transition text-sm ${selectedTab === "call-center-new" ? "bg-yellow-200 text-yellow-900" : "bg-gray-100 text-gray-700"}`}
                onClick={() => setSelectedTab("call-center-new")}
              >
                Call Center New
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-semibold transition text-sm ${selectedTab === "ggy" ? "bg-orange-200 text-orange-900" : "bg-gray-100 text-gray-700"}`}
                onClick={() => setSelectedTab("ggy")}
              >
                Ghar Ghar Yatra
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-semibold transition text-sm ${selectedTab === "wt-slp" ? "bg-red-200 text-red-900" : "bg-gray-100 text-gray-700"}`}
                onClick={() => setSelectedTab("wt-slp")}
              >
                WT-SLP Professionals
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-semibold transition text-sm ${selectedTab === "slp-training" ? "bg-emerald-200 text-emerald-900" : "bg-gray-100 text-gray-700"}`}
                onClick={() => setSelectedTab("slp-training")}
              >
                SLP Training
              </button>
            </div>
          </div>
          {/* Tab content */}
          <div className="mt-4">
            {selectedTab === "training" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trainingLoading ? (
                  <div className="col-span-full text-center py-8">
                    <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading Training metrics...
                    </div>
                  </div>
                ) : trainingMetrics ? (
                  <>
                    <Metric label="WTM Sessions" value={trainingMetrics.wtm.sessions} />
                    <Metric label="WTM Attendees" value={trainingMetrics.wtm.attendees} />
                    <Metric label="Shakti Sessions" value={trainingMetrics.shakti.sessions} />
                    <Metric label="Shakti Attendees" value={trainingMetrics.shakti.attendees} />
                    <Metric label="Total Sessions" value={trainingMetrics.totals.sessions} />
                    <Metric label="Total Attendees" value={trainingMetrics.totals.attendees} />
                  </>
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No Training data available for this assembly
                  </div>
                )}
              </div>
            )}
            {selectedTab === "whatsapp" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {whatsappLoading ? (
                  <div className="col-span-full text-center py-8">
                    <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading WhatsApp metrics...
                    </div>
                  </div>
                ) : whatsappMetrics ? (
                  <>
                    <Metric label="Groups in Assembly" value={whatsappMetrics.groupsInAssembly} />
                    <Metric label="Members in Assembly" value={whatsappMetrics.membersInAssembly} />
                    <Metric label="Shakti Groups" value={whatsappMetrics.byType?.shakti.groups ?? 0} />
                    <Metric label="WTM Groups" value={whatsappMetrics.byType?.wtm.groups ?? 0} />
                    <Metric label="Public Groups" value={whatsappMetrics.byType?.public.groups ?? 0} />
                  </>
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No WhatsApp data available for this assembly
                  </div>
                )}
              </div>
            )}
            {selectedTab === "manifesto-complaints" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {manifestoLoading ? (
                  <div className="col-span-full text-center py-8">
                    <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading Manifesto Complaints...
                    </div>
                  </div>
                ) : manifestoMetrics ? (
                  <>
                    <Metric label="Total Complaints" value={manifestoMetrics.totalComplaints} />
                  </>
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No Manifesto Complaints data available for this assembly
                  </div>
                )}
              </div>
            )}
            {selectedTab === "call-center-new" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {callCenterNewLoading ? (
                  <div className="col-span-full text-center py-8">
                    <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading Call Center metrics...
                    </div>
                  </div>
                ) : callCenterNewMetrics ? (
                  <>
                    <Metric label="Conversions" value={callCenterNewMetrics.conversions} />
                  </>
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No Call Center data available for this assembly
                  </div>
                )}
              </div>
            )}
            {selectedTab === "ggy" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ggyLoading ? (
                  <div className="col-span-full text-center py-8">
                    <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading Ghar Ghar Yatra metrics...
                    </div>
                  </div>
                ) : ggyMetrics ? (
                  <>
                    <Metric label="Total Punches" value={ggyMetrics.totalPunches} />
                    <Metric label="Unique Punches" value={ggyMetrics.uniquePunches} />
                    {ggyMetrics.topMember && (
                      <Metric label="Top Member" value={`${ggyMetrics.topMember.name} (${ggyMetrics.topMember.totalPunches})`} />
                    )}
                  </>
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No GGY data available for this assembly
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
                    <Metric label="Nukkad Meetings" value={nukkadCount ?? 0} />
                    <Metric label="Mai-Bahin Forms" value={cumulativeMetrics.forms} />
                    <Metric label="Local Issue Videos" value={cumulativeMetrics.videos} />
                    <Metric label="AC Videos" value={cumulativeMetrics.acVideos} />
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
            {selectedTab === "slp-training" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {slpTrainingLoading ? (
                  <div className="col-span-full text-center py-8">
                    <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading SLP Training metrics...
                    </div>
                  </div>
                ) : slpTrainingMetrics ? (
                  <>
                    <Metric label="Total SLPs" value={slpTrainingMetrics.totalSlps} />
                    <Metric label="Trained" value={slpTrainingMetrics.trainedCount} />
                    <Metric label="Pending" value={slpTrainingMetrics.pendingCount} />
                    <Metric label="In Progress" value={slpTrainingMetrics.inProgressCount} />
                    {slpTrainingMetrics.match.confidence !== 'high' && (
                      <div className="col-span-full mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-yellow-800">
                          <span className="font-medium">Match Confidence: {slpTrainingMetrics.match.confidence}</span>
                          {slpTrainingMetrics.match.matchAssembly && (
                            <span className="text-yellow-600">(Matched to: {slpTrainingMetrics.match.matchAssembly})</span>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No SLP Training data available for this assembly
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