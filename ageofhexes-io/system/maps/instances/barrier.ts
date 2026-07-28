import { asciiToGameMap } from "../asciiMap.js";

export const barrier = asciiToGameMap(
  "barrier",
  `
    . . . . . . . . . . G D D G G . . . . . . . . . . . . . . .
     . . . . . . . . . G D D D G G G . . . . . . . . . . . . .
    . . . . . . . G G . G D D D G G G G G . . . . . . . . . . .
     . . . . . . G G G G G D D D D G G G G G G G . . . . . . .
    . . . . . . . G G G G G D M D G G G G G G G . . . . . . . .
     . . . . . . G G G G G D M M D G G G G G G G . . . . . . .
    . . . . . G . G G G G D D M D G G G G G . G . . . . . . . .
     . . . . G . G G G D D D M M D G G G G . . G . . . . . . .
    . . . . . G G G G G G D M M D D D G G G . G . . . . . . . .
     . . . . G G G G G G D M M D G D G G G . . . . . . . . . .
    . . . . G . G G G G D M M D G G G G G G G . . . . . . . . .
     . . . . . G G G G D D M D G G G G G G G . . . . . . . . .
    . . . . G G G G G D D M D D G G G G G . . . . . . . . . . .
     . . . . . G G G G D M M D G G G G G G G . . . . . . . . .
    . . . . . G G G G D D M D G G G G G G G . . . . . . . . . .
     . . . . . G G G G D D D G G G G G G . . . . . . . . . . .
    . . . . . . G G G D D G G G G G G G G . . . . . . . . . . .
     . . . . . . . G D D G G G . . . . . . . . . . . . . . . .
    . . . . . . . G D D G G G . . . . . . . . . . . . . . . . .
  `,
  "Desert barrier",
  10
);
