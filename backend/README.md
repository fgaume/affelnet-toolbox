# Backend Affelnet Paris

Service backend Python (FastAPI) qui réceptionne les contributions textuelles et fichiers des utilisateurs de l'application "Affelnet Paris", les nettoie, en extrait les données utiles, et consolide des datasets globaux (seuils d'admission, notes harmonisées, statistiques académiques).

Ce backend est piloté par un ensemble d'exigences (REQs) décrites dans le dossier [`../backlog/`](../backlog/). Cette page synthétise les exigences en lien avec le backend et son écosystème (script offline, datasets Hugging Face).

## Vue d'ensemble du backlog

Le dossier `../backlog/` contient l'ensemble des exigences fonctionnelles du projet. Les REQs ci-dessous sont celles qui concernent **directement** le backend ou un script Python associé :

| REQ | Titre | Périmètre | Statut |
|-----|-------|-----------|--------|
| REQ10 | Upload de documents | Backend (endpoint upload) | Spécifié |
| REQ11 | Parser fiche-barème | Backend (parsing + consolidation seuils) | Spécifié |
| REQ12 | Parser notes harmonisées | Backend (routage + consolidation CSV) | Spécifié |
| REQ13 | Script calcul stats | Script CLI offline + Hugging Face | Spécifié |

Les autres REQs (REQ1 à REQ9, REQ3b, RécupérationEffectifsSeconde) sont des exigences **frontend** (React) et ne concernent pas ce backend. Elles sont listées plus bas pour mémoire.

---

## REQ10 — Upload de documents

**Fichier source** : [`../backlog/REQ10-UploadDocuments.md`](../backlog/REQ10-UploadDocuments.md)

**Objectif** : permettre aux utilisateurs de contribuer à l'application en envoyant :

- des fichiers PDF ou des images (photos),
- du texte collé directement (copier/coller depuis un tableau PDF, Aperçu macOS, screenshot, etc.),
- éventuellement une image collée (clipboard iPhone, macOS, Windows 11).

**Côté backend** : exposer un endpoint Python qui reçoit ces données (fichier ou texte brut) et les stocke pour traitement ultérieur (REQ11/REQ12).

**Implémentation actuelle** (`main.py`) : endpoint FastAPI avec :

- limite de taille : 10 Mo
- extensions autorisées : `.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.txt`
- stockage local dans `uploads/`
- CORS ouvert pour POST

---

## REQ11 — Parser fiche-barème (extraction des seuils d'admission)

**Fichier source** : [`../backlog/REQ11-ParserFicheBareme.md`](../backlog/REQ11-ParserFicheBareme.md)

**Objectif** : à partir du texte brut d'une fiche-barème Affelnet (résultats détaillés des vœux d'un élève), extraire le couple `(nom de lycée, seuil d'admission)` pour chaque vœu, puis consolider ces seuils dans un fichier JSON global.

**Champs présents pour chaque vœu** :

1. rang du vœu (1, 2, 3, …)
2. bonus de secteur (0, 32640, 17760, 16800)
3. bonus boursier (0 ou 600)
4. score scolaire
5. score total du vœu
6. **nom du lycée visé**
7. type de formation (ex. `2NDE GENERALE ET TECHNOLOGIQUE`)
8. décision d'affectation (vide ou `Affecté(e)`)
9. **seuil d'admission du lycée visé**

Les valeurs **6** (nom du lycée) et **9** (seuil) sont les seules données utiles à consolider.

**Difficulté principale** : les copier/coller depuis un PDF introduisent des sauts de ligne intempestifs. Le texte reçu doit être nettoyé pour reconstituer une ligne par vœu.

**Exemple — entrée brute** :

```
1 0 0 0.000 0.000 0.000 HENRI IV
2NDE GENERALE ET
TECHNOLOGIQUE Affecté(e) 0
2 32640 0 600 3290.823 41330.823 VICTOR HUGO
2NDE GENERALE ET
TECHNOLOGIQUE
40738.994
...
```

**Exemple — sortie nettoyée attendue** :

