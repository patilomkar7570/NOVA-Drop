# NOVA Drop: Phase 1 Completed Features & Known Limitations

## 1. Completed Features (Phase 1: PC Web Edition)

### Transfer Engine & Performance
- [x] **Zero Compression Engine**: 100% byte-for-byte fidelity preservation for all file types (images, 4K/8K video, archives, documents, binaries).
- [x] **Native Node.js Streaming**: Memory-efficient streaming uploads and downloads using `stream/promises` and `pipeline()`, eliminating heap bottlenecks for gigabyte-scale files.
- [x] **Native Backpressure Handling**: Prevents socket flooding and disk I/O congestion during high-speed local transfers.
- [x] **Real-Time Streaming SHA-256 Checksum Calculation**: Custom `Sha256TransformStream` computes 256-bit hashes on the fly without secondary disk reads.
- [x] **Cryptographic Verification**: Files must pass cryptographic hash validation before a transfer is marked completed.
- [x] **RFC 6266 Compliant Headers**: Full preservation of filenames with spaces, unicode characters, and non-ASCII glyphs via `filename*=UTF-8''`.

### Session Management & Security
- [x] **Cryptographically Secure Session Generation**: 128-bit UUIDv4 identifiers and 256-bit random bearer tokens.
- [x] **Human-Friendly 6-Digit Pairing Codes**: Formatted as `XXX-XXX` for frictionless manual entry.
- [x] **Direct Session Links**: One-click pairing links (`http://127.0.0.1:3000/?pair=XXX-XXX`).
- [x] **Brute-Force Rate Limiting**: 5 failed attempts per minute trigger a 5-minute lockout cooldown.
- [x] **Automated Session Expiry**: Sessions time out after 15 minutes by default, triggering automated cleanup sweeps.
- [x] **Zero-Knowledge Temporary Storage**: Dedicated temp directory with session-level subdirectory sandboxing.
- [x] **Automated & Manual Purge Controls**: One-click cleanup button in Settings and automated cleanup upon completion.

### User Interface & Experience
- [x] **Dark-First Modern UI**: Deep charcoal backgrounds (`#0B0D13`), violet accents (`#7C3AED`, `#8B5CF6`), subtle gradients, and rounded card components.
- [x] **Light and System Theme Support**: Live theme toggle with persistent preference storage.
- [x] **Six Primary Views**:
  - **Overview**: Local server status, quick action buttons, temporary storage usage meter, privacy audit card, recent transfers summary.
  - **Send**: Multi-file drag-and-drop zone, file category badges, file removal controls, total size summary, pairing code generator, live upload progress and speed meter.
  - **Receive**: 6-digit pairing code input with auto-formatting, incoming files manifest review, explicit Accept/Decline transfer controls, direct browser stream download, verified SHA-256 badges.
  - **Active Transfers**: Real-time list of concurrent transfers, direction badges, progress bars, speed in MB/s, and ETA.
  - **History**: Detailed audit trail of completed transfers with full SHA-256 copy buttons, direction filters, search, and clear history controls.
  - **Settings**: Temporary storage location, auto-cleanup toggles, history retention controls, server details, and manual purge actions.
- [x] **Real-Time WebSocket Signaling**: Instant status updates between sender and receiver tabs without polling.

---

## 2. Phase 1 Known Scope Limitations

By design, Phase 1 strictly targets the **PC Web Edition** on Windows. The following limitations are intentional for Phase 1 and will be addressed in future phases:

1. **Localhost Loopback Binding (`127.0.0.1`)**:
   - The server is strictly bound to `127.0.0.1`.
   - Testing occurs between two separate browser windows (e.g. Edge and Chrome, or normal and incognito tabs) on the same PC.
   - Separate physical devices on the local LAN cannot connect until Phase 2 introduces LAN discovery and mutual authentication.

2. **Browser Download Trigger Mechanism**:
   - Because Phase 1 runs inside a standard desktop web browser, received files are saved via standard browser downloads (e.g. into the user's `Downloads` folder) rather than directly writing to arbitrary folder paths.

3. **Background Process Persistence**:
   - If the local Node.js server process is terminated or closed, ongoing transfers in the browser will halt.

4. **Directory / Folder Transfers**:
   - Phase 1 transfers individual and multiple files. Recursive folder hierarchy transfers will be introduced with native filesystem APIs in Phase 2.

---

## 3. Future Roadmap

### Phase 2: NOVA Drop Desktop (Windows)
- Native Electron wrapper with Windows EXE installer and portable EXE.
- Windows Explorer context menu integration ("Send with NOVA Drop").
- LAN server binding with local network device discovery (mDNS).
- Native destination folder picker for incoming files.

### Phase 3: NOVA Drop iOS
- Safari-optimized web interface with "Add to Home Screen" PWA support.
- Native photo and video picker integration.
- Direct Files app download handling.

### Phase 4: NOVA Drop Android
- Native Android APK.
- Wi-Fi Direct and local network discovery.
- System Share Sheet integration and foreground transfer background services.
