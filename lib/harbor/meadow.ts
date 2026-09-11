/* The meadow.
   One terrain, sampled twice: a plan camera looking straight down and a camera standing
   on the ground a little way back. Zoom lerps between them, so the same dots that read
   as a map from above read as a landscape once you come down into it.
   Every call anybody has had is one flower, standing where it was planted. */
import { bloomScale, flowerSpec, type FlowerKind, type Moment, type Person } from './model'

/* ---------- noise ---------- */
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
function fbm(x: number, y: number, seed: number, octaves = 4) {
 let sum = 0, amp = 1, freq = 1, norm = 0
 for (let i = 0; i < octaves; i++) { sum += noise(x * freq, y * freq, seed + i * 101) * amp; norm += amp; amp *= 0.5; freq *= 2 }
 return sum / norm
}
const clamp01 = (n: number) => n < 0 ? 0 : n > 1 ? 1 : n
const smooth = (n: number) => { const t = clamp01(n); return t * t * (3 - 2 * t) }

/* ---------- terrain ---------- */
export const CELL = 26, COLS = 132, ROWS = 84
export const FIELD_W = COLS * CELL, FIELD_H = ROWS * CELL
const SEED = 20260911, N = 1250

const riverAt = (wy: number) => FIELD_W * 0.12 + fbm(wy / 900 * 1.7, 3.2, SEED + 505, 3) * FIELD_W * 0.26
/** An island rather than a rectangle, so the meadow has an edge you can see. */
export function landAt(wx: number, wy: number) {
 const dx = (wx - FIELD_W / 2) / (FIELD_W * 0.52), dy = (wy - FIELD_H / 2) / (FIELD_H * 0.52)
 return (1 - Math.sqrt(dx * dx + dy * dy)) * 0.72 + fbm(wx / N * 1.9 + 41, wy / N * 1.9 + 41, SEED + 2200, 4) * 0.5 - 0.16
}
export function heightAt(wx: number, wy: number) {
 const base = fbm(wx / N * 2.1, wy / N * 2.1, SEED, 5)
 const folds = fbm(wx / N * 1.3 + 9, wy / N * 1.3 + 9, SEED + 77, 4)
 const ridge = 1 - Math.abs(folds * 2 - 1)
 let h = base * 0.42 + ridge * ridge * 0.3 + smooth(1 - wy / (FIELD_H * 0.58)) * 0.5
 h *= 0.46 + 0.54 * smooth(wx / FIELD_W * 1.9)
 const bank = Math.abs(wx - riverAt(wy))
 if (bank < 58) h = Math.min(h, 0.2 + bank / 58 * 0.16)
 return clamp01(h)
}
const moistureAt = (wx: number, wy: number) => fbm(wx / N * 3.3 + 21, wy / N * 3.3 + 21, SEED + 311, 4)
const grovesAt = (wx: number, wy: number) => fbm(wx / N * 9.5 + 4, wy / N * 9.5 + 4, SEED + 907, 3)
const meadowAt = (wx: number, wy: number) => fbm(wx / N * 6.2 + 71, wy / N * 6.2 + 71, SEED + 1601, 3)

/* ---------- patches: one organic plot per person ---------- */
export type Patch = { id: string; name: string; x: number; y: number; radius: number; ring: [number, number][]; count: number; dominant: FlowerKind }

/** Nudge a plot onto ground that is above water and not a cliff, so nobody is planted in the river. */
function settle(x: number, y: number): [number, number] {
 let best: [number, number] = [x, y], bestScore = -1
 for (let ring = 0; ring <= 7; ring++) {
  for (let step = 0; step < (ring ? 12 : 1); step++) {
   const a = (step / 12) * Math.PI * 2
   const px = x + Math.cos(a) * ring * 80, py = y + Math.sin(a) * ring * 80
   if (landAt(px, py) < 0.26) continue
   const z = heightAt(px, py)
   const score = z > 0.38 && z < 0.72 ? 1 - Math.abs(z - 0.52) - ring * 0.04 : -1
   if (score > bestScore) { bestScore = score; best = [px, py] }
  }
  if (bestScore > 0.62) break
 }
 return best
}
function blobRing(cx: number, cy: number, radius: number, seed: number, points = 17) {
 const ring: [number, number][] = []
 for (let k = 0; k < points; k++) {
  const a = (k / points) * Math.PI * 2
  const r = radius * (0.68 + fbm(Math.cos(a) * 1.6 + 3, Math.sin(a) * 1.6 + 3, seed, 3) * 0.7)
  ring.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
 }
 return ring
}
/* Spread out enough that plots stay apart however many people you keep. */
const SPOTS: [number, number][] = [[0.4, 0.66], [0.68, 0.74], [0.55, 0.42], [0.82, 0.55], [0.3, 0.4], [0.74, 0.3], [0.46, 0.86], [0.9, 0.76]]

