'use client'
import { useEffect, useState } from 'react'
import { Moon, Plus, Sunrise, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useHarbor } from '@/lib/harbor/store'
import { blocksFor, DAY_CLOSE, DAY_OPEN, formatTime, freeWindows, localDay, minutes, type Interval } from '@/lib/harbor/model'

const OPEN = minutes(DAY_OPEN), CLOSE = minutes(DAY_CLOSE)
const CX = 150, CY = 132, R = 116

/** A point on the day's arc. Morning sits on the left, evening on the right, and the
    sun climbs over the middle, which is the shape everybody already has in their head
    for a day. It reads at a glance, which a seven-column grid of half-hour cells does
    not, and it needs no dragging to understand. */
function point(m: number) {
 const t = Math.min(1, Math.max(0, (m - OPEN) / (CLOSE - OPEN)))
 const angle = Math.PI - t * Math.PI
 return { x: CX + Math.cos(angle) * R, y: CY - Math.sin(angle) * R }
}
function arcPath(from: number, to: number) {
 const a = point(from), b = point(to)
 const large = (to - from) / (CLOSE - OPEN) > 0.5 ? 1 : 0
 return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} A${R} ${R} 0 ${large} 1 ${b.x.toFixed(1)} ${b.y.toFixed(1)}`
}

/** The parent's own day: when they are free, and how to say when they are not.
    A student marks busy time by dragging across a week grid. A parent gets this. */
export function DayArc({ compact }: { compact?: boolean }) {
 const { state, update } = useHarbor()
 const [adding, setAdding] = useState(false)
 const [now, setNow] = useState(() => new Date())
 useEffect(() => {
  const timer = setInterval(() => setNow(new Date()), 60000)
  return () => clearInterval(timer)
 }, [])
 if (!state) return null

 const day = localDay(now)
 const busy = blocksFor(state, day, 'you').slice().sort((a, b) => minutes(a.start) - minutes(b.start))
 const free = freeWindows(busy)
 const longest = free.slice().sort((a, b) => (minutes(b.end) - minutes(b.start)) - (minutes(a.end) - minutes(a.start)))[0]
 const clock = now.getHours() * 60 + now.getMinutes()
 const withinDay = clock >= OPEN && clock <= CLOSE
 const busyNow = busy.find(b => minutes(b.start) <= clock && clock < minutes(b.end))
 const marker = point(Math.min(CLOSE, Math.max(OPEN, clock)))

 const remove = (block: Interval) => {
  update(s => ({
   ...s,
   schedules: { ...s.schedules, [day]: { you: (s.schedules[day]?.you ?? []).filter(b => !(b.start === block.start && b.end === block.end)), mom: s.schedules[day]?.mom ?? [] } },
  }))
  toast.success('That time is yours again.')
 }

 return <section className="card card-pad flow day-arc" aria-labelledby="arc-heading">
  <div>
   <h2 id="arc-heading" style={{ fontSize: 17 }}>Your day</h2>
   <p className="small">
    {busyNow
     ? `Busy with ${busyNow.label || 'something'} until ${formatTime(busyNow.end)}.`
     : longest
      ? `Free ${formatTime(longest.start)} to ${formatTime(longest.end)}. Your people can see this.`
      : 'Every hour marked busy today.'}
   </p>
  </div>

  <div className="arc-wrap">
   <svg viewBox="0 0 300 150" className="arc" role="img"
    aria-label={busy.length
     ? `Your day from ${formatTime(DAY_OPEN)} to ${formatTime(DAY_CLOSE)}, with ${busy.length} busy block${busy.length === 1 ? '' : 's'} marked.`
     : `Your day from ${formatTime(DAY_OPEN)} to ${formatTime(DAY_CLOSE)}, nothing marked busy.`}>
    <defs>
     <linearGradient id="arc-free" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stopColor="var(--gold)"/><stop offset="55%" stopColor="var(--leaf-bright)"/><stop offset="100%" stopColor="#88A6DA"/>
     </linearGradient>
    </defs>
    {/* the whole day, then the hours already spoken for drawn back over it */}
    <path d={arcPath(OPEN, CLOSE)} fill="none" stroke="url(#arc-free)" strokeWidth="7" strokeLinecap="round"/>
    {busy.map((block, i) => <path key={i} d={arcPath(minutes(block.start), minutes(block.end))}
     fill="none" stroke="var(--track)" strokeWidth="9" strokeLinecap="butt"/>)}
    {withinDay && <>
     <circle cx={marker.x} cy={marker.y} r="11" fill="var(--paper)" opacity=".85"/>
     <circle cx={marker.x} cy={marker.y} r="6" fill={busyNow ? 'var(--ink-faint)' : 'var(--leaf)'}/>
    </>}
   </svg>
   <span className="arc-end arc-dawn"><Sunrise aria-hidden="true"/>morning</span>
   <span className="arc-end arc-dusk"><Moon aria-hidden="true"/>evening</span>
   <span className="arc-now">{withinDay ? (busyNow ? 'Busy right now' : 'Free right now') : 'Outside your day'}</span>
  </div>

  {!!busy.length && !compact && <ul className="arc-list">
   {busy.map((block, i) => <li key={i}>
    <b>{block.label || 'Busy'}</b>
    <span>{formatTime(block.start)} to {formatTime(block.end)}</span>
    <button type="button" className="ghost-btn" onClick={() => remove(block)} aria-label={`Clear ${block.label || 'this block'}`}>
     <Trash2 aria-hidden="true"/>
    </button>
   </li>)}
  </ul>}

  <button type="button" className="btn btn-soft btn-block" onClick={() => setAdding(true)}>
   <Plus aria-hidden="true"/>Add your own busy time
  </button>
  {adding && <AddBusy day={day} onClose={() => setAdding(false)}/>}
 </section>
}

const PRESETS: { label: string; start: string; end: string }[] = [
 { label: 'Morning', start: '09:00', end: '12:00' },
 { label: 'Afternoon', start: '13:00', end: '17:00' },
 { label: 'Evening', start: '18:00', end: '21:00' },
]

/** Two time fields and three shortcuts. No dragging, no grid: the native time picker
    is a control every phone already taught its owner how to use. */
function AddBusy({ day, onClose }: { day: string; onClose: () => void }) {
 const { update } = useHarbor()
 const [start, setStart] = useState('09:00')
 const [end, setEnd] = useState('12:00')
 const [label, setLabel] = useState('')
 const [error, setError] = useState<string>()

 const save = () => {
  if (minutes(start) >= minutes(end)) { setError('The end has to come after the start.'); return }
  update(s => {
   const today = s.schedules[day] ?? { you: [], mom: [] }
   return {
    ...s,
    schedules: { ...s.schedules, [day]: { ...today, you: [...today.you, { start, end, label: label.trim() }].sort((a, b) => minutes(a.start) - minutes(b.start)) } },
   }
  })
  toast.success(`Marked busy ${formatTime(start)} to ${formatTime(end)}.`)
  onClose()
 }

 return <div className="arc-add">
  <div className="chips" role="radiogroup" aria-label="A rough time of day">
   {PRESETS.map(p => <button key={p.label} type="button" role="radio" className="chip-choice"
    aria-checked={start === p.start && end === p.end}
    onClick={() => { setStart(p.start); setEnd(p.end); setError(undefined) }}>{p.label}</button>)}
  </div>
  <div className="arc-times">
   <div>
    <label className="label" htmlFor="busy-from">From</label>
    <input className="input" id="busy-from" type="time" value={start} step={900}
     onChange={e => { setStart(e.target.value); setError(undefined) }}/>
   </div>
   <div>
    <label className="label" htmlFor="busy-to">Until</label>
    <input className="input" id="busy-to" type="time" value={end} step={900}
     onChange={e => { setEnd(e.target.value); setError(undefined) }}/>
   </div>
  </div>
  <div>
   <label className="label" htmlFor="busy-what">What is it? (optional)</label>
   <input className="input" id="busy-what" maxLength={40} value={label} autoComplete="off"
    placeholder="Work, temple, market…" onChange={e => setLabel(e.target.value)}/>
  </div>
  {error && <p className="field-error" role="alert">{error}</p>}
  <div className="arc-acts">
   <button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button>
   <button type="button" className="btn" onClick={save}>Mark this time</button>
  </div>
 </div>
}
