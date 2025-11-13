/**
 * Data fetching utilities for Ghar-Ghar Yatra Analytics module
 * Handles Firebase queries, data aggregation, and metadata resolution
 */

import { db } from './firebase';
import { ggyCache, makeGGYRangeKey, homePageCache, CACHE_KEYS } from './cacheUtils';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query,
  orderBy,
  startAt,
  endAt,
  limit,
  startAfter,
  documentId,
  CollectionReference,
  DocumentData,
  DocumentSnapshot
} from 'firebase/firestore';
import {
  GharGharYatraDocument,
  GharGharYatraSummary,
  SLPDataDocument,
  SLPMetadata,
  SLPWithMetadata,
  SLPAggregatedStats,
  AggregatedMetrics,
  ChartData,
  DailyTrendDataPoint,
  TopSLPDataPoint,
  DataQualityDataPoint,
  CallingPatternDataPoint,
  DateRange,
  SLPDataWithDate,
  OtherDataDocument,
  PaginationState
} from '../../models/gharGharYatraTypes';
import {
  GGYAssemblyGroup,
  GGYAssemblyMemberAgg,
  GGYReportData,
  GGYReportOptions,
  GGYReportSegment,
  GGYSegmentData,
  GGYZoneGroup,
  ReportSummary,
  GgyHomeSummary,
} from '../../models/ggyReportTypes';

/**
 * Generate array of dates between start and end (inclusive)
 */
function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const current = new Date(start);
  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * === GGY Split Report Aggregation Helpers ===
 * Note: Per-user clarification, there is no other_data collection now for report purposes.
 * Invalid totals are derived from summaries only (incorrect_count), no value-wise breakdown.
 */

/**
 * Split a date range into segments based on split type
 */
export function splitGGYDateRange(options: GGYReportOptions): GGYReportSegment[] {
  const { startDate, endDate, split } = options;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const segments: GGYReportSegment[] = [];

  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (split === 'cumulative') {
    segments.push({ label: `${startDate} to ${endDate}`.trim(), startDate, endDate });
    return segments;
  }

  if (split === 'day') {
    const cur = new Date(start);
    while (cur <= end) {
      const s = fmt(cur);
      const e = fmt(cur);
      segments.push({ label: s, startDate: s, endDate: e });
      cur.setDate(cur.getDate() + 1);
    }
    return segments;
  }

  // month-wise
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cur <= last) {
    const sDate = new Date(cur.getFullYear(), cur.getMonth(), 1);
    const eDate = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
    // clip to provided boundaries
    const s = fmt(new Date(Math.max(sDate.getTime(), new Date(startDate).getTime())));
    const e = fmt(new Date(Math.min(eDate.getTime(), new Date(endDate).getTime())));
    const monthLabel = sDate.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
    segments.push({ label: monthLabel, startDate: s, endDate: e });
    cur.setMonth(cur.getMonth() + 1);
  }
  return segments;
}

/**
 * Build assembly-wise member aggregation from slpData
 * - Aggregates strictly by slpId across the provided range
 * - Determines the assembly from slp_data.assembly (most frequent if multiple)
 * - Resolves member name/phone from d2d_members by the same document ID (slpId)
 */
async function buildAssemblyGroupsFromSlpData(slpData: SLPDataWithDate[]): Promise<GGYAssemblyGroup[]> {
  type AggVals = {
    total: number;
    unique: number;
    double: number;
    triple: number;
    assemblyCounts: Map<string, number>;
  };

  // Aggregate per SLP
  const perSlp = new Map<string, AggVals>();
  slpData.forEach(r => {
    const v = perSlp.get(r.slpId) || { total: 0, unique: 0, double: 0, triple: 0, assemblyCounts: new Map<string, number>() };
    v.total += r.totalPunches;
    v.unique += r.uniquePunches;
    v.double += r.doubleEntries;
    v.triple += r.tripleEntries;
    if (r.assembly) {
      v.assemblyCounts.set(r.assembly, (v.assemblyCounts.get(r.assembly) || 0) + 1);
    }
    perSlp.set(r.slpId, v);
  });

  const slpIds = Array.from(perSlp.keys());
  const meta = await fetchSLPMetadataMap(slpIds); // now backed by d2d_members

  const byAssembly = new Map<string, GGYAssemblyMemberAgg[]>();
  perSlp.forEach((vals, slpId) => {
    // Determine assembly from slp_data dominance
    let assembly = 'Unknown Assembly';
    if (vals.assemblyCounts.size > 0) {
      assembly = Array.from(vals.assemblyCounts.entries()).sort((a, b) => b[1] - a[1])[0][0];
    }

    const m = meta.get(slpId) || { name: `Member-${slpId.slice(0, 6)}`, assembly: assembly, phoneNumber: 'N/A' };
    const row: GGYAssemblyMemberAgg = {
      slpId,
      slpName: m.name,
      phoneNumber: m.phoneNumber,
      assembly, // strictly from slp_data aggregation
      totalPunches: vals.total,
      uniquePunches: vals.unique,
      doubleEntries: vals.double,
      tripleEntries: vals.triple
    };
    const arr = byAssembly.get(row.assembly) || [];
    arr.push(row);
    byAssembly.set(row.assembly, arr);
  });

  // Sort members within assembly by totalPunches desc
  const groups: GGYAssemblyGroup[] = Array.from(byAssembly.entries()).map(([assembly, members]) => ({
    assembly,
    members: members.sort((a, b) => b.totalPunches - a.totalPunches)
  }));

  // Sort assemblies alphabetically
  groups.sort((a, b) => a.assembly.localeCompare(b.assembly));
  return groups;
}

/**
 * Build zone groups from assembly groups with performing/underperforming splits
 * Threshold: assemblies with totalPunches < 10 are underperforming
 */
