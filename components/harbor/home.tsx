'use client'
import { useState } from 'react'
import { Bell, CalendarDays, ChevronRight, Clock3, Images, Phone, Sprout, Sun, Users, Waves } from 'lucide-react'
import { useHarbor } from '@/lib/harbor/store'
import {
 blocksFor, callingStage, callsFor, dominantFlower, feelings, formatDuration, formatTime, freeWindows, localDay,
 minutes, sharedWindows, weatherIndex, weathers, type Moment,
} from '@/lib/harbor/model'
import { Avatar } from './avatar'
import { FlowerGlyph } from './flowers'
import { NotesRail } from './notes-rail'
import { GrowthFlower } from './growth-flower'
import { Sprig } from './sprigs'

const TINTS = ['gold', 'green', 'orange', 'sky'] as const
const SPRIGS = ['tulip', 'leaf', 'cosmos', 'bell'] as const
const TABS = [
 { id: 'people', label: 'People', icon: Users },
 { id: 'schedule', label: 'Schedule', icon: CalendarDays },
 { id: 'activities', label: 'Activities', icon: Bell },
] as const
type Tab = typeof TABS[number]['id']

export function Home({ navigate, onCall, onOpenMoment, onOpenCamera, onOpenStory, onWeatherShown, onExpand }: {
 navigate: (page: string) => void
 onCall: (personId: string) => void
 onOpenMoment: (moment: Moment) => void
 onOpenCamera: () => void
 onOpenStory: () => void
 onWeatherShown: () => void
 onExpand: () => void
}) {
 const { state } = useHarbor()
 const [tab, setTab] = useState<Tab>('people')
 /* Which way the panel should arrive: tabs are a row, so the new view comes in
    from the side it lives on and the old one leaves the other way. */
 const [from, setFrom] = useState(0)
 const index = TABS.findIndex(t => t.id === tab)
 const choose = (next: Tab) => {
  if (next === tab) return
  setFrom(Math.sign(TABS.findIndex(t => t.id === next) - index))
  setTab(next)
 }
 if (!state) return null
 const partner = state.people[0]
 const windows = sharedWindows(state, localDay())

 return <div className="entrance">
  <div className="wrap flow stagger">
   <Feelings onWeatherShown={onWeatherShown}/>

   <section aria-labelledby="people-heading" style={{ ['--i' as string]: 1 }}>
    <div className="row-head">
     <h2 id="people-heading">
      Your people
      <svg className="squiggle" viewBox="0 0 54 12" fill="none" aria-hidden="true">
       <path d="M1 7c6-7 12 5 18-1s11 4 17-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
       <path d="M45.5 10c-3-2.4-5-4-5-6a2.4 2.4 0 0 1 5-.9 2.4 2.4 0 0 1 5 .9c0 2-2 3.6-5 6z" fill="currentColor" stroke="none"/>
      </svg>
     </h2>
     <button type="button" className="pill-link" onClick={onExpand}>View all <ChevronRight aria-hidden="true"/></button>
    </div>

    <div className="segment" role="tablist" aria-label="Your people"
     onKeyDown={e => {
      /* A tablist is one stop with arrows inside it, not three stops. */
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'Home' ? -index : e.key === 'End' ? TABS.length - 1 - index : 0
      if (!step) return
      e.preventDefault()
      const next = TABS[(index + step + TABS.length) % TABS.length]
      choose(next.id)
      requestAnimationFrame(() => document.getElementById(`tab-${next.id}`)?.focus())
     }}>
     <span className="segment-slide" style={{ ['--i' as string]: index }} aria-hidden="true"/>
     {TABS.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" id={`tab-${id}`}
      className="segment-tab" aria-selected={tab === id} aria-controls="people-panel"
      tabIndex={tab === id ? 0 : -1} onClick={() => choose(id)}>
      <Icon aria-hidden="true"/>{label}
     </button>)}
    </div>

    {/* Only this panel is replaced when the tab moves. Keying it on the tab is what
        makes the entrance run again; nothing above or below it is touched, so the
        card does not re-enter and the scroll stays where you left it. */}
    <div className="panel-swap" key={tab} id="people-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}
     style={{ ['--from' as string]: from }}>
    {tab === 'people' && <div className="people-grid">
     {state.people.map((person, i) => {
      const flower = dominantFlower(state, person.id)
      const calls = callsFor(state, person.id).length
      const last = (state.messages[person.id] ?? []).at(-1)
      const unread = !!last && !last.mine && !state.read.includes(person.id)
      return <div key={person.id} className={`person tint-${TINTS[i % TINTS.length]}`}>
       <Sprig kind={SPRIGS[i % SPRIGS.length]} className="person-sprig"/>
       <button type="button" className="person-top" onClick={() => navigate(`chat/${person.id}`)}
        aria-label={`Open your conversation with ${person.name}`}>
        <span style={{ position: 'relative' }}>
         <Avatar person={person.id}/>
         {unread && <span className="unread"/>}
        </span>
        <ChevronRight style={{ width: 15, height: 15, color: 'var(--ink-faint)' }} aria-hidden="true"/>
       </button>
       <h3>{person.name}</h3>
       <p className="person-note">{last?.mine ? 'You: ' : ''}{last?.text ?? person.note ?? 'Say hello whenever.'}</p>
       <span className="person-foot">
        {flower ? <FlowerGlyph kind={flower} size={13}/> : <Sprout aria-hidden="true"/>}
        {calls ? `${calls} ${calls === 1 ? 'flower' : 'flowers'} in their path` : 'No flowers yet'}
       </span>
       <button type="button" className="call-now" onClick={() => onCall(person.id)}>
        <Phone aria-hidden="true"/>Call {person.name}
       </button>
      </div>
     })}
    </div>}

    {tab === 'schedule' && <TodayAtAGlance navigate={navigate}/>}
    {tab === 'activities' && <Activities onOpenMoment={onOpenMoment}/>}
    </div>
   </section>

   <section aria-labelledby="something-heading" style={{ ['--i' as string]: 2 }}>
    <div className="row-head">
     <h2 id="something-heading">A little something</h2>
     <button type="button" className="text-link" onClick={() => navigate('notes')}>
      notes &amp; instants <ChevronRight aria-hidden="true"/>
     </button>
    </div>
    <NotesRail navigate={navigate} onOpenCamera={onOpenCamera}/>
    <button type="button" className="row" style={{ marginTop: 12 }} onClick={onOpenStory}>
     <span className="row-icon" style={{ background: 'var(--tint-blue)' }}><Images aria-hidden="true"/></span>
     <span className="row-body"><b>Today&rsquo;s instants</b><span>{state.snaps.length} from your people, before they fade</span></span>
     <ChevronRight className="caret" aria-hidden="true"/>
    </button>
   </section>

   <section className="tint-card" style={{ background: 'var(--tint-mint)', position: 'relative', overflow: 'hidden', ['--i' as string]: 3 }} aria-labelledby="window-heading">
    <Sprig kind="tulip" className="person-sprig" style={{ width: 72, bottom: 0 }}/>
    <span className="eyebrow" id="window-heading" style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--ink)' }}>
     <Sun style={{ width: 15, height: 15 }} aria-hidden="true"/>A little window, together
    </span>
    {!state.sharing
     ? <><h3 style={{ fontSize: 21, margin: '8px 0 4px', color: 'var(--ink-deep)' }}>Your rhythm stays yours.</h3>
      <p className="small" style={{ maxWidth: '78%' }}>Turn on Share my load to look for a window you are both free in.</p></>
     : !state.momConsent
      ? <><h3 style={{ fontSize: 21, margin: '8px 0 4px', color: 'var(--ink-deep)' }}>It takes two.</h3>
       <p className="small" style={{ maxWidth: '78%' }}>Turn on Mutual sharing once {partner?.name ?? 'they'} {partner ? 'is' : 'are'} ready.</p></>
      : windows.length
       ? <><h3 style={{ fontSize: 24, margin: '8px 0 4px', color: 'var(--ink-deep)' }}>{formatTime(windows[0].start)} – {formatTime(windows[0].end)}</h3>
        <p className="small">{minutes(windows[0].end) - minutes(windows[0].start)} unhurried minutes, today. A possibility, not an obligation.</p></>
       : <><h3 style={{ fontSize: 21, margin: '8px 0 4px', color: 'var(--ink-deep)' }}>A full day for both of you.</h3>
        <p className="small" style={{ maxWidth: '78%' }}>No overlap today. Try another day, or leave a little note.</p></>}
    <button type="button" className="text-link" style={{ marginTop: 4 }} onClick={() => navigate('share')}>
     Open Share my load <ChevronRight aria-hidden="true"/>
    </button>
   </section>

   <button type="button" className="row" style={{ ['--i' as string]: 5 }} onClick={() => navigate('cue')}>
    <span className="row-icon" style={{ background: 'var(--tint-blue)' }}><Waves aria-hidden="true"/></span>
    <span className="row-body"><b>Find a quiet moment</b><span>A cue at the end of a walk, never a demand</span></span>
    <ChevronRight className="caret" aria-hidden="true"/>
   </button>

   <p className="fineprint" style={{ ['--i' as string]: 6 }}>An interactive demo · saved only on this device</p>
  </div>
 </div>
}

