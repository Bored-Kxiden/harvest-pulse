'use client'
import { useRef, useState } from 'react'
import { ChevronRight, Sprout } from 'lucide-react'
import { useHarbor } from '@/lib/harbor/store'
import { weatherIndex, weathers } from '@/lib/harbor/model'

const last = weathers.length - 1
const greetings = [
 "Take a deep breath. You've got this.",
 'Plenty on, and most of it good.',
 'Go gently with yourself today.',
 'Heavy days pass. One small thing is enough.',
 'Too much at once. Nothing is owed today.',
]
export function greetingFor(index: number) { return greetings[Math.min(Math.max(index, 0), last)] }

/** How life feels, set the way you'd read a sky: press anywhere on the track, or slide the leaf along it. */
export function FeelingsCard() {
 const { state, update } = useHarbor()
 const track = useRef<HTMLDivElement>(null)
 const [dragging, setDragging] = useState(false)
 if (!state) return null
 const index = weatherIndex(state.weather)
 const current = weathers[index]
 const percent = index / last

 const setIndex = (next: number) => {
  const clamped = Math.min(last, Math.max(0, next))
  if (weathers[clamped].id !== state.weather) update(s => ({ ...s, weather: weathers[clamped].id }))
 }
 const setFromX = (clientX: number) => {
  const rect = track.current?.getBoundingClientRect()
  if (!rect || rect.width <= 52) return
  setIndex(Math.round(((clientX - rect.left - 26) / (rect.width - 52)) * last))
 }

 return <section className="card card-pad feelings" aria-labelledby="feelings-heading">
  <div className="row-head" style={{ marginBottom: 0 }}>
   <p className="eyebrow" id="feelings-heading">Your feelings right now</p>
   <ChevronRight className="size-4" style={{ color: 'var(--ink-faint)' }}/>
  </div>
  <h2>{current.label}</h2>
  <p>{current.caption}</p>

  <div ref={track} className="mood" data-dragging={dragging}
   role="slider" tabIndex={0} aria-valuemin={0} aria-valuemax={last} aria-valuenow={index} aria-valuetext={`${current.label}. ${current.caption}`} aria-label="How life feels right now"
   onPointerDown={e => { (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId); setDragging(true); setFromX(e.clientX) }}
   onPointerMove={e => { if (dragging) setFromX(e.clientX) }}
   onPointerUp={() => setDragging(false)} onPointerCancel={() => setDragging(false)}
   onKeyDown={e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setIndex(index - 1) }
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setIndex(index + 1) }
    if (e.key === 'Home') { e.preventDefault(); setIndex(0) }
    if (e.key === 'End') { e.preventDefault(); setIndex(last) }
   }}>
   <span className="mood-rail"/>
   <span className="mood-fill" style={{ width: `calc((100% - 52px) * ${percent})` }}/>
   {weathers.map((w, i) => <span key={w.id} className="mood-dot" data-passed={i <= index} style={{ left: `calc(26px + (100% - 52px) * ${i / last})` }}/>)}
   <span className="mood-knob" style={{ left: `calc(26px + (100% - 52px) * ${percent})` }}><Sprout/></span>
  </div>
  <div className="mood-scale"><span>Low</span><span>On your path</span><span>Easy</span></div>
 </section>
}