async function buildZoneGroupsFromAssemblies(assemblyGroups: GGYAssemblyGroup[], threshold: number = 10): Promise<GGYZoneGroup[]> {
  // Import zone fetcher
  const { fetchZonesForWTM } = await import('./fetchHierarchicalData');
  
  // Fetch zones once (WTM by default)
  const zones = await fetchZonesForWTM();
  
  // Build assembly to zone mapping
  const assemblyToZone = new Map<string, { zoneId: string; zoneName: string }>();
  zones.forEach(zone => {
    zone.assemblies.forEach(assembly => {
      assemblyToZone.set(assembly, { zoneId: zone.id, zoneName: zone.name });
    });
  });
  
  // Group assemblies by zone
  const zoneMap = new Map<string, { zoneId: string; zoneName: string; assemblies: GGYAssemblyGroup[] }>();
  
  assemblyGroups.forEach(assemblyGroup => {
    const zoneInfo = assemblyToZone.get(assemblyGroup.assembly);
    const zoneId = zoneInfo?.zoneId || 'unmapped';
    const zoneName = zoneInfo?.zoneName || 'Unmapped Zone';
    
    if (!zoneMap.has(zoneId)) {
      zoneMap.set(zoneId, { zoneId, zoneName, assemblies: [] });
    }
    zoneMap.get(zoneId)!.assemblies.push(assemblyGroup);
  });
  
  // Build zone groups with performing/underperforming splits
  const zoneGroups: GGYZoneGroup[] = [];
  
  for (const [zoneId, zoneData] of zoneMap) {
    const assembliesPerforming: GGYAssemblyGroup[] = [];
    const assembliesUnderperforming: GGYAssemblyGroup[] = [];
    
    zoneData.assemblies.forEach(assemblyGroup => {
      const total = assemblyGroup.totalPunches || 0;
      if (total >= threshold) {
        assembliesPerforming.push(assemblyGroup);
      } else {
        assembliesUnderperforming.push(assemblyGroup);
      }
    });
    
    // Sort assemblies by totalPunches descending for better readability
    const sortByPunches = (a: GGYAssemblyGroup, b: GGYAssemblyGroup) => 
      (b.totalPunches || 0) - (a.totalPunches || 0);
    assembliesPerforming.sort(sortByPunches);
    assembliesUnderperforming.sort(sortByPunches);
    
    zoneGroups.push({
      zoneId,
      zoneName: zoneData.zoneName,
      assembliesPerforming,
      assembliesUnderperforming,
      threshold
    });
  }
  
  // Sort zones by name (consistent with zone fetcher sorting)
  zoneGroups.sort((a, b) => a.zoneName.localeCompare(b.zoneName));
  
  return zoneGroups;
}

/**
 * Build a single segment's data from source functions
 */
export async function buildGGYSegmentData(startDate: string, endDate: string, segmentLabel: string): Promise<GGYSegmentData> {
  // Fetch source once with slp_data included to support assembly-wise listing
  const source = await fetchOverviewSourceData(startDate, endDate, { includeSlpData: true, useCache: true });
  const metrics = await generateAggregatedMetricsFromSource(source);
  const assemblyGroups = await buildAssemblyGroupsFromSlpData(source.slpData);
  
  // Compute totalPunches for each assembly (sum of member totalPunches)
  assemblyGroups.forEach(group => {
    group.totalPunches = group.members.reduce((sum, m) => sum + m.totalPunches, 0);
  });
  
  // Build report summary from summaries map (authoritative)
  const reportSummary = buildReportSummaryFromSummaries(source.dateDocuments);
  const invalidCount = reportSummary.incorrect_count; // keep aligned with 'Incorrect Format'
  
  // Build zone groups with performing/underperforming splits (threshold = 10)
  const zoneGroups = await buildZoneGroupsFromAssemblies(assemblyGroups, 10);

  return {
    segmentLabel,
    startDate,
    endDate,
    metrics,
    invalidCount,
    assemblyGroups,
    reportSummary,
    zoneGroups, // New: zone-wise grouping
  };
}

/**
 * Build ReportSummary by summing daily summaries across the provided map
 */
function buildReportSummaryFromSummaries(
  dateDocuments: Map<string, GharGharYatraDocument>
): ReportSummary {
  const summaries = Array.from(dateDocuments.values()).map((d) => d.summary);

  let total_param2_values = 0;
  let matched_count = 0;
  let unidentifiable_count = 0;
  let incorrect_count = 0;
  let no_match_count = 0;

  let less_than_equal_3_digits_count = 0;

  let total_punches = 0;
  let total_unique_entries = 0;
  let total_double_entries = 0;
  let total_triple_and_more_entries = 0;

  let matched_total_punches = 0;
  let matched_unique_entries = 0;
  let matched_double_entries = 0;
  let matched_triple_and_more_entries = 0;

  let unmatched_total_punches = 0;
  let members_over_15_punches = 0;
  let members_under_5_punches = 0;
  let total_unmatched = 0;
  let total_incorrect_entries = 0;

  let blank_param2_total_punches: number | undefined = undefined;
  let blank_param2_unique_count: number | undefined = undefined;

  for (const s of summaries) {
    total_param2_values += s.total_param2_values ?? 0;
    matched_count += s.matched_count ?? 0;
    unidentifiable_count += s.unidentifiable_count ?? s.less_than_equal_3_digits_count ?? 0;
    incorrect_count += s.incorrect_count ?? 0;
    no_match_count += s.no_match_count ?? 0;

    // Prefer explicit combined metric if present; otherwise approximate with unidentifiable_count
    less_than_equal_3_digits_count +=
      s.less_than_equal_3_digits_count ?? (s.unidentifiable_count ?? 0);

    total_punches += s.total_punches ?? 0;
    total_unique_entries += s.total_unique_entries ?? 0;
    total_double_entries += s.total_double_entries ?? 0;
    total_triple_and_more_entries += s.total_triple_and_more_entries ?? 0;

    matched_total_punches += s.matched_total_punches ?? 0;
    matched_unique_entries += s.matched_unique_entries ?? 0;
    matched_double_entries += s.matched_double_entries ?? 0;
    matched_triple_and_more_entries += s.matched_triple_and_more_entries ?? 0;

    unmatched_total_punches += s.unmatched_total_punches ?? 0;
    members_over_15_punches += s.members_over_15_punches ?? 0;
    members_under_5_punches += s.members_under_5_punches ?? 0;
    total_unmatched += s.total_unmatched ?? 0;
    total_incorrect_entries += s.total_incorrect_entries ?? 0;

    // Capture optional blank counts
    if ((s as any).blank_param2_total_punches !== undefined) {
      blank_param2_total_punches = (blank_param2_total_punches ?? 0) + ((s as any).blank_param2_total_punches || 0);
    }
    if ((s as any).blank_param2_unique_count !== undefined) {
      blank_param2_unique_count = (blank_param2_unique_count ?? 0) + ((s as any).blank_param2_unique_count || 0);
    }
  }

  const duplicate_calls = (total_double_entries ?? 0) + (total_triple_and_more_entries ?? 0);
  const total_calls_from_parts = (total_unique_entries ?? 0) + duplicate_calls;
  const matched_percentage = total_param2_values > 0 ? (matched_count / total_param2_values) * 100 : 0;

  const missing_fields: string[] = [];
  if (blank_param2_total_punches === undefined) missing_fields.push('blank_param2_total_punches');
  // less_than_equal_3_digits_count fallback note if we had to approximate
  if (!summaries.some((s) => s.less_than_equal_3_digits_count !== undefined)) {
    missing_fields.push('less_than_equal_3_digits_count');
  }

  if (total_punches !== total_calls_from_parts) {
    console.warn('[GGY] total_punches != unique+duplicate; using parts sum for Total Calls row', {
      total_punches,
      fromParts: total_calls_from_parts,
    });
  }

  return {
    total_param2_values,
    matched_count,
    unidentifiable_count,
    incorrect_count,
    no_match_count,

    less_than_equal_3_digits_count,

    total_punches,
    total_unique_entries,
    total_double_entries,
    total_triple_and_more_entries,

    matched_total_punches,
    matched_unique_entries,
    matched_double_entries,
    matched_triple_and_more_entries,

    unmatched_total_punches,
    members_over_15_punches,
    members_under_5_punches,
    total_unmatched,
    total_incorrect_entries,

    blank_param2_total_punches,
    blank_param2_unique_count,

    // Derived
    matched_percentage: Math.round(matched_percentage * 10) / 10,
    duplicate_calls,
    total_calls_from_parts,
    missing_fields: missing_fields.length ? missing_fields : undefined,
  } as ReportSummary;
}

