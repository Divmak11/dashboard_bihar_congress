# Bihar Congress Dashboard - CodeMap Index

## Important Note

This document now serves as an index to the modular documentation structure. Detailed information has been moved to separate, topic-specific files for better organization and reference efficiency.

## Quick Navigation

- 🔥 [Firebase Patterns](../Firebase-patterns.md) - Firebase initialization, authentication, and security patterns
- 🏗️ [Data Schemas](../Data-schemas.md) - Firebase collections, schemas, and query patterns
- 🧩 [Architecture](../Architecture.md) - Component architecture, navigation, and state management
- 📊 [Verticals](../Verticals.md) - Dashboard vertical implementations and features
- 🗺️ [Full CodeMap](../CodeMap-new.md) - Complete code map with directory structure

## UI Navigation Notes

- **Map Page**: The Map button is visible on Home for admin users and links to `/map`.

## Documentation Structure

The modular documentation is organized as follows:

1. **Firebase Patterns**: 
   - Firebase initialization methods (3 distinct patterns)
   - Authentication flows and middleware
   - Role-based access control
   - Secondary Firebase app pattern

2. **Data Schemas**: 
   - Complete database structure for all collections
   - Query patterns and Firestore constraints
   - Identifier semantics and handler ID patterns
   - Date/timezone handling approaches

3. **Architecture**: 
   - Component hierarchy and architecture
   - Navigation flows and state management
   - API functions and data flow
   - Known pitfalls and their solutions

4. **Verticals**: 
   - WTM-SLP Dashboard
   - Shakti Abhiyaan Dashboard
   - YouTube Dashboard
   - WhatsApp Data Vertical
   - Migrant Vertical
   - Call Center Vertical
   - Training Data Vertical
   - Manifesto Vertical
   - Ghar-Ghar Yatra
   - Check-In Data Vertical
   - SLP Training Vertical

5. **Full CodeMap**: 
   - Directory structure
   - Technical concepts overview
   - Quick reference tables
   - Future development guidelines

## Why This Structure?

- **Improved Readability**: Each file focuses on a specific domain
- **Better Maintainability**: Update specific sections without navigating a large document
- **Enhanced Navigation**: Find information quickly with domain-specific organization
- **Context Efficiency**: AI assistants can reference only the relevant modules

## How to Use

1. Start with the [Full CodeMap](../CodeMap-new.md) for an overview of the project structure
2. Use the specific module files when working on related features
3. Keep these documentation files updated when adding new features or patterns
4. When adding new verticals, update the [Verticals](../Verticals.md) document

## Update Policy & Workflow

- This file is the INDEX. Put only high-signal pointers and a short log here.
- Put the detailed documentation in the relevant modular files listed in Quick Navigation.
- After any code change, do BOTH:
  1) Update the relevant modular doc(s) with details (what changed, where, why).
  2) Add a one-line entry to the short log below, and if it affects navigation or entry points, add a note under "UI Navigation Notes" above.

### What goes where (routing guide)

- Firebase init/auth/security patterns → `../Firebase-patterns.md`
- Firestore schemas, query patterns, IDs/date handling → `../Data-schemas.md`
- Components, navigation, state management, props/data flow → `../Architecture.md`
- Vertical-specific features/pages/cards → `../Verticals.md`
- Full directory reference, quick refs, broad overviews → `../CodeMap-new.md`
- One-off scripts/utilities → `../CodeMap-new.md` (scripts section) + script README if present
- Top-level UI entry/visibility (e.g., showing/hiding buttons/links) → a short note in this index (UI Navigation Notes) + details in `../Architecture.md`

### Index Update Template

Use this snippet for the Short Log below:

```
- [YYYY-MM-DD HH:mm IST] Change: <one-liner>. Files: `path1`, `path2`. Docs: [Architecture.md](../Architecture.md#...), [Verticals.md](../Verticals.md#...). Notes: <optional>
```

## Recent Updates (Short Log)

