'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Crosshair, Plus, SlidersHorizontal, Sprout, Sun } from 'lucide-react'
import { useHarbor } from '@/lib/harbor/store'
import { callsFor, flowerSpec, weatherIndex, weathers, type Moment, type Weather } from '@/lib/harbor/model'
import {
 buildCells, buildLens, buildPatches, clampZoom, drawFlower, FIELD_H, FIELD_W, HORIZON,
 heightAt, MAX_REL, overviewZoom, PAINT, placeBlooms, project, tiltFor, WATER_FROM, WILD_FROM,
 type Bloom, type Camera, type Patch, type Point,
} from '@/lib/harbor/meadow'

type Hit = { x: number; y: number; r: number; bloom: Bloom }

/** How much the sky is washed out by a heavy week. Clear leaves it alone. */
function skyFilter(weather: Weather) {
 const mood = weatherIndex(weather)
 return mood === 0 ? 'none' : `saturate(${(1 - mood * 0.105).toFixed(2)}) brightness(${(1 - mood * 0.03).toFixed(2)})`
}

export function Garden({ weather, bloomId, height = 300, onAddPerson, onOpenBloom }: {
 weather: Weather; bloomId?: string; height?: number
 onAddPerson: () => void; onOpenBloom: (bloom: Bloom) => void
}) {
 const { state } = useHarbor()
 const holder = useRef<HTMLDivElement>(null)
 const canvas = useRef<HTMLCanvasElement>(null)
 const skyRef = useRef<HTMLDivElement>(null)
 const [chip, setChip] = useState('')

 const calls = useMemo(() => state ? state.people.flatMap(p => callsFor(state, p.id)) : [], [state])
 const patches = useMemo(() => state ? buildPatches(state.people, calls) : [], [state?.people, calls])
 const blooms = useMemo(() => placeBlooms(patches, calls), [patches, calls])

 /* Everything the frame loop touches lives in refs — it runs sixty times a second and must not re-render. */
 const scene = useRef<{ patches: Patch[]; blooms: Bloom[]; cells: ReturnType<typeof buildCells>; bloomId?: string }>({ patches: [], blooms: [], cells: [], bloomId: undefined })
 const view = useRef({ w: 0, h: 0, dpr: 1, base: 0.2 })
 const cam = useRef<Camera>({ x: FIELD_W / 2, y: FIELD_H / 2, zoom: 0.2 })
 const goal = useRef<Camera>({ ...cam.current })
 const hits = useRef<Hit[]>([])
 const started = useRef(false)
 const tour = useRef(0)

 useEffect(() => { scene.current = { patches, blooms, cells: buildCells(patches), bloomId } }, [patches, blooms, bloomId])

 /* A new flower deserves to be looked at: walk the camera to the patch it landed in. */
 useEffect(() => {
  if (!bloomId) return
  const found = blooms.find(b => b.id === bloomId)
  if (found) goal.current = { x: found.x, y: found.y, zoom: view.current.base * 13 }
 }, [bloomId, blooms])

 const focus = useCallback((patch: Patch) => { goal.current = { x: patch.x, y: patch.y, zoom: view.current.base * 11 } }, [])

 useEffect(() => {
  const box = holder.current, node = canvas.current
  if (!box || !node) return
  const ctx = node.getContext('2d')
  if (!ctx) return

  const observer = new ResizeObserver(entries => {
   const rect = entries[0].contentRect
   const dpr = Math.min(window.devicePixelRatio || 1, 2)
   view.current = { w: rect.width, h: rect.height, dpr, base: overviewZoom(rect.width, rect.height) }
   node.width = Math.round(rect.width * dpr); node.height = Math.round(rect.height * dpr)
   if (!started.current && rect.width) {
    started.current = true
    const first = scene.current.patches[0]
    cam.current = { x: first?.x ?? FIELD_W / 2, y: first?.y ?? FIELD_H / 2, zoom: view.current.base * 7 }
    goal.current = { ...cam.current }
   }
  })
  observer.observe(box)

  const p: Point = { x: 0, y: 0, s: 1 }
  const buckets: number[][] = PAINT.map(() => [])
  let frame = 0

  const drawDistance = (w: number, h: number, tilt: number) => {
   const horizon = h * HORIZON
   ctx.save(); ctx.globalAlpha = tilt
   const bands = [
    { col: '191,215,166', amp: 18, off: 4, freq: 1.5 },
    { col: '169,202,142', amp: 13, off: 13, freq: 2.3 },
    { col: '147,188,122', amp: 9, off: 22, freq: 3.4 },
   ]
   for (const band of bands) {
    /* Each band runs to the bottom of the card and fades out, so it meets the dots without a seam. */
    const top = horizon + band.off - band.amp
    const grad = ctx.createLinearGradient(0, top, 0, top + 128)
    grad.addColorStop(0, `rgb(${band.col})`); grad.addColorStop(0.55, `rgba(${band.col},.55)`); grad.addColorStop(1, `rgba(${band.col},0)`)
    ctx.fillStyle = grad
    ctx.beginPath(); ctx.moveTo(-10, horizon + band.off + band.amp)
    for (let x = -10; x <= w + 10; x += 12) {
     const t = (x / w) * band.freq + cam.current.x * 0.0006
     ctx.lineTo(x, horizon + band.off - Math.sin(t * 3.1) * band.amp * 0.6 - Math.sin(t * 1.3 + 1.4) * band.amp * 0.5)
    }
    ctx.lineTo(w + 10, h + 10); ctx.lineTo(-10, h + 10); ctx.closePath(); ctx.fill()
   }
   ctx.fillStyle = '#82B06D'
   for (let i = 0; i < 7; i++) {
    const tx = ((i * 137 + cam.current.x * 0.02) % (w + 120)) - 60
    const ty = horizon + 10 + (i % 3) * 5
    const rr = 14 + (i % 4) * 5
    ctx.beginPath(); ctx.arc(tx, ty, rr, 0, 6.283185); ctx.arc(tx + rr * 0.8, ty + 3, rr * 0.72, 0, 6.283185); ctx.arc(tx - rr * 0.8, ty + 4, rr * 0.66, 0, 6.283185); ctx.fill()
   }
   ctx.restore()
  }
  /* Distance goes pale before it disappears, which is what keeps the far rows from reading as a wall. */
  const drawHaze = (w: number, h: number, tilt: number) => {
   const horizon = h * HORIZON
   const grad = ctx.createLinearGradient(0, horizon - 30, 0, horizon + 84)
   grad.addColorStop(0, 'rgba(232,241,226,0)')
   grad.addColorStop(0.26, `rgba(232,241,226,${(0.6 * tilt).toFixed(3)})`)
   grad.addColorStop(1, 'rgba(232,241,226,0)')
   ctx.fillStyle = grad; ctx.fillRect(0, horizon - 30, w, 116)
  }

  const drawTags = (w: number, lens: ReturnType<typeof buildLens>) => {
   ctx.font = "600 12px var(--font-round), ui-rounded, sans-serif"
   const tags: { text: string; wide: number; x: number; y: number; stem: number; kind: Patch['dominant'] }[] = []
   for (const patch of scene.current.patches) {
    const o: Point = { x: 0, y: 0, s: 1 }
    project(patch.x, patch.y, heightAt(patch.x, patch.y), cam.current, lens, view.current.w, view.current.h, o)
    if (o.x < -50 || o.x > w + 50 || o.y < -20 || o.y > view.current.h + 40) continue
    const text = `${patch.name} · ${patch.count}`
    const wide = ctx.measureText(text).width + 40
    /* Hold the pill inside the card, and out from under the tool column when it rides that high. */
    const right = (o.y - 36) < 196 ? w - 76 : w - 10
    const x = Math.min(Math.max(o.x, wide / 2 + 10), right - wide / 2)
    if (x < wide / 2 + 10) continue
    tags.push({ text, wide, x, y: o.y, stem: o.y, kind: patch.dominant })
   }
   tags.sort((a, b) => a.y - b.y)
   for (let i = 1; i < tags.length; i++) for (let j = 0; j < i; j++) {
    if (Math.abs(tags[i].x - tags[j].x) < (tags[i].wide + tags[j].wide) / 2 && Math.abs(tags[i].y - tags[j].y) < 30) tags[i].y = tags[j].y + 30
   }
   for (const tag of tags) {
    const top = tag.y - 36
    ctx.fillStyle = 'rgba(255,253,248,.95)'
    ctx.beginPath(); ctx.roundRect(tag.x - tag.wide / 2, top, tag.wide, 24, 12); ctx.fill()
    if (Math.abs(tag.y - tag.stem) < 2) { ctx.beginPath(); ctx.moveTo(tag.x - 5, top + 24); ctx.lineTo(tag.x + 5, top + 24); ctx.lineTo(tag.x, top + 30); ctx.closePath(); ctx.fill() }
    drawFlower(ctx, tag.kind, tag.x - tag.wide / 2 + 14, top + 12, 8, 0.4)
    ctx.fillStyle = '#2F6B43'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(tag.text, tag.x + 10, top + 13)
    ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic'
   }
  }

  const render = () => {
   frame = requestAnimationFrame(render)
   const { w, h, dpr, base } = view.current
   if (!w || !h) return
   cam.current.x += (goal.current.x - cam.current.x) * 0.12
   cam.current.y += (goal.current.y - cam.current.y) * 0.12
   cam.current.zoom += (goal.current.zoom - cam.current.zoom) * 0.12
   const lens = buildLens(cam.current, w, h, base)
   if (skyRef.current) skyRef.current.style.opacity = (0.25 + lens.tilt * 0.75).toFixed(3)

   ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
   ctx.clearRect(0, 0, w, h)
   for (const b of buckets) b.length = 0
   if (lens.tilt > 0.02) drawDistance(w, h, lens.tilt)

   const cells = scene.current.cells
   for (let i = 0; i < cells.length; i++) {
    const c = cells[i]
    project(c.x, c.y, c.z, cam.current, lens, w, h, p)
    if (p.x < -26 || p.x > w + 26 || p.y < -26 || p.y > h + 26) continue
    let r = c.size * 3.3 * p.s
    if (r < 0.1) continue
    if (r < 0.8) r = 0.8
    buckets[c.paint].push(p.x, p.y, r)
   }
   /* One fill per colour rather than one per dot — the difference between 12fps and 58. */
   for (let b = 0; b < buckets.length; b++) {
    const list = buckets[b]
    if (!list.length) continue
    ctx.fillStyle = PAINT[b]
    ctx.globalAlpha = b >= WILD_FROM && b < WATER_FROM ? 0.96 : 0.9
    ctx.beginPath()
    for (let i = 0; i < list.length; i += 3) { ctx.moveTo(list[i] + list[i + 2], list[i + 1]); ctx.arc(list[i], list[i + 1], list[i + 2], 0, 6.283185) }
    ctx.fill()
   }
   ctx.globalAlpha = 1
   if (lens.tilt > 0.02) drawHaze(w, h, lens.tilt)

   hits.current.length = 0
   for (const bloom of scene.current.blooms) {
    project(bloom.x, bloom.y, bloom.z, cam.current, lens, w, h, p)
    if (p.x < -40 || p.x > w + 40 || p.y < -40 || p.y > h + 40) continue
    const fresh = scene.current.bloomId === bloom.id
    const r = bloom.size * 6.2 * p.s * (fresh ? 1.35 : 1)
    if (r < 0.35) continue
    if (r > 4.4) { drawFlower(ctx, bloom.kind, p.x, p.y, r, bloom.spin); hits.current.push({ x: p.x, y: p.y, r, bloom }) }
    else {
     const f = flowerSpec(bloom.kind)
     ctx.fillStyle = f.petal === '#FFFFFF' ? f.petalDeep : f.petal
     ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(r, 1.7), 0, 6.283185); ctx.fill()
     if (r > 2.2) hits.current.push({ x: p.x, y: p.y, r, bloom })
    }
    if (fresh) { ctx.strokeStyle = 'rgba(255,253,248,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.9, 0, 6.283185); ctx.stroke() }
   }
   drawTags(w, lens)
  }
  frame = requestAnimationFrame(render)
  return () => { cancelAnimationFrame(frame); observer.disconnect() }
 }, [])

 /* ---------- drag, pinch, wheel, tap ---------- */
 const pointers = useRef(new Map<number, { x: number; y: number }>())
 const drag = useRef<{ x: number; y: number; moved: number } | null>(null)
 const pinch = useRef<{ gap: number; zoom: number } | null>(null)
 const local = (e: React.PointerEvent) => { const r = canvas.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }

 const down = (e: React.PointerEvent) => {
  canvas.current?.setPointerCapture(e.pointerId)
  const pt = local(e)
  pointers.current.set(e.pointerId, pt)
  if (pointers.current.size === 2) {
   const [a, b] = [...pointers.current.values()]
   pinch.current = { gap: Math.hypot(a.x - b.x, a.y - b.y), zoom: goal.current.zoom }
   drag.current = null
  } else drag.current = { ...pt, moved: 0 }
 }
 const move = (e: React.PointerEvent) => {
  if (!pointers.current.has(e.pointerId)) return
  const pt = local(e)
  pointers.current.set(e.pointerId, pt)
  if (pinch.current && pointers.current.size === 2) {
   const [a, b] = [...pointers.current.values()]
   const gap = Math.hypot(a.x - b.x, a.y - b.y)
   goal.current.zoom = clampZoom(pinch.current.zoom * (gap / Math.max(pinch.current.gap, 1)), view.current.base)
   return
  }
  if (!drag.current) return
  const dx = pt.x - drag.current.x, dy = pt.y - drag.current.y
  drag.current.moved += Math.hypot(dx, dy); drag.current.x = pt.x; drag.current.y = pt.y
  goal.current.x -= dx / goal.current.zoom
  /* Once tilted, a pixel of drag covers much more ground going away from you than across. */
  goal.current.y -= (dy / goal.current.zoom) * (1 + tiltFor(goal.current.zoom, view.current.base) * 2.4)
 }
 const up = (e: React.PointerEvent) => {
  const pt = pointers.current.get(e.pointerId)
  const started = drag.current
  pointers.current.delete(e.pointerId)
  if (pointers.current.size < 2) pinch.current = null
  drag.current = null
  if (!started || !pt || started.moved >= 6) return
  let found: Bloom | null = null, best = Infinity
  for (const hit of hits.current) {
   const d = Math.hypot(hit.x - pt.x, hit.y - pt.y)
   if (d < Math.max(15, hit.r * 1.5) && d < best) { best = d; found = hit.bloom }
  }
  if (found) { onOpenBloom(found); return }
  const lens = buildLens(cam.current, view.current.w, view.current.h, view.current.base)
  let near: Patch | null = null, gap = 78
  for (const patch of scene.current.patches) {
   const o: Point = { x: 0, y: 0, s: 1 }
   project(patch.x, patch.y, heightAt(patch.x, patch.y), cam.current, lens, view.current.w, view.current.h, o)
   const d = Math.hypot(o.x - pt.x, o.y - pt.y)
   if (d < gap) { gap = d; near = patch }
  }
  if (near) focus(near)
 }
 const wheel = (e: React.WheelEvent) => { goal.current.zoom = clampZoom(goal.current.zoom * (e.deltaY < 0 ? 1.16 : 1 / 1.16), view.current.base) }

 if (!state) return null
 const total = calls.length
 const mood = weathers[weatherIndex(weather)]

 return <div ref={holder} className="garden" style={{ height }}>
  <div ref={skyRef} className="garden-sky" style={{ filter: skyFilter(weather) }} aria-hidden="true">
   <span className="garden-sun"/><span className="garden-cloud"/><span className="garden-cloud"/>
  </div>
  <canvas ref={canvas} className="garden-canvas" aria-label={`Your garden — ${total} ${total === 1 ? 'flower' : 'flowers'} across ${patches.length} ${patches.length === 1 ? 'patch' : 'patches'}. Drag to look around, pinch to come closer.`} role="img"
   onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={wheel}/>

  <div className="garden-tools">
   <button type="button" className="garden-tool" aria-label="Add someone to the garden" onClick={onAddPerson}><Plus/></button>
   <button type="button" className="garden-tool" aria-label="See the whole garden"
    onClick={() => { goal.current = { x: FIELD_W / 2, y: FIELD_H / 2, zoom: view.current.base }; setChip('') }}><SlidersHorizontal/></button>
   <button type="button" className="garden-tool" aria-label="Visit the next patch"
    onClick={() => { const list = scene.current.patches; if (!list.length) return; const next = list[tour.current++ % list.length]; focus(next); setChip(`${next.name} · ${next.count} ${next.count === 1 ? 'flower' : 'flowers'}`) }}><Crosshair/></button>
  </div>

  <div className="garden-chips">
   <button type="button" className="chip" onClick={() => { goal.current = { x: FIELD_W / 2, y: FIELD_H / 2, zoom: view.current.base * MAX_REL * 0.12 }; setChip('') }}>
    <Sprout/>{chip || (total ? `${total} ${total === 1 ? 'flower' : 'flowers'}` : 'No flowers yet')}
   </button>
   <span className="chip"><Sun/>{mood.label}</span>
  </div>
 </div>
}
