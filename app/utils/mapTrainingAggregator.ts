// app/utils/mapTrainingAggregator.ts
// Aggregates Training data per assembly (WTM and Shakti) with fuzzy matching

import { fetchTrainingRecords, computeTotalAttendees } from '@/app/utils/fetchTrainingData';
import type { TrainingRecord } from '@/models/trainingTypes';
import { normalizeAssemblyName, jaroWinkler } from '@/app/utils/assemblyNameUtils';

export type MatchConfidence = 'high' | 'medium' | 'low' | 'unmatched';

export interface TrainingAssemblyMetrics {
  wtm: { sessions: number; attendees: number };
  shakti: { sessions: number; attendees: number };
  totals: { sessions: number; attendees: number };
  match: { matchAssembly: string | null; confidence: MatchConfidence; score: number };
}

// In-memory cache for a session
let loaded = false;
let cache: {
  wtm: TrainingRecord[];
  shakti: TrainingRecord[];
  maps: {
    wtm: Map<string, { sessions: number; attendees: number; names: Record<string, number> }>;
    shakti: Map<string, { sessions: number; attendees: number; names: Record<string, number> }>;
  };
  combinedKeys: Set<string>;
  representativeName: Map<string, string>;
} | null = null;

function buildMap(records: TrainingRecord[]) {
  const m = new Map<string, { sessions: number; attendees: number; names: Record<string, number> }>();
  for (const r of records) {
    const raw = r.assembly || 'Unknown Assembly';
    const key = normalizeAssemblyName(raw);
    const entry = m.get(key) || { sessions: 0, attendees: 0, names: {} };
    entry.sessions += 1;
    entry.attendees += computeTotalAttendees(r);
    entry.names[raw] = (entry.names[raw] || 0) + 1;
    m.set(key, entry);
  }
  return m;
}

async function loadTrainingOnce() {
  if (loaded && cache) return cache;
  const [wtm, shakti] = await Promise.all([
    fetchTrainingRecords('wtm'),
    fetchTrainingRecords('shakti-data'),
  ]);
  const wtmMap = buildMap(wtm);
  const shaktiMap = buildMap(shakti);
  const combinedKeys = new Set<string>([...wtmMap.keys(), ...shaktiMap.keys()]);
  const representativeName = new Map<string, string>();

  // Choose representative raw name by frequency
  const chooseRep = (key: string, names: Record<string, number>) => {
    if (representativeName.has(key)) return;
    const best = Object.entries(names).sort((a, b) => b[1] - a[1])[0]?.[0] || key;
    representativeName.set(key, best);
  };
  for (const [k, v] of wtmMap.entries()) chooseRep(k, v.names);
  for (const [k, v] of shaktiMap.entries()) chooseRep(k, v.names);

  cache = {
    wtm,
    shakti,
    maps: { wtm: wtmMap, shakti: shaktiMap },
    combinedKeys,
    representativeName,
  };
  loaded = true;
  return cache;
}

function classifyConfidence(score: number): MatchConfidence {
  if (score >= 0.93) return 'high';
  if (score >= 0.88) return 'medium';
  if (score >= 0.82) return 'low';
  return 'unmatched';
}

export async function getTrainingMetricsForAssembly(assemblyName: string): Promise<TrainingAssemblyMetrics> {
  const data = await loadTrainingOnce();
  const baseKey = normalizeAssemblyName(assemblyName);

  // Find best matching key across combined
  let bestKey: string | null = null;
  let bestScore = -1;
  for (const key of data.combinedKeys.values()) {
    const score = jaroWinkler(baseKey, key);
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  const confidence = classifyConfidence(bestScore);
  if (!bestKey || confidence === 'unmatched') {
    return {
      wtm: { sessions: 0, attendees: 0 },
      shakti: { sessions: 0, attendees: 0 },
      totals: { sessions: 0, attendees: 0 },
      match: { matchAssembly: null, confidence, score: Math.max(0, bestScore) },
    };
  }

  const wtmEntry = data.maps.wtm.get(bestKey) || { sessions: 0, attendees: 0, names: {} };
  const shaktiEntry = data.maps.shakti.get(bestKey) || { sessions: 0, attendees: 0, names: {} };
  const matchAssembly = data.representativeName.get(bestKey) || bestKey;

  const totals = {
    sessions: wtmEntry.sessions + shaktiEntry.sessions,
    attendees: wtmEntry.attendees + shaktiEntry.attendees,
  };
  return {
    wtm: { sessions: wtmEntry.sessions, attendees: wtmEntry.attendees },
    shakti: { sessions: shaktiEntry.sessions, attendees: shaktiEntry.attendees },
    totals,
    match: { matchAssembly, confidence, score: bestScore },
  };
}
