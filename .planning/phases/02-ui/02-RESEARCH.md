# Phase 2: 'Interface Utilisateur' - Research

**Researched:** 2025-05-24
**Domain:** React UI / CSS / Form Design / Data Visualization
**Confidence:** HIGH

## Summary

Phase 2 focuses on building the user interface for the grade entry and score calculation features. The project currently has a solid foundation for sector college searching, with a well-defined CSS variable system for theming (light/dark) and established component patterns.

**Primary recommendation:** Build the grade entry form grouped by disciplinary field (7 groups) to maintain logical coherence with the calculation algorithm. Leverage existing CSS variables in `index.css` and follow the `Component.tsx` + `Component.css` pattern already established in `src/components/`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.0 | Frontend framework | Current project standard |
| Recharts | 3.8.0 | Data Visualization | Already used for IPS and school capacity charts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| custom-css | — | Styling | The project uses vanilla CSS with CSS variables in `index.css` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom CSS | Tailwind / MUI | Higher developer overhead to integrate; current custom CSS is already well-organized and thematic. |

## Architecture Patterns

### Recommended Project Structure
Follow existing patterns in `src/components/`:
```
src/components/
├── GradeInputForm.tsx     # Main form container
├── GradeInputForm.css     # Form styles
├── ScoreDisplay.tsx       # Results visualization
├── ScoreDisplay.css       # Results styles
└── index.ts               # Export new components
```

### Pattern 1: Grouped Input Form
**What:** Grouping 12 subjects into 7 disciplinary fields (Français, Maths, Histoire-Géo, etc.).
**When to use:** To help users navigate the long form (12 inputs) and mirror the calculation logic.
**Example:**
```typescript
// Inspired by src/services/scoreCalculation.ts
const FIELD_MAPPING: Record<DisciplinaryField, Subject[]> = {
  FRANCAIS: ['FRANCAIS'],
  MATHEMATIQUES: ['MATHEMATIQUES'],
  HISTOIRE_GEO: ['HISTOIRE_GEO', 'EMC'],
  LANGUES_VIVANTES: ['LV1', 'LV2'],
  // ... other fields
};
```

### Pattern 2: State-Driven Navigation
**What:** Extending the existing tab logic in `App.tsx`.
**When to use:** To switch between "Par adresse", "Par collège", and "Calculer mon score".
**Example (from src/App.tsx):**
```tsx
const [inputMode, setInputMode] = useState<InputMode>('address');
// Proposed update:
type InputMode = 'address' | 'college' | 'score';
```

### Anti-Patterns to Avoid
- **Inline Styling:** Avoid `style={{...}}`. Always use `className` and separate CSS files using `var(--color-...)` for theme support.
- **Global State for Form:** Don't use Redux/Zustand unless complexity increases. Local state in `GradeInputForm` + persistence to `localStorage` (via `storage.ts`) is sufficient.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Visualization | Custom SVG Charts | Recharts | Already integrated and used in `EffectifsDonut.tsx`. |
| Persistence | Manual LocalStorage | `src/services/storage.ts` | Centralized logic with versioning is already implemented. |
| Icons | Custom Icon System | Inline SVGs | Project standard for `SearchIcon`, `LocationIcon`, etc. |

## Common Pitfalls

### Pitfall 1: Long form fatigue
**What goes wrong:** User is overwhelmed by 12 inputs at once.
**Prevention strategy:** Use logical grouping, clear labels, and visual feedback for completed fields.

### Pitfall 2: Confusing Score Harmonization
**What goes wrong:** User sees "Score = 150" for a field and thinks it's a grade out of 20.
**Prevention strategy:** Clearly label these as "Points" or "Score Harmonisé" and provide a total score prominently. Use tooltips or info badges if possible.

### Pitfall 3: Mobile Accessibility
**What goes wrong:** `type="number"` inputs on mobile might show a keyboard without decimal support or have tiny touch targets.
**Prevention strategy:** Test on mobile; ensure inputs are full-width on small screens with `inputmode="decimal"`.

## Code Examples

### Form Field Grouping
```tsx
// Pattern for GradeInputForm.tsx
{DISCIPLINARY_FIELDS.map(field => (
  <section key={field} className="field-group">
    <h3>{field.replace('_', ' ')}</h3>
    <div className="grid-inputs">
      {FIELD_MAPPING[field].map(subject => (
        <GradeField 
          key={subject}
          subject={subject}
          value={grades[subject]}
          onChange={handleGradeChange}
        />
      ))}
    </div>
  </section>
))}
```

### Score Breakdown Table
```tsx
// Pattern for ScoreDisplay.tsx
<table>
  <thead>
    <tr>
      <th>Champ</th>
      <th>Moyenne</th>
      <th>Points</th>
    </tr>
  </thead>
  <tbody>
    {Object.entries(details).map(([field, detail]) => (
      <tr key={field}>
        <td>{field}</td>
        <td>{detail.rawAverage.toFixed(2)}</td>
        <td>{detail.contribution.toFixed(0)}</td>
      </tr>
    ))}
  </tbody>
</table>
```

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| React | UI Components | ✓ | 19.2.0 | — |
| Recharts | Visualization | ✓ | 3.8.0 | — |
| Vitest | Logic Testing | ✓ | 4.1.1 | — |
| Playwright | E2E Testing | ✓ | 1.58.2 | — |

**Missing dependencies with no fallback:**
- **React Testing Library / JSDOM:** Component unit tests cannot be run currently. Only E2E tests (Playwright) or Service tests (Vitest) are possible.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright + Vitest |
| Config file | `playwright.config.ts` |
| Quick run command | `npm run test` (Vitest) |
| Full suite command | `npm run test:e2e` (Playwright) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-05 | Grade Entry (12 subjects) | E2E | `npx playwright test tests/e2e/score-ui.spec.ts` | ❌ Wave 0 |
| REQ-05 | Score Calculation Display | E2E | `npx playwright test tests/e2e/score-ui.spec.ts` | ❌ Wave 0 |
| REQ-05 | Persistence of Grades | E2E | `npx playwright test tests/e2e/score-ui.spec.ts` | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] `tests/e2e/score-ui.spec.ts` — New E2E tests for the Score tab.
- [ ] Optional: Add `@testing-library/react` for component unit tests if TDD for components is desired.

## Sources

### Primary (HIGH confidence)
- `src/App.tsx` & `src/App.css`: Analyzed existing tab and layout patterns.
- `src/index.css`: Analyzed theming variables.
- `src/services/scoreCalculation.ts`: Analyzed disciplinary field mapping.
- `src/services/storage.ts`: Verified persistence methods for grades/score.

### Secondary (MEDIUM confidence)
- `src/components/CollegeCard.tsx`: Analyzed data display and sectioning patterns.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Core libraries are explicitly listed in package.json.
- Architecture: HIGH - Follows established patterns in the codebase.
- Pitfalls: MEDIUM - Based on common React form handling experiences.

**Research date:** 2025-05-24
**Valid until:** 2025-06-24
