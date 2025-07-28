# Bihar Congress Dashboard - Codebase Refactoring PRD

## Project Overview

### Objective
Refactor the Bihar Congress Dashboard codebase to improve maintainability, readability, and organization by ensuring no file exceeds 600 lines and implementing proper folder structure with feature-based organization.

### Success Metrics
- ✅ No file exceeds 600 lines of code
- ✅ Clear separation of concerns across all modules
- ✅ Improved code readability and maintainability
- ✅ Consistent folder structure and naming conventions
- ✅ All existing functionality preserved
- ✅ Build passes without errors
- ✅ Performance improvements through better code organization

### Timeline
Estimated Duration: **15-18 days** across 7 phases

### Current Issues Analysis

#### Large Files Requiring Refactoring:
- `components/DashboardHome.tsx` - **1,556 lines** (needs major refactoring)
- `app/utils/fetchHierarchicalData.ts` - **1,499 lines** (needs splitting)
- `app/utils/fetchFirebaseData.ts` - **1,480 lines** (needs splitting)
- `app/wtm-slp/page.tsx` - **717 lines** (needs refactoring)
- `components/hierarchical/ActivitiesList.tsx` - **386 lines** (acceptable but can be improved)

#### Current Structure Problems:
1. **Monolithic Components**: DashboardHome.tsx contains multiple responsibilities
2. **Utility Overload**: Firebase utilities are too large and mixed
3. **Poor Separation**: Business logic mixed with UI components
4. **Inconsistent Organization**: No clear feature-based structure

---

## Phase 1: Infrastructure Setup (Days 1-2)

### T1.1: Create New Folder Structure
**Priority**: High | **Effort**: 4 hours | **Dependencies**: None

#### Micro-tasks:

**T1.1.1: Create Core Directory Structure**
- **Location**: Project root
- **Files to Create**:
  ```
  src/
  ├── components/ui/
  ├── components/forms/
  ├── components/layout/
  ├── components/charts/
  ├── features/dashboard/
  ├── features/hierarchical/
  ├── features/auth/
  ├── features/coordinators/
  ├── services/firebase/
  ├── lib/utils/
  ├── lib/constants/
  ├── lib/helpers/
  ├── lib/hooks/
  └── types/
  ```
- **Implementation Steps**:
  1. Create `src/` directory in project root
  2. Create all subdirectories as per structure
  3. Add `.gitkeep` files to maintain empty directories
  4. Verify directory structure matches plan

**T1.1.2: Create Feature-Specific Subdirectories**
- **Location**: `src/features/`
- **Files to Create**:
  ```
  features/
  ├── dashboard/components/
  ├── dashboard/hooks/
  ├── dashboard/types/
  ├── hierarchical/components/
  ├── hierarchical/hooks/
  ├── hierarchical/types/
  ├── auth/components/
  ├── auth/hooks/
  ├── auth/types/
  ├── coordinators/components/
  ├── coordinators/hooks/
  └── coordinators/types/
  ```
- **Implementation Steps**:
  1. Create component directories for each feature
  2. Create hooks directories for custom hooks
  3. Create types directories for feature-specific types
  4. Add `.gitkeep` files to maintain structure

**T1.1.3: Create Service Layer Structure**
- **Location**: `src/services/`
- **Files to Create**:
  ```
  services/
  ├── firebase/config.ts
  ├── firebase/auth.service.ts
  ├── firebase/firestore.service.ts
  ├── firebase/collections/
  ├── sheets/sheets.service.ts
  └── api/api.service.ts
  ```
- **Implementation Steps**:
  1. Create Firebase service structure
  2. Create collections subdirectory
  3. Create placeholder service files
  4. Set up basic service interfaces

### T1.2: Set Up Path Aliases
**Priority**: High | **Effort**: 2 hours | **Dependencies**: T1.1

#### Micro-tasks:

**T1.2.1: Update TypeScript Configuration**
- **Location**: `tsconfig.json`
- **Implementation Steps**:
  1. Add path mapping for new structure:
     ```json
     {
       "compilerOptions": {
         "baseUrl": ".",
         "paths": {
           "@/components/*": ["src/components/*"],
           "@/features/*": ["src/features/*"],
           "@/services/*": ["src/services/*"],
           "@/lib/*": ["src/lib/*"],
           "@/types/*": ["src/types/*"],
           "@/app/*": ["app/*"]
         }
       }
     }
     ```
  2. Test path resolution
  3. Verify build compatibility

**T1.2.2: Update Next.js Configuration**
- **Location**: `next.config.ts`
- **Implementation Steps**:
  1. Add webpack alias configuration if needed
  2. Configure module resolution for new paths
  3. Test development server with new paths
  4. Verify production build works

### T1.3: Create Barrel Exports
**Priority**: Medium | **Effort**: 3 hours | **Dependencies**: T1.1

#### Micro-tasks:

**T1.3.1: Create Component Barrel Exports**
- **Locations**: 
  - `src/components/ui/index.ts`
  - `src/components/forms/index.ts`
  - `src/components/layout/index.ts`
  - `src/components/charts/index.ts`
- **Implementation Steps**:
  1. Create index.ts in each component directory
  2. Export all components from respective directories
  3. Follow consistent naming conventions
  4. Test imports work correctly

**T1.3.2: Create Feature Barrel Exports**
- **Locations**:
  - `src/features/dashboard/index.ts`
  - `src/features/hierarchical/index.ts`
  - `src/features/auth/index.ts`
  - `src/features/coordinators/index.ts`
- **Implementation Steps**:
  1. Create main index.ts for each feature
  2. Export components, hooks, and types
  3. Create sub-barrel exports for components/hooks/types
  4. Verify clean import paths

**T1.3.3: Create Service Barrel Exports**
- **Locations**:
  - `src/services/index.ts`
  - `src/services/firebase/index.ts`
  - `src/lib/index.ts`
- **Implementation Steps**:
  1. Create service layer exports
  2. Group related services together
  3. Export utility functions and constants
  4. Test service imports

### T1.4: Update Import Paths
**Priority**: Low | **Effort**: 2 hours | **Dependencies**: T1.2, T1.3

#### Micro-tasks:

**T1.4.1: Prepare Import Migration Script**
- **Location**: `scripts/migrate-imports.js`
- **Implementation Steps**:
  1. Create script to find and replace import paths
  2. Map old paths to new alias paths
  3. Test script on sample files
  4. Create backup before running

**T1.4.2: Update Critical Import Paths**
- **Locations**: All TypeScript/TSX files
- **Implementation Steps**:
  1. Start with most critical files first
  2. Update imports to use new alias paths
  3. Test each file after updating imports
  4. Verify no broken imports remain

---

## Phase 1 Completion Checklist
- [ ] **T1.1.1**: Core directory structure created
- [ ] **T1.1.2**: Feature-specific subdirectories created
- [ ] **T1.1.3**: Service layer structure created
- [ ] **T1.2.1**: TypeScript configuration updated
- [ ] **T1.2.2**: Next.js configuration updated
- [ ] **T1.3.1**: Component barrel exports created
- [ ] **T1.3.2**: Feature barrel exports created
- [ ] **T1.3.3**: Service barrel exports created
- [ ] **T1.4.1**: Import migration script prepared
- [ ] **T1.4.2**: Critical import paths updated
- [ ] **Build Test**: Project builds successfully with new structure
- [ ] **Dev Test**: Development server runs without errors

---

*This is Part 1 of the PRD. Continue to Phase 2 for Utility Services Refactoring.*

## Phase 2: Utility Services Refactoring (Days 3-6)

### T2.1: Split fetchFirebaseData.ts (1,480 lines → multiple files)
**Priority**: Critical | **Effort**: 16 hours | **Dependencies**: T1.1-T1.3

#### T2.1.1: Create SLP Service
**Priority**: High | **Effort**: 4 hours

**Micro-tasks:**

