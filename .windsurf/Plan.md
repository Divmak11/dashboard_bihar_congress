# WTM-SLP Hierarchical Dashboard - Technical Implementation Plan

## 🎯 Project Overview

**Objective**: Create a new hierarchical dashboard page `/wtm-slp-new` with 4-level navigation (Zone → Assembly → AC → SLP) and cumulative data visualization.

**Key Requirements**:
- 3-panel layout (Left: Navigation, Right: Data Cards, Bottom: Details)
- 14 data metrics with caching optimization
- Independent SLP indicators
- Date filtering across all levels
- Professional UI with grouped cards

---

## 🗂️ File Structure & Components

### **New Files to Create**

```
📁 app/wtm-slp-new/
└── page.tsx                    # Main hierarchical dashboard page

📁 app/utils/
└── fetchHierarchicalData.ts    # Duplicate & extend existing functions

📁 components/hierarchical/
├── HierarchicalNavigation.tsx  # Left panel navigation dropdowns
├── CumulativeDataCards.tsx     # Right panel data cards
├── DetailedView.tsx           # Bottom panel detailed view
└── MetricCard.tsx             # Individual metric card component

📁 models/
└── hierarchicalTypes.ts       # New type definitions
```

### **Files to Modify**

```
📁 app/
├── layout.tsx                 # Add navigation link to new page
└── page.tsx                   # Update main routing

📁 components/
└── Navigation.tsx             # Add new page to navigation menu
```

---

## 🏗️ Technical Architecture

### **State Management Structure**

```typescript
// Main page state
interface HierarchicalState {
  // Navigation State
  selectedZone: Zone | null;
  selectedAssembly: string | null;
  selectedAC: AC | null;
  selectedSLP: SLP | null;
  
  // Data State
  zones: Zone[];
  assemblies: string[];
  acs: AC[];
  slps: SLP[];
  
  // Metrics State
  cumulativeData: CumulativeMetrics;
  detailedData: DetailedData | null;
  selectedCard: string | null;
  
  // UI State
  loading: {
    zones: boolean;
    assemblies: boolean;
    acs: boolean;
    slps: boolean;
    data: boolean;
  };
  
  // Date Filter
  dateRange: {
    startDate: string;
    endDate: string;
    option: string;
  };
}
```

### **Data Flow Architecture**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Zones     │───▶│  Assemblies  │───▶│   ACs & SLPs    │
│(admin-users)│    │ (from zones) │    │(users + shakti) │
└─────────────┘    └──────────────┘    └─────────────────┘
                                                  │
                                                  ▼
┌─────────────────────────────────────────────────────────┐
│              Cumulative Data Fetching                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   wtm-slp   │  │slp-activity │  │call-center  │    │
│  │ (meetings)  │  │(activities) │  │(central-wa) │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Data Metrics Implementation

### **Existing Functions to Adapt (7 metrics)**

```typescript
// From existing fetchFirebaseData.ts
1. getTotalMeetings(assemblies, dateRange, handler_id)
2. getTotalVolunteersOnboarded(assemblies, dateRange, handler_id)
3. getTotalSLPsAdded(assemblies, dateRange, handler_id)
4. getTotalSamvidhanSaathi(assemblies, dateRange, handler_id)
5. getTotalSamvidhanClubs(assemblies, dateRange, handler_id)
6. getTotalMaiBahinYojnaForms(assemblies, dateRange, handler_id)
7. getTotalLocalIssueVideos(assemblies, dateRange, handler_id)
```

### **New Functions to Implement (7 metrics)**

