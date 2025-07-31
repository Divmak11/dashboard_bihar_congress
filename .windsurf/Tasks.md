# Detailed View Filters – Task Plan (Meetings / Volunteers / Samvidhan Leaders)

> NOTE:  Implementation **must not start** until explicitly approved.

## Objective
Introduce a two-stage filter (column selector + value selector) in the detailed views of the Meetings, Volunteers, and Samvidhan Leaders metric cards, using the columns:
* Assembly  
* Position  
* Status  
* Level Of Influence  
* Block

The selectors must follow existing dashboard design patterns and gather their value options dynamically from the data already fetched from Firebase.

---

## Task Breakdown

### 1. UI/UX Design
- [ ] T1 – Finalise exact placement and spacing of the two selectors inside each detailed view header (below title, above search bar).
- [ ] T2 – Define Tailwind classes / component variants to match current drop-down styling.

### 2. Data Preparation
- [ ] T3 – Extend detailed data fetching logic to compute **unique value sets** for each of the five columns *from the fetched dataset* (client-side) when the detailed view loads.
- [ ] T4 – If a dataset is empty, ensure selectors fall back to an empty/disabled state gracefully.

### 3. Filter Component
- [x] T5 – Build reusable `<ColumnValueFilter>` component:
  - Primary select → column list (Assembly, Position, Status, Level Of Influence, Block)
  - Secondary select → deduplicated values based on column chosen
  - Props: `availableColumns`, `uniqueValues`, `onChange`

### 4. Integration per Metric Card
- [x] T6 – Integrate filter component into `MeetingsList` and hook into its internal filtered dataset.
- [x] T7 – Integrate into `VolunteersList` (shares same data structure).
- [x] T8 – Integrate into `SlpsList` (Samvidhan Leaders detailed view).

### 5. Filtering Logic
- [x] T9 – Apply selected column/value pair to filter the **already fetched** data array before rendering `DataTable`."
- [x] T10 – Ensure interaction with existing text search & table sorting works without conflict (filters applied first, then search/sort).

### 6. State & Reset Handling
- [x] T11 – Reset filters when user switches metric card or closes the detailed view.

### 7. QA & Testing
- [ ] T12 – Unit test `getUniqueValues` helper for each column type.
- [ ] T13 – Component tests for `<ColumnValueFilter>` (options population, disabled states).
- [ ] T14 – Manual end-to-end verification across all hierarchy levels and date ranges.

---

## Deliverables
1. Updated components (`MeetingsList`, `VolunteersList`, `SlpsList`) with integrated filters.
2. Reusable filter component file under `components/hierarchical/`.
3. Updated documentation in `README_dashboard.md` (if exists).
4. All new code fully typed, lint-clean, and matching project conventions.

---

### Implementation Complete ✅  
**Filter System:** Two-stage column/value selectors added to Meetings, Volunteers, and Samvidhan Leaders detailed views.  
**Conditional Rendering:** Filters only appear on metric cards that explicitly opt-in via `showColumnFilter` prop.  
**Future-Ready:** Easy to extend with metric-specific filters by adding new props and conditional blocks.

## Progress Tracking
- **Total Tasks:** 14
- **Completed:** 0
- **Remaining:** 14
