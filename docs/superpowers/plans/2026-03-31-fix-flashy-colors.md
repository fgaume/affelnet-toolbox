# Fix Flashy Background Colors in Dark Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix flashy background colors in dark mode for the school selection component and the IPS gauge component by using adaptive CSS variables.

**Architecture:** Replace hardcoded hex colors in `src/components/CollegeCard.css` with semantic CSS variables defined in `src/index.css` (`--color-bg-subtle`, `--color-warning-bg`, `--color-success-bg`, etc.).

**Tech Stack:** React, CSS

---

### Task 1: Update Scolarisation Other Component Background

**Files:**
- Modify: `src/components/CollegeCard.css`

- [ ] **Step 1: Replace hardcoded yellow colors with variables**

```css
.scolarisation-other {
  background: var(--color-warning-bg);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
}

.scolarisation-other-label {
  margin: 0 0 8px;
  font-weight: 600;
  color: var(--color-warning-text);
}

.scolarisation-badge-other {
  background: var(--color-warning-bg);
  color: var(--color-warning-text);
  border: 1px solid var(--color-border);
}
```

- [ ] **Step 2: Commit changes**

```bash
git add src/components/CollegeCard.css
git commit -m "style: fix flashy background for scolarisation other component"
```

### Task 2: Update IPS Block Component Background

**Files:**
- Modify: `src/components/CollegeCard.css`

- [ ] **Step 1: Replace hardcoded green colors with variables**

```css
.ips-block {
  background: var(--color-success-bg);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  margin-top: 12px;
}

.ips-label {
  font-size: 13px;
  color: var(--color-success-text);
  font-weight: 600;
}

.ips-number {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-success-text);
  margin-top: 4px;
}
```

- [ ] **Step 2: Update scolarisation-badge styles for better contrast**

```css
.scolarisation-badge {
  display: inline-block;
  background: var(--color-primary-subtle);
  color: var(--color-primary-dark);
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--color-border);
}
```

- [ ] **Step 3: Commit changes**

```bash
git add src/components/CollegeCard.css
git commit -m "style: fix flashy background for IPS block component"
```

### Task 3: Verification

- [ ] **Step 1: Run build to ensure no errors**

Run: `npm run build`
Expected: PASS

- [ ] **Step 2: Run lint to ensure no style regressions**

Run: `npm run lint`
Expected: Only pre-existing errors (or PASS)