export function buildPatches(people: Person[], calls: Moment[]): Patch[] {
 return people.map((person, i) => {
  const spot = SPOTS[i % SPOTS.length]
  const drift = i >= SPOTS.length ? (i / SPOTS.length) * 0.06 : 0
  const seed = 4000 + i * 37
  const [x, y] = settle((spot[0] + drift) * FIELD_W, (spot[1] - drift) * FIELD_H)
  const radius = 108 + hash2(i, 3, seed) * 34
  const mine = calls.filter(c => c.person === person.id)
  const tally = new Map<FlowerKind, number>()
  for (const c of mine) if (c.flower) tally.set(c.flower, (tally.get(c.flower) ?? 0) + 1)
  let dominant: FlowerKind = 'daisy', top = 0
  for (const [kind, n] of tally) if (n > top) { top = n; dominant = kind }
  return { id: person.id, name: person.name, x, y, radius, ring: blobRing(x, y, radius, seed), count: mine.length, dominant }
 })
}
export function inRing(ring: [number, number][], px: number, py: number) {
 let inside = false
 for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
  const [xi, yi] = ring[i], [xj, yj] = ring[j]
  if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
 }
 return inside
}
function patchAt(patches: Patch[], px: number, py: number) {
 for (let i = 0; i < patches.length; i++) {
  const p = patches[i]
  if (Math.abs(px - p.x) > p.radius * 1.5 || Math.abs(py - p.y) > p.radius * 1.5) continue
  if (inRing(p.ring, px, py)) return i
 }
 return -1
}

/* ---------- blooms: one per call, placed on a golden angle so adding one never moves the rest ---------- */
export type Bloom = { id: string; person: string; patch: number; kind: FlowerKind; x: number; y: number; z: number; size: number; spin: number; moment: Moment }

export function placeBlooms(patches: Patch[], calls: Moment[]): Bloom[] {
 const out: Bloom[] = []
 patches.forEach((patch, pi) => {
  const mine = calls.filter(c => c.person === patch.id).slice().sort((a, b) => a.at.localeCompare(b.at))
  const seed = 9100 + pi * 211
  mine.forEach((moment, i) => {
   const r1 = hash2(i, 1, seed), r2 = hash2(i, 2, seed), r4 = hash2(i, 4, seed)
   const rad = Math.min(patch.radius * 0.8, patch.radius * 0.78 * Math.sqrt((i + 0.6) / Math.max(mine.length, 8)))
   const angle = i * 2.399963 + r4 * 0.5
   const x = patch.x + Math.cos(angle) * rad + (r1 - 0.5) * 12
   const y = patch.y + Math.sin(angle) * rad + (r2 - 0.5) * 12
   out.push({ id: moment.id, person: patch.id, patch: pi, kind: moment.flower ?? 'daisy', x, y, z: heightAt(x, y), size: bloomScale(moment.minutes), spin: r2 * 6.283, moment })
  })
 })
 return out.sort((a, b) => a.y - b.y)
}

/* ---------- ground cover ---------- */
export const FOLIAGE = ['#BBD79A', '#A6CB85', '#8FBC72', '#77A95E', '#649A50']
export const WILD = ['#FFFFFF', '#FBE3EC', '#F4C9DD', '#E7D8F6', '#FCE9AE']
export const WATER = ['#BFE0EE', '#9CCBE4']
export const PAINT = [...FOLIAGE, ...WILD, ...WATER]
export const WILD_FROM = FOLIAGE.length, WATER_FROM = WILD_FROM + WILD.length
export type Cell = { x: number; y: number; z: number; size: number; paint: number }

