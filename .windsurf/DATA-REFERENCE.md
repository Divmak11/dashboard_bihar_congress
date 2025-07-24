# Firebase Data Reference Guide

This document serves as the **single source of truth** for all Firebase collections, data structures, query patterns, and existing functions used in the WTM-SLP Dashboard project.

---

## 📊 Collections Overview

### Core Collections
- **`admin-users`** - Zone Incharges (zones data)
- **`users`** - Assembly Coordinators, SLPs, general users
- **`wtm-slp`** - Meeting data, assembly WA groups, volunteers, SLPs
- **`slp-activity`** - SLP activities (members, videos, forms, etc.)
- **`shakti-abhiyaan`** - Shakti program data, covered coordinators and SLPs
- **`call-center`** - Central WA groups data

---

## 🏗️ Hierarchical Navigation Data Sources

### 1. Zones
**Collection:** `admin-users`
**Query:** `where('role', '==', 'zonal-incharge')`
**Display:** "Zone 1", "Zone 2", ... (sequential numbering)
**Data Structure:**
```typescript
{
  id: string,           // Document ID
  role: 'zonal-incharge',
  assemblies: string[], // Array of assembly names
  name?: string,
  zoneName?: string
}
```

### 2. Assemblies
**Source:** Selected zone's `assemblies` array from `admin-users`
**Method:** `getDoc(doc(db, 'admin-users', zoneId))`
**Data:** `data.assemblies` array

### 3. Assembly Coordinators (AC)
**Source 1:** `users` collection
- **Query:** `where('role', '==', 'Assembly Coordinator') && where('assembly', '==', selectedAssembly)`
- **Structure:**
```typescript
{
  id: string,
  role: 'Assembly Coordinator',
  assembly: string,
  name: string,
  handler_id?: string
}
```

**Source 2:** `shakti-abhiyaan` collection
- **Query:** `where('form_type', '==', 'add-data')`
- **Path:** `data.coveredAssemblyCoordinators[]`
- **Structure:**
```typescript
{
  coveredAssemblyCoordinators: [
    {
      id: string,
      name: string,
      assembly: string,
      handler_id?: string,
      slps?: SLP[]
    }
  ]
}
```

### 4. SLPs (Samvidhan Leaders)
**Source 1:** Associated SLPs from `shakti-abhiyaan`
- **Path:** `coveredAssemblyCoordinators[].slps[]`
- **Condition:** `coord.id === selectedAcId`

**Source 2:** Meeting SLPs from `wtm-slp`
- **Query:** `where('form_type', '==', 'meeting') && where('recommendedPosition', '==', 'SLP') && where('handler_id', '==', selectedAcId)`
- **Field:** `recommendedPersonName`

**Source 3:** Independent SLPs from `users`
- **Query:** `where('role', '==', 'SLP') && where('independent', '==', true)`
- **Display:** Shows "- Independent" suffix

---

## 📈 Metric Data Sources & Existing Functions

### Meeting-Related Metrics
| Metric | Collection | Function | Query Pattern |
|--------|------------|----------|---------------|
| Total Meetings | `wtm-slp` | `getTotalMeetings()` | `form_type="meeting"` |
| Volunteers Onboarded | `wtm-slp` | `getTotalVolunteersOnboarded()` | `form_type="meeting" && onboardingStatus="Onboarded"` |
| SLPs Added | `wtm-slp` | `getTotalSLPsAdded()` | `form_type="meeting" && recommendedPosition="SLP"` |

### SLP Activity Metrics
| Metric | Collection | Function | Query Pattern |
|--------|------------|----------|---------------|
| Samvidhan Saathi | `slp-activity` | `getSlpMemberActivity()` | `form_type="members"` |
| Samvidhan Clubs | `slp-activity` | `getSlpPanchayatWaActivity()` | `form_type="panchayat-wa"` |
| Mai-Bahin-Yojna Forms | `slp-activity` | `getSlpMaiBahinYojnaActivity()` | `form_type="mai-bahin-yojna"` |
| Local Issue Videos | `slp-activity` | `getSlpLocalIssueVideoActivity()` | `form_type="local-issue-video"` |
| Training Activities | `slp-activity` | `getSlpTrainingActivity()` | `form_type="training"` |

### New Metrics (To Be Implemented)
| Metric | Collection | Query Pattern | Notes |
|--------|------------|---------------|-------|
| Samvidhan Chaupals | `slp-activity` | `form_type="weekly_meeting"` | New function needed |
| Shakti Leaders | `slp-activity` | `form_type="members" && parentVertical="shakti-abhiyaan"` | New function needed |
| Shakti Saathi | `slp-activity` | `form_type="members" && parentVertical="shakti-abhiyaan"` | New function needed |
| Shakti Clubs | `slp-activity` | `form_type="panchayat-wa" && parentVertical="shakti-abhiyaan"` | New function needed |
| Shakti Mai-Bahin | `slp-activity` | `form_type="mai-bahin-yojna" && parentVertical="shakti-abhiyaan"` | New function needed |
| Central WA Groups | `call-center` | `form_type="central-wa"` | New function needed |
| Assembly WA Groups | `wtm-slp` | `form_type="assembly-wa"` | New function needed |

---

## 🔍 Query Patterns & Filtering