```typescript
// New implementations needed
8. getTotalSamvidhanChaupals(assemblies, dateRange, handler_id)
   // slp-activity: form_type="weekly_meeting"

9. getTotalShaktiLeaders(assemblies, dateRange, handler_id)
   // slp-activity: form_type="members" + parentVertical="shakti-abhiyaan"

10. getTotalShaktiSaathi(assemblies, dateRange, handler_id)
    // slp-activity: form_type="members" + parentVertical="shakti-abhiyaan"

11. getTotalShaktiClubs(assemblies, dateRange, handler_id)
    // slp-activity: form_type="panchayat-wa" + parentVertical="shakti-abhiyaan"

12. getTotalShaktiMaiBahinYojnaForms(assemblies, dateRange, handler_id)
    // slp-activity: form_type="mai-bahin-yojna" + parentVertical="shakti-abhiyaan"

13. getTotalCentralWAGroups(assemblies, dateRange, handler_id)
    // call-center: form_type="central-wa"

14. getTotalAssemblyWAGroups(assemblies, dateRange, handler_id)
    // wtm-slp: form_type="assembly-wa"
```

---

## 🔄 Caching Strategy & Performance

### **Multi-Level Caching System**

```typescript
interface CacheStructure {
  zoneData: Map<string, ZoneCumulativeData>;
  assemblyData: Map<string, AssemblyCumulativeData>;
  acData: Map<string, ACCumulativeData>;
  slpData: Map<string, SLPCumulativeData>;
  
  // Timestamp for cache invalidation
  lastFetched: Map<string, number>;
  cacheExpiry: number; // 5 minutes
}
```

### **Fetching Strategy**

1. **Zone Level**: Fetch all assemblies in parallel, cache results
2. **Assembly Level**: Use cached data if available, fetch if missing
3. **AC/SLP Level**: Targeted fetching with handler_id filtering
4. **Background Prefetching**: Prefetch common navigation paths

---

## 🎨 UI Component Architecture

### **Component Hierarchy**

```
HierarchicalDashboard (Main Page)
├── HierarchicalNavigation (Left Panel)
│   ├── ZoneDropdown
│   ├── AssemblyDropdown
│   ├── ACDropdown
│   └── SLPDropdown (with independent SLP indicators)
├── CumulativeDataCards (Right Panel)
│   ├── SamvidhanMetricsGroup
│   │   ├── MetricCard (Meetings)
│   │   ├── MetricCard (Volunteers)
│   │   ├── MetricCard (SLPs)
│   │   └── MetricCard (Saathi)
│   ├── ShaktiMetricsGroup
│   │   ├── MetricCard (Leaders)
│   │   ├── MetricCard (Saathi)
│   │   ├── MetricCard (Clubs)
│   │   └── MetricCard (Forms)
│   └── GeneralMetricsGroup
│       ├── MetricCard (Videos)
│       ├── MetricCard (WA Groups)
│       └── MetricCard (Chaupals)
└── DetailedView (Bottom Panel)
    ├── MeetingsList
    ├── ActivitiesList
    └── DataTable
```

### **Styling Strategy**

```scss
// Card Groups with Visual Separation
.samvidhan-metrics { border-left: 4px solid #10B981; }
.shakti-metrics { border-left: 4px solid #F59E0B; }
.general-metrics { border-left: 4px solid #6366F1; }

// Independent SLP Indicator
.independent-slp::before {
  content: "●";
  color: #F97316; // Orange dot
  margin-right: 8px;
}
```

---

## 🚧 Implementation Phases

### **Phase 1: Foundation (Week 1)**
- Set up file structure
- Create basic page layout
- Implement navigation dropdowns
- Set up state management

### **Phase 2: Data Layer (Week 2)**
- Create fetchHierarchicalData.ts
- Implement existing function adaptations
- Create new Firebase functions
- Set up caching system

### **Phase 3: UI Components (Week 3)**
- Build metric cards with grouping
- Implement loading states
- Add error handling
- Create detailed view component

### **Phase 4: Integration & Testing (Week 4)**
- Connect all components
- Implement date filtering
- Performance optimization
- User testing and bug fixes

---

## 🔧 Technical Considerations

### **Firebase Query Optimization**

```typescript
// Batch queries for efficiency
const batchFetchMetrics = async (filters: FilterOptions) => {
  const queries = await Promise.allSettled([
    getTotalMeetings(filters),
    getTotalVolunteersOnboarded(filters),
    getTotalSLPsAdded(filters),
    // ... all 14 metrics
  ]);
  
  return queries.map(result => 
    result.status === 'fulfilled' ? result.value : 0
  );
};
```

