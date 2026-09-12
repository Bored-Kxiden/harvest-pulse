/* The meadow.
   Not a card any more, the whole background, painted once per weather change into an
   offscreen layer, with everything that moves (cloud, wind, rain, blooms) drawn live on top.
   One rule holds the illustration together: nothing is a hard edge. Hills, petals and
   water all get soft shoulders, because the reference is watercolour, not vector. */
import { flowerSpec, type FlowerKind, type Moment, type Person, type Weather } from './model'

/* ---------- deterministic noise, so the same meadow comes back every time ---------- */
function hash(i: number, seed: number) {
 let h = seed ^ Math.imul(i, 374761393)
 h = Math.imul(h ^ (h >>> 13), 1274126177)
 return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}
function wave(x: number, seed: number, octaves = 3) {
 let sum = 0, amp = 1, freq = 1, norm = 0
 for (let i = 0; i < octaves; i++) {
  sum += Math.sin(x * freq + hash(i, seed) * 7) * amp
  norm += amp; amp *= 0.52; freq *= 2.1
 }
 return sum / norm
}

/* ---------- the five skies ---------- */
export type Palette = {
 sky: [string, string, string]
 sun: string; sunGlow: string; sunY: number
 cloud: string; cloudCount: number
 hills: string[]; trees: string[]
 field: string[]; water: string
 haze: string; light: number
}
const PALETTES: Record<Weather, Palette> = {
 clear: {
  sky: ['#8EC9EC', '#B9DFF1', '#E4F1F0'],
  sun: '#FFE9A8', sunGlow: 'rgba(255,224,150,.55)', sunY: 0.17,
  cloud: 'rgba(255,255,255,.92)', cloudCount: 5,
  hills: ['#BFD9C4', '#A6CCA4', '#8FBE86', '#7BAE6E'],
  trees: ['#6FA26A', '#5C9159', '#4F8350'],
  field: ['#9CC77E', '#8ABB6C', '#7BAE60'], water: '#B7DCE8',
  haze: 'rgba(240,248,236,.55)', light: 1,
 },
 bright: {
  sky: ['#7CC0E8', '#AEDAF0', '#EAF4E8'],
  sun: '#FFDE8A', sunGlow: 'rgba(255,214,120,.62)', sunY: 0.13,
  cloud: 'rgba(255,255,255,.85)', cloudCount: 3,
  hills: ['#C7DCB8', '#AFD096', '#98C27C', '#85B369'],
  trees: ['#74A868', '#5F9556', '#52874C'],
  field: ['#A6CE80', '#93C26A', '#83B65D'], water: '#AFD9E8',
  haze: 'rgba(250,247,230,.5)', light: 1.05,
 },
 cloudy: {
  sky: ['#A9BCC8', '#C4D3D9', '#DFE6E0'],
  sun: '#F2EBD8', sunGlow: 'rgba(236,232,214,.4)', sunY: 0.2,
  cloud: 'rgba(252,252,250,.95)', cloudCount: 8,
  hills: ['#B3C2B0', '#9DB295', '#89A37F', '#78946D'],
  trees: ['#6B8C66', '#5A7D57', '#4E7049'],
  field: ['#93AE7E', '#84A36D', '#769863'], water: '#AEC4CC',
  haze: 'rgba(226,232,226,.6)', light: 0.93,
 },
 rain: {
  sky: ['#8496A4', '#A6B6BE', '#C6D0C9'],
  sun: '#DDE0DA', sunGlow: 'rgba(220,224,216,.22)', sunY: 0.24,
  cloud: 'rgba(236,240,240,.96)', cloudCount: 10,
  hills: ['#98A89A', '#869A85', '#748A72', '#657C62'],
  trees: ['#5C7A58', '#4E6C4B', '#446141'],
  field: ['#7E9770', '#728C63', '#668158'], water: '#98B2BC',
  haze: 'rgba(206,216,212,.62)', light: 0.85,
 },
 storm: {
  sky: ['#5E6C79', '#7C8892', '#A3ABA4'],
  sun: '#C3C7C0', sunGlow: 'rgba(190,194,186,.16)', sunY: 0.27,
  cloud: 'rgba(214,220,222,.96)', cloudCount: 12,
  hills: ['#7D8B80', '#6C7C6E', '#5C6D5D', '#4E5F4F'],
  trees: ['#48613F', '#3E5537', '#364A30'],
  field: ['#657C58', '#5B724E', '#526845'], water: '#7D939C',
  haze: 'rgba(178,188,184,.6)', light: 0.76,
 },
}
export const paletteFor = (w: Weather) => PALETTES[w]

