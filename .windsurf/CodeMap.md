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
- YouTube Dashboard (Influencer Management)
- Hierarchical Navigation (Zone → Assembly → AC → SLP)
- Activity Tracking & Reporting
- Role-based Auto-redirection System

## Authentication & Role-based Redirection

### Middleware-based Access Control
**Location**: `middleware.ts` and `app/utils/authMiddleware.ts`

**Architecture**: Server-side role-based routing that prevents UI flash and blocks unauthorized access

**Flow**:
1. **Authentication Check**: Middleware verifies auth token from cookies
2. **Role Resolution**: Extracts UID from JWT token and fetches user role from Firestore
3. **Access Control**: Enforces role-based access before page renders
4. **Automatic Redirection**: Routes users to appropriate dashboards based on role

**Implementation**:
```typescript
// middleware.ts - Server-side role-based access control
export async function middleware(request: NextRequest) {
  const authToken = request.cookies.get('auth-token')?.value;
  const isHomePage = request.nextUrl.pathname === '/home';
  
  // Role-based access control for /home route
  if (authToken && isHomePage) {
    const uid = extractUidFromToken(authToken);
    const adminUser = await getAdminUserForMiddleware(uid);
    
    // Only allow admin users to access /home
    if (adminUser.role !== 'admin') {
      const redirectUrl = getRedirectUrl(adminUser);
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
  }
}
```

**Role-based Redirection Rules**:
- **Admin**: `/home` (full dashboard access)
- **Dept-head (YouTube)**: `/wtm-youtube`
- **Dept-head (WTM/Shakti)**: `/wtm-slp-new`
- **Zonal-incharge**: `/wtm-slp-new`
- **Others**: `/wtm-slp-new` (default)

**Key Benefits**:
- ✅ **No UI Flash**: Server-side redirection prevents brief home page visibility
- ✅ **Back Button Protection**: Non-admins cannot navigate back to /home
- ✅ **Centralized Logic**: Single source of truth for role-based routing
- ✅ **Security**: Server-side enforcement prevents client-side bypassing

### Admin Create Account Flow (Secondary Firebase App)

- Location: `app/home/page.tsx` (Create Account modal form)
- Purpose: Allow admin to create Dept-Head/Zonal-Incharge accounts without disrupting current admin session.
- Initialization Pattern: The secondary Firebase app now reuses the primary app configuration to avoid environment variable dependencies.

```ts
// Secondary app now uses primary app's options
import { initializeApp, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const primaryApp = getApp();
const secondaryApp = initializeApp(primaryApp.options, `secondary-${Date.now()}`);
const secondaryAuth = getAuth(secondaryApp);
```

- Why: Removes reliance on `NEXT_PUBLIC_*` Firebase env vars and fixes `Firebase: Error (auth/invalid-api-key)` when those envs are absent.
- Cleanup: `deleteApp(secondaryApp)` after user creation to prevent resource leaks.
- Firestore Write: New admin user is stored in `admin-users` via the primary DB instance.

---

## Directory Structure

