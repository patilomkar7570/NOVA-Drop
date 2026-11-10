# NOVA Drop

<p align="center">
  <img src="client/public/logo.png" width="96" height="96" alt="NOVA Drop Logo" />
</p>

<p align="center">
  <strong>Your files. Your devices. Your network.</strong><br />
  High-speed, privacy-first local file transfer application across Windows, iOS, and Android.
</p>

<p align="center">
  <a href="https://github.com/patilomkar7570/NOVA-Drop/releases/tag/v1.0.0"><img src="https://img.shields.io/badge/Release-v1.0.0-7C3AED.svg" alt="Release v1.0.0" /></a>
  <a href="https://github.com/patilomkar7570/NOVA-Drop"><img src="https://img.shields.io/badge/Platform-Windows%20%7C%20iOS%20%7C%20Android%20%7C%20Web-blue.svg" alt="Platforms" /></a>
  <img src="https://img.shields.io/badge/Cloud%20Storage-0%25%20(None)-10B981.svg" alt="Zero Cloud" />
  <img src="https://img.shields.io/badge/Compression-0%25%20(Byte--for--Byte)-10B981.svg" alt="Zero Compression" />
  <img src="https://img.shields.io/badge/License-MIT-gray.svg" alt="License" />
</p>

---

## Overview

**NOVA Drop** is an ultra-fast, local-first file transfer application built for instant file sharing between your PC, phone, and tablet over your local network. It operates without cloud storage, third-party relays, user accounts, or compression.

Whether transferring high-resolution photos, 4K videos, zip archives, or documents, NOVA Drop transfers original bytes with cryptographic verification and line-rate speed.

---

## Key Features

- **Privacy First**: Files stream directly through your local network. Zero external cloud storage, zero tracking, and zero telemetry.
- **Zero Compression**: 100% byte-for-byte fidelity. Media is never transcoded or downscaled. Original filenames, extensions, and metadata are preserved.
- **Line-Rate Local Speed**: Built on native Node.js streaming APIs with backpressure handling for smooth gigabyte-scale transfers.
- **Multi-Platform Support**:
  - **PC (Windows)**: Silent one-click launcher (`NOVA-Drop.vbs`) and portable bundle.
  - **iOS (iPhone / iPad)**: Safari PWA with "Add to Home Screen" standalone support.
  - **Android**: Native APK with background transfer and native `DownloadManager` integration.
- **Frictionless Pairing**: Simple 6-digit numeric pairing codes (`XXX-XXX`) and direct session links.
- **Brute-Force Shield**: In-memory rate limiting locks out unauthorized code guessing attempts automatically.
- **Adaptive Appearance**: Auto (System default) theme with beautifully calibrated Light and Dark themes.

---

## Downloads & Quick Start

### 1. Windows PC
Download the portable package or clone the repository:
- **Portable Package**: [Download `NOVA-Drop-v1.0.0-Windows-Portable.zip`](https://github.com/patilomkar7570/NOVA-Drop/releases/download/v1.0.0/NOVA-Drop-v1.0.0-Windows-Portable.zip)
- **Silent One-Click Launch**: Double-click `NOVA-Drop.vbs` (runs quietly in background without console window and opens browser).
- **Command Prompt**: Run `NOVA-Drop.bat` or `run.bat`.

### 2. Android Phone
- **Android APK**: [Download `NOVA-Drop.apk`](https://github.com/patilomkar7570/NOVA-Drop/releases/download/v1.0.0/NOVA-Drop.apk)
- Install the APK on your Android device to transfer files directly with your PC over Wi-Fi.

### 3. iPhone & iPad (Safari PWA)
1. Ensure your iPhone/iPad is on the same Wi-Fi network as your PC.
2. Open Safari and navigate to your PC's local network address (displayed on the Overview screen, e.g. `http://192.168.x.x:3000`).
3. Tap the **Share** button in Safari and select **Add to Home Screen**.
4. Launch NOVA Drop in full-screen standalone mode.

---

## How It Works

```
[ Sender Device ]                      [ Receiver Device ]
       │                                       │
       │  1. Create Transfer Session           │
       │  (Generates 6-Digit Code)             │
       │                                       │
       │  2. Share Code (e.g. 482-915)         │
       ├──────────────────────────────────────►│
       │                                       │  3. Enter Pairing Code
       │                                       │  4. Review File Manifest
       │                                       │  5. Click Accept
       │                                       │
       │◄──────────────────────────────────────┤
       │  6. Real-Time Line-Rate Stream        │
       │══════════════════════════════════════►│  7. Browser / Native Download
       │                                       │
       │  8. Automated Session Reset           │  9. Files Saved
```

---

## Developer Setup

### Prerequisites
- Node.js (v18, v20, or v22+)
- npm (v9+)

### Installation & Build

```powershell
# Clone the repository
git clone https://github.com/patilomkar7570/NOVA-Drop.git
cd NOVA-Drop

# Install dependencies for client and server
npm install

# Build client and server bundles
npm run build

# Start the application
npm start
```

### Running Automated Tests

```powershell
npm test
```

---

## Documentation

- [Architecture & API Specification](docs/ARCHITECTURE.md)
- [Security & Privacy Model](docs/SECURITY_PRIVACY.md)
- [Features & Platform Roadmap](docs/FEATURES_LIMITATIONS.md)

---

## License

MIT © [NOVA Software](https://github.com/patilomkar7570/NOVA-Drop).
