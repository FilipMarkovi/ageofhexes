export function pixelToAxial(
  x: number,
  y: number,
  size: number,
  originX: number,
  originY: number
) {
  // Convert screen → grid space
  const px = x - originX
  const py = y - originY

  // Pointy-top axial conversion
  const q = (Math.sqrt(3) / 3 * px - 1 / 3 * py) / size
  const r = (2 / 3 * py) / size

  return axialRound(q, r)
}

function axialRound(q: number, r: number) {
  // Convert to cube
  let x = q
  let z = r
  let y = -x - z

  let rx = Math.round(x)
  let ry = Math.round(y)
  let rz = Math.round(z)

  const dx = Math.abs(rx - x)
  const dy = Math.abs(ry - y)
  const dz = Math.abs(rz - z)

  if (dx > dy && dx > dz) rx = -ry - rz
  else if (dy > dz) ry = -rx - rz
  else rz = -rx - ry

  return { q: rx, r: rz }
}