**T2.1.1.1: Extract SLP Activity Functions**
- **Source**: `app/utils/fetchFirebaseData.ts` (lines 1377-1421, 938-982, 1073-1114, 1204-1245, 691-818)
- **Target**: `src/services/firebase/collections/slp.service.ts`
- **Functions to Move**:
  - `getSlpTrainingActivity` (lines 1377-1421)
  - `getSlpPanchayatWaActivity` (lines 938-982)
  - `getSlpMaiBahinYojnaActivity` (lines 1204-1245)
  - `getSlpLocalIssueVideoActivity` (lines 1073-1114)
  - `getSlpMemberActivity` (lines 691-818)
- **Implementation Steps**:
  1. Create new service file with proper imports:
     ```typescript
     import { collection, query, where, getDocs } from 'firebase/firestore';
     import { db } from '../config';
     import { SlpTrainingActivity, PanchayatWaActivity } from '@/types';
     ```
  2. Copy function implementations with exact logic
  3. Add proper TypeScript interfaces for parameters and returns
  4. Add comprehensive error handling and logging
  5. Create unit tests for each function
  6. Update imports in consuming files (`app/wtm-slp/page.tsx`, `components/DashboardHome.tsx`)

**T2.1.1.2: Create SLP Types and Interfaces**
- **Target**: `src/services/firebase/collections/slp.types.ts`
- **Implementation Steps**:
  1. Extract SLP-related types from `models/types.ts`:
     ```typescript
     export interface SlpServiceParams {
       slp: { uid: string; role: string; handler_id?: string };
       dateRange?: { startDate: string; endDate: string };
     }
     ```
  2. Create service-specific interfaces for each function
  3. Add parameter validation types
  4. Export types for use in other modules

**T2.1.1.3: Add SLP Service Tests**
- **Target**: `src/services/firebase/collections/__tests__/slp.service.test.ts`
- **Implementation Steps**:
  1. Create test file structure with Jest/testing-library
  2. Mock Firebase dependencies using `@firebase/rules-unit-testing`
  3. Test each SLP function with sample data
  4. Test error scenarios (network failures, invalid data)
  5. Verify data transformation and filtering logic

#### T2.1.2: Create Activities Service
**Priority**: High | **Effort**: 3 hours

**Micro-tasks:**

**T2.1.2.1: Extract Activity Functions**
- **Source**: `app/utils/fetchFirebaseData.ts`
- **Target**: `src/services/firebase/collections/activities.service.ts`
- **Functions to Move**:
  - `getWtmSlpSummary` (summary data aggregation)
  - `getCoordinatorDetails` (coordinator information)
  - `getAssociatedSlps` (ASLP data fetching)
- **Implementation Steps**:
  1. Create activities service file with proper structure
  2. Move activity-related functions with their dependencies
  3. Add proper error handling for each function
  4. Create activity-specific types and interfaces
  5. Add comprehensive logging for debugging
  6. Update function documentation with JSDoc comments

**T2.1.2.2: Create Activity Types**
- **Target**: `src/services/firebase/collections/activities.types.ts`
- **Implementation Steps**:
  1. Define activity interfaces:
     ```typescript
     export interface WtmSlpSummary {
       totalMeetings: number;
       totalMembers: number;
       totalVideos: number;
     }
     ```
  2. Create summary data types
  3. Add coordinator detail types
  4. Export for external use

#### T2.1.3: Create Meetings Service
**Priority**: Medium | **Effort**: 3 hours

**Micro-tasks:**

**T2.1.3.1: Extract Meeting Functions**
- **Source**: `app/utils/fetchFirebaseData.ts`
- **Target**: `src/services/firebase/collections/meetings.service.ts`
- **Functions to Move**: Meeting-related functions (identify from current codebase)
- **Implementation Steps**:
  1. Identify all meeting-related functions in the source file
  2. Create meetings service file with proper imports
  3. Move and refactor functions to use consistent patterns
  4. Add meeting-specific error handling
  5. Create meeting types and interfaces
  6. Add data validation for meeting records

#### T2.1.4: Create Members Service
**Priority**: Medium | **Effort**: 2 hours

**Micro-tasks:**

**T2.1.4.1: Extract Member Functions**
- **Source**: `app/utils/fetchFirebaseData.ts`
- **Target**: `src/services/firebase/collections/members.service.ts`
- **Implementation Steps**:
  1. Extract member-related functions from source
  2. Create member service structure with proper typing
  3. Add member data validation and sanitization
  4. Create member-specific types and interfaces
  5. Add comprehensive service documentation
  6. Test member data operations

#### T2.1.5: Create Videos Service
**Priority**: Medium | **Effort**: 3 hours

**Micro-tasks:**

**T2.1.5.1: Extract Video Functions**
- **Source**: `app/utils/fetchFirebaseData.ts`
- **Target**: `src/services/firebase/collections/videos.service.ts`
- **Functions to Move**:
  - `getAcLocalIssueVideoActivities` (AC video fetching)
- **Implementation Steps**:
  1. Create videos service file with video-specific imports
  2. Move video-related functions with their logic intact
  3. Add video data validation and processing
  4. Create video types and interfaces:
     ```typescript
     export interface LocalIssueVideoActivity {
       id: string;
       description: string;
       videoUrl: string;
       dateSubmitted: string;
       assembly: string;
     }
     ```
  5. Add error handling for video operations
  6. Test video data fetching and processing

#### T2.1.6: Create Base Firestore Service
**Priority**: High | **Effort**: 1 hour

**Micro-tasks:**

**T2.1.6.1: Create Common Firestore Utilities**
- **Target**: `src/services/firebase/firestore.service.ts`
- **Implementation Steps**:
  1. Create base Firestore connection and configuration
  2. Add common query utilities:
     ```typescript
     export const createQuery = (collectionName: string, filters: QueryFilter[]) => {
       // Common query building logic
     };
     ```
  3. Create error handling utilities for consistent error management
  4. Add logging utilities for debugging and monitoring
  5. Export common interfaces and types
  6. Create connection pooling and optimization utilities

### T2.2: Split fetchHierarchicalData.ts (1,499 lines → multiple files)
**Priority**: Critical | **Effort**: 16 hours | **Dependencies**: T2.1

#### T2.2.1: Create Hierarchical Metrics Service
**Priority**: High | **Effort**: 5 hours

**Micro-tasks:**

**T2.2.1.1: Extract Metrics Functions**
- **Source**: `app/utils/fetchHierarchicalData.ts`
- **Target**: `src/services/firebase/collections/hierarchical-metrics.service.ts`
- **Functions to Move**:
  - `fetchCumulativeMetrics` (main metrics aggregation)
  - `getHierarchicalMemberActivity` (member metrics)
  - `getHierarchicalMeetingActivity` (meeting metrics)
- **Implementation Steps**:
  1. Create hierarchical metrics service with proper structure
  2. Move metrics calculation functions with their complex logic
  3. Add metrics validation and data integrity checks
  4. Create hierarchical metrics types:
     ```typescript
     export interface CumulativeMetrics {
       meetings: number;
       members: number;
       videos: number;
       training: number;
       panchayatWa: number;
     }
     ```
  5. Add comprehensive error handling for metrics calculations
  6. Add performance optimizations for large data sets

**T2.2.1.2: Create Metrics Types**
- **Target**: `src/features/hierarchical/types/metrics.types.ts`
- **Implementation Steps**:
  1. Define hierarchical metrics interfaces for each level
  2. Create cumulative data types with proper aggregation
  3. Add level-specific types (zone, assembly, AC, SLP)
  4. Export for component use across the hierarchical feature

#### T2.2.2: Create Hierarchical Activities Service
**Priority**: High | **Effort**: 5 hours

**Micro-tasks:**

