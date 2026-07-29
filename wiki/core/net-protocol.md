---
type: Technical Reference
title: Network Protocol
description: WebSocket message structure and intent system for client-server communication.
generated: { by: "github-copilot", at: "2026-07-28T10:10:00Z" }
status: stable
---

# Communication Model

The game uses a state-sync model via WebSockets. The server acts as the source of truth, sending regular state updates or deltas to clients.

## Client to Server: Intents

Clients participate by sending `Intent` objects.

```typescript
type Intent =
  | { type: "PLACE_HQ"; q: number; r: number }
  | { type: "CAPTURE"; q: number; r: number }
  | { type: "BUILD"; q: number; r: number; buildingType: string }
  | { type: "DEMOLISH"; q: number; r: number }
  | { type: "DEFEND"; q: number; r: number }
  | { type: "BUY_PLAYER_EFFECT"; effectType: PlayerEffectType; targetPlayerId: PlayerId }
  | null;
```

## Server to Client: Messages

- **WELCOME**: Sent upon initial connection.
- **LOBBY**: Updates on waiting players.
- **STATE**: Full game state or a delta.

# Delta Syncing

The system calculates `WireStateDelta` to minimize bandwidth, only sending changes since the last acknowledged tick.
