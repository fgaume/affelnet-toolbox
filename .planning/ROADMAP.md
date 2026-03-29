# Roadmap : Calculateur de Score Affelnet

## Phase 1 : Logique de Calcul & Services
- [ ] **Tâche 1** : Définition des types TypeScript (Matières, Champs Disciplinaires, Scores).
- [ ] **Tâche 2** : Service `scoreApi.ts` pour récupérer mu/sigma de Hugging Face.
- [ ] **Tâche 3** : Service `scoreCalculation.ts` implémentant l'algorithme d'harmonisation (TDD).
- [ ] **Tâche 4** : Extension de `storage.ts` pour gérer les notes et les scores persistés.

## Phase 2 : Interface Utilisateur
- [ ] **Tâche 5** : Composant `GradeInputForm.tsx` (Formulaire de saisie des 12 notes).
- [ ] **Tâche 6** : Composant `ScoreDisplay.tsx` (Score total + Tableau détaillé).
- [ ] **Tâche 7** : Intégration de l'onglet "Score" dans `App.tsx` (Navigation et état).

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