**T2.2.2.1: Extract Activity Functions**
- **Source**: `app/utils/fetchHierarchicalData.ts`
- **Target**: `src/services/firebase/collections/hierarchical-activities.service.ts`
- **Functions to Move**:
  - `getHierarchicalTrainingActivity`
  - `getHierarchicalPanchayatWaActivity`
  - `getHierarchicalMaiBahinYojnaActivity`
- **Implementation Steps**:
  1. Create hierarchical activities service with proper imports
  2. Move activity fetching functions with their filtering logic
  3. Add activity data validation and processing
  4. Create activity aggregation utilities for hierarchical display
  5. Add date filtering utilities with proper timezone handling
  6. Test activity data aggregation across hierarchy levels

#### T2.2.3: Create Hierarchical Videos Service
**Priority**: Medium | **Effort**: 3 hours

**Micro-tasks:**

**T2.2.3.1: Extract Video Functions**
- **Source**: `app/utils/fetchHierarchicalData.ts`
- **Target**: `src/services/firebase/collections/hierarchical-videos.service.ts`
- **Functions to Move**:
  - `getHierarchicalLocalIssueVideoActivity`
  - `getHierarchicalAcVideos`
- **Implementation Steps**:
  1. Create hierarchical videos service with video-specific logic
  2. Move video fetching functions with their hierarchical filtering
  3. Add video data processing and metadata extraction
  4. Create video aggregation utilities for different hierarchy levels
  5. Add video validation and error handling
  6. Test video data fetching across different organizational levels

#### T2.2.4: Create Hierarchical Data Hook
**Priority**: Medium | **Effort**: 3 hours

**Micro-tasks:**

**T2.2.4.1: Extract Data Fetching Logic**
- **Source**: `app/utils/fetchHierarchicalData.ts`
- **Target**: `src/features/hierarchical/hooks/useHierarchicalData.ts`
- **Functions to Move**:
  - `fetchDetailedData` (detailed view data fetching)
  - `fetchDetailedMeetings` (meeting details)
  - `fetchDetailedMembers` (member details)
  - `fetchDetailedVideos` (video details)
- **Implementation Steps**:
  1. Create custom hook for hierarchical data fetching
  2. Add state management for loading, error, and data states
  3. Add data caching mechanisms to improve performance
  4. Create hook-specific types and interfaces
  5. Add comprehensive hook documentation with usage examples
  6. Test hook functionality with different data scenarios

---

## Phase 2 Completion Checklist
- [ ] **T2.1.1**: SLP service created with all functions migrated
- [ ] **T2.1.2**: Activities service created and tested
- [ ] **T2.1.3**: Meetings service created and integrated
- [ ] **T2.1.4**: Members service created and functional
- [ ] **T2.1.5**: Videos service created with proper validation
- [ ] **T2.1.6**: Base Firestore service created with utilities
- [ ] **T2.2.1**: Hierarchical metrics service created and optimized
- [ ] **T2.2.2**: Hierarchical activities service created and tested
- [ ] **T2.2.3**: Hierarchical videos service created and validated
- [ ] **T2.2.4**: Hierarchical data hook created and documented
- [ ] **Import Updates**: All consuming files updated to use new services
- [ ] **Type Safety**: All services properly typed with TypeScript
- [ ] **Error Handling**: Comprehensive error handling implemented
- [ ] **Testing**: Unit tests created for all critical functions
- [ ] **Documentation**: Service documentation completed
- [ ] **Build Test**: Project builds successfully with refactored services
- [ ] **Integration Test**: All existing functionality works with new services

---

*This completes Phase 2. Continue to Phase 3 for Component Refactoring.*

## Phase 3: Component Refactoring (Days 7-11)

### T3.1: Refactor DashboardHome.tsx (1,556 lines → multiple components)
**Priority**: Critical | **Effort**: 20 hours | **Dependencies**: T2.1, T2.2

#### T3.1.1: Create Dashboard Layout Component
**Priority**: High | **Effort**: 3 hours

**Micro-tasks:**

**T3.1.1.1: Extract Layout Structure**
- **Source**: `components/DashboardHome.tsx` (lines 101-200)
- **Target**: `src/features/dashboard/components/DashboardLayout.tsx`
- **Implementation Steps**:
  1. Create main layout component with proper structure
  2. Extract layout JSX and styling from DashboardHome
  3. Add proper prop interfaces:
     ```typescript
     interface DashboardLayoutProps {
       children: React.ReactNode;
       sidebar?: React.ReactNode;
       header?: React.ReactNode;
       isLoading?: boolean;
     }
     ```
  4. Add responsive design utilities and breakpoints
  5. Create layout-specific types and constants
  6. Add component documentation with usage examples

**T3.1.1.2: Create Layout State Management**
- **Target**: `src/features/dashboard/hooks/useDashboardLayout.ts`
- **Implementation Steps**:
  1. Create layout state hook for sidebar/navigation state
  2. Add responsive breakpoint handling logic
  3. Add layout preferences (collapsed/expanded sidebar)
  4. Create layout configuration management
  5. Add keyboard shortcuts for layout actions

#### T3.1.2: Create Summary Section Component
**Priority**: High | **Effort**: 2 hours

**Micro-tasks:**

**T3.1.2.1: Extract Summary Cards**
- **Source**: `components/DashboardHome.tsx` (lines 1185-1212)
- **Target**: `src/features/dashboard/components/SummarySection.tsx`
- **Implementation Steps**:
  1. Extract SummaryCard component and related logic
  2. Create summary section layout with grid system
  3. Add summary data processing and calculations
  4. Create summary types and interfaces
  5. Add loading and error states for summary data
  6. Add summary card interactions and click handlers

**T3.1.2.2: Create Summary Card Component**
- **Target**: `src/components/charts/SummaryCard.tsx`
- **Implementation Steps**:
  1. Extract SummaryCard from DashboardHome with all styling
  2. Add card animations and hover effects
  3. Add click handlers and interaction states
  4. Create comprehensive card prop interfaces
  5. Add accessibility features (ARIA labels, keyboard navigation)
  6. Add card variants (small, medium, large, different colors)

#### T3.1.3: Create Coordinator Section Component
**Priority**: High | **Effort**: 3 hours

**Micro-tasks:**

**T3.1.3.1: Extract Coordinator Selection**
- **Source**: `components/DashboardHome.tsx` (lines 1015-1183)
- **Target**: `src/features/dashboard/components/CoordinatorSection.tsx`
- **Implementation Steps**:
  1. Extract coordinator selection logic and state management
  2. Create coordinator display components with proper styling
  3. Add coordinator filtering and search functionality
  4. Create coordinator-specific types and interfaces
  5. Add coordinator state management with proper validation
  6. Add coordinator selection persistence

**T3.1.3.2: Create Coordinator Search Dropdown**
- **Source**: `components/DashboardHome.tsx` (CoordinatorSearchDropdown function)
- **Target**: `src/components/forms/CoordinatorSelector.tsx`
- **Implementation Steps**:
  1. Extract search dropdown component with all functionality
  2. Add advanced search functionality (fuzzy search, filters)
  3. Add keyboard navigation (arrow keys, enter, escape)
  4. Create dropdown styling with proper positioning
  5. Add accessibility features (screen reader support)
  6. Add dropdown performance optimizations (virtualization)

#### T3.1.4: Create Activity Tabs Component
**Priority**: High | **Effort**: 4 hours

**Micro-tasks:**

**T3.1.4.1: Extract Activity Tab Logic**
- **Source**: `components/DashboardHome.tsx` (activity tab sections)
- **Target**: `src/features/dashboard/components/ActivityTabs.tsx`
- **Implementation Steps**:
  1. Create tab navigation component with proper state
  2. Extract activity display logic for each tab
  3. Add tab state management with URL synchronization
  4. Create activity data processing and filtering
  5. Add tab animations and smooth transitions
  6. Add tab accessibility and keyboard navigation

