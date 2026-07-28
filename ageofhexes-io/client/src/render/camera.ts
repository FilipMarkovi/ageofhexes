export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export const camera: Camera = {
  x: 0,
  y: 0,
  zoom: 1
};

export const MIN_ZOOM = 0.75;
export const MAX_ZOOM = 4.0;
