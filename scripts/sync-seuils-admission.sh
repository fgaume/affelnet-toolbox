#!/usr/bin/env bash
# Récupère les seuils d'admission depuis la VM Freebox et met à jour le dataset
# HuggingFace `fgaume/affelnet-paris-seuils-admission-lycees`.
#
# Pipeline :
#   1. scp du JSON depuis la VM Freebox vers le clone local du dataset HF
#   2. diff pour vérifier ce qui a changé (abandon si rien de nouveau)
#   3. hf upload vers HuggingFace (sauf en --dry-run)
#
# Pré-requis :
#   - Accès SSH à la VM Freebox (192.168.0.8, user "freebox", clé id_ed25519)
#   - CLI `hf` installée et authentifiée (`hf auth whoami`)
#   - Clone local du dataset dans ~/Code/college/hf/affelnet-paris-seuils-admission-lycees
#
# Usage :
#   ./sync-seuils-admission.sh              # récupère + pousse vers HuggingFace
#   ./sync-seuils-admission.sh --dry-run    # récupère + montre le diff, sans pousser
set -euo pipefail

# --- Configuration -----------------------------------------------------------
VM_HOST="${VM_HOST:-192.168.0.8}"
VM_USER="${VM_USER:-freebox}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
REMOTE_DIR="${REMOTE_DIR:-/home/freebox/affelnet-api/data}"

JSON_FILENAME="affelnet-paris-seuils-admission-lycees.json"
HF_REPO_ID="fgaume/affelnet-paris-seuils-admission-lycees"
HF_DATASET_DIR="${HF_DATASET_DIR:-$HOME/Code/college/hf/affelnet-paris-seuils-admission-lycees}"

REMOTE_FILE="${REMOTE_DIR}/${JSON_FILENAME}"
LOCAL_FILE="${HF_DATASET_DIR}/${JSON_FILENAME}"

SSH_OPTS=(-i "${SSH_KEY}" -o StrictHostKeyChecking=accept-new)
SSH_TARGET="${VM_USER}@${VM_HOST}"

# --- Helpers -----------------------------------------------------------------
log()  { printf '\033[1;34m[seuils]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

DRY_RUN=""
case "${1:-}" in
    --dry-run) DRY_RUN="yes" ;;
    -h|--help) sed -n '2,18p' "$0"; exit 0 ;;
    "") ;;
    *) die "Argument inconnu : $1 (voir --help)" ;;
esac

# --- Pré-vérifications --------------------------------------------------------
[ -d "${HF_DATASET_DIR}" ] || die "Clone HF introuvable : ${HF_DATASET_DIR}"
command -v hf >/dev/null || die "CLI 'hf' introuvable. Installe huggingface_hub[cli]."

log "Vérification de la connexion SSH à ${SSH_TARGET}…"
ssh "${SSH_OPTS[@]}" "${SSH_TARGET}" "[ -f '${REMOTE_FILE}' ]" \
    || die "Fichier distant introuvable : ${REMOTE_FILE} (ou SSH inaccessible)"

# --- 1. Récupération ----------------------------------------------------------
TMP_FILE="$(mktemp)"
trap 'rm -f "${TMP_FILE}"' EXIT

log "Récupération de ${JSON_FILENAME} depuis la Freebox…"
scp "${SSH_OPTS[@]}" "${SSH_TARGET}:${REMOTE_FILE}" "${TMP_FILE}"

# Validation JSON avant d'écraser le clone local.
python3 -c "import json,sys; json.load(open(sys.argv[1]))" "${TMP_FILE}" \
    || die "Le fichier récupéré n'est pas un JSON valide."

# --- 2. Diff ------------------------------------------------------------------
if [ -f "${LOCAL_FILE}" ] && diff -q "${LOCAL_FILE}" "${TMP_FILE}" >/dev/null; then
    log "Aucun changement par rapport au clone local — rien à pousser."
    exit 0
fi

log "Changements détectés :"
diff "${LOCAL_FILE}" "${TMP_FILE}" || true

if [ -n "${DRY_RUN}" ]; then
    log "--dry-run : diff affiché ci-dessus, clone local et HuggingFace inchangés."
    exit 0
fi

cp "${TMP_FILE}" "${LOCAL_FILE}"
log "Clone local mis à jour : ${LOCAL_FILE}"

# --- 3. Publication -----------------------------------------------------------

COMMIT_MSG="update seuils admission ($(date +%Y-%m-%d))"
log "Publication vers HuggingFace (${HF_REPO_ID})…"
( cd "${HF_DATASET_DIR}" && hf upload "${HF_REPO_ID}" . \
    --type=dataset \
    "--include=${JSON_FILENAME}" \
    "--commit-message=${COMMIT_MSG}" )

log "Publication terminée ✅"
