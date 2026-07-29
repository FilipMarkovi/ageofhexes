---
type: Technical Reference
title: State Management
description: Core game loop and state transition logic in the system module.
generated: { by: "github-copilot", at: "2026-07-28T10:25:00Z" }
sources:
  - id: core-systems
    resource: /ageofhexes-io/system/core/systems.ts
    title: Core Game Logic (Ticking)
  - id: state-serialization
    resource: /ageofhexes-io/shared/serialize.ts
    title: State Serialization Utility
status: stable
---

# Game Loop

The game uses a fixed-rate ticking system (e.g., 20 ticks per second).

## State Transitions

The `tick(state)` function in the system module performs: [^core-systems]
1.  **Economy Update**: Increases player gold and army based on territory.
2.  **Growth**: Updates capture progress for ongoing attacks.
3.  **Combat**: Resolves conflicts when a capture is completed.
4.  **Effects**: Updates active timed effects (buffs/debuffs).

# Wire Serialization

The server uses `serializeState` and `createWireStateDelta` to package the `CoreGameState` into a format suitable for the network. [^state-serialization] This involves:
- Converting ES6 Maps to plain objects.
- Filtering internal-only server state.
- Calculating bit-efficient deltas.

[^core-systems]: /ageofhexes-io/system/core/systems.ts
[^state-serialization]: /ageofhexes-io/shared/serialize.ts