/* ---------- wind ----------
   One field everything reads from, so a gust crosses the whole meadow at once
   instead of every flower having its own private breeze. */
export function windAt(x: number, y: number, t: number, strength: number) {
 const gust = 0.6 + 0.4 * Math.sin(t * 0.00042) + 0.22 * Math.sin(t * 0.0017 + 1.3)
 return (Math.sin(t * 0.0016 + x * 0.011 + y * 0.02) + 0.45 * Math.sin(t * 0.0031 + x * 0.026)) * gust * strength
}
export const windStrength: Record<Weather, number> = { clear: 3.2, bright: 4.4, cloudy: 6, rain: 8.5, storm: 15 }

/** The world is wider than the window: panning has somewhere to go, zoom something to find. */
export const WORLD_SPAN = 2.6

/* ---------- static geometry, laid out once for a given size ---------- */
type Hill = { path: Path2D; fill: string; baseY: number }
type Tree = { x: number; y: number; h: number; kind: 'cypress' | 'round'; shade: number }
type House = { x: number; y: number; w: number; roof: string; wall: string }
type Blade = { x: number; y: number; h: number; lean: number; tone: number; bloom: FlowerKind | null; hue: number }

export type Scene = {
 w: number; h: number; horizon: number
 hills: Hill[]; trees: Tree[]; houses: House[]; river: Path2D | null
 blades: Blade[]
 clouds: { x: number; y: number; s: number; speed: number; puffs: [number, number, number][] }[]
}

const WILD: FlowerKind[] = ['daisy', 'cosmos', 'tulip', 'marigold', 'bluebell', 'aster']

/** The meadow is laid out for the visible band above the sheet, so nothing important hides behind it. */
export function buildScene(w: number, h: number, fieldTop: number): Scene {
 const horizon = h * 0.3
 const hills: Hill[] = []
 const bands = [
  { y: horizon - 14, amp: 16, freq: 1.4, seed: 11 },
  { y: horizon + 6, amp: 22, freq: 2.1, seed: 27 },
  { y: horizon + 34, amp: 26, freq: 1.7, seed: 43 },
  { y: horizon + 68, amp: 30, freq: 1.1, seed: 61 },
 ]
 bands.forEach((band, i) => {
  const path = new Path2D()
  path.moveTo(-20, band.y)
  for (let x = -20; x <= w + 20; x += 10) {
   path.lineTo(x, band.y + wave((x / w) * band.freq * 4.2, band.seed, 3) * band.amp)
  }
  path.lineTo(w + 20, h + 20); path.lineTo(-20, h + 20); path.closePath()
  hills.push({ path, fill: '', baseY: band.y })
 })

 /* Cypresses cluster where the land folds, with a few round crowns between them. */
 const trees: Tree[] = []
 for (let i = 0; i < 46; i++) {
  const r = hash(i, 500)
  const x = r * (w + 60) - 30
  const band = i % 3
  const y = bands[band + 1].y + wave((x / w) * bands[band + 1].freq * 4.2, bands[band + 1].seed, 3) * bands[band + 1].amp + 2
  const cypress = hash(i, 900) > 0.42
  trees.push({ x, y, h: (cypress ? 26 : 15) * (0.6 + hash(i, 700) * 0.8) * (1 - band * 0.16), kind: cypress ? 'cypress' : 'round', shade: band })
 }
 trees.sort((a, b) => a.y - b.y)

 /* One small settlement, far enough away to read as a place rather than a building. */
 const houses: House[] = []
 const hx = w * 0.66, hy = bands[1].y + wave((hx / w) * bands[1].freq * 4.2, bands[1].seed, 3) * bands[1].amp
 for (let i = 0; i < 4; i++) {
  houses.push({
   x: hx + (i - 1.5) * 15 + hash(i, 300) * 7, y: hy - 3 + hash(i, 310) * 5,
   w: 8 + hash(i, 320) * 5, roof: i % 2 ? '#C97B62' : '#B9694F', wall: '#FBF3E4',
  })
 }

 const river = new Path2D()
 const ry = bands[2].y + 12
 river.moveTo(w * 0.86, ry)
 river.bezierCurveTo(w * 0.62, ry + 10, w * 0.52, ry + 26, w * 0.2, ry + 40)
 river.lineTo(w * 0.16, ry + 52)
 river.bezierCurveTo(w * 0.5, ry + 36, w * 0.64, ry + 20, w * 0.92, ry + 8)
 river.closePath()

 /* The field: rows of stems, denser and taller as they come forward. */
 const blades: Blade[] = []
 const top = horizon + 40
 const bottom = fieldTop + 80
 const rows = 30
 for (let r = 0; r < rows; r++) {
  const f = r / (rows - 1)
  const y = top + (bottom - top) * f * f
  const count = Math.round(16 + f * 44)
  for (let i = 0; i < count; i++) {
   const jitter = hash(r * 97 + i, 1200)
   const x = ((i + jitter) / count) * (w + 40) - 20
   const scale = 0.32 + f * 1.5
   const wild = hash(r * 131 + i, 1400)
   blades.push({
    x, y, h: (9 + hash(r * 53 + i, 1500) * 13) * scale,
    lean: (hash(r * 31 + i, 1600) - 0.5) * 0.5,
    tone: Math.floor(hash(r * 17 + i, 1700) * 3),
    bloom: wild > 0.52 ? WILD[Math.floor(hash(r * 71 + i, 1800) * WILD.length)] : null,
    hue: hash(r * 23 + i, 1900),
   })
  }
 }
 blades.sort((a, b) => a.y - b.y)

 const clouds = Array.from({ length: 12 }, (_, i) => ({
  x: hash(i, 2100) * (w + 300) - 150,
  y: h * (0.03 + hash(i, 2200) * 0.26),
  s: 0.5 + hash(i, 2300) * 1.15,
  speed: 0.0028 + hash(i, 2400) * 0.006,
  puffs: Array.from({ length: 5 }, (_, k) => [
   (hash(i * 11 + k, 2500) - 0.5) * 74,
   (hash(i * 11 + k, 2600) - 0.5) * 15,
   15 + hash(i * 11 + k, 2700) * 20,
  ] as [number, number, number]),
 }))

 return { w, h, horizon, hills, trees, houses, river, blades, clouds }
}

