// app/utils/mapHoverCombinedAggregator.ts
// Build a compact 4-metric snapshot for Map hover tooltips by composing existing vertical aggregators.
// Metrics:
// - Nukkad Meetings (WTM AC + WTM SLP + Shakti AC)
// - WhatsApp Groups (total in assembly)
// - Training Sessions (WTM + Shakti totals)
// - Manifesto Complaints (total complaints)

import { getWhatsappMetricsForAssembly } from '@/app/utils/mapWhatsappAggregator';
import { getTrainingMetricsForAssembly } from '@/app/utils/mapTrainingAggregator';
import { getManifestoComplaintsMetricsForAssembly } from '@/app/utils/mapManifestoComplaintsAggregator';
import { getSlpTrainingMetricsForAssembly } from '@/app/utils/mapSlpTrainingAggregator';
import { fetchDetailedNukkadAc, fetchDetailedNukkadSlp } from '@/app/utils/fetchHierarchicalData';

export interface CombinedHoverMetrics {
  nukkadMeetings: number;
  whatsappGroups: number;
  trainingSessions: number;
  manifestoComplaints: number;
  slpTraining: number;
}

// Simple in-memory cache with TTL
const cache = new Map<string, { data: CombinedHoverMetrics; ts: number }>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

function makeAssemblyVariations(assembly: string): string[] {
  const arr = new Set<string>([
    assembly,
    assembly.toLowerCase(),
    assembly.toUpperCase(),
    `${assembly} (SC)`,
    `${assembly} (ST)`,
    `${assembly} (General)`
  ]);
  return Array.from(arr);
}

export async function getCombinedHoverMetricsForAssembly(assembly: string): Promise<CombinedHoverMetrics> {
  const key = assembly.trim();
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && now - cached.ts < TTL_MS) {
    return cached.data;
  }

  // Defaults
  let nukkadMeetings = 0;
  let whatsappGroups = 0;
  let trainingSessions = 0;
  let manifestoComplaints = 0;
  let slpTraining = 0;

  const variations = makeAssemblyVariations(assembly);

  try {
    // Parallel fetches for non-Nukkad metrics (these already do matching internally)
    const [wa, training, manifesto, slpTrainingMetrics] = await Promise.all([
      getWhatsappMetricsForAssembly(assembly).catch(() => null),
      getTrainingMetricsForAssembly(assembly).catch(() => null),
      getManifestoComplaintsMetricsForAssembly(assembly).catch(() => null),
      getSlpTrainingMetricsForAssembly(assembly).catch(() => null),
    ]);

    if (wa) {
      whatsappGroups = Number(wa.groupsInAssembly || 0);
    }
    if (training) {
      const total = Number(training?.totals?.sessions ?? 0);
      // If totals.sessions is missing, fallback to wtm.sessions + shakti.sessions
      const fallback = Number(training?.wtm?.sessions ?? 0) + Number(training?.shakti?.sessions ?? 0);
      trainingSessions = total || fallback || 0;
    }
    if (manifesto) {
      manifestoComplaints = Number((manifesto as any).totalComplaints || 0);
    }
    if (slpTrainingMetrics) {
      slpTraining = Number(slpTrainingMetrics.totalSlps || 0);
    }

    // Nukkad (WTM AC + WTM SLP + Shakti AC)
    const [wtmAc, wtmSlp, shaktiAc] = await Promise.all([
      fetchDetailedNukkadAc({ level: 'assembly', assemblies: variations, vertical: 'wtm' }).catch(() => []),
      fetchDetailedNukkadSlp({ level: 'assembly', assemblies: variations }).catch(() => []),
      fetchDetailedNukkadAc({ level: 'assembly', assemblies: variations, vertical: 'shakti-abhiyaan' }).catch(() => []),
    ]);
    nukkadMeetings = (wtmAc?.length || 0) + (wtmSlp?.length || 0) + (shaktiAc?.length || 0);
  } catch (err) {
    // Swallow errors; defaults remain 0 to keep tooltip robust.
    console.error('[getCombinedHoverMetricsForAssembly] Error:', err);
  }

  const data: CombinedHoverMetrics = {
    nukkadMeetings,
    whatsappGroups,
    trainingSessions,
    manifestoComplaints,
    slpTraining,
  };
  cache.set(key, { data, ts: now });
  return data;
}
