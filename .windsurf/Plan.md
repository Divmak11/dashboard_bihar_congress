# Codebase Refactoring Plan

## Overview
This plan outlines the comprehensive refactoring of the Bihar Congress Dashboard codebase to improve maintainability, readability, and organization. The primary goals are:

1. **File Size Limit**: Ensure no file exceeds 600 lines of code
2. **Proper Folder Structure**: Organize code by feature and responsibility
3. **Separation of Concerns**: Split large components and utilities into focused modules
4. **Improved Maintainability**: Make code easier to understand and modify

## Current Issues Analysis

### Large Files Requiring Refactoring:
- `components/DashboardHome.tsx` - **1,556 lines** (needs major refactoring)
- `app/utils/fetchHierarchicalData.ts` - **1,499 lines** (needs splitting)
- `app/utils/fetchFirebaseData.ts` - **1,480 lines** (needs splitting)
- `app/wtm-slp/page.tsx` - **717 lines** (needs refactoring)
- `components/hierarchical/ActivitiesList.tsx` - **386 lines** (acceptable but can be improved)

### Current Structure Problems:
1. **Monolithic Components**: DashboardHome.tsx contains multiple responsibilities
2. **Utility Overload**: Firebase utilities are too large and mixed
3. **Poor Separation**: Business logic mixed with UI components
4. **Inconsistent Organization**: No clear feature-based structure

## Proposed New Folder Structure

```
src/
├── app/                          # Next.js app directory (keep as is)
│   ├── auth/
│   ├── dashboard/
│   ├── wtm-slp/
│   ├── wtm-slp-new/
│   ├── map/
│   └── ...
├── components/                   # Reusable UI components
│   ├── ui/                      # Basic UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── Toast.tsx
│   │   └── ErrorBoundary.tsx
│   ├── forms/                   # Form-related components
│   │   ├── DateRangeFilter.tsx
│   │   ├── SearchDropdown.tsx
│   │   └── CoordinatorSelector.tsx
│   ├── layout/                  # Layout components
│   │   ├── Header.tsx
│   │   ├── Navigation.tsx
│   │   └── LogoutButton.tsx
│   └── charts/                  # Chart components
│       ├── SummaryCard.tsx
│       ├── ActivityCard.tsx
│       └── MetricsChart.tsx
├── features/                     # Feature-based organization
│   ├── dashboard/               # Dashboard feature
│   │   ├── components/
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── SummarySection.tsx
│   │   │   ├── CoordinatorSection.tsx
│   │   │   ├── ActivityTabs.tsx
│   │   │   └── VideoSection.tsx
│   │   ├── hooks/
│   │   │   ├── useDashboardData.ts
│   │   │   ├── useCoordinatorData.ts
│   │   │   └── useDateFiltering.ts
│   │   └── types/
│   │       └── dashboard.types.ts
│   ├── hierarchical/            # Hierarchical dashboard feature
│   │   ├── components/
│   │   │   ├── HierarchicalDashboard.tsx
│   │   │   ├── NavigationPanel.tsx
│   │   │   ├── MetricsPanel.tsx
│   │   │   ├── DetailedView.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── ActivitiesList.tsx
│   │   │   ├── VideosList.tsx
│   │   │   ├── FormsList.tsx
│   │   │   ├── MeetingsList.tsx
│   │   │   └── ClubsList.tsx
│   │   ├── hooks/
│   │   │   ├── useHierarchicalData.ts
│   │   │   ├── useNavigationState.ts
│   │   │   └── useMetrics.ts
│   │   └── types/
│   │       └── hierarchical.types.ts
│   ├── auth/                    # Authentication feature
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── SignupForm.tsx
│   │   │   └── AssemblySelector.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   └── types/
│   │       └── auth.types.ts
│   └── coordinators/            # Coordinator management feature
│       ├── components/
│       │   ├── CoordinatorCard.tsx
│       │   ├── CoordinatorList.tsx
│       │   ├── ActivitySummary.tsx
│       │   └── MemberModal.tsx
│       ├── hooks/
│       │   ├── useCoordinators.ts
│       │   └── useActivities.ts
│       └── types/
│           └── coordinator.types.ts
├── services/                     # External service integrations
│   ├── firebase/
│   │   ├── config.ts
│   │   ├── auth.service.ts
│   │   ├── firestore.service.ts
│   │   └── collections/
│   │       ├── slp.service.ts
│   │       ├── activities.service.ts
│   │       ├── meetings.service.ts
│   │       ├── members.service.ts
│   │       └── videos.service.ts
│   ├── sheets/
│   │   └── sheets.service.ts
│   └── api/
│       └── api.service.ts
├── lib/                         # Utility libraries
│   ├── utils/
│   │   ├── dateUtils.ts
│   │   ├── stringUtils.ts
│   │   ├── validationUtils.ts
│   │   └── formatUtils.ts
│   ├── constants/
│   │   ├── dateConstants.ts
│   │   ├── roleConstants.ts
│   │   └── uiConstants.ts
│   ├── helpers/
│   │   ├── meetingHelpers.ts
│   │   ├── dataTransformers.ts
│   │   └── errorHandlers.ts
│   └── hooks/
│       ├── useLocalStorage.ts
│       ├── useDebounce.ts
│       └── useAsync.ts
├── types/                       # Global type definitions
│   ├── index.ts
│   ├── api.types.ts
│   ├── common.types.ts
│   └── firebase.types.ts
└── styles/                      # Global styles
    ├── globals.css
    └── components.css
```

