# Product Requirements Document (PRD)
# WTM-SLP Hierarchical Dashboard Implementation

## 📋 Document Information
- **Project**: WTM-SLP Hierarchical Dashboard
- **Version**: 1.0
- **Date**: July 2025
- **Status**: Ready for Implementation

---

## 🎯 Project Overview

### **Vision Statement**
Create a hierarchical navigation dashboard for WTM-SLP data that allows users to drill down from Zone → Assembly → AC → SLP levels with cumulative data visualization and detailed views.

### **Success Criteria**
- ✅ 4-level hierarchical navigation working seamlessly
- ✅ 14 data metrics displayed accurately at each level
- ✅ Professional UI with grouped metric cards  
- ✅ Optimized performance with caching
- ✅ Date filtering across all hierarchy levels
- ✅ Detailed view for selected metrics

---

## 📋 EPIC 1: Project Foundation & Setup

### **TASK 1.1: File Structure Setup**
**Priority**: HIGH | **Effort**: 2 hours

#### **Subtasks:**
- [ ] **1.1.1**: Create `/app/wtm-slp-new/page.tsx` main page file
- [ ] **1.1.2**: Create `/app/utils/fetchHierarchicalData.ts` for data functions
- [ ] **1.1.3**: Create `/components/hierarchical/` folder structure
- [ ] **1.1.4**: Create `/models/hierarchicalTypes.ts` for type definitions

#### **Acceptance Criteria:**
- All files created with proper TypeScript structure
- Proper import/export setup
- No build errors

### **TASK 1.2: Type Definitions**
**Priority**: HIGH | **Effort**: 3 hours

#### **Subtasks:**
- [ ] **1.2.1**: Define `HierarchicalState` interface
- [ ] **1.2.2**: Define `CumulativeMetrics` interface  
- [ ] **1.2.3**: Define `Zone`, `AC`, `SLP` interfaces
- [ ] **1.2.4**: Define component prop interfaces

#### **Acceptance Criteria:**
- All interfaces properly typed
- Compatible with existing type system
- No TypeScript errors

### **TASK 1.3: Basic Page Layout**
**Priority**: HIGH | **Effort**: 4 hours

#### **Subtasks:**
- [ ] **1.3.1**: Create 3-panel layout structure (Left, Right, Bottom)
- [ ] **1.3.2**: Add responsive design classes
- [ ] **1.3.3**: Add date filter in top-right corner
- [ ] **1.3.4**: Set up basic routing for `/wtm-slp-new`

#### **Acceptance Criteria:**
- Layout renders correctly on all screen sizes
- Panels are properly sized and positioned
- Page accessible via new route

---

## 📋 EPIC 2: Left Panel - Hierarchical Navigation

### **TASK 2.1: Zone Dropdown Implementation**
**Priority**: HIGH | **Effort**: 4 hours

#### **Subtasks:**
- [x] **2.1.1**: Create `fetchZones()` function for admin-users query
- [x] **2.1.2**: Transform data to "Zone 1", "Zone 2" format
- [x] **2.1.3**: Implement ZoneDropdown component
- [x] **2.1.4**: Add zone selection state management

#### **Acceptance Criteria:**
- Zones load from `admin-users` collection
- Dropdown shows indexed zone names
- Selection updates global state

### **TASK 2.2: Assembly Dropdown Implementation**
**Priority**: HIGH | **Effort**: 3 hours

#### **Subtasks:**
- [x] **2.2.1**: Extract assemblies from selected zone data
- [x] **2.2.2**: Implement AssemblyDropdown component
- [x] **2.2.3**: Add assembly selection state management
- [x] **2.2.4**: Implement dropdown enabling/disabling logic

#### **Acceptance Criteria:**
- Assemblies populate when zone selected
- Dropdown disabled when no zone selected
- Assembly selection triggers data refresh

### **TASK 2.3: AC Dropdown Implementation**
**Priority**: HIGH | **Effort**: 5 hours

#### **Subtasks:**
- [x] **2.3.1**: Create `fetchAssemblyCoordinators()` function
- [x] **2.3.2**: Implement dual source fetching (users + shakti-abhiyaan)
- [x] **2.3.3**: Handle data merging and deduplication
- [x] **2.3.4**: Implement ACDropdown component

#### **Acceptance Criteria:**
- ACs loaded from both `users` and `shakti-abhiyaan` collections
- No duplicate entries in dropdown
- Proper handler_id/docId mapping

