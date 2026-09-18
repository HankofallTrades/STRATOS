import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../..");
const script = path.join(repoRoot, "scripts/ios-device-install.sh");

const DEVICE_A = {
  identifier: "AAAA-1111",
  connectionProperties: { pairingState: "paired" },
  deviceProperties: { name: "Hank’s iPhone" },
};
const DEVICE_B = {
  identifier: "BBBB-2222",
  connectionProperties: { pairingState: "paired" },
  deviceProperties: { name: "Spare iPad" },
};
const SUBJECT_WITH_TEAM =
  "subject=UID=X, CN=Apple Development: someone@example.com (CERTID1234), OU=TEAM123456, O=Someone, C=US";
const SUBJECT_WITHOUT_TEAM =
  "subject=UID=X, CN=Apple Development: someone@example.com (CERTID1234), O=Someone, C=US";

type Fixture = {
  identities?: string;
  certSubject?: string;
  devices?: unknown[];
  env?: Record<string, string>;
  envFile?: string;
};

/**
 * Runs the real script against stub `security`, `openssl`, `xcrun`,
 * `xcodebuild` and `npm` binaries placed ahead of the system ones on PATH.
 * Every side-effecting call is appended to a log so the tests can assert
 * what would have been built, installed and launched, and in which order.
 */
function run(fixture: Fixture) {
  const dir = mkdtempSync(path.join(tmpdir(), "ios-device-"));
  const bin = path.join(dir, "bin");
  const log = path.join(dir, "calls.log");
  const envFile = path.join(dir, ".env.ios.local");
  writeFileSync(log, "");
  if (fixture.envFile !== undefined) writeFileSync(envFile, fixture.envFile);

  const stub = (name: string, body: string) => {
    const file = path.join(bin, name);
    writeFileSync(file, `#!/usr/bin/env bash\n${body}\n`);
    chmodSync(file, 0o755);
  };
  mkdirSync(bin, { recursive: true });

  stub(
    "security",
    `case "$1" in
      find-identity) printf '%s\\n' "$STUB_IDENTITIES" ;;
      find-certificate) echo "-----BEGIN CERTIFICATE-----" ;;
      *) echo "unexpected security $*" >&2; exit 99 ;;
    esac`
  );
  stub("openssl", `printf '%s\\n' "$STUB_CERT_SUBJECT"`);
  stub(
    "xcrun",
    `if [ "$1 $2 $3" = "devicectl list devices" ]; then
       printf '%s' "$STUB_DEVICES_JSON" > "$5"
     else
       echo "xcrun $*" >> "$STUB_LOG"
     fi`
  );
  stub("xcodebuild", `echo "xcodebuild $*" >> "$STUB_LOG"`);
  stub("npm", `echo "npm $*" >> "$STUB_LOG"`);

  const result = spawnSync("bash", [script], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      PATH: `${bin}:${process.env.PATH ?? ""}`,
      HOME: dir,
      STUB_LOG: log,
      STUB_IDENTITIES:
        fixture.identities ??
        '  1) ABC "Apple Development: someone@example.com (CERTID1234)"\n     1 valid identities found',
      STUB_CERT_SUBJECT: fixture.certSubject ?? SUBJECT_WITH_TEAM,
      STUB_DEVICES_JSON: JSON.stringify({
        result: { devices: fixture.devices ?? [DEVICE_A] },
      }),
      STRATOS_IOS_ENV: envFile,
      ...fixture.env,
    },
  });

  return { ...result, calls: readFileSync(log, "utf8").trim().split("\n").filter(Boolean) };
}

