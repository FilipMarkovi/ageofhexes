import { asciiToGameMap } from "../asciiMap.js";

export const star = asciiToGameMap(
  "star",
  `
    . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     . . . . . . . . . . . . G . . . . . . G G . . . . . . . . . . . . . . . .
    . . . . . . . . . . . . G G G . . . . G G . . . . . . . . . . . . . . . . .
     . . . . . . . . . . . G G G W W W W W G G G . . . . . . . . . . . . . . .
    . . . . . . . . . . . . G G G G W W W G G G G . . . . . . . . . . . . . . .
     . . . . . . . . . . . . W G D D W W D D G W . . . . . . . . . . . . . . .
    . . . . . . . . . . . . W W D M D W D M D W W . . . . . . . . . . . . . . .
     . . . . . . . . . G . W W W D M D D M D W W W . . . . . . . . . . . . . .
    . . . . . . . . . G G G W W W D M D M D W W W W G . . . . . . . . . . . . .
     . . . . . . . . G G G G D D D D M M D D D D G G G . . . . . . . . . . . .
    . . . . . . . . . G G G D M M M M . M M M M D G G . . . . . . . . . . . . .
     . . . . . . . . . . W G D D D D M M D D D D G G G G . . . . . . . . . . .
    . . . . . . . . . . . W W W W D M D M D W W W W G G . . . . . . . . . . . .
     . . . . . . . . . . . W W W D M D D M D W W W . . . . . . . . . . . . . .
    . . . . . . . . . . . . W W D M D W D M D W W . . . . . . . . . . . . . . .
     . . . . . . . . . . . . W G D D W W D D G W . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . G G G W W W G G G . . . . . . . . . . . . . . . .
     . . . . . . . . . . . . G G G G W W W G G G . . . . . . . . . . . . . . .
    . . . . . . . . . . . . G G G . . . . G G G G . . . . . . . . . . . . . . .
     . . . . . . . . . . . . . G . . . . . . G . . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
  `,
  "The Star",
  12
);
