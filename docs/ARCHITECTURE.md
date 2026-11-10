# NOVA Drop Architecture Specification

## 1. System Overview

**NOVA Drop** is an ultra-fast, privacy-first local file transfer engine and web application. It operates under the core principle: **"Your files. Your devices. Your network."**

NOVA Drop enables direct, uncompressed, byte-for-byte identical file transfers without cloud storage, third-party relays, user accounts, or compression.

```
┌─────────────────────────────────────────────────────────────┐
│                       NOVA DROP CLIENT                      │
│             (React 18 + TypeScript + Vite + Tailwind)       │
│                                                             │
│   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│   │   Overview    │  │   Send Page   │  │ Receive Page  │   │
│   └───────────────┘  └───────────────┘  └───────────────┘   │
│   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│   │ActiveTransfer │  │    History    │  │   Settings    │   │
│   └───────────────┘  └───────────────┘  └───────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP /api/v1/ (REST)
                           │ WS /ws (Real-Time Signaling)
┌──────────────────────────▼──────────────────────────────────┐
│                   NOVA DROP BACKEND ENGINE                  │
│                     (Node.js + Express)                     │
│                                                             │
│  ┌──────────────────┐  ┌─────────────────┐ ┌──────────────┐ │
│  │  SessionManager  │  │   RateLimiter   │ │ Crypto/Hash  │ │
│  └────────┬─────────┘  └─────────────────┘ └──────┬───────┘ │
│           │                                       │         │
│  ┌────────▼───────────────────────────────────────▼───────┐ │
│  │                    StreamEngine                        │ │
│  │   (Native Node.js Stream Pipeline + Backpressure)      │ │
│  └────────┬───────────────────────────────────────────────┘ │
│           │                                                 │
│  ┌────────▼─────────┐                    ┌────────────────┐ │
│  │  StorageManager  │                    │ HistoryManager │ │
│  │(Dedicated TempDir)                    │(Metadata Only) │ │
│  └──────────────────┘                    └────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Components

### 2.1 StreamEngine (`server/src/engine/StreamEngine.ts`)
The transfer engine relies on native Node.js streaming APIs (`stream/promises`, `fs.createReadStream`, `fs.createWriteStream`, and custom `Sha256TransformStream`).
- **Zero In-Memory Buffering**: Large files (e.g. 2 GB to 50 GB+) never load into Node.js heap memory. Chunks flow directly from HTTP request sockets to disk write streams.
- **Native Backpressure**: Node's `pipeline()` monitors write stream drain events. If disk writes lag behind network speed, request stream read pauses automatically, preventing memory leaks or exhaustion.
- **On-The-Fly SHA-256 Hashing**: Files pass through a non-mutating `Sha256TransformStream` during transit, calculating the 256-bit cryptographic digest on the fly with zero extra disk I/O.
- **Strict Byte-for-Byte Fidelity**: Bytes are transferred unaltered. No compression, no format transcoding, no metadata stripping.

### 2.2 SessionManager (`server/src/session/SessionManager.ts`)
- Manages transfer sessions with high entropy identifiers:
  - `sessionId`: Cryptographically secure UUIDv4.
  - `pairingCode`: Human-friendly 6-digit numeric code formatted as `XXX-XXX` (generated using `crypto.randomInt`).
  - `token`: 64-character hex bearer token (`crypto.randomBytes(32)`).
- Enforces session lifecycles: `waiting_for_receiver` → `connected` → `transferring` → `completed` / `cancelled` / `expired`.
- Automatic session expiration (default 15 minutes) with scheduled sweepers.

### 2.3 RateLimiter (`server/src/session/RateLimiter.ts`)
- Protects the 6-digit pairing code space from brute-force automated dictionary attacks.
- Limits failed attempts to 5 per minute per IP.
- Enforces a 5-minute cooldown lockout when threshold is crossed.

### 2.4 StorageManager (`server/src/storage/StorageManager.ts`)
- Manages an isolated temporary directory (e.g. `OS_TEMP/nova-drop-temp`).
- Sanitizes file and session IDs to prevent path traversal attacks.
- Automated cleanup upon transfer completion and session cancellation.
- Immediate manual purge capability via API (`POST /api/v1/settings/clear-temp`).

### 2.5 HistoryManager (`server/src/history/HistoryManager.ts`)
- Persists transfer audit trails to local JSON.
- **Strict Privacy Rule**: Only records metadata (`filename`, `fileSize`, `timestamp`, `direction`, `sha256`, `status`). **Never stores file contents.**
- Provides toggle to disable history and button to clear all records.

### 2.6 WebSocketHandler (`server/src/realtime/WebSocketServer.ts`)
- Provides real-time bidirectional signaling between sender and receiver.
- Event rooms segmented by `sessionId`.
- Events: `peer_joined`, `files_offered`, `transfer_accepted`, `transfer_rejected`, `transfer_progress` (speed, ETA, bytes), `file_ready`, `file_verified`, `session_completed`, `session_cancelled`.

---

## 3. Versioned REST API Specification (`/api/v1/`)

### Session Management
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/sessions` | Create a new session. Returns `sessionId`, `pairingCode`, `token`, `role: 'sender'`. |
| `POST` | `/api/v1/sessions/join` | Join via pairing code (rate-limited). Returns `sessionId`, `token`, `role: 'receiver'`. |
| `GET` | `/api/v1/sessions/:id` | Retrieve session metadata and file manifests. |
| `POST` | `/api/v1/sessions/:id/files` | Register file manifests offered by sender. |
| `POST` | `/api/v1/sessions/:id/accept` | Receiver accepts the incoming transfer. |
| `POST` | `/api/v1/sessions/:id/reject` | Receiver declines the transfer with optional reason. |
| `POST` | `/api/v1/sessions/:id/cancel` | Cancel session and trigger immediate storage purge. |

