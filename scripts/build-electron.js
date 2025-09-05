// import { exec } from 'child_process';
// import { promisify } from 'util';
// import * as path from 'path';

// const execAsync = promisify(exec);

// async function buildElectron() {
//   try {
//     console.log('Building React app...');
//     await execAsync('npm run build');

//     console.log('Building Electron TypeScript...');
//     await execAsync('cd electron && npm run build');

//     console.log('Copying preload script...');
//     await execAsync('cp electron/preload.ts dist/preload.js');

//     console.log('Build completed successfully!');
//   } catch (error) {
//     console.error('Build failed:', error);
//     process.exit(1);
//   }
// }

// buildElectron();

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

async function buildElectron() {
  try {
    console.log('Building React app...');
    await execAsync('npm run build');

    console.log('Building Electron TypeScript...');
    await execAsync('cd electron && npm run build');

    console.log('Copying preload script...');
    fs.copyFileSync('electron/preload.ts', 'dist/preload.js');

    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildElectron();