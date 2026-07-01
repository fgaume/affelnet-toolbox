#!/usr/bin/env bash
# Miroir des dossiers de la VM Freebox vers le repo git (dossier data/freebox/).
#
# Recopie par rsync les dossiers listés dans DIRS depuis la Freebox vers
# data/freebox/<dossier>/ (miroir exact : ajouts + suppressions). NE COMMITE
# PAS : tu révises et commites toi-même (`git status` / `git diff`).
#
# Conçu pour être lancé périodiquement par launchd : silencieux si rien ne
# change, et se termine proprement (exit 0) quand la Freebox est injoignable
# (Mac hors du réseau local), pour ne pas polluer les logs launchd.
#
# Usage :
#   ./mirror-freebox-data.sh          # sync silencieuse (mode launchd)
#   ./mirror-freebox-data.sh -v       # sync verbeuse (détaille les changements)
set -euo pipefail

# --- Configuration -----------------------------------------------------------
VM_HOST="${VM_HOST:-192.168.0.8}"
VM_USER="${VM_USER:-freebox}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
REMOTE_BASE="${REMOTE_BASE:-/home/freebox/affelnet-api}"

# Dossiers (relatifs à REMOTE_BASE) à mirrorer. Ajoute-en au besoin.
DIRS=(
    "data"
    "uploads"
)

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." &>/dev/null && pwd)"
MIRROR_DIR="${MIRROR_DIR:-${REPO_ROOT}/data/freebox}"

SSH_OPTS=(-i "${SSH_KEY}" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=8)
SSH_TARGET="${VM_USER}@${VM_HOST}"

VERBOSE=""
[ "${1:-}" = "-v" ] && VERBOSE="yes"

log() { [ -n "${VERBOSE}" ] && printf '%s [mirror] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" || true; }

# --- Vérification d'accès (échec silencieux si hors LAN) ----------------------
if ! ssh "${SSH_OPTS[@]}" "${SSH_TARGET}" true 2>/dev/null; then
    log "Freebox injoignable (${SSH_TARGET}) — sync ignorée."
    exit 0
fi

changed=0

# --- Sync dossier par dossier (rsync, miroir exact) --------------------------
for dir in "${DIRS[@]}"; do
    dest="${MIRROR_DIR}/${dir}"
    mkdir -p "${dest}"
    if ! out="$(rsync -rt --delete --itemize-changes \
            -e "ssh ${SSH_OPTS[*]}" \
            "${SSH_TARGET}:${REMOTE_BASE}/${dir}/" "${dest}/" 2>/dev/null)"; then
        log "rsync ${dir}/ échoué — ignoré."
        continue
    fi
    if [ -n "${out}" ]; then
        n="$(printf '%s\n' "${out}" | grep -c .)"
        changed=$((changed + n))
        log "${dir}/ : ${n} changement(s)"
        [ -n "${VERBOSE}" ] && printf '%s\n' "${out}"
    else
        log "${dir}/ : inchangé"
    fi
done

log "Terminé — ${changed} élément(s) modifié(s)."
