import { io, Socket } from 'socket.io-client';
import { useChatStore } from '/lib/store/chat-store';
import { StreamingResponse } from '/lib/types';

type PendingEntry = {
  base: string;   // content already committed to the store for this message id
  buffer: string; // not-yet-flushed new chars
  done: boolean;  // marks completion; rAF loop finalizes and clears entry
};

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  // rAF-batched flusher with per-message pending buffers
  private pending = new Map<string, PendingEntry>();
  private rafId: number | null = null;
  private minFlushIntervalMs = 50; // ~20 FPS
  private lastFlushAt = 0;

  // Read current assistant content from store once per id init
  private getAssistantContent(id: string): string {
    const { sessions } = useChatStore.getState();
    for (const s of sessions) {
      const m = s.messages.find((mm) => mm.id === id && mm.role === 'assistant');
      if (m) return m.content || '';
    }
    return '';
  }

  private startFlushLoop() {
    if (this.rafId !== null) return;

    const loop = (ts: number) => {
      const elapsed = ts - this.lastFlushAt;

      if (elapsed >= this.minFlushIntervalMs) {
        const { updateMessage, setStreaming } = useChatStore.getState();

        for (const [id, p] of this.pending.entries()) {
          // Skip if no new buffer and not done
          if (!p.buffer && !p.done) continue;

          // Commit combined content in one batched update
          const combined = p.base + p.buffer;
          updateMessage(id, {
            content: combined,
            isStreaming: !p.done,
          });

          // Advance base, clear buffer
          p.base = combined;
          p.buffer = '';

          if (p.done) {
            this.pending.delete(id);
            setStreaming(false);
          }
        }

        this.lastFlushAt = ts;
      }

      if (this.pending.size > 0) {
        this.rafId = requestAnimationFrame(loop);
      } else {
        if (this.rafId !== null) cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    };

    this.rafId = requestAnimationFrame(loop);
  }

  /**
   * Accept both streaming protocols:
   * - cumulative snapshots (full-so-far)
   * - delta tokens (new 50-char chunks, etc.)
   *
   * Heuristic:
   * - If payload starts with (base+buffer), treat as snapshot; take only new suffix.
   * - Else if payload starts with base (but skipped buffer), replace with snapshot.
   * - Else treat as delta; append as-is.
   */
  private queueMixed(id: string, payload: string, done: boolean) {
    let entry = this.pending.get(id);
    if (!entry) {
      entry = {
        base: this.getAssistantContent(id), // whatever is already shown in the UI
        buffer: '',
        done: false,
      };
      this.pending.set(id, entry);
    }

    if (payload) {
      const committed = entry.base + entry.buffer;

      if (payload.startsWith(committed)) {
        // Snapshot mode: payload is the full-so-far string; take only the new part.
        const suffix = payload.slice(committed.length);
        if (suffix) entry.buffer += suffix;
      } else if (payload.startsWith(entry.base)) {
        // Snapshot diverged from our buffered view (server skipped our buffer).
        // Replace with server's snapshot to stay correct.
        entry.base = '';
        entry.buffer = payload;
      } else {
        // Delta mode: payload is just the next chunk; append it.
        entry.buffer += payload;
      }
    }

    if (done) entry.done = true;
    this.startFlushLoop();
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
          transports: ['websocket'],
          upgrade: true,
          rememberUpgrade: true,
          timeout: 10000,
        });

        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          useChatStore.getState().setConnectionStatus('connected');
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on('disconnect', () => {
          console.log('WebSocket disconnected');
          useChatStore.getState().setConnectionStatus('disconnected');
          this.handleReconnect();
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          useChatStore.getState().setConnectionStatus('disconnected');
          reject(error);
        });

        this.socket.on('streaming_response', (data: StreamingResponse) => {
          this.handleStreamingResponse(data);
        });

        this.socket.on('stream_complete', (data: { id: string }) => {
          this.handleStreamComplete(data.id);
        });

        this.socket.on('stream_error', (data: { id: string; error: string }) => {
          this.handleStreamError(data.id, data.error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.pending.clear();
  }

  sendMessage(message: string, sessionId: string, agentId: string, messageId: string): string {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }

    this.socket.emit('send_message', {
      id: messageId,
      message,
      sessionId,
      agentId,
    });
    console.log('[Console] Sent:', messageId, message, sessionId, agentId);

    return messageId;
  }

  private handleStreamingResponse(data: StreamingResponse): void {
    // Accept both cumulative snapshots and delta tokens.
    this.queueMixed(data.id, data.content, !!data.done);
    console.log('[Console] Stream payload:', { id: data.id, len: data.content?.length ?? 0, done: data.done });
  }

  private handleStreamComplete(messageId: string): void {
    const e = this.pending.get(messageId);
    if (e) {
      e.done = true;
      this.startFlushLoop();
    } else {
      const { updateMessage, setStreaming } = useChatStore.getState();
      updateMessage(messageId, { isStreaming: false });
      setStreaming(false);
    }
  }

  private handleStreamError(messageId: string, error: string): void {
    const { updateMessage, setStreaming, addConsoleLog } = useChatStore.getState();
    this.pending.delete(messageId);
    updateMessage(messageId, {
      content: `Error: ${error}`,
      isStreaming: false,
    });
    setStreaming(false);
    addConsoleLog({
      timestamp: new Date(),
      direction: 'received',
      message: `Error: ${error}`,
    });
    console.log('[Console] Received Error:', error);
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    useChatStore.getState().setConnectionStatus('connecting');

    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay * this.reconnectAttempts));

    try {
      await this.connect();
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const wsService = new WebSocketService();