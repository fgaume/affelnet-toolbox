# Coding Conventions

**Analysis Date:** 2025-05-18

## Naming Patterns

**Files:**
- Components: `PascalCase.tsx` (e.g., `src/components/CollegeCard.tsx`)
- Component Styles: `PascalCase.css` (e.g., `src/components/CollegeCard.css`)
- Hooks: `useCamelCase.ts` (e.g., `src/hooks/useSectorSearch.ts`)
- Services/Utilities: `camelCase.ts` (e.g., `src/services/sectorApi.ts`)
- Tests: `name.test.ts` (Vitest) or `name.spec.ts` (Playwright)

**Functions:**
- React Components: `PascalCase` (e.g., `export function CollegeCard()`)
- Hooks: `camelCase` with `use` prefix (e.g., `useSectorSearch`)
- General Functions: `camelCase` (e.g., `findCollegeDeSecteur`)

**Variables:**
- Instances/Local: `camelCase` (e.g., `const [result, setResult] = useState()`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `const ANNEE_SCOLAIRE = '2025-2026'`)

**Types/Interfaces:**
- Interfaces: `PascalCase` (e.g., `interface SectorResult`)
- Type Aliases: `PascalCase` (e.g., `type InputMode = 'address' | 'college'`)

## Code Style

**Formatting:**
- Integrated with Vite and TypeScript.
- No explicit Prettier/Biome config detected, follows standard ESLint/TypeScript formatting.

**Linting:**
- Tool: ESLint 9 (Flat Config)
- Configuration: `eslint.config.js`
- Rules: `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`.
- Strictness: `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true` in `tsconfig.app.json`.

## Import Organization

**Order:**
1. React and third-party libraries (e.g., `import { useState } from 'react'`)
2. Types (e.g., `import type { Address } from '../types'`)
3. Hooks (e.g., `import { useSectorSearch } from '../hooks/useSectorSearch'`)
4. Services/Utils (e.g., `import { findCollegeDeSecteur } from '../services/sectorApi'`)
5. Components (e.g., `import { CollegeCard } from './CollegeCard'`)
6. Styles (e.g., `./App.css`)

**Path Aliases:**
- Not used. Relative paths are standard (e.g., `../services/sectorApi`).

## Error Handling

**Patterns:**
- Services: `async/await` with `throw new Error('Message')` for API failures.
- Hooks: `try/catch` blocks within `useCallback` or `useEffect`, setting an `error` state.
- Components: Check for `error` state and render an `ErrorMessage` component.

## Logging

**Framework:** `console` (minimal usage observed).

**Patterns:**
- Errors are mostly caught and displayed to the user rather than logged to the console in production code.

## Comments

**When to Comment:**
- Explaining complex business logic or workaround (e.g., `TEMPORARY: Rabelais closure workaround` in `src/services/sectorApi.ts`).
- Documentation for constants or functions.

**JSDoc/TSDoc:**
- Minimal usage, mostly standard block comments for function descriptions.

## Function Design

**Size:**
- Components are modular (e.g., `CollegeCard.tsx` is ~400 lines but contains sub-components like `EffectifsDonut`, `LyceesIndicateurs`).
- Services are specialized by domain (e.g., `geo.ts`, `addressApi.ts`).

**Parameters:**
- Mostly single object for props in components.
- Services use positional arguments for simple values (e.g., `findCollegeDeSecteur(lat, lon)`).

**Return Values:**
- Hooks return objects containing state and handlers.
- Services return Promises for data or structured objects.

## Module Design

**Exports:**
- Components: Named exports from files and barrel exports from `src/components/index.ts`.
- Services/Hooks: Named exports.
- `App.tsx` and `main.tsx`: Default exports for Vite entry points.

**Barrel Files:**
- Used for components in `src/components/index.ts`.

## Styling (Vanilla CSS)

**Co-location:**
- Every component has a co-located `.css` file (e.g., `AddressInput.tsx` + `AddressInput.css`).

**Theming:**
- Global variables defined in `src/index.css` using `:root` and `[data-theme="dark"]`.
- Components use `var(--color-...)` for all colors.

**Naming:**
- CSS classes use `kebab-case` (e.g., `.college-card`, `.sector-tab`).

**Responsiveness:**
- Mobile-first approach with `@media (max-width: 480px)` for mobile adjustments.

---

*Convention analysis: 2025-05-18*
