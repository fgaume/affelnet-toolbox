# Affelnet Toolbox Paris

[![React Doctor](https://www.react.doctor/share/badge?p=affelnet-paris&s=99&w=4&f=1)](https://www.react.doctor/share?p=affelnet-paris&s=99&w=4&f=1)

Une application web interactive conçue pour aider les familles et les élèves parisiens à comprendre et anticiper leur affectation en lycée public via le système Affelnet.

L'outil permet de :
- Trouver ses lycées de secteur à partir de son adresse parisienne.
- Calculer précisément son "score scolaire" (barème) à partir de ses moyennes (ou celles de l'année précédente).
- Consulter l'historique des seuils d'admission des lycées parisiens pour estimer ses chances d'affectation.
- Découvrir les indicateurs de performance, l'IPS (Indice de Position Sociale) et les effectifs des différents lycées et collèges.
- Visualiser la sectorisation sur une carte interactive.

## Fonctionnalités Principales

- 📍 **Recherche par adresse :** Identification automatique du collège de secteur et des lycées rattachés.
- 🧮 **Calculateur de barème :** Saisie des notes par matière pour simuler le score Affelnet (prenant en compte le bonus IPS du collège d'origine).
- 📊 **Données historiques et statistiques :** Affichage des seuils d'admission des années précédentes, taux de mention au bac, et composition sociale (IPS).
- 🗺 **Cartographie :** Visualisation géographique des établissements scolaires en concurrence.
- 💾 **Historique et mise en cache :** Sauvegarde locale des recherches et des configurations.

## Architecture & Technologies

Ce projet est une application front-end moderne (SPA) construite avec :
- **React 18** avec **TypeScript**
- **Vite** pour la compilation et le développement rapide
- **Vanilla CSS** pour le style (sans framework externe, pour une personnalisation totale)
- **Hugging Face Datasets** pour le stockage et la distribution de données statistiques statiques et de modèles
- API Open Data (data.education.gouv.fr, API Adresse, API Paris)

### Structure du projet

- `src/components/` : Composants UI (Formulaires, Graphiques, Tableaux, Modal...).
- `src/hooks/` : Hooks React personnalisés gérant la logique métier et l'appel aux API.
- `src/services/` : Intégration avec les différentes API (Rectorat, Mairie de Paris, Datasets HuggingFace).
- `src/types/` : Définitions TypeScript pour assurer le typage strict des données métier.
- `tests/e2e/` : Tests End-to-End utilisant **Playwright**.

## Installation et Développement local

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/fgaume/affelnet-toolbox.git
   cd affelnet-no-socle
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Lancer le serveur de développement**
   ```bash
   npm run dev
   ```
   L'application sera accessible sur `http://localhost:5173`.

4. **Lancer les tests E2E**
   ```bash
   npx playwright test
   ```

## Sources de données

L'application consolide des informations provenant de multiples sources publiques officielles et de jeux de données retravaillés :
- **Base Adresse Nationale** pour le géocodage.
- **CapGeo Paris (DASCO)** et **Rectorat de Paris (ArcGIS)** pour la carte scolaire.
- **Ministère de l'Éducation Nationale** pour l'IPS, les effectifs et les indicateurs de résultats.
- **Hugging Face (`fgaume/affelnet-paris-*`)** pour l'hébergement des seuils d'admission historiques et des statistiques d'harmonisation de l'académie de Paris.

L'intégralité des sources de données est consultable directement depuis l'interface de l'application.

## Code Source

Le code source du projet est hébergé sur GitHub : [https://github.com/fgaume/affelnet-toolbox](https://github.com/fgaume/affelnet-toolbox)

## Licence

Ce projet est open source. Les jeux de données publics utilisés respectent les termes de la Licence Ouverte / Open Licence de l'État français.
