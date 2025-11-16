# Dashboard Verticals

## WTM-SLP Dashboard (Samvidhan Leaders Program)
Core dashboard for tracking Samvidhan Leaders Program activities and metrics across the hierarchical structure.

**Key Features:**
- Hierarchical navigation (Zone → Assembly → AC → SLP)
- Summary metrics for meetings, volunteers, SLPs, activities
- Detailed views for each metric with data tables
- Date filtering with presets and custom ranges

**Main Components:**
- `app/wtm-slp-new/page.tsx` - Main page with hierarchical navigation
- `components/hierarchical/HierarchicalNavigation.tsx` - Dropdown selectors
- `components/hierarchical/MetricCard.tsx` - Summary metric cards
- `components/hierarchical/DetailedView.tsx` - Modal with detailed data

**Data Flow:**
- `fetchCumulativeMetrics()` - Main entry point for all metrics
- Uses multiple specialized functions for different activity types
- Supports filtering by level, date range, handler_id, and assemblies

## Shakti Abhiyaan Dashboard
Dashboard for the Shakti Abhiyaan vertical, sharing structure with WTM-SLP but with specific Shakti metrics.

**Key Features:**
- Similar hierarchical structure to WTM-SLP
- Shakti-specific metrics (Shakti Leaders, Baithaks, Saathi, etc.)
- Integrated into the same hierarchical navigation interface

**Main Components:**
- Uses same components as WTM-SLP with different data sources
- Parent vertical selector in `app/wtm-slp-new/page.tsx`

**Data Source Differences:**
- Shakti Leaders come from `shakti-abhiyaan` collection's `coveredAssemblyCoordinators[].slps[]` array
- Shakti activities have `parentVertical: 'shakti-abhiyaan'` in `slp-activity` collection
- Handler ID pattern for Shakti SLPs uses SLP's 'id' property (not docID)

## WhatsApp Data Vertical (NEW)

**Location & Files:**
- UI:
  - `app/verticals/whatsapp-data/page.tsx` → Vertical landing page with three tabs (Shakti, WTM, Public) and assembly-grouped lists
  - Components:
    - `components/whatsapp/WhatsappTabs.tsx` → Tab switcher (counts + loading states)
    - `components/whatsapp/WhatsappGroupsList.tsx` → Assembly → Groups expandable lists with search
- Models:
  - `models/whatsappTypes.ts` → `WhatsappGroup`, `WhatsappAssemblyGroup`, `WhatsappSummary`, `WhatsappPageData`, `WhatsappFormType`, `WhatsappTabCounts`
- Utilities:
  - `app/utils/fetchWhatsappData.ts` → Fetchers and in-memory grouping/summary
    - `fetchWhatsappGroupsByType(formType)` → `where('form_type','==', formType)`
    - `groupWhatsappDataByAssembly(groups)` → Assembly grouping + totals (client-side)
    - `computeWhatsappSummary(shakti, wtm, public)` → Totals and assemblies set
    - `fetchAllWhatsappData()` → Parallel fetch per form_type, returns `WhatsappPageData`
    - `fetchWhatsappTabCounts()` → Light count fetch per form_type
    - `fetchWhatsappHomeSummary()` → Home-card summary: `{ totalGroups, totalAssemblies }`

**Firestore Data Model:**
- Collection: `whatsapp_data`
- Fields (exactly as stored; no transformations):
  - `Assembly: string`
  - `Group Name: string`
  - `Group Link: string`
  - `Group Members: string` (parsed with `parseInt`, decimals ignored, empty = 0)
  - `Admin: string`
  - `form_type: 'shakti' | 'wtm' | 'public'`

**Query Pattern & Indexing:**
- Uses single-field filter `where('form_type','==', value)`
- No `orderBy` and no multi-field filters → avoids composite index requirements
- All grouping/sorting is done in memory on the client

**UI Behavior:**
- Three tabs with counts: Shakti, WTM, Public
- Each tab shows assemblies alphabetically with expandable group lists
- Search filters by assembly name and group name
- Group cards show: Group Name, Members, Admin, and a "Join Group" link button
- Loading skeletons while fetching; empty state when no results

