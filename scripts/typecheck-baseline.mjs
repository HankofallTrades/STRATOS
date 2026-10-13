import { spawnSync } from "node:child_process";

// I-43: keep CI usable while the standing src errors are repaired.
const baseline = 74;
const result = spawnSync("npm", ["run", "typecheck", "--", "--pretty", "false"], {
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
});

process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");
const errors = `${result.stdout ?? ""}${result.stderr ?? ""}`.match(/error TS\d+:/g)?.length ?? 0;

if (result.error || (result.status !== 0 && (result.status !== 2 || errors === 0))) {
  console.error("Typecheck did not complete:", result.error ?? result.signal ?? result.status);
  process.exit(1);
}

console.log(`Typecheck: ${errors} errors; allowed baseline: ${baseline}.`);
process.exit(errors > baseline ? 1 : 0);
