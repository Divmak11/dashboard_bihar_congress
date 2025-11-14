# Architecture Patterns

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
  level: 'zone' | 'assembly' | 'ac' | 'slp' | 'vertical';
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

### DetailedView External Pagination & Search

- **Ownership**: `components/hierarchical/DetailedView.tsx` centralizes pagination and search for ALL detailed metric cards.
- **Behavior**:
  - Initial page size: 25 items. "Load More" fetches additional items.
  - Footer visibility: shown only when `hasMore && !searchTerm`.
  - Search: global search input in DetailedView; per-table search is disabled.
  - SLP-level AC metrics (meetings/volunteers/slps): short-circuited to empty set.
- **List components** updated to be externally controlled (no internal paging/search):
  - `ActivitiesList.tsx`, `MeetingsList.tsx`, `VideosList.tsx`, `FormsList.tsx`, `ClubsList.tsx`, `ChaupalsList.tsx`, `NukkadMeetingsList.tsx` now accept `footer?: React.ReactNode` and pass it to `DataTable`.
  - `DataTable.tsx` supports `clientPaginate={false}` and `footer` slot for standardized external pagination UI.
- **Paged fetching**:
  - Fallback is implemented as `fetchDetailedDataPaged(metric, options)` in `app/utils/fetchHierarchicalData.ts`.
    - First tries server-side keyset pagination for supported metrics: `videos`, `acVideos`, `forms`, `chaupals`, `clubs`, `nukkadAc`, `nukkadSlp`.
    - Server-side paging uses inequality on the date field (`< endBound`) + `orderBy(dateField, 'desc')` + optional assembly chunking (`where('assembly','in', chunk)`) and handler filtering.
    - Applies `parentVertical` include/exclude rules for WTM vs Shakti where required.
    - Falls back to in-memory pagination when a composite index is missing or the metric is not supported.
  - `DetailedView.tsx` uses a guarded dynamic import (`require(...)`) to call `fetchDetailedDataPaged`; otherwise it slices the full list.

### Report Generation Architecture

#### Report Generation with Attendance Logic

##### Attendance and Assembly Work Determination

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

## Known Pitfalls & Solutions

### SLP Level Filtering Issue

**Problem**: When SLP is selected, AC-level metrics should show 0, but they were incorrectly showing AC-level data.

**Solution**: 
- Added early return for `getWtmSlpSummary` when SLP level is selected
- Return zero values: `{totalMeetings: 0, totalSlps: 0, totalOnboarded: 0}`

```typescript
// When SLP level is selected, return zero values for AC-level metrics
if (handler_id && slp) {
  return {
    totalMeetings: 0,
    totalSlps: 0,
    totalOnboarded: 0
  };
}
```

### Handler ID Patterns & Solutions

**Regular SLP**: Use document ID only as handler_id
```typescript
// For regular SLPs, use document ID only
let handlerId = selectedSlpId; 
```

**Shakti SLP**: Use shaktiId property as handler_id
```typescript
// For Shakti SLPs, use shaktiId as handler_id
if (selectedSlp?.isShaktiSLP && selectedSlp?.shaktiId) {
  handlerId = selectedSlp.shaktiId;
} 
```

**ASLP Pattern**: Check both document ID and handler_id property
```typescript
if (handler_id && slp) {
  const possibleIds = [];
  
  // For regular SLPs, check both document ID and handler_id property
  possibleIds.push(slp.uid); // Document ID
  if (slp.handler_id) {
    possibleIds.push(slp.handler_id); // Handler ID property
  }
  
  if (possibleIds.length > 0) {
    baseQuery = query(baseQuery, where('handler_id', 'in', possibleIds));
  }
}
```

### Navigation State Race Conditions

**Problem**: When navigating between hierarchy levels (e.g., Zone → Assembly → Zone), stale state causes incorrect data display.

**Solution**: Explicit state reset in useEffect hooks for each navigation level change.

### Map Navigation

**Note**: The "View Map" button on the home page is currently commented out/hidden. The map page remains accessible directly via `/map` URL but is not exposed in the UI.

```typescript
// Commented out in app/home/page.tsx
{/* Commented out "View Map" button as requested
{role === 'admin' && (
  <div className="flex justify-center mb-6">
    <Link href="/map">
      <button className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition font-semibold text-lg">
        View Map
      </button>
    </Link>
  </div>
)}
*/}
```

```typescript
// Load assemblies when zone changes
React.useEffect(() => {
  if (!selectedZoneId) {
    setAssemblies([]);
    setSelectedAssembly(null);
    setSelectedAcId(null);
    setSelectedSlpId(null);
    return;
  }
  // Reset child selections when zone changes
  setSelectedAssembly(null);
  setSelectedAcId(null);
  setSelectedSlpId(null);
  fetchAssemblies(selectedZoneId).then(setAssemblies);
}, [selectedZoneId]);

// Custom navigation handlers
const handleZoneChange = (zoneId: string) => {
  console.log('[Navigation] Zone changed to:', zoneId);
  setSelectedZoneId(zoneId);
  // Child selections will be reset by useEffect
};
```

### Date Filtering Issues

**Problem**: "All Time" filter shows zero data for AC while specific date ranges work.

**Solution**: Added fallback dates for "All Time" filter:

```typescript
// AC date fallback logic
const acStartDate = coordinatorStartDate || '2000-01-01';
const acEndDate = coordinatorEndDate || new Date().toISOString().split('T')[0];

getCoordinatorDetails(acStartDate, acEndDate, selectedAssembly, selectedAcId);
```

**Problem**: "Last Week" filter excludes recent data due to UTC conversion.

**Solution**: Implemented timezone-safe date formatting:

```typescript
// Helper function to format date in local timezone as YYYY-MM-DD
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Usage (instead of toISOString which converts to UTC)
const result = {
  startDate: start ? formatLocalDate(start) : "",
  endDate: end ? formatLocalDate(end) : "",
};
```