**Home Page Integration:**
- `app/home/page.tsx` → Adds a "WhatsApp Data" card alongside general verticals (not under "Connecting Dashboard Data")
  - Shows Total Groups and Assemblies via `fetchWhatsappHomeSummary()`
  - Navigates to `/verticals/whatsapp-data` with a loading overlay pattern consistent with other cards

## Migrant Vertical (NEW)

**Location & Files:**
- UI:
  - `app/migrant/page.tsx` → Admin-only dashboard for external Migrant Survey API with filters, charts, and exports (PDF/Excel). Supports city switcher (Delhi vs Other Districts).
- Types:
  - `models/migrantTypes.ts` → `City`, `MigrantFilters`, `MigrantStatistics`, `MigrantSurveyItem`, `MigrantPagedResult`
- Utilities:
  - `app/utils/fetchMigrantData.ts` → External API login and paged reports fetcher
    - `loginMigrantApi(username?, password?)` → Stores token in localStorage under namespaced keys
    - `fetchMigrantReportsPaged(city, filters, token?, limit?, maxPages?)` → Paginates `/migrantSurvey[/Jaipur]/reports` until `statistics.totalSurveys`
    - `fetchMigrantSummary(forceRefresh?)` → Cached home-card summary (Delhi + Jaipur totals) using `homePageCache`
- Data:
  - `data/migrantGeo.ts` → `delhiDistricts`, `migrantJaipurSurveyDistricts` (kept separate from BR data)

**External API Endpoints:**
- Auth Login: `POST https://api.shaktiabhiyan.in/api/v1/auth/login`
- Reports (Delhi): `GET https://api.shaktiabhiyan.in/api/v1/migrantSurvey/reports`
- Reports (Other Districts): `GET https://api.shaktiabhiyan.in/api/v1/migrantSurveyJaipur/reports`

**LocalStorage Keys (namespaced):**
- `migrant:token`
- `migrant:user`

**Caching:**
- Home card summary cached via `homePageCache` with `CACHE_KEYS.MIGRANT_SUMMARY` (TTL 15 min)

**Home Page Integration:**
- `app/home/page.tsx` adds an Admin-only "Migrant" card linking to `/migrant`
- Card shows total surveys (Delhi + Other Districts) using auto-login summary
- Grouped under "Connecting Dashboard Data" section with Manifesto card (admin-only section)
- NOTE (Nov 2025): Home-card uses a hard override to display fixed totals until API is stabilized. See `HOME_CARD_OVERRIDES` in `app/home/page.tsx` (Migrant = 3276). Vertical page `/migrant` still uses live API.

**Access Control:**
- Admin-only guard in `app/migrant/page.tsx` using Firebase `getCurrentAdminUser()` (non-admin redirected to `/wtm-slp-new`)

**Notes:**
- City-specific filters: `delhiDistrict` for Delhi, `jaipurDistrict` for Other Districts; mutual exclusion enforced by query builder
- Date handling is timezone-safe (local YYYY-MM-DD strings)
- Auto-login implemented both on page and home summary

## Call Center Vertical (NEW)

**Location & Files:**
- UI:
  - `app/home/page.tsx` → Adds a navigational parent card "Call Center" (no data fetch on Home). Clicking routes to the vertical.
  - `app/verticals/call-center/page.tsx` → Vertical landing. Shows the legacy dataset card: "Call Center Old" with computed metrics and optional PDF link.
- NEW UI (External dataset):
  - `app/verticals/call-center/external-new/page.tsx` → Lists converted users grouped by day with pagination, search, and CSV export.
  - `components/call-center/ExternalNewConvertedList.tsx` → Presentational grouped list used by the page above.
- Types:
  - `models/callCenterTypes.ts` → `CallCenterSummary`, `CallCenterDocument`, `CallCenterOldMetrics` types.
  - `models/callCenterNewTypes.ts` → `CallCenterNewSummary`, `CallCenterNewDocument`, `CallCenterNewMetrics`, `CallCenterNewConvertedRow`.
- Utilities:
  - `app/utils/fetchCallCenterData.ts` →
    - `fetchLatestCallCenterDocument()` → Reads the latest document from `call-center` collection by `date` desc; falls back to `created_at` desc.
    - `computeCallCenterOldMetricsFromSummary(summary, date?, reportUrl?)` → Derives three Home metrics from exact/raw `status_counts` without normalizing keys.
    - `fetchCallCenterDocByDate(date)` → Fetch one document by ID or `where('date','==',date)` fallback.
    - `fetchCallCenterDatesList({ pageSize, cursor })` → Paged list of `{ id, date, report_url }` ordered by `date desc` with fallback to `created_at desc`.
    - `fetchCallCenterCumulativeMetrics({ pageSize, maxPages, onProgress })` → Paged aggregation of conversions, notContacted, totalCalls across all docs.
  - `app/utils/fetchCallCenterNewData.ts` → (External dataset: `call-center-external`)
    - `computeCallCenterNewMetricsFromSummary(summary, date?)` → Conversions (from `convertedCount` or `convertedList.length`), Not contacted (`notConvertedCount`), Total calls (prefer `totals.total_rows`).
    - `fetchCallCenterNewDocByDate(date)` → Fetch doc by ID or `where('date','==',date)` fallback.
    - `fetchCallCenterNewDatesList({ pageSize, cursor })` → Paged list of available dates ordered by `date desc` (fallback `created_at desc`).
    - `fetchCallCenterNewCumulativeMetrics({ pageSize, maxPages, onProgress })` → Paged aggregation across all external docs.
    - `fetchCallCenterNewConvertedPaged({ pageSize, cursor })` → Paged, per-day groups of converted rows (loads a page of dates and fetches each day's converted list).

**Firestore Data Model (call-center):**
- Collection: `call-center`
- Document ID: `{YYYY-MM-DD}`
- Fields:
  - `date: string` — selected date for the upload
  - `summary: object` — aggregated counts with exact/raw keys
    - `totals.total_rows: number`
    - `status_counts: Record<string, number>` (no normalization of keys)
    - `gender_counts: Record<string, number>`
    - `non_contact_reason_counts: Record<string, number>` (only for Status = Not contacted; includes `(blank)`)
    - `questions: { Q1..Q6: Record<string, number> }`
    - `assigned_to_counts: Record<string, number>`
    - `assigned_to_list: string[]`
  - `report_url: string` — public PDF URL (stored at `call-center/{date}/report.pdf`)
  - `created_at`, `updated_at`: Firestore timestamps

**Firestore Data Model (call-center-external):**
- Collection: `call-center-external`
- Document ID: `{YYYY-MM-DD}`
- Fields:
  - `date: string` — selected date for the upload
  - `summary: object` — external summary
    - `totals.total_rows: number`
    - `convertedCount?: number`
    - `notConvertedCount?: number`
    - `convertedList?: Array<{ name?: string; phone?: string; acName?: string }>`
  - `report_url?: string` — optional downloadable artifact
  - `created_at`, `updated_at`: Firestore timestamps

**Call Center New Card (External dataset):**
- Appears on the Call Center vertical landing at the same level as "Call Center Old" labeled exactly "Call Center New".
- Shares the same `DateSelector` state: shows cumulative metrics by default; in "Single date" mode shows that date's external metrics.
- Clicking the card navigates to `/verticals/call-center/external-new`, which displays a paginated, per-day grouped list of converted users with search and CSV export.
- Metric display order (both cards):
  1) Total Calls
  2) Total Conversions
  3) Total Not Contacted

## Training Data Vertical (NEW)

**Location & Files:**
- UI:
  - `app/verticals/training-data/page.tsx` → Training data dashboard with WTM and Shakti tabs showing Zone → Assembly grouped view
  - `components/training/TrainingTabs.tsx` → Tab switcher for WTM vs Shakti data with counts
  - `components/training/TrainingZoneGroupList.tsx` → Collapsible zone groups with assembly cards
  - `components/training/TrainingAssemblyCard.tsx` → Assembly training sessions with date, SLP, coordinator, attendees
  - `components/training/TrainingSkeleton.tsx` → Loading skeletons for zones and assemblies