### **TASK 2.4: SLP Dropdown Implementation**
**Priority**: HIGH | **Effort**: 6 hours

#### **Subtasks:**
- [x] **2.4.1**: Create `fetchAssociatedSLPs()` function for AC-linked SLPs
- [x] **2.4.2**: Create `fetchIndependentSLPs()` function
- [x] **2.4.3**: Implement SLP merging with independent SLP indicators
- [x] **2.4.4**: Add orange dot styling for independent SLPs
- [x] **2.4.5**: Implement SLPDropdown component

#### **Acceptance Criteria:**
- Associated SLPs loaded from correct sources
- Independent SLPs appear last with orange dot
- SLP selection triggers individual data view

---

## 📋 EPIC 3: Right Panel - Cumulative Data Cards

### **TASK 3.1: Existing Metrics Adaptation**
**Priority**: HIGH | **Effort**: 8 hours

#### **Subtasks:**
- [ ] **3.1.1**: Adapt `getTotalMeetings()` for hierarchical filtering
- [ ] **3.1.2**: Adapt `getTotalVolunteersOnboarded()` function
- [ ] **3.1.3**: Adapt `getTotalSLPsAdded()` function
- [ ] **3.1.4**: Adapt `getTotalSamvidhanSaathi()` function
- [ ] **3.1.5**: Adapt `getTotalSamvidhanClubs()` function
- [ ] **3.1.6**: Adapt `getTotalMaiBahinYojnaForms()` function
- [ ] **3.1.7**: Adapt `getTotalLocalIssueVideos()` function

#### **Acceptance Criteria:**
- All 7 existing functions support assembly/handler_id filtering
- Date range filtering maintained
- Proper error handling with "-" fallback

### **TASK 3.2: New Metrics Implementation**
**Priority**: HIGH | **Effort**: 10 hours

#### **Subtasks:**
- [ ] **3.2.1**: Implement `getTotalSamvidhanChaupals()` function
- [ ] **3.2.2**: Implement `getTotalShaktiLeaders()` function
- [ ] **3.2.3**: Implement `getTotalShaktiSaathi()` function
- [ ] **3.2.4**: Implement `getTotalShaktiClubs()` function
- [ ] **3.2.5**: Implement `getTotalShaktiMaiBahinYojnaForms()` function
- [ ] **3.2.6**: Implement `getTotalCentralWAGroups()` function
- [ ] **3.2.7**: Implement `getTotalAssemblyWAGroups()` function

#### **Acceptance Criteria:**
- All 7 new functions created with proper Firebase queries
- Support for parentVertical filtering where needed
- Consistent parameter structure across all functions

### **TASK 3.3: Metric Cards UI Components**
**Priority**: HIGH | **Effort**: 6 hours

#### **Subtasks:**
- [x] **3.3.1**: Create `MetricCard` base component
- [x] **3.3.2**: Implement card grouping with color coding
- [x] **3.3.3**: Add loading states and error handling
- [x] **3.3.4**: Implement card selection functionality
- [x] **3.3.5**: Add hover effects and animations

#### **Acceptance Criteria:**
- Cards visually grouped (Samvidhan, Shakti, General)
- Professional styling with shadows and borders
- Click functionality to trigger detailed view
- Shows "-" for missing/error data

---

## 📋 EPIC 4: Data Fetching & Caching System

### **TASK 4.1: Caching Infrastructure**
**Priority**: MEDIUM | **Effort**: 5 hours

#### **Subtasks:**
- [ ] **4.1.1**: Implement cache structure with Map objects
- [ ] **4.1.2**: Add cache expiry logic (5 minutes)
- [ ] **4.1.3**: Implement cache hit/miss tracking
- [ ] **4.1.4**: Add cache invalidation on data updates

#### **Acceptance Criteria:**
- Cache reduces redundant Firebase calls
- Proper cache invalidation prevents stale data
- Performance metrics tracked

### **TASK 4.2: Parallel Data Fetching**
**Priority**: MEDIUM | **Effort**: 4 hours

#### **Subtasks:**
- [ ] **4.2.1**: Implement `Promise.allSettled()` for batch fetching
- [ ] **4.2.2**: Add error resilience for failed metrics
- [ ] **4.2.3**: Implement loading state management
- [ ] **4.2.4**: Add retry logic for failed requests

