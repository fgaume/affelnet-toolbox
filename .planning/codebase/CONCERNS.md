# Codebase Concerns

**Analysis Date:** 2025-05-15

## Tech Debt

**Manual Maintenance Points:**
- Issue: Several critical values are hardcoded and will require manual updates every year.
- Files: 
  - `src/services/sectorApi.ts`: `ANNEE_SCOLAIRE = '2025-2026'`
  - `src/services/seuilsApi.ts`: `SEUIL_2025_INDEX = 4`
- Impact: App will display outdated or incorrect information when the next school year begins.
- Fix approach: Derive the current school year dynamically or move these to a configuration file/environment variable.

**Hardcoded School Closure Workarounds:**
- Issue: Specific logic for the "Rabelais closure" is hardcoded in services and components.
- Files: 
  - `src/services/sectorApi.ts`: `applyRabelaisClosure` function and `RABELAIS_REPLACEMENT` map.
  - `src/components/EffectifsDonut.tsx`: Specific mention and logic for Rabelais.
- Impact: Technical debt that accumulates as more specific cases arise; logic is scattered.
- Fix approach: Abstract these rules into a "data override" layer or fetch them from a configuration service.

**Dependency on Unofficial Datasets:**
- Issue: The app relies on several datasets hosted on a personal HuggingFace account.
- Files: 
  - `src/services/seuilsApi.ts`: `fgaume/affelnet-paris-seuils-admission-lycees`
  - `src/services/collegeApi.ts`: `fgaume/affelnet-paris-bonus-ips-colleges`
- Impact: If these files are moved or deleted, core features (thresholds, IPS bonus) will break.
- Fix approach: Host these datasets in an official or project-managed location, or better yet, automate their generation from source data.

**Large Multi-Concern Components:**
- Issue: `CollegeCard.tsx` has grown to nearly 400 lines and handles scolarisation logic, IPS display, effectifs, map coordination, and more.
- Files: `src/components/CollegeCard.tsx`
- Impact: Harder to maintain, test, and reason about.
- Fix approach: Refactor into smaller, focused sub-components or use a state machine for the complex scolarisation/result flow.

## Performance Bottlenecks

**In-Memory Filtering of Large Datasets:**
- Issue: Several services fetch the entire Paris history for all schools and filter it in-memory.
- Files: 
  - `src/services/ipsApi.ts`: `fetchAllParis` fetches all history.
  - `src/services/niveauScolaireApi.ts`: `fetchAllParis` fetches all history.
- Cause: The OpenDataSoft API is queried with `limit=-1` to get all rows.
- Improvement path: Use more specific `where` clauses in API calls to fetch only what's needed for the current view, or implement a more robust client-side data store.

**Redundant API Calls:**
- Issue: `ipsApi.ts` and `niveauScolaireApi.ts` share very similar data fetching patterns but operate independently, potentially loading similar data twice.
- Files: `src/services/ipsApi.ts`, `src/services/niveauScolaireApi.ts`
- Cause: Lack of a shared data-fetching abstraction for the education.gouv.fr API.
- Improvement path: Create a generic OpenDataSoft client/service to handle caching, batching, and error handling.

## Fragile Areas

**Leaflet and Recharts Integration:**
- Issue: Leaflet requires a hack with `@ts-ignore` and manual icon URL setting. Recharts uses `foreignObject` in `EffectifsDonut.tsx` which can be fragile across browsers.
- Files: 
  - `src/components/SectorMap.tsx`: `@ts-ignore L.Icon.Default.prototype._getIconUrl`
  - `src/components/EffectifsDonut.tsx`: `SliceLabel` using `foreignObject`.
- Why fragile: Breaks easily during library updates or in less common browser environments.
- Safe modification: Encapsulate Leaflet setup in a dedicated utility; use SVG elements or standard HTML overlays instead of `foreignObject` if possible.

## Test Coverage Gaps

**Untested UI Logic:**
- What's not tested: All React hooks and components are currently untested.
- Files: `src/hooks/*.ts`, `src/components/*.tsx`
- Risk: Complex UI transitions, scolarisation logic, and data transformations in components could break unnoticed.
- Priority: High (especially for `useSectorSearch` and `CollegeCard`).

**Service Logic Duplication:**
- What's not tested: The `median` calculation and data merging logic are duplicated and tested separately in each service.
- Files: `src/services/ipsApi.ts`, `src/services/niveauScolaireApi.ts`
- Risk: Inconsistent behavior between similar features.
- Priority: Medium.

## Reliability Concerns

**Missing Error Boundaries:**
- Risk: A crash in one component (e.g., Recharts or Leaflet) will take down the entire application.
- Files: `src/main.tsx`, `src/App.tsx`
- Current mitigation: Basic `try/catch` in some hooks and services.
- Recommendations: Add a global React Error Boundary and potentially more granular ones around the Map and Charts.

**No Network Retry Strategy:**
- Risk: Public API calls (CapGeo, ArcGIS, OpenData) are prone to intermittent failures.
- Files: `src/services/*.ts`
- Current mitigation: Single `fetch` call with basic error check.
- Recommendations: Implement a retry mechanism with exponential backoff for external API calls.

---

*Concerns audit: 2025-05-15*
