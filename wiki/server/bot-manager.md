---
type: Technical Reference
title: Bot Management
description: Server-side AI logic and bot behavior systems.
generated: { by: "github-copilot", at: "2026-07-28T10:20:00Z" }
sources:
  - id: bot-manager
    resource: /ageofhexes-io/server/src/ai/botManager.ts
    title: Bot Manager Core
  - id: expand-bot
    resource: /ageofhexes-io/server/src/ai/simpleExpandBot.ts
    title: Simple Expansion Bot AI
status: stable
---

# Bot Implementation

Bots are server-side players that execute logic using the `deadlyAI` function. [^expand-bot]

## Scheduling

Bots are executed via the `runBots` loop in `botManager.ts`. [^bot-manager] To simulate human-like delays:
- Bots have a staggered delay (200ms - 450ms).
- There is only an 80% chance to execute an action on any given ready tick.

## AI Logic

The `deadlyAI` determines the best next action:
1.  **Expansion**: Captures adjacent neutral or enemy tiles.
2.  **Building**: Places forts to defend territory or barracks to boost economy.
3.  **HQs**: Placing the initial HQ during the startup phase.

[^bot-manager]: /ageofhexes-io/server/src/ai/botManager.ts
[^expand-bot]: /ageofhexes-io/server/src/ai/simpleExpandBot.ts
