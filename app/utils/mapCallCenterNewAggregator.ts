// app/utils/mapCallCenterNewAggregator.ts
// Aggregates Call Center New converted users per assembly using convertedList.acName and fuzzy matching

import { db } from '@/app/utils/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { normalizeAssemblyName, generateCandidateKeys, bestMatchKey } from '@/app/utils/assemblyNameUtils';

export type MatchConfidence = 'high' | 'medium' | 'low' | 'unmatched';

export interface CallCenterNewAssemblyMetrics {
  conversions: number; // number of converted rows mapped to the assembly
  match: { matchAssembly: string | null; confidence: MatchConfidence; score: number };
}

let loaded = false;
let cache: {
  map: Map<string, { conversions: number; names: Record<string, number> }>;
  keys: Set<string>;
  representativeName: Map<string, string>;
} | null = null;

function classifyConfidence(score: number): MatchConfidence {
  if (score >= 0.93) return 'high';
  if (score >= 0.88) return 'medium';
  if (score >= 0.82) return 'low';
  return 'unmatched';
}

async function loadAllConvertedOnce() {
  if (loaded && cache) return cache;
  const coll = collection(db, 'call-center-external');
  const snap = await getDocs(coll);

  const map = new Map<string, { conversions: number; names: Record<string, number> }>();
  for (const d of snap.docs) {
    const data = d.data() as any;
    const list: Array<{ acName?: string }> = Array.isArray(data?.summary?.convertedList)
      ? data.summary.convertedList
      : [];
    for (const row of list) {
      const raw = (row?.acName || '').toString().trim();
      if (!raw) continue;
      const key = normalizeAssemblyName(raw);
      const entry = map.get(key) || { conversions: 0, names: {} };
      entry.conversions += 1;
      entry.names[raw] = (entry.names[raw] || 0) + 1;
      map.set(key, entry);
    }
  }

  const representativeName = new Map<string, string>();
  for (const [k, v] of map.entries()) {
    const best = Object.entries(v.names).sort((a, b) => b[1] - a[1])[0]?.[0] || k;
    representativeName.set(k, best);
  }

  cache = {
    map,
    keys: new Set<string>([...map.keys()]),
    representativeName,
  };
  loaded = true;
  return cache;
}

export async function getCallCenterNewMetricsForAssembly(assemblyName: string): Promise<CallCenterNewAssemblyMetrics> {
  const data = await loadAllConvertedOnce();
  const candidates = generateCandidateKeys(assemblyName);
  let bestKey: string | null = null;
  let bestScore = -1;
  const { key, score } = bestMatchKey(data.keys.values(), candidates);
  bestKey = key; bestScore = score;
  const confidence = classifyConfidence(bestScore);

  if (!bestKey || confidence === 'unmatched') {
    return {
      conversions: 0,
      match: { matchAssembly: null, confidence, score: Math.max(0, bestScore) },
    };
  }

  const entry = data.map.get(bestKey)!;
  const matchAssembly = data.representativeName.get(bestKey) || bestKey;
  return {
    conversions: entry.conversions,
    match: { matchAssembly, confidence, score: bestScore },
  };
}
