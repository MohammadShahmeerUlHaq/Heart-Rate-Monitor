module.exports = {
  appId: 'com.fitness.heart-rate-monitor',
  productName: 'Heart Rate Monitor',
  directories: {
    output: 'release'
  },
  files: [
    'dist/**/*',
    'electron/dist/**/*',
    'electron/node_modules/**/*',
    'package.json'
  ],
  asarUnpack: [
    'electron/node_modules/**/*'
  ],
  nodeGypRebuild: true,
  buildDependenciesFromSource: true,
  extraResources: [
    {
      from: 'assets',
      to: 'assets'
    }
  ],
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64', 'ia32']
      }
    ],
    icon: 'assets/icon.ico'
  },
  mac: {
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64']
      }
    ],
    icon: 'assets/icon.icns',
    category: 'public.app-category.healthcare-fitness'
  },
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64']
      }
    ],
    icon: 'assets/icon.png'
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true
  }
};