- Scripts:
  - `scripts/wtm-training-upload-web.js` → Extracts WTM training data from `WTM_club.xlsx` to `scripts/wtm-training-data.json`
    - Validation relaxed: rows with missing coordinator/SLP/date are kept with defaults ("Unknown" or empty date)
    - Logs inconsistencies but does not drop completed rows
  - `scripts/shakti-training-upload.js` → Extracts Shakti training data from `Shakti_club.xlsx` to `scripts/shakti-training-data.json`
    - Validation relaxed similarly; keeps completed rows with defaults
  - `scripts/upload-to-firebase.js` / `scripts/upload-shakti-to-firebase.js` → Upload extracted JSON via API with base URL fallback
  - `scripts/upload-training-filtered.js` → Helper to incrementally upload only valid-completed rows with date normalization and correct `form_type`; chunks requests and relies on idempotent IDs (no purge needed)
    - `fetchTrainingRecords(formType)` → Query training collection by form_type ('wtm' or 'shakti-data')
    - `groupTrainingByZonal(records)` → Group by Zone → Assembly with sorting and totals
    - `computeTotalAttendees(record)` → Sum attendees + attendeesOtherThanClub
    - `parseTrainingDate(dateStr)` → Multi-format date parsing (YYYY-MM-DD, DD/MM/YYYY, etc.)
    - `formatTrainingDate(dateStr)` → Display-friendly date formatting
- Types:
  - `models/trainingTypes.ts` → `TrainingRecord`, `TrainingAssemblyItem`, `TrainingZoneGroup`, `TrainingFormType`, etc.
- Utilities:
  - `app/utils/fetchTrainingData.ts` → Firestore queries, grouping logic, date parsing, edge case handling

- API:
  - `app/api/training/upload/route.ts` → Accepts `trainingData` array. Now validates `form_type` from input (`'wtm' | 'shakti-data'`), enforces completed-only guard, and writes documents with a deterministic ID
    `formtype__zonal__assembly__date__slp` using `batch.set(..., { merge: true })` to make uploads idempotent and prevent duplicates on re-upload. When `dateOfTraining` or `slpName` is unknown, appends `__row-N` to the doc ID and stores `rowNumber` in the doc to avoid collisions.

**Firestore Data Model:**
- Collection: `training`
- Document fields: `zonal`, `assembly`, `assemblyCoordinator`, `trainingStatus`, `dateOfTraining`, `slpName`, `attendees`, `attendeesOtherThanClub`, `form_type` ('wtm' | 'shakti-data'), timestamps
- Query pattern: `where('form_type', '==', formType)` for tab separation

**UI Features:**
- Two tabs: "WTM" (80 records) and "Shakti" (107 records)
- Hierarchical view: Zones → Assemblies → Training sessions
- Collapsible zone sections with totals (sessions, attendees, assembly count)
- Assembly cards show latest training date, SLP names, coordinators, total attendees
- Multiple sessions per assembly displayed as expandable timeline
- Edge case handling: missing dates/SLP/coordinator → fallback to "Unknown" values
- Client-side sorting: zones/assemblies alphabetically, sessions by date desc

**Home Page Integration:**
- `app/home/page.tsx` → Added "Training Data" card in "Connecting Dashboard Data" section (admin-only)
- Links to `/verticals/training-data`

**Performance Notes:**
- Client-side grouping and sorting (current dataset: 187 records total)
- Future optimization: composite Firestore index for server-side ordering if needed

## Manifesto Vertical (NEW)

**Location & Files:**
- UI:
  - `app/manifesto/page.tsx` → Admin-only dashboard for external Manifesto Survey API with filters, charts, and exports (PDF/Excel)
- Types:
  - `models/manifestoTypes.ts` → `ManifestoFilters`, `ManifestoStatistics`, `ManifestoSurveyItem`, `ManifestoPagedResult`
- Utilities:
  - `app/utils/fetchManifestoData.ts` → External API login and paged reports fetcher
    - `loginManifestoApi(username?, password?)` → Stores token in localStorage under namespaced keys
    - `fetchManifestoReportsPaged(filters, token?, limit?, maxPages?)` → Paginates `/manifestoSurvey/reports` until `statistics.totalSurveys`
    - `fetchManifestoSummary(forceRefresh?)` → Cached home-card summary using `homePageCache`
