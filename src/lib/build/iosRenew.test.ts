import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../..");

function run({ ageDays = 1, expiresInDays, launchFails = false }: {
  ageDays?: number;
  expiresInDays?: number;
  launchFails?: boolean;
}) {
  const dir = mkdtempSync(path.join(tmpdir(), "ios-renew-"));
  const bin = path.join(dir, "bin");
  const scripts = path.join(dir, "scripts");
  const worktree = path.join(dir, "Library/Caches/stratos-ios-renew/worktree");
  const stamp = path.join(dir, "build/ios-device/last-install");
  const log = path.join(dir, "calls.log");
  for (const p of [bin, scripts, path.join(worktree, "scripts"), path.dirname(stamp)]) {
    mkdirSync(p, { recursive: true });
  }
  const executable = (file: string, body: string) => {
    writeFileSync(file, `#!/usr/bin/env bash\n${body}\n`);
    chmodSync(file, 0o755);
  };
  writeFileSync(log, "");
  const now = Math.floor(Date.now() / 1000);
  writeFileSync(stamp, String(now - ageDays * 86400));
  if (expiresInDays !== undefined) writeFileSync(`${stamp}.expires`, String(now + expiresInDays * 86400));
  // Keep the real control flow; prepend fixture binaries to launchd's PATH.
  const source = readFileSync(path.join(repoRoot, "scripts/ios-renew.sh"), "utf8")
    .replace('export PATH="', 'export PATH="$STUB_BIN:');
  writeFileSync(path.join(scripts, "ios-renew.sh"), source);
  executable(path.join(bin, "xcrun"), 'echo "available (paired)"');
  executable(path.join(bin, "git"), 'echo "git $*" >> "$STUB_LOG"');
  executable(path.join(bin, "npm"), 'echo "npm $*" >> "$STUB_LOG"');
  executable(path.join(bin, "osascript"), 'echo "notification" >> "$STUB_LOG"');
  executable(path.join(worktree, "scripts/ios-device-install.sh"), 'exit 99');
  executable(path.join(scripts, "ios-device-install.sh"), `
    [ "$STRATOS_IOS_SOURCE" = "${worktree}" ] || exit 98
    echo "install" >> "$STUB_LOG"
    date +%s > "$IOS_INSTALL_STAMP"
    exit ${launchFails ? 1 : 0}
  `);
  const result = spawnSync("bash", [path.join(scripts, "ios-renew.sh")], {
    encoding: "utf8",
    env: { ...process.env, HOME: dir, STUB_BIN: bin, STUB_LOG: log },
  });
  return { ...result, calls: readFileSync(log, "utf8") };
}

describe("scripts/ios-renew.sh", () => {
  it("renews a recent install when its actual profile expires within two days", () => {
    const r = run({ expiresInDays: 1 });
    expect(r.status, r.stderr).toBe(0);
    expect(r.calls).toContain("install");
  });

  it("leaves a recent install with enough validity alone", () => {
    const r = run({ expiresInDays: 5 });
    expect(r.status, r.stderr).toBe(0);
    expect(r.calls).toBe("");
  });

  it("falls back to install age for installs without an expiry stamp", () => {
    const r = run({});
    expect(r.status, r.stderr).toBe(0);
    expect(r.calls).toBe("");
    const old = run({ ageDays: 6 });
    expect(old.status, old.stderr).toBe(0);
    expect(old.calls).toContain("install");
  });

  it("reports a failed launch even when installation succeeded", () => {
    const r = run({ ageDays: 6, launchFails: true });
    expect(r.status).not.toBe(0);
    expect(r.stdout).toContain("Installed, but launch failed");
    expect(r.stdout).not.toContain("ios:renew: reinstalled");
    expect(r.calls).toContain("notification");
  });
});
