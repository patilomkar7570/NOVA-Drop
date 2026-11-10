# NOVA Drop v1.0.0 — Privacy-First High-Speed File Transfer

> **Your files. Your devices. Your network.**
> 
> High-speed, local-first file transfer across Windows PCs, Android phones, iPhones, and tablets with zero cloud storage, zero compression, full file & folder support, and byte-for-byte SHA-256 integrity verification.

---

### What's New & Included in this Release

#### 1. Full Folder & File Upload Support
- **Upload Files & Upload Folders**: Choose between uploading individual files or entire folders with complex nested structures.
- **Drag & Drop Folder Traversal**: Drag and drop directories directly into the browser — NOVA Drop recursively scans and preserves relative paths.
- **Folder Structure Preservation**: Original filenames, subfolder paths, and hierarchy are maintained and verified.

#### 2. Windows Installer (`NOVA-Drop-Setup.exe`)
- Standard Windows Setup wizard built with Inno Setup.
- Installs NOVA Drop to your PC with clean Desktop and Start Menu shortcuts.
- Features a dedicated **"Launch NOVA Drop immediately"** button upon setup completion.
- Self-contained with bundled runtime — no external dependencies needed.

#### 3. Windows Portable Standalone (`NOVA-Drop-Portable.exe`)
- **Zero installation required.** A true single `.exe` executable.
- Click to launch immediately anywhere (Desktop, Downloads, USB stick).
- Starts the local transfer engine, automatically detects your Wi-Fi address, copies the URL to your clipboard, and opens your browser.

#### 4. Android Mobile Application (`NOVA-Drop.apk`)
- Native Android app with system `DownloadManager` integration.
- Downloads files directly to your phone's default Downloads folder.
- Built-in connect screen: simply paste the URL displayed on your PC to connect instantly.

#### 5. iPhone, iPad & Mobile Web Edition (Safari PWA)
- No app installation needed on iOS!
- Connect your iPhone/iPad to the same Wi-Fi as your PC, paste the URL into Safari, and transfer files.
- Supports **Add to Home Screen** for a fullscreen native app experience.

---

### Instant Wi-Fi URL Workflow: How to Transfer Files & Folders

Whenever you run **NOVA-Drop-Portable.exe**, **NOVA-Drop-Setup.exe**, or the **NOVA Drop APK**, the app automatically gives you a direct local Wi-Fi URL:

1. **Launch on PC:**
   - Double-click `NOVA-Drop-Portable.exe` or launch from the installer.
   - It displays:
     - **Local PC URL:** `http://localhost:3000`
     - **Mobile / Wi-Fi URL:** `http://<YOUR_PC_IP>:3000` (e.g. `http://192.168.31.75:3000`)
   - The Mobile Wi-Fi URL is **automatically copied to your Windows clipboard**!
   - NOVA Drop opens in your browser automatically.

2. **Open on Phone or Tablet:**
   - Ensure phone and PC are on the same Wi-Fi.
   - Open Safari / Chrome or the NOVA Drop Android APK.
   - Paste the URL (e.g. `http://192.168.31.75:3000`).

3. **Transfer Instantly:**
   - Select your files or folders (**Upload Files** or **Upload Folders**) and click **Create Transfer Session**.
   - On the other device, click **Accept & Receive Items**.
   - Files stream sequentially at full line-rate Wi-Fi speed with real-time percentage progress and cryptographic SHA-256 verification.
   - Sessions cleanly auto-reset and purge temporary files upon completion.

---

### Release Binaries & Checksums

| File | Type | Size | SHA-256 Checksum |
| :--- | :---: | :---: | :--- |
| **`NOVA-Drop-Setup.exe`** | Windows Installer | 24.9 MB | `49CE94C9C134D71664360B1A34D32D614D025E801D87D70F7ED1B582179D9BA4` |
| **`NOVA-Drop-Portable.exe`** | Windows Portable EXE | 35.3 MB | `CCD1F88CA1ECE876088FF7B4C777840E650DF99078B9B6450E3B25A1AEDD710A` |
| **`NOVA-Drop.apk`** | Android Application | 3.9 MB | `9A0162EF5C821401BAA7E16DA13AA1E5A7499ECBF0A0C9F5D16AFA2B46C53B3E` |

---

*NOVA Drop is 100% open-source under the MIT License.*