/** What has actually happened lately: every call, newest first. */
function Activities({ onOpenMoment }: { onOpenMoment: (moment: Moment) => void }) {
 const { state } = useHarbor()
 if (!state) return null
 const recent = state.moments
  .filter(m => m.kind === 'called' && m.flower)
  .slice().sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5)
 if (!recent.length) return <p className="empty">No calls yet. The first one plants the first flower.</p>
 return <div className="flow stagger" style={{ gap: 9 }}>
  {recent.map((moment, i) => {
   const who = state.people.find(p => p.id === moment.person)
   const feeling = feelings.find(f => f.id === moment.feeling)
   return <button key={moment.id} type="button" className="row" style={{ ['--i' as string]: i }} onClick={() => onOpenMoment(moment)}>
    <span className={`row-icon tint-${who?.tone ?? 'green'}`}><FlowerGlyph kind={moment.flower ?? 'daisy'} size={19} blooming/></span>
    <span className="row-body">
     <b>{moment.topic || `A call with ${who?.name ?? 'family'}`}</b>
     <span>{formatDuration(moment.minutes)} · {feeling?.label.toLowerCase() ?? 'steady'} · {new Date(moment.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
    </span>
    <ChevronRight className="caret" aria-hidden="true"/>
   </button>
  })}
 </div>
}

/** The sky you set by hand. Moving it turns the weather over behind the sheet. */
function Feelings({ onWeatherShown }: { onWeatherShown: () => void }) {
 const { state, update } = useHarbor()
 const [dragging, setDragging] = useState(false)
 const [track, setTrack] = useState<HTMLDivElement | null>(null)
 if (!state) return null
 const last = weathers.length - 1
 const index = weatherIndex(state.weather)
 const current = weathers[index]

 const setIndex = (next: number) => {
  const clamped = Math.min(last, Math.max(0, next))
  if (weathers[clamped].id !== state.weather) { update(s => ({ ...s, weather: weathers[clamped].id })); onWeatherShown() }
 }
 const fromX = (clientX: number) => {
  const rect = track?.getBoundingClientRect()
  if (!rect || rect.width <= 48) return
  setIndex(Math.round(((clientX - rect.left - 24) / (rect.width - 48)) * last))
 }

 const stage = callingStage(state)
 return <section className="card feelings" aria-labelledby="feelings-heading" style={{ ['--i' as string]: 0 }}>
  <GrowthFlower stage={stage} className="feelings-sprig"/>
  <span className="eyebrow" id="feelings-heading">Your feelings right now</span>
  <h2>{current.label}</h2>
  <p>{current.caption}</p>
  <div ref={setTrack} className="mood" data-dragging={dragging}
   role="slider" tabIndex={0} aria-valuemin={0} aria-valuemax={last} aria-valuenow={index}
   aria-valuetext={`${current.label}. ${current.caption}`} aria-label="How life feels right now"
   onPointerDown={e => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setDragging(true); fromX(e.clientX) }}
   onPointerMove={e => { if (dragging) fromX(e.clientX) }}
   onPointerUp={() => setDragging(false)} onPointerCancel={() => setDragging(false)}
   onKeyDown={e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setIndex(index - 1) }
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setIndex(index + 1) }
    if (e.key === 'Home') { e.preventDefault(); setIndex(0) }
    if (e.key === 'End') { e.preventDefault(); setIndex(last) }
   }}>
   <span className="mood-rail"/>
   <span className="mood-fill" style={{ ['--p' as string]: index / last }}/>
   <span className="mood-run" style={{ ['--p' as string]: index / last }}>
    <span className="mood-knob"><Sprout aria-hidden="true"/></span>
   </span>
  </div>
  <div className="mood-scale"><span>Low</span><span>On your path</span><span>Easy</span></div>
 </section>
}

