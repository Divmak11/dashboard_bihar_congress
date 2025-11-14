import { db } from '@/app/utils/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import {
  WhatsappGroup,
  WhatsappAssemblyGroup, 
  WhatsappSummary,
  WhatsappPageData,
  WhatsappFormType,
  WhatsappTabCounts
} from '@/models/whatsappTypes';

/**
 * Fetches WhatsApp groups filtered by form_type
 * Uses single field query to avoid composite indexes
 */
export async function fetchWhatsappGroupsByType(formType: WhatsappFormType): Promise<WhatsappGroup[]> {
  console.log(`[fetchWhatsappGroupsByType] Fetching groups for form_type: ${formType}`);
  
  try {
    const whatsappCollection = collection(db, 'whatsapp_data');
    const q = query(
      whatsappCollection,
      where('form_type', '==', formType)
    );
    
    const querySnapshot = await getDocs(q);
    const groups: WhatsappGroup[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as WhatsappGroup;
      groups.push(data);
    });
    
    console.log(`[fetchWhatsappGroupsByType] Found ${groups.length} groups for ${formType}`);
    return groups;
  } catch (error) {
    console.error(`[fetchWhatsappGroupsByType] Error fetching ${formType} groups:`, error);
    return [];
  }
}

/**
 * Groups WhatsApp groups by assembly and calculates totals
 * Client-side processing to avoid composite indexes
 */
export function groupWhatsappDataByAssembly(groups: WhatsappGroup[]): WhatsappAssemblyGroup[] {
  console.log(`[groupWhatsappDataByAssembly] Grouping ${groups.length} groups by assembly`);
  
  const assemblyMap = new Map<string, WhatsappGroup[]>();
  
  // Group by assembly
  groups.forEach(group => {
    const assembly = group.Assembly || 'Unknown Assembly';
    if (!assemblyMap.has(assembly)) {
      assemblyMap.set(assembly, []);
    }
    assemblyMap.get(assembly)!.push(group);
  });
  
  // Convert to array and calculate totals
  const assemblyGroups: WhatsappAssemblyGroup[] = Array.from(assemblyMap.entries()).map(([assembly, groups]) => {
    const totalMembers = groups.reduce((sum, group) => {
      const members = parseInt(group['Group Members'] || '0', 10);
      return sum + (isNaN(members) ? 0 : members);
    }, 0);
    
    return {
      assembly,
      groups,
      totalGroups: groups.length,
      totalMembers
    };
  });
  
  // Sort alphabetically by assembly name
  assemblyGroups.sort((a, b) => a.assembly.localeCompare(b.assembly));
  
  console.log(`[groupWhatsappDataByAssembly] Created ${assemblyGroups.length} assembly groups`);
  return assemblyGroups;
}

/**
 * Calculates summary statistics from all groups
 */
export function computeWhatsappSummary(
  shaktiGroups: WhatsappGroup[],
  wtmGroups: WhatsappGroup[],
  publicGroups: WhatsappGroup[]
): WhatsappSummary {
  const allGroups = [...shaktiGroups, ...wtmGroups, ...publicGroups];
  
  const totalMembers = allGroups.reduce((sum, group) => {
    const members = parseInt(group['Group Members'] || '0', 10);
    return sum + (isNaN(members) ? 0 : members);
  }, 0);
  
  const assemblies = new Set(allGroups.map(g => g.Assembly).filter(Boolean));
  
  const summary: WhatsappSummary = {
    totalGroups: allGroups.length,
    totalMembers,
    totalAssemblies: assemblies.size,
    shaktiGroups: shaktiGroups.length,
    wtmGroups: wtmGroups.length,
    publicGroups: publicGroups.length
  };
  
  console.log('[computeWhatsappSummary] Summary calculated:', summary);
  return summary;
}

/**
 * Fetches all WhatsApp data for the vertical page
 * Fetches each form_type separately to avoid complex queries
 */
export async function fetchAllWhatsappData(): Promise<WhatsappPageData> {
  console.log('[fetchAllWhatsappData] Starting fetch for all form types');
  
  try {
    // Fetch all form types in parallel
    const [shaktiGroups, wtmGroups, publicGroups] = await Promise.all([
      fetchWhatsappGroupsByType('shakti'),
      fetchWhatsappGroupsByType('wtm'),
      fetchWhatsappGroupsByType('public')
    ]);
    
    // Group by assembly for each type
    const shaktiData = groupWhatsappDataByAssembly(shaktiGroups);
    const wtmData = groupWhatsappDataByAssembly(wtmGroups);
    const publicData = groupWhatsappDataByAssembly(publicGroups);
    
    // Compute overall summary
    const summary = computeWhatsappSummary(shaktiGroups, wtmGroups, publicGroups);
    
    console.log('[fetchAllWhatsappData] All data fetched successfully');
    
    return {
      shaktiData,
      wtmData,
      publicData,
      summary
    };
  } catch (error) {
    console.error('[fetchAllWhatsappData] Error fetching WhatsApp data:', error);
    
    // Return empty data on error
    return {
      shaktiData: [],
      wtmData: [],
      publicData: [],
      summary: {
        totalGroups: 0,
        totalMembers: 0,
        totalAssemblies: 0,
        shaktiGroups: 0,
        wtmGroups: 0,
        publicGroups: 0
      }
    };
  }
}

/**
 * Fetches tab counts for tab labels
 * Efficient version that only counts without fetching full data
 */
export async function fetchWhatsappTabCounts(): Promise<WhatsappTabCounts> {
  console.log('[fetchWhatsappTabCounts] Fetching tab counts');
  
  try {
    const [shaktiGroups, wtmGroups, publicGroups] = await Promise.all([
      fetchWhatsappGroupsByType('shakti'),
      fetchWhatsappGroupsByType('wtm'),
      fetchWhatsappGroupsByType('public')
    ]);
    
    return {
      shakti: shaktiGroups.length,
      wtm: wtmGroups.length,
      public: publicGroups.length
    };
  } catch (error) {
    console.error('[fetchWhatsappTabCounts] Error fetching tab counts:', error);
    return {
      shakti: 0,
      wtm: 0,
      public: 0
    };
  }
}

/**
 * Fetches summary for home page card
 * Returns basic metrics without detailed data
 */
export async function fetchWhatsappHomeSummary(): Promise<Pick<WhatsappSummary, 'totalGroups' | 'totalAssemblies'>> {
  console.log('[fetchWhatsappHomeSummary] Fetching home card summary');
  
  try {
    const whatsappCollection = collection(db, 'whatsapp_data');
    const querySnapshot = await getDocs(whatsappCollection);
    
    const assemblies = new Set<string>();
    let totalGroups = 0;
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as WhatsappGroup;
      totalGroups++;
      if (data.Assembly) {
        assemblies.add(data.Assembly);
      }
    });
    
    const summary = {
      totalGroups,
      totalAssemblies: assemblies.size
    };
    
    console.log('[fetchWhatsappHomeSummary] Home summary:', summary);
    return summary;
  } catch (error) {
    console.error('[fetchWhatsappHomeSummary] Error fetching home summary:', error);
    return {
      totalGroups: 0,
      totalAssemblies: 0
    };
  }
}