describe("scripts/ios-device-install.sh", () => {
  it("builds, installs and launches on the only paired device, in that order", () => {
    const r = run({});

    expect(r.status, r.stderr).toBe(0);
    expect(r.calls).toEqual([
      "npm run ios:sync",
      expect.stringMatching(
        /^xcodebuild .*-destination id=AAAA-1111 .*-derivedDataPath build\/ios-device .*-allowProvisioningUpdates DEVELOPMENT_TEAM=TEAM123456 build$/
      ),
      "xcrun devicectl device install app --device AAAA-1111 build/ios-device/Build/Products/Debug-iphoneos/App.app",
      "xcrun devicectl device process launch --device AAAA-1111 com.daimodus.stratos",
    ]);
    expect(r.stdout).toMatch(/expires .*\d{4}-\d{2}-\d{2}/);
  });

  it("stops before syncing when there is no Apple Development identity", () => {
    const r = run({ identities: "     0 valid identities found" });

    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/no Apple Development signing identity/);
    expect(r.calls).toEqual([]);
  });

  it("stops when no device is paired", () => {
    const r = run({ devices: [] });

    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/no paired device/);
    expect(r.calls).toEqual([]);
  });

  it("ignores devices that are not paired", () => {
    const unpaired = {
      ...DEVICE_B,
      connectionProperties: { pairingState: "unpaired" },
    };
    const r = run({ devices: [unpaired] });

    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/no paired device/);
    expect(r.calls).toEqual([]);
  });

  it("refuses to guess between two paired devices and lists them", () => {
    const r = run({ devices: [DEVICE_A, DEVICE_B] });

    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/more than one paired device/);
    expect(r.stderr).toContain("AAAA-1111");
    expect(r.stderr).toContain("BBBB-2222");
    expect(r.stderr).toMatch(/IOS_DEVICE_ID/);
    expect(r.calls).toEqual([]);
  });

  it("uses IOS_DEVICE_ID to pick among several devices", () => {
    const r = run({
      devices: [DEVICE_A, DEVICE_B],
      env: { IOS_DEVICE_ID: "BBBB-2222" },
    });

    expect(r.status, r.stderr).toBe(0);
    expect(r.calls.join("\n")).toContain("--device BBBB-2222");
    expect(r.calls.join("\n")).not.toContain("AAAA-1111");
  });

  it("stops when the certificate has no OU and no team id is configured", () => {
    const r = run({ certSubject: SUBJECT_WITHOUT_TEAM });

    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/no team id/);
    expect(r.stderr).toMatch(/IOS_DEVELOPMENT_TEAM/);
    expect(r.calls).toEqual([]);
  });

  it("refuses to guess the team when two identities exist and none is configured", () => {
    const r = run({
      identities:
        '  1) ABC "Apple Development: someone@example.com (CERTID1234)"\n  2) DEF "Apple Development: other@example.com (CERTID5678)"\n     2 valid identities found',
    });

    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/more than one Apple Development identity/);
    expect(r.stderr).toContain("other@example.com");
    expect(r.stderr).toMatch(/IOS_DEVELOPMENT_TEAM/);
    expect(r.calls).toEqual([]);
  });

  it("does not need to pick between identities when the team id is configured", () => {
    const r = run({
      identities:
        '  1) ABC "Apple Development: someone@example.com (CERTID1234)"\n  2) DEF "Apple Development: other@example.com (CERTID5678)"\n     2 valid identities found',
      envFile: "IOS_DEVELOPMENT_TEAM=FROMFILE99\n",
    });

    expect(r.status, r.stderr).toBe(0);
    expect(r.calls.join("\n")).toContain("DEVELOPMENT_TEAM=FROMFILE99");
  });

  it("prefers the team id from the env file over the certificate", () => {
    const r = run({
      certSubject: SUBJECT_WITH_TEAM,
      envFile: "IOS_DEVELOPMENT_TEAM=FROMFILE99\n",
    });

    expect(r.status, r.stderr).toBe(0);
    expect(r.calls.join("\n")).toContain("DEVELOPMENT_TEAM=FROMFILE99");
    expect(r.calls.join("\n")).not.toContain("TEAM123456");
  });

  it("takes the device id from the env file too", () => {
    const r = run({
      devices: [DEVICE_A, DEVICE_B],
      envFile: "IOS_DEVICE_ID=AAAA-1111\n",
    });

    expect(r.status, r.stderr).toBe(0);
    expect(r.calls.join("\n")).toContain("--device AAAA-1111");
  });
});
