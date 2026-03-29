# Codebase Structure

**Analysis Date:** 2024-03-29

## Directory Layout

```
affelnet-no-socle/
├── public/             # Static assets (favicons, etc.)
├── data/               # Local JSON data files (e.g., effectifs)
├── docs/               # Technical documentation and specs
├── tests/              # End-to-end tests (Playwright)
├── scripts/            # Build/data fetch scripts
├── src/                # Application source code
│   ├── assets/         # Images, global styles
│   ├── components/     # React components and CSS modules
│   ├── hooks/          # Custom React hooks (logic/state)
│   ├── services/       # API clients and business utilities
│   ├── types/          # TypeScript definitions
│   ├── utils/          # Shared helper functions
│   ├── App.tsx         # Root component
│   └── main.tsx        # Application entry point
├── package.json        # Dependencies and scripts
└── vite.config.ts      # Build configuration
```

## Directory Purposes

**`src/components/`:**
- Purpose: UI components and their styling.
- Contains: `.tsx` and `.css` files.
- Key files: `AddressInput.tsx`, `CollegeCard.tsx`, `SectorMap.tsx`, `IpsGauge.tsx`.

**`src/hooks/`:**
- Purpose: Encapsulate logic and state.
- Contains: Custom hooks.
- Key files: `useSectorSearch.ts` (primary search orchestration), `useAddressSearch.ts`, `useTheme.ts`.

**`src/services/`:**
- Purpose: Interface with external data sources and complex business logic.
- Contains: API client modules, data processing functions, and coordinate transformations.
- Key files: `sectorApi.ts` (ArcGIS/CapGeo integration), `geo.ts` (coordinate conversions), `ipsApi.ts`.

**`src/types/`:**
- Purpose: Centralized TypeScript models.
- Contains: `index.ts`.

**`data/`:**
- Purpose: Local storage for infrequently changing datasets used by the app.
- Contains: `effectifs-seconde.json`.

**`tests/e2e/`:**
- Purpose: End-to-end testing of core user flows.
- Contains: Playwright test specifications.

## Key File Locations

**Entry Points:**
- `src/main.tsx`: React DOM mounting.
- `src/App.tsx`: Main application layout and state coordination.

**Configuration:**
- `vite.config.ts`: Vite build and dev server config.
- `tsconfig.json`: TypeScript compiler options.
- `playwright.config.ts`: E2E test runner configuration.

**Core Logic:**
- `src/hooks/useSectorSearch.ts`: Coordinates the multi-step sector search process.
- `src/services/sectorApi.ts`: Low-level GIS API calls and data mapping.

**Testing:**
- `src/services/__tests__/`: Unit tests for service functions (Vitest).
- `tests/e2e/`: Integration/E2E tests (Playwright).

## Naming Conventions

**Files:**
- Components: `PascalCase.tsx` (e.g., `AddressInput.tsx`).
- Component Styles: `PascalCase.css` (e.g., `AddressInput.css`).
- Hooks: `camelCase.ts` starting with `use` (e.g., `useSectorSearch.ts`).
- Services/Utils: `camelCase.ts` (e.g., `sectorApi.ts`).

**Directories:**
- `camelCase` (e.g., `components`, `hooks`).

## Where to Add New Code

**New Feature:**
1. Define types in `src/types/index.ts`.
2. Implement data fetching/logic in `src/services/`.
3. Create a custom hook in `src/hooks/` to manage state.
4. Build UI components in `src/components/`.
5. Integrate the hook/components in `src/App.tsx`.

**New Component/Module:**
- Create `MyComponent.tsx` and `MyComponent.css` in `src/components/`.
- Export from `src/components/index.ts`.

**Utilities:**
- General helpers: `src/utils/`.
- Domain-specific logic: `src/services/`.

## Special Directories

**`.planning/`:**
- Purpose: Documentation for development guidance and codebase mapping.
- Committed: Yes.

**`backlog/`:**
- Purpose: Markdown files tracking requirements and feature progress.
- Committed: Yes.

---

*Structure analysis: 2024-03-29*
