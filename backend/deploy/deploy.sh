#!/usr/bin/env bash
# Déploie le backend Affelnet (FastAPI) sur la VM Freebox (Alpine Linux, ARM64).
#
# Pré-requis (côté VM, configurés via le skill freebox-vm-deploy) :
#   - SSH ouvert sur 192.168.0.8 avec l'utilisateur "freebox" et la clé id_ed25519
#   - python3, uv, doas, OpenRC, Caddy installés
#   - Ports 80/443 forwardés depuis la Freebox vers la VM
#
# Le service est déployé en tant que service OpenRC robuste :
#   - démarre automatiquement au boot (rc-update add ... default)
#   - redémarre après un pause/resume ou un restart de la VM
#   - écrit ses logs dans /var/log/affelnet-api.{log,err}
#
# Usage :
#   ./deploy.sh                 # déploiement complet (code + venv + service + caddy)
#   ./deploy.sh --code-only     # synchronise uniquement le code et redémarre le service
#   ./deploy.sh --status        # vérifie l'état du service distant
#
set -euo pipefail

# --- Configuration -----------------------------------------------------------
VM_HOST="${VM_HOST:-192.168.0.8}"
VM_USER="${VM_USER:-freebox}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
REMOTE_DIR="${REMOTE_DIR:-/home/freebox/affelnet-api}"
SERVICE_NAME="${SERVICE_NAME:-affelnet-api}"
SERVICE_PORT="${SERVICE_PORT:-5000}"
LEGACY_SERVICE="${LEGACY_SERVICE:-hello-api}"
LEGACY_DIR="${LEGACY_DIR:-/home/freebox/api}"
DOMAIN="${DOMAIN:-fge.freeboxos.fr}"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
BACKEND_DIR="$(cd -- "${SCRIPT_DIR}/.." &>/dev/null && pwd)"

SSH_OPTS=(-i "${SSH_KEY}" -o StrictHostKeyChecking=accept-new)
SSH_TARGET="${VM_USER}@${VM_HOST}"

