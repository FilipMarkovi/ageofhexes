import { asciiToGameMap } from "../asciiMap.js";

export const oasis = asciiToGameMap(
  "oasis",
  `
    . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     . . . . . . . . . . . . . . . D D D . . . . . . . . . . .
    . . . . . . . . . . . . . D D D D D D D . . . . . . . . . .
     . . . . . . . . . . . . D D D D D D D D . . . . . . . . .
    . . . . . . . . . D D . D D D G G G D D . . . . . . . . . .
     . . . . . D D D D D D D D D G G G G D D . . . . . . . . .
    . . . . . . D D D D D D G G G G W G G D D . . . . . . . . .
     . . . . . D D D G G G G G G G W G G D D . . . . . . . . .
    . . . . . D D G G G G G G W W W G G D D . . . . . . . . . .
     . . . . D D G G G W W W W W G G G D D D . . . . . . . . .
    . . . . D D G G W W G G G G G G G D D . . . . . . . . . . .
     . . . . D D G W W G G G G G G D D D D . . . . . . . . . .
    . . . . D D D G G G G D D D D D D D D . . . . . . . . . . .
     . . . . D D G G G G D D D D D D . . . . . . . . . . . . .
    . . . . D D D D D D D D D . D D . . . . . . . . . . . . . .
     . . . . D D D D D D D . . . . . . . . . . . . . . . . . .
    . . . . . D D D . D . . . . . . . . . . . . . . . . . . . .
     . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
  `,
  "Oasis",
  10
);