```
1 0 0 0.000 0.000 0.000 HENRI IV 2NDE GENERALE ET TECHNOLOGIQUE Affecté(e) 0
2 32640 0 600 3290.823 41330.823 VICTOR HUGO 2NDE GENERALE ET TECHNOLOGIQUE 40738.994
...
```

**Pipeline de traitement** :

1. À la réception de l'upload, **nettoyer** le texte pour produire une ligne cohérente par vœu.
2. Sauvegarder le contenu nettoyé.
3. **Extraire** les couples `(lycée, seuil)` de chaque ligne.
4. Faire la correspondance `nom du lycée → UAI` à l'aide du skill `affelnet-uai`.
5. **Consolider** dans un JSON global en faisant un `append` du seuil dans le champ liste `seuils` du lycée correspondant.

**Fichier JSON de base** : [`../backlog/affelnet-paris-seuils-admission-lycees.json`](../backlog/affelnet-paris-seuils-admission-lycees.json) — à dupliquer initialement, puis enrichir au fil des uploads.

**Tests** : produire un test avec l'exemple ci-dessus.

---

## REQ12 — Parser des notes harmonisées (routage texte)

**Fichier source** : [`../backlog/REQ12-ParserNotesHarmonisees.md`](../backlog/REQ12-ParserNotesHarmonisees.md)

**Objectif** : un upload textuel peut être de **deux types**. Le backend doit faire la distinction et router le traitement.

**Type 1 — liste de notes harmonisées** (champs disciplinaires, note brute /20, note harmonisée ~100) :

```
ARTS               14.00   97.169
EPS                15.00  102.069
FRANCAIS           11.33   96.997
HISTOIRE-GEO       11.33   95.979
LANGUES VIVANTES   12.67   98.295
MATHEMATIQUES      11.33   98.611
SCIENCES-TECHNO-DP 12.78   99.496
```

**Type 2 — fiche-barème** (cf. REQ11).

**Logique** :

1. **Détecter** le type d'upload (notes harmonisées vs. fiche-barème).
2. Si **notes harmonisées** : consolider dans un CSV global avec les colonnes :
   - `timestamp` (concaténation `année,mois,jour,heure,min,sec,msecs` en chiffres)
   - `nom du champ`
   - `note brute`
   - `note harmonisée`
3. Sinon : appliquer le pipeline REQ11.

**Sortie** : `notes-harmonisees.csv` — fichier global qui s'enrichit à chaque upload de type 1.

---

## REQ13 — Script de calcul des statistiques académiques

**Fichier source** : [`../backlog/REQ13-ScriptCalculStats.md`](../backlog/REQ13-ScriptCalculStats.md)

**Important** : ce script est exécuté **manuellement** (ou via crontab) en CLI sur la machine locale. Il ne fait **pas partie** du backend FastAPI. Il doit être placé dans un nouveau dossier `scripts/` à la racine du repo.

**Entrée** : `notes-harmonisees.csv` (produit par le backend, REQ12), qui s'enrichit régulièrement.

**Algorithme** : pour chaque champ disciplinaire, faire une **régression linéaire** :

- `X` = note brute
- `Y` = note harmonisée
- coefficient directeur `a`, ordonnée à l'origine `b`

En déduire la **moyenne** et l'**écart-type** académiques :

```
ecart-type = 1 / (10 * a)
moyenne    = -[10 + (b / (10 * a))]
```

**Fichier de sortie** : `affelnet-paris-statistiques-champs-disciplinaires.json`

```json
[
  {
    "annee": 2026,
    "champ": "MATHEMATIQUES",
    "moyenne": 11.985,
    "ecart-type": 3.82599,
    "precision": 3,
    "mis_a_jour": "2026-05-03T11:50:00Z"
  }
]
```

- `precision` = nombre de mesures utilisées pour la régression
- `mis_a_jour` = date/heure de dernière mise à jour du record

**Logique d'exécution** :

1. Pour chaque champ disciplinaire, comparer le nombre de mesures dans `notes-harmonisees.csv` avec la `precision` actuelle dans le JSON.
2. Si **plus de mesures disponibles** : refaire la régression et mettre à jour le record.
3. Si le JSON a été modifié : **déployer** la mise à jour sur **Hugging Face** via le skill `huggingface-datasets`.

