# PRD — WTM-Youtube Vertical
**Version:** 1.1.0  
**Date:** 2025-09-13

## 1) Overview
- **Goal**
  - Add a new vertical "WTM-Youtube" with analytics for influencers and themes (campaigns).
  - Add card-level summary metrics for "WTM-Youtube" on the home screen.
  - Rename "/" to "/home" as the canonical route.
- **Access**
  - Only `admin` and `dept-head` may access the vertical and see the card on home.
- **Data Sources**
  - Firestore `youtube` collection:
    - Influencers: `form_type: 'influencer-data'` (YoutubeInfluencerDoc)
    - Themes: `form_type: 'theme-data'` (YoutubeCampaignDoc, includes `influencerEntries`)
  - YouTube Data API for live view/like stats only (no persistence)
- **Caching**
  - Per-session in-memory cache (ephemeral). "Refresh" button clears the cache and re-fetches.

## 2) Scope and Non-Goals
- **In scope**
  - New "WTM-Youtube" card on `/home`, updated label with correct lead name
  - Card-level summary metrics: show 2–3 metrics (Total Campaigns, Total Influencers, Total Videos)
  - Full vertical views (Overview, Themes, Influencers)
- **Out of scope**
  - Comments metric
  - Export/CSV
  - Persisting YouTube API results in Firestore
  - Editing/extending themes

## 3) Home Route and Card Enhancements
- **Canonical Home Route**
  - Create `app/home/page.tsx` as the canonical "Home" page.
  - Redirect `"/"` → `"/home"` using `middleware.ts` or a lightweight route redirect component to maintain backward compatibility.
  - Update any internal links that reference "/" to "/home".
- **"WTM-Youtube" Card on Home**
  - Reuse "WTM-SHAKTI-CLUB-2" card layout.
  - Change label to "WTM-Youtube".
  - Change lead name from "Karan Chaurasaia" to "Karan Chourasia".
  - Show 2–3 summary metrics relevant to this vertical:
    - Total Campaigns (count of `theme-data` docs)
    - Total Influencers (count of `influencer-data` docs)
    - Total Videos (sum of `influencerEntries.length` across all themes)
  - Role gating: show card and metrics only to `admin` and `dept-head`.
  - Loading skeleton/fallback "—" while metrics are fetched.
  - On click: route to `/wtm-youtube`.

## 4) Data Models (Firestore)
### YoutubeInfluencerDoc (influencer-data)
- `id: string`
- `createdAt: number`
- `handler_id: string`
- `form_type: 'influencer-data'`
- `name: string`
- `phoneNumber: string`
- `subscribers: number`
- `channelName: string`
- `channelLink: string`
- `status: 'Active' | 'Inactive'`
- `workingStatus: 'Working' | 'Busy' | 'Not Working For Us'`
- `remark?: string`
- `assembly?: string`

### YoutubeCampaignDoc (theme-data)
- `id: string`
- `createdAt: number`
- `handler_id: string`
- `form_type: 'theme-data'`
- `weeklyTheme: string`
- `from: number`
- `to: number`
- `influencerEntries: YoutubeCampaignInfluencerEntry[]`
  - `influencerId: string`
  - `id: string`
  - `videoType: 'Package' | 'Public Opinion One' | 'Public Opinion Two' | 'Reel/Short'`
  - `videoLink: string`
  - `metrics?: { views?: number; likes?: number }`
- `influencerIds: string[]`

## 5) UI/UX and Navigation
- **Home (`/home`)**
  - YouTube card as described above with 2–3 aggregated metrics.
- **WTM-Youtube (`/wtm-youtube`)**
  - Header: title, role gate, Refresh button
  - Filters: DateRangeFilter (controlled), date mode ("Entries by Day" using createdAt vs "Campaign Window" using from/to), videoType, influencer status/workingStatus, assembly, search
  - Tabs: Overview, Themes, Influencers
- **Overview**
  - KPI cards: Total Themes, Active Themes, Total Videos, Total Influencers, Sum Views, Sum Likes, Avg Views/Video, Active Influencers
  - Charts: Video Type Distribution (pie), Top Influencers by Views (bar), Themes by Videos (bar), Views Trend (line, createdAt)
  - Top lists: Top 5 Influencers, Top 5 Themes
- **Themes**
  - Active vs Past sub-tabs; Table columns: Theme, Period, Influencers assigned, Videos posted, Totals (Views/Likes), Last Updated
  - Theme detail: KPIs (totals/averages/fill-rate), per-influencer contribution chart, video-type breakdown, influencer roster and video list with warnings for invalid links
- **Influencers**
  - Directory: search + filters (status, workingStatus, assembly), columns (Name, Channel, Subscribers, Status, Working Status, Totals, Last Active)
  - Profile: KPIs (Totals + Avg Views/Video), performance over time, video-type mix, per-theme breakdown, video gallery
