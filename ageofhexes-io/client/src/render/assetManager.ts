export const tileTextures = {
  grass: null as CanvasPattern | null,
  desert: null as CanvasPattern | null,
  mountain: null as CanvasPattern | null,
  water: null as CanvasPattern | null,
};

export const buildingImages: Record<string, HTMLImageElement> = {};
export const shipImage: { sprite: HTMLImageElement | null } = { sprite: null };
export const projectileImages: Record<string, HTMLImageElement> = {};
export const tileEffectImages: { brokenGround: HTMLImageElement | null } = {
  brokenGround: null,
};

const asset_folder = "../../../assets/";

export function loadGameTextures(ctx: CanvasRenderingContext2D, onComplete: () => void) {
  // Define image sources
  const tileSources = {
    grass: asset_folder + "grass.jpg",
    desert: asset_folder + "desert.jpg",
    mountain: asset_folder + "mountain.jpg",
    water: asset_folder + "water.jpg",
  };

  // Add your building icon PNGs here (Make sure filenames match!)
  const buildingSources: Record<string, string> = {
    HOUSE: asset_folder + "house.png",
    BARRACKS: asset_folder + "barracks.png",
    FORT: asset_folder + "fort.png",
    LABORATORY: asset_folder + "laboratory.png",
    HARBOR: asset_folder + "harbor.png",
    SIEGE_OUTPOST: asset_folder + "siege_outpost.png",
    HQ: asset_folder + "hq.png",
  };

  const miscSources = {
    ship: asset_folder + "ship.png",
    bombard: asset_folder + "bombard.png",
  };

  const tileEffectSources = {
    brokenGround: asset_folder + "broken_ground.png",
  };

  const totalImages =
    Object.keys(tileSources).length +
    Object.keys(buildingSources).length +
    Object.keys(miscSources).length +
    Object.keys(tileEffectSources).length;
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
      checkLoad();
    };

    img.onerror = () => {
      checkLoad();
    };
  });

  // Load Tile Effect Sprites
  Object.entries(tileEffectSources).forEach(([type, src]) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      if (type === "brokenGround") tileEffectImages.brokenGround = img;
      checkLoad();
    };

    img.onerror = () => {
      checkLoad();
    };
  });
}