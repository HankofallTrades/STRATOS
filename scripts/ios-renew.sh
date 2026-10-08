#!/usr/bin/env bash
# Reinstall the wrap before its free-signing profile lapses (seven days).
# Run daily by a launchd agent (see docs/ios.md); a no-op until the last
# install is RENEW_AFTER_DAYS old, and skipped when the phone is not reachable.
# Builds the tip of main in a worktree of its own, so half-finished work in
# the main checkout never lands on the phone.
set -uo pipefail

cd "$(dirname "$0")/.." >/dev/null
REPO=$PWD
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

export IOS_INSTALL_STAMP="$REPO/build/ios-device/last-install"
WORKTREE="$HOME/Library/Caches/stratos-ios-renew/worktree"
RENEW_AFTER_DAYS=5

log() { echo "$(date '+%Y-%m-%d %H:%M') ios:renew: $*"; }
notify() { osascript -e "display notification \"$1\" with title \"STRATOS iOS\"" >/dev/null 2>&1 || true; }
fail() { log "$1"; notify "$1 See ~/Library/Logs/stratos-ios-renew.log"; exit 1; }

last=$(cat "$IOS_INSTALL_STAMP" 2>/dev/null || echo 0)
age_days=$(( ($(date +%s) - last) / 86400 ))
if [ "$age_days" -lt "$RENEW_AFTER_DAYS" ]; then
  log "last install $age_days days ago; nothing to do"
  exit 0
fi

if ! xcrun devicectl list devices 2>/dev/null | grep -q 'available (paired)'; then
  log "build is $age_days days old but no paired iPhone is reachable"
  [ "$age_days" -ge 6 ] && notify "Build expires soon and the iPhone is not reachable. Put it on the same Wi-Fi as the Mac."
  exit 0
fi

if [ -d "$WORKTREE" ]; then
  git -C "$WORKTREE" checkout --quiet --force --detach main || fail "could not check out main in the renew worktree."
else
  mkdir -p "$(dirname "$WORKTREE")"
  git worktree add --quiet --detach "$WORKTREE" main || fail "could not create the renew worktree."
fi
# Untracked, so the worktree does not have them: Supabase config for the
# build, and team/device overrides for the install.
for f in .env.local .env.ios.local; do
  [ -f "$REPO/$f" ] && cp "$REPO/$f" "$WORKTREE/$f"
done

log "build is $age_days days old; reinstalling main at $(git -C "$WORKTREE" rev-parse --short HEAD)"
(cd "$WORKTREE" && npm ci --prefer-offline --no-audit --no-fund >/dev/null) || fail "npm ci failed in the renew worktree."
"$WORKTREE/scripts/ios-device-install.sh"
# The launch step fails on a locked phone even though the install landed, so
# judge by the stamp, not the exit code.
if [ "$(cat "$IOS_INSTALL_STAMP" 2>/dev/null || echo 0)" -gt "$last" ]; then
  log "reinstalled"
else
  fail "Reinstall failed."
fi
