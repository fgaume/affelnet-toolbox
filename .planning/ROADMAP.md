# Roadmap : Calculateur de Score Affelnet

## Phase 1 : Logique de Calcul & Services
**Plans:** 3 plans
- [ ] 01-logic-01-PLAN.md — Foundation - Types & API Service
- [ ] 01-logic-02-PLAN.md — Algorithm - Calculation Logic (TDD)
- [ ] 01-logic-03-PLAN.md — Persistence - Storage Extension

## Phase 2 : Interface Utilisateur
**Plans:** 3 plans
- [ ] 02-05-PLAN.md — GradeInputForm component
- [ ] 02-06-PLAN.md — ScoreDisplay component
- [ ] 02-07-PLAN.md — Integration in App.tsx

## Phase 3 : Intégration & Finitions
- [ ] **Tâche 8** : Mise à jour de `LyceeDetail.tsx` pour afficher les chances d'admission si un score est calculé.
- [ ] **Tâche 9** : Polissage visuel et accessibilité (Formulaires, Tableaux).
- [ ] **Tâche 10** : Vérification finale avec `react-doctor` et tests de bout en bout (Playwright).

---
## Critères de succès
- [ ] Un utilisateur peut saisir ses 12 notes annuelles.
- [ ] Le score total et le détail par champ sont affichés.
- [ ] Les données sont conservées après rechargement de la page.
- [ ] Tous les tests unitaires pour le calcul passent.
- [ ] L'application respecte les bonnes pratiques React (zéro erreur lint).
