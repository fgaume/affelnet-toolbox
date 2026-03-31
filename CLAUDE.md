# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Affelnet Paris" — a React SPA that helps families navigate the French school assignment system (Affelnet) for Paris. It finds a student's sector middle school (collège) and lycées from a home address, displays IPS data, admission score simulation, admission history/thresholds, effectifs, and competitive college analysis. Uses public French government APIs (data.education.gouv.fr, CapGeo Paris, ArcGIS Rectorat) and Hugging Face datasets.

## Commands

```bash
npm run dev        # Vite dev server with HMR
npm run build      # TypeScript check + Vite production build (tsc -b && vite build)
npm run lint       # ESLint
npm run preview    # Preview production build locally
npm run deploy     # Build + Firebase Hosting deploy
npm run test:e2e   # All Playwright E2E tests
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

- **`components/`** — Presentational React components, each with a co-located CSS file:
  - `AddressInput` / `CollegeAutocomplete` — address and college search inputs
  - `CollegeCard` — main result card (college + lycées de secteur)
  - `LyceeDetail` / `LyceeListSection` — detailed lycée info with IPS, effectifs, admission data
  - `ScoreDisplay` / `GradeInputForm` — admission score simulation UI
  - `AdmissionHistoryTable` / `AdmissionSparkline` / `CustomTooltip` — admission threshold history (Recharts)
  - `IpsGauge` / `DecileGauge` / `EffectifsDonut` — data visualizations (Recharts)
  - `SectorMap` — Leaflet map showing college/lycée locations
  - `CollegesConcurrence` — competitive analysis of colleges sharing same lycées
  - `DataSourcesPanel` — data provenance display
  - `DisclaimerModal` — disclaimer popup
  - `SearchHistory` / `LoadingState` / `ErrorMessage` / `ThemeToggle` / `ScolarisationSection`
- **`hooks/`** — Custom hooks encapsulating business logic and state:
  - `useSectorSearch` — orchestrates college + lycées de secteur lookup from an address, persists to history
  - `useAddressSearch` — address autocomplete with 300ms debounce
  - `useCollegeSearch` — college name autocomplete (fetches full college list from data.education.gouv.fr)
  - `useSearchHistory` — localStorage-backed search history CRUD
  - `useAdmissionHistory` — fetches admission threshold history from Hugging Face dataset
  - `useEffectifs` — fetches lycée enrollment data (effectifs seconde)
  - `useTheme` — dark/light/system theme management
- **`services/`** — API clients, calculations, and storage:
  - `sectorApi.ts` — 3-step pipeline: CapGeo carte scolaire (collège de secteur) → ArcGIS Rectorat (UAI lookup) → ArcGIS Rectorat (lycées de secteur)
  - `addressApi.ts` — queries `api-adresse.data.gouv.fr` for geocoding
  - `collegeApi.ts` — fetches Paris college list + IPS data from data.education.gouv.fr
  - `ipsApi.ts` — fetches IPS (Indice de Position Sociale) for a college by UAI
  - `scoreApi.ts` — fetches academic stats (moyennes, écarts-types) from data.education.gouv.fr
  - `scoreCalculation.ts` — Affelnet admission score calculation (harmonization, weighting, multiplier)
  - `effectifsApi.ts` — fetches lycée enrollment numbers from data.education.gouv.fr
  - `seuilsApi.ts` — fetches admission thresholds from Hugging Face dataset
  - `niveauScolaireApi.ts` — fetches lycée academic performance indicators
  - `collegesConcurrenceApi.ts` — finds colleges sharing the same lycée sectors via ArcGIS
  - `secteurChangesApi.ts` — detects year-over-year sector assignment changes from Hugging Face
  - `geo.ts` — WGS84 to Web Mercator (EPSG:3857) coordinate conversion
  - `decile.ts` — decile computation utility
  - `trendCalculation.ts` — linear regression for trend analysis
  - `ipsConstants.ts` — IPS reference constants
  - `storage.ts` — localStorage wrapper for search history (versioned format)
- **`types/index.ts`** — shared TypeScript interfaces (Address, CollegeSecteur, LyceeSecteur, SectorResult, SearchHistory, College, IpsInfo, UserGrades, UserScore, FinalScores, LyceeAdmissionHistory, etc.)

**Data flow:** User types address (or college name) → autocomplete → user selects → `sectorApi` pipeline (CapGeo → ArcGIS UAI → ArcGIS lycées) → result displayed in CollegeCard + saved to history. In parallel: IPS data, effectifs, admission thresholds, and competitive analysis are fetched and displayed. User can also simulate their admission score via GradeInputForm → `scoreCalculation`.

**Entry point:** `index.html` → `main.tsx` → `App.tsx` (root container component that wires hooks to presentational components).

**Key libraries:** React 19.2, Vite 8, Recharts (charts/gauges), Leaflet + react-leaflet (maps), Playwright (E2E tests), Vitest (unit tests).

## External APIs

- **Address geocoding:** `https://api-adresse.data.gouv.fr`
- **Carte scolaire (collège de secteur):** `https://capgeo2.paris.fr` (CapGeo Paris)
- **Lycées de secteur + UAI lookup:** `https://services9.arcgis.com` (ArcGIS Rectorat de Paris)
- **Education data (colleges, IPS, effectifs, résultats):** `https://data.education.gouv.fr` (Open Data Éducation)
- **Admission thresholds + sector changes:** Hugging Face datasets (`fgaume/affelnet-paris-seuils-admission-lycees`, `fgaume/affelnet-paris-secteurs-2025`)

## Tests

- **Unit tests (Vitest):** `src/services/__tests__/` — geo conversion, sectorApi mocked fetch, score calculation
- **E2E app tests (Playwright):** `tests/e2e/sector-search.spec.ts` — searches addresses on our app, verifies college + lycées
- **E2E score calculation (Playwright):** `tests/e2e/score-calculation.spec.ts` — tests admission score simulation
- **E2E cross-validation (Playwright):** `tests/e2e/carte-scolaire-validation.spec.ts` — compares our app results against the official carte scolaire website for 12 addresses

```bash
npm test                    # Unit tests (Vitest)
npx playwright test tests/e2e/sector-search.spec.ts              # E2E app tests
npx playwright test tests/e2e/score-calculation.spec.ts          # E2E score simulation
npx playwright test tests/e2e/carte-scolaire-validation.spec.ts  # Cross-validation vs site officiel
```

## Key Conventions

- No external state management — React hooks + localStorage only
- Strict TypeScript (`strict: true`, `noUnusedLocals`, `noUnusedParameters`)
- ESLint flat config with TypeScript and React Hooks plugins
- Production assets use immutable caching (1 year)
- Create new feature branch for each new requirement implementation (REQ1, REQ2, etc.)
