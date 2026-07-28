import { asciiToGameMap } from "../asciiMap.js";

export const thelakes = asciiToGameMap(
  "thelakes",
  `
    . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     . . . . . . . . . . . . . . M D D . . . . . . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . M M D D D D D . . . . . . . . . . . . . . . . . .
     . . . . . . . . . . . . M M D D D D D D . . . . . . . . . . . . . . . . .
    . . . . . . . . . . M M M M M D D D G G G . . . . . . G G G G G . . . . . .
     . . . . . . . M M M M M M M D D D G G G G . . . . . G W W G G . . . . . .
    . . . . . . M M M M M D M M D D D G G W G G G . . . G G W W G G . . . . . .
     . . . . . M M M D D D D D D D D G G W W W G . . . . G G G W G . . . . . .
    . . . . . M M M D D D D D D D D D G G W W G G . . . G G G W W G . . . . . .
     . . . . M M D D D D D D D D D D D G G W G G G G G G G G G G G G . . . . .
    . . . . M M D D D G G G D D D D G G G W W G G G G G G G G G G G . . . . . .
     . . . M M D D G G G G G D D D D G G G W G G G G G G G G G G G . . . . . .
    . . . . M D D G W W W W G G G D D G G G G G G G G G G G G G G G . . . . . .
     . . . . M D D G W W W G G G G G D D G G G G G G G G G . . G . . . . . . .
    . . . . . D D D G G W W W W G G G G G G G G G G G G G . . . . . . . . . . .
     . . . . . D D D G G W W G W G G G G G G G G G G G G . . . . . . . . . . .
    . . . . . . . D D D G G G G G G G G G G G G G G G G G G . . . . . . . . . .
     . . . . . . . . . . . . . G G G G G G G G G G G G G G . . . . . . . . . .
    . . . . . . . . . . . . . . . . G G G G G W W G G G . . . . . . . . . . . .
     . . . . . . . . . . . . . . . . G G W W W W G G G G . . . . . . . . . . .
    . . . . . . . . . . . . . . . . . G W W G G G G G G G . . . . . . . . . . .
     . . . . . . . . . . . . . . . . . G W G G G . . G G . . . . . . . . . . .
    . . . . . . . . . . . . . . . . . G W G G . . . . G G . . . . . . . . . . .
     . . . . . . . . . . . . . . . . G G G G . . . . . G . . . . . . . . . . .
    . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
  `,
  "The Lakes",
  16
);
