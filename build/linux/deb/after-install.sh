#!/bin/bash
set -euo pipefail

APP_NAME="electron-vite-pixi-starter"
PROFILE_NAME="usr.bin.${APP_NAME}"
INSTALL_ROOT="/opt/Electron Vite Pixi Starter"
PROFILE_SOURCE="$INSTALL_ROOT/resources/apparmor/${PROFILE_NAME}"
PROFILE_TARGET="/etc/apparmor.d/${PROFILE_NAME}"

if [ -f "$PROFILE_SOURCE" ]; then
  install -D -m 0644 "$PROFILE_SOURCE" "$PROFILE_TARGET"
  if command -v apparmor_parser >/dev/null 2>&1; then
    apparmor_parser -r -T "$PROFILE_TARGET" || true
  fi
fi

exit 0