**T3.1.4.2: Create Individual Activity Components**
- **Targets**:
  - `src/features/dashboard/components/TrainingActivities.tsx`
  - `src/features/dashboard/components/PanchayatActivities.tsx`
  - `src/features/dashboard/components/MaiBahinActivities.tsx`
  - `src/features/dashboard/components/VideoActivities.tsx`
- **Implementation Steps**:
  1. Create separate components for each activity type
  2. Add activity-specific data processing and validation
  3. Create activity display templates with consistent styling
  4. Add activity filtering, sorting, and pagination
  5. Add activity export functionality (CSV, PDF)
  6. Add activity detail modals and expanded views

#### T3.1.5: Create Video Section Component
**Priority**: Medium | **Effort**: 3 hours

**Micro-tasks:**

**T3.1.5.1: Extract Video Display Logic**
- **Source**: `components/DashboardHome.tsx` (video section)
- **Target**: `src/features/dashboard/components/VideoSection.tsx`
- **Implementation Steps**:
  1. Extract video display components with card layout
  2. Add video player integration and controls
  3. Create video metadata display (title, description, date)
  4. Add video filtering and search functionality
  5. Create video gallery view with thumbnails
  6. Add video loading states and error handling

#### T3.1.6: Create Leader Card Component
**Priority**: Medium | **Effort**: 4 hours

**Micro-tasks:**

**T3.1.6.1: Extract Leader Card Logic**
- **Source**: `components/DashboardHome.tsx` (lines 1236-1556, LeaderCard function)
- **Target**: `src/features/coordinators/components/CoordinatorCard.tsx`
- **Implementation Steps**:
  1. Extract LeaderCard component with all functionality
  2. Add card expansion/collapse logic with animations
  3. Create card styling and responsive design
  4. Add card interaction handlers (click, hover, focus)
  5. Create card data processing and validation
  6. Add card accessibility features and ARIA attributes

**T3.1.6.2: Create Card Utilities**
- **Target**: `src/features/coordinators/components/CardUtils.tsx`
- **Implementation Steps**:
  1. Extract card utility functions (getPositionTagStyle, getOnboardingStatusStyle)
  2. Create position tag styling with consistent colors
  3. Create status badge components with proper states
  4. Add card formatting utilities for dates and text
  5. Create card action utilities (expand, collapse, select)

#### T3.1.7: Create Reusable UI Components
**Priority**: Medium | **Effort**: 1 hour

**Micro-tasks:**

**T3.1.7.1: Create Base Card Component**
- **Target**: `src/components/ui/Card.tsx`
- **Implementation Steps**:
  1. Create base card component with flexible props
  2. Add card variants (elevated, outlined, filled)
  3. Add card sizes (small, medium, large, full)
  4. Create card composition utilities (header, body, footer)
  5. Add card theming support (light/dark mode)

### T3.2: Refactor app/wtm-slp/page.tsx (717 lines → multiple files)
**Priority**: High | **Effort**: 12 hours | **Dependencies**: T3.1

#### T3.2.1: Create Dashboard Data Hook
**Priority**: High | **Effort**: 4 hours

**Micro-tasks:**

**T3.2.1.1: Extract Data Fetching Logic**
- **Source**: `app/wtm-slp/page.tsx` (data fetching useEffects and state)
- **Target**: `src/features/dashboard/hooks/useDashboardData.ts`
- **Implementation Steps**:
  1. Create custom hook for comprehensive data management
  2. Extract all data fetching logic from useEffect hooks
  3. Add data caching and optimization strategies
  4. Create data state management (loading, error, success)
  5. Add error handling and retry logic with exponential backoff
  6. Add data validation and sanitization

#### T3.2.2: Create Date Filtering Hook
**Priority**: Medium | **Effort**: 2 hours

**Micro-tasks:**

**T3.2.2.1: Extract Date Logic**
- **Source**: `app/wtm-slp/page.tsx` (date filtering and state management)
- **Target**: `src/features/dashboard/hooks/useDateFiltering.ts`
- **Implementation Steps**:
  1. Create date filtering hook with comprehensive logic
  2. Add date range calculations and validation
  3. Add date validation utilities and error handling
  4. Create date formatting functions for display
  5. Add date preset management (last week, month, etc.)
  6. Add timezone handling and localization

#### T3.2.3: Create Coordinator Data Hook
**Priority**: Medium | **Effort**: 3 hours

**Micro-tasks:**

**T3.2.3.1: Extract Coordinator Logic**
- **Source**: `app/wtm-slp/page.tsx` (coordinator management and state)
- **Target**: `src/features/dashboard/hooks/useCoordinatorData.ts`
- **Implementation Steps**:
  1. Create coordinator data hook with selection logic
  2. Add coordinator selection and filtering functionality
  3. Add coordinator search and validation
  4. Create coordinator state management with persistence
  5. Add coordinator data validation and error handling
  6. Add coordinator activity aggregation

#### T3.2.4: Simplify Main Page Component
**Priority**: High | **Effort**: 3 hours

**Micro-tasks:**

**T3.2.4.1: Refactor Page Component**
- **Source**: `app/wtm-slp/page.tsx`
- **Target**: Keep in same location but drastically simplify
- **Implementation Steps**:
  1. Remove all business logic and data fetching
  2. Keep only page-level composition and routing
  3. Use custom hooks for all data management
  4. Add proper error boundaries for component isolation
  5. Add loading states and skeleton components
  6. Ensure component stays under 150 lines total

---

## Phase 3 Completion Checklist
- [ ] **T3.1.1**: Dashboard layout component created and responsive
- [ ] **T3.1.2**: Summary section component created with cards
- [ ] **T3.1.3**: Coordinator section component created with search
- [ ] **T3.1.4**: Activity tabs component created with individual activities
- [ ] **T3.1.5**: Video section component created with player integration
- [ ] **T3.1.6**: Leader card component created with utilities
- [ ] **T3.1.7**: Reusable UI components created and documented
- [ ] **T3.2.1**: Dashboard data hook created and optimized
- [ ] **T3.2.2**: Date filtering hook created with validation
- [ ] **T3.2.3**: Coordinator data hook created with state management
- [ ] **T3.2.4**: Main page component simplified and refactored
- [ ] **Component Integration**: All new components properly integrated
- [ ] **Props Interface**: All component props properly typed
- [ ] **State Management**: Proper state flow between components
- [ ] **Error Handling**: Comprehensive error boundaries implemented
- [ ] **Accessibility**: ARIA attributes and keyboard navigation added
- [ ] **Responsive Design**: Components work on all screen sizes
- [ ] **Performance**: Components optimized for rendering performance
- [ ] **Testing**: Component tests created for critical functionality
- [ ] **Documentation**: Component documentation and usage examples
- [ ] **Build Test**: Project builds successfully with refactored components
- [ ] **UI Test**: All existing functionality preserved and working

---

*This completes Phase 3. Continue to Phase 4 for Feature-Specific Refactoring.*

## Phase 4: Feature-Specific Refactoring (Days 12-14)

### T4.1: Hierarchical Dashboard Feature
**Priority**: High | **Effort**: 12 hours | **Dependencies**: T2.2, T3.1

#### T4.1.1: Create Hierarchical Dashboard Component
**Priority**: High | **Effort**: 3 hours

**Micro-tasks:**

**T4.1.1.1: Create Main Dashboard Component**
- **Source**: `app/wtm-slp-new/page.tsx` (main component logic)
- **Target**: `src/features/hierarchical/components/HierarchicalDashboard.tsx`
- **Implementation Steps**:
  1. Extract main dashboard logic and structure
  2. Create hierarchical navigation integration
  3. Add level-based data display (Zone → Assembly → AC → SLP)
  4. Create dashboard state management with proper typing
  5. Add dashboard error handling and loading states
  6. Add breadcrumb navigation for hierarchy levels

