# Plan - Table Styling (Alternating backgrounds)

- [x] Add alternate row background colors (`:nth-child(even)`) to the admission threshold tables in `AdmissionHistoryTable.css`.
- [x] Add a subtle hover effect to `tr` in the tables to enhance interactivity.
- [x] Ensure the sticky `.col-name` cells also get the updated alternate and hover background colors.
- [x] Verify the design with `npm run build` or inspect elements.
- [x] Document results.

## Review and Results

- **Alternating Backgrounds**: Added `nth-child(even)` row background using the theme variable `var(--color-bg-page)`.
- **Hover Interactivity**: Added a row hover effect utilizing the theme variable `var(--color-bg-hover)`.
- **Sticky Column Support**: Applied the same alternating and hover background colors to `.col-name` to ensure seamless alignment of the sticky lycée names column while scrolling horizontally.
- **Verification**: Built the project successfully via `npm run build`. The style adjustments compile without issues.

