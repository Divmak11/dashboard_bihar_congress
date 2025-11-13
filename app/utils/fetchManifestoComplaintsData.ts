// Firebase utility functions for manifesto complaints data
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  limit, 
  where, 
  startAfter,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  ManifestoComplaintFirebaseRecord, 
  ManifestoComplaintsFetchResponse, 
  ManifestoComplaintsFetchOptions 
} from '@/models/manifestoComplaintsTypes';

const COLLECTION_NAME = 'manifesto-complaints';

/**
 * Fetch manifesto complaints from Firebase with pagination and search
 */
export async function fetchManifestoComplaintsFromFirebase(
  options: ManifestoComplaintsFetchOptions = {}
): Promise<ManifestoComplaintsFetchResponse> {
  try {
    const {
      page = 1,
      limit: pageLimit = 25,
      search = '',
      acName = '',
    } = options;

    const collRef = collection(db, COLLECTION_NAME);

    async function runQuery(discriminatorField: 'form_type' | 'from_type' | 'formType') {
      let q1 = query(collRef);
      if (options.formType) {
        q1 = query(q1, where(discriminatorField, '==', options.formType));
      }
      if (acName && acName.trim() !== '') {
        q1 = query(q1, where('ac_name', '==', acName.trim()));
      }
      if (options.panchayatName && options.panchayatName.trim() !== '') {
        q1 = query(q1, where('panchayat_name', '==', options.panchayatName.trim()));
      }
      const snap = await getDocs(q1);
      const rows: ManifestoComplaintFirebaseRecord[] = [];
      snap.forEach((d) => {
        const data = d.data();
        rows.push({ id: d.id, ...data } as ManifestoComplaintFirebaseRecord);
      });
      return rows;
    }

    // Try the correct field first; if empty, fallback to legacy/variant field names
    let entries: ManifestoComplaintFirebaseRecord[] = await runQuery('form_type');
    if (entries.length === 0 && options.formType) {
      const legacy = await runQuery('from_type');
      const alt = entries.length === 0 ? await runQuery('formType') : [];
      // Merge uniquely by id
      const map = new Map<string, ManifestoComplaintFirebaseRecord>();
      [...entries, ...legacy, ...alt].forEach((e) => map.set(e.id || Math.random().toString(), e));
      entries = Array.from(map.values());
    }

    // Client-side search filter (for simplicity, could be moved to server-side with composite indexes)
    if (search && search.trim() !== '') {
      const searchTerm = search.toLowerCase().trim();
      entries = entries.filter(entry => {
        // Determine discriminator flexibly
        const discriminator = (entry as any).form_type || (entry as any).from_type || (entry as any).formType;
        // Search in AC name (AC records) or Panchayat name (Panchayat records)
        const nameField = discriminator === 'ac-manifesto' 
          ? String((entry as any).ac_name || '')
          : String((entry as any).panchayat_name || '');
        
        if (nameField.toLowerCase().includes(searchTerm)) return true;
        
        // Search in other string fields
        return Object.values(entry).some(val => 
          typeof val === 'string' && val.toLowerCase().includes(searchTerm)
        );
      });
    }

    // Sort in-memory by importedAt desc when available
    entries.sort((a, b) => (Number(b.importedAt || 0) - Number(a.importedAt || 0)));

    return {
      success: true,
      total: entries.length,
      entries,
      hasMore: false,
    };
  } catch (error: any) {
    console.error('[fetchManifestoComplaintsData] Error:', error);
    return {
      success: false,
      total: 0,
      entries: [],
      hasMore: false,
    };
  }
}

/**
 * Get total count of manifesto complaints in Firebase
 */
export async function getManifestoComplaintsCount(): Promise<number> {
  try {
    const collRef = collection(db, COLLECTION_NAME);
    const q = query(collRef);
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('[getManifestoComplaintsCount] Error:', error);
    return 0;
  }
}

/**
 * Check if manifesto complaints data exists in Firebase
 */
export async function hasManifestoComplaintsData(): Promise<boolean> {
  try {
    const count = await getManifestoComplaintsCount();
    return count > 0;
  } catch (error) {
    console.error('[hasManifestoComplaintsData] Error:', error);
    return false;
  }
}

/**
 * Get list of unique AC names from Firebase
 */
export async function getUniqueACNames(): Promise<string[]> {
  try {
    const collRef = collection(db, COLLECTION_NAME);
    const q = query(collRef, orderBy('ac_name'));
    const snapshot = await getDocs(q);
    
    const acNames = new Set<string>();
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.ac_name && typeof data.ac_name === 'string') {
        acNames.add(data.ac_name.trim());
      }
    });

    return Array.from(acNames).sort();
  } catch (error) {
    console.error('[getUniqueACNames] Error:', error);
    return [];
  }
}