/* ---------- the still half of the picture ---------- */
export function paintBackdrop(ctx: CanvasRenderingContext2D, scene: Scene, weather: Weather) {
 const p = PALETTES[weather]
 const { w, h, horizon } = scene
 ctx.clearRect(0, 0, w, h)

 const sky = ctx.createLinearGradient(0, 0, 0, horizon + 60)
 sky.addColorStop(0, p.sky[0]); sky.addColorStop(0.62, p.sky[1]); sky.addColorStop(1, p.sky[2])
 ctx.fillStyle = sky
 ctx.fillRect(0, 0, w, horizon + 70)

 /* Sun, and the light it throws across the hills. */
 const sx = w * 0.63, sy = h * p.sunY
 const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, 120)
 glow.addColorStop(0, p.sun); glow.addColorStop(0.24, p.sunGlow); glow.addColorStop(1, 'rgba(255,224,150,0)')
 ctx.fillStyle = glow
 ctx.beginPath(); ctx.arc(sx, sy, 120, 0, 6.283185); ctx.fill()
 ctx.fillStyle = p.sun
 ctx.globalAlpha = weather === 'storm' || weather === 'rain' ? 0.25 : 0.9
 ctx.beginPath(); ctx.arc(sx, sy, 26, 0, 6.283185); ctx.fill()
 ctx.globalAlpha = 1

 scene.hills.forEach((hill, i) => {
  ctx.fillStyle = p.hills[i]
  ctx.fill(hill.path)
  /* A lighter crest where the sun lands, so the bands read as land rather than paper. */
  ctx.save()
  ctx.clip(hill.path)
  const crest = ctx.createLinearGradient(0, hill.baseY - 18, 0, hill.baseY + 40)
  crest.addColorStop(0, 'rgba(255,255,255,.3)'); crest.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = crest
  ctx.fillRect(0, hill.baseY - 20, w, 62)
  ctx.restore()
 })

 ctx.save()
 ctx.fillStyle = p.water
 ctx.globalAlpha = 0.85
 ctx.fill(scene.river!)
 ctx.restore()

 for (const house of scene.houses) {
  ctx.fillStyle = house.wall
  ctx.fillRect(house.x, house.y, house.w, house.w * 0.72)
  ctx.fillStyle = house.roof
  ctx.beginPath()
  ctx.moveTo(house.x - 1.6, house.y); ctx.lineTo(house.x + house.w / 2, house.y - house.w * 0.5)
  ctx.lineTo(house.x + house.w + 1.6, house.y); ctx.closePath(); ctx.fill()
 }

 for (const tree of scene.trees) {
  ctx.fillStyle = p.trees[tree.shade]
  if (tree.kind === 'cypress') {
   ctx.beginPath()
   ctx.moveTo(tree.x, tree.y - tree.h)
   ctx.bezierCurveTo(tree.x + tree.h * 0.3, tree.y - tree.h * 0.42, tree.x + tree.h * 0.22, tree.y, tree.x, tree.y)
   ctx.bezierCurveTo(tree.x - tree.h * 0.22, tree.y, tree.x - tree.h * 0.3, tree.y - tree.h * 0.42, tree.x, tree.y - tree.h)
   ctx.fill()
  } else {
   ctx.beginPath()
   ctx.arc(tree.x, tree.y - tree.h * 0.55, tree.h * 0.5, 0, 6.283185)
   ctx.arc(tree.x - tree.h * 0.34, tree.y - tree.h * 0.34, tree.h * 0.36, 0, 6.283185)
   ctx.arc(tree.x + tree.h * 0.34, tree.y - tree.h * 0.3, tree.h * 0.33, 0, 6.283185)
   ctx.fill()
  }
 }

 /* Distance goes pale before it disappears: the one trick that stops bands reading as stripes. */
 const haze = ctx.createLinearGradient(0, horizon - 26, 0, horizon + 96)
 haze.addColorStop(0, p.haze); haze.addColorStop(1, 'rgba(255,255,255,0)')
 ctx.fillStyle = haze
 ctx.fillRect(0, horizon - 26, w, 130)

 const lip = horizon + 42
 const ground = ctx.createLinearGradient(0, lip - 10, 0, h)
 ground.addColorStop(0, p.field[0]); ground.addColorStop(0.45, p.field[1]); ground.addColorStop(1, p.field[2])
 ctx.fillStyle = ground
 ctx.beginPath()
 ctx.moveTo(-20, lip)
 for (let x = -20; x <= w + 20; x += 9) ctx.lineTo(x, lip + wave((x / w) * 5.4, 73, 3) * 9)
 ctx.lineTo(w + 20, h + 20); ctx.lineTo(-20, h + 20); ctx.closePath(); ctx.fill()
 /* and a breath of light where it meets the hills, so the join is a haze and not a seam */
 const meet = ctx.createLinearGradient(0, lip - 16, 0, lip + 26)
 meet.addColorStop(0, p.haze); meet.addColorStop(1, 'rgba(255,255,255,0)')
 ctx.fillStyle = meet
 ctx.fillRect(0, lip - 16, w, 42)
}

