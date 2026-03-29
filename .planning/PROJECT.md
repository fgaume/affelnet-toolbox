# Projet : Affelnet Score Scolaire

## Contexte
L'application "Mon Collège de Secteur" permet actuellement de trouver son collège de secteur à Paris et de visualiser les lycées associés (Secteur 1, 2, 3) avec leurs indicateurs (IPS, taux de réussite, etc.).

Cette nouvelle phase vise à intégrer un calculateur de score scolaire Affelnet directement dans l'application. Ce score est crucial pour l'affectation en lycée à Paris et se calcule à partir des moyennes annuelles des matières suivies en classe de 3ème.

## Objectif
Permettre aux utilisateurs de saisir leurs moyennes annuelles dans un formulaire dédié et d'obtenir leur score scolaire Affelnet détaillé (par champ disciplinaire) et final. Ce score doit être persisté localement pour être réutilisé dans les résultats de recherche de lycées afin d'estimer les chances d'admission.

## Valeur ajoutée
- **Transparence** : Permettre aux familles de comprendre comment leur score est constitué.
- **Aide à la décision** : Intégrer le score dans la vue des lycées pour comparer aux seuils d'admission des années précédentes.
- **Autonomie** : Fournir un outil simple et fiable basé sur les règles officielles du Rectorat de Paris (2026).

## Tech Stack (Rappel)
- **Frontend** : React (TypeScript), Vite
- **Styling** : Vanilla CSS
- **Calculs** : Algorithme Affelnet 2026 (via skill `affelnet-score-scolaire`)
- **Données** : Statistiques académiques (mu/sigma) via Hugging Face Dataset
- **Persistance** : LocalStorage
