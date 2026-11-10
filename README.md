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

**NOVA Drop** is an ultra-fast, local-first file transfer application built for instant file sharing between your PC, phone, and tablet over your local Wi-Fi network. It operates without cloud storage, third-party relays, user accounts, or file compression.

Whether transferring original 4K video clips, high-resolution RAW photos, large archives, or documents, NOVA Drop transfers original bytes with cryptographic SHA-256 verification and line-rate local Wi-Fi speed.

---

## Key Features

- **Privacy First**: Files stream directly through your local network. Zero external cloud storage, zero tracking, and zero telemetry.
- **Zero Compression**: 100% byte-for-byte fidelity. Media is never transcoded, recompressed, or downscaled. Original filenames, extensions, and metadata are preserved.
- **Full Folder & File Support**: Upload individual files or entire folders with nested directory structures using dedicated **Upload Files** and **Upload Folders** selectors.
- **Line-Rate Local Speed**: Built on native streaming pipelines with backpressure handling for smooth gigabyte-scale transfers.
- **Multi-Platform Support**:
  - **Windows (Portable EXE)**: Standalone single-file executable (`NOVA-Drop-Portable.exe`). Double-click to run immediately with zero installation.
  - **Windows (Setup Installer)**: Full Windows Installer (`NOVA-Drop-Setup.exe`) with desktop/Start Menu shortcuts and a dedicated one-click launch button upon completion.
  - **Android (Native APK)**: Native application (`NOVA-Drop.apk`) with background transfers and system `DownloadManager` integration.
  - **iOS (iPhone & iPad)**: High-performance Safari Web Edition with "Add to Home Screen" standalone PWA support.
- **Instant Wi-Fi URL Sharing**: Whenever the application is run, it displays and automatically copies the direct local Wi-Fi address so you can paste it into any phone or device to begin copying data immediately.
- **Frictionless Pairing**: Simple 6-digit numeric pairing codes (`XXX-XXX`) and direct session links.
- **Brute-Force Shield**: In-memory rate limiting locks out unauthorized code guessing attempts automatically.
- **Adaptive Appearance**: Auto (System default) theme with high-contrast, calibrated Dark and Light themes.

---

## Downloads (Release v1.0.0)

| Package | Format | Description |
| :--- | :---: | :--- |
| **[NOVA-Drop-Portable.exe](https://github.com/patilomkar7570/NOVA-Drop/releases/download/v1.0.0/NOVA-Drop-Portable.exe)** | `.exe` (Standalone) | **No installation required.** Double-click to start immediately. Includes self-contained engine, displays your Wi-Fi URL, copies it to clipboard, and opens your browser. |
| **[NOVA-Drop-Setup.exe](https://github.com/patilomkar7570/NOVA-Drop/releases/download/v1.0.0/NOVA-Drop-Setup.exe)** | `.exe` (Installer) | **Windows Setup Installer.** Installs NOVA Drop on your PC, creates Start Menu & Desktop shortcuts, and provides a dedicated **"Launch NOVA Drop"** button on completion. |
| **[NOVA-Drop.apk](https://github.com/patilomkar7570/NOVA-Drop/releases/download/v1.0.0/NOVA-Drop.apk)** | `.apk` (Android) | **Android Mobile App.** Connects over local Wi-Fi, receives original files to your phone's Downloads folder, and uploads files back to your PC. |

---

## How to Transfer Files: Instant Wi-Fi URL Workflow

Whenever you run **NOVA-Drop-Portable.exe**, **NOVA-Drop-Setup.exe**, or the **NOVA Drop APK**, NOVA Drop gives you a direct Wi-Fi URL that connects all devices on the same network instantly:

### Step 1: Start NOVA Drop on Your PC
- Run **`NOVA-Drop-Portable.exe`** or launch from the installer.
- NOVA Drop displays:
  - **Local PC Access:** `http://localhost:3000`
  - **Mobile / Wi-Fi Access:** `http://<YOUR_PC_IP>:3000` (e.g. `http://192.168.31.75:3000`)
- The Mobile Wi-Fi URL is **automatically copied to your clipboard**!
- NOVA Drop opens automatically in your default browser.

### Step 2: Open on Your Phone or Tablet
- Ensure your phone is connected to the same Wi-Fi network.
- **Option A (Android App):** Open `NOVA-Drop.apk` on your phone and tap **Connect**.
- **Option B (iPhone / iPad / Android Browser):** Open Safari or Chrome and paste the URL (e.g. `http://192.168.31.75:3000`).

### Step 3: Transfer at Maximum Speed
- **To Send:** Drag & drop files on your PC or tap Browse on your phone. Click **Create Transfer Session**.
- **To Receive:** Enter the 6-digit code or tap the direct link. Click **Accept & Receive Files**.
- Files stream byte-for-byte directly over your local Wi-Fi network with cryptographic SHA-256 integrity verification.

---

## Transfer Architecture

```
[ Sender Device (PC / Phone) ]         [ Receiver Device (PC / Phone) ]
              │                                       │
              │  1. Create Transfer Session           │
              │  (Generates 6-Digit Code)             │
              │                                       │
              │  2. Share Wi-Fi URL or Code           │
              ├──────────────────────────────────────►│
              │                                       │  3. Connect via URL or Code
              │                                       │  4. Review File Manifest
              │                                       │  5. Click Accept & Receive
              │                                       │
              │◄──────────────────────────────────────┤
              │  6. Streaming Direct Wi-Fi Pipe       │
              │══════════════════════════════════════►│  7. Line-Rate Download
              │                                       │     (Progress Tracked)
              │                                       │
              │  8. Cryptographic SHA-256 Verified   │  9. Files Saved
              │◄──────────────────────────────────────┤
              │  10. Session Auto-Cleaned & Purged    │
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

# Install dependencies
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

All 18 comprehensive engine and streaming security tests run via Vitest.

---

## Documentation

- [Architecture & API Specification](docs/ARCHITECTURE.md)
- [Security & Privacy Model](docs/SECURITY_PRIVACY.md)
- [Features & Platform Roadmap](docs/FEATURES_LIMITATIONS.md)

---

## License

MIT © [NOVA Software](https://github.com/patilomkar7570/NOVA-Drop).
