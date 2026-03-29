# Requirements : Calculateur de Score Affelnet

## 1. Intégration UI
- [ ] Ajouter un onglet "Calculer son score" dans la navigation principale de `App.tsx`.
- [ ] Icône dédiée pour l'onglet (par exemple, une icône de calculatrice ou de bulletin).
- [ ] L'état de l'onglet doit être géré par `inputMode` ('address' | 'college' | 'score').

## 2. Formulaire de saisie des notes
- [ ] Afficher les 12 matières obligatoires (Français, Mathématiques, Histoire-Géo, LV1, LV2, EPS, Arts Plastiques, Éducation Musicale, SVT, Technologie, Physique-Chimie, EMC).
- [ ] Un seul champ par matière pour la **moyenne annuelle**.
- [ ] Contrôle de saisie : Notes entre 0 et 20.
- [ ] Gestion de l'absence d'EMC (si vide, on utilise la moyenne d'Histoire-Géo).

## 3. Service de calcul du score
- [ ] **Récupération des statistiques** : Récupérer mu/sigma pour l'année la plus récente via l'API Hugging Face.
- [ ] **Traitement des données** : 
    - [ ] Regrouper les 12 matières en 7 champs disciplinaires.
    - [ ] Calculer les notes harmonisées (H = 10 x [10 + (T - mu) / sigma]).
    - [ ] Appliquer les pondérations (x5 pour Français/Maths, x4 pour les autres).
    - [ ] Calculer le score scolaire final (Score bilan periodique x 2).

## 4. Affichage des résultats
- [ ] Afficher le **score total final** de manière proéminente.
- [ ] Proposer un **tableau détaillé** montrant pour chaque champ disciplinaire : 
    - [ ] La note brute calculée (moyenne des matières du champ).
    - [ ] La note harmonisée (H).
    - [ ] La contribution au score total.
- [ ] Inclure une explication rapide du calcul (harmonisation académique).

## 5. Persistance et Intégration
- [ ] Sauvegarder les notes saisies et le score calculé dans le `LocalStorage`.
- [ ] Charger automatiquement les notes sauvegardées à l'ouverture de l'onglet.
- [ ] Permettre la réinitialisation du formulaire.
- [ ] **Intégration Lycées** : Si un score est calculé, l'afficher dans les détails des lycées (`LyceeDetail`) pour permettre une comparaison visuelle avec les seuils d'admission (si disponibles).

## 6. Qualité et Performance
- [ ] Typage strict via TypeScript pour toutes les structures de données.
- [ ] Tests unitaires pour le service de calcul (vérifier les 5 étapes).
- [ ] Respect des principes de design de l'application (Vanilla CSS).
- [ ] Utilisation de `npx react-doctor@latest` pour validation finale.