## Detailed Refactoring Tasks

### Phase 1: Infrastructure Setup
- [ ] **T1.1**: Create new folder structure
- [ ] **T1.2**: Set up path aliases in `tsconfig.json` and `next.config.ts`
- [ ] **T1.3**: Create barrel exports (`index.ts`) for each module
- [ ] **T1.4**: Update import paths throughout the codebase

### Phase 2: Utility Services Refactoring

#### T2.1: Split `fetchFirebaseData.ts` (1,480 lines → multiple files)
- [ ] **T2.1.1**: Create `services/firebase/collections/slp.service.ts`
  - Move SLP-related functions: `getSlpTrainingActivity`, `getSlpPanchayatWaActivity`, `getSlpMaiBahinYojnaActivity`, `getSlpLocalIssueVideoActivity`, `getSlpMemberActivity`
  - Target: ~300 lines
- [ ] **T2.1.2**: Create `services/firebase/collections/activities.service.ts`
  - Move activity functions: `getWtmSlpSummary`, `getCoordinatorDetails`, `getAssociatedSlps`
  - Target: ~250 lines
- [ ] **T2.1.3**: Create `services/firebase/collections/meetings.service.ts`
  - Move meeting-related functions
  - Target: ~200 lines
- [ ] **T2.1.4**: Create `services/firebase/collections/members.service.ts`
  - Move member-related functions
  - Target: ~150 lines
- [ ] **T2.1.5**: Create `services/firebase/collections/videos.service.ts`
  - Move video-related functions: `getAcLocalIssueVideoActivities`
  - Target: ~200 lines
- [ ] **T2.1.6**: Create `services/firebase/firestore.service.ts`
  - Common Firestore utilities and base functions
  - Target: ~150 lines

#### T2.2: Split `fetchHierarchicalData.ts` (1,499 lines → multiple files)
- [ ] **T2.2.1**: Create `services/firebase/collections/hierarchical-metrics.service.ts`
  - Move metrics functions: `fetchCumulativeMetrics`, `getHierarchicalMemberActivity`, `getHierarchicalMeetingActivity`
  - Target: ~400 lines
- [ ] **T2.2.2**: Create `services/firebase/collections/hierarchical-activities.service.ts`
  - Move activity functions: `getHierarchicalTrainingActivity`, `getHierarchicalPanchayatWaActivity`, `getHierarchicalMaiBahinYojnaActivity`
  - Target: ~400 lines
- [ ] **T2.2.3**: Create `services/firebase/collections/hierarchical-videos.service.ts`
  - Move video functions: `getHierarchicalLocalIssueVideoActivity`, `getHierarchicalAcVideos`
  - Target: ~300 lines
