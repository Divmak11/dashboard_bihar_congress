# PRD – Global Metrics Default for Hierarchical Dashboard

## Objective
When a vertical (WTM Samvidhan Leader or Shakti-Abhiyaan) is selected **without** choosing a Zone, Assembly, AC, or SLP, the metric cards must display totals aggregated across **all** zones and assemblies for that vertical, instead of “-”.

## Success Metrics
1. Metric cards show correct aggregated counts immediately on vertical selection with no lower-level filters.
2. Detailed view lists match the aggregated metrics.
3. No additional Firestore composite indexes are required.
4. Existing behaviour for lower hierarchy selections remains unchanged.
5. Dashboard performance stays within current baseline (< 3 s first paint).

## Assumptions
• Existing Firestore queries already return global totals when no filters are supplied.  
• Only the early-return guard in the React page prevents this fetch.

## Out of Scope
• Firestore schema changes.  
• Creating new composite indexes.  
• Refactors unrelated to this behaviour.

## High-Level Solution
1. **Remove Early-Return Guard** – Delete the `setMetrics(emptyMetrics)` shortcut in `app/wtm-slp-new/page.tsx` (approx. lines 210-220).
2. **Default Options** – When no Zone / Assembly / AC / SLP is selected, build `{ level: 'vertical' }` and call `fetchCumulativeMetrics`.
3. **No Query Changes** – `fetchCumulativeMetrics` and helper queries already fetch all records when filters are absent.

## Task Breakdown
| ID | Description | Owner |
|----|-------------|-------|
|E1 |Remove early-return guard in page component|FE|
|E2 |Create default options object and invoke metrics fetch|FE|
|E3 |Manual QA on both verticals (no filters & with filters) |QA|
|E4 |Add/adjust unit & integration tests for global totals|FE|
|E5 |Monitor Firestore read counts post-release; rollback if reads ↑ >25 %|DevOps|

## Timeline
Coding & unit tests: **0.5 day**  
QA & release: **0.5 day** (behind feature flag)

## Risks & Mitigations
*Higher Firestore reads*: Acceptable based on current volumes; monitor and optimise if necessary.

## Approval
Product Lead · Engineering Lead · Data Analyst