**Données de test** (deux séries fournies dans le backlog) :

```
Série 1                            Série 2
ARTS               14.00  97.169   ARTS               15.00 102.269
EPS                15.00 102.069   EPS                16.00 107.165
FRANCAIS           11.33  96.997   FRANCAIS           13.00 102.108
HISTOIRE-GEO       11.33  95.979   HISTOIRE-GEO       13.00 101.242
LANGUES VIVANTES   12.67  98.295   LANGUES VIVANTES   13.67 101.616
MATHEMATIQUES      11.33  98.611   MATHEMATIQUES      14.00 105.369
SCIENCES-TECHNO-DP 12.78  99.496   SCIENCES-TECHNO-DP 14.00 103.845
```

---

## Données de référence

### `affelnet-paris-seuils-admission-lycees.json`

Fichier de base des seuils d'admission présent dans `../backlog/`. Sert de **point de départ** pour la consolidation des seuils extraits via REQ11. Doit être dupliqué une fois, puis enrichi au fil des uploads.

---

## REQs hors périmètre backend (frontend uniquement)

Pour mémoire, le backlog contient également les REQs suivants qui ne concernent **pas** ce backend :

| REQ | Titre | Périmètre |
|-----|-------|-----------|
| REQ1 | Recherche secteur (collège + lycées à partir d'une adresse) | Frontend React |
| REQ2 | Ajout d'infos lycées (graphiques niveau scolaire, IPS) | Frontend React |
| REQ3 | Collèges en concurrence | Frontend React |
| REQ3b | Cartographie du secteur (Leaflet) | Frontend React |
| REQ4 | Saisie collège de scolarisation | Frontend React |
| REQ5 | Calcul du score scolaire Affelnet | Frontend React |
| REQ6 | Historique des seuils d'admission | Frontend React |
| REQ7 | Jauge d'admission (lycées de secteur) | Frontend React |
| REQ8 | Message préliminaire (disclaimer) | Frontend React |
| REQ9 | Affichage des sources de données | Frontend React |
| RécupérationEffectifsSeconde | Effectifs 2nde via fiche-établissement | Frontend / scraping |

---

## Stack technique du backend

- **Python** ≥ 3.11, gestion d'env et dépendances via `uv`
- **FastAPI** + **Uvicorn** pour l'API HTTP
- **pytest** pour les tests
- **Hugging Face Hub** pour la publication de datasets (REQ13)

## Lancement local

```bash
cd backend
uv venv
uv pip install -e .
uv run uvicorn main:app --reload
```

## Tests

```bash
cd backend
uv run pytest
```

---

## Déploiement sur la VM Freebox

Le backend est déployé en tant que **service OpenRC robuste** sur la VM Alpine Linux (ARM64) hébergée par la Freebox Delta. Le service redémarre automatiquement après un boot, un `pause/resume` ou un `restart` de la VM.

### Cible de déploiement

| Élément | Valeur |
|---|---|
| Hôte | `192.168.0.8` (VM Alpine 3.20, aarch64) |
| Utilisateur SSH | `freebox` (clé `~/.ssh/id_ed25519`) |
| Dossier distant | `/home/freebox/affelnet-api/` |
| Port interne | `127.0.0.1:5000` (uvicorn) |
| Reverse proxy | Caddy → `https://fge.freeboxos.fr/` |
| Init system | OpenRC (service `affelnet-api`) |
| Logs | `/var/log/affelnet-api.{log,err}` |

> L'ancien service de test `hello-api` (port 5000) est **automatiquement supprimé** lors du premier déploiement (cf. étape 1 ci-dessous). Le backend Affelnet devient ainsi le seul service exposé sur `fge.freeboxos.fr`.

### Fichiers de déploiement

Tous regroupés dans [`deploy/`](deploy/) :

| Fichier | Rôle |
|---|---|
| `deploy.sh` | Script de déploiement (sync code + venv + service + Caddy hint) |
| `affelnet-api.initd` | Script init OpenRC à installer dans `/etc/init.d/` sur la VM |
| `Caddyfile.snippet` | Bloc de config Caddy à ajouter dans `/etc/caddy/Caddyfile` |

### Première installation (déploiement complet)

Depuis la machine de dev :

```bash
cd backend/deploy
./deploy.sh
```

Le script enchaîne automatiquement :

1. **Suppression du legacy `hello-api`** : `service hello-api stop`, `rc-update del`, suppression de `/etc/init.d/hello-api` et du dossier `/home/freebox/api/`. Idempotent (no-op si déjà supprimé).
2. **Vérification SSH** vers `freebox@192.168.0.8`.
3. **`rsync`** du code vers `/home/freebox/affelnet-api/` (exclut `.venv/`, `__pycache__/`, `uploads/*`).
4. **Installation Python** : `doas apk add python3` + `uv venv --python $(which python3)` + `uv sync` (contrainte ARM64 : `uv` ne peut pas télécharger son propre Python).
5. **Installation du service** : copie de `affelnet-api.initd` dans `/etc/init.d/` puis `rc-update add affelnet-api default` (le service sera lancé à chaque boot).
6. **(Re)démarrage** : `doas service affelnet-api restart`.
7. **Vérification Caddy** : alerte si la config n'est pas un `reverse_proxy` direct vers `127.0.0.1:5000`.
8. **Smoke test** local sur `http://127.0.0.1:5000/docs` depuis la VM.

Pour ne lancer que la suppression du legacy (sans redéployer) :

```bash
./deploy.sh --remove-legacy
```

### Configuration Caddy (étape manuelle, une seule fois)

Remplacer le contenu de `/etc/caddy/Caddyfile` sur la VM par :

```caddyfile
fge.freeboxos.fr {
    reverse_proxy 127.0.0.1:5000
}
```

Puis recharger sans downtime :

```bash
doas caddy reload --config /etc/caddy/Caddyfile
```

> Si l'ancien Caddyfile contenait un bloc `handle_path /affelnet/* { … }` (configuration intermédiaire d'un déploiement précédent), il faut le retirer : le routage est désormais direct vers le seul service Affelnet.

