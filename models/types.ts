/**
 * TypeScript interfaces for data models used in the WTM-SLP module
 */

/**
 * Interface for User documents from the "users" collection
 */
export interface User {
  uid: string;
  role: 'Zonal Incharge' | 'Assembly Coordinator' | 'SLP' | string;
  departmentHead: string;
  name: string;
  assembly?: string;
  village?: string;
  block?: string;
  district?: string;
  state?: string;
  phoneNumber?: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Interface for AdminUser documents from the "admin-users" collection
 */
export interface AdminUser {
  id: string;           // Firebase Auth UID
  email: string;        // User's email address
  role: 'zonal-incharge' | 'admin' | 'other'; // User role
  assemblies: string[]; // Array of assigned assembly constituencies
  createdAt: any;       // Timestamp of account creation
}

/**
 * Interface for entries from the "wtm-slp" collection
 */
export interface WtmSlpEntry {
  id: string;
  dateOfVisit: string; // in "YYYY-MM-DD" format
  form_type?: 'meetings' | 'activity' | 'assembly-wa' | string;
  type?: 'meetings' | 'activity' | 'assembly-wa' | string; // for older documents
  userId?: string; // UID of the creator
  handler_id?: string; // UID of the coordinator handling this entry
  recommendedPosition?: string;
  onboardingStatus?: string;
  
  // Fields for WhatsApp groups (assembly-wa type)
  groupName?: string;
  membersCount?: number;
  status?: 'Active' | 'Inactive' | string;
  contentFlow?: string;
  
  // Fields for activities
  activityType?: string;
  activityDescription?: string;
  participants?: number;
  
  // Common fields
  location?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // Meeting leader fields
  name?: string;
  mobileNumber?: string;
  caste?: string;
  levelOfInfluence?: string;
  activityStatus?: string;
  village?: string;
  panchayat?: string;
  block?: string;
  gender?: string;
  category?: string;
  profession?: string;
  profile?: string;
  remarks?: string;
  
  // Assembly information
  assembly?: string;
  district?: string;
  
  // Additional fields that might exist
  ideologicalInclination?: string;
  partyInclination?: string;
  trainingId?: string;
  created_at?: number;
}

/**
 * Interface for summary data shown on the WTM-SLP dashboard
 */
export interface WtmSlpSummary {
  totalMeetings: number;
  totalSlps: number;
  totalOnboarded: number;
}

/**
 * Interface for member activities from the "slp-activity" collection
 */
export interface MemberActivity {
  id: string;
  form_type?: 'members' | string;
  type?: 'members' | string;
  handler_id?: string;
  name?: string;
  phone?: string;          // Updated to match sample data
  phoneNumber?: string;    // Keep for backward compatibility
  mobileNumber?: string;   // Keep for backward compatibility
  assembly?: string;
  block?: string;
  panchayat?: string;
  village?: string;
  category?: string;
  caste?: string;
  profession?: string;
  gender?: string;
  notes?: string;
  remarks?: string;
  createdAt?: string | number;  // Updated to handle both string and number
  updatedAt?: string;
  created_at?: number;
  additionalDetails?: string;
  status?: string;
  
  // New fields from the sample data
  dateOfVisit?: string;    // Date in YYYY-MM-DD format
  boothNo?: number;        // Booth number
  lateEntry?: boolean;     // Whether this was a late entry
}

/**
 * Interface for coordinator details including their performance metrics
 */
export interface CoordinatorDetails {
  personalInfo: User;
  meetingsSummary: {
    meetings: number;
    slpsAdded: number;
    onboarded: number;
  };
  // Add meetings array to store actual meeting entries
  meetings: WtmSlpEntry[];
  activities: WtmSlpEntry[];
  whatsappGroups: WtmSlpEntry[];
  // New field for member activities
  members?: MemberActivity[];
  // New field for detailed meetings with additional processing
  detailedMeetings?: WtmSlpEntry[] | Record<string, string>[];
} 