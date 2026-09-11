'use client'
import { useState } from 'react'
import { Bell, CalendarDays, ChevronRight, Clock3, Phone, Sprout, Users, Waves } from 'lucide-react'
import { useHarbor } from '@/lib/harbor/store'
import {
 blocksFor, callsFor, dominantFlower, feelings, formatDuration, formatTime, freeWindows,
 localDay, minutes, sharedWindows, weatherIndex, type Moment,
} from '@/lib/harbor/model'
import type { Bloom } from '@/lib/harbor/meadow'
import { Avatar } from './avatar'
import { FeelingsCard, greetingFor } from './feelings'
import { FlowerGlyph } from './flowers'
import { Garden } from './garden'
import { NotesRail } from './notes'
import type { SnapIntent } from './snap'

const tabs = [
 { id: 'people', label: 'People', icon: Users },
 { id: 'schedule', label: 'Schedule', icon: CalendarDays },
 { id: 'activities', label: 'Activities', icon: Bell },
] as const
type Tab = typeof tabs[number]['id']

export function Home({ navigate, bloomId, onOpenSnap, onCall, onOpenMoment, onAddPerson }: {
 navigate: (page: string) => void; bloomId?: string
 onOpenSnap: (intent: SnapIntent) => void; onCall: (personId: string) => void
 onOpenMoment: (moment: Moment) => void; onAddPerson: () => void
}) {
 const { state } = useHarbor()
 const [tab, setTab] = useState<Tab>('people')
 if (!state) return null

 const total = state.people.reduce((n, p) => n + callsFor(state, p.id).length, 0)
 const day = localDay()
 const recent = state.moments.filter(m => m.kind === 'called' && m.flower).slice().sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5)

 return <div className="entrance">
  <div className="section section-first" style={{ marginTop: 8, marginBottom: 16 }}>
   <p className="eyebrow">A little closer, every day</p>
   <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-.8px', color: 'var(--ink)', margin: '6px 0' }}>Hey, {state.name}.</h1>
   <p style={{ margin: 0, fontSize: 16, color: '#6E7D6F' }}>{greetingFor(weatherIndex(state.weather))}</p>
  </div>

  <div className="garden-wrap">
   <Garden weather={state.weather} bloomId={bloomId} height={300} onAddPerson={onAddPerson}
    onOpenBloom={(bloom: Bloom) => onOpenMoment(bloom.moment)}/>
  </div>

  <div className="section"><FeelingsCard/></div>

  <section className="section" aria-labelledby="people-heading">
   <div className="row-head"><h2 id="people-heading">Your people</h2></div>
   <div className="tabs" role="tablist" aria-label="Your people">
    {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" className="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
     <Icon/>{label}
    </button>)}
   </div>

   {tab === 'people' && <div className="people-grid">
    {state.people.map(person => {
     const flower = dominantFlower(state, person.id)
     const calls = callsFor(state, person.id).length
     const messages = state.messages[person.id] ?? []
     const lastMessage = messages.at(-1)
     const unread = !!lastMessage && !lastMessage.mine && !state.read.includes(person.id)
     return <div key={person.id} className="person-card">
      <button type="button" className="person-top" style={{ width: '100%' }} onClick={() => navigate(`chat/${person.id}`)} aria-label={`Open your conversation with ${person.name}`}>
       <span style={{ position: 'relative' }}>
        <Avatar person={person.id}/>
        {unread && <span className="person-unread"/>}
       </span>
       {flower ? <FlowerGlyph kind={flower} size={28}/> : <ChevronRight className="size-4" style={{ color: 'var(--ink-faint)' }}/>}
      </button>
      <h3>{person.name}</h3>
      <p className="person-note">{lastMessage?.mine ? 'You: ' : ''}{lastMessage?.text ?? person.note ?? 'Say hello whenever.'}</p>
      <span className="person-foot"><Sprout/>{calls ? `${calls} ${calls === 1 ? 'flower' : 'flowers'} in their patch` : 'No calls yet'}</span>
      <button type="button" className="call-now" onClick={() => onCall(person.id)}><Phone/>Call now</button>
     </div>
    })}
   </div>}

   {tab === 'schedule' && <TodayAtAGlance navigate={navigate}/>}

   {tab === 'activities' && <div className="stack">
    {recent.length ? recent.map(moment => {
     const who = state.people.find(p => p.id === moment.person)
     const feeling = feelings.find(f => f.id === moment.feeling)
     return <button key={moment.id} type="button" className="line" onClick={() => onOpenMoment(moment)}>
      <span className={`line-icon tint-${who?.tone ?? 'green'}`}><FlowerGlyph kind={moment.flower ?? 'daisy'} size={22}/></span>
      <span className="line-body">
       <b>{moment.topic ? moment.topic : `A call with ${who?.name ?? 'family'}`}</b>
       <span>{formatDuration(moment.minutes)} · {feeling?.label.toLowerCase() ?? 'steady'} · {new Date(moment.at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
      </span>
      <ChevronRight/>
     </button>
    }) : <p className="empty-line">No calls yet. The first one plants the first flower.</p>}
   </div>}
  </section>

  <NotesRail navigate={navigate} onOpenSnap={onOpenSnap}/>

  <div className="section">
   <button type="button" className="line" onClick={() => navigate('cue')}>
    <span className="line-icon tint-sky"><Waves/></span>
    <span className="line-body"><b>Find a quiet moment</b><span>A cue at the end of a walk, never a demand</span></span>
    <ChevronRight/>
   </button>
  </div>

  <p className="footnote"><Sprout style={{ color: 'var(--leaf)' }}/>Small steps. Lighter days.<Sprout style={{ color: 'var(--leaf)' }}/></p>
  <p className="demo-footnote" style={{ marginTop: 10 }}>An interactive demo · saved only on this device</p>
  <div style={{ height: 8 }}/>
 </div>
}

/** The quick read of today, the same one the schedule screen keeps in full. */
function TodayAtAGlance({ navigate }: { navigate: (page: string) => void }) {
 const { state } = useHarbor()
 if (!state) return null
 const day = localDay()
 const mine = blocksFor(state, day, 'you').slice().sort((a, b) => minutes(a.start) - minutes(b.start))
 const free = freeWindows(mine)
 const shared = sharedWindows(state, day)
 const partner = state.people[0]

 return <div className="stack">
  {mine.length ? mine.map((block, i) => <div key={i} className="line">
   <span className="line-icon tint-gold"><Clock3/></span>
   <span className="line-body"><b>{block.label || 'Busy'}</b><span>{formatTime(block.start)} – {formatTime(block.end)}</span></span>
  </div>) : <p className="empty-line">Nothing marked today. A whole open day.</p>}

  {shared.length
   ? <div className="line" style={{ background: 'var(--gold-soft)', boxShadow: 'none' }}>
    <span className="line-icon" style={{ background: 'rgba(255,253,248,.7)' }}><Users/></span>
    <span className="line-body"><b>{formatTime(shared[0].start)} – {formatTime(shared[0].end)}</b><span>Free at the same time as {partner?.name ?? 'them'}</span></span>
   </div>
   : free.length
    ? <div className="line" style={{ background: '#E4F0E2', boxShadow: 'none' }}>
     <span className="line-icon" style={{ background: 'rgba(255,253,248,.7)' }}><Sprout/></span>
     <span className="line-body"><b>{formatTime(free[0].start)} – {formatTime(free[0].end)}</b><span>Your longest open stretch today</span></span>
    </div>
    : null}

  <button type="button" className="link" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('schedule')}>Open the full week <ChevronRight/></button>
 </div>
}
