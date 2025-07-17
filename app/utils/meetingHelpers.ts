import { WtmSlpEntry, MemberActivity } from "../../models/types";

/**
 * Interface representing the standardized format for meeting data in the UI
 */
export interface MeetingDisplayData {
  // Coordinator and assembly information
  coordinatorName: string;
  assemblyName: string;
  
  // Leader personal information
  leaderName: string;
  phoneNumber: string;
  caste: string;
  levelOfInfluence: string;
  activityStatus: string;
  
  // Location information
  village: string;
  panchayat: string;
  block: string;
  district: string;
  
  // Date information
  meetingDate: string;
  
  // Demographics
  gender: string;
  age: string;
  category: string;
  
  // Professional information
  profession: string;
  profileDetails: string;
  
  // Political information
  partyInclination: string;
  
  // Additional information
  remark: string;
  email: string;
  
  // Classification
  recommendedPosition: string;
  onboardingStatus: string;
  
  // Original document ID
  documentId: string;
}

/**
 * Converts a WtmSlpEntry (raw data from Firebase) to a standardized MeetingDisplayData format
 * for consistent display in the UI
 * 
 * @param meeting - The raw meeting data from Firebase
 * @param coordinatorName - The name of the coordinator (optional)
 * @param assemblyName - The name of the assembly (optional)
 * @returns A standardized meeting object for display
 */
export function formatMeetingForDisplay(
  meeting: WtmSlpEntry,
  coordinatorName?: string,
  assemblyName?: string
): MeetingDisplayData {
  return {
    // Coordinator and assembly information
    coordinatorName: coordinatorName || "Unknown",
    assemblyName: assemblyName || meeting.assembly || "Unknown",
    
    // Leader personal information
    leaderName: meeting.name || "Unknown Leader",
    phoneNumber: meeting.mobileNumber || "",
    caste: meeting.caste || "",
    levelOfInfluence: meeting.levelOfInfluence || "Medium",
    activityStatus: meeting.activityStatus || "Active",
    
    // Location information
    village: meeting.village || "",
    panchayat: meeting.panchayat || "",
    block: meeting.block || "",
    district: meeting.district || "",
    
    // Date information
    meetingDate: meeting.dateOfVisit || "",
    
    // Demographics
    gender: meeting.gender || "",
    age: "", // Age might not be available
    category: meeting.category || "",
    
    // Professional information
    profession: meeting.profession || "",
    profileDetails: meeting.profile || "",
    
    // Political information
    partyInclination: meeting.partyInclination || "",
    
    // Additional information
    remark: meeting.remarks || "",
    email: "",
    
    // Classification
    recommendedPosition: meeting.recommendedPosition || "Other",
    onboardingStatus: meeting.onboardingStatus || "Not Onboarded",
    
    // Original document ID
    documentId: meeting.id
  };
}

/**
 * Converts a MeetingDisplayData object to the format expected by the DashboardHome component
 * 
 * @param meeting - The standardized meeting data
 * @returns An object with the key-value pairs expected by DashboardHome
 */
export function convertToMeetingRow(meeting: MeetingDisplayData): Record<string, string> {
  return {
    "assembly field coordinator": meeting.coordinatorName,
    "assembly name": meeting.assemblyName,
    "leader name": meeting.leaderName,
    "phone number": meeting.phoneNumber,
    "caste": meeting.caste,
    "level of influence": meeting.levelOfInfluence,
    "activity status": meeting.activityStatus,
    "village": meeting.village,
    "panchayat": meeting.panchayat,
    "block": meeting.block,
    "district": meeting.district,
    "date": meeting.meetingDate,
    "gender": meeting.gender,
    "age": meeting.age,
    "category": meeting.category,
    "leader's current profession": meeting.profession,
    "leader's detailed profile": meeting.profileDetails,
    "party inclination": meeting.partyInclination,
    "remark": meeting.remark,
    "email address": meeting.email,
    "recommended position": meeting.recommendedPosition,
    "onboarding status": meeting.onboardingStatus,
    "document id": meeting.documentId
  };
} 

/**
 * Converts a MemberActivity (raw data from Firebase) to a standardized MeetingDisplayData format
 * for consistent display in the UI, similar to how meetings are displayed
 * 
 * @param member - The raw member activity data from Firebase
 * @param slpName - The name of the SLP (optional)
 * @param assemblyName - The name of the assembly (optional)
 * @returns A standardized meeting object for display
 */
export function formatMemberActivityForDisplay(
  member: MemberActivity,
  slpName?: string,
  assemblyName?: string
): MeetingDisplayData {
  return {
    // Coordinator and assembly information
    coordinatorName: slpName || "--",
    assemblyName: assemblyName || member.assembly || "--",
    
    // Leader personal information - treat the member as the "leader"
    leaderName: member.name || "--",
    phoneNumber: member.phone || member.phoneNumber || member.mobileNumber || "--",
    caste: member.caste || "--",
    levelOfInfluence: "--",  // Not typically available for members
    activityStatus: "Active",  // Default to Active since status isn't available
    
    // Location information
    village: member.village || "--",
    panchayat: member.panchayat || "--",
    block: member.block || "--",
    district: "--",  // Not typically available for members
    
    // Date information - use dateOfVisit as primary source
    meetingDate: member.dateOfVisit || 
                (typeof member.createdAt === 'number' 
                  ? new Date(member.createdAt).toISOString().split('T')[0] 
                  : member.createdAt || "--"),
    
    // Demographics
    gender: member.gender || "--",
    age: "--",  // Not typically available for members
    category: member.category || "--",
    
    // Professional information
    profession: member.profession || "--",
    profileDetails: member.additionalDetails || "--",
    
    // Political information
    partyInclination: "--",  // Not typically available for members
    
    // Additional information
    remark: member.remarks || member.notes || "--",
    email: "--",
    
    // Classification - these are not typically available for members
    recommendedPosition: "--",
    onboardingStatus: "--",
    
    // Original document ID
    documentId: member.id
  };
} 