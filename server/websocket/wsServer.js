import { WebSocketServer, WebSocket } from 'ws';
import { verifyToken } from '../auth/jwt.js';

export class CollabWsServer {
  constructor(httpServer) {
    this.wss   = new WebSocketServer({ server: httpServer, path: '/ws' });//WebSocket server creation
    this.rooms = new Map(); // workspaceId → Set<WebSocket>

    this.wss.on('connection', (ws, req) => this._onConnect(ws, req));//new connection
  }

  // ── Connection ──────────────────────────────────────────────────────────────
  _onConnect(ws, req) {
    const url   = new URL(req.url, 'http://placeholder');
    const token = url.searchParams.get('token');

    try {
      const payload = verifyToken(token);
      ws.userId = String(payload.userId ?? payload.id ?? payload._id ?? payload.sub);//store identity on socket
    } catch {
      ws.close(4001, 'Unauthorized');
      return;
    }

    ws.workspaceIds = new Set();
    ws.isAlive      = true;

    ws.on('pong',    ()    => { ws.isAlive = true; });
    ws.on('message', (raw) => this._onMessage(ws, raw));//func
    ws.on('close',   ()    => this._onClose(ws));//func
  }

  // ── Message routing 
  _onMessage(ws, raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    const { type, workspaceId } = msg;
    if (!type) return;

    switch (type) {
      case 'JOIN_WORKSPACE':
        this._joinRoom(ws, workspaceId);//func
        break;

      case 'LEAVE_WORKSPACE':
        this._leaveRoom(ws, workspaceId);//func
        break;

      // Relay task / section mutations to all OTHER members of the workspace
      case 'TASK_CREATE':
      case 'TASK_UPDATE':
      case 'TASK_DELETE':
      case 'SECTION_CREATE':
      case 'SECTION_UPDATE':
      case 'SECTION_DELETE':
        this._relay(ws, workspaceId, msg);//func
        break;

      default:
        break;
    }
  }

  // ── Room helpers ─────────────────────────────────────────────────────────────
  _joinRoom(ws, workspaceId) {
    if (!workspaceId) return;

    if (!this.rooms.has(workspaceId)) this.rooms.set(workspaceId, new Set());//new workspace

    this.rooms.get(workspaceId).add(ws);
    ws.workspaceIds.add(workspaceId);

    // Broadcast updated presence list to everyone in the room (including joiner)
    this._broadcastPresence(workspaceId);
  }

  _leaveRoom(ws, workspaceId) {
    this.rooms.get(workspaceId)?.delete(ws);
    ws.workspaceIds?.delete(workspaceId);
    this._broadcastPresence(workspaceId);
  }

  _onClose(ws) {
    ws.workspaceIds?.forEach((id) => {
      this.rooms.get(id)?.delete(ws);
      this._broadcastPresence(id);
    });
  }

  // Relay to all sockets in room EXCEPT sender
  _relay(senderWs, workspaceId, msg) {
    const room = this.rooms.get(workspaceId);
    if (!room) return;
    const payload = JSON.stringify(msg);
    room.forEach((ws) => {
      if (ws !== senderWs //except sender
        && ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  // Send PRESENCE event to everyone in the room
  _broadcastPresence(workspaceId) {
    const room = this.rooms.get(workspaceId);
    if (!room || room.size === 0) return;

    const onlineUserIds = [...room]
      .filter((ws) => ws.readyState === WebSocket.OPEN)
      .map((ws) => ws.userId);

    const payload = JSON.stringify({ type: 'PRESENCE', workspaceId, onlineUserIds });
    room.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    });
  }

  // ── Public API (used by REST controllers) ────────────────────────────────────
  broadcastToWorkspace(workspaceId, msg) {
    const room = this.rooms.get(workspaceId);
    if (!room) return;
    const payload = JSON.stringify(msg);
    room.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    });
  }

  // ── Heartbeat ────────────────────────────────────────────────────────────────
  startHeartbeat(intervalMs = 30_000) {
    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) { ws.terminate(); return; }
        ws.isAlive = false;
        ws.ping();
      });
    }, intervalMs);
  }
}