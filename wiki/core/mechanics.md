---
type: Game Mechanics
title: Gameplay Mechanics
description: The rules, economy, and win conditions of Age of Hexes.
generated: { by: "github-copilot", at: "2026-07-28T10:05:00Z" }
sources:
  - id: gameplay-docs
    resource: /gameplayMechanics.md
    title: Original Gameplay Mechanics doc
  - id: shared-constants
    resource: /ageofhexes-io/shared/constants.ts
    title: Shared Game Constants
    author: process:code-extraction
status: stable
---

# Match Flow

## HQ Placement
Players have 15 seconds to place their HQ. It cannot be on Water or Bedrock and must be 2 tiles away from others.

# Economy

## The Bell Curve
Army and Gold generation is non-linear. Optimal generation occurs at 60% Army capacity (`ARMY_PEAK`) and 40% Gold capacity (`GOLD_PEAK`). [^shared-constants]

## Resource Generation
* **Passive Gold**: 0.5/sec (`GOLD_PASSIVE`) [^shared-constants]
* **Passive Army**: 1.0/sec (`ARMY_PASSIVE`) [^shared-constants]
* **Per Tile Gold**: 0.03/sec (`GOLD_PER_TILE`) [^shared-constants]

# Combat and Capture

## Attack Cost
Attack cost is calculated based on tile defense:
`attack_cost = tile_defense * 5` (`BASE_CAPTURE_COST`) [^shared-constants]

## Capture Time
`attack_time = tile_defense * 1s` (`CAPTURE_RATE`) [^shared-constants]

# Buildings

| Building | Cost | Limit | Effect |
| :--- | :--- | :--- | :--- |
| **House** | 20 | 8 | Increases Army cap. |
| **Barracks** | 30 | 2 | Boosts Army generation. |
| **Fort** | 25 | 4 | Boosts defense. |
| **Laboratory** | 50 | 1 | Unlocks items. |
| **Siege Outpost** | 35 | 3 | Specialized capture utility. |

Values cited from [Shared Constants](/ageofhexes-io/shared/constants.ts). [^shared-constants]

[^gameplay-docs]: Original Gameplay Mechanics doc
[^shared-constants]: /ageofhexes-io/shared/constants.ts

[^gameplay-docs]: Original Gameplay Mechanics doc
