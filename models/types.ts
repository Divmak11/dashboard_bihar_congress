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
  role: 'zonal-incharge' | 'dept-head' | 'admin' | 'other'; // User role
  assemblies: string[]; // Array of assigned assembly constituencies
  createdAt: any;       // Timestamp of account creation
  parentVertical?: 'wtm' | 'shakti-abhiyaan' | string; // Vertical tag
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
 * Interface for SLP Training activities from the "slp-activity" collection
 */
export interface SlpTrainingActivity {
  id: string;
  form_type: 'slp-training';
  dateOfTraining: string;
  assembly: string;
  location: string;
  expectedParticipants: number;
  actualParticipants: number;
  memberIds: string[];
  participantRatings: Record<string, number>;
  summary: string;
  feedback: string;
  handler_id: string;
  trainingId?: string;
  createdAt: any;
  created_at?: number;
  updatedAt?: any;
  updated_at?: number;
}

/**
 * Interface for Panchayat WhatsApp group activities from the "slp-activity" collection
 */
export interface PanchayatWaActivity {
  id: string;
  form_type: 'panchayat-wa';
  groupName: string;
  panchayat: string;
  assembly: string;
  link: string;
  members: number;
  status: 'Active' | 'Inactive' | string;
  handler_id: string;
  trainingId?: string;
  contentFlow?: string;
  createdAt: any;
  created_at?: number;
  lastUpdated?: string;
  updated_at?: number;
}

/**
 * Interface for Mai Bahin Yojna form activities from the "slp-activity" collection
 */
export interface MaiBahinYojnaActivity {
  id: string;
  form_type: 'mai-bahin-yojna';
  date: string;
  assembly: string;
  formsDistributed: number;
  formsCollected: number;
  handler_id: string;
  late_entry: boolean;
  createdAt: any;
  created_at?: number;
}

/**
 * Interface for Local Issue Video activities from the "slp-activity" collection
 */
export interface LocalIssueVideoActivity {
  id: string;
  form_type: 'local-issue-video';
  date_submitted: string;
  assembly: string;
  description: string;
  video_link: string;
  storage_path: string;
  handler_id: string;
  late_entry: boolean;
  image_links?: any;
  createdAt: any;
  created_at?: number;
}

/**
 * Interface for Chaupal (Weekly Meeting) activities from the "slp-activity" collection
 */
export interface ChaupalActivity {
  id: string;
  form_type: 'weekly_meeting';
  type?: 'weekly_meeting';
  handler_id: string;
  assembly?: string;
  dateFormatted: string; // Date in YYYY-MM-DD format
  meetingDate: string; // Date in DD-MM-YYYY format
  location: string;
  notes: string;
  totalMembers: number;
  selectedMembers: string[]; // Array of member IDs
  trainingId: string;
  audioUrl?: string;
  videoUrl?: string;
  videoDescription?: string;
  photoUrls?: string[];
  createdAt: number; // Epoch timestamp
  updatedAt: number; // Epoch timestamp
  date: number; // Epoch timestamp
  parentVertical?: string;
  // Additional fields for UI compatibility
  dateOfVisit?: string; // Mapped from dateFormatted
  coordinatorName?: string; // Mapped from handler_id
  village?: string; // Mapped from location
  topic?: string; // Mapped from notes
  attendees?: number; // Mapped from totalMembers
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
  // New activity arrays
  trainingActivities?: SlpTrainingActivity[];
  panchayatWaActivities?: PanchayatWaActivity[];
  maiBahinYojnaActivities?: MaiBahinYojnaActivity[];
  localIssueVideoActivities?: LocalIssueVideoActivity[];
  chaupalActivities?: ChaupalActivity[];
} 