**T4.1.1.2: Create Navigation Integration**
- **Target**: `src/features/hierarchical/components/NavigationPanel.tsx`
- **Implementation Steps**:
  1. Create navigation panel with level selection
  2. Add navigation state synchronization
  3. Create level-specific navigation controls
  4. Add navigation validation and error handling
  5. Create navigation history and back/forward functionality

#### T4.1.2: Create Navigation State Hook
**Priority**: High | **Effort**: 2 hours

**Micro-tasks:**

**T4.1.2.1: Extract Navigation Logic**
- **Source**: `app/wtm-slp-new/page.tsx` (navigation state management)
- **Target**: `src/features/hierarchical/hooks/useNavigationState.ts`
- **Implementation Steps**:
  1. Create navigation state hook with level management
  2. Add level navigation logic (zone, assembly, AC, SLP)
  3. Add breadcrumb management and history
  4. Create navigation validation and constraints
  5. Add navigation persistence and URL synchronization
  6. Add navigation event handlers and callbacks

#### T4.1.3: Create Metrics Hook
**Priority**: High | **Effort**: 3 hours

**Micro-tasks:**

**T4.1.3.1: Extract Metrics Logic**
- **Source**: `app/wtm-slp-new/page.tsx` (metrics fetching and calculations)
- **Target**: `src/features/hierarchical/hooks/useMetrics.ts`
- **Implementation Steps**:
  1. Create metrics data hook with level-specific calculations
  2. Add metrics aggregation for different hierarchy levels
  3. Add metrics caching and performance optimization
  4. Create metrics validation and data integrity checks
  5. Add metrics error handling and retry logic
  6. Add metrics real-time updates and refresh functionality

#### T4.1.4: Update Existing Components
**Priority**: Medium | **Effort**: 4 hours

**Micro-tasks:**

**T4.1.4.1: Update Component Imports**
- **Locations**: All files in `components/hierarchical/`
  - `components/hierarchical/ActivitiesList.tsx`
  - `components/hierarchical/VideosList.tsx`
  - `components/hierarchical/MeetingsList.tsx`
  - `components/hierarchical/FormsList.tsx`
  - `components/hierarchical/ClubsList.tsx`
  - `components/hierarchical/DataTable.tsx`
  - `components/hierarchical/DetailedView.tsx`
  - `components/hierarchical/CumulativeDataCards.tsx`
  - `components/hierarchical/HierarchicalNavigation.tsx`
  - `components/hierarchical/HierarchicalErrorBoundary.tsx`
- **Implementation Steps**:
  1. Update import paths to use new services from Phase 2
  2. Update component props interfaces with proper typing
  3. Add proper TypeScript types from new service layers
  4. Test component functionality with new service integration
  5. Ensure all components stay under 400 lines
  6. Add component documentation and usage examples

**T4.1.4.2: Refactor Large Hierarchical Components**
- **Source**: `components/hierarchical/ActivitiesList.tsx` (386 lines)
- **Target**: Split into smaller focused components
- **Implementation Steps**:
  1. Split ActivitiesList into activity-specific components
  2. Create ActivityItem component for individual activities
  3. Create ActivityFilters component for filtering logic
  4. Create ActivityPagination component for pagination
  5. Ensure each component stays under 200 lines
  6. Add proper component composition and props

### T4.2: Authentication Feature
**Priority**: Medium | **Effort**: 6 hours | **Dependencies**: T1.1-T1.3

#### T4.2.1: Create Login Form Component
**Priority**: Medium | **Effort**: 2 hours

**Micro-tasks:**

**T4.2.1.1: Extract Login Logic**
- **Source**: `app/auth/page.tsx` (login form section)
- **Target**: `src/features/auth/components/LoginForm.tsx`
- **Implementation Steps**:
  1. Extract login form component with validation
  2. Add form state management with proper typing
  3. Add login validation (email, password requirements)
  4. Create login error handling and user feedback
  5. Add login success handling and redirection
  6. Add form accessibility features (labels, ARIA)

**T4.2.1.2: Create Login Hook**
- **Target**: `src/features/auth/hooks/useLogin.ts`
- **Implementation Steps**:
  1. Create login hook with authentication logic
  2. Add login state management (loading, error, success)
  3. Add authentication token management
  4. Create login error handling and retry logic
  5. Add login session management and persistence

#### T4.2.2: Create Signup Form Component
**Priority**: Medium | **Effort**: 2 hours

**Micro-tasks:**

**T4.2.2.1: Extract Signup Logic**
- **Source**: `app/auth/page.tsx` (signup form section)
- **Target**: `src/features/auth/components/SignupForm.tsx`
- **Implementation Steps**:
  1. Extract signup form component with comprehensive validation
  2. Add form state management with proper field validation
  3. Add signup validation (email format, password strength)
  4. Create signup error handling and user feedback
  5. Add signup success handling and email verification
  6. Add form progress indicators and multi-step support

**T4.2.2.2: Create Signup Hook**
- **Target**: `src/features/auth/hooks/useSignup.ts`
- **Implementation Steps**:
  1. Create signup hook with registration logic
  2. Add signup state management and validation
  3. Add user account creation and verification
  4. Create signup error handling and field-specific errors
  5. Add signup success handling and onboarding flow

#### T4.2.3: Create Assembly Selector Component
**Priority**: Medium | **Effort**: 2 hours

**Micro-tasks:**

**T4.2.3.1: Extract Assembly Selection**
- **Source**: `app/auth/page.tsx` (assembly selection with search functionality)
- **Target**: `src/features/auth/components/AssemblySelector.tsx`
- **Implementation Steps**:
  1. Extract assembly selector component with search
  2. Add assembly search functionality with fuzzy matching
  3. Add assembly filtering and categorization
  4. Create assembly validation and selection logic
  5. Add assembly selection state management
  6. Add assembly selector accessibility and keyboard navigation

**T4.2.3.2: Create Assembly Hook**
- **Target**: `src/features/auth/hooks/useAssemblies.ts`
- **Implementation Steps**:
  1. Create assembly data hook with fetching logic
  2. Add assembly search and filtering functionality
  3. Add assembly data caching and optimization
  4. Create assembly validation and error handling
  5. Add assembly selection persistence

### T4.3: Update Main Auth Page
**Priority**: Low | **Effort**: 1 hour

#### T4.3.1: Simplify Auth Page Component
**Priority**: Low | **Effort**: 1 hour

**Micro-tasks:**

**T4.3.1.1: Refactor Auth Page**
- **Source**: `app/auth/page.tsx` (336 lines)
- **Target**: Keep in same location but simplify
- **Implementation Steps**:
  1. Remove all form logic and state management
  2. Keep only page-level composition and routing
  3. Use new auth components (LoginForm, SignupForm, AssemblySelector)
  4. Add proper error boundaries for auth components
  5. Add loading states and transitions between forms
  6. Ensure component stays under 150 lines total

---

## Phase 4 Completion Checklist
- [ ] **T4.1.1**: Hierarchical dashboard component created and integrated
- [ ] **T4.1.2**: Navigation state hook created with level management
- [ ] **T4.1.3**: Metrics hook created with aggregation logic
- [ ] **T4.1.4**: Existing hierarchical components updated and refactored
- [ ] **T4.2.1**: Login form component created with validation
- [ ] **T4.2.2**: Signup form component created with comprehensive validation
- [ ] **T4.2.3**: Assembly selector component created with search
- [ ] **T4.3.1**: Auth page component simplified and refactored
- [ ] **Service Integration**: All components use new service layer
- [ ] **Hook Integration**: Custom hooks properly implemented
- [ ] **Component Size**: All components under 400 lines
- [ ] **Type Safety**: All components properly typed
- [ ] **Error Handling**: Comprehensive error boundaries
- [ ] **State Management**: Proper state flow and management
- [ ] **Accessibility**: ARIA attributes and keyboard navigation
- [ ] **Performance**: Components optimized for performance
- [ ] **Testing**: Feature tests created and passing
- [ ] **Documentation**: Feature documentation completed
- [ ] **Build Test**: Project builds successfully
- [ ] **Feature Test**: All existing functionality preserved

