// net.ts
import {
  applyWireStateDelta,
  deserializeState,
  type WireState,
  type WireStateDelta
} from "../../../shared/index.js";
import { clientNetState } from "../state/clientState.js";

export type PrivateLobbyMsg = {
  type: "PRIVATE_LOBBY";
  roomId: string;
  code: string;
  connected: number;
  required: number;
  mapId: string;
  fillWithBots: boolean;
  players: Array<{ username: string }>;
  isHost?: boolean;
};

export type PrivateErrorMsg = {
  type: "PRIVATE_ROOM_ERROR";
  reason: string;
};

export type UsernameChangeResultMsg = {
  type: "USERNAME_CHANGE_RESULT";
  success: boolean;
  username?: string;
  reason?: string;
};

export type ServerMsg =
  | { type: "WELCOME"; playerId: string; requiredPlayers: number; roomId: string }
  | { type: "LOBBY"; connected: number; required: number; roomId: string }
  | { type: "STATE"; full: true; state: WireState; serverTime?: number }
  | { type: "STATE"; full: false; delta: WireStateDelta; serverTime?: number }
  | { type: "LOG"; text: string; color?: string }
  | { type: "AUTH_SUCCESS"; username?: string }
  | { type: "AUTH_FAILURE"; reason?: string }
  | PrivateLobbyMsg
  | PrivateErrorMsg
  | UsernameChangeResultMsg;

type ClientMsg =
  | { type: "INTENT"; intent: any }
  | { type: "AUTH"; token: string };

export function connect(url: string, handlers: {
  onWelcome: (playerId: string, requiredPlayers: number, roomId: string) => void;
  onLobby: (connected: number, required: number, roomId: string) => void;
  onState: (state: any) => void;
  onLog: (text: string, color?: string) => void;
  onAuthSuccess?: (username?: string) => void;
  onAuthFailure?: (reason?: string) => void;
  onPrivateLobby?: (msg: PrivateLobbyMsg) => void;
  onPrivateError?: (reason: string) => void;
  onUsernameChangeResult?: (msg: UsernameChangeResultMsg) => void;
}) {
  const ws = new WebSocket(url);
  let latestWireState: WireState | null = null;

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data) as ServerMsg;

    switch (msg.type) {
      case "WELCOME":
        handlers.onWelcome(msg.playerId, msg.requiredPlayers, msg.roomId);
        break;
      case "LOBBY":
        handlers.onLobby(msg.connected, msg.required, msg.roomId);
        break;
      case "STATE": {
        if (msg.serverTime) {
          clientNetState.serverClockOffset = msg.serverTime - Date.now();
        }
        if (msg.full) {
          latestWireState = msg.state;
        } else if (latestWireState) {
          latestWireState = applyWireStateDelta(latestWireState, msg.delta);
        } else {
          break;
        }

        handlers.onState(deserializeState(latestWireState));
        break;
      }
      case "LOG":
        handlers.onLog(msg.text, msg.color);
        break;
      case "AUTH_SUCCESS":
        handlers.onAuthSuccess?.(msg.username);
        break;
      case "AUTH_FAILURE":
        handlers.onAuthFailure?.(msg.reason);
        break;
      case "PRIVATE_LOBBY":
        handlers.onPrivateLobby?.(msg);
        break;
      case "PRIVATE_ROOM_ERROR":
        handlers.onPrivateError?.(msg.reason);
        break;
      case "USERNAME_CHANGE_RESULT":
        handlers.onUsernameChangeResult?.(msg);
        break;
    }
  };

  function sendIntent(intent: any) {
    const out: ClientMsg = { type: "INTENT", intent };
    ws.send(JSON.stringify(out));
  }

  function tryAuth(token: any) {
    const out: ClientMsg = { type: "AUTH", token: token };
    ws.send(JSON.stringify(out));
  }

  return { ws, sendIntent, tryAuth };
}