/**
 * Build complete GGY report data including overall and optional segments
 */
export async function buildGGYReportData(options: GGYReportOptions): Promise<GGYReportData> {
  const { startDate, endDate, split } = options;

  const now = new Date();
  const generatedAt = now.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  // Overall (consolidated) first
  const overall = await buildGGYSegmentData(startDate, endDate, `${startDate} to ${endDate}`);

  const report: GGYReportData = {
    header: {
      title: 'Ghar-Ghar Yatra Enhanced Report',
      generatedAt,
      dateRange: { startDate, endDate },
      split
    },
    overall
  };

  if (split === 'cumulative') {
    return report;
  }

  // Build per-segment data
  const segments = splitGGYDateRange(options);
  const segData: GGYSegmentData[] = [];
  for (const seg of segments) {
    segData.push(await buildGGYSegmentData(seg.startDate, seg.endDate, seg.label));
  }

  return { ...report, segments: segData };
}

/**
 * List existing dates (document IDs) in ghar_ghar_yatra within a date range
 * Uses lexicographic range on documentId() as IDs are YYYY-MM-DD
 */
export async function listExistingDatesInRange(
  startDate: string,
  endDate: string
): Promise<string[]> {
  try {
    // Ensure start <= end
    let s = startDate;
    let e = endDate;
    if (s > e) {
      const tmp = s; s = e; e = tmp;
    }
    const colRef = collection(db, 'ghar_ghar_yatra');
    const q = query(colRef, orderBy(documentId()), startAt(s), endAt(e));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.id);
  } catch (error) {
    console.error('[listExistingDatesInRange] Error:', error);
    // Fallback: return empty, caller handles gracefully
    return [];
  }
}

/**
 * Fetch main documents for provided dates only
 */
export async function fetchDateDocumentsForDates(
  dates: string[]
): Promise<Map<string, GharGharYatraDocument>> {
  const map = new Map<string, GharGharYatraDocument>();
  if (dates.length === 0) return map;

  // Chunk to avoid too many parallel requests
  const chunkSize = 25;
  for (let i = 0; i < dates.length; i += chunkSize) {
    const chunk = dates.slice(i, i + chunkSize);
    const promises = chunk.map(date => getDoc(doc(db, 'ghar_ghar_yatra', date)));
    const snaps = await Promise.all(promises);
    snaps.forEach((snap, idx) => {
      if (snap.exists()) {
        map.set(chunk[idx], snap.data() as GharGharYatraDocument);
      }
    });
  }
  return map;
}

/**
 * Fetch all SLP data for provided dates only, and annotate with date
 */
export async function fetchAllSLPDataForDates(
  dates: string[]
): Promise<SLPDataWithDate[]> {
  const results: SLPDataWithDate[] = [];
  if (dates.length === 0) return results;

  const chunkSize = 20;
  for (let i = 0; i < dates.length; i += chunkSize) {
    const chunk = dates.slice(i, i + chunkSize);
    const snaps = await Promise.all(
      chunk.map(date => getDocs(collection(db, 'ghar_ghar_yatra', date, 'slp_data')))
    );
    snaps.forEach((snap, snapIdx) => {
      const date = chunk[snapIdx];
      snap.forEach(d => {
        const data = d.data() as SLPDataDocument;
        // Ensure slpId is present and stable; fallback to document ID if field missing
        const slpId = (data as any).slpId ?? d.id;
        results.push({ ...data, slpId, date });
      });
    });
  }
  return results;
}

/**
 * Fetch overview source once: existing date docs and SLP sub-collections only for dates that exist
 */
