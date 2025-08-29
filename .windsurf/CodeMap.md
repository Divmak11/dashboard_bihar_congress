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

#### 5. **Report Generation Functions**

##### **aggregateReportData** (`app/utils/reportDataAggregation.ts`)
- **Purpose**: Main report data aggregation with zone hierarchy
- **Process**:
  1. Fetches zones filtered by `parentVertical='wtm'`
  2. Creates assembly-to-zone mapping
  3. Groups assemblies under zones
  4. Implements assembly-scoped AC aggregation
  5. Aggregates zone-level metrics
  6. Handles unassigned assemblies
- **Returns**: Complete report data with Zone → Assembly → AC hierarchy
- **Pre-seeding Approach**: NEW - Fetches ALL ACs for ALL assemblies in selected vertical before processing activities
  - Uses `buildACRosterForVertical()` to get complete AC roster from zones and assemblies
  - Pre-populates assemblyAcMap with ALL ACs under their assigned assemblies with zeroed metrics
  - Ensures ACs with zero activity still appear in reports (shown in red)
  - Preserves cross-assembly behavior when ACs work elsewhere
- **Assembly-Scoped Aggregation**:
  - Groups activities by assembly first, then by AC within each assembly
  - Each AC appears once per assembly where they worked
  - Metrics are counted per AC per assembly (no double counting)
  - Zero-fills metrics for AC-assembly combinations with no activities
  - Handles fallback for activities with missing assembly data
- **AC Name Resolution**:
  - Uses `resolveACNames` helper that fetches from users collection
  - Only uses 'name' property, never displayName or raw handler_id
  - Updates all assembly-AC combinations for each AC
  - Sets 'Unknown' for ACs without name property
- **Helper Functions**:
  - **buildACRosterForVertical**: NEW - Builds complete AC roster for all assemblies
    - Fetches zones filtered by selected vertical (wtm/shakti-abhiyaan)
    - Uses existing fetchAssemblyCoordinators() for each assembly
    - Processes assemblies in chunks of 10 for performance
  - **addActivityToAssemblyAc**: Associates activities with correct assembly-AC combination
    - Does NOT use coordinatorName from activities (prevents participant name contamination)
    - Fetches AC's profile assembly when activity assembly is missing/invalid
    - Caches AC info for performance
  - **resolveRemainingACInfo**: Fetches uncached AC information
    - Only uses 'name' property, no displayName fallback
    - Fetches assembly information from user profile
  - **getAssemblyAcKey**: Creates unique key for assembly-AC combinations

##### **transformZoneData** (`reportDataAggregation.ts`)
- **Purpose**: Converts raw zone data to report format
- **Maps**: Zone metrics, assemblies, and performance levels
- **Output**: ZoneData[] for PDF generation

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
  → aggregateReportData() called
    → fetchZones() with parentVertical='wtm' filter
    → Creates assemblyToZoneMap from zone.assemblies[]
    → fetchAllActivities() for all assemblies
    → Groups assemblies under zones
    → Aggregates zone metrics (sum of assembly metrics)
    → Creates "Unassigned Areas" zone for orphan assemblies
    → transformZoneData() converts to report format
  → generateAndDownloadPDF(reportData)
    → Renders PDF with Zone → Assembly → AC hierarchy
    → ZoneSection component for each zone
    → AssemblySection nested under zones
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