```
my-dashboard/
├── app/                          # Next.js App Router pages
│   ├── auth/                     # Authentication page
│   ├── dashboard/                # Main dashboard
│   ├── wtm-slp/                  # Legacy WTM-SLP dashboard
│   ├── wtm-slp-new/              # New hierarchical dashboard
│   ├── wtm-youtube/              # YouTube dashboard
│   ├── map/                      # Map visualization
│   ├── report/                   # Report generation components
│   │   ├── ReportButton.tsx      # Report trigger button
│   │   └── ReportProgress.tsx    # Progress modal component
│   ├── hooks/                    # Custom React hooks
│   │   └── useReportGeneration.ts # Report generation hook
│   ├── services/                 # Service layer
│   │   └── reportProgressService.ts # Report progress state management
│   ├── config/                   # Configuration files
│   │   └── pdfConfig.ts          # PDF styling with enhanced table styles + AC-wise section styles
│   └── utils/                    # Core utility functions
│       ├── fetchFirebaseData.ts  # Firebase data fetching with caching
│       ├── fetchHierarchicalData.ts # Hierarchical data logic
│       ├── fetchYoutubeData.ts   # YouTube data fetching with caching
│       ├── cacheUtils.ts         # Data caching utility with localStorage
│       ├── firebase.ts           # Firebase config
│       ├── errorUtils.ts         # Error handling
│       ├── reportDataAggregation.ts # Zone-wise report aggregation + AC-wise sections
│       ├── reportAttendanceLogic.ts # Attendance & assembly work logic
│       └── pdfGenerator.tsx      # PDF with UI refinements + AC-wise layout components
├── components/                   # Reusable components
│   ├── hierarchical/             # Hierarchical dashboard components
│   │   ├── DetailedView.tsx     # Detailed data view
│   │   ├── MetricCard.tsx       # Metric display cards
│   │   ├── HierarchicalNavigation.tsx # Navigation dropdowns
│   │   ├── ActivitiesList.tsx   # Activities table
│   │   ├── MembersList.tsx      # Members table
│   │   ├── VideosList.tsx       # Videos table
│   │   └── [other lists]        # Other activity tables
│   ├── ReportGenerator.tsx       # Main report generation component (refactored)
│   ├── DashboardHome.tsx         # Dashboard home component
│   ├── DateRangeFilter.tsx      # Date filtering component
│   └── NavBar.tsx                # Navigation bar
├── scripts/                      # Utility Node.js scripts for data sync/reporting
│   ├── ac-assembly-slp-report.js # Generates AC→Assembly→SLP coverage CSV (phone-first, name fallback)
│   ├── sync-slp-activity-status.js # Sync SLP activityStatus via Excel + FB matching
│   └── non-matching-slps-report.js # Extracts sheet SLPs not found in Firestore
├── models/                       # TypeScript type definitions
│   ├── types.ts                  # Core data types
│   ├── hierarchicalTypes.ts     # Hierarchy-specific types
│   └── reportTypes.ts            # Report types (Zone-wise structure + AC-wise sections)
└── .windsurf/                    # Project documentation
    ├── PRD.md                    # Product requirements
    ├── Plan.md                   # Implementation plan
    ├── Tasks.md                  # Task tracking
    └── CodeMap.md                # This file

### Report Generation Architecture (Refactored)

**Key Components:**
- **useReportGeneration Hook**: Centralizes report generation logic, handles data fetching and PDF creation
- **reportProgressService**: Manages progress state with observable pattern
- **pdfConfig**: Centralized PDF styling configuration (fonts, colors, styles)
- **ReportGenerator Component**: Presentational component with modal UI
- **pdfGenerator**: Core PDF generation logic using @react-pdf/renderer

**Data Flow:**
1. User triggers report via ReportGenerator component
2. useReportGeneration hook orchestrates the process
3. Data fetched via reportDataAggregation functions
4. AC-wise performance sections generated via generateACPerformanceSections
5. Progress updates via reportProgressService
6. PDF generated with pdfGenerator using pdfConfig styles (supports both legacy and AC-wise layouts)
7. Download triggered automatically on completion
```

---

## Data Caching System

### Overview
Implemented localStorage-based caching for home page vertical cards to prevent unnecessary re-fetching when users navigate between verticals and return.

### Cache Architecture

#### **DataCache Class** (`app/utils/cacheUtils.ts`)
- **Storage**: localStorage with JSON serialization
- **TTL**: 15 minutes default for home page metrics
- **Key Management**: Prefixed keys with automatic cleanup
- **Features**:
  - Automatic expiration based on timestamp + TTL
  - User-specific cache keys for role-based data
  - Assembly filter support for cache key generation
  - Cleanup of expired entries
  - Cache statistics and debugging

#### **Cache Keys**
```typescript
CACHE_KEYS = {
  WTM_SLP_SUMMARY: 'wtm_slp_summary',
  YOUTUBE_SUMMARY: 'youtube_summary'
}
```

#### **Cache Utility Functions**
- `homePageCache.getOrSet()`: Get cached data or fetch fresh if expired
- `createUserCacheKey()`: Generate user/assembly-specific cache keys
- `forceCacheRefresh()`: Clear specific cache entries
- `initializeCache()`: Initialize cache and cleanup expired entries

