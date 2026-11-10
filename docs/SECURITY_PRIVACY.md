# NOVA Drop Security & Privacy Specification

## 1. Privacy-First Principles

Privacy is not an add-on in NOVA Drop; it is the fundamental architectural constraint.

| Requirement | Implementation in NOVA Drop |
|---|---|
| **Zero Cloud Storage** | Files never touch AWS, GCP, Azure, or any third-party relay servers. |
| **Zero Telemetry** | No Google Analytics, no tracking pixels, no crash reporters, no ping-backs. |
| **No User Accounts** | No email addresses, phone numbers, passwords, or registrations required. |
| **Offline Operation** | Works completely offline on loopback (`127.0.0.1`) without an active internet connection. |
| **Zero Compression** | Original bytes are preserved identically. Files are never transcoded or compressed. |
| **Zero File Retention** | Temporary transfer files are purged upon session completion or manual request. |

---

## 2. Network Isolation & Binding Policy

For Phase 1 (PC Web Edition):
- The server binds strictly to `127.0.0.1` (localhost loopback) by default.
- It rejects cross-origin requests from non-localhost origins using strict CORS headers:
  ```typescript
  if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    callback(null, true);
  } else {
    callback(new Error('Cross-origin requests blocked by NOVA Drop privacy policy'));
  }
  ```
- Public internet exposure and automated LAN broadcasts are intentionally disabled in Phase 1 to prevent unauthorized local network discovery before full LAN mutual authentication is deployed.

---

## 3. Session Security & Pairing Architecture

### 3.1 Unpredictable Session Identifiers
Transfer sessions are generated using Node.js's native cryptographically secure pseudorandom number generator (`crypto`):
- **Session UUID**: Version 4 UUID (`crypto.randomUUID()`) offering 122 bits of entropy.
- **Session Bearer Token**: 32-byte cryptographically secure random value (`crypto.randomBytes(32).toString('hex')`) with 256 bits of entropy.

### 3.2 Temporary Pairing Codes
To facilitate easy human pairing between browser windows or local devices without QR codes, NOVA Drop uses 6-digit numeric pairing codes:
- Generated using `crypto.randomInt(100000, 1000000)` formatted as `XXX-XXX`.
- Each code represents a single active transfer session and expires automatically.

### 3.3 Brute-Force Rate Limiting (`RateLimiter`)
Because 6-digit codes comprise $10^6$ combinations, NOVA Drop enforces in-memory rate limiting on pairing attempts:
- **Maximum Failures**: 5 consecutive incorrect code submissions within a 60-second window.
- **Cooldown Lockout**: Upon reaching 5 failures, the client IP is blocked from submitting pairing codes for **5 minutes (300 seconds)**.
- **Immediate Reset**: A successful pairing code verification resets the failure counter immediately.

### 3.4 Session Expiration
- Sessions possess a strict time-to-live (`expiresAt`), defaulting to 15 minutes.
- A background garbage-collection sweep runs every 60 seconds, invalidating expired sessions and wiping associated temporary files from disk.

---

## 4. Zero Compression & Byte-for-Byte Integrity Guarantee

NOVA Drop strictly prohibits any form of automatic file modification:
- **Never compresses or archives files** unless the user intentionally selected a pre-existing `.zip` or `.tar`.
- **Never downscales or recompresses images** (JPEG, PNG, WebP, RAW).
- **Never transcodes audio or video** (MP4, MKV, MP3, FLAC).
- **Never strips EXIF, IPTC, or document metadata**.

### SHA-256 Verification Lifecycle
```
[Sender Browser]
      │
      │ 1. Stream raw binary bytes (application/octet-stream)
      ▼
[NOVA Drop Node.js StreamEngine]
      │
      ├─► Sha256TransformStream ──► Compute sender SHA-256 on the fly
      │
      └─► fs.createWriteStream ──► Store in isolated temp directory
      │
      │ 2. Broadcast computed SHA-256 via WebSocket ('file_ready')
      ▼
[Receiver Browser]
      │
      │ 3. Stream download (GET /api/v1/sessions/:id/files/:fileId/download)
      │    Receives 'X-NOVA-SHA256' header + RFC 6266 filename
      ▼
[Integrity Verification]
      │
      │ 4. Client / Server confirms hash matches byte-for-byte
      ▼
[Transfer Marked Complete] (100% Byte-for-Byte Verified)
```

**Rule**: NOVA Drop never marks a transfer as complete or successful before SHA-256 verification has passed.

---

## 5. Temporary Storage Isolation & Lifecycle

- **Dedicated Directory**: Stored exclusively within the OS temporary directory (`OS_TEMP/nova-drop-temp`), isolated from user documents and permanent application storage.
- **Directory Traversal Protection**: Session IDs and File IDs are strictly sanitized using regular expressions (`/[^a-zA-Z0-9-]/g`) before interacting with filesystem paths.
- **Session Sandboxing**: Each session's files are held in a separate subdirectory (`session_<id>/`).
- **Immediate Cleanup**:
  - When receiver finishes and verifies all files, temporary storage is removed.
  - When either party cancels, temporary files are destroyed immediately.
  - Users can manually trigger a full storage purge from the UI Settings page at any time.

---

## 6. History Retention Policy

- History entries contain **only metadata**:
  - Session ID
  - Original Filename
  - File Size (bytes)
  - Direction (`send` or `receive`)
  - SHA-256 Checksum
  - Timestamp
  - Duration & Average Speed
- **Never contains file bytes, thumbnails, or content snippets**.
- Users can toggle transfer history off completely in Settings or clear history with one click.
