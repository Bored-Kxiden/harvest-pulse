'use client'
import { useMemo, useRef, useState } from 'react'
import { CalendarClock, CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Leaf, Link2, ShieldCheck, Sun, Trash2, Unlink, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { makeId, useHarbor } from '@/lib/harbor/store'
import {
 blocksFor, calendarProviders, clockOf, DAY_CLOSE, DAY_OPEN, formatTime, isFuture, linkedWeek, localDay,
 minutes, sharedWindows, weekOf, type CalendarProvider, type Interval,
} from '@/lib/harbor/model'

const SLOT = 30            /* half an hour is the finest thing worth dragging */
const HOUR_PX = 42
const OPEN = minutes(DAY_OPEN), CLOSE = minutes(DAY_CLOSE)
const HOURS = Array.from({ length: (CLOSE - OPEN) / 60 }, (_, i) => OPEN + i * 60)
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const topOf = (start: string) => ((minutes(start) - OPEN) / 60) * HOUR_PX
const heightOf = (v: Interval) => Math.max(((minutes(v.end) - minutes(v.start)) / 60) * HOUR_PX, 14)
const hourLabel = (m: number) => { const h = Math.floor(m / 60); return `${h % 12 || 12}${h < 12 ? 'a' : 'p'}` }

type Draft = { day: string; column: number; from: number; to: number }

export function Schedule({ navigate, onSetUpSharing }: { navigate: (page: string) => void; onSetUpSharing: () => void }) {
 const { state, update, log } = useHarbor()
 const [anchor, setAnchor] = useState(localDay())
 const [whose, setWhose] = useState<'you' | 'mom'>('you')
 const [draft, setDraft] = useState<Draft | null>(null)
 const [naming, setNaming] = useState<{ day: string; start: string; end: string } | null>(null)
 const [label, setLabel] = useState('')
 const [editing, setEditing] = useState<{ day: string; index: number; block: Interval } | null>(null)
 const [linkOpen, setLinkOpen] = useState(false)
 const [milestone, setMilestone] = useState(false)
 const [plan, setPlan] = useState(false)
 const [when, setWhen] = useState('')
 const [planError, setPlanError] = useState('')
 const grid = useRef<HTMLDivElement>(null)
 const week = useMemo(() => weekOf(anchor), [anchor])
 if (!state) return null

 const partner = state.people[0]
 const today = localDay()
 const theirsVisible = state.sharing && state.momConsent
 const person = whose === 'mom' && theirsVisible ? 'mom' : 'you'
 const days = Math.ceil((new Date(`${state.milestone.date}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86400000)
 const windows = sharedWindows(state, today)

 const setBlocks = (day: string, next: Interval[]) => update(s => {
  const existing = s.schedules[day] ?? { you: [], mom: [] }
  const sorted = next.slice().sort((a, b) => minutes(a.start) - minutes(b.start))
  return { ...s, schedules: { ...s.schedules, [day]: { ...existing, [person]: sorted } } }
 })

 /* ---------- press and drag to lay down a block ---------- */
 const readPointer = (clientX: number, clientY: number) => {
  const box = grid.current?.getBoundingClientRect()
  if (!box) return null
  const column = Math.min(6, Math.max(0, Math.floor(((clientX - box.left) / box.width) * 7)))
  const raw = OPEN + ((clientY - box.top) / HOUR_PX) * 60
  return { column, at: Math.min(CLOSE, Math.max(OPEN, Math.round(raw / SLOT) * SLOT)) }
 }
 const startDrag = (e: React.PointerEvent) => {
  if (person === 'mom') return
  const hit = readPointer(e.clientX, e.clientY)
  if (!hit) return
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  setDraft({ day: week[hit.column], column: hit.column, from: hit.at, to: Math.min(CLOSE, hit.at + SLOT) })
 }
 const moveDrag = (e: React.PointerEvent) => {
  if (!draft) return
  const hit = readPointer(e.clientX, e.clientY)
  if (!hit) return
  setDraft({ ...draft, to: Math.max(draft.from + SLOT, Math.min(CLOSE, hit.at)) })
 }
 const endDrag = () => {
  if (!draft) return
  const { day, from, to } = draft
  setDraft(null)
  if (to - from < SLOT) return
  setLabel('')
  setNaming({ day, start: clockOf(from), end: clockOf(to) })
 }
 const saveNamed = () => {
  if (!naming) return
  const block: Interval = { start: naming.start, end: naming.end, label: label.trim() || undefined }
  setBlocks(naming.day, [...blocksFor(state, naming.day, person), block])
  setNaming(null); setLabel('')
  toast.success('Marked. Harbor stays quiet then.')
 }

 const connect = (provider: CalendarProvider) => {
  const filled = linkedWeek(anchor)
  update(s => {
   const schedules = { ...s.schedules }
   for (const [day, blocks] of Object.entries(filled)) {
    const existing = schedules[day] ?? { you: [], mom: [] }
    const kept = existing.you.filter(v => !v.linked)
    schedules[day] = { ...existing, you: [...kept, ...blocks].sort((a, b) => minutes(a.start) - minutes(b.start)) }
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

 const monthLabel = new Date(`${week[0]}T12:00:00`).toLocaleDateString('en', { month: 'long', day: 'numeric' })

 return <div className="entrance">
  <div className="page-intro">
   <p className="eyebrow">Room for real life</p>
   <h1>When you are busy.</h1>
   <p>Press and drag to lay down a block. Harbor stays quiet during these.</p>
  </div>

  <div className="section section-first flow">
   <p className="notice"><ShieldCheck/>Only the times. What a block is called stays on this phone, even when you share.</p>

   <div className="card cal-card">
    <div className="cal-week">
     <button type="button" className="icon-button" aria-label="Previous week" onClick={() => setAnchor(shiftDay(week[0], -7))}><ChevronLeft/></button>
     <b>Week of {monthLabel}</b>
     <button type="button" className="icon-button" aria-label="Next week" onClick={() => setAnchor(shiftDay(week[0], 7))}><ChevronRight/></button>
    </div>

    {theirsVisible && <div className="tabs" role="tablist" aria-label="Whose week">
     <button type="button" role="tab" className="tab" aria-selected={whose === 'you'} onClick={() => setWhose('you')}>Your week</button>
     <button type="button" role="tab" className="tab" aria-selected={whose === 'mom'} onClick={() => setWhose('mom')}>{partner?.name ?? 'Theirs'}</button>
    </div>}

    <div className="cal-head">
     <span/>
     {week.map((day, i) => <span key={day} data-today={day === today}>{DAY_LETTERS[i]}<i>{Number(day.slice(-2))}</i></span>)}
    </div>

    <div className="cal-body">
     <div className="cal-hours">{HOURS.map(m => <span key={m} className="cal-hour">{hourLabel(m)}</span>)}</div>
     <div ref={grid} className="cal-grid" role="application"
      aria-label={person === 'you' ? 'Your week. Press and drag down a column to mark time as busy.' : `${partner?.name ?? 'Their'} week, read only.`}
      onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={() => setDraft(null)}>
      {week.map((day, column) => <div key={day} className="cal-col" data-today={day === today}>
       {HOURS.map(m => <div key={m} className="cal-slot"/>)}
       {blocksFor(state, day, person).map((block, index) => <button key={`${block.start}-${index}`} type="button" className="cal-block"
        data-linked={!!block.linked} data-theirs={person === 'mom'}
        style={{ top: topOf(block.start), height: heightOf(block) }}
        onPointerDown={e => e.stopPropagation()}
        onClick={() => person === 'you' && setEditing({ day, index, block })}>
        <b>{block.label || 'Busy'}</b>
        {heightOf(block) > 30 && <span>{formatTime(block.start)}</span>}
       </button>)}
       {draft && draft.column === column && <span className="cal-draft" style={{ top: ((draft.from - OPEN) / 60) * HOUR_PX, height: ((draft.to - draft.from) / 60) * HOUR_PX }}/>}
      </div>)}
     </div>
    </div>

    <div className="cal-legend">
     <span><i className="cal-swatch" style={{ background: 'var(--ink)' }}/>Yours</span>
     <span><i className="cal-swatch" style={{ background: 'var(--gold)' }}/>From your calendar</span>
     {theirsVisible && <span><i className="cal-swatch" style={{ background: '#CFE0CC' }}/>{partner?.name ?? 'Theirs'}</span>}
    </div>
   </div>

   {state.calendar
    ? <div className="line">
     <span className="line-icon tint-gold"><Link2/></span>
     <span className="line-body"><b>{calendarProviders.find(c => c.id === state.calendar!.provider)?.name} is linked</b><span>New events fill themselves in</span></span>
     <button type="button" className="icon-button" aria-label="Unlink this calendar" onClick={disconnect}><Unlink/></button>
    </div>
    : <button type="button" className="line" onClick={() => setLinkOpen(true)}>
     <span className="line-icon tint-sky"><CalendarPlus/></span>
     <span className="line-body"><b>Bring your calendar in</b><span>Outlook, Google or Apple — marks your week for you</span></span>
     <ChevronRight/>
    </button>}

   <section className="card card-pad flow">
    <div className="switch-row">
     <div><b>Share my load</b><p className="small-copy">Free and busy times only.</p></div>
     <button type="button" className="toggle" aria-pressed={state.sharing} aria-label="Share my load"
      onClick={() => state.sharingSetupDone ? update(s => ({ ...s, sharing: !s.sharing })) : onSetUpSharing()}/>
    </div>
    {state.sharing && <div className="switch-row">
     <div><b>Mutual sharing</b><p className="small-copy">{partner?.name ?? 'They'} shares back.</p></div>
     <button type="button" className="toggle" aria-pressed={state.momConsent} aria-label={`Mutual sharing with ${partner?.name ?? 'them'}`}
      onClick={() => update(s => ({ ...s, momConsent: !s.momConsent }))}/>
    </div>}
   </section>

   <section className="mint-card flow">
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Sun className="size-5"/><span className="eyebrow" style={{ color: 'var(--ink)' }}>A little window, together</span></div>
    {!state.sharing ? <><h2 style={{ fontSize: 24, color: 'var(--ink)' }}>Your rhythm stays yours.</h2><p className="small-copy">Turn on Share my load to look for a window you are both free in.</p></>
     : !state.momConsent ? <><h2 style={{ fontSize: 24, color: 'var(--ink)' }}>It takes two.</h2><p className="small-copy">Turn on Mutual sharing once you are both ready.</p></>
      : windows.length ? <>
       {windows.slice(0, 2).map(w => <div key={w.start}>
        <h2 style={{ fontSize: 26, color: 'var(--ink)' }}>{formatTime(w.start)} – {formatTime(w.end)}</h2>
        <p className="small-copy">{minutes(w.end) - minutes(w.start)} unhurried minutes · today</p>
       </div>)}
       <p className="small-copy">A possibility, not an obligation.</p>
       <button type="button" className="btn btn-line" onClick={() => setPlan(true)}>Make a little plan <ChevronRight/></button>
      </> : <>
       <h2 style={{ fontSize: 24, color: 'var(--ink)' }}>A full day for both of you.</h2>
       <p className="small-copy">No overlap today. That&apos;s okay — try another day, or leave a little note.</p>
       <button type="button" className="btn btn-line" onClick={() => navigate(`chat/${partner?.id ?? ''}`)}>Leave {partner?.name ?? 'them'} a note</button>
      </>}
   </section>

   <button type="button" className="gold-card" style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', width: '100%' }} onClick={() => setMilestone(true)}>
    <CalendarDays className="size-6" strokeWidth={1.5}/>
    <span style={{ flex: 1 }}>
     <span style={{ display: 'block', fontFamily: 'var(--font-round), sans-serif', fontWeight: 700, fontSize: 17, color: 'var(--ink-deep)' }}>
      {state.milestone.title} {days > 0 ? `in ${days % 7 === 0 ? `${days / 7} weeks` : `${days} days`}` : days === 0 ? 'today' : '— a season you moved through'}
     </span>
     <span className="small-copy">A little context goes a long way.</span>
    </span>
    <ChevronRight className="size-4"/>
   </button>

   <p className="demo-footnote">Editable demo schedule · nothing syncs to a real calendar</p>
  </div>

  <Dialog open={!!naming} onOpenChange={value => { if (!value) { setNaming(null); setLabel('') } }}><DialogContent>
   <DialogHeader>
    <DialogTitle>What is this?</DialogTitle>
    <DialogDescription>{naming && `${new Date(`${naming.day}T12:00:00`).toLocaleDateString('en', { weekday: 'long' })}, ${formatTime(naming.start)} – ${formatTime(naming.end)}. The name is only ever for you.`}</DialogDescription>
   </DialogHeader>
   <input className="input" autoFocus maxLength={60} placeholder="Lecture, shift, dinner…" value={label}
    onChange={e => setLabel(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveNamed() } }}/>
   <div className="choice-row">{['Lecture', 'Work', 'Study', 'Gym', 'Dinner', 'Travel'].map(x => <button key={x} type="button" className="choice" aria-pressed={label === x} onClick={() => setLabel(x)}>{x}</button>)}</div>
   <button type="button" className="btn btn-block" onClick={saveNamed}>Mark this time</button>
   <button type="button" className="btn btn-quiet btn-block" onClick={() => { setNaming(null); setLabel('') }}>Cancel</button>
  </DialogContent></Dialog>

  <Dialog open={!!editing} onOpenChange={value => !value && setEditing(null)}><DialogContent>
   {editing && <>
    <DialogHeader>
     <DialogTitle>{editing.block.label || 'Busy'}</DialogTitle>
     <DialogDescription>{new Date(`${editing.day}T12:00:00`).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })} · {formatTime(editing.block.start)} – {formatTime(editing.block.end)}{editing.block.linked ? ' · from your calendar' : ''}</DialogDescription>
    </DialogHeader>
    <button type="button" className="btn btn-soft btn-block" onClick={() => {
     const next = blocksFor(state, editing.day, 'you').filter((_, i) => i !== editing.index)
     setBlocks(editing.day, next); setEditing(null); toast.success('Cleared. That time is yours again.')
    }}><Trash2/>Clear this block</button>
    <button type="button" className="btn btn-quiet btn-block" onClick={() => setEditing(null)}>Leave it</button>
   </>}
  </DialogContent></Dialog>

  <Dialog open={linkOpen} onOpenChange={setLinkOpen}><DialogContent>
   <DialogHeader>
    <DialogTitle>Bring your calendar in</DialogTitle>
    <DialogDescription>Harbor reads when you are busy and marks those blocks for you. In this demo a sample week is filled in — nothing connects to a real account.</DialogDescription>
   </DialogHeader>
   {calendarProviders.map(provider => <button key={provider.id} type="button" className="line" onClick={() => connect(provider.id)}>
    <span className="line-icon tint-sky"><CalendarDays/></span>
    <span className="line-body"><b>{provider.name}</b><span>Fill this week from {provider.name}</span></span>
    <ChevronRight/>
   </button>)}
   <p className="notice"><ShieldCheck/>Event titles stay on this phone. Only free and busy is ever shared, and only if you turn sharing on.</p>
  </DialogContent></Dialog>

  <Dialog open={milestone} onOpenChange={setMilestone}><DialogContent>
   <DialogHeader><DialogTitle>What&apos;s on the horizon?</DialogTitle><DialogDescription>Private context for your season. Nothing to keep up with.</DialogDescription></DialogHeader>
   <form className="flow" onSubmit={e => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    update(s => ({ ...s, milestone: { title: String(f.get('title')).trim(), date: String(f.get('date')) } }))
    setMilestone(false)
   }}>
    <div><label className="field-label" htmlFor="milestone-title">Milestone</label><input className="input" name="title" id="milestone-title" defaultValue={state.milestone.title} maxLength={60} required/></div>
    <div><label className="field-label" htmlFor="milestone-date">Date</label><input className="input" name="date" id="milestone-date" type="date" defaultValue={state.milestone.date} required/></div>
    <button type="submit" className="btn btn-block">Save this season</button>
   </form>
  </DialogContent></Dialog>

  <Dialog open={plan} onOpenChange={setPlan}><DialogContent>
   <DialogHeader><DialogTitle>Leave a little room.</DialogTitle><DialogDescription>A reminder is a possibility, not a promise. It shows up when the time comes and never nags.</DialogDescription></DialogHeader>
   <div><label className="field-label" htmlFor="plan-when">A time that suits you</label>
    <input className="input" id="plan-when" type="datetime-local" value={when} onChange={e => { setWhen(e.target.value); setPlanError('') }} aria-invalid={!!planError}/></div>
   {planError && <p role="alert" className="small-copy" style={{ color: 'var(--destructive)' }}>{planError}</p>}
   <button type="button" className="btn btn-block" onClick={() => {
    if (!isFuture(when)) { setPlanError('Choose a time still ahead of you.'); return }
    log({ id: makeId(), at: new Date().toISOString(), person: partner?.id ?? 'family', kind: 'proposed_later', text: 'Made a little room to talk later.', source: 'manual', proposedTime: new Date(when).toISOString() })
    setPlan(false); setWhen(''); toast.success('Saved. No pressure attached.')
   }}><CalendarClock/>Hold that time</button>
  </DialogContent></Dialog>
 </div>
}

function shiftDay(day: string, by: number) {
 const d = new Date(`${day}T12:00:00`)
 d.setDate(d.getDate() + by)
 return localDay(d)
}