---

*This completes Phase 4. Continue to Phase 5 for Utility and Helper Refactoring.*

## Phase 5: Utility and Helper Refactoring (Days 15-17)

### T5.1: Create Utility Libraries
**Priority**: Medium | **Effort**: 10 hours | **Dependencies**: T2.1, T2.2

#### T5.1.1: Create Date Utils
**Priority**: High | **Effort**: 2 hours

**Micro-tasks:**

**T5.1.1.1: Extract Date Functions**
- **Sources**: Various files with date logic
  - `components/DashboardHome.tsx` (parseDate function, lines 71-80)
  - `components/DateRangeFilter.tsx` (date range calculations)
  - `app/wtm-slp/page.tsx` (date filtering logic)
  - `app/utils/fetchFirebaseData.ts` (date filtering in queries)
- **Target**: `src/lib/utils/dateUtils.ts`
- **Functions to Extract**:
  - `parseDate` - Parse various date formats
  - `formatDate` - Format dates for display
  - `getDateRange` - Calculate date ranges (last week, month, etc.)
  - `isValidDate` - Date validation
  - `compareDates` - Date comparison utilities
- **Implementation Steps**:
  1. Create comprehensive date utility library
  2. Extract and consolidate all date parsing functions
  3. Add date formatting utilities for consistent display
  4. Create date range calculation functions
  5. Add date validation and error handling
  6. Add timezone handling and localization support

**T5.1.1.2: Create Date Constants**
- **Target**: `src/lib/constants/dateConstants.ts`
- **Implementation Steps**:
  1. Create date format constants (YYYY-MM-DD, DD/MM/YYYY)
  2. Add date range presets (last week, month, quarter)
  3. Create timezone constants and mappings
  4. Add date validation rules and constraints

#### T5.1.2: Create String Utils
**Priority**: Medium | **Effort**: 1.5 hours

**Micro-tasks:**

**T5.1.2.1: Extract String Functions**
- **Sources**: Various files with string manipulation
  - `components/DashboardHome.tsx` (normalize function, line 67-69)
  - `app/auth/page.tsx` (string validation and formatting)
  - Various components with text processing
- **Target**: `src/lib/utils/stringUtils.ts`
- **Functions to Extract**:
  - `normalize` - String normalization (trim, lowercase)
  - `capitalizeFirst` - Capitalize first letter
  - `truncateText` - Text truncation with ellipsis
  - `slugify` - Convert text to URL-friendly slugs
  - `sanitizeInput` - Input sanitization for security
- **Implementation Steps**:
  1. Extract normalize function from DashboardHome
  2. Create text formatting utilities (capitalize, truncate)
  3. Add string validation functions
  4. Create text transformation utilities
  5. Add input sanitization for security
  6. Add string comparison utilities (fuzzy matching)

#### T5.1.3: Create Validation Utils
**Priority**: Medium | **Effort**: 2 hours

**Micro-tasks:**

**T5.1.3.1: Extract Validation Functions**
- **Sources**: Form validation logic across components
  - `app/auth/page.tsx` (email, password validation)
  - Various form components with validation
- **Target**: `src/lib/utils/validationUtils.ts`
- **Functions to Create**:
  - `validateEmail` - Email format validation
  - `validatePassword` - Password strength validation
  - `validateRequired` - Required field validation
  - `validateLength` - String length validation
  - `validatePhoneNumber` - Phone number validation
- **Implementation Steps**:
  1. Create comprehensive validation library
  2. Add email format validation with regex
  3. Create password strength validation
  4. Add form field validation utilities
  5. Create validation error message generation
  6. Add custom validation rule support

#### T5.1.4: Create Data Transformers
**Priority**: Medium | **Effort**: 2.5 hours

**Micro-tasks:**

**T5.1.4.1: Extract Data Processing Functions**
- **Sources**: Data transformation logic across services
  - `app/utils/fetchFirebaseData.ts` (data processing)
  - `app/utils/fetchHierarchicalData.ts` (data aggregation)
  - Various components with data manipulation
- **Target**: `src/lib/helpers/dataTransformers.ts`
- **Functions to Extract**:
  - `transformFirebaseData` - Firebase document transformation
  - `aggregateMetrics` - Data aggregation utilities
  - `filterData` - Data filtering utilities
  - `sortData` - Data sorting utilities
  - `groupData` - Data grouping utilities
- **Implementation Steps**:
  1. Extract data transformation functions from services
  2. Create data aggregation utilities for metrics
  3. Add data filtering and sorting utilities
  4. Create data grouping and categorization functions
  5. Add data validation and sanitization
  6. Create data export utilities (CSV, JSON)

#### T5.1.5: Create Error Handlers
**Priority**: High | **Effort**: 2 hours

**Micro-tasks:**

**T5.1.5.1: Extract Error Handling Logic**
- **Sources**: Error handling across the application
  - `app/utils/errorUtils.ts` (175 lines - consolidate)
  - Various components with try-catch blocks
  - Service error handling patterns
- **Target**: `src/lib/helpers/errorHandlers.ts`
- **Functions to Extract and Create**:
  - `handleApiError` - API error processing
  - `handleFirebaseError` - Firebase-specific errors
  - `logError` - Error logging utilities
  - `formatErrorMessage` - User-friendly error messages
  - `retryOperation` - Retry logic for failed operations
- **Implementation Steps**:
  1. Consolidate existing errorUtils.ts functionality
  2. Create comprehensive error handling utilities
  3. Add error logging and monitoring integration
  4. Create user-friendly error message formatting
  5. Add retry logic with exponential backoff
  6. Create error boundary utilities for React components

### T5.2: Create Custom Hooks
**Priority**: Medium | **Effort**: 4 hours | **Dependencies**: T5.1

#### T5.2.1: Create Local Storage Hook
**Priority**: Low | **Effort**: 1 hour

**Micro-tasks:**

**T5.2.1.1: Create Storage Hook**
- **Target**: `src/lib/hooks/useLocalStorage.ts`
- **Implementation Steps**:
  1. Create local storage management hook
  2. Add JSON serialization/deserialization
  3. Add storage event listeners for cross-tab sync
  4. Create storage error handling
  5. Add storage quota management
  6. Add TypeScript generics for type safety

#### T5.2.2: Create Debounce Hook
**Priority**: Medium | **Effort**: 0.5 hours

**Micro-tasks:**

**T5.2.2.1: Create Debounce Hook**
- **Target**: `src/lib/hooks/useDebounce.ts`
- **Implementation Steps**:
  1. Create debouncing hook for search and filters
  2. Add configurable delay timing
  3. Add cleanup on component unmount
  4. Create immediate execution option
  5. Add TypeScript typing for generic values

#### T5.2.3: Create Async Hook
**Priority**: Medium | **Effort**: 1.5 hours

**Micro-tasks:**

**T5.2.3.1: Create Async Operation Hook**
- **Target**: `src/lib/hooks/useAsync.ts`
- **Implementation Steps**:
  1. Create async operation management hook
  2. Add loading, error, and success states
  3. Add automatic error handling and retry logic
  4. Create request cancellation support
  5. Add caching and memoization options
  6. Add TypeScript generics for return types

#### T5.2.4: Create Window Size Hook
**Priority**: Low | **Effort**: 0.5 hours

**Micro-tasks:**

**T5.2.4.1: Create Responsive Hook**
- **Target**: `src/lib/hooks/useWindowSize.ts`
- **Implementation Steps**:
  1. Create window size tracking hook
  2. Add responsive breakpoint detection
  3. Add debounced resize handling
  4. Create mobile/desktop detection
  5. Add orientation change detection

#### T5.2.5: Create Previous Value Hook
**Priority**: Low | **Effort**: 0.5 hours

**Micro-tasks:**

