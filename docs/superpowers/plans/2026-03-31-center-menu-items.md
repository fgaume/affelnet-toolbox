# Center Top Menu Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Center the three top menu items (Lycées de secteur, Simuler son barème, Historique des seuils admission).

**Architecture:** Modify the `.input-tabs` container in `src/App.css` to use `justify-content: center`.

**Tech Stack:** CSS

---

### Task 1: Center Menu Items

**Files:**
- Modify: `src/App.css`

- [ ] **Step 1: Update .input-tabs styling**

```css
.input-tabs {
  display: flex;
  justify-content: center;
  gap: 4px;
  margin-bottom: 12px;
  width: 100%;
}
```

- [ ] **Step 2: Commit changes**

```bash
git add src/App.css
git commit -m "style: center top menu items"
```

### Task 2: Verification

- [ ] **Step 1: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: Only pre-existing errors (or PASS)