/* ---------- the half that moves ---------- */
export function paintClouds(ctx: CanvasRenderingContext2D, scene: Scene, weather: Weather, t: number) {
 const p = PALETTES[weather]
 ctx.save()
 ctx.fillStyle = p.cloud
 for (let i = 0; i < Math.min(p.cloudCount, scene.clouds.length); i++) {
  const c = scene.clouds[i]
  const x = ((c.x + t * c.speed * 30) % (scene.w + 320)) - 160
  ctx.globalAlpha = 0.5 + (i % 3) * 0.16
  ctx.beginPath()
  for (const [dx, dy, r] of c.puffs) ctx.arc(x + dx * c.s, c.y + dy * c.s, r * c.s, 0, 6.283185)
  ctx.fill()
 }
 ctx.restore()
}

/** Grass and wild flowers, every stem bending on the same gust. */
export function paintField(ctx: CanvasRenderingContext2D, scene: Scene, weather: Weather, t: number, view?: { x0: number; x1: number; y0: number; y1: number }) {
 const p = PALETTES[weather]
 const strength = windStrength[weather]
 ctx.lineCap = 'round'
 for (const b of scene.blades) {
  /* Off screen is not drawn: the world is wide and most of it is behind you. */
  if (view && (b.x < view.x0 - 40 || b.x > view.x1 + 40 || b.y < view.y0 - 60 || b.y > view.y1 + 40)) continue
  const bend = windAt(b.x, b.y, t, strength) * (b.h / 18)
  const tipX = b.x + bend + b.lean * b.h
  const tipY = b.y - b.h
  ctx.strokeStyle = p.field[b.tone]
  ctx.lineWidth = Math.max(1, b.h * 0.09)
  ctx.beginPath()
  ctx.moveTo(b.x, b.y)
  ctx.quadraticCurveTo(b.x + bend * 0.35, b.y - b.h * 0.55, tipX, tipY)
  ctx.stroke()
  if (b.bloom) {
   const f = flowerSpec(b.bloom)
   const r = Math.max(1.4, b.h * 0.17)
   ctx.fillStyle = b.hue > 0.5 ? f.petal : f.petalDeep
   ctx.beginPath(); ctx.arc(tipX, tipY, r, 0, 6.283185); ctx.fill()
   if (r > 2.6) {
    ctx.fillStyle = f.heart
    ctx.beginPath(); ctx.arc(tipX, tipY, r * 0.36, 0, 6.283185); ctx.fill()
   }
  }
 }
}

