'use client'
import { useEffect, useRef, useState } from 'react'
import { Bell, CalendarDays, Cloud, CloudLightning, CloudRain, CloudSun, House, Leaf, NotebookPen, Sprout, Sun, UserRound } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { makeId, useHarbor } from '@/lib/harbor/store'
import { activePacts, localDay, rollSnapWindow, snapWindowDue, weatherIndex, weathers, type Moment, type Weather } from '@/lib/harbor/model'
import { Home } from './home'
import { Schedule } from './schedule'
import { AccountScreen } from './account'
import { NotesScreen } from './notes'
import { ShareLoad } from './share-load'
import { Conversation } from './conversation'
import { CueOverlay, CueScreen, type Cue } from './cue'
import { CallFlow } from './call'
import { DailyQuestion } from './daily-question'
import { GlassCase } from './glass-case'
import { Meadow } from './meadow'
import { Sheet } from './sheet'
import { CameraScreen, StoryViewer } from './instants'
import { SnapPrompt } from './snap'

const weatherIcon: Record<Weather, typeof Sun> = { clear: Sun, bright: CloudSun, cloudy: Cloud, rain: CloudRain, storm: CloudLightning }
const leftTabs = [{ id: 'home', label: 'Home', icon: House }, { id: 'schedule', label: 'Schedule', icon: CalendarDays }]
const rightTabs = [{ id: 'notes', label: 'Notes', icon: NotebookPen }, { id: 'account', label: 'Account', icon: UserRound }]


/** The verge: the flowers that grow right at the foot of the screen, in front of everything. */
function Verge() {
 return <svg viewBox="0 0 430 132" preserveAspectRatio="none" aria-hidden="true">
  <g className="verge-sway">
   <path d="M6 132c-4-38 4-62 22-78-12 30-12 52-6 78z" fill="#8FBE7C"/>
   <path d="M30 132c-8-40 6-70 34-88-18 32-22 58-16 88z" fill="#7EB16A"/>
   <path d="M404 132c6-40-6-70-34-88 18 32 22 58 16 88z" fill="#8FBE7C"/>
   <path d="M424 132c4-38-4-62-22-78 12 30 12 52 6 78z" fill="#7EB16A"/>
   <ellipse cx="46" cy="54" rx="11" ry="15" fill="#F2A254"/>
   <path d="M46 68v56" stroke="#6FA765" strokeWidth="4" strokeLinecap="round"/>
   <ellipse cx="37" cy="52" rx="6.5" ry="12" fill="#F5B76F"/>
   <ellipse cx="55" cy="52" rx="6.5" ry="12" fill="#EE9445"/>
   <ellipse cx="384" cy="60" rx="11" ry="15" fill="#F7CE63"/>
   <path d="M384 74v50" stroke="#6FA765" strokeWidth="4" strokeLinecap="round"/>
   <ellipse cx="375" cy="58" rx="6.5" ry="12" fill="#FADC86"/>
   <ellipse cx="393" cy="58" rx="6.5" ry="12" fill="#F2BE45"/>
  </g>
  <g className="verge-sway verge-slow">
   <path d="M82 132c-4-30 2-52 16-66-10 26-10 44-6 66z" fill="#A3CC8A"/>
   <path d="M348 132c4-30-2-52-16-66 10 26 10 44 6 66z" fill="#A3CC8A"/>
   <circle cx="98" cy="72" r="7" fill="#FBFCF6"/><circle cx="98" cy="72" r="2.6" fill="#F7C948"/>
   <circle cx="332" cy="78" r="6" fill="#F7C3D8"/><circle cx="332" cy="78" r="2.2" fill="#F7C948"/>
  </g>
 </svg>
}

