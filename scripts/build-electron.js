import { copyFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const electronDir = "electron";
const distDir = "dist";

// Ensure dist directory exists
if (!existsSync(distDir)) {
  mkdirSync(distDir);
}

try {
  // Copy main.js
  const mainSource = join(electronDir, "main.js");
  const mainDest = join(distDir, "main.js");
  copyFileSync(mainSource, mainDest);
  console.log("✔ Copied main.js");

  // Copy preload.js (JS, NOT TS)
  const preloadSource = join(electronDir, "preload.js");
  const preloadDest = join(distDir, "preload.js");
  copyFileSync(preloadSource, preloadDest);
  console.log("✔ Copied preload.js");

  console.log("Electron JS files copied successfully.");
} catch (err) {
  console.error("Build failed:", err);
  process.exit(1);
}