#### **Acceptance Criteria:**
- All 14 metrics fetch in parallel
- Failed metrics don't block others
- Graceful error handling

### **TASK 4.3: Smart Data Prefetching**
**Priority**: LOW | **Effort**: 3 hours

#### **Subtasks:**
- [ ] **4.3.1**: Identify common navigation patterns
- [ ] **4.3.2**: Implement background prefetching
- [ ] **4.3.3**: Add prefetch cancellation logic
- [ ] **4.3.4**: Monitor prefetch effectiveness

#### **Acceptance Criteria:**
- Common paths load faster
- No unnecessary network requests
- Background fetching doesn't impact performance

---

## 📋 EPIC 5: Bottom Panel - Detailed View

### **TASK 5.1: Detailed View Components**
**Priority**: MEDIUM | **Effort**: 6 hours

#### **Subtasks:**
- [x] **5.1.1**: Create `DetailedView` container component
- [x] **5.1.2**: Implement `MeetingsList` component
- [x] **5.1.3**: Implement `ActivitiesList` component  
- [x] **5.1.4**: Create `DataTable` component for generic lists

#### **Acceptance Criteria:**
- Detailed view appears below both panels
- Shows relevant data based on selected card
- Proper pagination for large datasets

### **TASK 5.2: Data Transformation**
**Priority**: MEDIUM | **Effort**: 4 hours

#### **Subtasks:**
- [x] **5.2.1**: Create data transformation utilities
- [x] **5.2.2**: Implement sorting and filtering logic
- [x] **5.2.3**: Add search functionality
- [x] **5.2.4**: Format data for display

#### **Acceptance Criteria:**
- Data properly formatted for tables
- Search and filter work correctly
- Sorting maintains data integrity

---

## 📋 EPIC 6: Date Filtering Integration

### **TASK 6.1: Date Filter Component**
**Priority**: HIGH | **Effort**: 3 hours

#### **Subtasks:**
- [x] **6.1.1**: Integrate existing DateRangeFilter component
- [x] **6.1.2**: Position in top-right corner
- [x] **6.1.3**: Connect to hierarchical data fetching
- [x] **6.1.4**: Add date state management

#### **Acceptance Criteria:**
- Date filter affects all hierarchy levels
- Consistent with existing implementation
- Proper state updates trigger data refresh

### **TASK 6.2: Date-Aware Data Fetching**
**Priority**: HIGH | **Effort**: 4 hours

#### **Subtasks:**
- [x] **6.2.1**: Update all 14 metric functions for date filtering
- [x] **6.2.2**: Implement proper date boundary handling
- [x] **6.2.3**: Add date validation logic
- [x] **6.2.4**: Test date edge cases

#### **Acceptance Criteria:**
- All functions respect date range parameters
- Date boundaries properly handled
- No data leakage outside date range

---

## 📋 EPIC 7: Performance & Testing

### **TASK 7.1: Performance Optimization**
**Priority**: MEDIUM | **Effort**: 5 hours

#### **Subtasks:**
- [ ] **7.1.1**: Implement React.memo for expensive components
- [ ] **7.1.2**: Add useMemo for complex calculations
- [ ] **7.1.3**: Optimize re-renders with useCallback
- [ ] **7.1.4**: Add performance monitoring

#### **Acceptance Criteria:**
- Page load time < 2 seconds
- Navigation response time < 500ms
- No unnecessary re-renders

### **TASK 7.2: Error Handling & Validation**
**Priority**: HIGH | **Effort**: 4 hours

#### **Subtasks:**
- [x] **7.2.1**: Add comprehensive error boundaries
- [x] **7.2.2**: Implement user-friendly error messages  
- [x] **7.2.3**: Add data validation logic
- [x] **7.2.4**: Test error scenarios

#### **Acceptance Criteria:**
- Graceful error handling throughout app
- Users see helpful error messages
- App doesn't crash on invalid data


#### **Acceptance Criteria:**
- 80%+ code coverage
- All critical paths tested
- No regressions in existing functionality

---

## 📋 EPIC 8: UI/UX Polish & Integration

### **TASK 8.1: UI Polish & Styling**
**Priority**: MEDIUM | **Effort**: 4 hours

#### **Subtasks:**
- [x] **8.1.1**: Implement final styling with Tailwind CSS
- [x] **8.1.2**: Add loading animations and transitions
- [x] **8.1.3**: Ensure responsive design works on all devices
- [x] **8.1.4**: Add accessibility features (ARIA labels, keyboard nav)

