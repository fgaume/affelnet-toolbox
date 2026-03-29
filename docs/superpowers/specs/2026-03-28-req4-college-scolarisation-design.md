# REQ4 — Collège de scolarisation & Bonus IPS

## Résumé

Enrichir l'application avec deux nouvelles fonctionnalités :
1. **Saisie directe du collège de secteur** comme alternative à la recherche par adresse (onglets)
2. **Question de scolarisation** dans CollegeCard : l'élève est-il dans son collège de secteur ? Si non, saisie du collège de scolarisation avec affichage de l'IPS et du bonus Affelnet associé

## 1. Onglets de saisie

### Comportement

Deux onglets en haut de page remplacent le champ de saisie actuel :

- **"Par adresse"** (défaut) : comportement actuel inchangé — autocomplete adresse via api-adresse.data.gouv.fr
- **"Par collège"** : autocomplete locale sur la liste des collèges publics de Paris

### Onglet "Par collège"

- La liste des collèges est chargée une seule fois au montage de l'app via l'API data.education.gouv.fr (cf. skill `affelnet-liste-colleges-lycees`)
- Le filtrage est local (pas d'appel réseau à chaque frappe) : nom contient la saisie, insensible à la casse
- L'autocomplete n'affiche que le **nom** du collège (jamais l'UAI, invisible pour les parents/élèves)
- La sélection d'un collège déclenche directement `findLyceesDeSecteur(uai)`, en sautant les étapes CapGeo et findCollegeUAI
- Conséquence : pas d'adresse connue → la carte affiche l'itinéraire entre le collège de secteur et le lycée (au lieu de domicile → lycée)

## 2. Question de scolarisation

### Emplacement

Dans `CollegeCard`, directement sous le nom du collège de secteur et son lien vers la fiche établissement.

### Flux

1. **Question initiale** : "Êtes-vous scolarisé(e) dans ce collège ?" avec boutons Oui / Non
2. **Réponse "Oui"** :
   - Badge "Secteur · Scolarisation" sous le nom du collège
   - Fetch de l'IPS du collège de secteur (dataset Hugging Face `affelnet-paris-bonus-ips-colleges`)
   - Affichage du bloc IPS + jauge
3. **Réponse "Non"** :
   - Champ autocomplete pour saisir le collège de scolarisation (même composant `CollegeAutocomplete`)
   - Fond jaune pour distinguer visuellement du reste
   - Sélection → fetch IPS du collège de scolarisation
   - Affichage du bloc IPS + jauge pour ce collège

### Données IPS affichées

- **IPS du collège** (valeur numérique)
- **Bonus IPS Affelnet** (en points : 0, 400, 800 ou 1200)
- **Jauge de proximité aux seuils** (graphique)

Seul l'IPS du collège de scolarisation est affiché (pas de comparaison avec le collège de secteur).

## 3. Jauge IPS

### Design

Jauge horizontale compacte (max 340px) segmentée en 4 zones colorées :

| Zone | Couleur | Bonus | Condition |
|---|---|---|---|
| Gauche | Vert foncé (#166534) | 1200 | IPS < 106,7 |
| Centre-gauche | Vert (#22c55e) | 800 | 106,7 ≤ IPS < 117,1 |
| Centre-droit | Jaune (#eab308) | 400 | 117,1 ≤ IPS < 129,8 |
| Droite | Rouge (#ef4444) | 0 | IPS ≥ 129,8 |

- Les valeurs de bonus (1200, 800, 400, 0) sont affichées **dans** les segments (sans signe +)
- Un **marqueur vertical noir** positionné sur la jauge indique l'IPS exact du collège
- Un **triangle noir** (flèche CSS) collé juste sous la jauge pointe le marqueur
- La **valeur IPS** est affichée sous le triangle
- Les **seuils** (106,7 / 117,1 / 129,8) sont affichés au même niveau vertical que la valeur IPS

### Implémentation Recharts

Utiliser un `BarChart` horizontal avec 4 barres empilées (une par zone) et un composant custom pour le marqueur. Alternativement, un SVG custom dans un composant React dédié si Recharts est trop contraignant pour ce rendu.

### Seuils de référence (2026)

- 106,7 — moyenne nationale public/privé
- 117,1 — moyenne académique collèges publics
- 129,8 — moyenne académique publics et privés

## 4. Architecture

### Nouveaux fichiers

| Fichier | Rôle |
|---|---|
| `src/services/collegeApi.ts` | Charge la liste des collèges publics parisiens via data.education.gouv.fr |
| `src/hooks/useCollegeSearch.ts` | Charge la liste une fois au montage, expose `search(query)` (filtrage local) et `colleges` |
| `src/components/CollegeAutocomplete.tsx` + `.css` | Composant autocomplete réutilisable — reçoit liste filtrée, émet `onSelect(college)` |
| `src/components/IpsGauge.tsx` + `.css` | Jauge Recharts/SVG — reçoit `ips` et `bonus` en props |

### Modifications existantes

| Fichier | Changement |
|---|---|
| `src/types/index.ts` | Ajouter `College { uai: string; nom: string }`, `IpsData { ips: number; bonus: number }` |
| `src/App.tsx` | Système d'onglets (Par adresse / Par collège), gestion du mode d'entrée |
| `src/components/CollegeCard.tsx` | Question scolarisation Oui/Non, champ collège de scolarisation, bloc IPS + jauge |
| `src/hooks/useSectorSearch.ts` | Nouveau `searchByCollege(college: College)` qui saute CapGeo + findCollegeUAI |

### Flux de données

**Entrée par collège :**
1. Montage app → `useCollegeSearch` charge la liste via `collegeApi.fetchCollegeList()`
2. Saisie → filtrage local (nom contient query, case-insensitive)
3. Sélection → `useSectorSearch.searchByCollege({ uai, nom })` → `findLyceesDeSecteur(uai)` directement
4. Résultat dans CollegeCard (sans adresse, carte centrée sur le collège)

**IPS dans CollegeCard :**
1. Question "Scolarisé dans ce collège ?"
2. Oui → fetch IPS collège de secteur (dataset HF)
3. Non → CollegeAutocomplete → sélection → fetch IPS collège de scolarisation
4. Calcul bonus via seuils → affichage bloc IPS + jauge

### Cache

- Liste des collèges : chargée une fois, gardée en mémoire (state dans le hook)
- Données IPS : fetch à la demande (un collège à la fois, pas de cache nécessaire)

## 5. Comportements limites

- **Collège non trouvé dans la liste IPS** : afficher un message "Données IPS non disponibles pour ce collège"
- **Erreur réseau au chargement de la liste** : onglet "Par collège" affiche un message d'erreur, onglet "Par adresse" reste fonctionnel
- **Changement de réponse Oui→Non ou Non→Oui** : le bloc IPS se met à jour (ou disparaît le temps de la nouvelle saisie)
- **Mobile** : la jauge s'adapte à la largeur disponible (max 340px, min ~260px)