### **Error Handling Strategy**

```typescript
// Graceful degradation for failed metrics
const handleMetricError = (error: Error, metricName: string) => {
  console.error(`Failed to fetch ${metricName}:`, error);
  return "-"; // Show dash for failed metrics
};
```

### **Performance Monitoring**

```typescript
// Track fetch times and cache hit rates
const performanceMetrics = {
  fetchTimes: Map<string, number>,
  cacheHitRate: number,
  errorRate: number
};
```

---

## 📝 Testing Strategy

### **Unit Tests**
- Firebase function implementations
- Data transformation logic
- Cache management
- Component rendering

### **Integration Tests**
- End-to-end navigation flow
- Data fetching across hierarchy levels
- Date filtering functionality
- Error handling scenarios

### **Performance Tests**
- Large dataset handling
- Cache efficiency
- Concurrent user scenarios
- Memory usage optimization

---

This technical plan provides a comprehensive roadmap for implementing the hierarchical WTM-SLP dashboard with all required features, performance optimizations, and professional UI design.

---

## 📚 Documentation Reference

**⚠️ IMPORTANT:** Before implementing any Firebase queries or data fetching, consult the **[DATA-REFERENCE.md](./DATA-REFERENCE.md)** for:
- Correct collection names and role values
- Existing function references
- Query patterns and data structures
- TypeScript interfaces
- Date filtering patterns

This prevents errors and ensures consistency across the project.

---

## 🗒️ Progress Tracker

