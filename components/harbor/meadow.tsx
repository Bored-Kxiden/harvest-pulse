'use client'
import { useEffect, useRef } from 'react'
import { useHarbor } from '@/lib/harbor/store'
import { callsFor, type Moment, type Weather } from '@/lib/harbor/model'
import {
 buildScene, paintBackdrop, paintBloom, paintClouds, paintField, paintWeather,
 placeBlooms, windStrength, type Bloom, type Scene,
} from '@/lib/harbor/scene'

type Hit = { x: number; y: number; r: number; bloom: Bloom }

/** The meadow behind everything. One canvas: a still backdrop that is repainted only when the
    weather turns, and the living half — cloud, wind, rain, blooms — drawn fresh every frame. */
export function Meadow({ weather, sheetLift, freshBloomId, onOpenBloom }: {
 weather: Weather; sheetLift: number; freshBloomId?: string
 onOpenBloom: (moment: Moment) => void
}) {
 const { state } = useHarbor()
 const holder = useRef<HTMLDivElement>(null)
 const canvas = useRef<HTMLCanvasElement>(null)

 /* The frame loop reads refs only — it must never depend on a render. */
 const live = useRef({ weather, sheetLift, freshBloomId, people: state?.people ?? [], calls: [] as Moment[], reduced: false })
 live.current.weather = weather
 live.current.sheetLift = sheetLift
 live.current.freshBloomId = freshBloomId
 live.current.people = state?.people ?? []
 live.current.calls = state ? state.people.flatMap(p => callsFor(state, p.id)) : []
 live.current.reduced = !!state?.settings.reducedMotion

 const hits = useRef<Hit[]>([])
 const openRef = useRef(onOpenBloom)
 openRef.current = onOpenBloom

 useEffect(() => {
  const box = holder.current, node = canvas.current
  if (!box || !node) return
  const ctx = node.getContext('2d')
  if (!ctx) return

  let scene: Scene | null = null
  let blooms: Bloom[] = []
  let backdrop: HTMLCanvasElement | null = null
  let fading: { from: HTMLCanvasElement; at: number } | null = null
  let painted: Weather | null = null
  let signature = ''
  let dpr = 1, cssW = 0, cssH = 0
  let frame = 0

  const fieldTop = () => cssH * 0.52

  const rebuild = () => {
   scene = buildScene(cssW, cssH, fieldTop())
   backdrop = null; painted = null; signature = ''
  }
  const repaintBackdrop = (weather: Weather) => {
   if (!scene) return
   const next = document.createElement('canvas')
   next.width = Math.round(cssW * dpr); next.height = Math.round(cssH * dpr)
   const bctx = next.getContext('2d')
   if (!bctx) return
   bctx.setTransform(dpr, 0, 0, dpr, 0, 0)
   paintBackdrop(bctx, scene, weather)
   /* A turn in the weather crossfades rather than cuts — the sky has time to change its mind. */
   if (backdrop && painted && painted !== weather && !live.current.reduced) fading = { from: backdrop, at: performance.now() }
   backdrop = next
   painted = weather
  }

  const observer = new ResizeObserver(entries => {
   const rect = entries[0].contentRect
   dpr = Math.min(window.devicePixelRatio || 1, 2)
   cssW = rect.width; cssH = rect.height
   node.width = Math.round(cssW * dpr); node.height = Math.round(cssH * dpr)
   rebuild()
  })
  observer.observe(box)

  const render = (now: number) => {
   frame = requestAnimationFrame(render)
   if (!cssW || !cssH) return
   const { weather, sheetLift, freshBloomId, people, calls, reduced } = live.current
   if (!scene) rebuild()
   if (!scene) return
   if (painted !== weather) repaintBackdrop(weather)

   const sig = people.map(p => p.id).join(',') + '|' + calls.length
   if (sig !== signature) { blooms = placeBlooms(people, calls, cssW, fieldTop(), scene.horizon); signature = sig }

   const t = reduced ? 8000 : now
   ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
   ctx.clearRect(0, 0, cssW, cssH)

   /* The whole scene drifts up a little as the sheet comes up: parallax, not a jump cut. */
   ctx.save()
   ctx.translate(0, -sheetLift * 46)

   if (backdrop) ctx.drawImage(backdrop, 0, 0, cssW, cssH)
   if (fading) {
    const mix = Math.min(1, (now - fading.at) / 900)
    ctx.globalAlpha = 1 - mix
    ctx.drawImage(fading.from, 0, 0, cssW, cssH)
    ctx.globalAlpha = 1
    if (mix >= 1) fading = null
   }

   paintClouds(ctx, scene, weather, t)
   paintField(ctx, scene, weather, t)

   const strength = windStrength[weather]
   hits.current.length = 0
   for (const bloom of blooms) {
    const fresh = freshBloomId === bloom.moment.id
    const head = paintBloom(ctx, bloom, t, strength, fresh ? Math.max(0, 1 - (now % 4000) / 4000) * 0.5 : 0)
    hits.current.push({ x: head.hx, y: head.hy - sheetLift * 46, r: Math.max(head.r, 15), bloom })
    if (fresh) {
     ctx.strokeStyle = 'rgba(255,253,248,.9)'
     ctx.lineWidth = 2
     const pulse = 1 + ((now % 1800) / 1800) * 1.1
     ctx.globalAlpha = Math.max(0, 1 - (now % 1800) / 1800)
     ctx.beginPath(); ctx.arc(head.hx, head.hy, head.r * pulse, 0, 6.283185); ctx.stroke()
     ctx.globalAlpha = 1
    }
   }

   paintWeather(ctx, scene, weather, t)
   ctx.restore()
  }
  frame = requestAnimationFrame(render)
  return () => { cancelAnimationFrame(frame); observer.disconnect() }
 }, [])

 const tap = (e: React.PointerEvent) => {
  const rect = canvas.current?.getBoundingClientRect()
  if (!rect) return
  const x = e.clientX - rect.left, y = e.clientY - rect.top
  let found: Bloom | null = null, best = Infinity
  for (const hit of hits.current) {
   const d = Math.hypot(hit.x - x, hit.y - y)
   if (d < hit.r * 1.6 && d < best) { best = d; found = hit.bloom }
  }
  if (found) openRef.current(found.moment)
 }

 const total = live.current.calls.length
 return <div ref={holder} className="meadow">
  <canvas ref={canvas} className="meadow-canvas" onPointerDown={tap}
   role="img" aria-label={`Your meadow — ${total} ${total === 1 ? 'flower' : 'flowers'} growing. Tap a flower to read the call it came from.`}/>
 </div>
}
