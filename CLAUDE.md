# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Mon Collège de Secteur" — a React SPA that finds a student's sector middle school (collège) based on their home address, targeting the French education system. Uses public French government APIs for geocoding and school data.

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
Utilise React-Doctor pour vérifier les bonnes pratiques React

**Three-layer structure in `src/`:**

- **`components/`** — Presentational React components (AddressInput, CollegeCard, SearchHistory, LoadingState, ErrorMessage). Each has a co-located CSS file.
- **`hooks/`** — Custom hooks encapsulating business logic and state:
  - `useCollegeSearch` — orchestrates college lookup from an address, persists to history
  - `useAddressSearch` — address autocomplete with 300ms debounce
  - `useSearchHistory` — localStorage-backed search history CRUD
- **`services/`** — API clients and storage:
  - `collegeApi.ts` — queries `data.education.gouv.fr` (primary + fallback search)
  - `addressApi.ts` — queries `api-adresse.data.gouv.fr` for geocoding
  - `storage.ts` — localStorage wrapper for search history
- **`types/index.ts`** — shared TypeScript interfaces (Address, College, SearchHistory, etc.)

**Data flow:** User types address → `addressApi` autocomplete → user selects → `collegeApi.findCollegeByAddress` → result displayed in CollegeCard + saved to history.

**Entry point:** `index.html` → `main.tsx` → `App.tsx` (root container component that wires hooks to presentational components).

## External APIs

- **Address geocoding:** `https://api-adresse.data.gouv.fr`
- **School directory:** `https://data.education.gouv.fr`

## Key Conventions

- No external state management — React hooks + localStorage only
- Strict TypeScript (`strict: true`, `noUnusedLocals`, `noUnusedParameters`)
- ESLint flat config with TypeScript and React Hooks plugins
- Production assets use immutable caching (1 year)
