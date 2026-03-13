import { useEffect, useRef, useCallback } from 'react';

// ─── Message types exchanged over the WebSocket ───────────────────────────────
export type WsMessage =
  | { type: 'TASK_CREATE';    workspaceId: string; task:      unknown }
  | { type: 'TASK_UPDATE';    workspaceId: string; task:      unknown }
  | { type: 'TASK_DELETE';    workspaceId: string; taskId:    string  }
  | { type: 'SECTION_CREATE'; workspaceId: string; section:   unknown }
  | { type: 'SECTION_UPDATE'; workspaceId: string; section:   unknown }
  | { type: 'SECTION_DELETE'; workspaceId: string; sectionId: string  }
  | { type: 'MEMBER_JOINED';  workspaceId: string; userId:    string; email: string; name: string }
  | { type: 'MEMBER_REMOVED'; workspaceId: string; userId:    string  }
  | { type: 'WORKSPACE_DELETED'; workspaceId: string }
  | { type: 'PRESENCE';       workspaceId: string; onlineUserIds: string[] };

type Props = {
  authToken:   string | null;
  workspaceId: string | null;
  onMessage:   (msg: WsMessage) => void;
};

const WS_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000')
  .replace(/^http/, 'ws');                                       // http→ws, https→wss

const RECONNECT_DELAY_MS = 3_000;
const MAX_RECONNECTS     = 10;

export function useCollabWebSocket({ authToken, workspaceId, onMessage }: Props) {
  const wsRef          = useRef<WebSocket | null>(null);
  const onMessageRef   = useRef(onMessage);
  const reconnectsRef  = useRef(0);
  const unmountedRef   = useRef(false);

  // Keep callback ref fresh so we don't close over a stale handler
  onMessageRef.current = onMessage;

  const sendWs = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    if (!authToken || !workspaceId) return;
    unmountedRef.current  = false;
    reconnectsRef.current = 0;

    function connect() {
      const ws = new WebSocket(`${WS_BASE}/ws?token=${authToken}`);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectsRef.current = 0;
        ws.send(JSON.stringify({ type: 'JOIN_WORKSPACE', workspaceId }));
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as WsMessage;
          onMessageRef.current(msg);
        } catch { /* malformed frame — ignore */ }
      };

      ws.onclose = (ev) => {
        if (unmountedRef.current) return;
        // 4001 = auth failure — don't reconnect
        if (ev.code === 4001) return;
        if (reconnectsRef.current < MAX_RECONNECTS) {
          reconnectsRef.current += 1;
          setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };
    }

    connect();

    return () => {
      unmountedRef.current = true;
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'LEAVE_WORKSPACE', workspaceId }));
        }
        wsRef.current.close();
      }
    };
  }, [authToken, workspaceId]);

  return { sendWs };
}
