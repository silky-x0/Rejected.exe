/**
 * Bundles a built extension into <target>/rejection-alert.zip.
 * Run after `npm run build` (or `npm run build:firefox`).
 *
 * Usage: node scripts/package.mjs [target-dir]   (default: dist)
 */
import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = process.argv[2] ?? "dist";
const dist = join(root, target);
const output = join(dist, "rejection-alert.zip");

const contents = [
  "manifest.json",
  "content.js",
  "background.js",
  "popup.js",
  "popup.html",
  "fahhh.mp3",
  "icons",
];

// Firefox has no offscreen documents, so the page plays the sound instead.
if (target !== "dist-firefox") contents.push("offscreen.js", "offscreen.html");

if (!existsSync(join(dist, "manifest.json"))) {
  console.error(`${target}/ has no build output - run the matching build first.`);
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