### Date Filtering
**Pattern:** All functions support optional `dateRange` parameter
```typescript
interface DateRange {
  startDate: string; // YYYY-MM-DD format
  endDate: string;   // YYYY-MM-DD format
}
```

**Implementation:**
```typescript
if (dateRange) {
  const startDate = new Date(dateRange.startDate);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(dateRange.endDate);
  endDate.setHours(23, 59, 59, 999);
  
  baseQuery = query(
    baseQuery,
    where('date_field', '>=', startDate),
    where('date_field', '<=', endDate)
  );
}
```

### Handler ID Filtering (for AC/SLP specific data)
**SLP Pattern:**
```typescript
// For SLPs: use document ID directly
where('handler_id', '==', slp.uid)

// For ASLPs: check both document ID and handler_id field
const possibleIds = [slp.uid];
if (slp.handler_id) possibleIds.push(slp.handler_id);
where('handler_id', 'in', possibleIds)
```

**AC Pattern:**
```typescript
where('handler_id', '==', ac.uid)
```

### Assembly Filtering
```typescript
// Single assembly
where('assembly', '==', assemblyName)

// Multiple assemblies (for zone-level data)
where('assembly', 'in', assemblyArray)
```

---

## 📅 Date Field Reference

| Collection | Date Field | Format | Notes |
|------------|------------|--------|-------|
| `wtm-slp` | `date_submitted` | Date object | Meeting submissions |
| `slp-activity` | `dateOfVisit` | String "YYYY-MM-DD" | Member activities |
| `slp-activity` | `date_submitted` | Date object | Other activities |
| `slp-activity` | `date` | Date object | Training activities |
| `call-center` | `date_submitted` | Date object | Central WA groups |

---

## 🏷️ Role Values Reference

| Entity | Collection | Role Field Value |
|--------|------------|------------------|
| Zone Incharge | `admin-users` | `'zonal-incharge'` |
| Assembly Coordinator | `users` | `'Assembly Coordinator'` |
| SLP | `users` | `'SLP'` |
| ASLP | `users` | `'ASLP'` |

---

## 🔧 Existing Function Reference

### Location: `app/utils/fetchFirebaseData.ts`

#### Meeting Functions
- `getTotalMeetings(assemblies?, dateRange?, handler_id?)`
- `getTotalVolunteersOnboarded(assemblies?, dateRange?, handler_id?)`
- `getTotalSLPsAdded(assemblies?, dateRange?, handler_id?)`

#### SLP Activity Functions
- `getSlpMemberActivity(slp, dateRange?)`
- `getSlpPanchayatWaActivity(slp, dateRange?)`
- `getSlpMaiBahinYojnaActivity(slp, dateRange?)`
- `getSlpLocalIssueVideoActivity(slp, dateRange?)`
- `getSlpTrainingActivity(slp, dateRange?)`

#### AC Functions
- `getCoordinatorDetails(coordinatorId, startDate, endDate)`
- `getAcLocalIssueVideoActivities(coordinatorId, startDate, endDate)`

### Location: `app/utils/fetchHierarchicalData.ts`

#### Navigation Functions
- `fetchZones()` - Returns Zone[]
- `fetchAssemblies(zoneId)` - Returns string[]
- `fetchAssemblyCoordinators(assembly)` - Returns AC[]
- `fetchSlpsForAc(acId)` - Returns SLP[]

#### Metric Functions (placeholder)
- `fetchCumulativeMetrics()` - To be implemented

---

## 📋 TypeScript Interfaces

### Location: `models/hierarchicalTypes.ts`

```typescript
interface Zone {
  id: string;
  name: string; // "Zone 1", "Zone 2", etc.
  assemblies: string[];
}

interface AC {
  uid: string;
  name: string;
  assembly: string;
  handler_id?: string;
}

interface SLP {
  uid: string;
  name: string;
  assembly: string;
  role: 'SLP' | 'ASLP';
  handler_id?: string;
  independent?: boolean;
}

interface CumulativeMetrics {
  meetings: number | string;
  volunteers: number | string;
  slps: number | string;
  saathi: number | string;
  leaders: number | string;
  clubs: number | string;
  forms: number | string;
  videos: number | string;
  waGroups: number | string;
  chaupals: number | string;
}
```

---

## ⚠️ Important Notes

1. **Date Handling:** Always use timestamp-based filtering with proper time boundaries
2. **ASLP Queries:** Always check both `slp.uid` and `slp.handler_id` for complete data
3. **Deduplication:** When combining multiple sources, check for duplicates by ID
4. **Error Handling:** All functions should have try-catch blocks and return empty arrays/objects on error
5. **Caching:** Zone-level data should be cached for assembly-level reuse
6. **Independent SLPs:** Always included when SLP dropdown is visible, regardless of AC selection

---

## 🔄 Data Flow Summary

```
Zone Selection → Assembly Selection → AC Selection → SLP Selection
     ↓               ↓                 ↓              ↓
Zone Data      Assembly Data     AC Data        SLP Data
(aggregated)   (assembly-specific) (AC-specific) (SLP-specific)
     ↓               ↓                 ↓              ↓
Metric Cards   Metric Cards      Metric Cards   Metric Cards
(zone level)   (assembly level)  (AC level)     (SLP level)
```

This reference should be consulted for all Firebase queries and data structure decisions to maintain consistency across the project.
