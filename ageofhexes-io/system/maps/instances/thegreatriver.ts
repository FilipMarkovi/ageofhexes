import { asciiToGameMap } from "../asciiMap.js";

export const greatriver = asciiToGameMap(
  "greatriver",
  `
    . . . . . . . . . . . G . . . . . . . . . G . . . . . . . . . . . . . . . .
     . . . . D D D D G G . G G . G G G . . G G G G G . G . G . D . . . . . . .
    . . D D D M D D G G G G G . G G G G . . G G G G . . G G G D D D . . . . . .
     . . D M M D G G G G G G G . G G G G G G G G G G G G G G G D M D . . . . .
    . . D M D D G G G G G G G G G G G G G G G G G G G G G G G G D M D D . . . .
     D D M D G G G G G G G G G G G G G G G G G G G G G G G G G G D M M D . . .
    . D M D D G G G G G G G G G M M M G G G M G G G G G G G G G D D D M D . . .
     D D D G G G G G G G G G G G G M M M M M G G G G G G G G G G G D D M D . .
    D D D G G G G G G G G G G G G G G G G G G G G G G G G G G G G G D D D . . .
     D D G G G G G G G G G G G G G G G G G G G G G G G G G G G G G G G D D . .
    D D G G G G G G G G G G G G G G G G W W W W W W G G G G G G G G G G D D . .
     D W W W W W G G G G G G G G G G W W W W W W W W W G G G G G G G G G D D .
    D D W W W W W W W G G G G G G W W W W G G G G W W W G G G G G G G G D D . .
     D D G G G W W W W W W W W W W W W W G G G G G G G W W W W W W W W W D D .
    D D G G G G G G G W W W W W W W G G G G G G G G G G G W W W W W W W D D . .
     D D G G G G G G G G G G G G G G G G G G G G G G G G G G G G G G G G D D .
    D D D G G G G G G G G G G G G G G G G G G G G G G G G G G G G G G G D D . .
     D D D G G G G G G G G G G G G G G G G G G G G G G G G G G G G G G D D . .
    . D D D D G G G G G G G G G M M M M M G M M G G G G G G G G G G G D D . . .
     . D M D D G G G G G G G G G M G G G M M M G G G G G G G G G G D D M D . .
    . . D M M D D G G G G G G G G G G G G G G G G G G G G G G G D D M M D . . .
     . D D D M M D D G G G G G G G G G G G G G G G G G G G G G D M M D D . . .
    . . . D D D M D D G G G G G G G G G G . G G G G G G G G G D M D D . . . . .
     . . . . D D D D D D D G G G . G G G G . G G G G . G G . D D D . . . . . .
    . . . . . . . D D . D . . G . . . G . . . . G . . G . . D . . . . . . . . .
     . . . . . . . . . . . . . . . . G . . . . . . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
  `,
  "The Great River",
  16
);
