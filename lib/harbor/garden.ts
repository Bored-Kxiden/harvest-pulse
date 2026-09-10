/* Isometric garden geometry. Every shape is derived from a person's id, so a plot keeps
   the same organic outline and a flower keeps the same spot for as long as it exists. */

const TILE_W = 178
const TILE_H = 104
/** Ground is drawn in plan view then squashed by this factor, which is what reads as isometric. */
export const GROUND_SQUASH = 0.56

export function hashOf(seed: string) { let h = 2166136261; for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
export function rand(h: number, i: number) { const x = Math.sin(h * 0.0001 + i * 12.9898) * 43758.5453; return x - Math.floor(x) }

/** Square-shell walk: 0 sits at the middle, later plots ring outward without ever overlapping. */
export function plotCell(i: number) {
 const n = Math.floor(Math.sqrt(i)); const k = i - n * n
 return k < n ? { gx: n, gy: k } : { gx: 2 * n - k, gy: n }
}

export type Plot = { id: string; x: number; y: number; radius: number; seed: number; depth: number }

export function plotFor(personId: string, index: number): Plot {
 const { gx, gy } = plotCell(index); const seed = hashOf(personId)
 const jx = (rand(seed, 1) - 0.5) * 26, jy = (rand(seed, 2) - 0.5) * 18
 const x = (gx - gy) * (TILE_W / 2) + jx
 const y = (gx + gy) * (TILE_H / 2) + jy
 return { id: personId, x, y, radius: 54 + rand(seed, 3) * 13, seed, depth: gx + gy }
}

/** A closed Catmull-Rom loop with a noisy radius: organic, never a circle, always the same per seed. */
export function blobPath(seed: number, radius: number, points = 11) {
 const pts: [number, number][] = []
 for (let i = 0; i < points; i++) {
  const angle = (i / points) * Math.PI * 2 + (rand(seed, i + 10) - 0.5) * 0.22
  const r = radius * (0.78 + rand(seed, i + 40) * 0.4)
  pts.push([Math.cos(angle) * r, Math.sin(angle) * r])
 }
 let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
 for (let i = 0; i < points; i++) {
  const p0 = pts[(i - 1 + points) % points], p1 = pts[i], p2 = pts[(i + 1) % points], p3 = pts[(i + 2) % points]
  const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
  const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
  d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
 }
 return `${d} Z`
}

/** Golden-angle placement: depends only on a flower's index, so adding one never moves the others. */
export function flowerSpot(seed: number, index: number, radius: number) {
 const r = Math.min(radius * 0.78, radius * 0.76 * Math.sqrt((index + 0.6) / 13))
 const angle = index * 2.399963 + rand(seed, index + 70) * 0.55
 return {
  x: Math.cos(angle) * r + (rand(seed, index + 120) - 0.5) * 9,
  y: (Math.sin(angle) * r + (rand(seed, index + 180) - 0.5) * 7) * GROUND_SQUASH,
 }
}

export function sceneBounds(plots: Plot[]) {
 if (!plots.length) return { x: -160, y: -110, width: 320, height: 220 }
 const pad = 30
 const minX = Math.min(...plots.map(p => p.x - p.radius)) - pad
 const maxX = Math.max(...plots.map(p => p.x + p.radius)) + pad
 /* Room above for the tallest flower, and below for the name tag under each plot. */
 const minY = Math.min(...plots.map(p => p.y - p.radius * GROUND_SQUASH - 52)) - pad
 const maxY = Math.max(...plots.map(p => p.y + p.radius * GROUND_SQUASH + 36)) + pad
 return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export type Camera = { x: number; y: number; k: number }
export const MIN_ZOOM = 0.42
export const MAX_ZOOM = 2.8
/** Above this the garden shows every flower; below it each plot shows only its most common one. */
export const DETAIL_ZOOM = 1.12

export function clampZoom(k: number) { return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k)) }

export function fitCamera(plots: Plot[], width: number, height: number): Camera {
 const b = sceneBounds(plots)
 if (!width || !height) return { x: 0, y: 0, k: 1 }
 /* A little slack so nothing sits against the frame, and a nudge up to clear the hint. */
 const k = clampZoom(Math.min(width / b.width, height / b.height) * 0.92)
 return { x: width / 2 - (b.x + b.width / 2) * k, y: height / 2 - 10 - (b.y + b.height / 2) * k, k }
}

/** Zoom about a point so the ground under the finger stays under the finger. */
export function zoomAt(camera: Camera, px: number, py: number, factor: number): Camera {
 const k = clampZoom(camera.k * factor)
 const ratio = k / camera.k
 return { k, x: px - (px - camera.x) * ratio, y: py - (py - camera.y) * ratio }
}

export function focusCamera(plot: Plot, width: number, height: number, k = 1.9): Camera {
 return { k, x: width / 2 - plot.x * k, y: height / 2 - plot.y * k }
}
