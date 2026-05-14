# Design Spec: URL Routing for Affelnet Paris

**Date:** 2026-05-14
**Status:** Draft
**Topic:** Implementation of URL-based navigation using `react-router-dom`.

## 1. Objective
Enable direct access to different app sections via URLs, allowing users to bookmark specific pages and use browser history (Back/Forward) while preserving application state (search results, grades).

## 2. URL Mapping
The following routes will be mapped to the existing `topTab` state:
- `/lycees` -> `search` (Lycées de secteur)
- `/simuler` -> `score` (Simuler)
- `/contribuer` -> `contribute` (Contribuer)
- `/algorithme` -> `affectation` (Algorithme)
- `/seuils` -> `history` (Seuils d'admission)

## 3. Architecture
- **Library:** `react-router-dom` v7.
- **State Preservation:** We will continue to render all panels simultaneously using `display: none` for inactive ones. This ensures no data is lost when navigating between routes.
- **Routing Logic:** 
    - `BrowserRouter` wrapped around `App` in `main.tsx`.
    - `App.tsx` will use `useLocation` to derive the active tab from the URL.
    - `App.tsx` will use `useNavigate` to change the URL when tabs are clicked.
    - Automatic redirection from `/` to `/lycees`.
    - Any unknown route will redirect to `/lycees`.

## 4. Implementation Plan (High Level)
1. Install `react-router-dom`.
2. Update `src/main.tsx` to include `BrowserRouter`.
3. Modify `src/App.tsx`:
    - Define a helper function to map pathnames to `TopTab` values.
    - Add a `useEffect` to sync the URL with `topTab` on mount and URL change.
    - Update `handleTopTabChange` to trigger navigation.
4. Verify navigation preserves search results and grade inputs.

## 5. Success Criteria
- Navigating to `/simuler` directly loads the simulation tab.
- Clicking "Lycées de secteur" changes the URL to `/lycees`.
- Browser back button works as expected between tabs.
- No loss of entered grades when switching from `/simuler` to `/lycees` and back.
