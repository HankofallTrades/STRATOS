#!/usr/bin/env bash
# Build, install and launch the wrap on a paired iPhone without the Xcode GUI.
#
# The one-time setup it cannot do for you (Apple ID in Xcode, Trust This
# Computer, Developer Mode) is in docs/ios.md. Team and device ids come from
# .env.ios.local (see .env.ios.example) or, failing that, from the signing
# certificate and the device list, so nothing personal lands in the repo.
set -euo pipefail

cd "$(dirname "$0")/.."

BUNDLE_ID=com.daimodus.stratos
DERIVED_DATA=build/ios-device
APP="$DERIVED_DATA/Build/Products/Debug-iphoneos/App.app"
# STRATOS_IOS_ENV exists so the unit test can point at a scratch file.
ENV_FILE="${STRATOS_IOS_ENV:-.env.ios.local}"

fail() { echo "ios:device: $*" >&2; exit 1; }

# 1. A signing identity. Xcode creates one when an Apple ID is added under
#    Settings → Accounts; a free Personal Team is enough.
IDENTITIES=$(security find-identity -v -p codesigning | grep '"Apple Development' || true)
[ -n "$IDENTITIES" ] \
  || fail "no Apple Development signing identity. Xcode → Settings → Accounts → + → sign in with your Apple ID, then re-run."

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

# 2. The team id: configured, or the OU of the Apple Development certificate.
#    Not the parenthesised suffix in the certificate name; that is the cert's
#    own id and will not sign. find-certificate returns the first match, so
#    with several identities the guess could sign for the wrong team.
if [ -z "${IOS_DEVELOPMENT_TEAM:-}" ]; then
  [ "$(printf '%s\n' "$IDENTITIES" | grep -c .)" -eq 1 ] \
    || fail "more than one Apple Development identity; set IOS_DEVELOPMENT_TEAM in $ENV_FILE to the OU of the one to sign with:
$IDENTITIES"
  IOS_DEVELOPMENT_TEAM=$(
    security find-certificate -c "Apple Development" -p \
      | openssl x509 -noout -subject \
      | sed -n 's/.*OU *= *\([A-Za-z0-9]*\).*/\1/p'
  )
fi
[ -n "${IOS_DEVELOPMENT_TEAM:-}" ] \
  || fail "no team id: the certificate subject has no OU field. Set IOS_DEVELOPMENT_TEAM in $ENV_FILE (see .env.ios.example)."

# 3. The device: configured, or the only paired one.
DEVICES_JSON=$(mktemp)
trap 'rm -f "$DEVICES_JSON"' EXIT
xcrun devicectl list devices --json-output "$DEVICES_JSON" >/dev/null

PAIRED=$(node -e '
  const j = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  for (const d of j.result.devices ?? []) {
    if (d.connectionProperties?.pairingState !== "paired") continue;
    console.log(`${d.identifier}\t${d.deviceProperties?.name ?? "?"}`);
  }
' "$DEVICES_JSON")

if [ -z "${IOS_DEVICE_ID:-}" ]; then
  case "$(printf '%s\n' "$PAIRED" | grep -c .)" in
    0) fail "no paired device. Plug the iPhone in, unlock it, tap Trust This Computer, and turn on Settings → Privacy & Security → Developer Mode." ;;
    1) IOS_DEVICE_ID=$(printf '%s' "$PAIRED" | cut -f1) ;;
    *) fail "more than one paired device; set IOS_DEVICE_ID in $ENV_FILE to one of:
$PAIRED" ;;
  esac
fi

# 4–7. Sync, build, install, launch. DEVELOPMENT_TEAM stays on the command line
#      so project.pbxproj never carries one signer's team.
npm run ios:sync

xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -destination "id=$IOS_DEVICE_ID" \
  -derivedDataPath "$DERIVED_DATA" \
  -allowProvisioningUpdates DEVELOPMENT_TEAM="$IOS_DEVELOPMENT_TEAM" build

xcrun devicectl device install app --device "$IOS_DEVICE_ID" "$APP"
xcrun devicectl device process launch --device "$IOS_DEVICE_ID" "$BUNDLE_ID"

# 8. A free Personal Team's profile stops launching after seven days.
echo "ios:device: installed $BUNDLE_ID on $IOS_DEVICE_ID; free-signing build expires on $(date -v+7d +%Y-%m-%d)"