/* ---------- the flowers that are actually calls ---------- */
export type Bloom = { moment: Moment; person: Person; x: number; y: number; scale: number; kind: FlowerKind; spin: number }

/** One flower per call, grouped into the person's own drift of the field. */
export function placeBlooms(people: Person[], calls: Moment[], w: number, fieldTop: number, horizon: number): Bloom[] {
 const out: Bloom[] = []
 const top = horizon + 54, bottom = fieldTop + 52
 people.forEach((person, pi) => {
  const mine = calls.filter(c => c.person === person.id).slice().sort((a, b) => a.at.localeCompare(b.at))
  /* Each person keeps a lane of the meadow, so their patch stays theirs as calls accumulate. */
  const lane = people.length === 1 ? 0.5 : 0.12 + (pi / Math.max(people.length - 1, 1)) * 0.76
  mine.forEach((moment, i) => {
   const r1 = hash(pi * 400 + i, 3100), r2 = hash(pi * 400 + i, 3200), r3 = hash(pi * 400 + i, 3300)
   const depth = (i % 5) / 4
   const y = top + (bottom - top) * (0.18 + depth * 0.78 + (r2 - 0.5) * 0.12)
   const spread = 0.055 + Math.min(mine.length, 14) * 0.0055
   const x = w * (lane + (r1 - 0.5) * spread * 2) + Math.sin(i * 2.4) * 6
   const near = (y - top) / Math.max(bottom - top, 1)
   out.push({
    moment, person, x, y,
    scale: (0.5 + near * 0.85) * (0.82 + Math.min((moment.minutes ?? 8), 45) / 90),
    kind: moment.flower ?? 'daisy', spin: r3 * 6.283,
   })
  })
 })
 return out.sort((a, b) => a.y - b.y)
}

export type Patch = { person: Person; x: number; y: number; count: number; dominant: FlowerKind }

/** The centre of each person's drift of the field, and the flower they grow most of,
    so the meadow can name a patch when you are too far out to read single flowers. */
export function placePatches(people: Person[], blooms: Bloom[]): Patch[] {
 return people.map(person => {
  const mine = blooms.filter(b => b.person.id === person.id)
  const tally = new Map<FlowerKind, number>()
  for (const b of mine) tally.set(b.kind, (tally.get(b.kind) ?? 0) + 1)
  let dominant: FlowerKind = 'daisy', top = 0
  for (const [kind, n] of tally) if (n > top) { top = n; dominant = kind }
  return {
   person, count: mine.length, dominant,
   x: mine.reduce((sum, b) => sum + b.x, 0) / Math.max(mine.length, 1),
   y: mine.reduce((sum, b) => sum + b.y, 0) / Math.max(mine.length, 1),
  }
 }).filter(patch => patch.count > 0)
}