### Implementation Details

#### **WTM-SLP Caching** (`app/utils/fetchFirebaseData.ts`)
- **Function**: `getWtmSlpSummary()` enhanced with caching
- **Scope**: Homepage summary only (no date/handler filters)
- **Cache Key**: Based on user assemblies filter
- **TTL**: 15 minutes
- **Bypass**: Filtered requests (date ranges, handler_id, SLP details) skip cache

#### **YouTube Caching** (`app/utils/fetchYoutubeData.ts`)
- **Function**: `fetchYoutubeSummary()` enhanced with persistent caching
- **Replaced**: In-memory cache with localStorage persistence
- **TTL**: 15 minutes (inherits from DataCache default)
- **Features**: Force refresh parameter support

#### **Home Page Integration** (`app/home/page.tsx`)
- **Initialization**: Cache setup on component mount
- **Dependencies**: Data fetching waits for cache initialization
- **Force Refresh**: Manual refresh button to clear cache and fetch fresh data
- **UI Indicators**: Loading states and refresh button with spinner

### Cache Behavior

#### **Cache Hit Scenarios**
- User returns to home page within 15 minutes
- Same role and assembly filter combination
- No force refresh requested
- Valid cache entry exists in localStorage

#### **Cache Miss Scenarios**
- First visit or cache expired (>15 minutes)
- Different user role or assembly filter
- Cache cleared via refresh button
- localStorage unavailable or corrupted

#### **Force Refresh Flow**
1. User clicks refresh button
2. Clear specific cache keys via `forceCacheRefresh()`
3. Set loading state
4. Fetch fresh data with `forceRefresh: true` parameter
5. Update cache with new data
6. Update UI with fresh metrics

### Performance Benefits
- **Reduced Firestore Reads**: Cached data eliminates redundant database queries
- **Faster Load Times**: Immediate display of cached metrics
- **Better UX**: No loading delays when returning to home page
- **Bandwidth Savings**: Prevents re-downloading same data within TTL window

### Error Handling
- **localStorage Unavailable**: Falls back to direct fetching
- **Cache Corruption**: Automatic cleanup and fresh fetch
- **Cache Full**: Cleanup expired entries to free space
- **Network Errors**: Preserved in cache for next attempt

### Debugging Features
- **Console Logging**: Cache hits, misses, and operations
- **Cache Statistics**: Total, valid, and expired entries count
- **Manual Controls**: Force refresh and cache clearing functions

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
  parentVertical?: 'wtm' | 'shakti-abhiyaan' | 'youtube',  // Vertical assignment
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
  parentVertical?: 'wtm' | 'shakti-abhiyaan', // NEW: used to split Assembly WA Groups by vertical
  
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

#### **Form_Type Mappings for Shakti-Abhiyaan Metrics:**
| Metric | Collection | Form_Type | ParentVertical Filter | Date Field |
|--------|------------|-----------|----------------------|------------|
| shaktiLeaders | shakti-abhiyaan | 'add-data' | N/A | createdAt (epoch ms) |
| shaktiSaathi | slp-activity | 'members' | 'shakti-abhiyaan' | createdAt (epoch ms) |
| shaktiClubs | slp-activity | 'panchayat-wa' | 'shakti-abhiyaan' | createdAt (ISO string) |
| shaktiForms | slp-activity | 'mai-bahin-yojna' | 'shakti-abhiyaan' | date (YYYY-MM-DD) |
| shaktiBaithaks | slp-activity | 'weekly_meeting' | 'shakti-abhiyaan' | dateFormatted (YYYY-MM-DD) |
| shaktiVideos | slp-activity | 'local-issue-video' | 'shakti-abhiyaan' | date_submitted (YYYY-MM-DD) |

**Critical Note:** All slp-activity queries for shakti metrics must include both `form_type` filter AND `parentVertical='shakti-abhiyaan'` filter.

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

