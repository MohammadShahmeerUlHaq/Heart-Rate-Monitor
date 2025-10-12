# Heart Rate Monitor - Cross-Platform Desktop App

A professional-grade desktop application for real-time heart rate monitoring in group fitness settings. Built with Electron, React, and Node.js with ANT+ integration.

## 🚀 Features

- **Real-time monitoring** of multiple ANT+ heart rate devices
- **Professional dashboard** with color-coded heart rate zones
- **Fullscreen TV display mode** optimized for large screens
- **Cross-platform support** (Windows, macOS, Linux)
- **Offline operation** - no internet required
- **Customizable layout** with responsive grid system
- **Participant management** with editable names
- **Calorie tracking** with real-time estimation

## 📋 Requirements

### Hardware

- ANT+ USB dongle (e.g., Coospo, Garmin)
- ANT+ compatible heart rate monitors
- Computer with USB port
- Optional: Large TV/monitor for group display

### Software

- Windows 10+ or macOS 10.14+
- USB drivers for ANT+ dongle

## 🔧 Installation

### Download Pre-built Apps

1. **Windows**: Download `Heart-Rate-Monitor-Setup.exe` from releases
2. **macOS**: Download `Heart-Rate-Monitor.dmg` from releases

### Install ANT+ Drivers

#### Windows

- ANT+ drivers are usually installed automatically
- If issues occur, download from [ANT+ official website](https://www.thisisant.com/developer/resources/downloads/)

#### macOS

- Install libusb: `brew install libusb`
- You may need to allow the app in System Preferences > Security & Privacy

## 🎯 Usage

### Basic Setup

1. **Connect ANT+ dongle** to USB port
2. **Launch the application**
3. **Turn on heart rate monitors** and wear them
4. **Click "Start Scanning"** to detect devices
5. **Enter fullscreen mode** (F11) for TV display

### Settings Configuration

1. Click the **Settings** button (gear icon)
2. **Assign names** to detected participants
3. **Adjust tiles per row** based on your TV size
4. **Save settings** to apply changes

### Heart Rate Zones

- 🔵 **Blue (Warm Up)**: 50-100 BPM - Light activity, recovery
- 🟢 **Green (Fat Burn)**: 100-130 BPM - Moderate intensity
- 🟠 **Orange (Cardio)**: 130-160 BPM - High intensity cardio
- 🔴 **Red (Peak)**: 160+ BPM - Maximum effort

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
git clone <repository-url>
cd heart-rate-monitor
npm install
cd electron && npm install
```

### Development Mode

```bash
npm run dev
```

### Building

```bash
# Build for current platform
npm run dist

# Build for specific platforms
npm run dist:win    # Windows
npm run dist:mac    # macOS
npm run dist:linux  # Linux
```

## 📁 Project Structure

```
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── utils/             # Utility functions
│   └── types/             # TypeScript definitions
├── electron/              # Electron main process
│   ├── main.ts           # Main process entry
│   ├── preload.ts        # Preload script
│   └── antplus-service.ts # ANT+ integration
├── assets/               # App icons and resources
└── scripts/              # Build scripts
```

## 🔧 Troubleshooting

### ANT+ Connection Issues

1. **Check USB dongle**: Ensure it's properly connected
2. **Driver issues**: Reinstall ANT+ drivers
3. **Permission errors**: Run as administrator (Windows) or grant permissions (macOS)
4. **Multiple dongles**: Use only one ANT+ dongle at a time

### Heart Rate Monitor Issues

1. **Not detected**: Ensure HR monitor is active and transmitting
2. **Intermittent connection**: Check battery level
3. **Multiple devices**: Each monitor needs a unique device ID

### Performance Optimization

1. **High CPU usage**: Reduce update frequency in settings
2. **Memory leaks**: Restart app after extended use
3. **Display lag**: Close unnecessary applications

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For technical support or feature requests, please create an issue in the repository.