- [ ] **T2.2.4**: Create `features/hierarchical/hooks/useHierarchicalData.ts`
  - Move data fetching logic: `fetchDetailedData`, `fetchDetailedMeetings`, `fetchDetailedMembers`, `fetchDetailedVideos`
  - Target: ~400 lines

### Phase 3: Component Refactoring

#### T3.1: Refactor `DashboardHome.tsx` (1,556 lines → multiple components)
- [ ] **T3.1.1**: Create `features/dashboard/components/DashboardLayout.tsx`
  - Main layout structure and state management
  - Target: ~200 lines
- [ ] **T3.1.2**: Create `features/dashboard/components/SummarySection.tsx`
  - Summary cards and global metrics
  - Target: ~150 lines
- [ ] **T3.1.3**: Create `features/dashboard/components/CoordinatorSection.tsx`
  - Coordinator selection and search functionality
  - Target: ~200 lines
- [ ] **T3.1.4**: Create `features/dashboard/components/ActivityTabs.tsx`
  - SLP activity tabs (Training, Panchayat WA, etc.)
  - Target: ~250 lines
- [ ] **T3.1.5**: Create `features/dashboard/components/VideoSection.tsx`
  - AC video display and management
  - Target: ~200 lines
- [ ] **T3.1.6**: Create `components/forms/CoordinatorSelector.tsx`
  - Extract `CoordinatorSearchDropdown` component
  - Target: ~150 lines
- [ ] **T3.1.7**: Create `components/ui/Card.tsx`
  - Extract `SummaryCard` and `LeaderCard` components
  - Target: ~200 lines
- [ ] **T3.1.8**: Create `features/coordinators/components/CoordinatorCard.tsx`
  - Extract `LeaderCard` component with all its logic
  - Target: ~300 lines

#### T3.2: Refactor `app/wtm-slp/page.tsx` (717 lines → multiple files)
- [ ] **T3.2.1**: Create `features/dashboard/hooks/useDashboardData.ts`
  - Extract data fetching logic and state management
  - Target: ~300 lines
- [ ] **T3.2.2**: Create `features/dashboard/hooks/useDateFiltering.ts`
  - Extract date filtering logic
  - Target: ~100 lines
- [ ] **T3.2.3**: Create `features/dashboard/hooks/useCoordinatorData.ts`
  - Extract coordinator-specific data management
  - Target: ~200 lines
- [ ] **T3.2.4**: Simplify main page component
  - Keep only page-level logic and component composition
  - Target: ~150 lines

### Phase 4: Feature-Specific Refactoring

#### T4.1: Hierarchical Dashboard Feature
- [ ] **T4.1.1**: Create `features/hierarchical/components/HierarchicalDashboard.tsx`
  - Main hierarchical dashboard component
  - Target: ~200 lines
- [ ] **T4.1.2**: Create `features/hierarchical/hooks/useNavigationState.ts`
  - Navigation state management
  - Target: ~150 lines
- [ ] **T4.1.3**: Create `features/hierarchical/hooks/useMetrics.ts`
  - Metrics data management
  - Target: ~200 lines
- [ ] **T4.1.4**: Refactor existing hierarchical components to fit new structure
  - Update imports and dependencies
  - Ensure components stay under 400 lines

#### T4.2: Authentication Feature
- [ ] **T4.2.1**: Create `features/auth/components/LoginForm.tsx`
  - Extract login functionality from auth page
  - Target: ~150 lines
- [ ] **T4.2.2**: Create `features/auth/components/SignupForm.tsx`
  - Extract signup functionality from auth page
  - Target: ~150 lines
- [ ] **T4.2.3**: Create `features/auth/components/AssemblySelector.tsx`
  - Extract assembly selection with search
  - Target: ~100 lines

### Phase 5: Utility and Helper Refactoring

#### T5.1: Create Utility Libraries
- [ ] **T5.1.1**: Create `lib/utils/dateUtils.ts`
  - Date parsing, formatting, and range calculations
  - Target: ~100 lines
