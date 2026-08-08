import { asciiToGameMap } from "../asciiMap.js";

export const greatriver = asciiToGameMap(
  "greatriver",
  `
    . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     . . . . D D D D G G . . . . . . . . . . . . . . . . . G . D . . . . . . .
    . . D D D M D D G G G G M . . . . . . . . . . . . . G G G D D D . . . . . .
     . . D M M D G G G G G M M . . . . . . M M . . G G G G G G D M D . . . . .
    . . D M D D G G G G G G G M M . . . . . M G G G G G G G G G D M D D . . . .
     D D D D G G G G G G G G G M M . . . . M M G G G G G G G G G D M M D . . .
    . D D G G G G G G G G G G G M M M M . M M G G G G G G G G G D D D M D . . .
     D G G G G G G G G G G G G G G M M M M M G G G G G G G G G G G D D M D . .
    D G G W W W W G G G G G G G G G G G G G G G G G G G G G G G G G D D D . . .
     G G W W W W W G G G G G G G G G G G G G G G G G G G G G G G G G G D D . .
    G G W W W W W W G G G G G G G G G G W W W W W W G G G G G G G G G G D D . .
     G G W W W W W G G G G G G G G G W W W W W W W W W G G G G G G G G G W W .
    G G W W W W W W W W G G G G G W W W W G G G G W W W G G G G G G G W W W . .
     G W W W W W W W W W W W W W W W W W G G G G G G W W W W W W W W W W W D .
    G G G W W W W W W W W W W W W W G G G G G G G G G W W W W W W W W W D D . .
     G G G W W W W G G G G G G G G G G G G G G G G G G G G G G G G G G G D D .
    D G G G W G G G G G G G G G G G G G G G G G G G G G G G G G G G G G D D . .
     D D G G G G G G G G G G G G G M M M M G G G G G G G G G G G G G G D D . .
    . D D G G G G G G G G G G G M M M M M M G G G G G G G G G G G G G D D . . .
     . D D D D G G G G G G G G M M M . . M M G G G G G G G G G G G D D M D . .
    . . D M M D D G G G G G M M . . . . . M M G G G G G G G G G D D M M D . . .
     . D D D M M D D G G G M . . . . . . . M M . . G G G G G G D M M D D . . .
    . . . D D D M D D G G G M . . . . . . . . . . . . G G G G D M D D . . . . .
     . . . . D D D D D D D . . . . . . . . . . . . . . G G . D D D . . . . . .
    . . . . . . . D D . D . . . . . . . . . . . . . . . . . D . . . . . . . . .
     . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
  `,
  "The Great River",
  16
);