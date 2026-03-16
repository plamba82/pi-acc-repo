import { io, Socket } from 'socket.io-client';
import { useChatStore } from '/lib/store/chat-store';
import { StreamingResponse } from '/lib/types';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

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
    console.log('[Console] Sent:', messageId, message, sessionId, agentId  );

    return messageId;
  }

  private handleStreamingResponse(data: StreamingResponse): void {
    const { updateMessage, addConsoleLog } = useChatStore.getState();
    updateMessage(data.id, {
      content: data.content,
      isStreaming: !data.done,
    });
    console.log('[Console] Received:', data);
  }

  private handleStreamComplete(messageId: string): void {
    const { updateMessage, setStreaming } = useChatStore.getState();
    updateMessage(messageId, {
      isStreaming: false,
    });
    setStreaming(false);
  }

  private handleStreamError(messageId: string, error: string): void {
    const { updateMessage, setStreaming, addConsoleLog } = useChatStore.getState();
    updateMessage(messageId, {
      content: `Error: ${error}`,
      isStreaming: false,
    });
    setStreaming(false);
    // Log error as received
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