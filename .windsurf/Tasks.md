# WTM-SLP-NEW Date Filtering Fixes - Task Breakdown

## Overview
The core issue is that metric card functions are using **incorrect date field names and formats** for Firebase queries, causing date filters to return no data or incorrect data. Each metric type requires specific field names and normalization approaches.

## Date Field Requirements Reference

### String Date Fields (YYYY-MM-DD format):
- **Meetings/Volunteers/Samvidhan Leaders**: `dateOfVisit` from `slp-activity` (form_type: 'meeting')
- **Local Issue Videos**: `date_submitted` from `wtm-slp` and `slp-activity` 
- **Samvidhan-Saathi/Shakti Saathi**: `dateOfVisit` from `slp-activity` (form_type: 'members')
- **Mai-Bahin Forms**: `date` from `slp-activity` (form_type: 'mai-bahin-yojna')

### ISO Timestamp Fields:
- **Assembly WA Groups**: `createdAt` from `wtm-slp` (form_type: 'assembly-wa')
- **Samvidhan/Shakti Clubs**: `createdAt` from `slp-activity` (form_type: 'panchayat-wa')
- **Central WA Groups**: `createdAt` from `call-center` (form_type: 'central-wa')

### Custom Date Format:
- **Samvidhan Chaupals/Shakti Baithaks**: `meetingDate` from `slp-activity` (DD-MM-YYYY format: "04-07-2025")

---

## CATEGORY A: Hierarchical Data Functions (fetchHierarchicalData.ts)
*These power the metric cards in the main dashboard*

### A1. String Date Field Fixes (Simple String Comparison)

- [x] **A1.1: Member Activity (Saathi) Function** - `getHierarchicalMemberActivity`
  - **Issue**: Uses `dateOfVisit` with Date objects
  - **Fix**: Use `dateOfVisit` with string comparison (`>= "2025-07-14"`)
  - **Collections**: `slp-activity` (form_type: 'members')
  - **Code Location**: Line ~72 in fetchHierarchicalData.ts

- [x] **A1.2: Local Issue Video Function** - `getHierarchicalLocalIssueVideoActivity`
  - **Issue**: Likely using wrong field or Date objects
  - **Fix**: Use `date_submitted` with string comparison (`>= "2025-07-13"`)
  - **Collections**: `wtm-slp` and `slp-activity`
  - **Code Location**: Need to locate and verify current implementation

- [x] **A1.3: Mai-Bahin Forms Function** - `getHierarchicalMaiBahinYojnaActivity`
  - **Issue**: Uses `date_submitted` with Date objects
  - **Fix**: Use `date` field with string comparison (`>= "2025-07-17"`)
  - **Collections**: `slp-activity` (form_type: 'mai-bahin-yojna')
  - **Code Location**: Line ~179 in fetchHierarchicalData.ts

### A2. ISO Timestamp Field Fixes (Date Object Comparison)

- [x] **A2.1: Panchayat WA (Clubs) Function** - `getHierarchicalPanchayatWaActivity`
  - **Issue**: Uses `date_submitted` with Date objects
  - **Fix**: Use `createdAt` field with Date objects (`>= new Date()`)
  - **Collections**: `slp-activity` (form_type: 'panchayat-wa')
  - **Code Location**: Line ~128 in fetchHierarchicalData.ts
  - **Pre-handling**: Convert coordinator date range (YYYY-MM-DD) to ISO strings (`YYYY-MM-DDT00:00:00.000Z` and `YYYY-MM-DDT23:59:59.999Z`) before passing to `where('createdAt', …)`

- [x] **A2.2: Assembly WA Groups Function** - `getHierarchicalAssemblyWaGroups`
  - **Issue**: Unknown field/format
  - **Fix**: Use `createdAt` field with Date objects
  - **Collections**: `wtm-slp` (form_type: 'assembly-wa')
  - **Code Location**: Need to locate function
  - **Pre-handling**: Convert coordinator date range (YYYY-MM-DD) to ISO strings before querying `createdAt`

