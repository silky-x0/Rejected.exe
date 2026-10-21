/**
 * Bundles the built extension into dist/rejection-alert.zip.
 * Run after `npm run build`.
 */
import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const output = join(dist, "rejection-alert.zip");

const contents = [
  "manifest.json",
  "content.js",
  "background.js",
  "offscreen.js",
  "offscreen.html",
  "popup.js",
  "popup.html",
  "fahhh.mp3",
  "icons",
];

if (!existsSync(join(dist, "manifest.json"))) {
  console.error("dist/ has no build output - run `npm run build` first.");
  process.exit(1);
}

rmSync(output, { force: true });

try {
  execFileSync("zip", ["-q", "-r", output, ...contents], { cwd: dist });
} catch (err) {
  console.error("Could not create the zip (is the `zip` command installed?):", err.message);
  process.exit(1);
}

console.log(`packaged ${output}`);