/** A call flower, drawn upright on a stem that bends with everything else. */
export function paintBloom(ctx: CanvasRenderingContext2D, bloom: Bloom, t: number, strength: number, lift: number) {
 const f = flowerSpec(bloom.kind)
 const size = bloom.scale * 15 * (1 + lift * 0.5)
 const stem = size * 2.1
 const bend = windAt(bloom.x, bloom.y, t, strength) * 1.5
 const hx = bloom.x + bend, hy = bloom.y - stem

 ctx.strokeStyle = '#5F9457'
 ctx.lineWidth = Math.max(1.3, size * 0.17)
 ctx.lineCap = 'round'
 ctx.beginPath()
 ctx.moveTo(bloom.x, bloom.y)
 ctx.quadraticCurveTo(bloom.x + bend * 0.3, bloom.y - stem * 0.55, hx, hy)
 ctx.stroke()

 ctx.fillStyle = '#6FA765'
 ctx.beginPath()
 ctx.ellipse(bloom.x + bend * 0.28 - size * 0.42, bloom.y - stem * 0.5, size * 0.44, size * 0.2, -0.5 + bend * 0.02, 0, 6.283185)
 ctx.fill()

 const petals = f.petals
 for (let i = 0; i < petals; i++) {
  const a = (i / petals) * 6.283185 + bloom.spin + bend * 0.012
  ctx.fillStyle = i % 2 ? f.petal : f.petalDeep
  ctx.beginPath()
  ctx.ellipse(hx + Math.cos(a) * size * 0.5, hy + Math.sin(a) * size * 0.5, size * 0.4, size * 0.29, a, 0, 6.283185)
  ctx.fill()
 }
 ctx.fillStyle = f.heart
 ctx.beginPath(); ctx.arc(hx, hy, size * 0.27, 0, 6.283185); ctx.fill()
 return { hx, hy, r: size * 1.1 }
}

/* ---------- weather you can see ---------- */
export function paintWeather(ctx: CanvasRenderingContext2D, scene: Scene, weather: Weather, t: number) {
 const { w, h } = scene
 if (weather === 'clear' || weather === 'bright') {
  /* Light shafts, barely there, drifting off the sun. */
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const sx = w * 0.63, sy = h * PALETTES[weather].sunY
  ctx.beginPath(); ctx.rect(0, 0, w, h * 0.27); ctx.clip()
  for (let i = 0; i < 2; i++) {
   const a = 2.05 + i * 0.5 + Math.sin(t * 0.00016 + i * 2) * 0.07
   const grad = ctx.createLinearGradient(sx, sy, sx + Math.cos(a) * 320, sy + Math.sin(a) * 320)
   grad.addColorStop(0, 'rgba(255,242,206,.055)'); grad.addColorStop(1, 'rgba(255,242,206,0)')
   ctx.fillStyle = grad
   ctx.beginPath(); ctx.moveTo(sx, sy)
   ctx.lineTo(sx + Math.cos(a - 0.16) * 360, sy + Math.sin(a - 0.16) * 360)
   ctx.lineTo(sx + Math.cos(a + 0.16) * 360, sy + Math.sin(a + 0.16) * 360)
   ctx.closePath(); ctx.fill()
  }
  ctx.restore()
  return
 }
 if (weather === 'cloudy') {
  ctx.save()
  ctx.fillStyle = 'rgba(226,232,230,.2)'
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
  return
 }
 /* Rain and storm: streaks on two speeds, so it reads as depth rather than a texture. */
 const heavy = weather === 'storm'
 const drops = heavy ? 150 : 80
 ctx.save()
 ctx.strokeStyle = heavy ? 'rgba(226,238,244,.55)' : 'rgba(226,238,244,.42)'
 ctx.lineWidth = heavy ? 1.5 : 1.1
 ctx.lineCap = 'round'
 for (let i = 0; i < drops; i++) {
  const speed = heavy ? 1.35 : 0.85
  const len = (heavy ? 26 : 17) * (0.6 + hash(i, 4100) * 0.9)
  const x = (hash(i, 4200) * (w + 120) + t * 0.035 * (heavy ? 1.6 : 1)) % (w + 120) - 60
  const y = (hash(i, 4300) * h + t * speed * 0.42) % (h + 60) - 30
  ctx.globalAlpha = 0.35 + hash(i, 4400) * 0.5
  ctx.beginPath()
  ctx.moveTo(x, y); ctx.lineTo(x - len * 0.22, y + len)
  ctx.stroke()
 }
 ctx.restore()
 if (heavy) {
  /* A flash, rarely, and never twice in a row. */
  const beat = Math.sin(t * 0.00052) * Math.sin(t * 0.00017)
  if (beat > 0.986) {
   ctx.save()
   ctx.fillStyle = `rgba(255,255,255,${((beat - 0.986) / 0.014 * 0.32).toFixed(3)})`
   ctx.fillRect(0, 0, w, h)
   ctx.restore()
  }
 }
}
