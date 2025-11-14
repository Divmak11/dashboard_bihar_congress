// app/utils/mapWhatsappAggregator.ts
// Aggregates WhatsApp data per assembly with fuzzy matching to the selected assembly

import { fetchWhatsappGroupsByType } from '@/app/utils/fetchWhatsappData';
import type { WhatsappGroup, WhatsappSummary } from '@/models/whatsappTypes';
import { normalizeAssemblyName, jaroWinkler } from '@/app/utils/assemblyNameUtils';

export type MatchConfidence = 'high' | 'medium' | 'low' | 'unmatched';

export interface WhatsappAssemblyMatch {
  matchAssembly: string | null; // representative source assembly string
  confidence: MatchConfidence;
  score: number;
}

export interface WhatsappAssemblyMetrics {
  groupsInAssembly: number;
  membersInAssembly: number;
  byType?: {
    shakti: { groups: number; members: number };
    wtm: { groups: number; members: number };
    public: { groups: number; members: number };
  };
  overall?: { totalGroups: number; totalMembers: number; totalAssemblies: number };
  match: WhatsappAssemblyMatch;
}

// Simple in-memory cache for a single-page session
let loaded = false;
let cache: {
  shakti: WhatsappGroup[];
  wtm: WhatsappGroup[];
  public: WhatsappGroup[];
  summary: WhatsappSummary;
  // combined metrics keyed by normalized assembly key
  combinedByAssembly: Map<string, { groups: number; members: number }>;
  byTypeMaps: {
    shakti: Map<string, { groups: number; members: number; names: Record<string, number> }>;
    wtm: Map<string, { groups: number; members: number; names: Record<string, number> }>;
    public: Map<string, { groups: number; members: number; names: Record<string, number> }>;
  };
  // Representative original name for each normalized key
  representativeName: Map<string, string>;
} | null = null;

function sumMembers(groups: WhatsappGroup[]): number {
  return groups.reduce((sum, g) => {
    const members = parseInt((g as any)['Group Members'] || '0', 10);
    return sum + (isNaN(members) ? 0 : members);
  }, 0);
}

async function loadAllWhatsappOnce() {
  if (loaded && cache) return cache;

  const [shakti, wtm, pub] = await Promise.all([
    fetchWhatsappGroupsByType('shakti'),
    fetchWhatsappGroupsByType('wtm'),
    fetchWhatsappGroupsByType('public'),
  ]);

  const summary: WhatsappSummary = {
    totalGroups: shakti.length + wtm.length + pub.length,
    totalMembers: sumMembers([...shakti, ...wtm, ...pub]),
    totalAssemblies: new Set([...shakti, ...wtm, ...pub].map((g) => g.Assembly).filter(Boolean)).size,
    shaktiGroups: shakti.length,
    wtmGroups: wtm.length,
    publicGroups: pub.length,
  };

  // Build per-type maps keyed by normalized assembly
  const toMap = (arr: WhatsappGroup[]) => {
    const m = new Map<string, { groups: number; members: number; names: Record<string, number> }>();
    for (const g of arr) {
      const raw = g.Assembly || 'Unknown Assembly';
      const key = normalizeAssemblyName(raw);
      const members = parseInt((g as any)['Group Members'] || '0', 10);
      const entry = m.get(key) || { groups: 0, members: 0, names: {} };
      entry.groups += 1;
      entry.members += isNaN(members) ? 0 : members;
      entry.names[raw] = (entry.names[raw] || 0) + 1;
      m.set(key, entry);
    }
    return m;
  };

  const shaktiMap = toMap(shakti);
  const wtmMap = toMap(wtm);
  const publicMap = toMap(pub);

  // Build combined map and representative names
  const combined = new Map<string, { groups: number; members: number }>();
  const repName = new Map<string, string>();

  const accumulate = (key: string, add: { groups: number; members: number }) => {
    const cur = combined.get(key) || { groups: 0, members: 0 };
    combined.set(key, { groups: cur.groups + add.groups, members: cur.members + add.members });
  };

  const collectRep = (key: string, names: Record<string, number>) => {
    const existing = repName.get(key);
    if (!existing) {
      // choose the most frequent raw name as representative
      const best = Object.entries(names).sort((a, b) => b[1] - a[1])[0]?.[0] || key;
      repName.set(key, best);
    }
  };

  for (const [k, v] of shaktiMap.entries()) {
    accumulate(k, v);
    collectRep(k, v.names);
  }
  for (const [k, v] of wtmMap.entries()) {
    accumulate(k, v);
    collectRep(k, v.names);
  }
  for (const [k, v] of publicMap.entries()) {
    accumulate(k, v);
    collectRep(k, v.names);
  }

  cache = {
    shakti,
    wtm,
    public: pub,
    summary,
    combinedByAssembly: combined,
    byTypeMaps: { shakti: shaktiMap, wtm: wtmMap, public: publicMap },
    representativeName: repName,
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

export async function getWhatsappMetricsForAssembly(assemblyName: string): Promise<WhatsappAssemblyMetrics> {
  const data = await loadAllWhatsappOnce();
  const baseKey = normalizeAssemblyName(assemblyName);

  // Find best key by similarity
  let bestKey: string | null = null;
  let bestScore = -1;
  for (const key of data.combinedByAssembly.keys()) {
    const score = jaroWinkler(baseKey, key);
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  const confidence = classifyConfidence(bestScore);
  if (!bestKey || confidence === 'unmatched') {
    return {
      groupsInAssembly: 0,
      membersInAssembly: 0,
      byType: {
        shakti: { groups: 0, members: 0 },
        wtm: { groups: 0, members: 0 },
        public: { groups: 0, members: 0 },
      },
      overall: {
        totalGroups: data.summary.totalGroups,
        totalMembers: data.summary.totalMembers,
        totalAssemblies: data.summary.totalAssemblies,
      },
      match: { matchAssembly: null, confidence, score: Math.max(0, bestScore) },
    };
  }

  const combined = data.combinedByAssembly.get(bestKey) || { groups: 0, members: 0 };
  const sk = data.byTypeMaps.shakti.get(bestKey) || { groups: 0, members: 0, names: {} };
  const wk = data.byTypeMaps.wtm.get(bestKey) || { groups: 0, members: 0, names: {} };
  const pk = data.byTypeMaps.public.get(bestKey) || { groups: 0, members: 0, names: {} };
  const matchAssembly = data.representativeName.get(bestKey) || bestKey;

  return {
    groupsInAssembly: combined.groups,
    membersInAssembly: combined.members,
    byType: {
      shakti: { groups: sk.groups, members: sk.members },
      wtm: { groups: wk.groups, members: wk.members },
      public: { groups: pk.groups, members: pk.members },
    },
    overall: {
      totalGroups: data.summary.totalGroups,
      totalMembers: data.summary.totalMembers,
      totalAssemblies: data.summary.totalAssemblies,
    },
    match: { matchAssembly, confidence, score: bestScore },
  };
}
