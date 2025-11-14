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

- **Map Page**: The Map page (`/map`) exists but its navigation button is currently hidden/commented out in the home page. The map functionality remains accessible via direct URL but is not exposed in the main UI.

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
- [2025-11-14 17:20 IST] Fix: Call Center New AC Name UI showed "[object Object]" for malformed values. Sanitized rendering, search, and CSV export to show "--" instead. Files: `components/call-center/ExternalNewConvertedList.tsx`, `app/verticals/call-center/external-new/page.tsx`.

---