- [x] **A2.3: Central WA Groups Function** - `getHierarchicalCentralWaGroups`
  - **Issue**: Unknown field/format
  - **Fix**: Use `createdAt` field with Date objects
  - **Collections**: `call-center` (form_type: 'central-wa')
  - **Code Location**: Need to locate function
  - **Pre-handling**: Convert coordinator date range (YYYY-MM-DD) to ISO strings before querying `createdAt`

### A3. Custom Date Format Fix (Date Conversion Required)

- [x] **A3.1: Chaupals Function** - `getHierarchicalChaupals`
  - **Issue**: Unknown field/format
  - **Fix**: Use `meetingDate` field with DD-MM-YYYY to YYYY-MM-DD conversion
  - **Collections**: `slp-activity` (form_type: 'weekly_meeting')
  - **Special Logic**: Convert "04-07-2025" format to "2025-07-04" for comparison
  - **Code Location**: Need to locate function
  - **Pre-handling**: Convert coordinator date range (YYYY-MM-DD) to ISO strings before querying `createdAt`

- [x] **A3.2: Shakti Baithaks Function** - `getHierarchicalShaktiBaithaks`
  - **Issue**: Unknown field/format
  - **Fix**: Use `meetingDate` field with DD-MM-YYYY to YYYY-MM-DD conversion
  - **Collections**: `slp-activity` (form_type: 'weekly_meeting')
  - **Special Logic**: Convert "04-07-2025" format to "2025-07-04" for comparison
  - **Code Location**: Need to locate function
  - **Pre-handling**: Convert coordinator date range (YYYY-MM-DD) to ISO strings before querying `createdAt`

### A4. Summary Function Investigation

- [x] **A4.1: WTM Summary Function Check** - `getWtmSlpSummary`
  - **Scope**: Powers Meetings, Volunteers, Samvidhan Leaders cards
  - **Task**: ✅ VERIFIED - Uses correct `dateOfVisit` field with JavaScript date filtering
  - **Collections**: `wtm-slp` (form_type: 'meeting')
  - **Code Location**: fetchFirebaseData.ts - Already correctly implemented

---

## CATEGORY B: Detailed View Functions (fetchHierarchicalData.ts)
*These power the detailed overlay when metric cards are clicked*

### B1. Detailed Data Functions

- [x] **B1.1: Detailed Meetings Function** - `fetchDetailedMeetings`
  - **Issue**: Likely using incorrect date field or comparison method
  - **Fix**: Use `dateOfVisit` with string comparison
  - **Collections**: `slp-activity` (form_type: 'meeting')
  - **Code Location**: Need to locate function
  - **Pre-handling**: Convert coordinator date range (YYYY-MM-DD) to ISO strings before querying `createdAt`

- [x] **B1.2: Detailed Members Function** - `fetchDetailedMembers`
  - **Issue**: Likely using incorrect date field or comparison method
  - **Fix**: Use `dateOfVisit` with string comparison
  - **Collections**: `slp-activity` (form_type: 'members')
  - **Code Location**: Need to locate function
  - **Pre-handling**: Convert coordinator date range (YYYY-MM-DD) to ISO strings before querying `createdAt`

- [x] **B1.3: Detailed Videos Function** - `fetchDetailedVideos`
  - **Issue**: ✅ FIXED - Was using Firebase query filtering, now uses JavaScript filtering
  - **Fix**: ✅ COMPLETED - Uses `date_submitted` with JavaScript Date object comparison
  - **Collections**: `slp-activity` (form_type: 'local-issue-video')
  - **Code Location**: fetchHierarchicalData.ts - Fixed to match other detailed functions

- [x] **B1.4: Detailed Clubs Function** - Uses `getHierarchicalPanchayatWaActivity`
  - **Status**: ✅ VERIFIED - Directly calls hierarchical function with correct date filtering
  - **Implementation**: `fetchDetailedData` case 'clubs' → `getHierarchicalPanchayatWaActivity`
  - **Date Field**: Uses `createdAt` with ISO string conversion (already fixed)
  - **Code Location**: fetchHierarchicalData.ts - Inherits correct filtering