let cellCache: { key: string; cells: Cell[] } | null = null
/** Ten thousand-odd samples of the same terrain. Rebuilt only when the plots themselves change. */
export function buildCells(patches: Patch[]): Cell[] {
 const key = patches.map(p => `${p.id}:${Math.round(p.x)},${Math.round(p.y)}`).join('|')
 if (cellCache?.key === key) return cellCache.cells
 const cells: Cell[] = []
 for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
   const x = col * CELL + (hash2(col, row, SEED + 5) - 0.5) * CELL * 0.5
   const y = row * CELL + (hash2(col, row, SEED + 6) - 0.5) * CELL * 0.5
   if (landAt(x, y) < 0.2) continue
   const z = heightAt(x, y)
   const m = moistureAt(x, y), grove = grovesAt(x, y), wild = meadowAt(x, y)
   const chance = hash2(col, row, SEED + 7)
   const patch = patchAt(patches, x, y)
   let size: number, paint: number
   /* Inside somebody's plot the ground is kept short, so their flowers read clearly. */
   if (patch >= 0 && z > 0.3) { size = 0.2 + chance * 0.18; paint = chance > 0.6 ? 1 : 0 }
   else if (z < 0.3) { size = 0.44 + (0.3 - z) * 2; paint = WATER_FROM + (chance > 0.5 ? 1 : 0) }
   else if (z < 0.35) { size = 0.26; paint = WATER_FROM }
   else if (wild > 0.62 && chance > 0.42) { size = 0.4 + (wild - 0.62) * 1.8; paint = WILD_FROM + Math.floor(chance * WILD.length) % WILD.length }
   else if (grove > 0.5) { size = 0.52 + (grove - 0.5) * 3 + m * 0.5; paint = Math.min(4, 1 + Math.floor(z * 3.2 + chance * 1.3)) }
   else if (m > 0.42) { size = 0.24 + (m - 0.42) * 2; paint = Math.min(4, Math.floor(z * 3 + chance * 1.4)) }
   else { size = 0.16 + m * 0.2; paint = Math.max(0, Math.floor(chance * 2)) }
   cells.push({ x, y, z, size: Math.min(size, 2.3), paint })
  }
 }
 cellCache = { key, cells }
 return cells
}

/* ---------- camera ---------- */
export type Camera = { x: number; y: number; zoom: number }
export type Lens = { tilt: number; focal: number; eye: number; back: number; camZ: number }
export type Point = { x: number; y: number; s: number }
const TILT_FROM = 2.1, TILT_TO = 4.2
export const MAX_REL = 30
const EYE = 300, SET_BACK = 2.4, ELEVATION = 170
export const HORIZON = 0.2

/** Cover, not contain: the plan fills the card instead of floating in it. */
export const overviewZoom = (w: number, h: number) => (!w || !h) ? 0.2 : Math.max(w / FIELD_W, h / FIELD_H)
export const clampZoom = (z: number, base: number) => Math.min(base * MAX_REL, Math.max(base, z))
export const tiltFor = (zoom: number, base: number) => smooth((zoom / base - TILT_FROM) / (TILT_TO - TILT_FROM))

export function buildLens(cam: Camera, w: number, h: number, base: number): Lens {
 const rel = Math.max(cam.zoom / base, 0.6)
 const eye = Math.max(34, EYE * TILT_TO / rel)
 /* The eye rides the ground it stands on, so close in you are among the hills rather than under them. */
 return { tilt: tiltFor(cam.zoom, base), focal: h * 0.92, eye, back: eye * SET_BACK, camZ: heightAt(cam.x, cam.y) * ELEVATION }
}
export function project(wx: number, wy: number, wz: number, cam: Camera, lens: Lens, w: number, h: number, out: Point): Point {
 const flatX = w / 2 + (wx - cam.x) * cam.zoom
 const flatY = h * 0.5 + (wy - cam.y) * cam.zoom
 if (lens.tilt <= 0.002) { out.x = flatX; out.y = flatY; out.s = cam.zoom; return out }
 const d = Math.max(lens.eye * 0.3, cam.y + lens.back - wy)
 const tx = w / 2 + lens.focal * (wx - cam.x) / d
 const ty = h * HORIZON + lens.focal * (lens.eye + lens.camZ - wz * ELEVATION) / d
 const ts = lens.focal / d
 out.x = flatX + (tx - flatX) * lens.tilt
 out.y = flatY + (ty - flatY) * lens.tilt
 out.s = cam.zoom + (ts - cam.zoom) * lens.tilt
 return out
}

/* ---------- drawing a single flower on the canvas ---------- */
const SHAPE: Record<FlowerKind, { rx: number; ry: number }> = {
 daisy: { rx: .40, ry: .30 }, marigold: { rx: .38, ry: .28 }, cosmos: { rx: .44, ry: .32 }, poppy: { rx: .50, ry: .38 },
 tulip: { rx: .42, ry: .44 }, bluebell: { rx: .32, ry: .44 }, aster: { rx: .26, ry: .40 }, sunflower: { rx: .28, ry: .42 },
}
export function drawFlower(ctx: CanvasRenderingContext2D, kind: FlowerKind, x: number, y: number, r: number, spin: number) {
 const f = flowerSpec(kind), shape = SHAPE[kind] ?? SHAPE.daisy
 for (let i = 0; i < f.petals; i++) {
  const a = (i / f.petals) * 6.283185 + spin
  ctx.fillStyle = i % 2 ? f.petal : f.petalDeep
  ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r * 0.52, y + Math.sin(a) * r * 0.52, r * shape.rx, r * shape.ry, a, 0, 6.283185); ctx.fill()
 }
 ctx.fillStyle = f.heart
 ctx.beginPath(); ctx.arc(x, y, r * 0.28, 0, 6.283185); ctx.fill()
}