#### **Acceptance Criteria:**
- Professional, polished appearance
- Smooth animations and transitions
- Fully responsive on mobile/tablet/desktop
- Meets accessibility standards

### **TASK 8.2: Navigation Integration**
**Priority**: LOW | **Effort**: 2 hours

#### **Subtasks:**
- [x] **8.2.1**: Add navigation link to main menu
- [x] **8.2.2**: Update breadcrumb navigation
- [x] **8.2.3**: Add page title and metadata
- [x] **8.2.4**: Test navigation flow

#### **Acceptance Criteria:**
- New page accessible from main navigation
- Proper page titles and metadata
- Navigation flow works seamlessly

---

## 🎯 Definition of Done

For each task to be considered complete, it must meet ALL of the following criteria:

### **Code Quality**
- [ ] Code follows existing project standards
- [ ] TypeScript compilation passes with no errors
- [ ] ESLint passes with no warnings
- [ ] All functions properly documented

### **Functionality**
- [ ] Feature works as specified in requirements
- [ ] All acceptance criteria met
- [ ] Edge cases handled appropriately
- [ ] Error handling implemented

### **Testing**
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Manual testing completed
- [ ] No regressions in existing features

### **Performance**
- [ ] No significant performance impact
- [ ] Caching working effectively
- [ ] Loading times within acceptable range
- [ ] Memory usage optimized

---

## 📊 Project Timeline & Milestones

### **Phase 1: Foundation (Days 1-3)**
- EPIC 1: Project Foundation & Setup
- EPIC 2: Left Panel Navigation

### **Phase 2: Data Layer (Days 4-6)**  
- EPIC 3: Right Panel Data Cards
- EPIC 4: Data Fetching & Caching

### **Phase 3: Integration (Days 7-8)**
- EPIC 5: Bottom Panel Detailed View
- EPIC 6: Date Filtering Integration

### **Phase 4: Polish (Days 9-10)**
- EPIC 7: Performance & Testing
- EPIC 8: UI/UX Polish & Integration

---

## ✅ Success Metrics

### **Technical Metrics**
- Page load time: < 2 seconds
- Navigation response: < 500ms
- Firebase read reduction: 40% via caching
- Code coverage: > 80%

### **User Experience Metrics**
- Task completion rate: > 95%
- User error rate: < 5%
- Navigation clarity: > 90% success rate
- Data accuracy: 100%

---

This PRD provides a comprehensive roadmap for implementing the WTM-SLP Hierarchical Dashboard with clear tasks, subtasks, acceptance criteria, and success metrics. Each epic and task can be assigned to developers and tracked independently while maintaining the overall project vision.

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
| T32 | Deep Search Enhancement in DataTable | — | DONE ✅ | 2025-07-25 | Added recursive extraction of nested values to enable name-based search | Verify search by person name |
| T33 | SLP Level Metrics Filtering Fix | — | DONE ✅ | 2025-07-25 | Fixed SLP selection to use proper handler_id filtering for scoped data | SLP metrics now show correct filtered data |
| T34 | Enhanced Video Detailed View | — | DONE ✅ | 2025-07-25 | Created VideosList component with watch video, view images, and proper video properties | Videos show all relevant data and actions |
| T35 | Enhanced Forms Detailed View | — | DONE ✅ | 2025-07-25 | Created FormsList component with completion rates, summary cards, and proper form properties | Forms show distribution/collection metrics |
| T36 | ClubsList Component & DetailedView Integration | — | DONE ✅ | 2025-07-25 | Added ClubsList component and integrated into DetailedView for Clubs & WA Groups | Review UI |
| T37 | Zone Name, Label Renames, Volunteers Detail Fix | — | IN-PROGRESS | 2025-07-25 | Implemented zone incharge name display, renamed SLP labels to Samvidhan Leader, fixed volunteers/slps detailed view routing | |
| … | … | … | … | … | … | … |

_Update status when tasks move through the workflow. Use `TODO`, `IN-PROGRESS`, `DONE ✅`, `BLOCKED`._

### 🔍 Review Notes
Document any reviews, decisions, or important context:

- _T1 Review_: —
- _T2 Review_: —
- _General_: —

> Check this section before beginning work to ensure all feedback is addressed.