- Data:
  - `data/statesData.ts` → BR-only `indianDistricts`, `AssemblySeatsDistrictWise`, and `availableCommunity`

**External API Endpoints:**
- Auth Login: `POST https://api.shaktiabhiyan.in/api/v1/auth/login`
- Reports: `GET https://api.shaktiabhiyan.in/api/v1/manifestoSurvey/reports`

**LocalStorage Keys (namespaced):**
- `manifesto:token`
- `manifesto:user`

**Caching:**
- Home card summary cached via `homePageCache` with `CACHE_KEYS.MANIFESTO_SUMMARY` (TTL 15 min)

**Home Page Integration:**
- `app/home/page.tsx` adds an Admin-only "Manifesto" card linking to `/manifesto`
- Card shows Total Surveys using auto-login summary (util logs in if token missing)
- Grouped under "Connecting Dashboard Data" section with Migrant card (admin-only section)
- NOTE (Nov 2025): Home-card uses a hard override to display a fixed total until API is stabilized. See `HOME_CARD_OVERRIDES` in `app/home/page.tsx` (Manifesto = 415). Vertical page `/manifesto` still uses live API.

**Access Control:**
- Admin-only guard in `app/manifesto/page.tsx` using Firebase `getCurrentAdminUser()` (non-admin redirected to `/wtm-slp-new`)

**Notes:**
- Filters, charts and export columns mirror `ManifestoReportDashboard.js`
- Date handling is timezone-safe (local YYYY-MM-DD strings)
- Credentials for API login stored in `app/utils/fetchManifestoData.ts` per project directive

## Ghar-Ghar Yatra (GGY) Home Card (NEW)

**Location & Files:**
- Home Card UI:
  - `app/home/page.tsx` → Admin-only "Ghar-Ghar Yatra Data" card displays aggregated, all-time metrics
- Types:
  - `models/ggyReportTypes.ts` → `GgyHomeSummary` (home card totals shape)
- Utilities:
  - `app/utils/fetchGharGharYatraData.ts`
    - `fetchGgyOverallSummary(forceRefresh?)` → Aggregates across all `ghar_ghar_yatra` docs by summing `summary` fields
      - `total_punches`
      - `total_unique_entries` (fallback: `total_unique_punches`)
      - `matched_count`
    - `total_param2_values`
      - Computes `matchRate = matched_count / total_param2_values * 100`

**Caching:**
- Home card summary cached via `homePageCache` with `CACHE_KEYS.GGY_OVERALL_SUMMARY` (TTL 15 min)

**Home Page Integration:**
- `app/home/page.tsx` shows three metrics:
  - Total Punches (sum of summaries)
  - Total Unique Entries (sum of summaries with safe fallbacks)
  - Total Matched (percentage = matched_count / total_param2_values)
- Data fetched in parallel with other home summaries using `Promise.all`
- Force Refresh clears `GGY_OVERALL_SUMMARY` cache and refetches totals

**Notes:**
- Aggregation is resilient to legacy field names (`total_unique_punches`)
- Uses local timezone-safe display with `toLocaleString()` formatting in UI

## SLP Training Vertical (NEW)

**Location & Files:**
- API:
  - `app/api/slp-training/route.ts` → Handles CSV upload and Firestore batch writes
  - `scripts/upload-slp-training.js` → Standalone script to upload CSV data (uses Firebase Admin SDK)
  - `scripts/extract-slp-training.py` → Python script to extract SLP data from Excel files
- Models:
  - `models/slpTrainingTypes.ts` → `SlpTrainingRecord`, `SlpTrainingAssemblyGroup`, `SlpTrainingSummary`, `SlpTrainingPageData`
- Utilities:
  - `app/utils/fetchSlpTrainingData.ts` → Fetch all records, group by assembly, summary calculators. Avoids composite indexes (no multi-field orderBy; sorts in memory).
  - `app/utils/mapSlpTrainingAggregator.ts` → Assembly-level aggregation with fuzzy matching for map integration. Uses in-memory cache and Jaro-Winkler similarity scoring.
