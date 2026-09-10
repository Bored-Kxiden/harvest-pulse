'use client'
import { useRef, useState } from 'react'
import { Cloud, CloudLightning, CloudRain, CloudSun, Sun } from 'lucide-react'
import { useHarbor } from '@/lib/harbor/store'
import { weatherIndex, weathers, type Weather } from '@/lib/harbor/model'

export const weatherIcons: Record<Weather, typeof Sun> = { clear: Sun, bright: CloudSun, cloudy: Cloud, rain: CloudRain, storm: CloudLightning }
const last = weathers.length - 1

/** How life feels, set the way you'd read a sky: tap a point on the bar or slide along it. */
export function WeatherBar() {
 const { state, update } = useHarbor()
 const track = useRef<HTMLDivElement>(null)
 const [dragging, setDragging] = useState(false)
 if (!state) return null
 const index = weatherIndex(state.weather)
 const current = weathers[index]
 const percent = (index / last) * 100

 const setIndex = (next: number) => {
  const clamped = Math.min(last, Math.max(0, next))
  if (weathers[clamped].id !== state.weather) update(s => ({ ...s, weather: weathers[clamped].id }))
 }
 const setFromX = (clientX: number) => {
  const rect = track.current?.getBoundingClientRect(); if (!rect || rect.width <= 44) return
  setIndex(Math.round(((clientX - rect.left - 22) / (rect.width - 44)) * last))
 }

 return <section className="weather-card" aria-labelledby="weather-heading">
  <div className="weather-head">
   <div className="min-w-0">
    <p className="eyebrow" id="weather-heading">How life feels right now</p>
    <h2 className="font-serif text-2xl mt-1">{current.label}</h2>
    <p className="small-copy">{current.caption}</p>
   </div>
   <div className="weather-wheel" aria-hidden="true">
    <span className="weather-wheel-face"/>
    <div className="weather-wheel-spin" style={{ transform: `rotate(${-index * (360 / weathers.length)}deg)` }}>
     {weathers.map((w, i) => {
      const Icon = weatherIcons[w.id]
      const step = 360 / weathers.length
      return <span key={w.id} className="weather-wheel-slot" data-active={i === index}
       style={{ transform: `rotate(${i * step}deg) translateY(-42px) rotate(${(index - i) * step}deg)` }}><Icon/></span>
     })}
    </div>
   </div>
  </div>

  <div ref={track} className="weather-track" data-dragging={dragging}
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
   <span className="weather-track-rail"/>
   <span className="weather-track-fill" style={{ width: `calc((100% - 44px) * ${percent / 100})` }}/>
   {weathers.map((w, i) => <span key={w.id} className="weather-stop" data-passed={i <= index} style={{ left: `calc(22px + (100% - 44px) * ${i / last})` }}/>)}
   <span className="weather-thumb" style={{ left: `calc(22px + (100% - 44px) * ${percent / 100})` }}>{(() => { const Icon = weatherIcons[current.id]; return <Icon/> })()}</span>
  </div>
  <div className="weather-scale"><span>{weathers[0].label}</span><span>Only you see this</span><span>{weathers[last].label}</span></div>
 </section>
}