export async function fetchOverviewSourceData(
  startDate: string,
  endDate: string,
  options?: { includeSlpData?: boolean; useCache?: boolean }
): Promise<{ dateDocuments: Map<string, GharGharYatraDocument>; slpData: SLPDataWithDate[]; existingDates: string[] }> {
  const includeSlpData = options?.includeSlpData ?? true;
  const useCache = options?.useCache ?? true;

  const sumKey = makeGGYRangeKey('sum', startDate, endDate);
  const slpKey = makeGGYRangeKey('slp', startDate, endDate);

  console.time('[Overview] fetchOverviewSourceData');
  // Try cached summary-only first
  if (useCache) {
    const cachedSum = ggyCache.get<{ entries: [string, GharGharYatraDocument][]; dates: string[] }>(sumKey);
    if (cachedSum && (!includeSlpData || (includeSlpData && ggyCache.get<SLPDataWithDate[]>(slpKey)))) {
      const map = new Map<string, GharGharYatraDocument>(cachedSum.entries);
      const slpData = includeSlpData ? (ggyCache.get<SLPDataWithDate[]>(slpKey) || []) : [];
      console.timeEnd('[Overview] fetchOverviewSourceData');
      return { dateDocuments: map, slpData, existingDates: cachedSum.dates };
    }
  }

  // Not cached or partial cache – fetch fresh
  const existingDates = await listExistingDatesInRange(startDate, endDate);
  if (existingDates.length === 0) {
    console.timeEnd('[Overview] fetchOverviewSourceData');
    return { dateDocuments: new Map(), slpData: [], existingDates: [] };
  }

  // Always fetch summaries when cache missing
  const dateDocuments = await fetchDateDocumentsForDates(existingDates);

  if (useCache) {
    const entries = Array.from(dateDocuments.entries());
    ggyCache.set(sumKey, { entries, dates: existingDates });
  }

  let slpData: SLPDataWithDate[] = [];
  if (includeSlpData) {
    // Try cache for slpData
    if (useCache) {
      const cachedSlp = ggyCache.get<SLPDataWithDate[]>(slpKey);
      if (cachedSlp) {
        slpData = cachedSlp;
      } else {
        slpData = await fetchAllSLPDataForDates(existingDates);
        ggyCache.set(slpKey, slpData);
      }
    } else {
      slpData = await fetchAllSLPDataForDates(existingDates);
    }
  }

  console.timeEnd('[Overview] fetchOverviewSourceData');
  return { dateDocuments, slpData, existingDates };
}
 

/**
 * Fetch main ghar_ghar_yatra documents within date range
 */
export async function fetchDateRangeData(
  startDate: string,
  endDate: string
): Promise<Map<string, GharGharYatraDocument>> {
  console.log(`[fetchDateRangeData] Fetching data from ${startDate} to ${endDate}`);
  
  const dataMap = new Map<string, GharGharYatraDocument>();
  const dates = generateDateRange(startDate, endDate);
  
  try {
    // Fetch all documents in parallel
    const docPromises = dates.map(date => 
      getDoc(doc(db, 'ghar_ghar_yatra', date))
    );
    
    const docSnapshots = await Promise.all(docPromises);
    
    docSnapshots.forEach((docSnap, index) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as GharGharYatraDocument;
        dataMap.set(dates[index], data);
      }
    });
    
    console.log(`[fetchDateRangeData] Found ${dataMap.size} documents with data`);
    return dataMap;
  } catch (error) {
    console.error('[fetchDateRangeData] Error fetching data:', error);
    throw new Error('Failed to fetch Ghar-Ghar Yatra data');
  }
}

/**
 * Fetch all SLP data from sub-collections within date range
 */
export async function fetchAllSLPDataInRange(
  startDate: string,
  endDate: string
): Promise<SLPDataDocument[]> {
  console.log(`[fetchAllSLPDataInRange] Fetching SLP data from ${startDate} to ${endDate}`);
  
  const dates = generateDateRange(startDate, endDate);
  const allSLPData: SLPDataDocument[] = [];
  
  try {
    // Fetch sub-collections in parallel
    const subCollectionPromises = dates.map(date => 
      getDocs(collection(db, 'ghar_ghar_yatra', date, 'slp_data'))
    );
    
    const subCollectionSnapshots = await Promise.all(subCollectionPromises);
    
    subCollectionSnapshots.forEach(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data() as SLPDataDocument;
        // Ensure slpId fallback to doc.id for robustness across data eras
        const slpId = (data as any).slpId ?? doc.id;
        allSLPData.push({ ...data, slpId });
      });
    });
    
    console.log(`[fetchAllSLPDataInRange] Found ${allSLPData.length} SLP data records`);
    return allSLPData;
  } catch (error) {
    console.error('[fetchAllSLPDataInRange] Error fetching SLP data:', error);
    throw new Error('Failed to fetch SLP activity data');
  }
}

/**
 * Fetch member metadata from d2d_members collection by document IDs
 * Kept the function name for compatibility across existing call-sites
 */
export async function fetchSLPMetadataMap(slpIds: string[]): Promise<Map<string, SLPMetadata>> {
  console.log(`[fetchSLPMetadataMap] (d2d_members) Fetching metadata for ${slpIds.length} members`);

  const metadataMap = new Map<string, SLPMetadata>();
  if (slpIds.length === 0) return metadataMap;

  try {
    const promises = slpIds.map((id) => getDoc(doc(db, 'd2d_members', id)));
    const docs = await Promise.all(promises);
    docs.forEach((snap, idx) => {
      const id = slpIds[idx];
      if (snap.exists()) {
        const data = snap.data() as any;
        metadataMap.set(id, {
          name: data.name || `Member-${id.substring(0, 8)}`,
          assembly: data.assembly || 'Unknown Assembly',
          phoneNumber: data.phoneNumber || 'N/A',
        });
      } else {
        metadataMap.set(id, {
          name: `Member-${id.substring(0, 8)}`,
          assembly: 'Unknown Assembly',
          phoneNumber: 'N/A',
        });
      }
    });

    console.log(`[fetchSLPMetadataMap] (d2d_members) Resolved ${metadataMap.size} member metadata entries`);
    return metadataMap;
  } catch (error) {
    console.error('[fetchSLPMetadataMap] Error fetching member metadata from d2d_members:', error);
    throw new Error('Failed to fetch member metadata');
  }
}

/**
 * Fetch complete data for a specific date
 */
export async function fetchSingleDateData(date: string): Promise<SLPWithMetadata[]> {
  console.log(`[fetchSingleDateData] Fetching data for ${date}`);
  
  try {
    // Check if main document exists
    const mainDoc = await getDoc(doc(db, 'ghar_ghar_yatra', date));
    
    if (!mainDoc.exists()) {
      console.log(`[fetchSingleDateData] No data found for ${date}`);
      return [];
    }
    
    // Fetch SLP sub-collection
    const slpDataSnapshot = await getDocs(
      collection(db, 'ghar_ghar_yatra', date, 'slp_data')
    );
    
    if (slpDataSnapshot.empty) {
      console.log(`[fetchSingleDateData] No SLP data found for ${date}`);
      return [];
    }
    
    // Extract SLP data and IDs
    const slpDataList: SLPDataDocument[] = [];
    const slpIds: string[] = [];
    
    slpDataSnapshot.forEach(doc => {
      const data = doc.data() as SLPDataDocument;
      slpDataList.push(data);
      slpIds.push(data.slpId);
    });
    
    // Fetch SLP metadata
    const metadataMap = await fetchSLPMetadataMap(slpIds);
    
    // Merge data with metadata
    const mergedData: SLPWithMetadata[] = slpDataList.map(slpData => {
      const metadata = metadataMap.get(slpData.slpId) || {
        name: `Unknown SLP (${slpData.slpId.substring(0, 8)})`,
        assembly: 'Unknown Assembly',
        phoneNumber: 'N/A'
      };
      
      return {
        ...slpData,
        slpName: metadata.name,
        assembly: metadata.assembly,
        performanceBadge: slpData.totalPunches > 10 ? 'High' : 'Low'
      };
    });
    
    console.log(`[fetchSingleDateData] Returned ${mergedData.length} SLP records for ${date}`);
    return mergedData;
  } catch (error) {
    console.error('[fetchSingleDateData] Error:', error);
    throw new Error(`Failed to fetch data for ${date}`);
  }
}

