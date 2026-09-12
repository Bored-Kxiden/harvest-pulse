'use client'
import { useMemo, useRef, useState } from 'react'
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Link2, ShieldCheck, Trash2, Unlink } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useHarbor } from '@/lib/harbor/store'
import {
 blocksFor, calendarProviders, clockOf, DAY_CLOSE, DAY_OPEN, formatTime, linkedWeek, localDay,
 minutes, weekOf, type CalendarProvider, type Interval,
} from '@/lib/harbor/model'
import { Sprig } from './sprigs'

const SLOT = 30, HOUR_PX = 40
const OPEN = minutes(DAY_OPEN), CLOSE = minutes(DAY_CLOSE)
const HOURS = Array.from({ length: (CLOSE - OPEN) / 60 }, (_, i) => OPEN + i * 60)
const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const topOf = (start: string) => ((minutes(start) - OPEN) / 60) * HOUR_PX
const heightOf = (v: Interval) => Math.max(((minutes(v.end) - minutes(v.start)) / 60) * HOUR_PX, 14)
const hourLabel = (m: number) => { const h = Math.floor(m / 60); return `${h % 12 || 12}${h < 12 ? 'a' : 'p'}` }
const shiftDay = (day: string, by: number) => { const d = new Date(`${day}T12:00:00`); d.setDate(d.getDate() + by); return localDay(d) }

type Draft = { column: number; from: number; to: number }

