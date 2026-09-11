'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Maximize2, Minus, Plus } from 'lucide-react'
import { buildField, buildSections, clampZoom, FIELD_H, FIELD_W, heightAt, lensFor, overviewZoom, project, tiltFor, TILT_FROM, TILT_TO, type Camera, type Cell, type Lens, type Section } from '@/lib/harbor/field'

const paint = {
 vegLight: '#AFC95A', vegMid: '#8AB144', vegDeep: '#4F7C30',
 water: '#92CFEA', waterDeep: '#5FB2DB',
 rock: '#3B3D39', built: '#4A4C46',
 tilled: '#7C5B3D', bare: '#A8A99F',
}
const mix = (a: string, b: string, t: number) => {
 const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)]
 const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)]
 return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`
}

export function FieldTest({ navigate }: { navigate: (page: string) => void }) {
 const wrap = useRef<HTMLDivElement>(null)
 const canvas = useRef<HTMLCanvasElement>(null)
 const cells = useMemo(() => buildField(), [])
 const sections = useMemo(() => buildSections(['Mom', 'Dad', 'Aanya', 'Nani']), [])
 const view = useRef({ w: 0, h: 0, dpr: 1, base: 0.2 })
 const cam = useRef<Camera>({ x: FIELD_W / 2, y: FIELD_H / 2, zoom: 0.2 })
 const goal = useRef<Camera>({ ...cam.current })
 const drag = useRef<{ x: number; y: number; moved: number } | null>(null)
 const pointers = useRef(new Map<number, { x: number; y: number }>())
 const pinch = useRef<{ dist: number; zoom: number } | null>(null)
 const ready = useRef(false)
 const [hud, setHud] = useState({ rel: 1, tilt: 0 })

 const overview = useCallback(() => { goal.current = { x: FIELD_W / 2, y: FIELD_H / 2, zoom: view.current.base } }, [])
 const focus = useCallback((section: Section) => {
  goal.current = { x: section.x, y: section.y, zoom: view.current.base * 5.4 }
 }, [])

 useEffect(() => {
  const host = wrap.current, surface = canvas.current
  if (!host || !surface) return
  const observer = new ResizeObserver(([entry]) => {
   const dpr = Math.min(window.devicePixelRatio || 1, 2)
   const w = entry.contentRect.width, h = entry.contentRect.height
   const base = overviewZoom(w, h)
   view.current = { w, h, dpr, base }
   surface.width = Math.round(w * dpr); surface.height = Math.round(h * dpr)
   if (!ready.current && w && h) { ready.current = true; cam.current = { x: FIELD_W / 2, y: FIELD_H / 2, zoom: base }; goal.current = { ...cam.current } }
  })
  observer.observe(host)
  return () => observer.disconnect()
 }, [])

 useEffect(() => {
  const surface = canvas.current; if (!surface) return
  const ctx = surface.getContext('2d'); if (!ctx) return
  let frame = 0, lastHud = 0

  const render = () => {
   frame = requestAnimationFrame(render)
   const { w, h, dpr, base } = view.current
   if (!w || !h) return

   const c = cam.current, g = goal.current
   c.x += (g.x - c.x) * 0.13; c.y += (g.y - c.y) * 0.13; c.zoom += (g.zoom - c.zoom) * 0.13
   const lens = lensFor(c, w, h, base)

   ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
   ctx.clearRect(0, 0, w, h)

   for (const cell of cells) {
    const p = project(cell.x, cell.y, cell.z, lens)
    if (p.sx < -24 || p.sx > w + 24 || p.sy < -24 || p.sy > h + 24) continue
    let r = cell.size * 4.4 * p.scale
    /* Pulled right back the field would dissolve into nothing, so every mark keeps a floor. */
    if (cell.kind !== 'bare' && r < 0.85) r = 0.85
    if (r < 0.14) continue
    drawCell(ctx, cell, p.sx, p.sy, r)
   }
   for (const section of sections) drawSection(ctx, section, lens)

   if (performance.now() - lastHud > 110) { lastHud = performance.now(); setHud({ rel: c.zoom / base, tilt: lens.tilt }) }
  }
  frame = requestAnimationFrame(render)
  return () => cancelAnimationFrame(frame)
 }, [cells, sections])

 useEffect(() => {
  const surface = canvas.current; if (!surface) return
  const onWheel = (event: WheelEvent) => {
   event.preventDefault()
   const { w, h, base } = view.current
   const c = goal.current
   const tilt = tiltFor(c.zoom, base)
   const next = clampZoom(c.zoom * (event.deltaY < 0 ? 1.12 : 1 / 1.12), base)
   if (tilt < 0.5) {
    /* While it is still a plan it behaves like a map: the point under the cursor stays put. */
    const rect = surface.getBoundingClientRect()
    const px = event.clientX - rect.left, py = event.clientY - rect.top
    const wx = c.x + (px - w / 2) / c.zoom, wy = c.y + (py - h / 2) / c.zoom
    c.x = wx - (px - w / 2) / next; c.y = wy - (py - h / 2) / next
   }
   c.zoom = next
  }
  surface.addEventListener('wheel', onWheel, { passive: false })
  return () => surface.removeEventListener('wheel', onWheel)
 }, [])

 const local = (event: React.PointerEvent) => { const rect = canvas.current!.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top } }
 const onDown = (event: React.PointerEvent) => {
  const point = local(event); pointers.current.set(event.pointerId, point)
  ;(event.currentTarget as HTMLCanvasElement).setPointerCapture(event.pointerId)
  if (pointers.current.size === 2) {
   const [a, b] = [...pointers.current.values()]
   pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: goal.current.zoom }
   drag.current = null
  } else drag.current = { ...point, moved: 0 }
 }
 const onMove = (event: React.PointerEvent) => {
  if (!pointers.current.has(event.pointerId)) return
  const point = local(event); pointers.current.set(event.pointerId, point)
  if (pinch.current && pointers.current.size >= 2) {
   const [a, b] = [...pointers.current.values()]
   goal.current.zoom = clampZoom(pinch.current.zoom * ((Math.hypot(a.x - b.x, a.y - b.y) || 1) / pinch.current.dist), view.current.base)
   return
  }
  const start = drag.current; if (!start) return
  const dx = point.x - start.x, dy = point.y - start.y
  start.moved += Math.hypot(dx, dy); start.x = point.x; start.y = point.y
  const tilt = tiltFor(goal.current.zoom, view.current.base)
  goal.current.x -= dx / goal.current.zoom
  /* Depth is compressed once tilted, so the same drag has to cover more ground. */
  goal.current.y -= (dy / goal.current.zoom) * (1 + tilt * 2.4)
 }
 const onUp = (event: React.PointerEvent) => {
  const start = drag.current
  const point = pointers.current.get(event.pointerId)
  pointers.current.delete(event.pointerId)
  if (pointers.current.size < 2) pinch.current = null
  if (start && point && start.moved < 6) {
   const { w, h, base } = view.current
   const lens = lensFor(cam.current, w, h, base)
   let best: Section | null = null, bestDist = 74
   for (const section of sections) {
    const p = project(section.x, section.y, heightAt(section.x, section.y), lens)
    const d = Math.hypot(p.sx - point.x, p.sy - point.y)
    if (d < bestDist) { bestDist = d; best = section }
   }
   if (best) focus(best)
  }
  if (!pointers.current.size) drag.current = null
 }

 const stage = hud.tilt < 0.02 ? 'plan' : hud.tilt > 0.98 ? 'landscape' : 'tipping'

 return <div className="entrance">
  <div className="page-intro"><div className="eyebrow mb-2">Prototype</div><h1>The field.</h1><p>A flat plan when you pull back. Zoom past the line and the camera tips over into the landscape. Dots stand in for flowers until you are close enough for them to open.</p></div>
  <div className="field-holder">
   <div ref={wrap} className="field-frame">
    <canvas ref={canvas} className="field-canvas" style={{ width: '100%', height: '100%' }}
     onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}/>
    <div className="field-controls">
     <button type="button" className="garden-control" aria-label="Zoom in" onClick={() => { goal.current.zoom = clampZoom(goal.current.zoom * 1.45, view.current.base) }}><Plus/></button>
     <button type="button" className="garden-control" aria-label="Zoom out" onClick={() => { goal.current.zoom = clampZoom(goal.current.zoom / 1.45, view.current.base) }}><Minus/></button>
     <button type="button" className="garden-control" aria-label="Fit the whole field" onClick={overview}><Maximize2/></button>
    </div>
    <div className="field-readout">
     <span>{hud.rel.toFixed(1)}×</span>
     <span className="field-meter"><i style={{ width: `${hud.tilt * 100}%` }}/></span>
     <span>{stage}</span>
    </div>
   </div>
  </div>
  <div className="page-content flow">
   <div className="field-jumps">
    {sections.map(section => <button key={section.id} type="button" className="field-jump" onClick={() => focus(section)}>{section.name}</button>)}
    <button type="button" className="field-jump" onClick={overview}>Pull back</button>
   </div>
   <p className="small-copy">The tilt ramps between {TILT_FROM}× and {TILT_TO}× the fit-everything zoom, so it behaves the same on any screen. Drag to move, scroll or pinch to zoom, tap a patch to fly into it.</p>
   <button className="text-link" onClick={() => navigate('home')}>Back to Harbor</button>
  </div>
 </div>
}

function drawCell(ctx: CanvasRenderingContext2D, cell: Cell, x: number, y: number, r: number) {
 if (cell.kind === 'tilled') {
  ctx.strokeStyle = paint.tilled; ctx.lineWidth = Math.max(0.55, r * 0.32); ctx.globalAlpha = 0.8
  const a = r * 1.1
  ctx.beginPath(); ctx.moveTo(x - a, y - a); ctx.lineTo(x + a, y + a); ctx.moveTo(x + a, y - a); ctx.lineTo(x - a, y + a); ctx.stroke()
  ctx.globalAlpha = 1
  return
 }
 if (cell.kind === 'rock' || cell.kind === 'built') {
  ctx.fillStyle = cell.kind === 'rock' ? paint.rock : paint.built
  ctx.globalAlpha = cell.kind === 'rock' ? 0.88 : 1
  const s = r * 1.5
  ctx.fillRect(x - s / 2, y - s / 2, s, s)
  ctx.globalAlpha = 1
  return
 }
 if (cell.kind === 'bare') {
  ctx.fillStyle = paint.bare; ctx.globalAlpha = 0.45
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1
  return
 }
 if (cell.kind === 'water') {
  ctx.fillStyle = mix(paint.water, paint.waterDeep, cell.tone); ctx.globalAlpha = 0.8
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1
  return
 }
 /* Higher ground runs darker, which is what separates hillside woods from meadow. */
 const shade = Math.min(1, cell.z * 0.9 + cell.tone * 0.3)
 const green = shade < 0.5 ? mix(paint.vegLight, paint.vegMid, shade * 2) : mix(paint.vegMid, paint.vegDeep, (shade - 0.5) * 2)
 ctx.fillStyle = green
 ctx.globalAlpha = 0.88
 if (r > 11) {
  /* Close enough in, a dot stops being a dot — this is where a real flower takes over. */
  const petals = 6
  for (let i = 0; i < petals; i++) {
   const angle = (i / petals) * Math.PI * 2 + cell.tone * 4
   ctx.beginPath(); ctx.ellipse(x + Math.cos(angle) * r * 0.52, y + Math.sin(angle) * r * 0.52, r * 0.42, r * 0.3, angle, 0, Math.PI * 2); ctx.fill()
  }
  ctx.fillStyle = '#EFBB3C'
  ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, Math.PI * 2); ctx.fill()
 } else {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
 }
 ctx.globalAlpha = 1
}

function drawSection(ctx: CanvasRenderingContext2D, section: Section, lens: Lens) {
 const points = section.ring.map(([x, y]) => project(x, y, heightAt(x, y), lens))
 if (points.every(p => p.sx < -90 || p.sx > lens.w + 90 || p.sy < -90 || p.sy > lens.h + 90)) return
 ctx.save()
 ctx.setLineDash([5, 6]); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(51,85,61,0.4)'
 ctx.beginPath()
 points.forEach((p, i) => {
  const next = points[(i + 1) % points.length]
  if (!i) ctx.moveTo(p.sx, p.sy)
  ctx.quadraticCurveTo(p.sx, p.sy, (p.sx + next.sx) / 2, (p.sy + next.sy) / 2)
 })
 ctx.closePath(); ctx.stroke()
 ctx.restore()

 const centre = project(section.x, section.y, heightAt(section.x, section.y), lens)
 if (centre.sx < -60 || centre.sx > lens.w + 60 || centre.sy < -30 || centre.sy > lens.h + 40) return
 const label = section.name.toUpperCase()
 ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace'
 const width = ctx.measureText(label).width + 20
 const top = centre.sy - 34
 ctx.fillStyle = '#7C5B3D'
 ctx.beginPath(); ctx.roundRect(centre.sx - width / 2, top, width, 20, 4); ctx.fill()
 ctx.beginPath(); ctx.moveTo(centre.sx - 5, top + 20); ctx.lineTo(centre.sx + 5, top + 20); ctx.lineTo(centre.sx, top + 27); ctx.closePath(); ctx.fill()
 ctx.fillStyle = '#FBF1DE'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
 ctx.fillText(label, centre.sx, top + 11)
 ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic'
}