/**
 * Aggregate SLP performance statistics across date range
 */
export async function aggregateSLPPerformance(
  slpDataArray: SLPDataDocument[]
): Promise<Map<string, SLPAggregatedStats>> {
  console.log(`[aggregateSLPPerformance] Aggregating performance for ${slpDataArray.length} records`);
  
  // Group by slpId
  const slpGroupMap = new Map<string, SLPDataDocument[]>();
  
  slpDataArray.forEach(record => {
    const existing = slpGroupMap.get(record.slpId) || [];
    existing.push(record);
    slpGroupMap.set(record.slpId, existing);
  });
  
  // Get unique SLP IDs and fetch metadata
  const uniqueSlpIds = Array.from(slpGroupMap.keys());
  const metadataMap = await fetchSLPMetadataMap(uniqueSlpIds);
  
  // Calculate aggregated stats
  const statsMap = new Map<string, SLPAggregatedStats>();
  
  slpGroupMap.forEach((records, slpId) => {
    const totalPunches = records.reduce((sum, r) => sum + r.totalPunches, 0);
    const daysActive = records.length;
    const avgPunchesPerDay = totalPunches / daysActive;
    
    const metadata = metadataMap.get(slpId) || {
      name: `Unknown SLP (${slpId.substring(0, 8)})`,
      assembly: 'Unknown Assembly',
      phoneNumber: 'N/A'
    };
    
    statsMap.set(slpId, {
      slpId,
      slpName: metadata.name,
      assembly: metadata.assembly,
      totalPunches,
      avgPunchesPerDay,
      daysActive,
      performanceCategory: avgPunchesPerDay > 10 ? 'High' : 'Low'
    });
  });
  
  console.log(`[aggregateSLPPerformance] Generated stats for ${statsMap.size} unique SLPs`);
  return statsMap;
}

/**
 * Calculate data quality metrics from summaries
 */
export function calculateDataQualityMetrics(
  summaries: GharGharYatraSummary[]
): {
  totalMatched: number;
  totalUnidentifiable: number;
  totalIncorrect: number;
  totalNoMatch: number;
  matchRatePercentage: number;
} {
  // Prefer new summary fields where available, fallback to legacy keys
  const totals = summaries.reduce(
    (acc, s) => {
      const matched = (s.matched_count ?? 0);
      const unidentifiable = (s.unidentifiable_count ?? s.less_than_equal_3_digits_count ?? 0);
      const incorrect = (s.incorrect_count ?? 0);
      const unmatched = (s.total_unmatched ?? s.no_match_count ?? 0);
      return {
        matched: acc.matched + matched,
        unidentifiable: acc.unidentifiable + unidentifiable,
        incorrect: acc.incorrect + incorrect,
        noMatch: acc.noMatch + unmatched
      };
    },
    { matched: 0, unidentifiable: 0, incorrect: 0, noMatch: 0 }
  );

  const totalRecords = totals.matched + totals.unidentifiable + totals.incorrect + totals.noMatch;
  const matchRatePercentage = totalRecords > 0 ? (totals.matched / totalRecords) * 100 : 0;

  return {
    totalMatched: totals.matched,
    totalUnidentifiable: totals.unidentifiable,
    totalIncorrect: totals.incorrect,
    totalNoMatch: totals.noMatch,
    matchRatePercentage: Math.round(matchRatePercentage * 100) / 100
  };
}

/**
 * Generate complete aggregated metrics for overview cards
 */
export async function generateAggregatedMetrics(
  startDate: string,
  endDate: string
): Promise<AggregatedMetrics> {
  console.log(`[generateAggregatedMetrics] Generating metrics for ${startDate} to ${endDate}`);
  
  try {
    // Fetch all data in parallel
    const [dateRangeData, slpDataArray] = await Promise.all([
      fetchDateRangeData(startDate, endDate),
      fetchAllSLPDataInRange(startDate, endDate)
    ]);
    
    // Extract summaries
    const summaries = Array.from(dateRangeData.values()).map(doc => doc.summary);
    
    // Calculate total activity metrics
    const totalPunches = slpDataArray.reduce((sum, r) => sum + r.totalPunches, 0);
    const totalUniquePunches = slpDataArray.reduce((sum, r) => sum + r.uniquePunches, 0);
    const totalDoubleEntries = slpDataArray.reduce((sum, r) => sum + r.doubleEntries, 0);
    const totalTripleEntries = slpDataArray.reduce((sum, r) => sum + r.tripleEntries, 0);
    
    // Calculate SLP performance metrics
    const slpStats = await aggregateSLPPerformance(slpDataArray);
    const highPerformersCount = Array.from(slpStats.values()).filter(
      s => s.performanceCategory === 'High'
    ).length;
    const lowPerformersCount = slpStats.size - highPerformersCount;
    
    const totalDaysActive = Array.from(slpStats.values()).reduce((sum, s) => sum + s.daysActive, 0);
    const avgPunchesPerSlpPerDay = totalDaysActive > 0 ? totalPunches / totalDaysActive : 0;
    
    // Calculate data quality metrics
    const qualityMetrics = calculateDataQualityMetrics(summaries);
    
    // Calculate coverage metrics
    const totalDatesWithData = dateRangeData.size;
    const totalUniqueSLPs = slpStats.size;
    const avgSLPsPerDay = totalDatesWithData > 0 ? slpDataArray.length / totalDatesWithData : 0;
    
    const metrics: AggregatedMetrics = {
      totalPunches,
      totalUniquePunches,
      totalDoubleEntries,
      totalTripleEntries,
      highPerformersCount,
      lowPerformersCount,
      avgPunchesPerSlpPerDay: Math.round(avgPunchesPerSlpPerDay * 100) / 100,
      totalMatched: qualityMetrics.totalMatched,
      totalUnidentifiable: qualityMetrics.totalUnidentifiable,
      totalIncorrect: qualityMetrics.totalIncorrect,
      totalNoMatch: qualityMetrics.totalNoMatch,
      matchRatePercentage: qualityMetrics.matchRatePercentage,
      totalDatesWithData,
      totalUniqueSLPs,
      avgSLPsPerDay: Math.round(avgSLPsPerDay * 100) / 100
    };
    
    console.log('[generateAggregatedMetrics] Metrics generated successfully');
    return metrics;
  } catch (error) {
    console.error('[generateAggregatedMetrics] Error:', error);
    throw error;
  }
}