### File Streaming & Verification
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/sessions/:id/files/:fileId/upload` | Stream file bytes (`application/octet-stream`). Calculates SHA-256 on the fly. |
| `GET` | `/api/v1/sessions/:id/files/:fileId/download` | Stream download file with RFC 6266 `Content-Disposition` and `X-NOVA-SHA256` header. |
| `POST` | `/api/v1/sessions/:id/files/:fileId/verify` | Verify receiver's calculated checksum against sender's checksum. |

### System, History & Settings
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/transfers/active` | Query currently streaming active transfers. |
| `GET` | `/api/v1/history` | Retrieve transfer log metadata. |
| `DELETE` | `/api/v1/history` | Clear all transfer logs. |
| `GET` | `/api/v1/settings` | Retrieve server and storage settings. |
| `PATCH` | `/api/v1/settings` | Update settings (cleanup, history toggle, temp directory). |
| `POST` | `/api/v1/settings/clear-temp` | Wipe all temporary transfer files immediately. |
| `GET` | `/api/v1/system/status` | Real-time health, privacy verification, memory, storage usage. |

---

## 4. Multi-Client Roadmap (Phase 2 — Phase 4)

NOVA Drop's modular architecture separates the core transfer engine, session management, and REST/WebSocket API from the UI layer. This ensures seamless reuse across upcoming platforms:

```
                  ┌─────────────────────────────────────────┐
                  │          NOVA Drop Core Engine          │
                  │   REST API (/api/v1/) + WebSocket (/ws) │
                  └────────────────────┬────────────────────┘
                                       │
        ┌──────────────────┬───────────┴───────────┬──────────────────┐
        │                  │                       │                  │
 ┌──────▼──────┐   ┌───────▼────────┐      ┌───────▼────────┐  ┌──────▼──────┐
 │   Phase 1   │   │    Phase 2     │      │    Phase 3     │  │   Phase 4   │
 │   PC Web    │   │ Windows Desktop│      │    iOS Web     │  │   Android   │
 │   (Built)   │   │   (Electron)   │      │ (Safari / PWA) │  │  (Native)   │
 └─────────────┘   └────────────────┘      └────────────────┘  └─────────────┘
```

### Phase 2: Windows Desktop Edition (Electron / Native)
- **Engine Reuse**: Electron main process will package the existing Node.js server directly as a local sidecar service.
- **Native Enhancements**: Adds native Windows Explorer shell context menus ("Send with NOVA Drop"), system tray minimization, native folder drag-and-drop, and local LAN discovery (mDNS/SSDP).

### Phase 3: iOS Web Edition (Safari / PWA)
- **Engine Reuse**: Interacts with the same `/api/v1/` endpoints.
- **Mobile UX**: Utilizes iOS Photo Library picker (`input type="file" accept="image/*,video/*"`), Files app integration, and "Add to Home Screen" standalone PWA manifest.

### Phase 4: Android Edition (Native Kotlin / APK)
- **Engine Reuse**: Native Android HTTP client (`OkHttp`) streams directly to the `/api/v1/` streaming upload/download endpoints.
- **Native Enhancements**: System Share Sheet integration, background foreground transfer services with persistent notification bar progress, and Wi-Fi Direct pairing.
