import * as fs from "fs";
import { exec } from "child_process";

const execAsync = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
};

async function buildElectron() {
  try {
    await execAsync("npm run build");
    await execAsync("cd electron && npm run build");
    fs.copyFileSync("electron/preload.ts", "dist/preload.js");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

buildElectron();
