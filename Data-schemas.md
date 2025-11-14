# Data Schemas and Patterns

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

#### Nukkad Meetings (NEW)

- AC-level (WTM & Shakti): collection `wtm-slp`, `form_type: 'nukkad_meeting'`
  - WTM card: exclude `parentVertical === 'shakti-abhiyaan'` (treat missing as WTM)
  - Shakti card: include only `parentVertical === 'shakti-abhiyaan'` (explicit Firestore filter)
  - Date filter: `createdAt` epoch ms (fallback: `created_at` epoch ms), UTC day boundaries
  - Assembly chunking for `where('assembly','in', chunk)`
  - Optional `handler_id` filter for AC-level

- SLP-level (WTM only): collection `slp-activity`, `form_type: 'nukkad_meeting'`
  - Exclude `parentVertical === 'shakti-abhiyaan'`
  - Date filter: `createdAt` epoch ms (fallback: `created_at` epoch ms)
  - Assembly chunking supported
  - `handler_id` for regular SLPs is document ID; Shakti SLPs excluded by parentVertical rule

UI & Data Flow:
- Cards: `nukkadAc` (both verticals), `nukkadSlp` (WTM only)
- Detailed view: `NukkadMeetingsList.tsx`
- Photos: Nukkad detailed list shows a "View Photos" action. Images are normalized to `image_links` from any of: `image_links`, `imageLinks`, `photoUrls`, `photo_urls`, `photos`, `images`.
- Coordinator names:
  - AC Nukkad: resolved via `users` collection (existing behavior)
  - SLP Nukkad: resolved ONLY via `wtm-slp` using SLP document IDs (no `users` lookup)
- Fetchers:
  - AC: `getHierarchicalNukkadAc()` + `fetchDetailedNukkadAc()`
  - SLP: `getHierarchicalNukkadSlp()` + `fetchDetailedNukkadSlp()`
- Summary wiring: `fetchCumulativeMetrics()` adds `nukkadAc`, `nukkadSlp` (AC metric is 0 at SLP level)

Report Generation (WTM) — Total Nukkads (Display-only):
- Location: `app/utils/reportDataAggregation.ts`
- Policy: Do NOT attribute SLP Nukkads to ACs. Instead, per AC row show a derived "Total Nukkads" = `nukkadAc` (per-AC) + `nukkadSlp` (assembly-level total for that assembly and date range).
- Implementation:
  - Conditionally fetch detailed `nukkadAc` and `nukkadSlp` (WTM-only by passing `vertical: 'wtm'`).
  - Increment `nukkadAc` in per-AC metrics via `addActivityToAssemblyAc(...,'nukkadAc')`.
  - Aggregate `nukkadSlp` by assembly only, and inject into each `assemblyData.metrics.nukkadSlp`.
  - Annotate each AC's metrics with `assemblyNukkadSlp` for display-only derivation.
  - In performance generators, set `ACAssemblyRow.totalNukkads = nukkadAc + assemblyNukkadSlp`.
- Types: `models/reportTypes.ts` extended `ACAssemblyRow` with optional `totalNukkads`.
- PDF: `app/utils/pdfGenerator.tsx` adds a "Total Nukkads" column in both the main AC table and the AC-with-assemblies tables; values are derived and not used in rollups.
- Totals: Executive Summary and Zone/Assembly totals continue to use properly scoped metrics (`nukkadAc` + `nukkadSlp`) and never sum per-AC `totalNukkads`.

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

### 8. **d2d_members** Collection (for D2D Members List)
```typescript
{
  id: string,              // Document ID (not displayed in UI)
  name: string,
  phoneNumber: string,
  assembly: string,
  handler_id: string,      // Not displayed; used for joins when needed
  role: 'AC' | 'SLP' | 'Saathi',
  status: string,          // e.g., 'Active'
  createdAt: number,       // Epoch ms; used for date-range filtering (UTC day boundaries)
  parentVertical?: 'wtm' | 'shakti-abhiyaan'  // Vertical assignment (optional)
}
```
**Query Pattern**: `where('createdAt','>=', startMs), where('createdAt','<=', endMs), orderBy('createdAt')` with cursor pagination.
**Display Rule**: Hide `id`, `handler_id`, and `createdAt` in UI; show `name`, `phoneNumber`, `assembly`, `role`, `status`.
**Ordering**: Role precedence `AC > SLP > Saathi`, then name.

**Handler ID Semantics for Shakti Abhiyaan:**
- **AC**: `handler_id` = AC's own phone number (self-referential)
- **SLP**: `handler_id` = Parent AC's phone number (from "AC Phone No." in source data)
- **Saathi**: `handler_id` = Parent SLP's phone number (from "SLP Phone No." in source data)