/**
 * Generate chart data from raw data
 */
export async function generateChartData(
  startDate: string,
  endDate: string
): Promise<ChartData> {
  console.log(`[generateChartData] Generating chart data for ${startDate} to ${endDate}`);
  
  try {
    const [dateRangeData, slpDataArray] = await Promise.all([
      fetchDateRangeData(startDate, endDate),
      fetchAllSLPDataInRange(startDate, endDate)
    ]);
    
    // 1. Daily Punches Trend
    const dailyTrendMap = new Map<string, number>();
    slpDataArray.forEach(record => {
      // Note: We don't have date in SLPDataDocument, so we need to track it during fetching
      // For now, we'll aggregate by summary data
    });
    
    const dailyTrend: DailyTrendDataPoint[] = Array.from(dateRangeData.entries())
      .map(([date, doc]) => {
        // Sum punches for this date
        const datePunches = slpDataArray
          .filter(record => {
            // We'll need to add date tracking in fetchAllSLPDataInRange
            // For now, approximate based on summary
            return true;
          })
          .reduce((sum, r) => sum + r.totalPunches, 0);
        
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        
        return {
          date,
          totalPunches: datePunches / slpDataArray.length || 0, // Average approximation
          formattedDate
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // 2. Top 10 SLPs
    const slpStats = await aggregateSLPPerformance(slpDataArray);
    const topSLPs: TopSLPDataPoint[] = Array.from(slpStats.values())
      .sort((a, b) => b.totalPunches - a.totalPunches)
      .slice(0, 10)
      .map(stat => ({
        slpName: stat.slpName,
        totalPunches: stat.totalPunches,
        assembly: stat.assembly
      }));
    
    // 3. Data Quality Pie Chart
    const summaries = Array.from(dateRangeData.values()).map(doc => doc.summary);
    const qualityMetrics = calculateDataQualityMetrics(summaries);
    const totalRecords = qualityMetrics.totalMatched + qualityMetrics.totalUnidentifiable + 
                        qualityMetrics.totalIncorrect + qualityMetrics.totalNoMatch;
    
    const dataQuality: DataQualityDataPoint[] = [
      {
        name: 'Matched',
        value: qualityMetrics.totalMatched,
        percentage: totalRecords > 0 ? (qualityMetrics.totalMatched / totalRecords) * 100 : 0,
        color: '#10b981' // green
      },
      {
        name: 'Unidentifiable',
        value: qualityMetrics.totalUnidentifiable,
        percentage: totalRecords > 0 ? (qualityMetrics.totalUnidentifiable / totalRecords) * 100 : 0,
        color: '#f59e0b' // yellow
      },
      {
        name: 'Incorrect',
        value: qualityMetrics.totalIncorrect,
        percentage: totalRecords > 0 ? (qualityMetrics.totalIncorrect / totalRecords) * 100 : 0,
        color: '#f97316' // orange
      },
      {
        name: 'No Match',
        value: qualityMetrics.totalNoMatch,
        percentage: totalRecords > 0 ? (qualityMetrics.totalNoMatch / totalRecords) * 100 : 0,
        color: '#ef4444' // red
      }
    ];
    
    // 4. Calling Patterns (simplified without exact date tracking)
    const callingPatterns: CallingPatternDataPoint[] = Array.from(dateRangeData.keys())
      .sort()
      .map(date => {
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        
        // Aggregate for this date (approximation)
        const uniqueCalls = slpDataArray.reduce((sum, r) => sum + r.uniquePunches, 0) / slpDataArray.length || 0;
        const doubleCalls = slpDataArray.reduce((sum, r) => sum + r.doubleEntries, 0) / slpDataArray.length || 0;
        const tripleCalls = slpDataArray.reduce((sum, r) => sum + r.tripleEntries, 0) / slpDataArray.length || 0;
        
        return {
          date,
          uniqueCalls: Math.round(uniqueCalls),
          doubleCalls: Math.round(doubleCalls),
          tripleCalls: Math.round(tripleCalls),
          formattedDate
        };
      });
    
    const chartData: ChartData = {
      dailyTrend,
      topSLPs,
      dataQuality,
      callingPatterns
    };
    
    console.log('[generateChartData] Chart data generated successfully');
    return chartData;
  } catch (error) {
    console.error('[generateChartData] Error:', error);
    throw error;
  }
}

/**
 * Compute aggregated metrics from pre-fetched source (no additional reads)
 */
export async function generateAggregatedMetricsFromSource(
  source: { dateDocuments: Map<string, GharGharYatraDocument>; slpData: SLPDataWithDate[] }
): Promise<AggregatedMetrics> {
  const { dateDocuments, slpData } = source;

  const summaries = Array.from(dateDocuments.entries()).map(([date, doc]) => ({ date, s: doc.summary }));

  // Hybrid aggregation: per day, prefer summary totals when present; otherwise aggregate from slpData for that date
  let totalPunches = 0;
  let totalUniquePunches = 0;
  let totalDoubleEntries = 0;
  let totalTripleEntries = 0;

  const slpByDate = new Map<string, SLPDataWithDate[]>();
  for (const r of slpData) {
    const arr = slpByDate.get(r.date) || [];
    arr.push(r);
    slpByDate.set(r.date, arr);
  }

  for (const { date, s } of summaries) {
    const hasNew = s.total_punches !== undefined && s.total_unique_entries !== undefined && s.total_double_entries !== undefined && s.total_triple_and_more_entries !== undefined;
    if (hasNew) {
      totalPunches += s.total_punches || 0;
      totalUniquePunches += s.total_unique_entries || 0;
      totalDoubleEntries += s.total_double_entries || 0;
      totalTripleEntries += s.total_triple_and_more_entries || 0;
    } else {
      const rows = slpByDate.get(date) || [];
      totalPunches += rows.reduce((sum, r) => sum + r.totalPunches, 0);
      totalUniquePunches += rows.reduce((sum, r) => sum + r.uniquePunches, 0);
      totalDoubleEntries += rows.reduce((sum, r) => sum + r.doubleEntries, 0);
      totalTripleEntries += rows.reduce((sum, r) => sum + r.tripleEntries, 0);
    }
  }

  const perSlp = new Map<string, { punches: number; dates: Set<string> }>();
  slpData.forEach(r => {
    const entry = perSlp.get(r.slpId) || { punches: 0, dates: new Set<string>() };
    entry.punches += r.totalPunches;
    entry.dates.add(r.date);
    perSlp.set(r.slpId, entry);
  });
  let highPerformersCount = 0;
  perSlp.forEach(v => {
    const avg = v.punches / v.dates.size;
    if (avg > 10) highPerformersCount += 1;
  });
  const lowPerformersCount = perSlp.size - highPerformersCount;

  // Data Quality: reduce over summaries only (not the wrapper objects)
  const summariesOnly = summaries.map(({ s }) => s);
  const qualityMetrics = calculateDataQualityMetrics(summariesOnly);

  const totalDatesWithData = dateDocuments.size;
  const totalUniqueSLPs = perSlp.size;
  const avgSLPsPerDay = totalDatesWithData > 0 ? slpData.length / totalDatesWithData : 0;
  const totalDaysActive = Array.from(perSlp.values()).reduce((s, v) => s + v.dates.size, 0);

  return {
    totalPunches,
    totalUniquePunches,
    totalDoubleEntries,
    totalTripleEntries,
    highPerformersCount,
    lowPerformersCount,
    avgPunchesPerSlpPerDay: totalDaysActive > 0 ? Math.round((totalPunches / totalDaysActive) * 100) / 100 : 0,
    totalMatched: qualityMetrics.totalMatched,
    totalUnidentifiable: qualityMetrics.totalUnidentifiable,
    totalIncorrect: qualityMetrics.totalIncorrect,
    totalNoMatch: qualityMetrics.totalNoMatch,
    matchRatePercentage: qualityMetrics.matchRatePercentage,
    totalDatesWithData,
    totalUniqueSLPs,
    avgSLPsPerDay: Math.round(avgSLPsPerDay * 100) / 100
  };
}

/**
 * Generate chart data from pre-fetched source and minimal metadata (top 10 only)
 */
export async function generateChartDataFromSource(
  source: { dateDocuments: Map<string, GharGharYatraDocument>; slpData: SLPDataWithDate[] }
): Promise<ChartData> {
  const { dateDocuments, slpData } = source;

  // Build maps for calling patterns - prefer summary fields, fallback to slpData
  const punchesByDate = new Map<string, number>();
  const uniqueByDate = new Map<string, number>();
  const doubleByDate = new Map<string, number>();
  const tripleByDate = new Map<string, number>();

  // First pass: try to use pre-calculated summary fields
  dateDocuments.forEach((doc, date) => {
    const s = doc.summary;
    if (s.total_punches !== undefined && 
        s.total_unique_entries !== undefined && 
        s.total_double_entries !== undefined && 
        s.total_triple_and_more_entries !== undefined) {
      // Use pre-calculated fields (new data model)
      punchesByDate.set(date, s.total_punches);
      uniqueByDate.set(date, s.total_unique_entries);
      doubleByDate.set(date, s.total_double_entries);
      tripleByDate.set(date, s.total_triple_and_more_entries);
    }
  });

  // Second pass: for dates without pre-calculated fields, aggregate from slpData (fallback)
  slpData.forEach(r => {
    if (!punchesByDate.has(r.date)) {
      // Fallback aggregation for backward compatibility
      punchesByDate.set(r.date, (punchesByDate.get(r.date) || 0) + r.totalPunches);
      uniqueByDate.set(r.date, (uniqueByDate.get(r.date) || 0) + r.uniquePunches);
      doubleByDate.set(r.date, (doubleByDate.get(r.date) || 0) + r.doubleEntries);
      tripleByDate.set(r.date, (tripleByDate.get(r.date) || 0) + r.tripleEntries);
    }
  });
  const allDates = Array.from(new Set([
    ...Array.from(dateDocuments.keys()),
    ...Array.from(punchesByDate.keys())
  ])).sort();

  const dailyTrend: DailyTrendDataPoint[] = allDates.map(date => ({
    date,
    totalPunches: punchesByDate.get(date) || 0,
    formattedDate: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }));

  // Top SLPs - fetch metadata only for top 10
  const totalBySlp = new Map<string, number>();
  slpData.forEach(r => totalBySlp.set(r.slpId, (totalBySlp.get(r.slpId) || 0) + r.totalPunches));
  const topIds = Array.from(totalBySlp.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => id);
  const topMeta = await fetchSLPMetadataMap(topIds);
  const topSLPs: TopSLPDataPoint[] = topIds.map(id => ({
    slpName: topMeta.get(id)?.name || `SLP-${id.substring(0, 6)}`,
    totalPunches: totalBySlp.get(id) || 0,
    assembly: topMeta.get(id)?.assembly || 'Unknown Assembly'
  }));

  // Data quality
  const summaries = Array.from(dateDocuments.values()).map(doc => doc.summary);
  const qm = calculateDataQualityMetrics(summaries);
  const totalRecords = qm.totalMatched + qm.totalUnidentifiable + qm.totalIncorrect + qm.totalNoMatch;
  const dataQuality: DataQualityDataPoint[] = [
    { name: 'Matched', value: qm.totalMatched, percentage: totalRecords ? (qm.totalMatched / totalRecords) * 100 : 0, color: '#10b981' },
    { name: 'Unidentifiable (<3 digits)', value: qm.totalUnidentifiable, percentage: totalRecords ? (qm.totalUnidentifiable / totalRecords) * 100 : 0, color: '#f59e0b' },
    { name: 'Incorrect', value: qm.totalIncorrect, percentage: totalRecords ? (qm.totalIncorrect / totalRecords) * 100 : 0, color: '#f97316' },
    { name: 'Unmatched', value: qm.totalNoMatch, percentage: totalRecords ? (qm.totalNoMatch / totalRecords) * 100 : 0, color: '#ef4444' }
  ];

  // Calling patterns per date
  const callingPatterns: CallingPatternDataPoint[] = allDates.map(date => ({
    date,
    uniqueCalls: uniqueByDate.get(date) || 0,
    doubleCalls: doubleByDate.get(date) || 0,
    tripleCalls: tripleByDate.get(date) || 0,
    formattedDate: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }));

  return {
    dailyTrend,
    topSLPs,
    dataQuality,
    callingPatterns
  };
}

/**
 * Aggregate overall GGY summary for Home card (all dates)
 * - Sums summary.total_punches across all documents
 * - Sums summary.total_unique_entries (fallback: total_unique_punches)
 * - Computes matchedCount / totalParam2Values * 100 for matchRate
 * Uses homePageCache with CACHE_KEYS.GGY_OVERALL_SUMMARY
 */
export async function fetchGgyOverallSummary(forceRefresh: boolean = false): Promise<GgyHomeSummary> {
  try {
    if (!forceRefresh) {
      const cached = homePageCache.get<GgyHomeSummary>(CACHE_KEYS.GGY_OVERALL_SUMMARY);
      if (cached) return cached;
    }

    const colRef = collection(db, 'ghar_ghar_yatra');
    const snapshot = await getDocs(colRef);

    let totalPunches = 0;
    let totalUniqueEntries = 0;
    let matchedCount = 0;
    let totalParam2Values = 0;

    snapshot.forEach((d) => {
      const data: any = d.data();
      const s: any = data?.summary || {};
      totalPunches += Number(s.total_punches || 0);
      const uniqueVal = s.total_unique_entries ?? s.total_unique_punches ?? 0;
      totalUniqueEntries += Number(uniqueVal || 0);
      matchedCount += Number(s.matched_count || 0);
      totalParam2Values += Number(s.total_param2_values || 0);
    });

    const matchRate = totalParam2Values > 0 ? (matchedCount / totalParam2Values) * 100 : 0;
    const result: GgyHomeSummary = {
      totalPunches,
      totalUniqueEntries,
      matchedCount,
      totalParam2Values,
      matchRate: Math.round(matchRate * 10) / 10,
    };

    homePageCache.set(CACHE_KEYS.GGY_OVERALL_SUMMARY, result);
    return result;
  } catch (error) {
    console.error('[fetchGgyOverallSummary] Error:', error);
    return { totalPunches: 0, totalUniqueEntries: 0, matchedCount: 0, totalParam2Values: 0, matchRate: 0 };
  }
}

/**
 * Fetch other_data sub-collection with pagination
 * @param date Date in YYYY-MM-DD format
 * @param lastDoc Last document from previous page (for cursor-based pagination)
 * @param pageSize Number of entries per page (default 25)
 * @param filterType Filter by entry type: 'all', 'unmatched', or 'incorrect'
 */
export async function fetchOtherDataPaginated(
  date: string,
  lastDoc?: DocumentSnapshot,
  pageSize: number = 25,
  filterType: 'all' | 'unmatched' | 'incorrect' = 'all'
): Promise<{ entries: OtherDataDocument[]; pagination: PaginationState }> {
  console.log(`[fetchOtherDataPaginated] Fetching other_data for ${date}, filter: ${filterType}, pageSize: ${pageSize}`);
  
  try {
    const colRef = collection(db, 'ghar_ghar_yatra', date, 'other_data');
    // Order by totalPunches descending (highest first), then by documentId for stable pagination
    let q = query(colRef, orderBy('totalPunches', 'desc'), orderBy(documentId()), limit(pageSize));
    
    // Apply cursor for pagination
    if (lastDoc) {
      q = query(colRef, orderBy('totalPunches', 'desc'), orderBy(documentId()), startAfter(lastDoc), limit(pageSize));
    }
    
    const snapshot = await getDocs(q);
    
    let entries: OtherDataDocument[] = [];
    snapshot.forEach(doc => {
      const data = doc.data() as Omit<OtherDataDocument, 'entryType'>;
      const docId = doc.id;
      
      // Determine entry type from document ID
      let entryType: 'unmatched' | 'incorrect' = docId.startsWith('unmatched-') ? 'unmatched' : 'incorrect';
      
      // Apply filter
      if (filterType === 'all' || filterType === entryType) {
        entries.push({
          ...data,
          entryType
        });
      }
    });
    
    const lastVisible = snapshot.docs[snapshot.docs.length - 1];
    const hasMore = snapshot.docs.length === pageSize;
    
    console.log(`[fetchOtherDataPaginated] Fetched ${entries.length} entries, hasMore: ${hasMore}`);
    
    return {
      entries,
      pagination: {
        hasMore,
        lastVisible,
        currentPage: 0, // Will be managed by component
        totalFetched: entries.length
      }
    };
  } catch (error) {
    console.error('[fetchOtherDataPaginated] Error:', error);
    throw new Error(`Failed to fetch other_data for ${date}`);
  }
}

/**
 * Search other_data by phone number pattern
 * @param date Date in YYYY-MM-DD format
 * @param searchTerm Phone number digits to search
 * @param filterType Filter by entry type
 */
export async function searchOtherData(
  date: string,
  searchTerm: string,
  filterType: 'all' | 'unmatched' | 'incorrect' = 'all'
): Promise<OtherDataDocument[]> {
  console.log(`[searchOtherData] Searching other_data for ${date}, term: ${searchTerm}, filter: ${filterType}`);
  
  try {
    const colRef = collection(db, 'ghar_ghar_yatra', date, 'other_data');
    const snapshot = await getDocs(colRef);
    
    const results: OtherDataDocument[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data() as Omit<OtherDataDocument, 'entryType'>;
      const docId = doc.id;
      const entryType: 'unmatched' | 'incorrect' = docId.startsWith('unmatched-') ? 'unmatched' : 'incorrect';
      
      // Apply filter
      if (filterType !== 'all' && filterType !== entryType) {
        return;
      }
      
      // Search by phone number
      if (data.slpPhoneNumber && data.slpPhoneNumber.includes(searchTerm)) {
        results.push({
          ...data,
          entryType
        });
      }
    });
    
    // Sort results by totalPunches descending (highest first)
    results.sort((a, b) => b.totalPunches - a.totalPunches);
    
    console.log(`[searchOtherData] Found ${results.length} matching entries`);
    return results;
  } catch (error) {
    console.error('[searchOtherData] Error:', error);
    throw new Error(`Failed to search other_data for ${date}`);
  }
}
