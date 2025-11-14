// app/utils/mapSlpTrainingAggregator.ts
// Aggregates SLP Training data (slp_training) per assembly with fuzzy matching

import { fetchAllSlpTrainingRecords } from '@/app/utils/fetchSlpTrainingData';
import type { SlpTrainingRecord } from '@/models/slpTrainingTypes';
import { normalizeAssemblyName, jaroWinkler } from '@/app/utils/assemblyNameUtils';

export type MatchConfidence = 'high' | 'medium' | 'low' | 'unmatched';

export interface SlpTrainingAssemblyMetrics {
  totalSlps: number;
  trainedCount: number;
  pendingCount: number;
  inProgressCount: number;
  match: { matchAssembly: string | null; confidence: MatchConfidence; score: number };
}

// In-memory cache
let loaded = false;
let cache: {
  records: SlpTrainingRecord[];
  map: Map<string, { totalSlps: number; trained: number; pending: number; inProgress: number; names: Record<string, number> }>;
  representativeName: Map<string, string>;
} | null = null;

function buildMap(records: SlpTrainingRecord[]) {
  const m = new Map<string, { totalSlps: number; trained: number; pending: number; inProgress: number; names: Record<string, number> }>();
  for (const r of records) {
    const raw = r.assembly || 'Unknown Assembly';
    const key = normalizeAssemblyName(raw);
    const entry = m.get(key) || { totalSlps: 0, trained: 0, pending: 0, inProgress: 0, names: {} };
    entry.totalSlps += 1;
    if (r.status === 'trained') entry.trained += 1;
    else if (r.status === 'pending') entry.pending += 1;
    else if (r.status === 'in-progress') entry.inProgress += 1;
    entry.names[raw] = (entry.names[raw] || 0) + 1;
    m.set(key, entry);
  }
  return m;
}

async function loadSlpTrainingOnce() {
  if (loaded && cache) return cache;
  const records = await fetchAllSlpTrainingRecords();
  const map = buildMap(records);
  const representativeName = new Map<string, string>();
  for (const [k, v] of map.entries()) {
    const best = Object.entries(v.names).sort((a, b) => b[1] - a[1])[0]?.[0] || k;
    representativeName.set(k, best);
  }
  cache = { records, map, representativeName };
  loaded = true;
  return cache;
}

function classifyConfidence(score: number): MatchConfidence {
  if (score >= 0.93) return 'high';
  if (score >= 0.88) return 'medium';
  if (score >= 0.82) return 'low';
  return 'unmatched';
}

export async function getSlpTrainingMetricsForAssembly(assemblyName: string): Promise<SlpTrainingAssemblyMetrics> {
  const data = await loadSlpTrainingOnce();
  const baseKey = normalizeAssemblyName(assemblyName);

  let bestKey: string | null = null;
  let bestScore = -1;
  for (const key of data.map.keys()) {
    const score = jaroWinkler(baseKey, key);
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  const confidence = classifyConfidence(bestScore);
  if (!bestKey || confidence === 'unmatched') {
    return {
      totalSlps: 0,
      trainedCount: 0,
      pendingCount: 0,
      inProgressCount: 0,
      match: { matchAssembly: null, confidence, score: Math.max(0, bestScore) },
    };
  }

  const entry = data.map.get(bestKey)!;
  const matchAssembly = data.representativeName.get(bestKey) || bestKey;
  return {
    totalSlps: entry.totalSlps,
    trainedCount: entry.trained,
    pendingCount: entry.pending,
    inProgressCount: entry.inProgress,
    match: { matchAssembly, confidence, score: bestScore },
  };
}
