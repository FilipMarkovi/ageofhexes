import { Axial } from "../../../shared/index.js"

export const DIRS: Axial[] = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
]

export function key(q: number, r: number) {
  return `${q},${r}`
}

export function neighbors(a: Axial): Axial[] {
  return DIRS.map(d => ({ q: a.q + d.q, r: a.r + d.r }))
}

export function hexDist(a: Axial, b: Axial): number {
  const ax = a.q, az = a.r, ay = -ax - az
  const bx = b.q, bz = b.r, by = -bx - bz
  return Math.max(
    Math.abs(ax - bx),
    Math.abs(ay - by),
    Math.abs(az - bz)
  )
}