**T5.2.5.1: Create Previous Value Hook**
- **Target**: `src/lib/hooks/usePrevious.ts`
- **Implementation Steps**:
  1. Create previous value tracking hook
  2. Add comparison utilities
  3. Add change detection logic
  4. Create TypeScript generics for any value type

### T5.3: Create Constants Library
**Priority**: Low | **Effort**: 2 hours

#### T5.3.1: Create Role Constants
**Priority**: Low | **Effort**: 0.5 hours

**Micro-tasks:**

**T5.3.1.1: Extract Role Definitions**
- **Sources**: Role definitions scattered across components
- **Target**: `src/lib/constants/roleConstants.ts`
- **Implementation Steps**:
  1. Extract role constants (SLP, ASLP, AC, etc.)
  2. Create role permission mappings
  3. Add role display names and descriptions
  4. Create role validation utilities

#### T5.3.2: Create UI Constants
**Priority**: Low | **Effort**: 0.5 hours

**Micro-tasks:**

**T5.3.2.1: Extract UI Constants**
- **Sources**: UI constants across components
- **Target**: `src/lib/constants/uiConstants.ts`
- **Implementation Steps**:
  1. Extract color constants and theme values
  2. Create breakpoint constants for responsive design
  3. Add animation timing and easing constants
  4. Create spacing and sizing constants

#### T5.3.3: Create API Constants
**Priority**: Low | **Effort**: 1 hour

**Micro-tasks:**

**T5.3.3.1: Extract API Constants**
- **Sources**: API endpoints and configuration
- **Target**: `src/lib/constants/apiConstants.ts`
- **Implementation Steps**:
  1. Extract Firebase collection names
  2. Create API endpoint constants
  3. Add request timeout and retry constants
  4. Create error code constants and mappings

---

## Phase 5 Completion Checklist
- [ ] **T5.1.1**: Date utils created with comprehensive functionality
- [ ] **T5.1.2**: String utils created with normalization and validation
- [ ] **T5.1.3**: Validation utils created with form validation
- [ ] **T5.1.4**: Data transformers created with processing utilities
- [ ] **T5.1.5**: Error handlers created with comprehensive error management
- [ ] **T5.2.1**: Local storage hook created and tested
- [ ] **T5.2.2**: Debounce hook created for search optimization
- [ ] **T5.2.3**: Async hook created with state management
- [ ] **T5.2.4**: Window size hook created for responsive design
- [ ] **T5.2.5**: Previous value hook created for change detection
- [ ] **T5.3.1**: Role constants created and organized
- [ ] **T5.3.2**: UI constants created for consistent styling
- [ ] **T5.3.3**: API constants created for configuration
- [ ] **Utility Integration**: All utilities properly integrated across codebase
- [ ] **Import Updates**: All files updated to use new utility functions
- [ ] **Error Consolidation**: Existing errorUtils.ts properly consolidated
- [ ] **Type Safety**: All utilities properly typed with TypeScript
- [ ] **Documentation**: Comprehensive utility documentation created
- [ ] **Testing**: Unit tests created for all utility functions
- [ ] **Performance**: Utilities optimized for performance
- [ ] **Build Test**: Project builds successfully with new utilities
- [ ] **Functionality Test**: All existing functionality preserved

---

---

## Phase 6: Type System Refactoring

### T6.1: Organize Type Definitions

**Objective**: Create a well-organized type system with modular type definitions that are easy to maintain and extend.

**Current State Analysis**:
- `models/types.ts` contains all type definitions (estimated 800+ lines)
- Mixed concerns: UI types, data types, API types, utility types
- Some types are duplicated or inconsistent across components
- Missing comprehensive type documentation

**Target Structure**:
```
src/types/
├── index.ts              # Barrel exports for all types
├── api/                  # API-related types
│   ├── firebase.ts       # Firebase document interfaces
│   ├── hierarchical.ts   # Hierarchical data types
│   └── responses.ts      # API response types
├── ui/                   # UI component types
│   ├── components.ts     # Component prop interfaces
│   ├── forms.ts          # Form-related types
│   └── navigation.ts     # Navigation and routing types
├── data/                 # Data model types
│   ├── user.ts           # User, SLP, AC, ASLP types
│   ├── activity.ts       # Activity-related types
│   └── metrics.ts        # Metrics and dashboard types
└── utils/                # Utility types
    ├── common.ts         # Common utility types
    ├── dates.ts          # Date-related types
    └── filters.ts        # Filter and search types
```

**Implementation Tasks**:

#### T6.1.1: Create Type Directory Structure
- [ ] Create `src/types/` directory with subdirectories
- [ ] Set up barrel export system in `index.ts`
- [ ] Configure path aliases for easy imports
- [ ] **File Size Target**: Each type file < 200 lines
- [ ] **Functionality Test**: All existing types accessible

#### T6.1.2: Extract Firebase Types
- [ ] Move Firebase document interfaces to `api/firebase.ts`
- [ ] Include: `SlpTrainingActivity`, `PanchayatWaActivity`, `LocalIssueVideoActivity`, etc.
- [ ] Add comprehensive JSDoc documentation
- [ ] Ensure all Firebase field types are accurately represented
- [ ] **File Size Target**: `api/firebase.ts` < 200 lines
- [ ] **Functionality Test**: All Firebase operations work correctly

#### T6.1.3: Extract UI Component Types
- [ ] Move component prop interfaces to `ui/components.ts`
- [ ] Include: `DashboardHomeProps`, `MetricCardProps`, `DetailedViewProps`, etc.
- [ ] Organize by component hierarchy
- [ ] Add prop validation and default value documentation
- [ ] **File Size Target**: `ui/components.ts` < 200 lines
- [ ] **Functionality Test**: All components render correctly

#### T6.1.4: Extract Data Model Types
- [ ] Move core data types to `data/` subdirectory
- [ ] Separate user types, activity types, and metrics types
- [ ] Ensure type consistency across all data models
- [ ] Add type guards and validation utilities
- [ ] **File Size Target**: Each data type file < 150 lines
- [ ] **Functionality Test**: All data operations work correctly

#### T6.1.5: Create Utility Types
- [ ] Extract common utility types to `utils/common.ts`
- [ ] Create date-specific types in `utils/dates.ts`
- [ ] Add filter and search types in `utils/filters.ts`
- [ ] Include generic types for reusability
- [ ] **File Size Target**: Each utility type file < 100 lines
- [ ] **Functionality Test**: All utility functions work correctly

### T6.2: Enhance Type Safety

**Objective**: Improve type safety across the application with stricter types, type guards, and validation utilities.

#### T6.2.1: Add Strict Type Guards
- [ ] Create type guard functions for runtime type checking
- [ ] Add guards for Firebase document validation
- [ ] Include user role validation guards
- [ ] Implement data structure validation
- [ ] **File Size Target**: Type guards file < 150 lines
- [ ] **Functionality Test**: Runtime validation works correctly

#### T6.2.2: Implement Branded Types
- [ ] Create branded types for IDs and sensitive data
- [ ] Add `UserId`, `HandlerId`, `AssemblyId` branded types
- [ ] Prevent accidental ID mixing in function parameters
- [ ] Improve type safety in data fetching functions
- [ ] **File Size Target**: Branded types file < 100 lines
- [ ] **Functionality Test**: ID validation prevents errors

#### T6.2.3: Add Comprehensive Enums
- [ ] Convert string literals to proper enums
- [ ] Include `UserRole`, `ActivityType`, `MetricType` enums
- [ ] Add validation functions for enum values
- [ ] Ensure consistent enum usage across components
- [ ] **File Size Target**: Enums file < 100 lines
- [ ] **Functionality Test**: Enum validation works correctly

#### T6.2.4: Create Validation Schemas
- [ ] Add runtime validation for API responses
- [ ] Create schema validation for form inputs
- [ ] Include data transformation utilities
- [ ] Add error handling for invalid data
- [ ] **File Size Target**: Validation schemas file < 200 lines
- [ ] **Functionality Test**: Data validation prevents errors

