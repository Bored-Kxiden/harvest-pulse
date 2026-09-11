/* A dotted field. Every dot is a sample of the same terrain, so the plan view and the
   tilted view are the same world seen from two camera angles rather than two drawings. */

function hash2(xi: number, yi: number, seed: number) {
 let h = seed ^ Math.imul(xi, 374761393) ^ Math.imul(yi, 668265263)
 h = Math.imul(h ^ (h >>> 13), 1274126177)
 return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}
function noise(x: number, y: number, seed: number) {
 const xi = Math.floor(x), yi = Math.floor(y)
 const xf = x - xi, yf = y - yi
 const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
 const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed)
 const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed)
 return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v
}
export function fbm(x: number, y: number, seed: number, octaves = 4) {
 let sum = 0, amp = 1, freq = 1, norm = 0
 for (let i = 0; i < octaves; i++) { sum += noise(x * freq, y * freq, seed + i * 101) * amp; norm += amp; amp *= 0.5; freq *= 2 }
 return sum / norm
}
const clamp01 = (n: number) => n < 0 ? 0 : n > 1 ? 1 : n
const smooth = (n: number) => { const t = clamp01(n); return t * t * (3 - 2 * t) }

export const CELL = 26
export const COLS = 132
export const ROWS = 84
export const FIELD_W = COLS * CELL
export const FIELD_H = ROWS * CELL
const SEED = 20260911

/** The river wanders down the left of the field rather than running straight. */
function riverAt(wy: number) { return FIELD_W * 0.1 + fbm(wy / 900 * 1.7, 3.2, SEED + 505, 3) * FIELD_W * 0.3 }

/** Height in 0..1 at any point, sampled by both the dots and anything drawn on the ground. */
export function heightAt(wx: number, wy: number) {
 const nx = wx / 1250, ny = wy / 1250
 const base = fbm(nx * 2.1, ny * 2.1, SEED, 5)
 const folds = fbm(nx * 1.3 + 9, ny * 1.3 + 9, SEED + 77, 4)
 const ridge = 1 - Math.abs(folds * 2 - 1)
 /* The far edge rises into a ridge, which is what gives the tilted view a skyline. */
 const rise = smooth(1 - wy / (FIELD_H * 0.58))
 let h = base * 0.42 + ridge * ridge * 0.3 + rise * 0.5
 /* The left of the field falls away into low ground and open water. */
 h *= 0.44 + 0.56 * smooth(wx / FIELD_W * 1.9)
 const bank = Math.abs(wx - riverAt(wy))
 if (bank < 70) h = Math.min(h, 0.2 + bank / 70 * 0.16)
 return clamp01(h)
}
export function moistureAt(wx: number, wy: number) {
 return fbm(wx / 1250 * 3.3 + 21, wy / 1250 * 3.3 + 21, SEED + 311, 4)
}
function grovesAt(wx: number, wy: number) {
 return fbm(wx / 1250 * 8.5 + 4, wy / 1250 * 8.5 + 4, SEED + 907, 3)
}
function tilledAt(wx: number, wy: number) {
 return fbm(wx / 1250 * 2.6 + 61, wy / 1250 * 2.6 + 61, SEED + 1301, 3)
}

export type CellKind = 'veg' | 'water' | 'rock' | 'bare' | 'tilled' | 'built'
export type Cell = { x: number; y: number; z: number; kind: CellKind; size: number; tone: number }

export function buildField(): Cell[] {
 const cells: Cell[] = []
 for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
   /* A touch of jitter keeps the grid from reading as graph paper without losing its rows. */
   const jx = (hash2(col, row, SEED + 5) - 0.5) * CELL * 0.32
   const jy = (hash2(col, row, SEED + 6) - 0.5) * CELL * 0.32
   const x = col * CELL + jx
   const y = row * CELL + jy
   const z = heightAt(x, y)
   const m = moistureAt(x, y)
   const grove = grovesAt(x, y)
   const till = tilledAt(x, y)
   const slope = Math.abs(z - heightAt(x + CELL, y)) + Math.abs(z - heightAt(x, y + CELL))
   const chance = hash2(col, row, SEED + 7)

   let kind: CellKind = 'bare'
   let size = 0.1
   const tone = chance

   if (z < 0.29) { kind = 'water'; size = 0.36 + (0.29 - z) * 2.2 }
   else if (z < 0.34) { kind = 'water'; size = 0.2 }
   else if (z > 0.74 && slope > 0.028) { kind = 'rock'; size = 0.26 + slope * 3 }
   else if (z > 0.6 && grove > 0.5) { kind = 'veg'; size = 0.5 + (grove - 0.5) * 2.2 }
   else if (grove > 0.52) { kind = 'veg'; size = 0.42 + (grove - 0.52) * 2.4 + m * 0.45 }
   else if (m > 0.48) { kind = 'veg'; size = 0.16 + (m - 0.48) * 1.7 }
   else if (till > 0.55 && till < 0.66 && z < 0.7) { kind = 'tilled'; size = 0.32 }
   else if (chance > 0.982 && z > 0.36) { kind = 'built'; size = 0.28 }
   else { kind = 'bare'; size = 0.09 + m * 0.18 }

   cells.push({ x, y, z, kind, size: Math.min(size, 1.35), tone })
  }
 }
 return cells
}

