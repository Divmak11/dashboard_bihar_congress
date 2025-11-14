# Bihar Congress Dashboard - Code Map

## Quick Navigation
- 🔥 [Firebase Patterns](Firebase-patterns.md) - **START HERE for Firebase connections**
- 🏗️ [Data Schemas](Data-schemas.md) - Database structure and query patterns
- 🧩 [Architecture](Architecture.md) - Components, navigation, and state management
- 📊 [Verticals](Verticals.md) - Dashboard verticals and features

## Directory Structure

```
my-dashboard/
├── app/                          # Next.js App Router pages
│   ├── auth/                     # Authentication page
│   ├── dashboard/                # Main dashboard
│   ├── wtm-slp/                  # Legacy WTM-SLP dashboard
│   ├── wtm-slp-new/              # New hierarchical dashboard
│   ├── wtm-youtube/              # YouTube dashboard
│   ├── map/                      # Map visualization
│   ├── report/                   # Report generation components
│   │   ├── ReportButton.tsx      # Report trigger button
│   │   └── ReportProgress.tsx    # Progress modal component
│   ├── hooks/                    # Custom React hooks
│   │   └── useReportGeneration.ts # Report generation hook
│   ├── services/                 # Service layer
│   │   └── reportProgressService.ts # Report progress state management
│   ├── config/                   # Configuration files
│   │   └── pdfConfig.ts          # PDF styling with enhanced table styles
│   └── utils/                    # Core utility functions
│       ├── fetchFirebaseData.ts  # Firebase data fetching with caching
│       ├── fetchHierarchicalData.ts # Hierarchical data logic
│       ├── fetchYoutubeData.ts   # YouTube data fetching with caching
│       ├── cacheUtils.ts         # Data caching utility with localStorage
│       ├── firebase.ts           # Firebase config
│       ├── errorUtils.ts         # Error handling
│       ├── reportDataAggregation.ts # Zone-wise report aggregation
│       ├── reportAttendanceLogic.ts # Attendance & assembly work logic
│       └── pdfGenerator.tsx      # PDF with UI refinements
├── components/                   # Reusable components
│   ├── hierarchical/             # Hierarchical dashboard components
│   │   ├── DetailedView.tsx     # Detailed data view
│   │   ├── MetricCard.tsx       # Metric display cards
│   │   ├── HierarchicalNavigation.tsx # Navigation dropdowns
│   │   ├── ActivitiesList.tsx   # Activities table
│   │   └── [other lists]        # Other activity tables
│   ├── ReportGenerator.tsx       # Main report generation component
│   ├── DashboardHome.tsx         # Dashboard home component
│   ├── DateRangeFilter.tsx      # Date filtering component
│   └── NavBar.tsx                # Navigation bar
├── scripts/                      # Utility Node.js scripts
│   ├── ac-assembly-slp-report.js     # AC→Assembly→SLP coverage report
│   ├── sync-slp-activity-status.js   # Sync SLP activityStatus
│   ├── non-matching-slps-report.js   # SLPs not found in Firestore
│   ├── youtube-deduplicate-influencers.js # Deduplicate influencer data
│   └── upload-whatsapp-groups.js      # Upload groups to Firestore
├── models/                       # TypeScript type definitions
│   ├── types.ts                  # Core data types
│   ├── hierarchicalTypes.ts     # Hierarchy-specific types
│   └── reportTypes.ts            # Report types (Zone-wise structure)
├── public/                       # Static assets
└── .windsurf/                    # Project documentation
    ├── PRD.md                    # Product requirements
    ├── Plan.md                   # Implementation plan
    └── Tasks.md                  # Task tracking
```

## Core Technical Concepts

### Tech Stack
- Framework: Next.js 14+ (App Router)
- Language: TypeScript
- Database: Firebase Firestore
- Auth: Firebase Auth
- Styling: Tailwind CSS
- State: React Hooks (useState, useEffect)
- Maps: Leaflet (for assembly constituency visualization)

### Environment Variables
- Not required for scripts (configs are hardcoded in firebase.ts and scripts)
- Admin SDK uses default service account authentication
- Client SDK uses public config (safe to commit)

### Core Functions Quick Reference

| Function | Purpose | Location | Key Parameters |
|----------|---------|----------|----------------|
| `fetchCumulativeMetrics` | Main metrics entry point | fetchHierarchicalData.ts | level, assemblies, handler_id, dateRange, vertical |
| `getWtmSlpSummary` | SLP metrics | fetchFirebaseData.ts | startDate, endDate, assemblies, handler_id |
| `fetchDetailedMeetings` | Meeting details | fetchFirebaseData.ts | startDate, endDate, assemblies, handler_id |
| `generateAndDownloadPDF` | Report generation | pdfGenerator.tsx | reportData, onProgress |
| `fetchAllWhatsappData` | WhatsApp groups | fetchWhatsappData.ts | - |
| `resolveUserNamesByIds` | AC name resolution | fetchHierarchicalData.ts | handlerIds |

## Known Issues & Workarounds

### Handler ID Patterns
- **Regular SLPs**: Use document ID (`selectedSlpId`) as handler_id
- **Shakti SLPs**: Use `shaktiId` property as handler_id
- **ASLPs**: Check both document ID and handler_id property

### Assembly Chunking
- Firestore `in` operator limited to max 10 values
- Use chunking pattern from `getHierarchicalMemberActivity` for >10 assemblies
- Split into chunks of 10, run parallel queries, combine results

### Date Filtering
- Use timestamp-based filtering with day boundaries for precision
- Format local dates with `formatLocalDate` to avoid timezone issues
- Always include fallbacks for "All Time" selection (e.g., `'2000-01-01'`)

## Future Development Guidelines

When adding new features:

1. **Firebase Operations**: Use patterns from [Firebase Patterns](Firebase-patterns.md)
2. **Database Schema**: Follow conventions in [Data Schemas](Data-schemas.md)
3. **Component Structure**: Reference [Architecture](Architecture.md)
4. **Dashboard Verticals**: See [Verticals](Verticals.md) for integration patterns

## Code Map Maintenance

This modular documentation structure helps maintain a clean, navigable reference:

1. **Master Index**: This file (CodeMap.md) provides high-level overview and links
2. **Domain Modules**: Separate files for specific technical domains
3. **Update Process**: When adding features, update the relevant module file
4. **Quick Reference**: Tables in this file for common functions and patterns

---

> **Note**: This documentation uses a modular approach with separate files for detailed sections. See the Quick Navigation links at the top for complete details on each area.