export function Schedule({ navigate }: { navigate: (page: string) => void }) {
 const { state, update } = useHarbor()
 const [anchor, setAnchor] = useState(localDay())
 const [draft, setDraft] = useState<Draft | null>(null)
 const [naming, setNaming] = useState<{ day: string; start: string; end: string } | null>(null)
 const [label, setLabel] = useState('')
 const [editing, setEditing] = useState<{ day: string; index: number; block: Interval } | null>(null)
 const [linkOpen, setLinkOpen] = useState(false)
 const grid = useRef<HTMLDivElement>(null)
 const week = useMemo(() => weekOf(anchor), [anchor])
 if (!state) return null
 const today = localDay()

 const setBlocks = (day: string, next: Interval[]) => update(s => {
  const existing = s.schedules[day] ?? { you: [], mom: [] }
  return { ...s, schedules: { ...s.schedules, [day]: { ...existing, you: next.slice().sort((a, b) => minutes(a.start) - minutes(b.start)) } } }
 })

 /* Press and drag down a column: the draft follows the finger, snapped to the half hour. */
 const read = (clientX: number, clientY: number) => {
  const box = grid.current?.getBoundingClientRect()
  if (!box) return null
  const column = Math.min(6, Math.max(0, Math.floor(((clientX - box.left) / box.width) * 7)))
  const raw = OPEN + ((clientY - box.top) / HOUR_PX) * 60
  return { column, at: Math.min(CLOSE, Math.max(OPEN, Math.round(raw / SLOT) * SLOT)) }
 }
 const startDrag = (e: React.PointerEvent) => {
  const hit = read(e.clientX, e.clientY)
  if (!hit) return
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  setDraft({ column: hit.column, from: hit.at, to: Math.min(CLOSE, hit.at + SLOT) })
 }
 const moveDrag = (e: React.PointerEvent) => {
  if (!draft) return
  const hit = read(e.clientX, e.clientY)
  if (!hit) return
  setDraft({ ...draft, to: Math.max(draft.from + SLOT, Math.min(CLOSE, hit.at)) })
 }
 const endDrag = () => {
  if (!draft) return
  const { column, from, to } = draft
  setDraft(null)
  if (to - from < SLOT) return
  setLabel('')
  setNaming({ day: week[column], start: clockOf(from), end: clockOf(to) })
 }
 const saveNamed = () => {
  if (!naming) return
  setBlocks(naming.day, [...blocksFor(state, naming.day, 'you'), { start: naming.start, end: naming.end, label: label.trim() || undefined }])
  setNaming(null); setLabel('')
  toast.success('Marked. Harbor stays quiet then.')
 }

 const connect = (provider: CalendarProvider) => {
  const filled = linkedWeek(anchor)
  update(s => {
   const schedules = { ...s.schedules }
   for (const [day, blocks] of Object.entries(filled)) {
    const existing = schedules[day] ?? { you: [], mom: [] }
    schedules[day] = { ...existing, you: [...existing.you.filter(v => !v.linked), ...blocks].sort((a, b) => minutes(a.start) - minutes(b.start)) }
   }
   return { ...s, schedules, calendar: { provider, connectedAt: new Date().toISOString() } }
  })
  setLinkOpen(false)
  toast.success(`${calendarProviders.find(c => c.id === provider)?.name} filled this week in.`)
 }
 const disconnect = () => {
  update(s => ({
   ...s, calendar: null,
   schedules: Object.fromEntries(Object.entries(s.schedules).map(([day, v]) => [day, { ...v, you: v.you.filter(b => !b.linked) }])),
  }))
  toast.success('Unlinked. Your own blocks are untouched.')
 }

 return <div className="entrance">
  <div className="page-head">
   <span className="eyebrow">Schedule</span>
   <h1>When you are busy.</h1>
   <p>Press and drag to lay down a block. Harbor stays quiet during these.</p>
  </div>

  <div className="wrap flow stagger">
   <p className="note-strip" style={{ ['--i' as string]: 0 }}><ShieldCheck aria-hidden="true"/>Only the times. What a block is called stays on this phone, even when you share.</p>

   <div className="card cal" style={{ ['--i' as string]: 1 }}>
    <div className="cal-week">
     <button type="button" className="cal-step" aria-label="Previous week" onClick={() => setAnchor(shiftDay(week[0], -7))}><ChevronLeft aria-hidden="true"/></button>
     <b>Week of {new Date(`${week[0]}T12:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</b>
     <button type="button" className="cal-step" aria-label="Next week" onClick={() => setAnchor(shiftDay(week[0], 7))}><ChevronRight aria-hidden="true"/></button>
    </div>

    <div className="cal-head" aria-hidden="true">
     <span/>
     {week.map((day, i) => <span key={day} data-today={day === today}>{LETTERS[i]}<i>{Number(day.slice(-2))}</i></span>)}
    </div>

    <div className="cal-body">
     <div className="cal-hours" aria-hidden="true">{HOURS.map(m => <span key={m} className="cal-hour">{hourLabel(m)}</span>)}</div>
     <div ref={grid} className="cal-grid" role="application"
      aria-label="Your week. Press and drag down a column to mark time as busy."
      onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={() => setDraft(null)}>
      {week.map((day, column) => <div key={day} className="cal-col" data-today={day === today}>
       {HOURS.map(m => <div key={m} className="cal-slot"/>)}
       {blocksFor(state, day, 'you').map((block, index) => <button key={`${block.start}-${index}`} type="button" className="cal-block"
        data-linked={!!block.linked} style={{ top: topOf(block.start), height: heightOf(block) }}
        onPointerDown={e => e.stopPropagation()} onClick={() => setEditing({ day, index, block })}>
        <b>{block.label || 'Busy'}</b>
        {heightOf(block) > 32 && <span>{formatTime(block.start)}</span>}
        {heightOf(block) > 46 && <Sprig kind="leaf" aria-hidden="true"/>}
       </button>)}
       {draft && draft.column === column && <span className="cal-draft"
        style={{ top: ((draft.from - OPEN) / 60) * HOUR_PX, height: ((draft.to - draft.from) / 60) * HOUR_PX }}/>}
      </div>)}
     </div>
    </div>

    <div className="cal-legend">
     <span><i className="swatch" style={{ background: 'var(--ink)' }} aria-hidden="true"/>Yours</span>
     <span><i className="swatch" style={{ background: 'var(--gold)' }} aria-hidden="true"/>From your calendar</span>
    </div>
   </div>

   {state.calendar
    ? <div className="row" style={{ ['--i' as string]: 2 }}>
     <span className="row-icon" style={{ background: 'var(--tint-yellow)' }}><Link2 aria-hidden="true"/></span>
     <span className="row-body"><b>{calendarProviders.find(c => c.id === state.calendar!.provider)?.name} is linked</b><span>New events fill themselves in</span></span>
     <button type="button" className="disc" style={{ width: 38, height: 38, boxShadow: 'none', background: 'var(--secondary)' }}
      aria-label="Unlink this calendar" onClick={disconnect}><Unlink aria-hidden="true"/></button>
    </div>
    : <button type="button" className="row" style={{ ['--i' as string]: 2 }} onClick={() => setLinkOpen(true)}>
     <span className="row-icon" style={{ background: 'var(--tint-blue)' }}><CalendarPlus aria-hidden="true"/></span>
     <span className="row-body"><b>Bring your calendar in</b><span>Outlook, Google or Apple, marks your week for you</span></span>
     <ChevronRight className="caret" aria-hidden="true"/>
    </button>}

   <button type="button" className="row" style={{ ['--i' as string]: 3 }} onClick={() => navigate('share')}>
    <span className="row-icon"><ShieldCheck aria-hidden="true"/></span>
    <span className="row-body"><b>Share my load</b><span>{state.sharing ? (state.momConsent ? 'On, both ways' : 'On, waiting on them') : 'Free and busy times only, when you say so'}</span></span>
    <ChevronRight className="caret" aria-hidden="true"/>
   </button>

   <p className="fineprint" style={{ ['--i' as string]: 4 }}>Editable demo schedule · nothing syncs to a real calendar</p>
  </div>

  <Dialog open={!!naming} onOpenChange={value => { if (!value) { setNaming(null); setLabel('') } }}><DialogContent>
   <DialogHeader>
    <DialogTitle>What is this?</DialogTitle>
    <DialogDescription>{naming && `${new Date(`${naming.day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long' })}, ${formatTime(naming.start)} – ${formatTime(naming.end)}. The name is only ever for you.`}</DialogDescription>
   </DialogHeader>
   <input className="input" maxLength={60} placeholder="Lecture, shift, dinner…" value={label} autoComplete="off"
    onChange={e => setLabel(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveNamed() } }}/>
   <div className="chips">{['Lecture', 'Work', 'Study', 'Gym', 'Dinner', 'Travel'].map(x =>
    <button key={x} type="button" className="chip-choice" aria-pressed={label === x} onClick={() => setLabel(x)}>{x}</button>)}</div>
   <button type="button" className="btn btn-block" onClick={saveNamed}>Mark This Time</button>
   <button type="button" className="btn btn-quiet btn-block" onClick={() => { setNaming(null); setLabel('') }}>Cancel</button>
  </DialogContent></Dialog>

  <Dialog open={!!editing} onOpenChange={value => !value && setEditing(null)}><DialogContent>
   {editing && <>
    <DialogHeader>
     <DialogTitle>{editing.block.label || 'Busy'}</DialogTitle>
     <DialogDescription>{new Date(`${editing.day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} · {formatTime(editing.block.start)} – {formatTime(editing.block.end)}{editing.block.linked ? ' · from your calendar' : ''}</DialogDescription>
    </DialogHeader>
    <button type="button" className="btn btn-soft btn-block" onClick={() => {
     setBlocks(editing.day, blocksFor(state, editing.day, 'you').filter((_, i) => i !== editing.index))
     setEditing(null); toast.success('Cleared. That time is yours again.')
    }}><Trash2 aria-hidden="true"/>Clear This Block</button>
    <button type="button" className="btn btn-quiet btn-block" onClick={() => setEditing(null)}>Leave it</button>
   </>}
  </DialogContent></Dialog>

  <Dialog open={linkOpen} onOpenChange={setLinkOpen}><DialogContent>
   <DialogHeader>
    <DialogTitle>Bring your calendar in</DialogTitle>
    <DialogDescription>Harbor reads when you are busy and marks those blocks for you. In this demo a sample week is filled in, nothing connects to a real account.</DialogDescription>
   </DialogHeader>
   {calendarProviders.map(provider => <button key={provider.id} type="button" className="row" onClick={() => connect(provider.id)}>
    <span className="row-icon" style={{ background: 'var(--tint-blue)' }}><CalendarDays aria-hidden="true"/></span>
    <span className="row-body"><b>{provider.name}</b><span>Fill this week from {provider.name}</span></span>
    <ChevronRight className="caret" aria-hidden="true"/>
   </button>)}
   <p className="note-strip"><ShieldCheck aria-hidden="true"/>Event titles stay on this phone. Only free and busy is ever shared, and only if you turn sharing on.</p>
  </DialogContent></Dialog>
 </div>
}