---

## Phase 7: Configuration and Setup

### T7.1: Update Configuration Files

**Objective**: Update all configuration files to support the new folder structure and ensure optimal build performance.

#### T7.1.1: Update TypeScript Configuration
- [ ] Update `tsconfig.json` with new path aliases
- [ ] Add strict type checking options
- [ ] Configure module resolution for new structure
- [ ] Optimize compilation performance
- [ ] **Functionality Test**: TypeScript compilation works correctly

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/components/*": ["src/components/*"],
      "@/services/*": ["src/services/*"],
      "@/utils/*": ["src/utils/*"],
      "@/types/*": ["src/types/*"],
      "@/hooks/*": ["src/hooks/*"],
      "@/constants/*": ["src/constants/*"]
    },
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

#### T7.1.2: Update Next.js Configuration
- [ ] Update `next.config.ts` with webpack aliases
- [ ] Configure build optimization for new structure
- [ ] Add bundle analysis configuration
- [ ] Ensure proper tree shaking
- [ ] **Functionality Test**: Next.js build works correctly

#### T7.1.3: Update ESLint Configuration
- [ ] Add import order rules for new structure
- [ ] Configure path-based linting rules
- [ ] Add custom rules for type usage
- [ ] Ensure consistent code style
- [ ] **Functionality Test**: ESLint rules work correctly

#### T7.1.4: Update Package.json Scripts
- [ ] Add type checking scripts
- [ ] Include build analysis commands
- [ ] Add development utility scripts
- [ ] Configure testing scripts for new structure
- [ ] **Functionality Test**: All scripts execute correctly

### T7.2: Import Path Migration

**Objective**: Systematically update all import statements to use the new folder structure and path aliases.

#### T7.2.1: Create Migration Scripts
- [ ] Develop codemod scripts for automated import updates
- [ ] Create validation scripts to check import consistency
- [ ] Add rollback capabilities for safe migration
- [ ] Include progress tracking and reporting
- [ ] **Functionality Test**: Migration scripts work correctly

#### T7.2.2: Update Component Imports
- [ ] Migrate all component imports to use new paths
- [ ] Update relative imports to absolute imports
- [ ] Ensure consistent import ordering
- [ ] Test component functionality after migration
- [ ] **Functionality Test**: All components work after import updates

#### T7.2.3: Update Service and Utility Imports
- [ ] Migrate service layer imports
- [ ] Update utility function imports
- [ ] Migrate type imports to new structure
- [ ] Ensure all dependencies are properly resolved
- [ ] **Functionality Test**: All services and utilities work correctly

#### T7.2.4: Update Test Imports
- [ ] Migrate all test file imports
- [ ] Update mock imports and test utilities
- [ ] Ensure test coverage is maintained
- [ ] Validate test execution after migration
- [ ] **Functionality Test**: All tests pass after migration

### T7.3: Documentation and Cleanup

**Objective**: Create comprehensive documentation for the new structure and clean up any remaining legacy code.

#### T7.3.1: Create Architecture Documentation
- [ ] Document new folder structure and conventions
- [ ] Create component hierarchy documentation
- [ ] Add service layer documentation
- [ ] Include type system documentation
- [ ] **Functionality Test**: Documentation is accurate and helpful

#### T7.3.2: Update README Files
- [ ] Update main README with new structure
- [ ] Add README files for each major directory
- [ ] Include development setup instructions
- [ ] Add contribution guidelines
- [ ] **Functionality Test**: Setup instructions work for new developers

#### T7.3.3: Clean Up Legacy Code
- [ ] Remove unused files and dependencies
- [ ] Clean up commented-out code
- [ ] Remove temporary migration files
- [ ] Optimize bundle size
- [ ] **Functionality Test**: Application works without legacy code

#### T7.3.4: Create Migration Guide
- [ ] Document the refactoring process
- [ ] Include before/after comparisons
- [ ] Add troubleshooting guide
- [ ] Create onboarding documentation for new developers
- [ ] **Functionality Test**: Migration guide is comprehensive and accurate

---

## Implementation Timeline

### Phase-by-Phase Schedule

**Phase 1: Infrastructure Setup** (1-2 days)
- Low risk, foundational work
- Can be done in parallel with other development

**Phase 2: Utility Services Refactoring** (3-4 days)
- Medium risk, requires careful testing
- Critical for data fetching functionality

**Phase 3: Component Refactoring** (4-5 days)
- High impact, requires thorough UI testing
- Most visible changes to end users

**Phase 4: Feature-Specific Refactoring** (3-4 days)
- Medium risk, feature-focused changes
- Requires domain knowledge testing

**Phase 5: Utility and Helper Refactoring** (2-3 days)
- Low risk, utility-focused changes
- Improves developer experience

**Phase 6: Type System Refactoring** (2-3 days)
- Medium risk, improves type safety
- Requires comprehensive type checking

**Phase 7: Configuration and Setup** (2-3 days)
- Medium risk, affects build process
- Requires thorough testing of build pipeline

**Total Estimated Time**: 17-24 days

### Risk Mitigation

**High-Risk Areas**:
- Component refactoring (Phase 3)
- Import path migration (Phase 7)
- Firebase service splitting (Phase 2)

**Mitigation Strategies**:
- Incremental deployment with rollback capabilities
- Comprehensive testing at each phase
- Feature flags for gradual rollout
- Backup and recovery procedures

---

## Success Metrics

### Code Quality Metrics
- ✅ No file exceeds 600 lines of code
- ✅ Average file size reduced by 60%
- ✅ Cyclomatic complexity reduced by 40%
- ✅ Code duplication reduced by 50%

### Performance Metrics
- ✅ Bundle size optimized with proper tree shaking
- ✅ Build time improved by 20%
- ✅ Development server startup time improved
- ✅ IDE performance improved with better type checking

### Developer Experience Metrics
- ✅ Improved IDE autocomplete and navigation
- ✅ Faster onboarding for new developers
- ✅ Reduced time to locate and modify code
- ✅ Improved code review efficiency

### Maintainability Metrics
- ✅ Clear separation of concerns
- ✅ Consistent coding patterns
- ✅ Comprehensive type safety
- ✅ Well-documented architecture

---

## Summary

This comprehensive PRD provides a detailed roadmap for refactoring the Bihar Congress Dashboard codebase to improve maintainability, readability, and organization. The plan ensures no file exceeds 600 lines while preserving all existing functionality through incremental, non-breaking changes.

The refactoring will be implemented in **7 phases**, with each phase focusing on specific aspects of the codebase:

1. **Infrastructure Setup**: Create folder structure and configuration
2. **Utility Services Refactoring**: Split large Firebase utility files
3. **Component Refactoring**: Break down large components
4. **Feature-Specific Refactoring**: Organize hierarchical and auth features
5. **Utility and Helper Refactoring**: Create reusable utilities and hooks
6. **Type System Refactoring**: Organize and enhance type definitions
7. **Configuration and Setup**: Update configs and migrate imports

**Key Benefits**:
- **Improved Maintainability**: Smaller, focused files are easier to understand and modify
- **Better Organization**: Clear folder structure and separation of concerns
- **Enhanced Type Safety**: Comprehensive type system with proper validation
- **Optimized Performance**: Better tree shaking and bundle optimization
- **Developer Experience**: Improved IDE support and faster development cycles
- **Future-Proof Architecture**: Scalable structure for future feature development

**Implementation Approach**:
- **Incremental Changes**: Each phase builds on the previous one
- **Non-Breaking**: All existing functionality is preserved
- **Thoroughly Tested**: Comprehensive testing at each phase
- **Well-Documented**: Clear documentation and migration guides

This refactoring will transform the codebase into a well-organized, maintainable, and scalable application while ensuring a smooth transition for the development team and preserving all existing functionality for end users.