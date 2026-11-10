# NOVA Drop — Phase 1: PC Web Edition

> **Your files. Your devices. Your network.**

NOVA Drop is a privacy-first, high-speed local file-transfer application. Its purpose is to transfer files between devices as quickly and reliably as possible, without cloud storage, third-party servers, compression, or modification of the original files.

This is a standalone product within the NOVA software family and does not depend on NOVA AI or any other NOVA application.

---

## Core Principles

- **Privacy First**: Files never touch external cloud storage or third-party servers. Works completely offline once installed.
- **Zero Compression**: 100% byte-for-byte fidelity. Images are never recompressed, videos are never transcoded, and documents are never modified.
- **Maximum Speed**: Built on native Node.js streaming APIs with backpressure handling for line-rate local transfers.
- **Cryptographic Verification**: Every file transfer is verified via streaming SHA-256 checksums before being marked complete.
- **Local-First Architecture**: Bound to `127.0.0.1` by default for secure isolation on Windows.
- **No User Accounts**: No registration, passwords, telemetry, or tracking.

---

## Technology Stack

- **Backend**: Node.js, TypeScript, Express, native streaming APIs (`stream/promises`), WebSockets (`ws`), native `crypto` module.
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide icons.
- **Testing**: Vitest, Supertest.

---

## Quick Start on Windows

### Option 1: One-Click Launch (Recommended)
Double-click `run.bat` in the project root folder. It will:
1. Verify Node.js installation.
2. Install dependencies automatically if needed.
3. Build the frontend and backend if not yet built.
4. Launch the local server on `http://127.0.0.1:3000`.
5. Open your default web browser (Edge or Chrome) automatically.

### Option 2: Command Line (PowerShell / Command Prompt)

```powershell
# 1. Install dependencies
npm.cmd install

# 2. Build client and server
npm.cmd run build

# 3. Start the application
npm.cmd start
```

Then navigate to:
```
http://127.0.0.1:3000
```

---

## Testing Local Transfers (Two Browser Windows)

Because Phase 1 is the PC Web Edition bound to `127.0.0.1`, you can test transfers between two browser windows or tabs on the same PC:

1. **Window 1 (Sender)**:
   - Open `http://127.0.0.1:3000`.
   - Go to the **Send** tab.
   - Drag & drop or browse to select files of any format.
   - Click **Create Transfer Session**.
   - Note the 6-digit pairing code (e.g., `482-915`) or click **Copy Link**.

2. **Window 2 (Receiver)**:
   - Open a second browser window (e.g. Incognito or Microsoft Edge) to `http://127.0.0.1:3000`.
   - Go to the **Receive** tab (or paste the copied link).
   - Enter the pairing code and click **Connect to Sender**.

3. **Transfer & Verification**:
   - The receiver sees the incoming file manifest (filename, size, type).
   - The receiver clicks **Accept & Stream Files**.
   - Files stream directly through the local transfer engine.
   - The browser downloads the files to the user's computer.
   - Both sender and receiver see **100% Verified** with identical SHA-256 checksums!

---

## Running the Automated Test Suite

NOVA Drop includes a comprehensive test suite covering single-file transfers, multi-file transfers, empty files, large files, special/unicode filenames, brute-force rate limiting, and SHA-256 verification:

```powershell
npm.cmd test
```

---

## Documentation

Detailed technical documentation is available in the `docs/` folder:
- [Architecture & API Specification](docs/ARCHITECTURE.md)
- [Security & Privacy Documentation](docs/SECURITY_PRIVACY.md)
- [Phase 1 Features & Known Limitations](docs/FEATURES_LIMITATIONS.md)

---

## Project Structure

```
Nova Drop/
├── client/                     # React + TypeScript + Vite frontend
│   ├── src/
│   │   ├── components/         # Sidebar, Header, etc.
│   │   ├── context/            # ThemeContext, TransferContext
│   │   ├── pages/              # Overview, Send, Receive, Transfers, History, Settings
│   │   ├── services/           # api.ts, websocket.ts
│   │   ├── types/              # Client type definitions
│   │   ├── utils/              # formatters.ts, hash helpers
│   │   ├── App.tsx             # Root application component
│   │   ├── main.tsx            # Entry point
│   │   └── index.css           # Tailwind & theme styles
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── server/                     # Node.js + TypeScript backend
│   ├── src/
│   │   ├── config.ts           # Server configuration & defaults
│   │   ├── crypto/             # SHA-256 streaming hasher & secure tokens
│   │   ├── engine/             # StreamEngine (streaming, backpressure)
│   │   ├── history/            # HistoryManager (metadata-only audit trail)
│   │   ├── realtime/           # WebSocketHandler (real-time signaling)
│   │   ├── routes/             # Versioned REST API v1 routes
│   │   ├── session/            # SessionManager & RateLimiter
│   │   ├── storage/            # StorageManager (isolated temporary storage)
│   │   └── server.ts           # Express server bootstrap & static asset serving
│   ├── tests/                  # Vitest backend integration test suite
│   ├── package.json
│   └── tsconfig.json
├── docs/                       # Technical architecture & security specifications
│   ├── ARCHITECTURE.md
│   ├── SECURITY_PRIVACY.md
│   └── FEATURES_LIMITATIONS.md
├── run.bat                     # Windows one-click batch launcher
├── run.ps1                     # Windows PowerShell launcher
├── package.json                # Root orchestration package
└── README.md                   # Product documentation
```

---

## License

MIT © NOVA Software Family.