- **Styles**
  - Reuse Tailwind theme and card styles consistent with `wtm-slp-new`
  - Subtle transitions/animations for tab/content switches

## 6) Filtering Semantics
- **Date Mode**
  - "Entries by Day": filter by `createdAt` (entry submission date)
  - "Campaign Window": include themes overlapping selected range (`theme.from <= end && theme.to >= start`)
- **Assembly display**
  - Influencer assembly shown; display "—" when missing

## 7) Technical Specs & Reuse
### New files
- `app/home/page.tsx` (canonical home page)
- `app/wtm-youtube/page.tsx`
- `components/youtube/Overview.tsx`
- `components/youtube/ThemesList.tsx`
- `components/youtube/ThemeDetail.tsx`
- `components/youtube/InfluencersList.tsx`
- `components/youtube/InfluencerProfile.tsx`
- `components/youtube/KpiCard.tsx`
- `components/youtube/VideoList.tsx`
- `app/utils/fetchYoutubeData.ts`
- `app/utils/youtubeApi.ts`
- `models/youtubeTypes.ts`

### Reuse
- `components/DateRangeFilter.tsx`
- Recharts (present in project) for charts

### Home Card Metrics — Logic and Component Reuse
- **Logic:**
  - Fetch total counts in parallel:
    - totalThemes = count documents where `form_type == 'theme-data'`
    - totalInfluencers = count documents where `form_type == 'influencer-data'`
    - totalVideos = sum of all `influencerEntries.length` over fetched themes
  - Use in-memory cache keyed by "youtubeSummary" for this page load. Refresh button clears cache.
  - Prefer count(*) aggregation API if enabled; otherwise fall back to getDocs
- **Component:**
  - Reuse existing card shell from home page card pattern
  - Add a small "mini-metrics" row (e.g., 2–3 `KpiPill`-style spans) inside the card
  - If we want to avoid cross-coupling, introduce `components/youtube/KpiCard.tsx` with compact variant for card usage

### Function Signatures (proposed)
#### `app/utils/fetchYoutubeData.ts`
- `export async function fetchYoutubeSummary(): Promise<{ totalThemes: number; totalInfluencers: number; totalVideos: number }>`
- `export async function fetchInfluencers(opts?: { status?: YoutubeInfluencerStatus[]; working?: YoutubeInfluencerWorkingStatus[]; assembly?: string[]; search?: string; limit?: number; }): Promise<YoutubeInfluencerDoc[]>`
- `export async function fetchThemes(opts?: { rangeMode: 'entries' | 'campaign'; startDate?: number; endDate?: number; activeOnly?: boolean; pastOnly?: boolean; search?: string; }): Promise<YoutubeCampaignDoc[]>`
- `export function splitThemesByStatus(themes: YoutubeCampaignDoc[], todayMs: number): { active: YoutubeCampaignDoc[]; past: YoutubeCampaignDoc[] }`
- `export function aggregateTheme(theme: YoutubeCampaignDoc, stats: Map<string, { views: number; likes: number }>): { totals: {...}; perInfluencer: Array<{ influencerId: string; videos: number; views: number; likes: number }>; byType: Record<YoutubeVideoType, { videos: number; views: number; likes: number }> }`
- `export function aggregateInfluencer(influencerId: string, themes: YoutubeCampaignDoc[], stats: Map<string, { views: number; likes: number }>): { videos: number; views: number; likes: number; perTheme: Array<{ themeId: string; videos: number; views: number; likes: number }> }`

#### `app/utils/youtubeApi.ts`
- `export function extractVideoId(link: string): string | null`
- `export async function fetchVideoStats(videoIds: string[], apiKey: string, opts?: { concurrency?: number }): Promise<Map<string, { views: number; likes: number }>>`

## 8) Error Handling & Edge Cases
- Invalid/private/deleted video links → warning badges + exclude from totals (or zeroes), tooltip explanation
- API quota errors → fallback to stored `influencerEntries.metrics` if present, else show "API unavailable" warning
- Missing influencer assembly → display "—"
- Large data → batch YouTube API calls (up to 50 IDs/request), throttle concurrency

## 9) Performance
- Ephemeral cache for home card summary and per-page stats
- Parallel Firestore reads; prefer server-side filtering where possible
- Chart rendering optimized and virtualized tables if needed

## 10) Risks & Mitigations
- Redirect conflicts for `/` → `/home` → test middleware precedence and Next routing
- Firestore counting with large datasets → consider count aggregation
- Role-gated visibility → back up with server-side gating where possible

## 11) Integration Checklist
- Add `/home` and redirect from `/`
- Add "WTM-Youtube" card with correct lead name and summary metrics
- Role gate card and vertical
- Implement Refresh button to clear caches
- Use Recharts, reuse DateRangeFilter
- Document YouTube API env `YOUTUBE_API_KEY`
- Update CodeMap after implementation