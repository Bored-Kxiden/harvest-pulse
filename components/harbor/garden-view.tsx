'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Maximize2, Minus, Plus, UserRoundPlus } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useHarbor } from '@/lib/harbor/store'
import { bloomScale, callsFor, dominantFlower, feelings, flowerSpec, formatDuration, type Moment, type Weather } from '@/lib/harbor/model'
import { blobPath, DETAIL_ZOOM, fitCamera, flowerSpot, focusCamera, GROUND_SQUASH, plotFor, rand, zoomAt, type Camera, type Plot } from '@/lib/harbor/garden'
import { FlowerGlyph, FlowerMark } from './flowers'
import { SkyWheel } from './sky-wheel'

const ground: Record<string, { top: string; inner: string; soil: string }> = {
 green: { top: '#B7D6AB', inner: '#C9E3BD', soil: '#8FAF85' },
 gold: { top: '#E4D091', inner: '#EEDFAC', soil: '#B7A268' },
 orange: { top: '#EBC194', inner: '#F4D3AE', soil: '#BE9264' },
 sky: { top: '#B8CBE1', inner: '#CCDBEB', soil: '#8FA4BC' },
}

export function GardenView({ weather, bloomId, onAddPerson, height = 340 }: { weather: Weather; bloomId?: string; onAddPerson?: () => void; height?: number }) {
 const { state } = useHarbor()
 const frame = useRef<HTMLDivElement>(null)
 const svgRef = useRef<SVGSVGElement>(null)
 const [size, setSize] = useState({ w: 0, h: 0 })
 const [camera, setCamera] = useState<Camera | null>(null)
 const [gliding, setGliding] = useState(false)
 const [open, setOpen] = useState<Moment | null>(null)
 const touched = useRef(false)
 const pointers = useRef(new Map<number, { x: number; y: number }>())
 const drag = useRef<{ x: number; y: number; moved: number; camera: Camera } | null>(null)
 const pinch = useRef<{ dist: number; cx: number; cy: number; camera: Camera } | null>(null)
 const glideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

 const people = state?.people ?? []
 const plots = useMemo(() => people.map((p, i) => plotFor(p.id, i)), [people])
 const nextCell = useMemo(() => plotFor('__add__', people.length), [people.length])

 useEffect(() => {
  const el = frame.current; if (!el) return
  const observer = new ResizeObserver(([entry]) => setSize({ w: Math.round(entry.contentRect.width), h: Math.round(entry.contentRect.height) }))
  observer.observe(el); return () => observer.disconnect()
 }, [])

 const glideTo = useCallback((next: Camera) => {
  setGliding(true); setCamera(next)
  clearTimeout(glideTimer.current); glideTimer.current = setTimeout(() => setGliding(false), 460)
 }, [])

 const framed = useMemo(() => onAddPerson ? [...plots, nextCell] : plots, [nextCell, onAddPerson, plots])
 const fit = useCallback(() => { if (size.w && size.h) { touched.current = false; glideTo(fitCamera(framed, size.w, size.h)) } }, [framed, glideTo, size.h, size.w])

 useEffect(() => { if (size.w && size.h && !touched.current) setCamera(fitCamera(framed, size.w, size.h)) }, [framed, size.h, size.w])
 useEffect(() => () => clearTimeout(glideTimer.current), [])

 useEffect(() => {
  const el = svgRef.current; if (!el) return
  const onWheel = (event: WheelEvent) => {
   event.preventDefault()
   setCamera(cam => { if (!cam) return cam; const rect = el.getBoundingClientRect(); touched.current = true; return zoomAt(cam, event.clientX - rect.left, event.clientY - rect.top, event.deltaY < 0 ? 1.14 : 1 / 1.14) })
  }
  el.addEventListener('wheel', onWheel, { passive: false })
  return () => el.removeEventListener('wheel', onWheel)
 }, [])

 if (!state || !camera) return <div ref={frame} className="garden-frame" data-weather={weather} style={{ height }}/>

 const detailed = camera.k >= DETAIL_ZOOM
 const local = (event: React.PointerEvent) => { const rect = svgRef.current!.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top } }

 const onPointerDown = (event: React.PointerEvent) => {
  const point = local(event); pointers.current.set(event.pointerId, point)
  ;(event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId)
  setGliding(false); touched.current = true
  if (pointers.current.size === 2) {
   const [a, b] = [...pointers.current.values()]
   pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, camera }
   drag.current = null
  } else if (pointers.current.size === 1) drag.current = { ...point, moved: 0, camera }
 }
 const onPointerMove = (event: React.PointerEvent) => {
  if (!pointers.current.has(event.pointerId)) return
  const point = local(event); pointers.current.set(event.pointerId, point)
  if (pinch.current && pointers.current.size >= 2) {
   const [a, b] = [...pointers.current.values()]
   const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
   setCamera(zoomAt(pinch.current.camera, pinch.current.cx, pinch.current.cy, dist / pinch.current.dist))
   return
  }
  const start = drag.current; if (!start) return
  const dx = point.x - start.x, dy = point.y - start.y
  start.moved = Math.max(start.moved, Math.hypot(dx, dy))
  setCamera({ ...start.camera, x: start.camera.x + dx, y: start.camera.y + dy })
 }
 const endPointer = (event: React.PointerEvent) => {
  pointers.current.delete(event.pointerId)
  if (pointers.current.size < 2) pinch.current = null
  if (!pointers.current.size) setTimeout(() => { drag.current = null }, 0)
 }
 const tapped = () => (drag.current?.moved ?? 0) < 7

 const openMoment = (moment: Moment) => { if (tapped()) setOpen(moment) }
 const focusPlot = (plot: Plot) => { if (tapped()) glideTo(focusCamera(plot, size.w, size.h)) }

 const sorted = [...plots].sort((a, b) => a.y - b.y)

 return <div ref={frame} className="garden-frame" data-weather={weather} style={{ height }}>
  <SkyWheel weather={weather} width={size.w} height={size.h}/>
  <svg ref={svgRef} className="garden-canvas" viewBox={`0 0 ${size.w || 1} ${size.h || 1}`} width={size.w || undefined} height={size.h || undefined}
   role="application" aria-label="Your garden. Drag to move, pinch or use the buttons to zoom."
   onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endPointer} onPointerCancel={endPointer}>
   <g className="garden-scene" data-gliding={gliding} transform={`translate(${camera.x} ${camera.y}) scale(${camera.k})`}>
    {sorted.map(plot => {
     const person = state.people.find(p => p.id === plot.id)!
     const paint = ground[person.tone] ?? ground.green
     const blob = blobPath(plot.seed, plot.radius)
     const calls = callsFor(state, plot.id).slice().sort((a, b) => a.at.localeCompare(b.at))
     const dominant = dominantFlower(state, plot.id)
     const placed = calls.map((moment, i) => ({ moment, spot: flowerSpot(plot.seed, i, plot.radius) })).sort((a, b) => a.spot.y - b.spot.y)
     return <g key={plot.id} className="garden-plot">
      <g transform={`translate(${plot.x} ${plot.y}) scale(1 ${GROUND_SQUASH})`}>
       <path d={blob} className="plot-shade" transform="translate(6 26)"/>
       <path d={blob} fill={paint.soil} transform="translate(0 13)"/>
       <path d={blob} fill={paint.top}/>
       <path d={blob} fill={paint.inner} transform="scale(0.72)" opacity={0.8}/>
       {Array.from({ length: 5 }, (_, i) => <circle key={i} r={1.6} fill={paint.soil} opacity={0.55}
        cx={(rand(plot.seed, i + 200) - 0.5) * plot.radius * 1.2} cy={(rand(plot.seed, i + 240) - 0.5) * plot.radius * 1.2}/>)}
      </g>

      {detailed
       ? placed.map(({ moment, spot }) => {
        const scale = bloomScale(moment.minutes) * 0.92
        return <g key={moment.id} className="garden-flower" transform={`translate(${plot.x + spot.x} ${plot.y + spot.y})`}
         role="button" tabIndex={0} aria-label={`${flowerSpec(moment.flower).name} — ${new Date(moment.at).toLocaleDateString('en', { month: 'long', day: 'numeric' })}, ${formatDuration(moment.minutes)} with ${person.name}`}
         onPointerUp={() => openMoment(moment)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(moment) } }}>
         <ellipse className="flower-ground-shadow" cx={0} cy={1} rx={6 * scale} ry={2.2 * scale}/>
         <FlowerMark kind={moment.flower!} size={scale} blooming={moment.id === bloomId}/>
         <circle cx={0} cy={-18 * scale} r={15 * scale} fill="transparent"/>
        </g>
       })
       : dominant
        ? <g className="garden-flower garden-summary" transform={`translate(${plot.x} ${plot.y})`} role="button" tabIndex={0}
         aria-label={`${person.name}: ${calls.length} calls, mostly ${flowerSpec(dominant).name}. Open this patch.`}
         onPointerUp={() => focusPlot(plot)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); glideTo(focusCamera(plot, size.w, size.h)) } }}>
         <ellipse className="flower-ground-shadow" cx={0} cy={2} rx={11} ry={4}/>
         <FlowerMark kind={dominant} size={1.65}/>
         <circle cx={0} cy={-26} r={22} fill="transparent"/>
        </g>
        : <g transform={`translate(${plot.x} ${plot.y})`}><path d="M0 0 C -1.6 -6, 1.6 -10, 0 -14" fill="none" stroke="#5C8A55" strokeWidth={1.6} strokeLinecap="round"/><path d="M0 -7 C -5 -10, -7 -5.5, -1.8 -4 Z" fill="#6B9A61"/></g>}
     </g>
    })}

    {/* Tags last, so a plot in front never buries the name of the one behind it. */}
    {sorted.map(plot => {
     const person = state.people.find(p => p.id === plot.id)!
     const count = callsFor(state, plot.id).length
     const tag = `${person.name} · ${count || 'no'} ${count === 1 ? 'call' : 'calls'}`
     return <g key={`tag-${plot.id}`} className="plot-tag" transform={`translate(${plot.x} ${plot.y + plot.radius * GROUND_SQUASH + 22})`}>
      <rect x={-(tag.length * 3.4 + 11)} y={-10} width={tag.length * 6.8 + 22} height={20} rx={10}/>
      <text x={0} y={4} textAnchor="middle">{tag}</text>
     </g>
    })}

    {onAddPerson && <g className="garden-flower plot-add" transform={`translate(${nextCell.x} ${nextCell.y})`} role="button" tabIndex={0} aria-label="Add someone to your garden"
     onPointerUp={() => { if (tapped()) onAddPerson() }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAddPerson() } }}>
     <g transform={`scale(1 ${GROUND_SQUASH})`}><path d={blobPath(nextCell.seed, nextCell.radius * 0.86)} className="plot-add-ground"/></g>
     <g className="plot-add-mark"><circle r={15}/><path d="M-6 0 H6 M0 -6 V6" strokeLinecap="round"/></g>
    </g>}
   </g>
  </svg>

  <div className="garden-weather" aria-hidden="true">
   <span className="wx-sun"/>
   <span className="wx-cloud wx-cloud-1"/><span className="wx-cloud wx-cloud-2"/><span className="wx-cloud wx-cloud-3"/>
   <span className="wx-rain">{Array.from({ length: 26 }, (_, i) => <i key={i} style={{ left: `${(i * 3.9 + (i % 5) * 1.7) % 100}%`, animationDelay: `${(i % 9) * 0.13}s`, animationDuration: `${0.62 + (i % 4) * 0.08}s` }}/>)}</span>
   <span className="wx-flash"/>
  </div>

  <div className="garden-controls">
   <button type="button" className="garden-control" aria-label="Zoom in" onClick={() => { touched.current = true; glideTo(zoomAt(camera, size.w / 2, size.h / 2, 1.35)) }}><Plus/></button>
   <button type="button" className="garden-control" aria-label="Zoom out" onClick={() => { touched.current = true; glideTo(zoomAt(camera, size.w / 2, size.h / 2, 1 / 1.35)) }}><Minus/></button>
   <button type="button" className="garden-control" aria-label="Fit the whole garden" onClick={fit}><Maximize2/></button>
   {onAddPerson && <button type="button" className="garden-control" aria-label="Add someone to your garden" onClick={onAddPerson}><UserRoundPlus/></button>}
  </div>
  <p className="garden-hint">{detailed ? 'Every flower is one call. Tap one to remember it.' : 'Each patch shows the flower it grows most. Zoom in for every call.'}</p>

  <Dialog open={!!open} onOpenChange={value => !value && setOpen(null)}>
   <DialogContent>
    {open && <>
     <DialogHeader>
      <DialogTitle>{new Date(open.at).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}</DialogTitle>
      <DialogDescription>{formatDuration(open.minutes)} with {state.people.find(p => p.id === open.person)?.name ?? 'family'} · {new Date(open.at).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}</DialogDescription>
     </DialogHeader>
     <div className="flex items-center gap-4">
      <FlowerGlyph kind={open.flower ?? 'daisy'} size={58}/>
      <div>
       <p className="font-serif text-xl">{flowerSpec(open.flower).name}</p>
       <p className="small-copy">{feelings.find(f => f.id === open.feeling)?.label ?? 'Steady'} · {feelings.find(f => f.id === open.feeling)?.caption ?? 'Ordinary, in a good way.'}</p>
      </div>
     </div>
     {open.topic && <div className="soft-surface"><p className="text-sm font-medium mb-1">What it was about</p><p className="small-copy">{open.topic}</p></div>}
     <p className="small-copy">{open.text}</p>
     <Button variant="outline" onClick={() => setOpen(null)}>Leave it growing</Button>
    </>}
   </DialogContent>
  </Dialog>
 </div>
}