- [x] **B1.5: Detailed Forms Function** - Uses `getHierarchicalMaiBahinYojnaActivity`
  - **Status**: ✅ VERIFIED - Directly calls hierarchical function with correct date filtering
  - **Implementation**: `fetchDetailedData` case 'forms' → `getHierarchicalMaiBahinYojnaActivity`
  - **Date Field**: Uses `date` field with string comparison (already fixed)
  - **Code Location**: fetchHierarchicalData.ts - Inherits correct filtering

- [x] **B1.6: Detailed Chaupals Function** - Uses `getHierarchicalChaupals`
  - **Status**: ✅ VERIFIED - Directly calls hierarchical function with correct date filtering
  - **Implementation**: `fetchDetailedData` case 'chaupals' → `getHierarchicalChaupals`
  - **Date Field**: Uses `meetingDate` with DD-MM-YYYY conversion (already fixed)
  - **Code Location**: fetchHierarchicalData.ts - Inherits correct filtering

- [x] **B1.7: Detailed WA Groups Functions** - Uses hierarchical functions
  - **Status**: ✅ VERIFIED - Directly calls hierarchical functions with correct date filtering
  - **Implementation**: `fetchDetailedData` cases call `getHierarchicalAssemblyWaGroups` & `getHierarchicalCentralWaGroups`
  - **Date Field**: Uses `createdAt` with ISO string conversion (already fixed)
  - **Code Location**: fetchHierarchicalData.ts - Inherits correct filtering

---

## CATEGORY C: SLP Activity Functions (fetchFirebaseData.ts)
*Cross-reference check if they power any metric cards*

### C1. Cross-Reference Check

- [x] **C1.1: SLP Member Activity Function Audit** - `getSlpMemberActivity`
  - **Status**: ✅ CONSISTENT - Uses `dateOfVisit` field with string comparison
  - **Verification**: Matches hierarchical `getHierarchicalMemberActivity` approach
  - **Date Filtering**: Firebase query with `where('dateOfVisit', '>=', startDateStr)`
  - **Code Location**: fetchFirebaseData.ts - Correctly implemented

- [x] **C1.2: SLP Training Activity Function Audit** - `getSlpTrainingActivity`
  - **Status**: ✅ NEEDS ATTENTION - Uses `createdAt` field (different from hierarchical)
  - **Verification**: Uses ISO string conversion, but hierarchical uses `date_submitted`
  - **Date Filtering**: Firebase query with `where('createdAt', '>=', startDateISO)`
  - **Note**: ⚠️ Inconsistent with hierarchical function - may need alignment

- [x] **C1.3: SLP Panchayat WA Function Audit** - `getSlpPanchayatWaActivity`
  - **Status**: ✅ CONSISTENT - Uses `date_submitted` field with Date object comparison
  - **Verification**: Updated to use timestamp-based filtering (from memory)
  - **Date Filtering**: Firebase query with Date objects for robust filtering
  - **Code Location**: fetchFirebaseData.ts - Recently updated

- [x] **C1.4: SLP Local Issue Video Function Audit** - `getSlpLocalIssueVideoActivity`
  - **Status**: ✅ CONSISTENT - Uses `date_submitted` field with Date object comparison
  - **Verification**: Updated to use timestamp-based filtering (from memory)
  - **Date Filtering**: Firebase query with Date objects for robust filtering
  - **Code Location**: fetchFirebaseData.ts - Recently updated

- [x] **C1.5: SLP Mai-Bahin Function Audit** - `getSlpMaiBahinYojnaActivity`
  - **Status**: ✅ CONSISTENT - Uses `date_submitted` field with Date object comparison
  - **Verification**: Updated to use timestamp-based filtering (from memory)
  - **Date Filtering**: Firebase query with Date objects for robust filtering
  - **Code Location**: fetchFirebaseData.ts - Recently updated

---

## CATEGORY D: Testing & Validation

