#!/usr/bin/env bash
# Drive the iOS wrap in the simulator: login, kill/relaunch, route navigation.
#
# Maestro needs a JDK and neither is on PATH by default, so both are resolved
# here rather than in shell config. Credentials come from .env.e2e.local
# (gitignored); see .env.e2e.example.
set -euo pipefail

cd "$(dirname "$0")/.."

MAESTRO="${MAESTRO:-$HOME/.maestro/bin/maestro}"
JAVA_HOME_DEFAULT=/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home

[ -x "$MAESTRO" ] || { echo "maestro not found at $MAESTRO" >&2; exit 1; }
[ -f .env.e2e.local ] || { echo ".env.e2e.local missing - copy .env.e2e.example" >&2; exit 1; }

export JAVA_HOME="${JAVA_HOME:-$JAVA_HOME_DEFAULT}"
[ -d "$JAVA_HOME" ] || { echo "no JDK at $JAVA_HOME; brew install openjdk" >&2; exit 1; }
export PATH="$JAVA_HOME/bin:$PATH"

set -a
# shellcheck disable=SC1091
. ./.env.e2e.local
set +a

# The app must already be installed on a booted simulator; see CODEMAP "iOS Target".
exec "$MAESTRO" test \
  -e E2E_EMAIL="$E2E_EMAIL" \
  -e E2E_PASSWORD="$E2E_PASSWORD" \
  "${@:-e2e/ios-smoke.yaml}"
