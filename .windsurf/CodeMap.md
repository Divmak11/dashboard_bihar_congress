# Code Map - Bihar Congress Dashboard

## Table of Contents
1. [Project Overview](#project-overview)
2. [Directory Structure](#directory-structure)
3. [Firebase Collections & Schemas](#firebase-collections--schemas)
4. [Identifier Semantics & Handler ID Patterns](#identifier-semantics--handler-id-patterns)
5. [Query Patterns & Firestore Constraints](#query-patterns--firestore-constraints)
6. [Date/Timezone Handling](#datetimezone-handling)
7. [Navigation & State Management](#navigation--state-management)
8. [Component Architecture](#component-architecture)
9. [API Functions & Data Flow](#api-functions--data-flow)
10. [Known Pitfalls & Solutions](#known-pitfalls--solutions)

---

## Project Overview

**Tech Stack:**
- Framework: Next.js 14+ (App Router)
- Language: TypeScript
- Database: Firebase Firestore
- Auth: Firebase Auth
- Styling: Tailwind CSS
- State: React Hooks (useState, useEffect)
- Maps: Leaflet (for assembly constituency visualization)

**Core Modules:**
- WTM-SLP Dashboard (Samvidhan Leaders Program)
- Shakti Abhiyaan Dashboard
- Hierarchical Navigation (Zone → Assembly → AC → SLP)
- Activity Tracking & Reporting

---

## Directory Structure

```
my-dashboard/
├── app/                          # Next.js App Router pages
│   ├── auth/                     # Authentication page
│   ├── dashboard/                # Main dashboard
│   ├── wtm-slp/                  # Legacy WTM-SLP dashboard
│   ├── wtm-slp-new/              # New hierarchical dashboard
│   ├── map/                      # Map visualization
│   ├── report/                   # Reporting module
│   └── utils/                    # Core utility functions
│       ├── fetchFirebaseData.ts  # Firebase data fetching
│       ├── fetchHierarchicalData.ts # Hierarchical data logic
│       ├── firebase.ts           # Firebase config
│       ├── errorUtils.ts         # Error handling
│       ├── reportDataAggregation.ts # Zone-wise report aggregation
│       └── pdfGenerator.tsx      # PDF report generation
├── components/                   # Reusable components
│   ├── hierarchical/             # Hierarchical dashboard components
│   │   ├── DetailedView.tsx     # Detailed data view
│   │   ├── MetricCard.tsx       # Metric display cards
│   │   ├── HierarchicalNavigation.tsx # Navigation dropdowns
│   │   ├── ActivitiesList.tsx   # Activities table
│   │   ├── MembersList.tsx      # Members table
│   │   ├── VideosList.tsx       # Videos table
│   │   └── [other lists]        # Other activity tables
│   ├── ReportGenerator.tsx       # Report generation component
│   ├── DashboardHome.tsx         # Dashboard home component
│   ├── DateRangeFilter.tsx      # Date filtering component
│   └── NavBar.tsx                # Navigation bar
├── models/                       # TypeScript type definitions
│   ├── types.ts                  # Core data types
│   ├── hierarchicalTypes.ts     # Hierarchy-specific types
│   └── reportTypes.ts            # Report types (Zone-wise structure)
└── .windsurf/                    # Project documentation
    ├── PRD.md                    # Product requirements
    ├── Plan.md                   # Implementation plan
    ├── Tasks.md                  # Task tracking
    └── CodeMap.md                # This file
```

---

## Firebase Collections & Schemas

### 1. **users** Collection
```typescript
{
  uid: string,                    // Document ID
  role: 'Zonal Incharge' | 'Assembly Coordinator' | 'SLP' | 'ASLP',
  name: string,
  assembly?: string,              // Assembly constituency
  assemblies?: string[],          // For multi-assembly ACs
  handler_id?: string,            // Parent coordinator ID
  phoneNumber?: string,
  email?: string,
  independent?: boolean,          // For independent SLPs
  // Location fields
  village?: string,
  block?: string,
  district?: string,
  state?: string
}
```

### 2. **admin-users** Collection
```typescript
{
  id: string,                     // Firebase Auth UID (Document ID)
  email: string,
  role: 'admin' | 'zonal-incharge' | 'dept-head' | 'other',
  assemblies: string[],           // Assigned assemblies
  parentVertical?: 'wtm' | 'shakti-abhiyaan',  // Vertical assignment
  createdAt: Timestamp
}
```

### 3. **wtm-slp** Collection
```typescript
{
  // Meeting/Activity fields
  dateOfVisit: string,            // YYYY-MM-DD format
  form_type?: 'meetings' | 'activity' | 'assembly-wa',
  type?: 'meetings' | 'activity' | 'assembly-wa',  // Legacy field
  handler_id?: string,            // AC/SLP who created entry
  assembly?: string,
  
  // SLP recruitment fields
  recommendedPosition?: 'SLP',    // Marks as potential SLP
  onboardingStatus?: 'Onboarded' | 'Pending',
  
  // Person details (for meetings)
  name?: string,
  mobileNumber?: string,
  caste?: string,
  profession?: string,
  gender?: string,
  
  // WhatsApp group fields
  groupName?: string,
  membersCount?: number,
  status?: 'Active' | 'Inactive'
}
```

### 4. **slp-activity** Collection
```typescript
{
  // Common fields
  handler_id: string,             // SLP/ASLP ID (can be doc ID or handler_id property)
  assembly: string,
  parentVertical?: 'wtm' | 'shakti-abhiyaan',
  
  // Activity type (one of these)
  form_type: 'members' | 'slp-training' | 'panchayat-wa' | 
             'mai-bahin-yojna' | 'local-issue-video' | 'weekly_meeting',
  type?: string,                  // Legacy field
  
  // Date fields (varies by activity type)
  dateOfVisit?: string,           // For members
  dateOfTraining?: string,        // For training
  date?: string,                  // For mai-bahin
  date_submitted?: string,        // For videos
  dateFormatted?: string,         // For chaupals
  
  // Activity-specific fields...
  lateEntry?: boolean,            // Late submission flag
  created_at?: number,            // Epoch timestamp
}
```

### 5. **shakti-abhiyaan** Collection
```typescript
{
  // Coordinator coverage
  coveredAssemblyCoordinators: [{
    id: string,                   // AC ID
    name: string,
    assembly: string,
    slps: [{                      // Shakti SLPs under this AC
      id: string,                 // Shakti SLP ID (used as handler_id)
      name: string,
      // Other SLP fields...
    }]
  }],
  
  // Activity fields
  parentVertical: 'shakti-abhiyaan',
  // Similar structure to slp-activity
}
```

### 6. **zones** Collection (for Report Generation)
```typescript
{
  id: string,                     // Zone ID (Document ID)
  name: string,                   // Zone name with format: "Zone X - Incharge Name"
  parentVertical: 'wtm' | 'shakti-abhiyaan',  // Vertical assignment
  assemblies: string[],           // List of assembly names under this zone
  zonalIncharge?: string,         // Zonal coordinator UID
  active?: boolean,               // Zone status
  createdAt?: Timestamp,
  updatedAt?: Timestamp
}
```

---

## Identifier Semantics & Handler ID Patterns

### Regular SLP Pattern
- **Document ID**: Used as primary identifier (`slp.uid`)
- **Handler ID in activities**: Matches SLP document ID
- **Query pattern**: `where('handler_id', '==', slp.uid)`

### ASLP (Associated SLP) Pattern
- **Document ID**: Primary identifier (`slp.uid`)
- **Handler ID property**: May have separate `handler_id` field
- **Activities can use EITHER**:
  - Document ID as handler_id
  - handler_id property as handler_id
- **Query pattern**: `where('handler_id', 'in', [slp.uid, slp.handler_id])`

### Shakti SLP Pattern
- **Document ID**: Not used for activity matching
- **Shakti ID**: Special `shaktiId` property used as handler_id
- **Query pattern**: `where('handler_id', '==', slp.shaktiId)`
- **Source**: From `shakti-abhiyaan` collection's `coveredAssemblyCoordinators[].slps[]`

### AC (Assembly Coordinator) Pattern
- **Regular AC**: From `users` collection with `role: 'Assembly Coordinator'`
- **Shakti AC**: From `shakti-abhiyaan` collection's `coveredAssemblyCoordinators[]`
- **Multi-assembly support**: Can have `assemblies[]` array

### Implementation Example
```typescript
// In fetchFirebaseData.ts - getSlpMemberActivity()
if (slp.role === 'ASLP') {
  const possibleIds = [slp.uid];
  if (slp.handler_id) {
    possibleIds.push(slp.handler_id);
  }
  baseQuery = query(collection, where('handler_id', 'in', possibleIds));
} else if (slp.isShaktiSLP && slp.shaktiId) {
  baseQuery = query(collection, where('handler_id', '==', slp.shaktiId));
} else {
  baseQuery = query(collection, where('handler_id', '==', slp.uid));
}
```

---

## Query Patterns & Firestore Constraints

### Assembly Chunking Pattern (>10 assemblies)
**Constraint**: Firestore `in` operator limited to 10 values
**Solution**: Chunk assemblies and run parallel queries

```typescript
// In fetchHierarchicalData.ts
if (assemblies && assemblies.length > 0) {
  const uniqueAssemblies = [...new Set(assemblies)];
  
  if (uniqueAssemblies.length <= 10) {
    // Single query
    const q = query(collection, where('assembly', 'in', uniqueAssemblies));
    results = await getDocs(q);
  } else {
    // Chunk into groups of 10
    const chunks = [];
    for (let i = 0; i < uniqueAssemblies.length; i += 10) {
      chunks.push(uniqueAssemblies.slice(i, i + 10));
    }
    
    // Parallel queries
    const promises = chunks.map(chunk => 
      getDocs(query(collection, where('assembly', 'in', chunk)))
    );
    const chunkResults = await Promise.all(promises);
    
    // Merge and deduplicate
    const dataMap = new Map();
    chunkResults.forEach(snap => {
      snap.forEach(doc => {
        if (!dataMap.has(doc.id)) {
          dataMap.set(doc.id, { ...doc.data(), id: doc.id });
        }
      });
    });
  }
}
```

### Dual Query Pattern (form_type vs type)
**Issue**: Legacy documents use `type`, new ones use `form_type`
**Solution**: Query both fields and merge results

```typescript
// In fetchFirebaseData.ts
const q1 = query(collection, where('form_type', '==', 'meetings'));
const q2 = query(collection, where('type', '==', 'meetings'));
const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

// Deduplicate using Map
const resultsMap = new Map();
[snap1, snap2].forEach(snap => {
  snap.forEach(doc => {
    if (!resultsMap.has(doc.id)) {
      resultsMap.set(doc.id, doc.data());
    }
  });
});
```

### Date Filtering Patterns

**JavaScript Post-Fetch Filtering** (for consistency):
```typescript
// Used in getWtmSlpSummary, fetchDetailedMeetings
if (startDate && endDate) {
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  endDateObj.setHours(23, 59, 59, 999);
  
  results = results.filter(doc => {
    if (!doc.dateOfVisit) return false;
    const docDate = new Date(doc.dateOfVisit);
    return docDate >= startDateObj && docDate <= endDateObj;
  });
}
```

**Timestamp-Based Firestore Filtering** (for SLP activities):
```typescript
// Used in SLP activity functions
if (dateRange) {
  const startDate = new Date(dateRange.startDate);
  const endDate = new Date(dateRange.endDate);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  
  baseQuery = query(
    baseQuery,
    where('dateOfVisit', '>=', startDate),
    where('dateOfVisit', '<=', endDate)
  );
}
```

---

## Date/Timezone Handling

### Timezone-Safe Date Formatting
**Location**: `components/DateRangeFilter.tsx`
```typescript
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```
**Why**: Avoids UTC conversion issues with `toISOString()`

### Date Range Presets
- **All Time**: No date filters
- **Last Day**: T-1 (yesterday only)
- **Last Week**: T-7 to T-1
- **Last 3 Months**: 3 months ending yesterday
- **Custom Range**: User-specified dates

### Date Field Mapping by Activity Type
| Activity Type | Date Field |
|--------------|------------|
| Members | `dateOfVisit` |
| Training | `dateOfTraining` |
| Panchayat WA | `created_at` (epoch) |
| Mai-Bahin | `date` |
| Videos | `date_submitted` |
| Chaupals | `dateFormatted` |
| Meetings | `dateOfVisit` |

---

## Navigation & State Management

### Hierarchical Navigation Flow
```
Zone → Assembly → AC → SLP
```

### State Reset Rules
**Location**: `app/wtm-slp-new/page.tsx`

1. **Zone Change**: Reset assembly, AC, and SLP selections
2. **Assembly Change**: Reset AC and SLP selections
3. **AC Change**: Reset SLP selection
4. **Vertical Change**: Reset all selections

```typescript
// Zone change effect
useEffect(() => {
  if (!selectedZoneId) {
    setAssemblies([]);
    setSelectedAssembly(null);
    setSelectedAcId(null);
    setSelectedSlpId(null);
    return;
  }
  // Reset child selections
  setSelectedAssembly(null);
  setSelectedAcId(null);
  setSelectedSlpId(null);
  // Fetch new assemblies
  fetchAssemblies(selectedZoneId).then(setAssemblies);
}, [selectedZoneId]);
```

### Vertical Locking Rules
- **Admin**: Can switch between all verticals
- **Zonal Incharge**: Locked to their `parentVertical`
- **Dept Head**: Locked to their `parentVertical`
- Implementation: Hide vertical selector, auto-set vertical

### Data Fetching Options Interface
```typescript
interface FetchMetricsOptions {
  level: 'zone' | 'assembly' | 'ac' | 'slp';
  zoneId?: string;
  assemblies?: string[];
  handler_id?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  slp?: {
    uid: string;
    handler_id?: string;
    isShaktiSLP?: boolean;
    shaktiId?: string;
  };
  vertical?: 'wtm' | 'shakti-abhiyaan';
}
```

---

## Component Architecture

### Core Components Hierarchy

```
app/wtm-slp-new/page.tsx (Main Page)
├── HierarchicalNavigation.tsx (Dropdowns)
├── DateRangeFilter.tsx (Date Selection)
├── MetricCard.tsx (Summary Cards)
│   └── onClick → DetailedView.tsx
└── DetailedView.tsx (Modal)
    ├── MeetingsList.tsx
    ├── MembersList.tsx
    ├── VideosList.tsx
    ├── ActivitiesList.tsx
    ├── ChaupalsList.tsx
    ├── ClubsList.tsx
    └── TrainingsList.tsx
```

### Metric Card Mapping
| Card Key | Display Title | Detail Component | Data Function |
|----------|--------------|------------------|---------------|
| meetings | Meetings | MeetingsList | fetchDetailedMeetings |
| volunteers | Volunteers | MembersList | fetchDetailedMembers |
| slps | Samvidhan Leaders | MembersList | fetchDetailedMembers |
| saathi | Samvidhan Saathi | MembersList | getHierarchicalMemberActivity |
| clubs | Samvidhan Clubs | ClubsList | getHierarchicalClubActivity |
| videos | Local Issue Videos | VideosList | fetchDetailedVideos |
| acVideos | AC Videos | VideosList | getHierarchicalAcVideoActivity |
| chaupals | Samvidhan Chaupals | ChaupalsList | getHierarchicalChaupalActivity |
| forms | Mai-Bahin Forms | ActivitiesList | getHierarchicalMaiBahinActivity |
| shaktiLeaders | Shakti Leaders | MembersList | getShaktiLeaders |
| shaktiBaithaks | Shakti Baithaks | ChaupalsList | getShaktiBaithaks |

### Props Flow Pattern
```typescript
// Parent (page.tsx) → Child (component)
<MetricCard
  title="Meetings"
  value={metrics.meetings}
  onClick={() => handleCardClick('meetings')}
/>

// DetailedView receives
{
  selectedCard: 'meetings',
  detailedData: meetingsData,
  options: { level, assemblies, dateRange, handler_id }
}
```

---

## API Functions & Data Flow

### Core Data Fetching Functions

#### 1. **fetchCumulativeMetrics** (`fetchHierarchicalData.ts`)
- **Purpose**: Main entry point for fetching all metrics
- **Returns**: CumulativeMetrics object with all counts
- **Calls**: Multiple specialized functions based on options
- **AC Name Resolution**: Uses `resolveUserNamesByIds` helper for profile-based names

#### 2. **getWtmSlpSummary** (`fetchFirebaseData.ts`)
- **Collections**: wtm-slp
- **Returns**: { totalMeetings, totalSlps, totalOnboarded }
- **Special Logic**: Returns 0 when SLP level selected

#### 3. **getSlp[Activity]Activity** Functions
- **Pattern**: All follow similar structure
- **Collections**: slp-activity
- **Handler ID Logic**: Varies by SLP type (regular/ASLP/Shakti)
- **Activities**: Members, Training, PanchayatWA, MaiBahin, Videos, Chaupals

#### 4. **fetchDetailed[Data]** Functions
- **Purpose**: Get detailed records for table display
- **Pattern**: Fetch all, then filter in JavaScript
- **Assembly Chunking**: Applied for >10 assemblies
- **AC Name Resolution**: 
  - `fetchDetailedMeetings`: Resolves AC names from users collection using only 'name' property
  - No displayName or uid fallback - uses 'Unknown' if name not found
  - Chaupals (SLP activities) don't include coordinatorName field

#### 5. **Report Generation Module (WTM Vertical)**

##### **Overview**
The Generate Report module provides comprehensive PDF report generation for the WTM vertical with assembly-scoped data aggregation, role-based access control, and intelligent data organization.

##### **Core Components**

###### **ReportGenerator Component** (`components/ReportGenerator.tsx`)
- **Purpose**: UI orchestration and workflow management for report generation
- **Key Features**:
  - Admin-only access restriction (`currentAdmin` check)
  - Progress modal with real-time status updates
  - Stepwise generation process with error handling
  - Date filter preparation with "All Time" fallback
- **Workflow**:
  1. Validate admin role
  2. Prepare date filters
  3. Call `aggregateReportData()` with vertical and date parameters
  4. Call `generateAndDownloadPDF()` with aggregated data
  5. Display progress and handle completion/errors

###### **Report Data Aggregation** (`app/utils/reportDataAggregation.ts`)
- **Main Function**: `aggregateReportData(dateFilter, vertical, options?)`
- **Critical Logic**:
  - **Assembly-First Aggregation**: Groups by Assembly-AC combinations to avoid double counting
  - **AC Roster Pre-Seeding**: Builds complete roster before aggregation, includes placeholder for assemblies with no ACs
  - **AC Name Resolution**: Uses ONLY 'name' property from users collection (no displayName/uid fallback)
  - **Orphan Assembly Handling**: Creates "Unassigned Areas" zone for unmapped assemblies
  - **Date Filtering**: Adjusts "All Time" to 6 months to avoid Firestore limits
  - **Query Optimization**: Conditional fetching, batch processing, chunking for >10 assemblies
- **Data Flow**:
  1. Fetch zone and assembly structure based on vertical
  2. Build complete AC roster using `buildACRosterForVertical`
  3. Pre-seed assembly-AC map with all combinations
  4. Fetch detailed data only for metrics > 0
  5. Process activities grouped by assembly-AC key (`${assembly}::${acId}`)
  6. Resolve AC names from users collection
  7. Aggregate metrics at assembly and zone levels
  8. Handle orphan assemblies as "Unassigned Areas"
  9. Return structured LocalReportData object
- **Performance Zones**:
  - Active ACs (green): meetings >= 7
  - Moderate ACs (orange): meetings >= 5 and < 7
  - Poor ACs (red): meetings < 5

###### **PDF Generator** (`app/utils/pdfGenerator.tsx`)
- **Main Function**: `generateAndDownloadPDF(reportData)`
- **Features**:
  - Hindi/Devanagari font support (NotoSansDevanagari)
  - Performance-based color coding
  - Hierarchical data visualization (Zone → Assembly → AC)
  - Automatic page breaks and formatting
- **PDF Structure**:
  1. Report header with title and date range
  2. Executive summary with overall metrics
  3. Zone-wise breakdown
  4. Assembly-wise metrics within each zone
  5. AC performance cards with color coding
  - Uses vertical-specific fetch functions for WTM:
    - `fetchZonesForWTM()`: Filters zones by parentVertical='wtm' AND role='zonal-incharge'
    - `fetchAssemblyCoordinatorsForWTM()`: Excludes shakti-abhiyaan collection source
  - Pre-populates assemblyAcMap with all ACs and zeroed metrics
  - Ensures zero-activity ACs appear under their assigned assemblies
  - Adds placeholder entries for assemblies with no ACs
  - Preserves cross-assembly behavior for ACs working elsewhere
- **Assembly-Scoped Aggregation**:
  - Groups activities by assembly first, then by AC within each assembly
  - Each AC appears once per assembly where they worked
  - Metrics are counted per AC per assembly (no double counting)
  - Zero-fills metrics for AC-assembly combinations with no activities
  - Handles fallback for activities with missing assembly data
  - **Role verification allows 'no-ac-assigned' placeholder entries**
- **AC Name Resolution**:
  - Uses `resolveACNames` helper that fetches from users collection
  - Only uses 'name' property, never displayName or raw handler_id
  - Updates all assembly-AC combinations for each AC
  - Sets 'Unknown' for ACs without name property
- **Helper Functions**:
  - **buildACRosterForVertical**: Builds complete AC roster for all assemblies
    - Uses `fetchZonesForWTM()` and `fetchAssemblyCoordinatorsForWTM()` for WTM vertical
    - Uses regular `fetchZones()` and `fetchAssemblyCoordinators()` for other verticals
    - Batches fetchAssemblyCoordinators() calls for performance
    - Returns Map<assembly, AC[]> for pre-seeding
  - **addActivityToAssemblyAc**: Associates activities with correct assembly-AC combination
    - Does NOT use coordinatorName from activities (prevents participant name contamination)
    - Fetches AC's profile assembly when activity assembly is missing/invalid
    - Caches AC info for performance
  - **resolveRemainingACInfo**: Fetches uncached AC information
    - Only uses 'name' property, no displayName fallback
    - Fetches assembly information from user profile
  - **getAssemblyAcKey**: Creates unique key for assembly-AC combinations
  - **addMetric**: Helper for metric addition with proper number conversion

##### **fetchZonesForWTM** (`app/utils/fetchHierarchicalData.ts`)
- **Purpose**: Fetch zones specifically for WTM vertical
- **Query**: Filters by `role='zonal-incharge'` AND `parentVertical='wtm'`
- **Collection**: admin-users
- **Returns**: Zone[] with filtered zones for WTM

##### **fetchAssemblyCoordinatorsForWTM** (`app/utils/fetchHierarchicalData.ts`)
- **Purpose**: Fetch ACs for WTM vertical without shakti-abhiyaan data
- **Collections**: Only queries 'users' collection
- **Excludes**: 
  - shakti-abhiyaan collection source
  - slp-activity meeting fallback
- **Returns**: AC[] with only Assembly Coordinators and Zonal Incharges from users collection

##### **Key Implementation Details**

###### **Assembly-Scoped Aggregation**
```typescript
// Create unique assembly-AC combinations
const key = `${assembly}::${acId}`;
// Where:
// - assembly: Assembly name string (e.g., "Rajgir (SC)", "Unknown Assembly")
// - acId: AC's uid from users collection or 'no-ac-assigned' for placeholder
// Example keys: "Rajgir (SC)::aPzlQPgVRLNjIBrgil5gRpXoPYa2"
//              "Chainpur::no-ac-assigned" (for assemblies with no ACs)
// Prevents double counting when AC works across multiple assemblies
```

###### **AC Name Resolution Strategy**
```typescript
// Fetch AC document using handler_id as document ID
const userDocRef = doc(db, 'users', handlerId);
const userDoc = await getDoc(userDocRef);
if (userDoc.exists()) {
  const userData = userDoc.data();
  const acName = userData.name; // Use ONLY 'name' property
  // No fallback to displayName or other fields
  // Fallback hierarchy: userData.name → 'Unknown' → `Pending-${handlerId}`
}
```

###### **Date Filter Handling**
```typescript
// Adjust "All Time" to 6 months to avoid Firestore limits
if (dateFilter.label === 'All Time') {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(endDate.getMonth() - 6);
  adjustedDateFilter = {
    startDate: formatLocalDate(startDate),
    endDate: formatLocalDate(endDate),
    label: dateFilter.label
  };
}
```

###### **Assembly Chunking for Firestore Limits**
```typescript
// Chunk assemblies into groups of 10 for 'in' operator
if (uniqueAssemblies.length > 10) {
  const chunks = [];
  for (let i = 0; i < uniqueAssemblies.length; i += 10) {
    chunks.push(uniqueAssemblies.slice(i, i + 10));
  }
  // Execute parallel queries for each chunk
}
```

##### **Supporting Functions**
- **buildACRosterForVertical()**: Builds complete AC roster for all assemblies
- **resolveACNames()**: Resolves AC names from users collection
- **addActivityToAssemblyAc()**: Adds activity to assembly-AC combination
- **transformZoneData()**: Converts raw zone data to report format
- **getWtmSlpSummary()**: Fetches WTM SLP summary metrics
- **fetchCumulativeMetrics()**: Fetches aggregated metrics
- **fetchDetailedData()**: Fetches detailed activity data

##### **Error Handling**
1. **Missing AC Names**: Fallback to 'Unknown' or 'Pending-{id}'
2. **Missing Assemblies**: Create "Unassigned Areas" zone
3. **Firestore Limits**: Automatic chunking for > 10 assemblies
4. **Date Range Issues**: 6-month limit for "All Time" filter
5. **Role Validation**: Prevents non-admin report generation

##### **Performance Optimizations**
1. **Conditional Fetching**: Only fetch detailed data for non-zero metrics
2. **Parallel Processing**: Use Promise.all for batch operations
3. **Caching**: Cache AC names and info to avoid duplicate queries
4. **Pre-seeding**: Build complete roster upfront for efficiency
5. **Chunking**: Handle large assembly lists within Firestore limits

##### **Data Structures & Field Reference**

###### **Report Data Interfaces**
```typescript
interface LocalReportData {
  reportTitle: string;
  generatedAt: string;
  dateFilter: DateFilter;
  vertical: 'wtm-slp' | 'shakti-abhiyaan';
  summary: {
    totalZones: number;
    totalAssemblies: number;
    totalACs: number;
    totalSLPs: number;
    metrics: CumulativeMetrics;
  };
  zones: ZoneReportData[];
}

interface ZoneReportData {
  id: string;                   // Zone document ID
  name: string;                  // Zone display name
  inchargeName: string;          // Zone incharge name
  metrics: CumulativeMetrics;    // Aggregated zone metrics
  assemblies: AssemblyReportData[];
}

interface AssemblyReportData {
  id: string;                    // Assembly identifier
  name: string;                  // Assembly display name
  metrics: CumulativeMetrics;    // Aggregated assembly metrics
  coordinators: ACReportData[];
}

interface ACReportData {
  id: string;                    // AC uid (document ID)
  name: string;                  // AC name from users.name field
  assembly: string;              // Assembly name
  metrics: CumulativeMetrics;    // AC-level metrics
  slps: any[];                   // Associated SLPs (if any)
}

interface CumulativeMetrics {
  meetings: number | string;
  volunteers: number | string;
  slps: number | string;         // Samvidhan Leaders
  saathi: number | string;        // Samvidhan Saathi
  shaktiLeaders: number | string;
  shaktiSaathi: number | string;
  clubs: number | string;         // Samvidhan Clubs
  shaktiClubs: number | string;
  forms: number | string;         // Mai-Bahin Forms
  shaktiForms: number | string;
  videos: number | string;        // Local Issue Videos
  shaktiVideos: number | string;
  acVideos: number | string;      // AC Videos
  chaupals: number | string;      // Samvidhan Chaupals
  shaktiBaithaks: number | string;
  centralWaGroups: number | string;
  assemblyWaGroups: number | string;
}
```

###### **Firebase Collection Schemas**

**users collection**
```typescript
{
  uid: string;                    // Document ID (used as acId)
  name: string;                   // Primary name field (ONLY field used for AC names)
  displayName?: string;           // NOT used for AC names (explicitly avoided)
  role: string;                   // 'Assembly Coordinator' | 'Zonal Incharge' | 'SLP'
  assembly?: string;              // AC's assigned assembly
  assemblies?: string[];          // Optional multi-assembly array
  parentVertical?: string;        // 'wtm' | 'shakti-abhiyaan'
  village?: string;
  block?: string;
  district?: string;
  state?: string;
  phoneNumber?: string;
  email?: string;
}
```

**admin-users collection**
```typescript
{
  id: string;                     // Firebase Auth UID (zone document ID)
  email: string;
  role: 'zonal-incharge' | 'dept-head' | 'admin';
  assemblies: string[];           // Assigned assemblies
  parentVertical?: 'wtm' | 'shakti-abhiyaan';
  createdAt: Timestamp;
}
```

**wtm-slp collection**
```typescript
{
  dateOfVisit: string;            // "YYYY-MM-DD" format
  form_type?: 'meetings' | 'activity' | 'assembly-wa';
  type?: string;                  // Legacy field (same values as form_type)
  handler_id?: string;            // AC's uid who handled this entry
  recommendedPosition?: string;   // 'SLP' for Samvidhan Leaders
  name?: string;                  // Meeting leader/participant name
  assembly?: string;              // Assembly name
  // Additional meeting/activity fields...
}
```

**slp-activity collection**
```typescript
{
  handler_id: string;             // SLP uid or ASLP uid
  date_submitted: string;         // "YYYY-MM-DD" format (primary date field)
  form_type: string;              // Activity type identifier
  type?: string;                  // Legacy field
  assembly?: string;              // Assembly where activity occurred
  coordinatorName?: string;       // NOT used (can be participant name)
  // Activity-specific fields...
}
```

###### **Performance Color Coding**
```typescript
// AC Performance Thresholds (based on meetings count)
const getPerformanceColor = (meetings: number) => {
  if (meetings >= 7) return 'green';    // Active AC
  if (meetings >= 5) return 'orange';   // Moderate AC
  return 'red';                         // Poor AC
};
```

###### **Field Name Mappings**
| Data Source | Field | Maps To | Notes |
|------------|-------|---------|-------|
| users.uid | Document ID | acId in keys | Primary AC identifier |
| users.name | name | AC display name | ONLY field for AC names |
| users.assembly | assembly | Assembly assignment | Primary assembly |
| admin-users.id | Document ID | Zone ID | Zone identifier |
| wtm-slp.handler_id | handler_id | AC uid | Links to users.uid |
| slp-activity.handler_id | handler_id | SLP/ASLP uid | Activity owner |
| slp-activity.date_submitted | date_submitted | Activity date | Primary date field |

### Data Flow Example

#### Hierarchical Dashboard Flow
```
User selects Zone 3
  → fetchZones() returns zone data
  → fetchAssemblies(zoneId) returns assemblies
  → fetchCumulativeMetrics({ level: 'zone', zoneId: '3' })
    → getWtmSlpSummary(assemblies: ['Assembly1', 'Assembly2', ...])
    → getSlpMemberActivity(assemblies: [...])
    → getSlpTrainingActivity(assemblies: [...])
    → ... (other activities)
  → Returns CumulativeMetrics
  → Updates UI cards

User clicks "Meetings" card
  → fetchDetailedMeetings({ level: 'zone', assemblies: [...] })
  → Returns WtmSlpEntry[]
  → DetailedView shows MeetingsList component
```

#### Report Generation Flow
```
User clicks Generate Report
  → ReportGenerator validates admin role
    → Prepares date filters (adjusts "All Time" to 6 months)
    → aggregateReportData() called with vertical and dates
      → Fetches zones and assemblies for vertical
      → Builds complete AC roster using buildACRosterForVertical()
      → Pre-seeds all assembly-AC combinations
      → Fetches cumulative metrics (conditional on non-zero values)
      → Fetches detailed activities in parallel
      → Groups by assembly-AC key (${assembly}::${acId})
      → Resolves AC names from users collection
      → Aggregates at assembly and zone levels
      → Handles orphan assemblies as "Unassigned Areas"
      → Returns structured LocalReportData
    → generateAndDownloadPDF(reportData)
      → Registers Hindi fonts
      → Renders PDF with Zone → Assembly → AC hierarchy
      → Applies performance-based color coding
      → Generates downloadable PDF file
    → ACSection nested under assemblies
  → PDF downloaded to user
```

---

## Known Pitfalls & Solutions

### 1. Firestore 'in' Operator Limit
**Problem**: Cannot use more than 10 values in `where('field', 'in', array)`
**Solution**: Chunk arrays and run parallel queries (see Assembly Chunking Pattern)

### 2. Timezone Off-by-One Error
**Problem**: `toISOString()` converts to UTC, shifting dates
**Solution**: Use `formatLocalDate()` helper for YYYY-MM-DD format

### 3. SLP vs AC Metric Confusion
**Problem**: SLP selection showing AC-level data
**Solution**: Return 0 for AC metrics when SLP selected

### 4. Handler ID Matching Issues
**Problem**: Activities not found for SLPs/ASLPs
**Solution**: Check multiple possible IDs (document ID + handler_id property)

### 5. Stale Navigation State
**Problem**: Child selections persist when parent changes
**Solution**: Explicit state resets in useEffect hooks

### 6. Date Field Inconsistency
**Problem**: Different activities use different date field names
**Solution**: Map activity type to correct date field

### 7. Legacy Field Names
**Problem**: Old documents use `type`, new use `form_type`
**Solution**: Query both fields and deduplicate

### 8. Empty Dropdown Despite Count
**Problem**: Metric shows count but dropdown is empty
**Solution**: Check data association logic (handler_id vs assembly)

### 9. Shakti SLP Identification
**Problem**: Regular logic doesn't work for Shakti SLPs
**Solution**: Use `shaktiId` property from shakti-abhiyaan collection

### 10. Build Errors with Undefined Values
**Problem**: TypeScript errors with optional chaining
**Solution**: Proper null checks and fallback values

### 11. Zone Hierarchy in Reports
**Problem**: Reports need zone-level grouping for assemblies
**Solution**: Fetch zones from admin-users, map assemblies to zones, handle unassigned assemblies

### 12. Zone-Assembly Mapping
**Problem**: Some assemblies may not be assigned to any zone
**Solution**: Create "Unassigned Areas" zone for orphan assemblies with aggregated metrics

### 13. Assembly-Scoped AC Metrics in Reports
**Problem**: ACs working across multiple assemblies had metrics aggregated at AC level, not per assembly
**Solution**: Implement assembly-first aggregation that groups activities by assembly, then by AC within each assembly

### 14. Profile-Based AC Name Resolution
**Problem**: AC names were inconsistently resolved using displayName, uid, or raw handler_id
**Solution**: Enforce profile-based resolution using only 'name' property from users collection with 'Unknown' fallback

---

## Debugging Helpers

### Console Log Patterns
```typescript
// Function entry
console.log(`[functionName] Starting with params:`, { param1, param2 });

// Query details
console.log(`[functionName] Querying ${collection} with ${conditions}`);

// Results
console.log(`[functionName] Found ${results.length} documents`);

// Chunking
console.log(`[functionName] Chunking ${items.length} items into ${chunks.length} queries`);
```

### Common Debug Points
1. `fetchCumulativeMetrics` - Check options object
2. `getWtmSlpSummary` - Check handler_id and SLP logic
3. `fetchSlpsForAc` - Check AC association logic
4. Date filter functions - Check date range values
5. Navigation handlers - Check state reset sequence

### Performance Monitoring
- Use `console.time()` / `console.timeEnd()` for query performance
- Monitor Firestore read counts in Firebase Console
- Check for unnecessary re-renders with React DevTools

---

## Quick Reference

### File Locations
| Feature | Primary File | Supporting Files |
|---------|-------------|------------------|
| Hierarchical Dashboard | `app/wtm-slp-new/page.tsx` | `components/hierarchical/*` |
| Data Fetching | `app/utils/fetchHierarchicalData.ts` | `app/utils/fetchFirebaseData.ts` |
| Type Definitions | `models/hierarchicalTypes.ts` | `models/types.ts` |
| Date Filtering | `components/DateRangeFilter.tsx` | - |
| Navigation | `components/hierarchical/HierarchicalNavigation.tsx` | - |
| Authentication | `app/auth/page.tsx` | `app/utils/firebase.ts` |

### Key Functions by Use Case
| Use Case | Function | File |
|----------|----------|------|
| Get all metrics | `fetchCumulativeMetrics` | fetchHierarchicalData.ts |
| Get meeting details | `fetchDetailedMeetings` | fetchHierarchicalData.ts |
| Get SLP activities | `getSlp[Activity]Activity` | fetchFirebaseData.ts |
| Get zones | `fetchZones` | fetchHierarchicalData.ts |
| Get ACs for assembly | `fetchAssemblyCoordinators` | fetchHierarchicalData.ts |
| Get SLPs for AC | `fetchSlpsForAc` | fetchHierarchicalData.ts |
| Generate zone report | `aggregateReportData` | reportDataAggregation.ts |
| Transform zone data | `transformZoneData` | reportDataAggregation.ts |
| Generate PDF report | `generateAndDownloadPDF` | pdfGenerator.tsx |

### Environment Variables
```env
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

---

## Update Guidelines

When modifying the codebase:
1. **Update this CodeMap** when adding new collections, functions, or patterns
2. **Follow existing patterns** for consistency
3. **Add console logging** for new functions
4. **Handle edge cases** (null checks, empty arrays)
5. **Test with >10 assemblies** to verify chunking
6. **Check timezone handling** for new date fields
7. **Update TypeScript types** in models/
8. **Document handler_id logic** for new SLP types

---

*Last Updated: January 2025*
*Version: 1.2.0*
*Changes: Added profile-based AC name resolution documentation*
