# NOVA Drop v1.0.0 — Privacy-First High-Speed File Transfer

> **Your files. Your devices. Your network.**
> 
> High-speed, local-first file transfer across Windows PCs, Android phones, iPhones, and tablets with zero cloud storage, zero compression, full file & folder support, and byte-for-byte SHA-256 integrity verification.

---

### What's New & Included in this Release

#### 1. Windows Installable Application (`NOVA-Drop-Setup.exe`)
- **Native Windows Desktop Window**: Launches as a true desktop application on PC — not as a browser tab. Opens in its own clean standalone application window with the boxed NOVA logo.
- **Instant Automatic Live Engine**: The moment you open the app, the local engine automatically goes live on `0.0.0.0:3000` (`localhost:3000`).
- **Automatic Wi-Fi URL Clipboard Copy**: Immediately detects your local Wi-Fi IP and copies the direct mobile link (e.g. `http://192.168.31.75:3000`) to your Windows clipboard so you can paste it straight on your phone.
- **Dedicated Installer Wizard**: Clean setup wizard with Desktop shortcut, Start Menu shortcut, boxed application icon, and a **"Launch NOVA Drop immediately"** button upon installation.
- **Self-Contained**: Bundled local Node runtime — no manual dependencies or technical setup required.

#### 2. Android Mobile Application (`NOVA-Drop.apk`)
- Native Android app with system `DownloadManager` integration.
- Downloads files directly to your phone's default Downloads folder with zero loss of quality.
- Built-in connect screen: simply paste the URL displayed on your PC to connect instantly.

#### 3. Full Folder & File Upload Support
- **Upload Files & Upload Folders**: Dedicated buttons to choose between uploading individual files or entire folders with complex nested directory hierarchies.
- **Drag & Drop Folder Traversal**: Drag and drop entire directories directly into NOVA Drop — recursively scans and preserves all subfolder paths.
- **Integrity Preservation**: Original filenames, subfolder paths, and file integrity are preserved and verified via SHA-256 checksums.

#### 4. iPhone, iPad & Mobile Web Edition (Safari PWA)
- No app installation needed on iOS!
- Connect your iPhone or iPad to the same Wi-Fi as your PC, paste the URL into Safari, and transfer files.
- Supports **Add to Home Screen** for a fullscreen, distraction-free app experience.

---

### Instant Wi-Fi URL Workflow: How to Transfer Files & Folders

Whenever you open **NOVA Drop** on your PC, the app automatically goes live and gives you your direct local Wi-Fi URL:

1. **Launch on PC:**
   - Open NOVA Drop from your Desktop or Start Menu.
   - It starts immediately in its own standalone desktop window.
   - The Mobile Wi-Fi URL (e.g. `http://192.168.31.75:3000`) is **automatically copied to your Windows clipboard**!

2. **Open on Phone or Tablet:**
   - Ensure your phone and PC are connected to the same Wi-Fi network.
   - Open Safari / Chrome or launch the **NOVA Drop Android APK**.
   - Paste the copied URL (e.g. `http://192.168.31.75:3000`).

3. **Transfer Instantly:**
   - Select your files or folders (**Upload Files** or **Upload Folders**) and click **Create Transfer Session**.
   - On the receiving device, click **Accept & Receive Items**.
   - Files stream sequentially at full line-rate Wi-Fi speed with real-time percentage progress and cryptographic SHA-256 verification.
   - Sessions automatically reset and purge temporary buffers upon transfer completion.

---

### Release Binaries & Checksums

| File | Platform | Size | SHA-256 Checksum |
| :--- | :---: | :---: | :--- |
| **`NOVA-Drop-Setup.exe`** | Windows Installer | 24.9 MB | `52308D96E401E78FB7E00E436EB48CA78102C9BC05899CE687A2A7F50DA4B333` |
| **`NOVA-Drop.apk`** | Android Application | 3.9 MB | `9A0162EF5C821401BAA7E16DA13AA1E5A7499ECBF0A0C9F5D16AFA2B46C53B3E` |

---

*NOVA Drop is 100% open-source under the MIT License.*
