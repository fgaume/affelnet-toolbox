# URL Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement URL-based routing using `react-router-dom` while preserving current SPA state.

**Architecture:** Sync URL with existing `topTab` state. Use `display: none` for inactive panels to keep them mounted.

**Tech Stack:** React 19, Vite, react-router-dom v7.

---

### Task 1: Installation and Basic Setup

**Files:**
- Modify: `package.json`
- Modify: `src/main.tsx`

- [ ] **Step 1: Install react-router-dom**
Run: `npm install react-router-dom`

- [ ] **Step 2: Setup BrowserRouter in main.tsx**
Wrap `<App />` with `<BrowserRouter>`.

- [ ] **Step 3: Commit**
```bash
git add package.json package-lock.json src/main.tsx
git commit -m "chore: install react-router-dom and setup BrowserRouter"
```

---

### Task 2: Sync App State with URL

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add routing hooks and constants**
Import `useLocation`, `useNavigate`. Define `ROUTE_TO_TAB` and `TAB_TO_ROUTE` mappings.

- [ ] **Step 2: Sync location to topTab state**
Add `useEffect` listening to `location.pathname` to call `setTopTab`. Handle `/` and unknown path redirections.

- [ ] **Step 3: Update tab clicks to navigate**
Modify `handleTopTabChange` to call `navigate(route)`.

- [ ] **Step 4: Commit**
```bash
git add src/App.tsx
git commit -m "feat: implement URL routing and state synchronization"
```

---

### Task 3: Verification

**Files:**
- Create: `tests/e2e/routing.spec.ts`

- [ ] **Step 1: Write E2E routing tests**
Ensure redirection from `/` to `/lycees`, tab-click updates URL, and direct URL entry works.

- [ ] **Step 2: Run tests**
Run: `npx playwright test tests/e2e/routing.spec.ts`

- [ ] **Step 3: Commit**
```bash
git add tests/e2e/routing.spec.ts
git commit -m "test: add E2E tests for URL routing"
```
