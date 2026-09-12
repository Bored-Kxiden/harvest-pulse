'use client'
import { useState } from 'react'
import {
 BookOpen, Camera, ChevronRight, Clock3, Music, Phone, Sparkles, Sprout, Sun, Waves, Wind,
} from 'lucide-react'
import { toast } from 'sonner'
import { useHarbor } from '@/lib/harbor/store'
import {
 blocksFor, callsFor, dominantFlower, formatTime, freeWindows, localDay, minutes,
 sharedWindows, weatherIndex, weathers, type Moment,
} from '@/lib/harbor/model'
import { Avatar } from './avatar'
import { FlowerGlyph } from './flowers'
import { NotesRail } from './notes-rail'
import { Sprig } from './sprigs'

const TINTS = ['gold', 'green', 'orange', 'sky'] as const
const SPRIGS = ['tulip', 'leaf', 'cosmos', 'bell'] as const
const TOOLS = [
 { id: 'breathe', label: 'Breathe', icon: Wind, tint: 'var(--tint-blue)', line: 'Four in, six out, eight times.' },
 { id: 'move', label: 'Move', icon: Sprout, tint: 'var(--tint-yellow)', line: 'Round the block is enough.' },
 { id: 'read', label: 'Read', icon: BookOpen, tint: 'var(--tint-mint)', line: 'Ten pages, no phone.' },
 { id: 'reflect', label: 'Reflect', icon: Sun, tint: 'var(--tint-peach)', line: 'One line about today.' },
 { id: 'music', label: 'Music', icon: Music, tint: 'var(--tint-lilac)', line: 'The album you keep meaning to finish.' },
 { id: 'more', label: 'More', icon: Sparkles, tint: 'var(--tint-rose)', line: 'A longer list lives in your account.' },
]

export function Home({ navigate, onCall, onOpenMoment, onOpenCamera, onWeatherShown, onExpand }: {
 navigate: (page: string) => void
 onCall: (personId: string) => void
 onOpenMoment: (moment: Moment) => void
 onOpenCamera: () => void
 onWeatherShown: () => void
 onExpand: () => void
}) {
 const { state } = useHarbor()
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
    <div className="people-grid">
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
    <div className="tool-row" style={{ marginTop: 12 }}>
     {TOOLS.map(tool => {
      const Icon = tool.icon
      return <button key={tool.id} type="button" className="tool"
       onClick={() => tool.id === 'more' ? navigate('account') : toast.success(tool.line)}>
       <span className="tool-disc" style={{ background: tool.tint }}><Icon aria-hidden="true"/></span>
       <b>{tool.label}</b>
      </button>
     })}
    </div>
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

   <TodayAtAGlance navigate={navigate}/>

   <button type="button" className="row" style={{ ['--i' as string]: 5 }} onClick={() => navigate('cue')}>
    <span className="row-icon" style={{ background: 'var(--tint-blue)' }}><Waves aria-hidden="true"/></span>
    <span className="row-body"><b>Find a quiet moment</b><span>A cue at the end of a walk, never a demand</span></span>
    <ChevronRight className="caret" aria-hidden="true"/>
   </button>

   <p className="fineprint" style={{ ['--i' as string]: 6 }}>An interactive demo · saved only on this device</p>
  </div>
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

 return <section className="card feelings" aria-labelledby="feelings-heading" style={{ ['--i' as string]: 0 }}>
  <Sprig kind="tulip" className="feelings-sprig"/>
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

/** Today in three lines — the same read the schedule screen keeps in full. */
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
