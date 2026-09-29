import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json());

interface PlayerConnection {
  id: string;
  name: string;
  ws: WebSocket;
  ready: boolean;
}

interface Room {
  code: string;
  hostId: string;
  players: PlayerConnection[];
  gameState: any;
  lastUpdated: number;
}

const rooms = new Map<string, Room>();

function broadcastToRoom(room: Room, message: any, excludeWs?: WebSocket) {
  const payload = JSON.stringify(message);
  for (const p of room.players) {
    if (p.ws.readyState === WebSocket.OPEN && p.ws !== excludeWs) {
      p.ws.send(payload);
    }
  }
}

wss.on('connection', (ws: WebSocket) => {
  let currentRoomCode: string | null = null;
  let playerId: string | null = null;

  ws.on('message', (data: string) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'join_room') {
        const roomCodeStr = String(msg.roomCode || '').toUpperCase();
        if (!roomCodeStr) return;

        currentRoomCode = roomCodeStr;
        const pId = String(msg.id || `player_${Math.random().toString(36).substring(2, 8)}`);
        playerId = pId;

        let room = rooms.get(currentRoomCode);
        if (!room) {
          room = {
            code: currentRoomCode,
            hostId: pId,
            players: [],
            gameState: null,
            lastUpdated: Date.now(),
          };
          rooms.set(currentRoomCode, room);
        }

        const existingIndex = room.players.findIndex(p => p.id === pId);
        if (existingIndex >= 0) {
          room.players[existingIndex].ws = ws;
          room.players[existingIndex].name = msg.playerName || room.players[existingIndex].name;
        } else {
          if (room.players.length >= 2) {
            ws.send(JSON.stringify({ type: 'error', message: 'Room is full (max 2 players)' }));
            return;
          }
          room.players.push({
            id: pId,
            name: msg.playerName || `Player ${room.players.length + 1}`,
            ws,
            ready: false,
          });
        }

        const playerList = room.players.map(p => ({ id: p.id, name: p.name, ready: p.ready }));
        const playerIndex = room.players.findIndex(p => p.id === pId);

        ws.send(JSON.stringify({
          type: 'room_joined',
          roomCode: currentRoomCode,
          playerId: pId,
          playerIndex,
          players: playerList,
          gameState: room.gameState,
        }));

        broadcastToRoom(room, {
          type: 'player_joined',
          players: playerList,
        }, ws);

      } else if (msg.type === 'sync_game_state') {
        if (!currentRoomCode) return;
        const room = rooms.get(currentRoomCode);
        if (!room) return;

        room.gameState = msg.gameState;
        room.lastUpdated = Date.now();

        broadcastToRoom(room, {
          type: 'game_state_synced',
          gameState: msg.gameState,
          senderId: playerId,
        }, ws);

      } else if (msg.type === 'game_action') {
        if (!currentRoomCode) return;
        const room = rooms.get(currentRoomCode);
        if (!room) return;

        broadcastToRoom(room, {
          type: 'game_action',
          action: msg.action,
          payload: msg.payload,
          senderId: playerId,
        }, ws);

      } else if (msg.type === 'chat_message') {
        if (!currentRoomCode) return;
        const room = rooms.get(currentRoomCode);
        if (!room) return;

        broadcastToRoom(room, {
          type: 'chat_message',
          sender: msg.sender,
          text: msg.text,
          time: Date.now(),
        });
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoomCode) {
      const room = rooms.get(currentRoomCode);
      if (room) {
        room.players = room.players.filter(p => p.ws !== ws);
        if (room.players.length === 0) {
          rooms.delete(currentRoomCode);
        } else {
          broadcastToRoom(room, {
            type: 'player_left',
            players: room.players.map(p => ({ id: p.id, name: p.name, ready: p.ready })),
          });
        }
      }
    }
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.lastUpdated > 3 * 3600 * 1000 && room.players.length === 0) {
      rooms.delete(code);
    }
  }
}, 60000);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeRooms: rooms.size });
});

const isProduction = process.env.NODE_ENV === 'production';

async function setupServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Slay the Cards server running on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