export function HarborApp() {
 const [route, setRoute] = useState('home')
 const { state, update } = useHarbor()
 const [lift, setLift] = useState(0)
 const [dragging, setDragging] = useState(false)
 const [cue, setCue] = useState<Cue | null>(null)
 const [call, setCall] = useState<{ person: string; topic?: string } | null>(null)
 const [fresh, setFresh] = useState<string>()
 const [question, setQuestion] = useState(false)
 const [story, setStory] = useState<number | null>(null)
 const [camera, setCamera] = useState<{ promptDay?: string } | null>(null)
 const [moment, setMoment] = useState<Moment | null>(null)
 const [windowDue, setWindowDue] = useState(false)
 const [chipWeather, setChipWeather] = useState(false)
 const asked = useRef(false)
 const chipTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
 const day = localDay()
 const needsWindow = !!state && activePacts(state).length > 0 && !state.snapWindows[day]

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
  const sync = () => { setRoute(location.hash.slice(1) || 'home'); setLift(0) }
  sync(); window.addEventListener('hashchange', sync); return () => window.removeEventListener('hashchange', sync)
 }, [])

 useEffect(() => {
  if (!state || asked.current) return
  asked.current = true
  const today = localDay()
  let skipped = false
  try { skipped = sessionStorage.getItem('harbor-question') === today } catch { /* private mode blocks session storage; the question simply shows again */ }
  if (!state.games[today] && !skipped) { const timer = setTimeout(() => setQuestion(true), 1100); return () => clearTimeout(timer) }
 }, [state])

 useEffect(() => () => clearTimeout(chipTimer.current), [])

 const navigate = (next: string) => { location.hash = next }
 const page = route.split('/')[0]
 const weather = state?.weather ?? 'clear'
 const Icon = weatherIcon[weather]

 /* Tapping the chip turns the weather over: the sky crossfades behind, the glyph rotates in front. */
 const turnWeather = () => {
  const next = weathers[(weatherIndex(weather) + 1) % weathers.length].id
  update(s => ({ ...s, weather: next }))
  setChipWeather(true)
  clearTimeout(chipTimer.current)
  chipTimer.current = setTimeout(() => setChipWeather(false), 2600)
 }
 const showWeather = () => {
  setChipWeather(true)
  clearTimeout(chipTimer.current)
  chipTimer.current = setTimeout(() => setChipWeather(false), 2600)
 }

 const fireCue = (personId: string) => {
  const id = makeId()
  update(s => ({ ...s, cues: [...s.cues, { id, at: new Date().toISOString() }] }))
  setCue({ id, person: personId })
 }
 const closeQuestion = (value: boolean) => {
  setQuestion(value)
  if (!value) { try { sessionStorage.setItem('harbor-question', localDay()) } catch { /* nothing to remember if storage is blocked */ } }
 }

 const total = state ? state.moments.filter(m => m.kind === 'called' && m.flower).length : 0
 const chipLabel = chipWeather ? weathers[weatherIndex(weather)].label : total ? 'Your garden is blooming' : 'Plant your first flower'

 return <div className="stage" data-reduced-motion={state?.settings.reducedMotion} data-dragging={dragging} data-camera={!!camera}
  style={{ ['--lift' as string]: lift }}>
  <Meadow weather={weather} sheetLift={lift} freshBloomId={fresh} onOpenBloom={setMoment}
   onOpenPerson={id => navigate(`chat/${id}`)}/>
  <div className="verge" aria-hidden="true"><Verge/></div>

  <header className="topbar">
   <a href="#home" className="brand" aria-label="Harbor, home">
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 29V14" stroke="#1F6B43" strokeWidth="3" strokeLinecap="round"/><path d="M15 15.5c-1.2-5-5-7.6-11-8 .4 6.6 3.8 10 11 8z" fill="#59A468"/><path d="M17 13c1-5.6 4.8-8.8 11.6-9.4C28.2 11 24.4 15 17 13z" fill="#79BC7F"/></svg>
    <span className="brand-stack">
     <span className="brand-word">harbor</span>
     <span className="brand-line">A little closer, every&nbsp;day</span>
    </span>
   </a>
   <div className="top-acts">
    <button type="button" className="disc" aria-label="Notifications" onClick={() => navigate('notes')}>
     <Bell aria-hidden="true"/>{!!state?.notes.length && <i/>}
    </button>
    <a href="#account" className="disc" data-tint="leaf" aria-label="Your account"><Sprout aria-hidden="true"/></a>
   </div>
  </header>


  <button type="button" className="meadow-chip"
   style={{ opacity: lift > 0.72 ? 0 : 1, pointerEvents: lift > 0.72 ? 'none' : 'auto' }}
   onClick={turnWeather} aria-label={`Weather in your meadow: ${weathers[weatherIndex(weather)].label}. Turn it over.`}>
   <span className="weather-turn" aria-hidden="true"><Icon key={weather}/></span>
   <span className="chip-text" key={chipLabel}>{chipLabel}</span>
   <svg className="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
  </button>

  <Sheet lift={lift} onLift={setLift} onDragging={setDragging} label="Harbor">
   {!state
    ? <div className="wrap flow" role="status" aria-live="polite" aria-busy="true">
     <span className="sr-only">Making a little room for you…</span>
     <div className="skeleton" style={{ height: 178 }} aria-hidden="true"/>
     <div className="skeleton" style={{ height: 22, width: '45%', borderRadius: 11 }} aria-hidden="true"/>
     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }} aria-hidden="true">
      <div className="skeleton" style={{ height: 168 }}/><div className="skeleton" style={{ height: 168 }}/>
     </div>
    </div>
    : <>
     {page === 'home' && <Home navigate={navigate} onCall={person => setCall({ person })} onOpenMoment={setMoment}
      onOpenCamera={() => setCamera({})} onOpenStory={() => setStory(0)} onWeatherShown={showWeather} onExpand={() => setLift(1)}/>}
     {page === 'schedule' && <Schedule navigate={navigate}/>}
     {page === 'share' && <ShareLoad navigate={navigate}/>}
     {page === 'notes' && <NotesScreen navigate={navigate} onOpenCamera={() => setCamera({})} onOpenStory={() => setStory(0)}/>}
     {page === 'account' && <AccountScreen navigate={navigate}/>}
     {page === 'chat' && <Conversation key={route} person={route.split('/')[1] || state.people[0]?.id} navigate={navigate} onCall={person => setCall({ person })}/>}
     {page === 'cue' && <CueScreen navigate={navigate} onFire={fireCue}/>}
     {!['home', 'schedule', 'share', 'notes', 'account', 'chat', 'cue'].includes(page) && <div className="wrap">
      <p className="small">This path is still growing.</p>
      <button type="button" className="text-link" onClick={() => navigate('home')}>Back home</button>
     </div>}
    </>}
  </Sheet>

  <nav className="nav" aria-label="Main">
   {leftTabs.map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`} className="nav-item" aria-current={page === id ? 'page' : undefined}>
    <Icon aria-hidden="true"/><b>{label}</b><i aria-hidden="true"/>
   </a>)}
   <a href="#share" className="nav-share" aria-pressed={!!state?.sharing} aria-current={page === 'share' ? 'page' : undefined} aria-label="Share my load">
    <span className="nav-share-disc"><Leaf aria-hidden="true"/></span>
    <b>Share load</b>
   </a>
   {rightTabs.map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`} className="nav-item" aria-current={page === id ? 'page' : undefined}>
    <Icon aria-hidden="true"/><b>{label}</b><i aria-hidden="true"/>
   </a>)}
  </nav>

  {moment && <GlassCase moment={moment} onClose={() => setMoment(null)}/>}
  {story !== null && <StoryViewer start={story} onClose={() => setStory(null)}/>}
  {camera && <CameraScreen promptDay={camera.promptDay} onClose={() => setCamera(null)}/>}
  {cue && <CueOverlay cue={cue} onDismiss={() => setCue(null)} onCall={topic => { setCue(null); setCall({ person: cue.person, topic }) }}/>}
  {call && <CallFlow person={call.person} topic={call.topic} onCancel={() => setCall(null)}
   onDone={id => { setCall(null); setFresh(id); navigate('home'); setLift(0); setTimeout(() => setFresh(undefined), 6000) }}/>}
  {windowDue && !camera && !cue && !call && !question && story === null && <SnapPrompt
   onTake={() => { setWindowDue(false); setCamera({ promptDay: day }) }}
   onSkip={() => { setWindowDue(false); try { sessionStorage.setItem('harbor-window', day) } catch { /* nothing to remember if storage is blocked */ } }}/>}
  <DailyQuestion open={question} onOpenChange={closeQuestion}/>
  <Toaster theme="light" position="top-center"/>
 </div>
}
