import {
  HistoryItem,
  SessionData,
  SettingsData,
  SystemStatusData,
} from '../types/index.js';

const API_BASE = '/api/v1';

export async function createSession(timeoutMinutes?: number): Promise<{
  sessionId: string;
  pairingCode: string;
  token: string;
  role: 'sender';
  expiresAt: number;
  session: SessionData;
}> {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ timeoutMinutes }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to create transfer session');
  }
  return res.json();
}

export async function joinSession(pairingCode: string): Promise<{
  sessionId: string;
  pairingCode: string;
  token: string;
  role: 'receiver';
  expiresAt: number;
  session: SessionData;
}> {
  const res = await fetch(`${API_BASE}/sessions/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pairingCode }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to join session');
  }
  return res.json();
}

export async function getSession(sessionId: string): Promise<SessionData> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`);
  if (!res.ok) {
    throw new Error('Session not found or expired');
  }
  return res.json();
}

export async function registerFiles(
  sessionId: string,
  files: Array<{ name: string; size: number; type: string; sha256?: string }>
): Promise<Array<{ id: string; name: string; size: number; type: string }>> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to register files');
  }
  const data = await res.json();
  return data.files;
}

export async function acceptTransfer(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/accept`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to accept transfer');
}

export async function rejectTransfer(sessionId: string, reason?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error('Failed to reject transfer');
}

export async function cancelSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/cancel`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to cancel session');
}

/**
 * Uploads a file stream directly with zero compression.
 * Uses XMLHttpRequest to provide real-time browser upload progress.
 */
export function uploadFileStream(
  sessionId: string,
  fileId: string,
  file: File,
  onProgress: (bytes: number, total: number) => void
): Promise<{ sha256: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${API_BASE}/sessions/${sessionId}/files/${fileId}/upload`;

    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        onProgress(evt.loaded, evt.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve({ sha256: res.sha256 });
        } catch {
          resolve({ sha256: '' });
        }
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText);
          reject(new Error(errRes.error || `Upload failed with status ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.onabort = () => reject(new Error('Upload aborted'));

    xhr.send(file);
  });
}

export function getDownloadUrl(sessionId: string, fileId: string): string {
  return `${API_BASE}/sessions/${sessionId}/files/${fileId}/download`;
}

export async function verifyTransfer(
  sessionId: string,
  fileId: string,
  receiverHash?: string
): Promise<{ verified: boolean; sha256: string }> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/files/${fileId}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ receiverHash }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Verification failed');
  }
  return res.json();
}

export async function getHistory(): Promise<{ records: HistoryItem[]; total: number; enabled: boolean }> {
  const res = await fetch(`${API_BASE}/history`);
  if (!res.ok) throw new Error('Failed to load history');
  return res.json();
}

export async function clearHistory(): Promise<void> {
  const res = await fetch(`${API_BASE}/history`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear history');
}

export async function getSettings(): Promise<SettingsData> {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to load settings');
  return res.json();
}

export async function updateSettings(settings: Partial<SettingsData>): Promise<void> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to update settings');
}

export async function clearTempStorage(): Promise<{ filesRemoved: number; bytesFreed: number }> {
  const res = await fetch(`${API_BASE}/settings/clear-temp`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to clear temp storage');
  return res.json();
}

export async function getSystemStatus(): Promise<SystemStatusData> {
  const res = await fetch(`${API_BASE}/system/status`);
  if (!res.ok) throw new Error('Failed to fetch system status');
  return res.json();
}