/** Today in three lines: the same read the schedule screen keeps in full. */
function TodayAtAGlance({ navigate }: { navigate: (page: string) => void }) {
 const { state } = useHarbor()
 if (!state) return null
 const day = localDay()
 const mine = blocksFor(state, day, 'you').slice().sort((a, b) => minutes(a.start) - minutes(b.start))
 const free = freeWindows(mine)
 return <section aria-labelledby="today-heading" style={{ ['--i' as string]: 4 }}>
  <div className="row-head">
   <h2 id="today-heading" style={{ fontSize: 20 }}>Today</h2>
   <button type="button" className="text-link" onClick={() => navigate('schedule')}>the whole week <ChevronRight aria-hidden="true"/></button>
  </div>
  <div className="flow" style={{ gap: 9 }}>
   {mine.length ? mine.slice(0, 2).map((block, i) => <div key={i} className="row">
    <span className="row-icon" style={{ background: 'var(--tint-yellow)' }}><Clock3 aria-hidden="true"/></span>
    <span className="row-body"><b>{block.label || 'Busy'}</b><span>{formatTime(block.start)} – {formatTime(block.end)}</span></span>
   </div>) : <p className="empty">Nothing marked today. A whole open day.</p>}
   {!!free.length && <div className="row" style={{ background: 'var(--tint-mint)', boxShadow: 'none' }}>
    <span className="row-icon" style={{ background: 'rgb(254 252 245 / .7)' }}><Sprout aria-hidden="true"/></span>
    <span className="row-body"><b>{formatTime(free[0].start)} – {formatTime(free[0].end)}</b><span>Your longest open stretch</span></span>
   </div>}
  </div>
 </section>
}
