# Assets Directory

This directory should contain:

- `icon.png` - Application icon (512x512 PNG)
- `icon.ico` - Windows icon file  
- `icon.icns` - macOS icon file

## Creating Icons

You can use online tools to convert a PNG file to ICO and ICNS formats:

1. Create a 512x512 PNG icon
2. Convert to ICO using online converter for Windows
3. Convert to ICNS using online converter for macOS

Or use electron-icon-builder:
```bash
npm install -g electron-icon-builder
electron-icon-builder --input=./icon.png --output=./assets --flatten
```