### 7. **attendence** Collection (for AC Availability)
```typescript
{
  handler_id: string,             // AC document ID
  created_at: number,             // Epoch timestamp in milliseconds
  // Other attendance fields...
}
```
**Query Pattern**: `where('handler_id', 'in', acIds), where('created_at', '>=', start), where('created_at', '<=', end)`
**Composite Index Required**: `(handler_id, created_at)`
**Note**: Collection name is 'attendence' (not 'attendance')

---

## Report Generation with Attendance Logic

### Attendance and Assembly Work Determination

**New Logic Flow (Step 3.5 in aggregateReportData):**
1. **Check AC Attendance**: Query 'attendence' collection for AC availability
   - If attendance record exists for AC on report date → Mark as unavailable
   - No attendance record → AC is available

2. **Determine Work Assembly**: For available ACs, check which assembly they worked in
   - Query 'wtm-slp' meetings by handler_id and created_at
   - AC can only work in ONE assembly per day
   - Assembly with most meetings = worked assembly
   - Other assigned assemblies marked as "no activity"

3. **Apply Filtering**: Update assembly-AC map based on results
   - Unavailable ACs: Zero metrics, marked with `isUnavailable: true`
   - Available ACs: Only include worked assembly with actual metrics
   - Non-worked assemblies: Zero metrics, marked with `noActivity: true`

**Implementation Files:**
- `reportAttendanceLogic.ts`: Core attendance and assembly logic
  - `checkACAttendance()`: Checks attendance records from 'attendence' collection
  - `determineACWorkAssembly()`: Determines single work assembly using pre-fetched meeting data
  - `applyAttendanceAndAssemblyLogic()`: Main integration function, accepts optional meeting data

- `reportDataAggregation.ts`: Integration point at Step 3.5
  - Fetches meeting data once using `fetchDetailedMeetings()`
  - Passes pre-fetched data to `applyAttendanceAndAssemblyLogic()`
  - Replaces assembly-AC map with filtered version

**Optimization Strategy:**
- **Data Reuse**: Leverages existing `fetchDetailedMeetings()` data instead of new queries
- **Zero Additional Queries**: No new database calls for assembly work determination
- **Memory Filtering**: Filters meetings in JavaScript using `meeting.handler_id === acId`
- **Composite Index Elimination**: Removes need for `(handler_id, created_at)` index on wtm-slp

**Date Filtering:**
- Attendance: Uses `created_at` field (epoch ms) with UTC day boundaries on 'attendence' collection
- Assembly Work: Uses pre-filtered meeting data (already filtered by date in fetchDetailedMeetings)

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
| centralWaGroups | Central WA Groups | ClubsList | getHierarchicalCentralWaGroups |
| assemblyWaGroups | Assembly WA Groups | ClubsList | getHierarchicalAssemblyWaGroups |
| shaktiAssemblyWaGroups | Shakti Assembly WA Groups | ClubsList | getHierarchicalShaktiAssemblyWaGroups |

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
- **NEW Metrics**:
  - `assemblyWaGroups`: Fetches 'assembly-wa' from wtm-slp excluding Shakti docs (`parentVertical === 'shakti-abhiyaan'`), treating missing `parentVertical` as WTM
  - `shaktiAssemblyWaGroups`: Fetches 'assembly-wa' from wtm-slp including only Shakti docs (`parentVertical === 'shakti-abhiyaan'`)
  - Both functions support assembly chunking for >10 assemblies and optional `handler_id`/`createdAt` filters

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
- **New Feature**: **Report Format Selection** - Supports both 'ac-wise' (default) and 'zone-wise' formats
- **Critical Logic**:
  - **Assembly-First Aggregation**: Groups by Assembly-AC combinations to avoid double counting
  - **AC Roster Pre-Seeding**: Builds complete roster before aggregation, includes placeholder for assemblies with no ACs
    - **AC Name Resolution**: Uses ONLY 'name' property from users collection (no displayName/uid fallback)
    - **AC-wise Performance Sections**: Groups ACs by performance zones (Green/Orange/Red/Unavailable)
    - **Zone-wise Performance Sections**: Groups ACs by geographical zones first, then by performance zones within each zone
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
  8. Generate performance sections based on format:
     - AC-wise: Use `generateACPerformanceSections()` to group by performance zones
     - Zone-wise: Use `generateZoneWisePerformanceSections()` to group by geographical zones first
       - Now includes placeholder "No AC assigned" assemblies in the red zone section
  9. Handle orphan assemblies as "Unassigned Areas"
  10. Return structured LocalReportData object with acPerformanceSections or zoneWisePerformanceSections
- **Performance Zones**:
  - Active ACs (green): meetings >= 7
  - Moderate ACs (orange): meetings >= 5 and < 7
  - Poor ACs (red): meetings < 5

###### **PDF Generator** (`app/utils/pdfGenerator.tsx`)
- **Main Function**: `generateAndDownloadPDF(reportData)`
- **Features**:
  - Hindi/Devanagari font support (NotoSansDevanagari)
  - Performance-based color coding with row highlighting
  - Hierarchical data visualization (Zone → Assembly → AC)
  - Automatic page breaks and formatting
  - Enhanced font sizes for better readability
  - Metric value highlighting (bold for >0, dimmed for 0)
  - **Dual Format Support**: Conditionally renders AC-wise or Zone-wise layouts
- **PDF Structure**:
  1. Report header with title and date range
  2. Executive summary with overall metrics
  3. Zone-wise Overview table with deduplicated AC counts
  4. **Performance Report Section** (Format-dependent):
     
     **AC-wise Format** (`ACPerformanceSection`):
     - High Performance Zone (Green): ACs with meetings ≥ 7
     - Moderate Performance Zone (Orange): ACs with meetings ≥ 5 and < 7
     - Poor Performance Zone (Red): ACs with meetings < 5
     - Unavailable ACs: ACs marked as unavailable
     - Each AC shows all assemblies in tabular format under single header
     - Assembly-level color grading based on attendance logic flags
     
     **Zone-wise Format** (`ZoneWisePerformanceSection`):
     - Groups ACs by geographical zones first
     - Within each zone, shows performance categories (Green/Orange/Red/Unavailable)
     - Each zone rendered with `ZonePerformanceComponent` 
     - Zone headers show zone number, name, and incharge information
     - Same AC assembly tables but organized by geographical grouping first
     
  5. Legacy Zone-wise detailed breakdown sections (fallback)
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
    - Uses `fetchZones()` and `fetchAssemblyCoordinatorsForShakti()` for Shakti vertical
    - [Deprecated] `fetchAssemblyCoordinators()` kept only for legacy/non-dashboard scripts; avoid in new UI paths
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

##### **Attendance Logic (Report System)**

###### **checkACAttendance** (`app/utils/reportAttendanceLogic.ts`)
- **Purpose**: Determines AC availability for report generation using inverted attendance logic
- **New Logic**: AC marked "available" if ANY day is missing attendance records (partial presence)
- **Previous Logic**: AC marked "unavailable" if ANY attendance record exists (binary approach)
- **Implementation**:
  - Calculates total expected days in date range
  - Counts actual attendance records per AC 
  - Inverted Decision: `missingDays > 0` = Available, `missingDays = 0` = Unavailable
  - Supports multi-day scenarios with partial AC presence
- **Impact**: More ACs included in performance grading, better reflection of actual work patterns
- **Database**: Queries 'attendence' collection (note: misspelled collection name)

##### **Error Handling**
1. **Missing AC Names**: Fallback to 'Unknown' or 'Pending-{id}'
2. **Missing Assemblies**: Create "Unassigned Areas" zone
3. **Firestore Limits**: Automatic chunking for > 10 assemblies
4. **Date Range Issues**: 6-month limit for "All Time" filter
5. **Role Validation**: Prevents non-admin report generation
6. **Attendance Errors**: Defaults to all ACs available on database errors

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
  id: string;                   // Zone ID (Document ID)
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
  if (meetings >= 7) return 'green';    // Active AC (tableRowHigh style)
  if (meetings >= 5) return 'orange';   // Moderate AC (tableRowModerate style)
  return 'red';                         // Poor AC (tableRowPoor style)
};

