export interface SocketPlayer {
  id: string;
  name: string;
  ready: boolean;
}

export class WebSocketGameService {
  private ws: WebSocket | null = null;
  private roomCode: string | null = null;
  private playerId: string | null = null;
  private onMessageCallback: ((type: string, data: any) => void) | null = null;
  private onStatusChangeCallback: ((connected: boolean) => void) | null = null;
  private reconnectTimer: any = null;

  public connect(
    roomCode: string,
    playerName: string,
    playerId: string,
    onMessage: (type: string, data: any) => void,
    onStatusChange: (connected: boolean) => void
  ) {
    this.disconnect();
    this.roomCode = roomCode.toUpperCase();
    this.playerId = playerId;
    this.onMessageCallback = onMessage;
    this.onStatusChangeCallback = onStatusChange;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.onStatusChangeCallback?.(true);
        // Join room
        this.ws?.send(JSON.stringify({
          type: 'join_room',
          roomCode: this.roomCode,
          playerName,
          id: this.playerId,
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.onMessageCallback?.(msg.type, msg);
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WS error:', err);
      };

      this.ws.onclose = () => {
        this.onStatusChangeCallback?.(false);
      };
    } catch (e) {
      console.warn('WS init error:', e);
      this.onStatusChangeCallback?.(false);
    }
  }

  public sendAction(action: string, payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'game_action',
        action,
        payload,
      }));
    }
  }

  public syncGameState(gameState: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'sync_game_state',
        gameState,
      }));
    }
  }

  public sendChat(sender: string, text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'chat_message',
        sender,
        text,
      }));
    }
  }

  public disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.roomCode = null;
  }
}

export const socketService = new WebSocketGameService();
