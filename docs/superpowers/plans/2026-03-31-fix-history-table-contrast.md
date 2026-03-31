# Fix History Table Contrast in Dark Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix visibility of high-threshold schools in the admission history table during dark mode by using semantic CSS classes instead of hardcoded dark colors.

**Architecture:** 
1. Update `seuilsApi.ts` to provide a `level` string in the difficulty object.
2. Update `AdmissionHistoryTable.tsx` to apply a CSS class based on this `level`.
3. Update `AdmissionHistoryTable.css` to define accessible colors for both light and dark modes using these classes.

**Tech Stack:** React, CSS, TypeScript

---

### Task 1: Update API Service

**Files:**
- Modify: `src/services/seuilsApi.ts`

- [ ] **Step 1: Add 'level' to AdmissionDifficulty interface and update getAdmissionDifficulty**

```typescript
export interface AdmissionDifficulty {
  color: string;
  label: string;
  seuil: number;
  level: 'extreme' | 'hard' | 'medium' | 'easy' | 'very-easy';
}

// ... in getAdmissionDifficulty function:
export function getAdmissionDifficulty(seuil: number): AdmissionDifficulty {
  if (seuil > 40731) {
    return { level: 'extreme', color: '#1a1a1a', label: 'Inaccessible sans bonus', seuil };
  }
  if (seuil > 40600) {
    return { level: 'hard', color: '#dc2626', label: 'Difficilement accessible', seuil };
  }
  if (seuil > 40250) {
    return { level: 'medium', color: '#f97316', label: 'Moyennement accessible', seuil };
  }
  if (seuil > 38000) {
    return { level: 'easy', color: '#2563eb', label: 'Facilement accessible (secteur 1)', seuil };
  }
  return { level: 'very-easy', color: '#16a34a', label: 'Très facilement accessible', seuil };
}
```

- [ ] **Step 2: Commit changes**

```bash
git add src/services/seuilsApi.ts
git commit -m "refactor: add difficulty levels to seuilsApi"
```

### Task 2: Update Table Component

**Files:**
- Modify: `src/components/AdmissionHistoryTable.tsx`

- [ ] **Step 1: Apply CSS class instead of inline style**

```tsx
// Replace:
// style={difficulty ? { color: difficulty.color } : undefined}
// With:
className={`col-year${!hasValue ? ' col-year-empty' : ''}${difficulty ? ` difficulty-${difficulty.level}` : ''}`}
```

- [ ] **Step 2: Commit changes**

```bash
git add src/components/AdmissionHistoryTable.tsx
git commit -m "feat: use CSS classes for admission difficulty colors"
```

### Task 3: Update Styles

**Files:**
- Modify: `src/components/AdmissionHistoryTable.css`

- [ ] **Step 1: Define difficulty colors with dark mode support**

```css
.admission-history-table .difficulty-extreme { color: #1a1a1a; }
.admission-history-table .difficulty-hard { color: #dc2626; }
.admission-history-table .difficulty-medium { color: #ea580c; }
.admission-history-table .difficulty-easy { color: #2563eb; }
.admission-history-table .difficulty-very-easy { color: #16a34a; }

[data-theme="dark"] .admission-history-table .difficulty-extreme { color: #d8b4fe; } /* Purple for contrast */
[data-theme="dark"] .admission-history-table .difficulty-hard { color: #f87171; }
[data-theme="dark"] .admission-history-table .difficulty-medium { color: #fb923c; }
[data-theme="dark"] .admission-history-table .difficulty-easy { color: #60a5fa; }
[data-theme="dark"] .admission-history-table .difficulty-very-easy { color: #4ade80; }
```

- [ ] **Step 2: Commit changes**

```bash
git add src/components/AdmissionHistoryTable.css
git commit -m "style: add accessible difficulty colors for dark mode"
```

### Task 4: Verification

- [ ] **Step 1: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: PASS
