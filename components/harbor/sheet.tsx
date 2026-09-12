'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'

const REST = 0.52   /* the sheet sits here, leaving the meadow the top half */
const UP = 0.11     /* pulled up, it leaves a ribbon of sky */
const SLOP = 6      /* below this, a drag was really a tap */

/** The card the app lives in. Drag the handle to move it; from the very top of the
    content, dragging down puts it back. Anything shorter than a few pixels is a tap. */
export function Sheet({ lift, onLift, onDragging, children, label }: {
 lift: number; onLift: (value: number) => void; onDragging: (value: boolean) => void; children: ReactNode; label: string
}) {
 const scroller = useRef<HTMLDivElement>(null)
 const [dragging, setDragging] = useState(false)
 const report = (value: boolean) => { setDragging(value); onDragging(value) }
 const drag = useRef<{ y: number; from: number; at: number; last: number; v: number; moved: boolean; collapseOnly: boolean } | null>(null)
 const height = useRef(1)
 const liftRef = useRef(lift)
 liftRef.current = lift

 useEffect(() => {
  const measure = () => { height.current = window.innerHeight || 1 }
  measure()
  window.addEventListener('resize', measure)
  return () => window.removeEventListener('resize', measure)
 }, [])

 const start = (e: React.PointerEvent, collapseOnly: boolean) => {
  if (collapseOnly && (scroller.current?.scrollTop ?? 0) > 0) return
  drag.current = { y: e.clientY, from: lift, at: performance.now(), last: e.clientY, v: 0, moved: false, collapseOnly }
 }
 const move = (e: React.PointerEvent) => {
  const d = drag.current
  if (!d) return
  const dy = e.clientY - d.y
  /* From inside the scroller only a downward pull counts, so reading never fights the sheet. */
  if (d.collapseOnly && dy <= SLOP) return
  if (!d.moved && Math.abs(dy) < SLOP) return
  d.moved = true
  if (!dragging) report(true)
  const next = Math.min(1, Math.max(0, d.from - dy / (height.current * (REST - UP))))
  if (next !== liftRef.current) onLift(next)
  const now = performance.now()
  d.v = (e.clientY - d.last) / Math.max(now - d.at, 1)
  d.last = e.clientY; d.at = now
 }
 const end = () => {
  const d = drag.current
  drag.current = null
  report(false)
  if (!d || !d.moved) return
  /* Thrown hard enough it goes where it was thrown; otherwise it settles to the nearer edge. */
  if (Math.abs(d.v) > 0.5) onLift(d.v < 0 ? 1 : 0)
  else onLift(liftRef.current > 0.5 ? 1 : 0)
 }

 /* The travel itself lives in CSS, off --lift, so it runs on the compositor. */
 return <section className="sheet" aria-label={label}>
  <button type="button" className="sheet-grab" aria-label={lift > 0.5 ? 'Lower the panel' : 'Raise the panel'} aria-expanded={lift > 0.5}
   onPointerDown={e => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); start(e, false) }}
   onPointerMove={move}
   onPointerUp={e => { const wasDrag = drag.current?.moved; end(); if (!wasDrag) onLift(liftRef.current > 0.5 ? 0 : 1) }}
   onPointerCancel={end}
   onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onLift(liftRef.current > 0.5 ? 0 : 1) } }}>
   <span aria-hidden="true"/>
  </button>
  <div ref={scroller} className="sheet-scroll"
   onPointerDown={e => start(e, true)} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
   {children}
  </div>
 </section>
}
