# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Affelnet Paris" — a React SPA that finds a student's sector middle school (collège) based on their home address, targeting the French education system. Uses public French government APIs for geocoding and school data.

## Commands

```bash
npm run dev        # Vite dev server with HMR
npm run build      # TypeScript check + Vite production build (tsc -b && vite build)
npm run lint       # ESLint
npm run preview    # Preview production build locally
npm run deploy     # Build + Firebase Hosting deploy
```

## Architecture

**Stack:** :
L'application est développée en Typescript, React 19.2, Vite 8, en composants fonctionnels (pas de classe).
Ne pas générer de trop gros changements d'un coup, tu dois toujours décomposer en changements simples
Utilise Playwright pour les tests E2E
Utilise React-Doctor pour vérifier les bonnes pratiques React.
Persistence des données : local storage du browser.
Déploiement : hosting avec Vercel.

**Three-layer structure in `src/`:**

- **`components/`** — Presentational React components (AddressInput, CollegeCard, SearchHistory, LoadingState, ErrorMessage). Each has a co-located CSS file.
- **`hooks/`** — Custom hooks encapsulating business logic and state:
  - `useSectorSearch` — orchestrates college + lycées de secteur lookup from an address, persists to history
  - `useAddressSearch` — address autocomplete with 300ms debounce
  - `useSearchHistory` — localStorage-backed search history CRUD
- **`services/`** — API clients and storage:
  - `sectorApi.ts` — 3-step pipeline: CapGeo carte scolaire (collège de secteur) → ArcGIS Rectorat (UAI lookup) → ArcGIS Rectorat (lycées de secteur)
  - `geo.ts` — WGS84 to Web Mercator (EPSG:3857) coordinate conversion
  - `addressApi.ts` — queries `api-adresse.data.gouv.fr` for geocoding
  - `storage.ts` — localStorage wrapper for search history (versioned format)
- **`types/index.ts`** — shared TypeScript interfaces (Address, CollegeSecteur, LyceeSecteur, SectorResult, SearchHistory)

**Data flow:** User types address → `addressApi` autocomplete → user selects → `sectorApi.findCollegeDeSecteur` (coordinates → CapGeo carte scolaire) → `sectorApi.findCollegeUAI` (ArcGIS) → `sectorApi.findLyceesDeSecteur` (ArcGIS) → result displayed in CollegeCard + saved to history.

**Entry point:** `index.html` → `main.tsx` → `App.tsx` (root container component that wires hooks to presentational components).

## External APIs

- **Address geocoding:** `https://api-adresse.data.gouv.fr`
- **Carte scolaire (collège de secteur):** `https://capgeo2.paris.fr` (CapGeo Paris)
- **Lycées de secteur + UAI lookup:** `https://services9.arcgis.com` (ArcGIS Rectorat de Paris)

## Tests

- **Unit tests (Vitest):** `src/services/__tests__/` — geo conversion, sectorApi mocked fetch
- **E2E app tests (Playwright):** `tests/e2e/sector-search.spec.ts` — searches addresses on our app, verifies college + lycées
- **E2E cross-validation (Playwright):** `tests/e2e/carte-scolaire-validation.spec.ts` — compares our app results against the official carte scolaire website for 12 addresses

```bash
npm test                    # Unit tests (Vitest)
npx playwright test tests/e2e/sector-search.spec.ts              # E2E app tests
npx playwright test tests/e2e/carte-scolaire-validation.spec.ts  # Cross-validation vs site officiel
```

## Key Conventions

- No external state management — React hooks + localStorage only
- Strict TypeScript (`strict: true`, `noUnusedLocals`, `noUnusedParameters`)
- ESLint flat config with TypeScript and React Hooks plugins
- Production assets use immutable caching (1 year)
- Create new feature branch for each new requirement implementation (REQ1, REQ2, etc.)