**Import Script**: `scripts/import-d2d-shakti-members.js`
- Parses `workbook.xlsx` with 3 sheets: "AC Details", "SLP Details", "Saathi Details"
- Normalizes phone numbers to last 10 digits for consistent matching
- Derives assembly for SLP/Saathi by traversing parent hierarchy (SLP→AC→Assembly, Saathi→SLP→AC→Assembly)
- Generates deterministic document IDs: `shakti-{role}-{phoneNumber}`
- Outputs:
  - `scripts/output/d2d_valid_entries.json`: Valid entries ready for Firestore upload
  - `scripts/output/d2d_conflicts.json`: Entries with missing parent references requiring review
- Deduplicates by (role + phoneNumber), last entry wins
- Sets `parentVertical: 'shakti-abhiyaan'` for all entries

#### D2D Members List UI Behavior (Show-all Mode)
- Loader: `components/ghar-ghar-yatra/D2DMembersList.tsx`
- Fetcher: `app/utils/fetchD2DMembers.ts`
- Behavior:
  - Uses `fetchAllD2DMembers()` to page through the entire `d2d_members` collection (no date filtering; cursor on `createdAt` ASC, page size 500).
  - Metrics are attached once via `attachGgyMetricsToMembers()` using `fetchOverviewSourceData()` (summary-first source) for efficient per-member aggregations.
  - Search is fully in-memory (name, assembly, phone substring; phone digits normalized). Sorting is client-side with role precedence, then selected column.
  - Default sort is by `Total Punches` in descending order to surface high activity first.
  - Pagination UI is removed. The table represents the entire roster; only the metrics reflect the selected date range.
  - Performance notes:
  - Default date range remains "lastWeek" to keep loads bounded; selecting very wide ranges may increase load time and memory.
  - Consider using narrower ranges for best UX. Future enhancement could add server-side tokenized search if needed.

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

## Query Patterns & Firestore Constraints

### Assembly Chunking Pattern (for >10 assemblies)

**Problem**: Firestore `in` operator limited to maximum 10 values

**Solution**: Chunk assemblies into groups of 10, run parallel queries, and combine results

**Implementation**:

```typescript
// Example from getHierarchicalMemberActivity
if (assemblies && assemblies.length > 0) {
  const uniqueAssemblies = [...new Set(assemblies)];
  
  if (uniqueAssemblies.length <= 10) {
    // Single query for <=10 assemblies
    const query1WithAssemblies = query(baseQuery1, where('assembly', 'in', uniqueAssemblies));
    const query2WithAssemblies = query(baseQuery2, where('assembly', 'in', uniqueAssemblies));
    const [snap1, snap2] = await Promise.all([getDocs(query1WithAssemblies), getDocs(query2WithAssemblies)]);
    snap1Results = [snap1];
    snap2Results = [snap2];
  } else {
    // Chunk into groups of 10 and run parallel queries
    const chunks = [];
    for (let i = 0; i < uniqueAssemblies.length; i += 10) {
      chunks.push(uniqueAssemblies.slice(i, i + 10));
    }
    
    console.log(`[FunctionName] Chunking ${uniqueAssemblies.length} assemblies into ${chunks.length} queries`);
    
    const query1Promises = chunks.map(chunk => getDocs(query(baseQuery1, where('assembly', 'in', chunk))));
    const query2Promises = chunks.map(chunk => getDocs(query(baseQuery2, where('assembly', 'in', chunk))));
    
    const [query1Results, query2Results] = await Promise.all([
      Promise.all(query1Promises),
      Promise.all(query2Promises)
    ]);
    
    snap1Results = query1Results;
    snap2Results = query2Results;
  }
} else {
  // No assembly filter
  const [snap1, snap2] = await Promise.all([getDocs(baseQuery1), getDocs(baseQuery2)]);
  snap1Results = [snap1];
  snap2Results = [snap2];
}

// Process all results with deduplication
const activitiesMap = new Map();
snap1Results.forEach((snap) => {
  snap.forEach((doc) => {
    if (!activitiesMap.has(doc.id)) {
      activitiesMap.set(doc.id, { ...doc.data(), id: doc.id });
    }
  });
});
snap2Results.forEach((snap) => {
  snap.forEach((doc) => {
    if (!activitiesMap.has(doc.id)) {
      activitiesMap.set(doc.id, { ...doc.data(), id: doc.id });
    }
  });
});

// Return activities array from map values
const activities = Array.from(activitiesMap.values());
```

