import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

export interface SocketPlayer {
  id: string;
  name: string;
  ready: boolean;
}

export class RealtimeGameService {
  private supabase: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private ws: WebSocket | null = null;
  private roomCode: string | null = null;
  private playerId: string | null = null;
  private playerName: string | null = null;
  private onMessageCallback: ((type: string, data: any) => void) | null = null;
  private onStatusChangeCallback: ((connected: boolean) => void) | null = null;
  private currentGameState: any = null;

  public isSupabaseConfigured(): boolean {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    return Boolean(url && key && String(url).startsWith('http') && !String(url).includes('your-project'));
  }

  public getTransportType(): 'supabase' | 'websocket' {
    return this.isSupabaseConfigured() ? 'supabase' : 'websocket';
  }

  public connect(
    roomCode: string,
    playerName: string,
    playerId: string,
    onMessage: (type: string, data: any) => void,
    onStatusChange: (connected: boolean) => void
  ) {
    this.disconnect();
    this.roomCode = roomCode.toUpperCase().trim();
    this.playerId = playerId;
    this.playerName = playerName;
    this.onMessageCallback = onMessage;
    this.onStatusChangeCallback = onStatusChange;

    if (this.isSupabaseConfigured()) {
      this.connectSupabase();
    } else {
      this.connectLocalWebSocket();
    }
  }

  private connectSupabase() {
    try {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!this.supabase) {
        this.supabase = createClient(url, key, {
          realtime: {
            params: {
              eventsPerSecond: 20,
            },
          },
        });
      }

      const channelName = `room_${this.roomCode}`;
      const channel = this.supabase.channel(channelName, {
        config: {
          broadcast: { ack: false, self: false },
          presence: { key: this.playerId || undefined },
        },
      });

      this.channel = channel;

      // Track presence
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const players: any[] = [];
          Object.values(state).forEach((presences: any) => {
            if (Array.isArray(presences) && presences[0]) {
              players.push(presences[0]);
            }
          });

          // Sort deterministically by joinedAt timestamp so Host is 0 and Joiner is 1
          players.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));

          const mappedPlayers: SocketPlayer[] = players.map(p => ({
            id: p.id || '',
            name: p.name || 'Player',
            ready: Boolean(p.ready),
          }));

          this.onMessageCallback?.('player_joined', {
            players: mappedPlayers,
          });

          // If more than 1 player present and we hold state, broadcast to ensure sync
          if (players.length > 1 && this.currentGameState) {
            this.syncGameState(this.currentGameState);
          }
        })
        .on('presence', { event: 'leave' }, () => {
          const state = channel.presenceState();
          const players: SocketPlayer[] = [];
          Object.values(state).forEach((presences: any) => {
            if (Array.isArray(presences) && presences[0]) {
              const p = presences[0];
              players.push({
                id: p.id || '',
                name: p.name || 'Player',
                ready: Boolean(p.ready),
              });
            }
          });
          this.onMessageCallback?.('player_left', { players });
        });

      // Listen for Broadcast Events
      channel
        .on('broadcast', { event: 'sync_game_state' }, ({ payload }) => {
          if (payload?.gameState) {
            this.currentGameState = payload.gameState;
            this.onMessageCallback?.('game_state_synced', {
              gameState: payload.gameState,
              senderId: payload.senderId,
            });
          }
        })
        .on('broadcast', { event: 'game_action' }, ({ payload }) => {
          this.onMessageCallback?.('game_action', payload);
        })
        .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
          this.onMessageCallback?.('chat_message', payload);
        })
        .on('broadcast', { event: 'request_state' }, () => {
          if (this.currentGameState) {
            this.syncGameState(this.currentGameState);
          }
        });

      // Subscribe to Supabase Realtime channel
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          this.onStatusChangeCallback?.(true);
          await channel.track({
            id: this.playerId,
            name: this.playerName,
            ready: false,
            joinedAt: Date.now(),
          });

          this.onMessageCallback?.('room_joined', {
            roomCode: this.roomCode,
            playerId: this.playerId,
            players: [{ id: this.playerId, name: this.playerName, ready: false }],
          });

          // Request latest state in case host is already in room
          channel.send({
            type: 'broadcast',
            event: 'request_state',
            payload: { requesterId: this.playerId },
          });
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          this.onStatusChangeCallback?.(false);
        }
      });
    } catch (e) {
      console.warn('Supabase Realtime setup failed:', e);
      this.onStatusChangeCallback?.(false);
    }
  }

  private connectLocalWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.onStatusChangeCallback?.(true);
        this.ws?.send(
          JSON.stringify({
            type: 'join_room',
            roomCode: this.roomCode,
            playerName: this.playerName,
            id: this.playerId,
          })
        );
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'game_state_synced' && msg.gameState) {
            this.currentGameState = msg.gameState;
          }
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

  public syncGameState(gameState: any) {
    this.currentGameState = gameState;
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'sync_game_state',
        payload: {
          gameState,
          senderId: this.playerId,
        },
      });
    } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'sync_game_state',
          gameState,
        })
      );
    }
  }

  public sendAction(action: string, payload: any) {
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'game_action',
        payload: {
          action,
          payload,
          senderId: this.playerId,
        },
      });
    } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'game_action',
          action,
          payload,
        })
      );
    }
  }

  public sendChat(sender: string, text: string) {
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: {
          sender,
          text,
          time: Date.now(),
        },
      });
    } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'chat_message',
          sender,
          text,
        })
      );
    }
  }

  public disconnect() {
    if (this.channel && this.supabase) {
      this.channel.untrack();
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.roomCode = null;
    this.currentGameState = null;
  }
}

export const socketService = new RealtimeGameService();