- [2025-11-14 17:18 IST] Change: Hide "View Map" button on Home. Files: `app/home/page.tsx`. Docs: [Architecture.md](../Architecture.md#map-navigation). Notes: Map still accessible at `/map`; added UI Navigation note in this index.
- [2025-11-14 17:45 IST] Change: Restored "View Map" button on Home (admin-only). Files: `app/home/page.tsx`. Docs: [Architecture.md](../Architecture.md#map-navigation). Notes: UI Navigation note updated to reflect visibility.
- [2025-11-14 17:20 IST] Fix: Call Center New AC Name UI showed "[object Object]" for malformed values. Sanitized rendering, search, and CSV export to show "--" instead. Files: `components/call-center/ExternalNewConvertedList.tsx`, `app/verticals/call-center/external-new/page.tsx`.
- [2025-11-14 18:10 IST] Change: Map WhatsApp tab now shows real per-assembly metrics with fuzzy assembly matching. Files: `app/utils/assemblyNameUtils.ts`, `app/utils/mapWhatsappAggregator.ts`, `app/map/page.tsx`. Docs: [Architecture.md](../Architecture.md#map-assembly-matching--aggregation), [Verticals.md](../Verticals.md#whatsapp-data-vertical), [Data-schemas.md](../Data-schemas.md#assembly-field-map-by-vertical). Notes: Test implementation; WTM/Shakti tabs unchanged.
- [2025-11-14 18:22 IST] Change: Added Training and SLP Training map integration using fuzzy assembly matching. New tabs: "Training" (WTM/Shakti sessions+attendees) and "SLP Training" (trained/in-progress/pending). Files: `app/utils/mapTrainingAggregator.ts`, `app/utils/mapSlpTrainingAggregator.ts`, `app/map/page.tsx`. Docs: [Architecture.md](../Architecture.md#map-assembly-matching--aggregation), [Verticals.md](../Verticals.md#training-data-vertical), [Verticals.md](../Verticals.md#slp-training-vertical). Notes: Uses existing `training` and `slp_training` collections; hover remains lightweight.
- [2025-11-14 18:36 IST] Change: Added Manifesto Complaints map integration (AC-level) using fuzzy assembly matching. New tab: "Manifesto Complaints". Files: `app/utils/mapManifestoComplaintsAggregator.ts`, `app/map/page.tsx`. Notes: Reads from `manifesto-complaints` (Firebase); supports legacy discriminator fields.
- [2025-11-14 18:36 IST] Change: Added Call Center New conversions map integration using fuzzy assembly matching. New tab: "Call Center New". Files: `app/utils/mapCallCenterNewAggregator.ts`, `app/map/page.tsx`. Notes: Aggregates by `convertedList[].acName` from `call-center-external`.
- [2025-11-14 18:54 IST] Change: Removed "Shakti Professionals" and "SLP Training" tabs from Map data card. Added "Ghar Ghar Yatra" tab with fuzzy assembly matching. Files: `app/utils/mapGgyAggregator.ts`, `app/map/page.tsx`. Notes: Uses `buildGGYSegmentData()` to derive per-assembly totals and top member.
- [2025-11-14 19:56 IST] Change: Map hover tooltip now shows combined multi-vertical metrics (Nukkad Meetings, WhatsApp Groups, Training Sessions, Manifesto Complaints). Files: `app/utils/mapHoverCombinedAggregator.ts` (NEW), `app/map/page.tsx`. Notes: Aggregates Nukkad from WTM AC + WTM SLP + Shakti AC; uses fuzzy assembly variations and in-memory TTL cache.

- [2025-11-16 22:01 IST] Change: Map page dynamically hides tabs with all-zero metrics and hides zero-value metric cards within visible tabs; auto-switches to first visible tab. Files: `app/map/page.tsx`. Docs: [Architecture.md](../Architecture.md#map-navigation). Notes: Hover tooltip unchanged; null/undefined treated as 0.

- [2025-11-14 20:03 IST] Change: Added Training home-card summary metrics with caching (sessions, attendees, assemblies, zones, WTM vs Shakti). Files: `app/home/page.tsx`, `app/utils/fetchTrainingData.ts`, `app/utils/cacheUtils.ts`, `models/trainingTypes.ts`. Docs: [Verticals.md](../Verticals.md#training-data-vertical), [Architecture.md](../Architecture.md#home-cards--caching).

---