- UI:
  - `app/slp-training/page.tsx` → Admin-only page listing trained SLPs grouped by Assembly with search and expand/collapse. Uses an `isAdmin` guard (calls `getCurrentAdminUser(user.uid)`), summary cards, and responsive grid.
  - `app/home/page.tsx` → Adds "SLP Training" card (emerald theme) alongside the general verticals grid (admin-only); displays total SLPs, assemblies, trained count via `fetchSlpTrainingSummary()`.
  - `app/map/page.tsx` → Integrated as a tab in assembly detail panel; shows Total SLPs, Trained, Pending, In Progress counts with fuzzy match confidence indicator.

**Firestore Data Model:**
- Collection: `slp_training`
- Deterministic Document ID: `assembly__name__mobile` (normalized, lowercased, URL-safe)
- Fields:
  - `name: string`
  - `mobile_number: string` (".0" trimmed)
  - `assembly: string`
  - `status: 'trained' | 'in-progress' | 'pending'` (default: 'trained' for uploaded data)
  - `trainingDate: string` (YYYY-MM-DD) – defaults to current date on upload
  - `createdAt`, `updatedAt`: ISO strings

**Query Pattern & Indexing:**
- `fetchAllSlpTrainingRecords()` fetches the whole collection then sorts in memory by `assembly` then `name` to avoid composite index prompts.
- `fetchSlpTrainingByAssembly(assembly)` uses `where('assembly','==', assembly)` and sorts by `name` in memory.
- Rationale: Current dataset (~621 docs) is small; removing multi-field `orderBy` prevents composite index requirements while keeping UI fast and simple.

**Map Integration:**
- Uses `getSlpTrainingMetricsForAssembly(assemblyName)` for fuzzy assembly matching (same pattern as Training/GGY verticals)
- Returns: `{ totalSlps, trainedCount, pendingCount, inProgressCount, match: { matchAssembly, confidence, score } }`
- Confidence thresholds: high ≥0.93, medium ≥0.88, low ≥0.82, else unmatched
- Included in hover tooltip via `mapHoverCombinedAggregator.ts` (shows total SLPs count)
- Display in assembly detail panel with emerald color theme matching home card

**Access Control:**
- SLP Training page is admin-only. Guard calls `getCurrentAdminUser(user.uid)`; non-admins redirect to `/wtm-slp-new`.

## YouTube Dashboard (Influencer Management)

The YouTube Dashboard provides management and analytics for social media influencers across multiple platforms.

**Key Features:**
- Theme categorization and management
- Influencer profile tracking
- Video and content metrics
- Performance analytics

**Main Components:**
- `app/wtm-youtube/page.tsx` - Main YouTube dashboard page
- `components/youtube/ThemeCard.tsx` - Theme summary cards
- `components/youtube/ThemeDetails.tsx` - Theme detailed view
- `components/youtube/InfluencerCard.tsx` - Influencer summary cards

**Data Flow:**
- `fetchYoutubeSummary()` - Home page summary metrics
- `fetchThemes()` - Get all themes with counts
- `fetchThemeDetails()` - Get detailed theme data with influencers
- `fetchVideoStatsFromLinks()` - Get video stats from API or fallback to stored metrics

**Video Stats Resolution & Fallback:**
- Source of per-video metrics:
  - API-fetched stats keyed by original `videoLink` via `app/utils/videoApi.ts::fetchVideoStatsFromLinks()`.
  - Fallback to stored `theme.influencerEntries[].metrics` when no API stats are present for a link.
- Precedence (per link):
  1) Use API stats from `videoStats.get(videoLink)` when available.
  2) Else use `entry.metrics` stored in the theme document.
  3) Else default to `{ views: 0, likes: 0 }`.

**Cache Implementation:**
- `fetchYoutubeSummary()` enhanced with persistent caching
- Uses localStorage with 15-minute TTL
- Supports force refresh parameter

**Home Page Integration:**
- Admin-only "YouTube" card linking to `/wtm-youtube`
- Shows total themes, influencers, and videos
- Fetched via `fetchYoutubeSummary()` with caching
