// app/utils/mapGgyAggregator.ts
// Aggregates Ghar-Ghar Yatra metrics per assembly with fuzzy matching

import { buildGGYSegmentData } from '@/app/utils/fetchGharGharYatraData';
import { normalizeAssemblyName, generateCandidateKeys, bestMatchKey } from '@/app/utils/assemblyNameUtils';

export type MatchConfidence = 'high' | 'medium' | 'low' | 'unmatched';

export interface GgyAssemblyMetrics {
  totalPunches: number;
  uniquePunches: number;
  topMember?: { name: string; totalPunches: number };
  match: { matchAssembly: string | null; confidence: MatchConfidence; score: number };
}

function classifyConfidence(score: number): MatchConfidence {
  if (score >= 0.93) return 'high';
  if (score >= 0.88) return 'medium';
  if (score >= 0.82) return 'low';
  return 'unmatched';
}

function todayYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Default wide range; buildGGYSegmentData uses caching and only fetches existing date docs
const DEFAULT_START = '2024-01-01';
const DEFAULT_END = todayYMD();

export async function getGgyMetricsForAssembly(assemblyName: string, startDate: string = DEFAULT_START, endDate: string = DEFAULT_END): Promise<GgyAssemblyMetrics> {
  // Build the overall segment once; includes assemblyGroups generated from SLP data
  const segment = await buildGGYSegmentData(startDate, endDate, `${startDate} to ${endDate}`);
  const groups = segment.assemblyGroups || [];

  // Prepare dataset keys (normalized) to match against
  const keyToGroup = new Map<string, typeof groups[number]>();
  const keySet = new Set<string>();
  groups.forEach((g) => {
    const k = normalizeAssemblyName(g.assembly || '');
    if (!k) return;
    keyToGroup.set(k, g);
    keySet.add(k);
  });

  const candidates = generateCandidateKeys(assemblyName);
  const { key: bestKey, score } = bestMatchKey(keySet.values(), candidates);
  const confidence = classifyConfidence(score);

  if (!bestKey || confidence === 'unmatched') {
    return {
      totalPunches: 0,
      uniquePunches: 0,
      match: { matchAssembly: null, confidence, score: Math.max(0, score) },
    };
  }

  const group = keyToGroup.get(bestKey)!;
  const totalPunches = group.totalPunches ?? group.members.reduce((s, m) => s + (m.totalPunches || 0), 0);
  const uniquePunches = group.members.reduce((s, m) => s + (m.uniquePunches || 0), 0);
  const top = [...group.members].sort((a, b) => (b.totalPunches || 0) - (a.totalPunches || 0))[0];
  const matchAssembly = group.assembly;

  return {
    totalPunches,
    uniquePunches,
    topMember: top ? { name: top.slpName, totalPunches: top.totalPunches } : undefined,
    match: { matchAssembly, confidence, score },
  };
}