export type Section = { id: string; name: string; x: number; y: number; radius: number; ring: [number, number][] }

/** Nudge a patch off water and off the steepest ground, so every section sits somewhere plantable. */
function settle(x: number, y: number) {
 let best: [number, number] = [x, y]; let bestScore = -1
 for (let ring = 0; ring <= 6; ring++) {
  for (let step = 0; step < (ring ? 10 : 1); step++) {
   const angle = (step / 10) * Math.PI * 2
   const px = x + Math.cos(angle) * ring * 95, py = y + Math.sin(angle) * ring * 95
   if (px < 240 || px > FIELD_W - 240 || py < 240 || py > FIELD_H - 240) continue
   const z = heightAt(px, py)
   const score = z > 0.38 && z < 0.72 ? 1 - Math.abs(z - 0.52) - ring * 0.05 : -1
   if (score > bestScore) { bestScore = score; best = [px, py] }
  }
  if (bestScore > 0.6) break
 }
 return best
}

export function buildSections(names: string[]): Section[] {
 const spots: [number, number][] = [[0.42, 0.68], [0.7, 0.76], [0.55, 0.44], [0.84, 0.52], [0.3, 0.4]]
 return names.slice(0, spots.length).map((name, i) => {
  const seed = 4000 + i * 37
  const [x, y] = settle(spots[i][0] * FIELD_W, spots[i][1] * FIELD_H)
  const radius = 190 + hash2(i, 3, seed) * 70
  const points = 13
  const ring: [number, number][] = []
  for (let k = 0; k < points; k++) {
   const angle = (k / points) * Math.PI * 2
   const r = radius * (0.74 + fbm(Math.cos(angle) * 1.4 + 3, Math.sin(angle) * 1.4 + 3, seed, 3) * 0.55)
   ring.push([x + Math.cos(angle) * r, y + Math.sin(angle) * r])
  }
  return { id: name.toLowerCase().replace(/\s+/g, '-'), name, x, y, radius, ring }
 })
}

/* ---------- camera ----------
   Two cameras over one world. The plan camera looks straight down; the landscape camera
   stands on the ground a little way back, so distance runs away to a horizon instead of
   simply shrinking. Zoom drops that camera closer to the ground rather than magnifying. */
export type Camera = { x: number; y: number; zoom: number }
/** Zoom is measured in multiples of whatever it takes to fit the whole field on screen,
    so the same thresholds hold on a phone and on a desktop. */
export const TILT_FROM = 2.1
export const TILT_TO = 4.2
export const MAX_ZOOM = 26
const EYE = 300
const SET_BACK = 2.4
const HORIZON = 0.14
const ELEVATION = 170

/** Cover rather than contain: the plan should fill the frame instead of floating in it. */
export function overviewZoom(viewW: number, viewH: number) {
 if (!viewW || !viewH) return 0.2
 return Math.max(viewW / FIELD_W, viewH / FIELD_H)
}
export const clampZoom = (z: number, base: number) => Math.min(base * MAX_ZOOM, Math.max(base, z))
export const tiltFor = (zoom: number, base: number) => smooth((zoom / base - TILT_FROM) / (TILT_TO - TILT_FROM))

export type Projected = { sx: number; sy: number; scale: number }
export type Lens = { cam: Camera; tilt: number; w: number; h: number; focal: number; eye: number; back: number; camZ: number }

/** The camera rig, solved once a frame: zooming in walks the whole rig toward the focus,
    which magnifies what you are looking at without moving it or shifting the horizon. */
export function lensFor(cam: Camera, w: number, h: number, base: number): Lens {
 const rel = Math.max(cam.zoom / base, 0.6)
 const eye = Math.max(34, EYE * TILT_TO / rel)
 const back = eye * SET_BACK
 /* The eye rides the terrain it stands on, so close in you are among the hills, not buried under them. */
 const camZ = heightAt(cam.x, cam.y + back) * ELEVATION
 return { cam, tilt: tiltFor(cam.zoom, base), w, h, focal: h * 0.92, eye, back, camZ }
}

export function project(wx: number, wy: number, wz: number, lens: Lens): Projected {
 const { cam, tilt, w, h, focal, eye, back, camZ } = lens
 const flatX = w / 2 + (wx - cam.x) * cam.zoom
 const flatY = h * 0.5 + (wy - cam.y) * cam.zoom
 if (tilt <= 0.002) return { sx: flatX, sy: flatY, scale: cam.zoom }

 /* Clamped so ground level with the eye smears off the bottom edge instead of wrapping behind it. */
 const d = Math.max(eye * 0.3, cam.y + back - wy)
 const tiltX = w / 2 + focal * (wx - cam.x) / d
 const tiltY = h * HORIZON + focal * (eye + camZ - wz * ELEVATION) / d
 const tiltScale = focal / d

 return {
  sx: flatX + (tiltX - flatX) * tilt,
  sy: flatY + (tiltY - flatY) * tilt,
  scale: cam.zoom + (tiltScale - cam.zoom) * tilt,
 }
}