- [ ] **T5.1.2**: Create `lib/utils/stringUtils.ts`
  - String normalization, validation, and formatting
  - Target: ~80 lines
- [ ] **T5.1.3**: Create `lib/utils/validationUtils.ts`
  - Form validation and data validation utilities
  - Target: ~120 lines
- [ ] **T5.1.4**: Create `lib/helpers/dataTransformers.ts`
  - Data transformation and mapping utilities
  - Target: ~150 lines
- [ ] **T5.1.5**: Create `lib/helpers/errorHandlers.ts`
  - Error handling and logging utilities
  - Target: ~100 lines

#### T5.2: Create Custom Hooks
- [ ] **T5.2.1**: Create `lib/hooks/useLocalStorage.ts`
  - Local storage management hook
  - Target: ~50 lines
- [ ] **T5.2.2**: Create `lib/hooks/useDebounce.ts`
  - Debouncing hook for search and filters
  - Target: ~30 lines
- [ ] **T5.2.3**: Create `lib/hooks/useAsync.ts`
  - Async operation management hook
  - Target: ~80 lines

### Phase 6: Type System Refactoring

#### T6.1: Organize Type Definitions
- [ ] **T6.1.1**: Create `types/common.types.ts`
  - Common interfaces and types used across features
  - Target: ~100 lines
- [ ] **T6.1.2**: Create `types/api.types.ts`
  - API request/response types
  - Target: ~80 lines
- [ ] **T6.1.3**: Create `types/firebase.types.ts`
  - Firebase-specific types and interfaces
  - Target: ~120 lines
- [ ] **T6.1.4**: Create feature-specific type files
  - Move types closer to their usage
  - Each file target: ~50-100 lines

### Phase 7: Configuration and Setup

#### T7.1: Update Configuration Files
- [ ] **T7.1.1**: Update `tsconfig.json`
  - Add path aliases for new folder structure
  - Configure module resolution
- [ ] **T7.1.2**: Update `next.config.ts`
  - Add webpack aliases if needed
  - Configure build optimizations
- [ ] **T7.1.3**: Create barrel exports
  - Add `index.ts` files for clean imports
  - Export public APIs from each module

#### T7.2: Update Import Statements
- [ ] **T7.2.1**: Update all import statements to use new paths
- [ ] **T7.2.2**: Remove unused imports and dependencies
- [ ] **T7.2.3**: Ensure consistent import ordering

## Implementation Strategy

### Phase Execution Order:
1. **Phase 1**: Infrastructure (1-2 days)
2. **Phase 2**: Utility Services (3-4 days)
3. **Phase 3**: Component Refactoring (4-5 days)
4. **Phase 4**: Feature-Specific (2-3 days)
5. **Phase 5**: Utilities and Helpers (2-3 days)
6. **Phase 6**: Type System (1-2 days)
7. **Phase 7**: Configuration (1 day)

### Key Principles:
1. **Incremental Changes**: Make changes in small, testable increments
2. **Backward Compatibility**: Ensure existing functionality continues to work
3. **Testing**: Test each refactored component thoroughly
4. **Documentation**: Update documentation as changes are made
5. **Code Review**: Review each phase before moving to the next

### Success Criteria:
- [ ] No file exceeds 600 lines of code
- [ ] Clear separation of concerns
- [ ] Improved code readability and maintainability
- [ ] Consistent folder structure and naming conventions
- [ ] All existing functionality preserved
- [ ] Build passes without errors
- [ ] All tests pass (if any exist)

## Risk Mitigation:
1. **Backup**: Create git branches for each phase
2. **Testing**: Thoroughly test each refactored component
3. **Rollback Plan**: Keep ability to revert changes if issues arise
4. **Incremental Deployment**: Deploy changes in phases, not all at once

## Post-Refactoring Benefits:
1. **Maintainability**: Easier to find and modify specific functionality
2. **Scalability**: New features can be added more easily
3. **Team Collaboration**: Multiple developers can work on different features simultaneously
4. **Code Reusability**: Components and utilities can be reused across features
5. **Testing**: Smaller, focused components are easier to test
6. **Performance**: Better tree-shaking and code splitting opportunities