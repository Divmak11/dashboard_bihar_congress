// app/utils/mapManifestoComplaintsAggregator.ts
// Aggregates Manifesto Complaints (AC-level) per assembly with fuzzy matching

import { db } from '@/app/utils/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { normalizeAssemblyName, jaroWinkler, bestMatchKey, generateCandidateKeys } from '@/app/utils/assemblyNameUtils';

export type MatchConfidence = 'high' | 'medium' | 'low' | 'unmatched';

export interface ManifestoComplaintsAssemblyMetrics {
  totalComplaints: number;
  match: { matchAssembly: string | null; confidence: MatchConfidence; score: number };
}

let loaded = false;
let cache: {
  keyMap: Map<string, { total: number; names: Record<string, number> }>;
  representativeName: Map<string, string>;
  keys: Set<string>;
} | null = null;

async function loadComplaintsOnce() {
  if (loaded && cache) return cache;

  const coll = collection(db, 'manifesto-complaints');

  async function fetchByField(field: 'form_type' | 'from_type' | 'formType') {
    try {
      const q1 = query(coll, where(field, '==', 'ac-manifesto'));
      const snap = await getDocs(q1);
      return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    } catch {
      return [] as any[];
    }
  }

  // Try primary field first, then legacy variants
  let entries: any[] = await fetchByField('form_type');
  if (entries.length === 0) {
    const legacy = await fetchByField('from_type');
    const alt = await fetchByField('formType');
    const map = new Map<string, any>();
    [...entries, ...legacy, ...alt].forEach(e => map.set(e.id || Math.random().toString(), e));
    entries = Array.from(map.values());
  }

  const keyMap = new Map<string, { total: number; names: Record<string, number> }>();
  for (const rec of entries) {
    const raw = (rec.ac_name || '').toString().trim();
    if (!raw) continue;
    const key = normalizeAssemblyName(raw);
    const entry = keyMap.get(key) || { total: 0, names: {} };
    entry.total += 1;
    entry.names[raw] = (entry.names[raw] || 0) + 1;
    keyMap.set(key, entry);
  }

  const representativeName = new Map<string, string>();
  for (const [k, v] of keyMap.entries()) {
    const best = Object.entries(v.names).sort((a, b) => b[1] - a[1])[0]?.[0] || k;
    representativeName.set(k, best);
  }

  cache = {
    keyMap,
    representativeName,
    keys: new Set<string>([...keyMap.keys()])
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

export async function getManifestoComplaintsMetricsForAssembly(assemblyName: string): Promise<ManifestoComplaintsAssemblyMetrics> {
  const data = await loadComplaintsOnce();
  const candidates = generateCandidateKeys(assemblyName);
  const { key: bestKey, score } = bestMatchKey(data.keys.values(), candidates);
  const confidence = classifyConfidence(score);

  if (!bestKey || confidence === 'unmatched') {
    return {
      totalComplaints: 0,
      match: { matchAssembly: null, confidence, score: Math.max(0, score) }
    };
  }

  const entry = data.keyMap.get(bestKey)!;
  const matchAssembly = data.representativeName.get(bestKey) || bestKey;
  return {
    totalComplaints: entry.total,
    match: { matchAssembly, confidence, score }
  };
}
