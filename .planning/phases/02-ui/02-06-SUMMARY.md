---
phase: 02-ui
plan: 06
subsystem: UI Components
tags: [react, component, recharts, score]
requires: [02-05]
provides: [ScoreDisplay]
affects: [src/components/index.ts]
tech-stack: [react, recharts, css-modules]
key-files: [src/components/ScoreDisplay.tsx, src/components/ScoreDisplay.css]
decisions:
  - Use a horizontal BarChart from Recharts to visualize the contribution of each disciplinary field to the total score.
  - Sorted the breakdown table by contribution (descending) to highlight most impactful fields.
  - Included a detailed information box explaining the harmonization process and coefficients.
metrics:
  - duration: 25m
  - tasks: 2
  - files: 3
---

# Phase 02 Plan 06: ScoreDisplay Component Summary

## One-liner
Implemented the `ScoreDisplay` component to visualize the Affelnet score with a total score display, a breakdown table, and a contribution chart using Recharts.

## Key Changes

### `ScoreDisplay.tsx`
- Created a robust component that accepts `UserScore | null`.
- Displays the total score prominently with large typography.
- Implemented a detailed breakdown table showing:
  - Field Name (translated to French).
  - Raw average of grades.
  - Harmonized points (including the x2 multiplier).
  - Percentage contribution to the total score.
- Added a `BarChart` from Recharts to visually represent the weight of each field in the final result.
- Added an informational section explaining the harmonization logic.

### `ScoreDisplay.css`
- Styled the component with a card-like layout.
- Ensured responsive design for the table using `overflow-x: auto`.
- Custom styling for the total score value and the informational box.

### `src/components/index.ts`
- Exported the `ScoreDisplay` component for use in `App.tsx`.

## Deviations from Plan
- None - the implementation follows all tasks and requirements exactly.

## Known Stubs
- None.

## Self-Check: PASSED
- [x] Total score is prominently displayed.
- [x] Detailed breakdown table is visible and correctly formatted.
- [x] Explanation of calculation is included.
- [x] Recharts visualization is integrated and functional.
- [x] Responsive design for mobile is implemented.
