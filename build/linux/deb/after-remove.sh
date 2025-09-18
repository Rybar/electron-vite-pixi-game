#!/bin/bash
set -euo pipefail

APP_NAME="electron-vite-pixi-starter"
PROFILE_NAME="usr.bin.${APP_NAME}"
PROFILE_PATH="/etc/apparmor.d/${PROFILE_NAME}"

case "$1" in
  remove|purge)
    if [ -f "$PROFILE_PATH" ]; then
      if command -v apparmor_parser >/dev/null 2>&1; then
        apparmor_parser -R "$PROFILE_PATH" || true
      fi
      rm -f "$PROFILE_PATH"
    fi
    ;;
  upgrade|failed-upgrade|abort-install|abort-upgrade|disappear)
    ;;
esac

exit 0
