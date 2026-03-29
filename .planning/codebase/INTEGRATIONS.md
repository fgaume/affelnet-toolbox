# External Integrations

**Analysis Date:** 2025-03-24

## APIs & External Services

**Address Search:**
- Base Adresse Nationale (BAN) - `https://api-adresse.data.gouv.fr/search/`
  - Used for address geocoding and suggestion.
  - Client: Fetch in `src/services/addressApi.ts`.
  - Auth: None (Public API).

**School Sector (Paris):**
- Ville de Paris / DASCO (CapGeo) - `https://capgeo2.paris.fr/public/rest/services/DASCO/DASCO_Carte_scolaire/MapServer/0/query`
  - Used to find the middle school (collège) associated with a geographic point.
  - Client: Fetch in `src/services/sectorApi.ts`.
  - Auth: None (Public API).

**Affelnet / High School Sectors:**
- Rectorat de Paris / ArcGIS - `https://services9.arcgis.com/ekT8MJFiVh8nvlV5/arcgis/rest/services/Affectation_Lyc%C3%A9es/FeatureServer/0/query`
  - Used to find the high schools (lycées) associated with a middle school (collège) for Affelnet sectors.
  - Client: Fetch in `src/services/sectorApi.ts`.
  - Auth: None (Public API).

**Open Data (National Education):**
- data.education.gouv.fr - `https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/`
  - Used for Indices de Position Sociale (IPS) and high school student numbers (effectifs).
  - Client: Fetch in `src/services/ipsApi.ts` and `src/services/effectifsApi.ts`.
  - Auth: None (Public API).

## Data Storage

**Databases:**
- None (Local state only).

**File Storage:**
- Local filesystem for assets and static data.
- `data/effectifs-seconde.json` - Fallback or additional static dataset.

**Caching:**
- Local `Map` cache and `localStorage` in `src/services/storage.ts`.

## Authentication & Identity

**Auth Provider:**
- None (Publicly accessible tool).

## Monitoring & Observability

**Error Tracking:**
- Console logging in services.

**Logs:**
- Console only.

## CI/CD & Deployment

**Hosting:**
- Firebase Hosting.

**CI Pipeline:**
- None detected (Firebase deploy manually from CLI).

## Environment Configuration

**Required env vars:**
- None detected.

**Secrets location:**
- Not applicable.

---

*Integration audit: 2025-03-24*
