import { SKINS_CATALOG, SKIN_OVERLAYS, type SkinId } from "../../../shared/storeItems.js";
import { HEX_SIZE } from "../../../shared/constants.js";

export const tileTextures = {
  grass: null as CanvasPattern | null,
  desert: null as CanvasPattern | null,
  mountain: null as CanvasPattern | null,
  water: null as CanvasPattern | null,
};

export type SkinTexture = { pattern: CanvasPattern; scale: number; alpha: number };
export const skinPatterns: Record<string, SkinTexture | null> = {};

export const buildingImages: Record<string, HTMLImageElement> = {};
export const shipImage: { sprite: HTMLImageElement | null } = { sprite: null };
export const projectileImages: Record<string, HTMLImageElement> = {};
export const tileEffectImages: { brokenGround: HTMLImageElement | null; plagued: HTMLImageElement | null } = {
  brokenGround: null,
  plagued: null,
};
export const playerEffectImages: Record<string, HTMLImageElement | null> = {
  ATTACK_SPEED: null,
  ARMY_GAIN_BUFF: null,
  HYPERINFLATION: null,
};

// Helper function to resolve relative asset paths safely through Vite's bundler
function getAssetUrl(path: string): string {
  return new URL(path, import.meta.url).href;
}

export function loadGameTextures(ctx: CanvasRenderingContext2D, onComplete: () => void) {
  // Define image sources using dynamic asset URLs
  const tileSources = {
    grass: getAssetUrl("../../../assets/grass.jpg"),
    desert: getAssetUrl("../../../assets/desert.jpg"),
    mountain: getAssetUrl("../../../assets/mountain.jpg"),
    water: getAssetUrl("../../../assets/water.jpg"),
  };

  const buildingSources: Record<string, string> = {
    HOUSE: getAssetUrl("../../../assets/house.png"),
    BARRACKS: getAssetUrl("../../../assets/barracks.png"),
    FORT: getAssetUrl("../../../assets/fort.png"),
    LABORATORY: getAssetUrl("../../../assets/laboratory.png"),
    HARBOR: getAssetUrl("../../../assets/harbor.png"),
    SIEGE_OUTPOST: getAssetUrl("../../../assets/siege_outpost.png"),
    HQ: getAssetUrl("../../../assets/hq.png"),
    PLAGUE_SOURCE: getAssetUrl("../../../assets/plague_source.png"),
  };

  const miscSources = {
    ship: getAssetUrl("../../../assets/ship.png"),
    bombard: getAssetUrl("../../../assets/bombard.png"),
    plagueBomb: getAssetUrl("../../../assets/plague_bomb.png"),
  };

  const tileEffectSources = {
    brokenGround: getAssetUrl("../../../assets/broken_ground.png"),
    plagued: getAssetUrl("../../../assets/plagued.png"),
  };

  const playerEffectSources = {
    ATTACK_SPEED: getAssetUrl("../../../assets/attack_speed_icon.png"),
    ARMY_GAIN_BUFF: getAssetUrl("../../../assets/army_gain_buff_icon.png"),
    HYPERINFLATION: getAssetUrl("../../../assets/hiperinflation_icon.png"),
  };

  const skinOverlaySources = (Object.keys(SKIN_OVERLAYS) as SkinId[]).map(
    (skinId): [SkinId, string] => [
      skinId,
      getAssetUrl(`../../../skins/${skinId}.png`)
    ]
  );

  const totalImages =
    Object.keys(tileSources).length +
    Object.keys(buildingSources).length +
    Object.keys(miscSources).length +
    Object.keys(tileEffectSources).length +
    Object.keys(playerEffectSources).length +
    skinOverlaySources.length;
  let loadedCount = 0;

  function checkLoad() {
    loadedCount++;
    if (loadedCount === totalImages) {
      onComplete();
    }
  }

  // Load Tiles
  (Object.keys(tileSources) as Array<keyof typeof tileTextures>).forEach((key) => {
    const img = new Image();
    img.src = tileSources[key];
    img.onload = () => {
      tileTextures[key] = ctx.createPattern(img, "repeat");
      checkLoad();
    };
    img.onerror = () => {
      console.error(`Failed to load tile texture: ${key}`);
      checkLoad(); 
    };
  });

  // Load Building Sprites
  Object.entries(buildingSources).forEach(([type, src]) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      buildingImages[type] = img;
      checkLoad();
    };
    img.onerror = () => {
      console.error(`Failed to load building image: ${type}`);
      checkLoad(); 
    };
  });

  // Load Misc Sprites
  Object.entries(miscSources).forEach(([type, src]) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      if (type === "ship") shipImage.sprite = img;
      if (type === "bombard") projectileImages.BOMBARD = img;
      if (type === "plagueBomb") projectileImages.PLAGUE_BOMB = img;
      checkLoad();
    };
    img.onerror = () => {
      console.error(`Failed to load misc image: ${type}`);
      checkLoad();
    };
  });

  // Load Tile Effect Sprites
  Object.entries(tileEffectSources).forEach(([type, src]) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      if (type === "brokenGround") tileEffectImages.brokenGround = img;
      if (type === "plagued") tileEffectImages.plagued = img;
      checkLoad();
    };
    img.onerror = () => {
      console.error(`Failed to load tile effect image: ${type}`);
      checkLoad();
    };
  });

  // Load Player Effect Sprites
  Object.entries(playerEffectSources).forEach(([type, src]) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      playerEffectImages[type] = img;
      checkLoad();
    };
    img.onerror = () => {
      console.error(`Failed to load player effect image: ${type}`);
      checkLoad();
    };
  });

  // Load Skin Overlay Textures
  skinOverlaySources.forEach(([skinId, src]) => {
    const config = SKIN_OVERLAYS[skinId];
    const img = new Image();
    img.src = src;
    img.onload = () => {
      const pattern = ctx.createPattern(img, "repeat");
      if (pattern && config) {
        skinPatterns[skinId] = {
          pattern,
          scale: (config.spanHexes * HEX_SIZE) / img.naturalWidth,
          alpha: config.alpha,
        };
      }
      checkLoad();
    };
    img.onerror = () => {
      console.error(`Failed to load skin image: ${skinId}`);
      checkLoad();
    };
  });
}