// Row styles in pdfConfig.ts:
tableRowHigh: {
  backgroundColor: '#dcfce7',  // Light green
  borderLeft: '3px solid #22c55e'
}
tableRowModerate: {
  backgroundColor: '#fed7aa',  // Light orange
  borderLeft: '3px solid #fb923c'
}
tableRowPoor: {
  backgroundColor: '#fee2e2',  // Light red
  borderLeft: '3px solid #ef4444'
}
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

### 15. Phantom Assembly Handling in PDF Reports
**Problem**: Assemblies with no assigned ACs (phantom assemblies) were not properly handled in reports
**Solution**: Include phantom assemblies with 'no-ac-assigned' placeholder in AC Performance table but exclude from AC counts

### 16. AC Count Deduplication in Reports
**Problem**: ACs working across multiple assemblies were counted multiple times in total AC counts
**Solution**: Deduplicate AC counts using Set of unique AC IDs, exclude phantom ACs from counts

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
| Get ACs for assembly (WTM) | `fetchAssemblyCoordinatorsForWTM` | fetchHierarchicalData.ts |
| Get ACs for assembly (Shakti) | `fetchAssemblyCoordinatorsForShakti` | fetchHierarchicalData.ts |
| [Deprecated] Generic AC fetch | `fetchAssemblyCoordinators` | fetchHierarchicalData.ts |
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

## WTM-Youtube Vertical

### Overview
YouTube influencer and campaign analytics module with independent Firebase instance and YouTube API integration.

### Collections & Schema
**Collection: `youtube`**
- **Influencer Documents** (`form_type: 'influencer-data'`)
  - `id`: string
  - `createdAt`: number (epoch ms)
  - `handler_id`: string
  - `name`: string
  - `phoneNumber`: string
  - `subscribers`: number
  - `channelName`: string
  - `channelLink`: string
  - `status`: 'Active' | 'Inactive'
  - `workingStatus`: 'Working' | 'Busy' | 'Not Working For Us'
  - `assembly?`: string (display "--" when missing)
  - `remark?`: string

- **Campaign/Theme Documents** (`form_type: 'theme-data'`)
  - `id`: string
  - `createdAt`: number (epoch ms)
  - `weeklyTheme`: string
  - `from`: number (campaign start epoch ms)
  - `to`: number (campaign end epoch ms)
  - `influencerIds`: string[]
  - `influencerEntries`: Array of video entries
    - `influencerId`: string
    - `videoType`: 'Package' | 'Public Opinion One' | 'Public Opinion Two' | 'Reel/Short'
    - `videoLink`: string
    - `metrics?`: { views?: number; likes?: number } (fallback when API unavailable)

### File Structure
| Component | File | Purpose |
|-----------|------|---------|
| Types | `models/youtubeTypes.ts` | All video data interfaces (platform-agnostic) |
| Data Fetching | `app/utils/fetchYoutubeData.ts` | Firestore queries and aggregation (uses shared Firebase) |
| Unified Video API | `app/utils/videoApi.ts` | Platform detection and unified video stats fetching |
| YouTube API | `app/utils/youtubeApi.ts` | YouTube-specific video stats fetching, ID extraction |
| Facebook API | `app/utils/facebookApi.ts` | Facebook-specific video stats fetching, ID extraction |
| Main Page | `app/wtm-youtube/page.tsx` | Role-gated vertical page |
| Overview | `components/youtube/Overview.tsx` | KPIs, charts, top lists |
| Themes | `components/youtube/ThemesList.tsx` | Active/Past themes with details |
| Influencers | `components/youtube/InfluencersList.tsx` | Directory with profiles |
| KPI Card | `components/youtube/KpiCard.tsx` | Reusable metric card |

### Key Functions and Data Flow:

1. **fetchAllData()** (page.tsx): Main orchestrator that fetches influencers, themes, video stats, and computes aggregates
   - **Fixed Issue**: Now uses freshly fetched video stats for overview aggregates instead of stale state
2. **fetchInfluencers()** (fetchYoutubeData.ts): Queries influencer collection with search filters
3. **fetchThemes()** (fetchYoutubeData.ts): Queries theme collection with date mode, date range, and search filters
4. **fetchVideoStatsFromLinks()** (fetchYoutubeData.ts): Extracts video IDs from links and fetches YouTube metrics
5. **computeOverviewAggregates()** (fetchYoutubeData.ts): Aggregates data for overview dashboard

