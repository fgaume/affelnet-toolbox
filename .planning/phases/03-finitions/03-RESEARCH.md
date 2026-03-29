# Phase 03: Intégration & Finitions - Research

**Researched:** 2025-05-15
**Domain:** React Integration, UI/UX Polish, E2E Testing
**Confidence:** HIGH

## Summary

Cette phase se concentre sur l'unification de l'expérience utilisateur en liant le score calculé aux chances d'admission dans les lycées de secteur, tout en assurant une qualité de code optimale via `react-doctor` et des tests Playwright.

**Primary recommendation:** Centraliser l'état du score dans `App.tsx` (déjà fait) et le propager à `CollegeCard` puis `LyceeDetail` pour permettre une comparaison dynamique avec les seuils d'admission.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-doctor | 0.0.30 | Diagnostic React | Outil ultra-rapide (oxlint) pour détecter les anti-patterns et fuites de performance. |
| @playwright/test | ^1.58.2 | Tests E2E | Standard industriel pour tester les flux utilisateurs complets. |

## Architecture Patterns

### Intégration du Score dans LyceeDetail
Le composant `LyceesIndicateurs` (dans `LyceeDetail.tsx`) doit être étendu pour accepter un `userScore` optionnel.
1. **Source de vérité :** Le score provient de `App.tsx` (via le hook `useSectorSearch` ou l'état local).
2. **Comparaison :** Utiliser `fetchSeuils` de `seuilsApi.ts` pour récupérer les minima de l'année précédente.
3. **Logique de calcul :** `Chances = (UserScore >= Seuil)`.

### Harmonisation CSS
Il existe une divergence entre `index.css` (variables comme `--color-text-primary`) et les nouveaux composants de score (`--text-primary`). Une passe de refactoring est nécessaire pour utiliser les variables définies dans `:root`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Calcul de probabilité | Modèle complexe | `seuilsApi.ts` | La comparaison binaire avec le seuil N-1 est l'indicateur le plus fiable pour Affelnet. |
| Linter React | Custom ESLint rules | `react-doctor` | Détecte spécifiquement les problèmes de performance et les hooks inutiles que ESLint ignore. |

## Common Pitfalls

### Pitfall 1: Incohérence des variables CSS
**What goes wrong:** Le mode sombre ne s'applique pas correctement aux formulaires de score.
**Why it happens:** Utilisation de variables hardcodées ou de noms de variables non standard dans `GradeInputForm.css`.
**How to avoid:** Utiliser exclusivement les variables définies dans `index.css`.

### Pitfall 2: Stale Score Data
**What goes wrong:** L'utilisateur change une note mais le badge de chance d'admission dans la fiche lycée ne se met pas à jour.
**How to avoid:** S'assurer que le score est passé par props et non lu directement depuis le localStorage dans les composants profonds.

## Code Examples

### Comparaison Score / Seuil
```typescript
// Pattern recommandé pour LyceeDetail.tsx
const threshold = seuils.get(lycee.uai);
const chance = userScore && threshold ? (userScore >= threshold ? 'Élevée' : 'Faible') : 'Inconnue';
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright |
| Command | `npm run test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| ADM-01 | Affichage chances admission | E2E | `npx playwright test tests/e2e/score-calculation.spec.ts` |
| PERF-01 | Zero erreurs react-doctor | Lint | `npx react-doctor@latest .` |

## Sources
- `src/services/seuilsApi.ts` : Logique de difficulté et seuils.
- `src/App.tsx` : Gestion de l'état global du score.
- Documentation `react-doctor` (Aiden Bai).