| ID | Task | Owner | Status | Last Updated | Notes / PR / Commit | Review Needed |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | File Structure Setup | — | DONE ✅ | 2025-07-25 | scaffold commit | No review needed |
| T2 | Type Definitions | — | DONE ✅ | 2025-07-25 | metric & cache types commit | Review recommended |
| T3 | Basic Page Layout | — | DONE ✅ | 2025-07-25 | top bar & 3-panel layout commit | UI review |
| T4 | Zone & Assembly Navigation | — | DONE ✅ | 2025-07-25 | Firebase data wired | Needs QA |
| T5 | AC & SLP Navigation | — | DONE ✅ | 2025-07-25 | 4-level dropdowns complete | UI test needed |
| T6 | Metric Cards & Detail View | — | DONE ✅ | 2025-07-25 | interactive cards + detail panel | Ready for data |
| T7 | Data Source Fixes | — | DONE ✅ | 2025-07-25 | AC/SLP from correct collections | Test dropdowns |
| T8 | Data Reference Documentation | — | DONE ✅ | 2025-07-25 | Complete Firebase reference guide | Use for all queries |
| T9 | Real Data Integration | — | DONE ✅ | 2025-07-25 | Live metrics from Firebase | Test with selections |
| T10 | Import Fixes & Testing | — | DONE ✅ | 2025-07-25 | Fixed function imports, PRD checkboxes | Ready for testing |
| T11 | Hierarchical Data Functions | — | DONE ✅ | 2025-07-25 | Duplicated SLP functions for all levels | Test all metrics |
| T12 | Missing Metric Functions | — | DONE ✅ | 2025-07-25 | Implemented all 14 metrics with proper functions | Complete metrics |
| T13 | Metric Data Fixes | — | DONE ✅ | 2025-07-25 | Fixed metric structure, added all 14 metrics | Ready for testing |
| T14 | AC Filtering Bug Fix | — | DONE ✅ | 2025-07-25 | Fixed AC selection to filter by assembly correctly | Metrics show correct data |
| T15 | Navigation State Management Fix | — | DONE ✅ | 2025-07-25 | Fixed state reset when switching between hierarchy levels | Consistent data fetching |
| T31 | Zone Metrics Infinite Loading Fix | — | DONE ✅ | 2025-07-25 | Removed `showError` from metrics fetch dependencies to stop infinite loading | Metrics load correctly |
| T16 | Detailed Data Fetching Functions | — | DONE ✅ | 2025-07-25 | Added fetchDetailedMeetings, fetchDetailedMembers, fetchDetailedVideos | Ready for UI integration |
| T17 | DataTable Component | — | DONE ✅ | 2025-07-25 | Generic table with search, sort, pagination | Reusable for all detailed views |
| T18 | MeetingsList Component | — | DONE ✅ | 2025-07-25 | Specialized component for meeting data display | Proper formatting and privacy |
| T19 | ActivitiesList Component | — | DONE ✅ | 2025-07-25 | Generic component for all activity types | Handles different data structures |
| T20 | DetailedView Integration | — | DONE ✅ | 2025-07-25 | Connected real data fetching to UI components | Full detailed view functionality |
| T21 | Date Filter Integration | — | DONE ✅ | 2025-07-25 | DateRangeFilter positioned and connected to data fetching | All hierarchy levels support date filtering |
| T22 | Date Validation Enhancement | — | DONE ✅ | 2025-07-25 | Added date range validation and error styling | Prevents invalid date ranges |
| T23 | Date-Aware Data Functions | — | DONE ✅ | 2025-07-25 | All 14 metrics and detailed functions support date filtering | Proper date boundary handling |
| T24 | Error Boundary System | — | DONE ✅ | 2025-07-25 | Created ErrorBoundary and HierarchicalErrorBoundary components | Graceful error handling |
| T25 | Error Utilities & Validation | — | DONE ✅ | 2025-07-25 | Added errorUtils with user-friendly messages and validation | Proper error categorization |
| T26 | Toast Notification System | — | DONE ✅ | 2025-07-25 | Created Toast component with useToast hook | User-friendly error feedback |
| T27 | Dashboard Error Integration | — | DONE ✅ | 2025-07-25 | Integrated error handling into main dashboard | Comprehensive error coverage |
| T28 | UI Polish & Styling | — | DONE ✅ | 2025-07-25 | Added loading animations, responsive design, accessibility | Professional appearance |
| T29 | Navigation Integration | — | DONE ✅ | 2025-07-25 | Integrated with main navigation and breadcrumbs | Seamless navigation flow |
| T30 | Final PRD Completion | — | DONE ✅ | 2025-07-25 | All PRD tasks completed successfully | Ready for production |
| T32 | Deep Search Enhancement in DataTable | — | DONE ✅ | 2025-07-25 | Added recursive extraction of nested values to enable name-based search | Verify search by person name |
| T33 | SLP Level Metrics Filtering Fix | — | DONE ✅ | 2025-07-25 | Fixed SLP selection to use proper handler_id filtering for scoped data | SLP metrics now show correct filtered data |
| T34 | Enhanced Video Detailed View | — | DONE ✅ | 2025-07-25 | Created VideosList component with watch video, view images, and proper video properties | Videos show all relevant data and actions |
| T35 | Enhanced Forms Detailed View | — | DONE ✅ | 2025-07-25 | Created FormsList component with completion rates, summary cards, and proper form properties | Forms show distribution/collection metrics |
| T36 | ClubsList Component & DetailedView Integration | — | DONE ✅ | 2025-07-25 | Added ClubsList component and integrated into DetailedView for Clubs & WA Groups | Review UI |
| T37 | Zone Name, Label Renames, Volunteers Detail Fix | — | IN-PROGRESS | 2025-07-25 | Implemented zone incharge name display, renamed SLP labels to Samvidhan Leader, fixed volunteers/slps detailed view routing | |

_Add new rows or update existing ones as work progresses. Use **Status** values: `TODO`, `IN-PROGRESS`, `DONE ✅`, `BLOCKED`._

### 🔍 Review Notes
Use this section to record any design/code reviews or important clarifications:

- _T1_: —
- _T2_: —
- _General_: —

> Before starting a task, skim the Progress Tracker and Review Notes to see current status and pending feedback.