### UI/UX Fixes:
- **Modal Overlays**: Fixed all modal backgrounds from solid black (`bg-black bg-opacity-50`) to modern blurred effect (`bg-black/20 backdrop-blur-sm`) across all components
- **Navigation Loading**: Added loading indicators for vertical card navigation to prevent perceived app freeze during route transitions

### Date Filtering
- **Two Modes**: 
  - `entries`: Filter by `createdAt` (when data was entered)
  - `campaign`: Filter by `from`/`to` (campaign window overlap)
- **Theme Status**: Active (to >= now) vs Past (to < now)

### Caching Strategy
- In-memory cache with TTL (10 minutes for API, 5 minutes for summary)
- Cleared by Refresh button
- No persistence to Firestore

### Access Control
- Role gating: Only `admin` and `dept-head` roles
- Server-side check in page component
- Card hidden on home for unauthorized roles

### YouTube API Integration
- Requires `NEXT_PUBLIC_YOUTUBE_API_KEY` environment variable
- Batches up to 50 video IDs per request
- Concurrency throttling (default: 3 parallel requests)
- Falls back to stored metrics if API unavailable
- Handles various URL formats (watch?v=, youtu.be, shorts)

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

## Ghar-Ghar Yatra Analytics - Performance Optimizations

**Location**:
- `app/utils/fetchGharGharYatraData.ts`
- `app/verticals/ghar-ghar-yatra-analytics/page.tsx`
- `models/gharGharYatraTypes.ts`

**Motivation**: The Overview tab performed redundant and expansive reads by iterating over every date in range and fetching data twice (for metrics and charts). This caused slow loads even for sparse data.

**Key Changes**:
- Added single-source data fetch that discovers existing dates first, then fetches only those dates.
- Avoids duplicate reads by computing both metrics and charts from the same in-memory source.
- Annotates SLP records with their `date` for precise daily aggregation.
- Limits SLP metadata reads to Top-N (10) for charts.
- Batches Firestore requests to avoid request storms.

**New/Updated Functions** (`app/utils/fetchGharGharYatraData.ts`):
- `listExistingDatesInRange(startDate, endDate)`: Lists only existing document IDs using `orderBy(documentId())`, `startAt`, `endAt`.
- `fetchDateDocumentsForDates(dates[])`: Fetches main `ghar_ghar_yatra/{date}` docs in chunks.
- `fetchAllSLPDataForDates(dates[])`: Fetches `slp_data` for provided dates and annotates each record with its `date`.
- `fetchOverviewSourceData(startDate, endDate)`: Orchestrates the above and returns `{ dateDocuments, slpData, existingDates }` once.
- `generateAggregatedMetricsFromSource(source)`: Computes overview metrics from pre-fetched data (no reads).
- `generateChartDataFromSource(source)`: Computes chart data from pre-fetched data, fetching metadata only for top 10 SLPs.

**Types** (`models/gharGharYatraTypes.ts`):
- Added `SLPDataWithDate extends SLPDataDocument { date: string }` for accurate per-day aggregations.

**Page Integration** (`app/verticals/ghar-ghar-yatra-analytics/page.tsx`):
- Replaced separate calls to `generateAggregatedMetrics()` and `generateChartData()` with a single-source fetch via `fetchOverviewSourceData()` followed by `generateAggregatedMetricsFromSource()` and `generateChartDataFromSource()`.
- Added console timings: `[Overview] Source fetch` and `[Overview] Compute metrics+charts`.

**Expected Impact**:
- Dramatically fewer Firestore reads for long/sparse ranges (e.g., All Time).
- No duplicated fetches for metrics vs charts.
- Accurate daily trend/calling patterns using exact record dates.
- Faster initial render and improved perceived performance.

---

*Last Updated: October 2025*
*Version: 1.5.0*
*Changes: Added Ghar-Ghar Yatra overview performance optimizations and documentation*