### Mises à jour incrémentales (code uniquement)

Pour redéployer après une modification du code (sans toucher au service ni à Caddy) :

```bash
./deploy.sh --code-only
```

Cela synchronise les fichiers, met à jour les dépendances si `pyproject.toml` a changé, et redémarre le service.

### Vérification de l'état

```bash
./deploy.sh --status
# ou directement sur la VM :
ssh freebox@192.168.0.8 'doas service affelnet-api status'
ssh freebox@192.168.0.8 'tail -f /var/log/affelnet-api.err'
```

### URL publique

Une fois Caddy configuré et le service démarré :

- Documentation OpenAPI : `https://fge.freeboxos.fr/docs`
- Endpoint upload : `POST https://fge.freeboxos.fr/upload`

### Robustesse / persistance après pause/resume/restart

Le service est résistant grâce à :

- **`rc-update add affelnet-api default`** : OpenRC le démarre automatiquement au runlevel `default` à chaque boot de la VM, donc après un `restart` ou un `pause/resume` qui entraîne une reprise de l'OS.
- **`command_background=true` + `pidfile`** dans le script init : le démon est correctement supervisé (start/stop/restart fonctionnels).
- **`depend() { need net }`** : le service attend que le réseau soit disponible avant de démarrer.
- **`start_pre`** : crée à l'avance les dossiers `uploads/` et les fichiers de log avec les bons permissions.
- **Logs persistants** dans `/var/log/affelnet-api.{log,err}` pour le diagnostic post-redémarrage.

### Variables d'environnement (override)

Le script `deploy.sh` accepte plusieurs overrides :

```bash
VM_HOST=192.168.0.8 \
VM_USER=freebox \
SSH_KEY=~/.ssh/id_ed25519 \
REMOTE_DIR=/home/freebox/affelnet-api \
SERVICE_PORT=5000 \
DOMAIN=fge.freeboxos.fr \
./deploy.sh
```
