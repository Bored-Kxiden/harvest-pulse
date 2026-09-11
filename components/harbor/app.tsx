'use client'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, BookHeart, CalendarDays, House, Images, Leaf, Sprout, UserRound } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { makeId, useHarbor } from '@/lib/harbor/store'
import { activePacts, localDay, rollSnapWindow, snapWindowDue, type Moment } from '@/lib/harbor/model'
import { Home } from './home'
import { Schedule } from './schedule'
import { SettingsScreen } from './settings'
import { Conversation } from './conversation'
import { CueOverlay, CueScreen, type Cue } from './cue'
import { CallFlow } from './call'
import { DailyQuestion } from './daily-question'
import { GlassCase } from './glass-case'
import { SharingSetup, useSharing } from './sharing'
import { SnapPrompt, SnapSheet, type SnapIntent } from './snap'

const tabs = [{ id: 'home', label: 'Home', icon: House }, { id: 'schedule', label: 'Schedule', icon: CalendarDays }]
const rightTabs = [{ id: 'scrapbook', label: 'Scrapbook', icon: Images }, { id: 'settings', label: 'Account', icon: UserRound }]

export function HarborApp() {
 const [route, setRoute] = useState('home')
 const { state, update } = useHarbor()
 const [cue, setCue] = useState<Cue | null>(null)
 const [call, setCall] = useState<{ person: string; topic?: string } | null>(null)
 const [bloom, setBloom] = useState<string>()
 const [question, setQuestion] = useState(false)
 const [snap, setSnap] = useState<SnapIntent | null>(null)
 const [windowDue, setWindowDue] = useState(false)
 const [moment, setMoment] = useState<Moment | null>(null)
 const sharing = useSharing()
 const asked = useRef(false)
 const day = localDay()
 const needsWindow = !!state && activePacts(state).length > 0 && !state.snapWindows[day]

 /* One roll a day, the moment a pact exists — nobody, including this app, knows it in advance. */
 useEffect(() => { if (needsWindow) update(s => ({ ...s, snapWindows: { ...s.snapWindows, [day]: rollSnapWindow() } })) }, [needsWindow, day])

 useEffect(() => {
  if (!state) return
  let skipped = false
  try { skipped = sessionStorage.getItem('harbor-window') === day } catch { /* storage can be blocked; the window simply asks again */ }
  const check = () => setWindowDue(!skipped && snapWindowDue(state))
  check()
  const timer = setInterval(check, 20000)
  return () => clearInterval(timer)
 }, [state, day])

 useEffect(() => {
  const sync = () => { setRoute(location.hash.slice(1) || 'home'); window.scrollTo(0, 0) }
  sync(); window.addEventListener('hashchange', sync); return () => window.removeEventListener('hashchange', sync)
 }, [])

 useEffect(() => {
  if (!state || asked.current) return
  asked.current = true
  const today = localDay()
  let skipped = false
  try { skipped = sessionStorage.getItem('harbor-question') === today } catch { /* private mode blocks session storage; the question simply shows again */ }
  if (!state.games[today] && !skipped) { const timer = setTimeout(() => setQuestion(true), 900); return () => clearTimeout(timer) }
 }, [state])

 const navigate = (next: string) => { location.hash = next }
 const page = route.split('/')[0]
 const top = ['home', 'schedule', 'settings', 'scrapbook'].includes(page)

 const fireCue = (personId: string) => {
  const id = makeId()
  update(s => ({ ...s, cues: [...s.cues, { id, at: new Date().toISOString() }] }))
  setCue({ id, person: personId })
 }
 const closeQuestion = (value: boolean) => {
  setQuestion(value)
  if (!value) { try { sessionStorage.setItem('harbor-question', localDay()) } catch { /* nothing to remember if storage is blocked */ } }
 }

 return <div className="app-shell" data-reduced-motion={state?.settings.reducedMotion}>
  <div className="ambient" aria-hidden="true">
   <span className="ambient-glow"/><span className="ambient-puff"/><span className="ambient-puff"/><span className="ambient-puff"/>
   <div className="ambient-botany">
    <svg className="left" viewBox="0 0 190 210" fill="none">
     <path d="M8 210C4 160 26 128 62 112c-30 34-34 66-24 98z" fill="#BFE0AE"/>
     <path d="M36 210c-14-46 4-92 44-116-26 36-32 76-22 116z" fill="#A8D298"/>
     <path d="M70 210c-6-52 18-92 58-112-30 34-42 70-38 112z" fill="#CFE8BC"/>
     <path d="M104 210c8-40 2-70-14-92 30 16 44 50 38 92z" fill="#B6D9A4"/>
     <ellipse cx="42" cy="128" rx="15" ry="20" fill="#F2A254"/>
     <path d="M42 148v46" stroke="#7FB56D" strokeWidth="5" strokeLinecap="round"/>
     <ellipse cx="30" cy="126" rx="9" ry="17" fill="#F5B76F"/>
     <ellipse cx="54" cy="126" rx="9" ry="17" fill="#EE9445"/>
    </svg>
    <svg className="right" viewBox="0 0 200 210" fill="none">
     <path d="M192 210c6-52-18-92-58-112 30 34 42 70 38 112z" fill="#BFE0AE"/>
     <path d="M160 210c14-46-4-92-44-116 26 36 32 76 22 116z" fill="#A8D298"/>
     <path d="M126 210c6-52-18-92-58-112 30 34 42 70 38 112z" fill="#CFE8BC"/>
     <ellipse cx="156" cy="132" rx="15" ry="20" fill="#F7CE63"/>
     <path d="M156 152v42" stroke="#7FB56D" strokeWidth="5" strokeLinecap="round"/>
     <ellipse cx="144" cy="130" rx="9" ry="17" fill="#FADC86"/>
     <ellipse cx="168" cy="130" rx="9" ry="17" fill="#F2BE45"/>
    </svg>
   </div>
  </div>

  <div className="page">
   <a href="#main" className="sr-only">Skip to content</a>
   <header className="app-header">
    {top
     ? <a href="#home" className="brand" aria-label="Harbor home">
      <svg viewBox="0 0 32 32" fill="none"><path d="M16 29V14" stroke="#2F6B43" strokeWidth="3" strokeLinecap="round"/><path d="M15 15.5c-1.2-5-5-7.6-11-8 .4 6.6 3.8 10 11 8z" fill="#5AA76B"/><path d="M17 13c1-5.6 4.8-8.8 11.6-9.4C28.2 11 24.4 15 17 13z" fill="#79BC7F"/></svg>
      harbor
     </a>
     : <button className="icon-button" onClick={() => navigate('home')} aria-label="Go back"><ArrowLeft/></button>}
    <span className="head-acts">
     <button type="button" className="round-button" aria-label="A little something" onClick={() => navigate('home')}>
      <BookHeart/>{!!state?.notes.length && <i/>}
     </button>
     <a href="#settings" className="round-button" data-tint="leaf" aria-label="Your account"><Sprout/></a>
    </span>
   </header>

   <main id="main">{!state
    ? <div className="section" role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingTop: 90 }}>
     <Sprout className="size-10" style={{ color: 'var(--leaf)' }}/>
     <p style={{ fontFamily: 'var(--font-round), sans-serif', fontSize: 21, fontWeight: 700, color: 'var(--ink)' }}>Making a little room for you…</p>
    </div>
    : <>
     {page === 'home' && <Home navigate={navigate} bloomId={bloom} onOpenSnap={setSnap} onCall={person => setCall({ person })}
      onOpenMoment={setMoment} onAddPerson={() => navigate('settings')}/>}
     {page === 'schedule' && <Schedule navigate={navigate} onSetUpSharing={sharing.open}/>}
     {page === 'settings' && <SettingsScreen navigate={navigate}/>}
     {page === 'chat' && <Conversation key={route} person={route.split('/')[1] || state.people[0]?.id} navigate={navigate} onCall={person => setCall({ person })}/>}
     {page === 'cue' && <CueScreen navigate={navigate} onFire={fireCue}/>}
     {!['home', 'schedule', 'settings', 'chat', 'cue', 'scrapbook'].includes(page) && <div className="section">
      <p className="small-copy">This path is still growing.</p>
      <button className="link" onClick={() => navigate('home')}>Back home</button>
     </div>}
    </>}</main>
  </div>

  <nav className="bottom-nav" aria-label="Main navigation">
   {tabs.map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`} className="nav-item" aria-current={page === id ? 'page' : undefined}>
    <Icon/><b>{label}</b><i/>
   </a>)}
   <button type="button" className="nav-share" aria-pressed={sharing.sharing} aria-label="Share my load" onClick={sharing.toggle}>
    <span className="nav-share-disc"><Leaf/></span>
    <b>Share load</b>
   </button>
   {rightTabs.map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`} className="nav-item" aria-current={page === id ? 'page' : undefined}
    onClick={id === 'scrapbook' ? e => { e.preventDefault(); setSnap({ view: 'scrapbook' }) } : undefined}>
    <Icon/><b>{label}</b><i/>
   </a>)}
  </nav>

  <SharingSetup step={sharing.step} setStep={sharing.setStep}/>
  {moment && <GlassCase moment={moment} onClose={() => setMoment(null)}/>}
  {cue && <CueOverlay cue={cue} onDismiss={() => setCue(null)} onCall={topic => { setCue(null); setCall({ person: cue.person, topic }) }}/>}
  {call && <CallFlow person={call.person} topic={call.topic} onCancel={() => setCall(null)}
   onDone={momentId => { setCall(null); setBloom(momentId); navigate('home'); setTimeout(() => setBloom(undefined), 5200) }}/>}
  {snap && <SnapSheet intent={snap} onClose={() => setSnap(null)}/>}
  {windowDue && !snap && !cue && !call && !question && <SnapPrompt
   onTake={() => { setWindowDue(false); setSnap({ view: 'capture', promptDay: day }) }}
   onSkip={() => { setWindowDue(false); try { sessionStorage.setItem('harbor-window', day) } catch { /* nothing to remember if storage is blocked */ } }}/>}
  <DailyQuestion open={question} onOpenChange={closeQuestion}/>
  <Toaster theme="light" position="top-center"/>
 </div>
}
