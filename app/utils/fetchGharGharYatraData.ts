/**
 * Data fetching utilities for Ghar-Ghar Yatra Analytics module
 * Handles Firebase queries, data aggregation, and metadata resolution
 */

import { db } from './firebase';
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
  endDate: string
): Promise<{ dateDocuments: Map<string, GharGharYatraDocument>; slpData: SLPDataWithDate[]; existingDates: string[] }> {
  console.time('[Overview] fetchOverviewSourceData');
  const existingDates = await listExistingDatesInRange(startDate, endDate);
  if (existingDates.length === 0) {
    console.timeEnd('[Overview] fetchOverviewSourceData');
    return { dateDocuments: new Map(), slpData: [], existingDates: [] };
  }
  const [dateDocuments, slpData] = await Promise.all([
    fetchDateDocumentsForDates(existingDates),
    fetchAllSLPDataForDates(existingDates)
  ]);
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
 * Fetch SLP metadata from wtm-slp collection by document IDs
 */
export async function fetchSLPMetadataMap(slpIds: string[]): Promise<Map<string, SLPMetadata>> {
  console.log(`[fetchSLPMetadataMap] Fetching metadata for ${slpIds.length} SLPs`);
  
  const metadataMap = new Map<string, SLPMetadata>();
  
  if (slpIds.length === 0) {
    return metadataMap;
  }
  
  try {
    // Direct document fetch by ID - NO chunking needed
    const slpPromises = slpIds.map(slpId => 
      getDoc(doc(db, 'wtm-slp', slpId))
    );
    
    const slpDocs = await Promise.all(slpPromises);
    
    slpDocs.forEach((slpDoc, index) => {
      const slpId = slpIds[index];
      
      if (slpDoc.exists()) {
        const data = slpDoc.data();
        metadataMap.set(slpId, {
          name: data.name || `SLP-${slpId.substring(0, 8)}`,
          assembly: data.assembly || 'Unknown Assembly',
          phoneNumber: data.phoneNumber || data.mobileNumber || 'N/A'
        });
      } else {
        // Fallback for missing SLP
        metadataMap.set(slpId, {
          name: `Unknown SLP (${slpId.substring(0, 8)})`,
          assembly: 'Unknown Assembly',
          phoneNumber: 'N/A'
        });
      }
    });
    
    console.log(`[fetchSLPMetadataMap] Resolved ${metadataMap.size} SLP metadata entries`);
    return metadataMap;
  } catch (error) {
    console.error('[fetchSLPMetadataMap] Error fetching SLP metadata:', error);
    throw new Error('Failed to fetch SLP metadata');
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
  const totals = summaries.reduce(
    (acc, summary) => ({
      matched: acc.matched + summary.matched_count,
      unidentifiable: acc.unidentifiable + summary.unidentifiable_count,
      incorrect: acc.incorrect + summary.incorrect_count,
      noMatch: acc.noMatch + summary.no_match_count
    }),
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

  const summaries = Array.from(dateDocuments.values()).map(doc => doc.summary);

  // Prefer pre-calculated summary fields (new data model), fallback to aggregation (old data)
  let totalPunches = 0;
  let totalUniquePunches = 0;
  let totalDoubleEntries = 0;
  let totalTripleEntries = 0;
  let usedPreCalculated = false;

  // Check if all summaries have the new fields
  const allHaveNewFields = summaries.every(s => 
    s.total_punches !== undefined && 
    s.total_unique_entries !== undefined && 
    s.total_double_entries !== undefined && 
    s.total_triple_and_more_entries !== undefined
  );

  if (allHaveNewFields && summaries.length > 0) {
    // Use pre-calculated totals from summary (fast path)
    totalPunches = summaries.reduce((sum, s) => sum + (s.total_punches || 0), 0);
    totalUniquePunches = summaries.reduce((sum, s) => sum + (s.total_unique_entries || 0), 0);
    totalDoubleEntries = summaries.reduce((sum, s) => sum + (s.total_double_entries || 0), 0);
    totalTripleEntries = summaries.reduce((sum, s) => sum + (s.total_triple_and_more_entries || 0), 0);
    usedPreCalculated = true;
    console.log('[Metrics] Using pre-calculated summary fields (optimized)');
  } else {
    // Fallback to aggregating from slpData (backward compatibility)
    totalPunches = slpData.reduce((sum, r) => sum + r.totalPunches, 0);
    totalUniquePunches = slpData.reduce((sum, r) => sum + r.uniquePunches, 0);
    totalDoubleEntries = slpData.reduce((sum, r) => sum + r.doubleEntries, 0);
    totalTripleEntries = slpData.reduce((sum, r) => sum + r.tripleEntries, 0);
    console.log('[Metrics] Using aggregated slpData (backward compatibility fallback)');
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

  const qualityMetrics = calculateDataQualityMetrics(summaries);

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
    { name: 'Unidentifiable', value: qm.totalUnidentifiable, percentage: totalRecords ? (qm.totalUnidentifiable / totalRecords) * 100 : 0, color: '#f59e0b' },
    { name: 'Incorrect', value: qm.totalIncorrect, percentage: totalRecords ? (qm.totalIncorrect / totalRecords) * 100 : 0, color: '#f97316' },
    { name: 'No Match', value: qm.totalNoMatch, percentage: totalRecords ? (qm.totalNoMatch / totalRecords) * 100 : 0, color: '#ef4444' }
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
