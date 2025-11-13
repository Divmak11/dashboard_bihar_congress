// Types for Manifesto Complaints (AC and Panchayat levels)

export type ManifestoFormType = 'ac-manifesto' | 'panchayat-manifesto';

// Base interface for common manifesto complaint fields
interface BaseManifestoComplaintRecord {
  form_type: ManifestoFormType;
  // Grievance columns (values can be numbers or strings depending on sheet)
  health_service_oriented_grievances?: number | string;
  water_linked_grievances?: number | string;
  grievances_resultant_of_prohibition?: number | string;
  demands_around_tackling_unemployement?: number | string;
  all_encompassing_demands_over_development?: number | string;
  grievances_arising_out_of_land_disputes_and_ownership_deficiancy?: number | string;
  explicit_inexplicit_struggles_caused_due_to_caste_discrimination?: number | string;
  demands_and_grievances_related_to_educational_apparatus?: number | string;
  grievances_due_to_criminal_activities?: number | string;
  grievances_related_to_the_situation_of_agriculture_agriculturists_and_peasents?: number | string;
  specific_demands_to_tackle_grievances_arisen_due_to_lack_of_infrastructure?: number | string;
  complaints_and_grievances_related_to_inaccessibility_of_welfare_services?: number | string;

  // Optional metadata
  _source?: {
    file?: string;
    sheet?: string;
    row?: number;
  };
}

// AC Manifesto complaint record
export interface ManifestoComplaintACRecord extends BaseManifestoComplaintRecord {
  form_type: 'ac-manifesto';
  ac_name: string; // "AC Name"
}

// Panchayat Manifesto complaint record
export interface ManifestoComplaintPanchayatRecord extends BaseManifestoComplaintRecord {
  form_type: 'panchayat-manifesto';
  vard?: string; // "vard" column
  panchayat_name: string; // "Panchayat Name"
}

// Union type for all manifesto complaint records
export type ManifestoComplaintRecord = ManifestoComplaintACRecord | ManifestoComplaintPanchayatRecord;

export interface ManifestoComplaintsACResponse {
  total: number;
  entries: ManifestoComplaintACRecord[];
}

// Firebase-specific types for fetching data
export type ManifestoComplaintFirebaseRecord = ManifestoComplaintRecord & {
  id?: string; // Firestore document ID
  importedAt?: number; // Import timestamp
};

export interface ManifestoComplaintsFetchResponse {
  success: boolean;
  total: number;
  entries: ManifestoComplaintFirebaseRecord[];
  hasMore?: boolean;
  nextCursor?: string;
}

export interface ManifestoComplaintsFetchOptions {
  page?: number;
  limit?: number;
  search?: string;
  formType?: ManifestoFormType; // Filter by form type
  acName?: string; // Filter by AC name (AC forms only)
  panchayatName?: string; // Filter by panchayat name (Panchayat forms only)
  cursor?: string;
}

// Import operation response
export interface ManifestoComplaintsImportResponse {
  success: boolean;
  message: string;
  imported: number;
  errors?: string[];
}