# --- Helpers -----------------------------------------------------------------
log()  { printf '\033[1;34m[deploy]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

remote() {
    ssh "${SSH_OPTS[@]}" "${SSH_TARGET}" "$@"
}

remote_doas() {
    ssh "${SSH_OPTS[@]}" "${SSH_TARGET}" "doas $*"
}

require_ssh() {
    log "Vérification de la connexion SSH à ${SSH_TARGET}…"
    remote "true" || die "SSH inaccessible. Vérifie la VM et la clé ${SSH_KEY}."
}

# --- Étapes de déploiement ---------------------------------------------------
remove_legacy_hello_api() {
    log "Suppression de l'ancien service ${LEGACY_SERVICE} (s'il existe)…"
    if remote "[ -f /etc/init.d/${LEGACY_SERVICE} ]"; then
        remote_doas "service ${LEGACY_SERVICE} stop || true"
        remote_doas "rc-update del ${LEGACY_SERVICE} default || true"
        remote_doas "rm -f /etc/init.d/${LEGACY_SERVICE}"
        log "Service ${LEGACY_SERVICE} stoppé, désactivé et fichier init supprimé."
    else
        log "Pas de service ${LEGACY_SERVICE} détecté — rien à faire."
    fi
    if remote "[ -d ${LEGACY_DIR} ]"; then
        remote_doas "rm -rf ${LEGACY_DIR}"
        log "Dossier ${LEGACY_DIR} supprimé."
    fi
}

sync_code() {
    log "Synchronisation du code vers ${REMOTE_DIR}…"
    remote "command -v rsync >/dev/null" || remote_doas "apk add --quiet rsync"
    remote "mkdir -p '${REMOTE_DIR}/uploads'"
    rsync -az --delete \
        --exclude '.venv/' \
        --exclude '__pycache__/' \
        --exclude '.pytest_cache/' \
        --exclude 'uploads/*' \
        --exclude '.python-version' \
        -e "ssh ${SSH_OPTS[*]}" \
        "${BACKEND_DIR}/" "${SSH_TARGET}:${REMOTE_DIR}/"
}

setup_python() {
    log "Préparation du venv Python (système python3 + uv)…"
    remote_doas "apk add --quiet python3 || true"
    remote sh -s <<EOF
set -eu
export PATH="\$HOME/.local/bin:\$PATH"
command -v uv >/dev/null || { echo "uv introuvable dans \$HOME/.local/bin"; exit 1; }
cd "${REMOTE_DIR}"
if [ ! -d .venv ]; then
    uv venv --python "\$(which python3)"
fi
uv sync --quiet
EOF
}

install_service() {
    log "Installation du service OpenRC ${SERVICE_NAME}…"
    scp "${SSH_OPTS[@]}" "${SCRIPT_DIR}/affelnet-api.initd" \
        "${SSH_TARGET}:/tmp/${SERVICE_NAME}.initd"
    remote_doas "install -m 0755 -o root -g root /tmp/${SERVICE_NAME}.initd /etc/init.d/${SERVICE_NAME}"
    remote "rm -f /tmp/${SERVICE_NAME}.initd"
    remote_doas "rc-update add ${SERVICE_NAME} default"
    log "Service enregistré au runlevel 'default' (redémarrera au boot)."
}

restart_service() {
    log "(Re)démarrage du service ${SERVICE_NAME}…"
    remote_doas "service ${SERVICE_NAME} restart || service ${SERVICE_NAME} start"
    sleep 1
    remote_doas "service ${SERVICE_NAME} status"
}

configure_caddy() {
    log "Vérification de la configuration Caddy pour ${DOMAIN}…"
    # Cible attendue : reverse_proxy direct vers 127.0.0.1:${SERVICE_PORT}
    if remote "grep -Eq 'reverse_proxy[[:space:]]+127\.0\.0\.1:${SERVICE_PORT}' /etc/caddy/Caddyfile 2>/dev/null \
            && ! grep -q 'handle_path' /etc/caddy/Caddyfile 2>/dev/null"; then
        log "Caddy déjà configuré sur 127.0.0.1:${SERVICE_PORT} — rien à faire."
        return
    fi
    warn "Caddy doit être reconfiguré (suppression du routage /affelnet/* et passage en proxy direct sur :${SERVICE_PORT})."
    cat <<EOF
À installer manuellement dans /etc/caddy/Caddyfile :

    ${DOMAIN} {
        reverse_proxy 127.0.0.1:${SERVICE_PORT}
    }

Puis recharger Caddy : doas caddy reload --config /etc/caddy/Caddyfile

Voir aussi : ${SCRIPT_DIR}/Caddyfile.snippet
EOF
}

smoke_test() {
    log "Test de bonne santé local sur la VM (127.0.0.1:${SERVICE_PORT})…"
    local ok=""
    for i in 1 2 3 4 5; do
        if remote "wget -q -O/dev/null --tries=1 --timeout=3 http://127.0.0.1:${SERVICE_PORT}/docs"; then
            ok="yes"; break
        fi
        sleep 2
    done
    if [ -n "${ok}" ]; then
        log "API joignable en local sur la VM."
    else
        warn "L'API ne répond pas — consulter /var/log/${SERVICE_NAME}.err"
    fi
    log "Test public :"
    log "  curl -i https://${DOMAIN}/docs"
}

show_status() {
    log "Statut du service distant…"
    remote_doas "service ${SERVICE_NAME} status" || true
    log "Dernières lignes du log d'erreur :"
    remote "tail -n 20 /var/log/${SERVICE_NAME}.err 2>/dev/null || true"
}

# --- Main --------------------------------------------------------------------
case "${1:-}" in
    --status)
        require_ssh
        show_status
        ;;
    --code-only)
        require_ssh
        sync_code
        setup_python
        restart_service
        smoke_test
        ;;
    ""|--all)
        require_ssh
        remove_legacy_hello_api
        sync_code
        setup_python
        install_service
        restart_service
        configure_caddy
        smoke_test
        log "Déploiement terminé. URL publique attendue : https://${DOMAIN}/"
        ;;
    --remove-legacy)
        require_ssh
        remove_legacy_hello_api
        ;;
    -h|--help)
        sed -n '2,20p' "$0"
        ;;
    *)
        die "Argument inconnu : $1 (voir --help)"
        ;;
esac