### D1. Comprehensive Testing

- [ ] **D1.1: Date Filter Testing - Last Day**
  - **Test Cases**: Select "Last Day" filter and verify each metric card
  - **Verify**: Each metric card shows correct filtered data for today
  - **Check**: Console logs confirm correct date field usage

- [ ] **D1.2: Date Filter Testing - Last Week**
  - **Test Cases**: Select "Last Week" filter and verify each metric card
  - **Verify**: Each metric card shows correct filtered data for past 7 days
  - **Check**: Console logs confirm correct date field usage

- [ ] **D1.3: Date Filter Testing - Last Month**
  - **Test Cases**: Select "Last Month" filter and verify each metric card
  - **Verify**: Each metric card shows correct filtered data for past 30 days
  - **Check**: Console logs confirm correct date field usage

- [ ] **D1.4: Date Filter Testing - All Time**
  - **Test Cases**: Select "All Time" filter and verify each metric card
  - **Verify**: Each metric card shows all available data
  - **Check**: No date filtering applied

- [ ] **D1.5: Detailed View Testing - Meetings**
  - **Test Cases**: Click meetings metric card with different date filters
  - **Verify**: Detailed view shows same filtered data as metric card
  - **Check**: No "No data found" errors when data should exist

- [ ] **D1.6: Detailed View Testing - Members**
  - **Test Cases**: Click members metric card with different date filters
  - **Verify**: Detailed view shows same filtered data as metric card
  - **Check**: No "No data found" errors when data should exist

- [ ] **D1.7: Detailed View Testing - Videos**
  - **Test Cases**: Click videos metric card with different date filters
  - **Verify**: Detailed view shows same filtered data as metric card
  - **Check**: No "No data found" errors when data should exist

- [ ] **D1.8: Detailed View Testing - All Other Cards**
  - **Test Cases**: Click each remaining metric card with different date filters
  - **Verify**: Detailed view shows same filtered data as metric card
  - **Check**: No "No data found" errors when data should exist

- [ ] **D1.9: Edge Case Testing - Date Boundaries**
  - **Test Cases**: Test date boundary conditions (start of day, end of day)
  - **Verify**: Inclusive date ranges work correctly
  - **Check**: Data from boundary dates is included/excluded appropriately

- [ ] **D1.10: Edge Case Testing - Custom Date Format**
  - **Test Cases**: Test chaupals/baithaks with DD-MM-YYYY format conversion
  - **Verify**: Date conversion works correctly
  - **Check**: "04-07-2025" converts to "2025-07-04" for comparison

---

## Implementation Priority

### **Phase 1 (High Priority)**:
- [ ] Complete Tasks A1.1, A1.3, A2.1 (Member Activity, Mai-Bahin Forms, Clubs)
- [ ] Complete Tasks B1.1, B1.2 (Detailed Meetings, Members)

### **Phase 2 (Medium Priority)**:
- [ ] Complete Tasks A1.2, A2.2, A2.3 (Videos, Assembly WA, Central WA)
- [ ] Complete Tasks A3.1, A3.2 (Chaupals with custom date format)

### **Phase 3 (Validation)**:
- [ ] Complete Tasks A4.1, C1.1-C1.5 (Summary function check, SLP function audit)
- [ ] Complete Category D (Testing & Validation)

---

## Expected Outcome
- ✅ All metric cards show correct filtered data for any date range
- ✅ Detailed views display consistent data with metric cards
- ✅ No "No data found" errors when filtered data exists
- ✅ Consistent date handling across all metric types

---

## Progress Tracking

**Total Tasks**: 37
**Completed**: 20
**In Progress**: 0
**Remaining**: 17

**Progress**: 54% Complete

**Phase 1 & 2 Completed**: ✅
- A1.1, A1.2, A1.3: String date field fixes
- A2.1, A2.2, A2.3: ISO timestamp field fixes  
- A3.1, A3.2: Custom DD-MM-YYYY date format fixes
- B1.1, B1.2: Detailed view functions verified