### Dual Query Pattern (for legacy field compatibility)

**Problem**: Data has inconsistent schema with mix of `form_type` and `type` fields

**Solution**: Run parallel queries on both fields and deduplicate results

**Implementation**:

```typescript
// Base queries on both form_type and type fields
let baseQuery1 = query(slpActivityCollection, where('form_type', '==', 'members'));
let baseQuery2 = query(slpActivityCollection, where('type', '==', 'members'));

// Apply filters to both queries
if (assemblies && assemblies.length > 0) {
  baseQuery1 = query(baseQuery1, where('assembly', 'in', assemblies));
  baseQuery2 = query(baseQuery2, where('assembly', 'in', assemblies));
}

if (handler_id) {
  baseQuery1 = query(baseQuery1, where('handler_id', '==', handler_id));
  baseQuery2 = query(baseQuery2, where('handler_id', '==', handler_id));
}

// Execute both queries in parallel
const [snap1, snap2] = await Promise.all([getDocs(baseQuery1), getDocs(baseQuery2)]);

// Combine results with deduplication
const activitiesMap = new Map();
snap1.forEach((doc) => {
  activitiesMap.set(doc.id, { ...doc.data(), id: doc.id });
});
snap2.forEach((doc) => {
  if (!activitiesMap.has(doc.id)) {
    activitiesMap.set(doc.id, { ...doc.data(), id: doc.id });
  }
});

// Convert map to array
const activities = Array.from(activitiesMap.values());
```

## Date/Timezone Handling

### Date Field Patterns
- **String Date Format**: `YYYY-MM-DD` (local timezone, no time component)
- **ISO Date Format**: Full ISO strings with time component
- **Epoch Milliseconds**: Numeric timestamps stored as integers
- **Firebase Timestamp Objects**: Server-generated timestamps

### String Date Comparison Pattern
**Used For**: `dateOfVisit`, `date`, `date_submitted`, `dateFormatted`

```typescript
if (dateRange?.startDate && dateRange?.endDate) {
  baseQuery = query(
    baseQuery,
    where('dateOfVisit', '>=', dateRange.startDate),
    where('dateOfVisit', '<=', dateRange.endDate)
  );
}
```

### Timestamp-based Date Filtering Pattern
**Used For**: More precise time-boundary control with Date objects

```typescript
if (dateRange) {
  // Convert date strings to Date objects with precise time boundaries
  const startDate = new Date(dateRange.startDate);
  startDate.setHours(0, 0, 0, 0); // Start of day
  const endDate = new Date(dateRange.endDate);
  endDate.setHours(23, 59, 59, 999); // End of day
  
  baseQuery = query(
    baseQuery,
    where('date_submitted', '>=', startDate),
    where('date_submitted', '<=', endDate)
  );
}
```

### Epoch Milliseconds Pattern
**Used For**: `created_at` numeric timestamp fields

```typescript
if (dateRange?.startDate && dateRange?.endDate) {
  // Convert YYYY-MM-DD strings to epoch milliseconds with day boundaries
  const startMs = new Date(dateRange.startDate).setHours(0, 0, 0, 0);
  const endMs = new Date(dateRange.endDate).setHours(23, 59, 59, 999);
  
  baseQuery = query(
    baseQuery,
    where('created_at', '>=', startMs),
    where('created_at', '<=', endMs)
  );
}
```

### Timezone-Safe Date String Formatting
**Used to avoid UTC conversion issues in date strings**

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

### Date Field Map by Activity Type
| Activity Type | Collection | Date Field | Format |
|---------------|------------|------------|--------|
| Meetings | wtm-slp | dateOfVisit | YYYY-MM-DD |
| Member Activities | slp-activity | dateOfVisit | YYYY-MM-DD |
| Mai-Bahin Forms | slp-activity | date | YYYY-MM-DD |
| Videos | slp-activity | date_submitted | YYYY-MM-DD |
| Training | slp-activity | dateOfTraining | YYYY-MM-DD |
| Chaupals | slp-activity | dateFormatted | YYYY-MM-DD |
| WhatsApp Groups | wtm-slp | createdAt | ISO string |
| Nukkad Meetings | wtm-slp | createdAt/created_at | epoch ms |
| Shakti Baithaks | slp-activity | dateFormatted | YYYY-MM-DD |

**Critical Note**: Meeting metrics and detailed meetings are filtered by `created_at` (epoch ms) using UTC day boundaries; `date_of_visit` is only displayed and not used for filtering. Mismatched `date_of_visit` entries appear under their submission date (`created_at`).
