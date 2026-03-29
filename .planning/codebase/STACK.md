# Technology Stack

**Analysis Date:** 2025-03-24

## Languages

**Primary:**
- TypeScript 5.9.3 - Used for all application logic, components, and services.

## Runtime

**Environment:**
- Browser (Client-side application)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present.

## Frameworks

**Core:**
- React 19.2.0 - UI framework.

**Testing:**
- Vitest 4.1.1 - Unit and service testing.
- Playwright 1.58.2 - End-to-end testing.

**Build/Dev:**
- Vite 8.0.2 - Build tool and development server.
- ESLint 9.39.1 - Linting.

## Key Dependencies

**Critical:**
- Leaflet 1.9.4 / react-leaflet 5.0.0 - Interactive map for school sectors.
- Recharts 3.8.0 - Data visualization for student demographics (IPS, effectifs).

**Infrastructure:**
- Firebase Hosting - Platform for static asset deployment.

## Configuration

**Environment:**
- No client-side environment variables detected; all APIs used are public.

**Build:**
- `vite.config.ts`: Vite build configuration.
- `tsconfig.json`: TypeScript configuration (references `tsconfig.app.json` and `tsconfig.node.json`).
- `eslint.config.js`: ESLint configuration.

## Platform Requirements

**Development:**
- Node.js (version compatible with Vite 8).

**Production:**
- Firebase Hosting (static files in `dist/`).

---

*Stack analysis: 2025-03-24*
