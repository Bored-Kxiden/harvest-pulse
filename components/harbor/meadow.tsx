'use client'
import { useEffect, useRef } from 'react'
import { useHarbor } from '@/lib/harbor/store'
import { callsFor, flowerSpec, type Moment, type Weather } from '@/lib/harbor/model'
import {
 buildScene, paintBackdrop, paintBloom, paintClouds, paintField, paintWeather,
 placeBlooms, placePatches, windStrength, WORLD_SPAN, type Bloom, type Patch, type Scene,
} from '@/lib/harbor/scene'

type Hit = { x: number; y: number; r: number; bloom: Bloom }
type Camera = { x: number; y: number; zoom: number }

/* Two readable states rather than a continuum: far enough out to see whose patch is whose,
   close enough in to read one flower. Everything between is just the journey. */
const NEAR = 3.4
const TAGS_FADE = 1.9

/** The meadow behind everything. You can push it around and come down into it;
    the sky and hills sit far enough back that they barely move, which is what makes
    the field feel like ground rather than wallpaper. */
export function Meadow({ weather, sheetLift, freshBloomId, bare, onOpenBloom, onOpenPerson }: {
 weather: Weather; sheetLift: number; freshBloomId?: string
 /** With the camera open the meadow is scenery, not a map: the name tags step out. */
 bare?: boolean
 onOpenBloom: (moment: Moment) => void
 onOpenPerson: (personId: string) => void
}) {
 const { state } = useHarbor()
 const holder = useRef<HTMLDivElement>(null)
 const canvas = useRef<HTMLCanvasElement>(null)

 const live = useRef({ weather, sheetLift, freshBloomId, bare: false, people: state?.people ?? [], calls: [] as Moment[], reduced: false })
 live.current.weather = weather
 live.current.sheetLift = sheetLift
 live.current.freshBloomId = freshBloomId
 live.current.bare = !!bare
 live.current.people = state?.people ?? []
 live.current.calls = state ? state.people.flatMap(p => callsFor(state, p.id)) : []
 live.current.reduced = !!state?.settings.reducedMotion

 const hits = useRef<Hit[]>([])
 const tagHits = useRef<{ x: number; y: number; w: number; h: number; id: string }[]>([])
 const openBloom = useRef(onOpenBloom); openBloom.current = onOpenBloom
 const openPerson = useRef(onOpenPerson); openPerson.current = onOpenPerson

 const tagFade = useRef(1)
 const cam = useRef<Camera>({ x: 0, y: 0, zoom: 1 })
 const goal = useRef<Camera>({ x: 0, y: 0, zoom: 1 })
 const fit = useRef(1)

 useEffect(() => {
  const box = holder.current, node = canvas.current
  if (!box || !node) return
  const ctx = node.getContext('2d')
  if (!ctx) return

  let scene: Scene | null = null
  let blooms: Bloom[] = []
  let patches: Patch[] = []
  let backdrop: HTMLCanvasElement | null = null
  let fading: { from: HTMLCanvasElement; at: number } | null = null
  let painted: Weather | null = null
  let signature = ''
  let dpr = 1, cssW = 0, cssH = 0, worldW = 0
  let frame = 0
  let started = false

  const fieldTop = () => cssH * 0.52

  const rebuild = () => {
   worldW = cssW * WORLD_SPAN
   scene = buildScene(worldW, cssH, fieldTop())
   backdrop = null; painted = null; signature = ''
   fit.current = 1
   if (!started) {
    started = true
    cam.current = { x: worldW / 2, y: cssH / 2, zoom: 1 }
    goal.current = { ...cam.current }
   }
   clamp(goal.current); clamp(cam.current)
  }
  /* You can wander, but not off the edge of the world. */
  const clamp = (c: Camera) => {
   c.zoom = Math.min(NEAR, Math.max(1, c.zoom))
   const halfW = cssW / 2 / c.zoom, halfH = cssH / 2 / c.zoom
   /* When the view is larger than the world on an axis, centre on it rather than clamping
      to a range that has run backwards and pushing the whole meadow off screen. */
   c.x = worldW <= halfW * 2 ? worldW / 2 : Math.min(worldW - halfW, Math.max(halfW, c.x))
   c.y = cssH <= halfH * 2 ? cssH / 2 : Math.min(cssH - halfH, Math.max(halfH, c.y))
  }

  const repaintBackdrop = (weather: Weather) => {
   if (!scene) return
   const next = document.createElement('canvas')
   next.width = Math.round(worldW * dpr); next.height = Math.round(cssH * dpr)
   const bctx = next.getContext('2d')
   if (!bctx) return
   bctx.setTransform(dpr, 0, 0, dpr, 0, 0)
   paintBackdrop(bctx, scene, weather)
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
   const { weather, sheetLift, freshBloomId, bare, people, calls, reduced } = live.current
   if (!scene) rebuild()
   if (!scene) return
   if (painted !== weather) repaintBackdrop(weather)

   const sig = people.map(p => p.id).join(',') + '|' + calls.length
   if (sig !== signature) {
    blooms = placeBlooms(people, calls, worldW, fieldTop(), scene.horizon)
    patches = placePatches(people, blooms)
    signature = sig
   }

   /* Ease toward the goal rather than snapping: every pan and zoom has weight. */
   cam.current.x += (goal.current.x - cam.current.x) * 0.16
   cam.current.y += (goal.current.y - cam.current.y) * 0.16
   cam.current.zoom += (goal.current.zoom - cam.current.zoom) * 0.16
   const c = cam.current
   const rel = c.zoom / fit.current
   const t = reduced ? 8000 : now

   ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
   ctx.clearRect(0, 0, cssW, cssH)
   ctx.save()
   ctx.translate(0, -sheetLift * 40)

   /* The backdrop is far away: it drifts a quarter as fast and barely grows,
      which keeps it crisp and puts real distance between sky and grass. */
   const far = 1 + (rel - 1) * 0.1
   /* Offset by a fraction of how far along the world you are, never by more than the
      backdrop has to spare: the horizon drifts, but it can never slide off the frame. */
   const travel = Math.max(worldW - cssW, 1)
   const along = Math.min(1, Math.max(0, (c.x - cssW / 2) / travel))
   ctx.save()
   ctx.translate(-(worldW * far - cssW) * along * 0.55, 0)
   ctx.scale(far, far)
   if (backdrop) ctx.drawImage(backdrop, 0, 0, worldW, cssH)
   if (fading) {
    /* The old sky does not just dim, it lifts away: the new weather is already
       painted underneath, so the outgoing one can drift up without leaving a gap. */
    const raw = Math.min(1, (now - fading.at) / 1100)
    const mix = raw < 0.5 ? 2 * raw * raw : 1 - ((2 - 2 * raw) ** 2) / 2
    ctx.save()
    ctx.globalAlpha = 1 - mix
    ctx.translate(0, -mix * 30)
    ctx.drawImage(fading.from, 0, 0, worldW, cssH)
    ctx.restore()
    if (raw >= 1) fading = null
   }
   ctx.restore()

   paintClouds(ctx, scene, weather, t)

   ctx.save()
   ctx.translate(cssW / 2 - c.x * c.zoom, cssH / 2 - c.y * c.zoom)
   ctx.scale(c.zoom, c.zoom)
   const view = { x0: c.x - cssW / 2 / c.zoom, x1: c.x + cssW / 2 / c.zoom, y0: c.y - cssH / 2 / c.zoom, y1: c.y + cssH / 2 / c.zoom }
   paintField(ctx, scene, weather, t, view)

   const strength = windStrength[weather]
   hits.current.length = 0
   for (const bloom of blooms) {
    if (bloom.x < view.x0 - 60 || bloom.x > view.x1 + 60) continue
    const fresh = freshBloomId === bloom.moment.id
    const head = paintBloom(ctx, bloom, t, strength, fresh ? Math.max(0, 1 - (now % 4000) / 4000) * 0.5 : 0)
    hits.current.push({
     x: cssW / 2 + (head.hx - c.x) * c.zoom,
     y: cssH / 2 + (head.hy - c.y) * c.zoom - sheetLift * 40,
     r: Math.max(head.r * c.zoom, 16), bloom,
    })
    if (fresh) {
     const pulse = 1 + ((now % 1800) / 1800) * 1.1
     ctx.strokeStyle = 'rgba(254,252,245,.9)'
     ctx.lineWidth = 2 / c.zoom
     ctx.globalAlpha = Math.max(0, 1 - (now % 1800) / 1800)
     ctx.beginPath(); ctx.arc(head.hx, head.hy, head.r * pulse, 0, 6.283185); ctx.stroke()
     ctx.globalAlpha = 1
    }
   }
   ctx.restore()

   /* Far out, a patch is a name and a count. Coming in, the names get out of the way. */
   tagHits.current.length = 0
   tagFade.current += ((bare ? 0 : 1) - tagFade.current) * 0.14
   const tagAlpha = (rel > TAGS_FADE ? Math.max(0, 1 - (rel - TAGS_FADE) / 0.8) : 1) * tagFade.current
   if (tagAlpha > 0.02) {
    ctx.save()
    ctx.globalAlpha = tagAlpha
    ctx.font = "700 12px var(--font-round), ui-rounded, sans-serif"
    const laid: { x: number; y: number }[] = []
    for (const patch of patches) {
     const sx = cssW / 2 + (patch.x - c.x) * c.zoom
     let sy = cssH / 2 + (patch.y - c.y) * c.zoom - 44 - sheetLift * 40
     if (sx < -60 || sx > cssW + 60) continue
     const text = `${patch.person.name} · ${patch.count}`
     const wide = ctx.measureText(text).width + 42
     const x = Math.min(Math.max(sx, wide / 2 + 10), cssW - wide / 2 - 10)
     while (laid.some(l => Math.abs(l.x - x) < wide * 0.8 && Math.abs(l.y - sy) < 30)) sy -= 30
     laid.push({ x, y: sy })
     ctx.fillStyle = 'rgba(254,252,245,.95)'
     ctx.beginPath(); ctx.roundRect(x - wide / 2, sy - 13, wide, 26, 13); ctx.fill()
     ctx.beginPath(); ctx.moveTo(x - 5, sy + 13); ctx.lineTo(x + 5, sy + 13); ctx.lineTo(x, sy + 20); ctx.closePath(); ctx.fill()
     const f = flowerSpec(patch.dominant)
     for (let i = 0; i < f.petals; i++) {
      const a = (i / f.petals) * 6.283185
      ctx.fillStyle = i % 2 ? f.petal : f.petalDeep
      ctx.beginPath()
      ctx.ellipse(x - wide / 2 + 15 + Math.cos(a) * 4.4, sy + Math.sin(a) * 4.4, 3.4, 2.5, a, 0, 6.283185)
      ctx.fill()
     }
     ctx.fillStyle = f.heart
     ctx.beginPath(); ctx.arc(x - wide / 2 + 15, sy, 2.2, 0, 6.283185); ctx.fill()
     ctx.fillStyle = '#13492C'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
     ctx.fillText(text, x + 9, sy + 1)
     ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic'
     tagHits.current.push({ x: x - wide / 2, y: sy - 13, w: wide, h: 26, id: patch.person.id })
    }
    ctx.restore()
   }

   paintWeather(ctx, scene, weather, t)
   ctx.restore()
  }
  frame = requestAnimationFrame(render)

  /* ---------- push it around ---------- */
  const pointers = new Map<number, { x: number; y: number }>()
  let drag: { x: number; y: number; moved: number } | null = null
  let pinch: { gap: number; zoom: number } | null = null
  let lastTap = 0
  const local = (e: PointerEvent) => { const r = node.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }

  const down = (e: PointerEvent) => {
   node.setPointerCapture(e.pointerId)
   const pt = local(e)
   pointers.set(e.pointerId, pt)
   if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    pinch = { gap: Math.hypot(a.x - b.x, a.y - b.y), zoom: goal.current.zoom }
    drag = null
   } else drag = { ...pt, moved: 0 }
  }
  const move = (e: PointerEvent) => {
   if (!pointers.has(e.pointerId)) return
   const pt = local(e)
   pointers.set(e.pointerId, pt)
   if (pinch && pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    goal.current.zoom = pinch.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / Math.max(pinch.gap, 1))
    clamp(goal.current)
    return
   }
   if (!drag) return
   const dx = pt.x - drag.x, dy = pt.y - drag.y
   drag.moved += Math.hypot(dx, dy); drag.x = pt.x; drag.y = pt.y
   goal.current.x -= dx / goal.current.zoom
   goal.current.y -= dy / goal.current.zoom
   clamp(goal.current)
  }
  const up = (e: PointerEvent) => {
   const pt = pointers.get(e.pointerId)
   const started = drag
   pointers.delete(e.pointerId)
   if (pointers.size < 2) pinch = null
   drag = null
   if (!started || !pt || started.moved >= 6) return

   for (const tag of tagHits.current) {
    if (pt.x >= tag.x && pt.x <= tag.x + tag.w && pt.y >= tag.y && pt.y <= tag.y + tag.h) { openPerson.current(tag.id); return }
   }
   let found: Bloom | null = null, best = Infinity
   for (const hit of hits.current) {
    const d = Math.hypot(hit.x - pt.x, hit.y - pt.y)
    if (d < hit.r * 1.5 && d < best) { best = d; found = hit.bloom }
   }
   if (found) { openBloom.current(found.moment); return }

   /* A double tap is the only zoom control there is: down into the grass, or back out. */
   const now = performance.now()
   if (now - lastTap < 320) {
    const rel = goal.current.zoom / fit.current
    const world = { x: cam.current.x + (pt.x - cssW / 2) / cam.current.zoom, y: cam.current.y + (pt.y - cssH / 2) / cam.current.zoom }
    goal.current = rel > NEAR * 0.7
     ? { x: cam.current.x, y: cssH / 2, zoom: 1 }
     : { x: world.x, y: world.y, zoom: NEAR }
    clamp(goal.current)
    lastTap = 0
   } else lastTap = now
  }
  const wheel = (e: WheelEvent) => {
   e.preventDefault()
   goal.current.zoom *= e.deltaY < 0 ? 1.14 : 1 / 1.14
   clamp(goal.current)
  }
  node.addEventListener('pointerdown', down)
  node.addEventListener('pointermove', move)
  node.addEventListener('pointerup', up)
  node.addEventListener('pointercancel', up)
  node.addEventListener('wheel', wheel, { passive: false })

  return () => {
   cancelAnimationFrame(frame)
   observer.disconnect()
   node.removeEventListener('pointerdown', down)
   node.removeEventListener('pointermove', move)
   node.removeEventListener('pointerup', up)
   node.removeEventListener('pointercancel', up)
   node.removeEventListener('wheel', wheel)
  }
 }, [])

 const total = live.current.calls.length
 return <div ref={holder} className="meadow">
  <canvas ref={canvas} className="meadow-canvas" role="img"
   aria-label={`Your meadow. ${total} ${total === 1 ? 'flower' : 'flowers'} growing. Drag to walk around it, pinch or double tap to come closer, tap a flower to read the call it came from.`}/>
 </div>
}
