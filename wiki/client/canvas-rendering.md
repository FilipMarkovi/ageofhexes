---
type: Technical Reference
title: Canvas Rendering
description: Details of the client-side batched rendering system for hex tiles and buildings.
generated: { by: "github-copilot", at: "2026-07-28T10:15:00Z" }
sources:
  - id: hex-render
    resource: /ageofhexes-io/client/src/render/hexRender.ts
    title: Hex Rendering Engine
  - id: asset-manager
    resource: /ageofhexes-io/client/src/render/assetManager.ts
    title: Asset Manager
status: stable
---

# Rendering Pipeline

The client uses HTML5 Canvas for high-performance rendering. To maintain 60 FPS with large maps, it uses a **batched rendering** approach. [^hex-render]

## Batch Passes

1.  **Terrain & Ownership**: `drawHexBatch` renders background textures (Grass, Desert, Water, etc.) and ownership color overlays.
2.  **Grid Lines**: A unified pass for drawing hex borders using `ctx.stroke()`.
3.  **Buildings**: `drawBuildingsBatch` renders static building assets.
4.  **Progress Bars**: `drawBuildingProgressBarsBatch` shows construction and capture status.
5.  **UI Overlays**: HUD and targeting overlays are rendered on top.

# Texture Management

Textures are loaded via `assetManager.ts`. [^asset-manager] Terrain features use `CanvasPattern` for tiling, which requires careful scaling and translation to match the camera zoom level.

[^hex-render]: /ageofhexes-io/client/src/render/hexRender.ts
[^asset-manager]: /ageofhexes-io/client/src/render/assetManager.ts
