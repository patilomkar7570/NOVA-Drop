type EventCallback = (data: any) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<EventCallback>>();
  private reconnectTimer: any = null;
  private currentSessionId: string | null = null;
  private currentRole: 'sender' | 'receiver' | null = null;
  private currentToken: string | null = null;
  private isExplicitlyClosed = false;

  public connect(sessionId: string, role: 'sender' | 'receiver', token = ''): void {
    this.currentSessionId = sessionId;
    this.currentRole = role;
    this.currentToken = token;
    this.isExplicitlyClosed = false;

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.ws?.send(
        JSON.stringify({
          type: 'join_session',
          sessionId,
          role,
          token,
        })
      );
      this.emit('connected', { sessionId, role });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type) {
          this.emit(data.type, data);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    this.ws.onclose = () => {
      this.emit('disconnected', {});
      if (!this.isExplicitlyClosed && this.currentSessionId) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          if (!this.isExplicitlyClosed && this.currentSessionId && this.currentRole) {
            this.connect(this.currentSessionId, this.currentRole, this.currentToken || '');
          }
        }, 2000);
      }
    };

    this.ws.onerror = (err) => {
      this.emit('error', err);
    };
  }

  public send(type: string, payload: Record<string, any> = {}): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...payload }));
    }
  }

  public on(event: string, callback: EventCallback): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(callback);
    return () => set?.delete(callback);
  }

  public emit(event: string, data: any): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const cb of set) {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in listener for event ${event}:`, err);
        }
      }
    }
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.currentSessionId = null;
    this.currentRole = null;
  }
}

export const wsClient = new WebSocketClient();
