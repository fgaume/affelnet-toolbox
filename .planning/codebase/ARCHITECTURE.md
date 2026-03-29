# Architecture

**Analysis Date:** 2024-03-29

## Pattern Overview

**Overall:** Layered Client-Side Architecture (React)

**Key Characteristics:**
- **Functional Components:** React functional components with Hooks for state and logic.
- **Custom Hooks for Logic:** Separation of UI (components) from business logic (hooks).
- **Service-Based Data Layer:** Specialized service modules for external API interactions.
- **Graceful Degradation:** Optional features (like lycée results) are handled as non-blocking to the primary goal (college identification).

## Layers

**UI Layer (Components):**
- Purpose: Present data to the user and handle interactions.
- Location: `src/components/`
- Contains: React components, associated CSS files.
- Depends on: Hooks, Types.
- Used by: `src/App.tsx`.

**Logic/State Layer (Hooks):**
- Purpose: Orchestrate data flow, manage application state, and encapsulate business rules.
- Location: `src/hooks/`
- Contains: Custom React hooks (`useSectorSearch.ts`, `useAddressSearch.ts`, etc.).
- Depends on: Services, Types.
- Used by: Components, `src/App.tsx`.

**Data Layer (Services):**
- Purpose: Interact with external APIs, process raw data, and perform coordinate transformations.
- Location: `src/services/`
- Contains: API client functions, coordinate conversion utilities (`geo.ts`), and constants.
- Depends on: External APIs (ArcGIS, CapGeo, api-adresse), Types.
- Used by: Hooks.

**Model Layer (Types):**
- Purpose: Define data structures and ensure type safety across all layers.
- Location: `src/types/`
- Contains: TypeScript interfaces and types.
- Used by: All other layers.

## Data Flow

**Sector Search Flow:**

1. **Input:** User enters an address in `AddressInput` (or selects from `CollegeAutocomplete`).
2. **Action:** `App.tsx` calls `searchSector(address)` from the `useSectorSearch` hook.
3. **Fetching:** `useSectorSearch` calls `findCollegeDeSecteur` (from `sectorApi.ts`) to get the college name via CapGeo GIS.
4. **Resolution:** It then calls `findCollegeUAI` to resolve the college's UAI and coordinates via ArcGIS.
5. **Enrichment:** It fetches additional data like lycées of sector 1 (`findLyceesDeSecteur`) and IPS data (`ipsApi.ts`).
6. **State Update:** The hook updates its `result` state, triggering a re-render in `App.tsx`.
7. **Display:** Components like `CollegeCard`, `LyceeDetail`, and `SectorMap` display the resolved data.

**State Management:**
- **Local Component State:** Used for UI-only state (e.g., input values, toggle states).
- **Hook-managed State:** Custom hooks manage complex business state (e.g., search results, loading, errors).
- **Persistence:** `src/services/storage.ts` handles saving search history to `localStorage`.

## Key Abstractions

**API Service Functions:**
- Purpose: Encapsulate the complexity of external GIS and educational APIs.
- Examples: `src/services/sectorApi.ts`, `src/services/ipsApi.ts`.
- Pattern: Stateless async functions returning typed results.

**Search Coordination Hook:**
- Purpose: Orchestrate sequential and parallel API calls while managing loading/error states.
- Examples: `src/hooks/useSectorSearch.ts`.
- Pattern: Custom React hook with `useCallback` for stable action functions.

## Entry Points

**Main Entry:**
- Location: `src/main.tsx`
- Triggers: Browser page load.
- Responsibilities: Mounts the React application to the DOM.

**Root Component:**
- Location: `src/App.tsx`
- Triggers: Mounted by `main.tsx`.
- Responsibilities: Layout, routing (via conditional rendering), and top-level hook orchestration.

## Error Handling

**Strategy:** Layered error handling with user-facing messages and graceful degradation.

**Patterns:**
- **Try/Catch in Hooks:** Catches API failures and updates the `error` state.
- **Graceful Degradation:** If optional data (like lycée lists or IPS) fails to fetch, the app still shows the primary college result with a warning or fallback UI.
- **Validation:** `src/services/geo.ts` and `sectorApi.ts` handle coordinate transformations and data normalization to prevent runtime crashes.

## Cross-Cutting Concerns

**Logging:** Currently relies on `console.error` for debugging.
**Validation:** Prop-types (via TypeScript) and runtime checks for API responses.
**Authentication:** Not applicable (public APIs only).
**Theme:** `useTheme` hook manages dark/light mode via `localStorage` and CSS classes on the root element.

---

*Architecture analysis: 2024-03-29*
