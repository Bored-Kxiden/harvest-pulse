'use client'
import { useEffect, useRef, useState } from 'react'
import { Bell, Bookmark, CalendarDays, Cloud, CloudLightning, CloudRain, CloudSun, House, Leaf, Minus, Moon, Plus, Sun, UserRound } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { makeId, useHarbor } from '@/lib/harbor/store'
import { activePacts, localDay, rollSnapWindow, snapWindowDue, unseenAlerts, weatherIndex, weathers, type Moment, type Weather } from '@/lib/harbor/model'
import { Home } from './home'
import { Schedule } from './schedule'
import { AccountScreen } from './account'
import { AlertsScreen } from './alerts'
import { NotesScreen } from './notes'
import { ShareLoad } from './share-load'
import { Conversation } from './conversation'
import { CueOverlay, CueScreen, type Cue } from './cue'
import { CallFlow } from './call'
import { DailyQuestion } from './daily-question'
import { GlassCase } from './glass-case'
import { Meadow, type MeadowHandle } from './meadow'
import { Sheet } from './sheet'
import { CameraScreen, StoryViewer } from './instants'
import { SnapPrompt } from './snap'
import { SectionsOverlay } from './sections'

const weatherIcon: Record<Weather, typeof Sun> = { clear: Sun, bright: CloudSun, cloudy: Cloud, rain: CloudRain, storm: CloudLightning }
const leftTabs = [{ id: 'home', label: 'Home', icon: House }, { id: 'schedule', label: 'Schedule', icon: CalendarDays }]
const rightTabs = [{ id: 'saved', label: 'Saved', icon: Bookmark }, { id: 'account', label: 'Account', icon: UserRound }]
/** Everything the nav bar does not reach. Each of these opens with a way back out. */
const PAGES = ['home', 'schedule', 'share', 'saved', 'account', 'chat', 'cue', 'alerts']


/** The verge: the strip of meadow every screen stands in. Four clumps, four clocks,
    so the whole row never rocks as one shape. Drawn once and shared by every page. */
function Verge() {
 return <svg viewBox="0 0 430 148" preserveAspectRatio="none" aria-hidden="true">
  {/* the back band, palest and slowest */}
  <g className="verge-sway verge-c">
   <path d="M0 148c-2-46 8-76 30-96-14 36-16 62-8 96z" fill="#B6D9A4"/>
   <path d="M58 148c-6-38 4-66 24-84-13 30-16 54-10 84z" fill="#AED39B"/>
   <path d="M372 148c6-38-4-66-24-84 13 30 16 54 10 84z" fill="#AED39B"/>
   <path d="M430 148c2-46-8-76-30-96 14 36 16 62 8 96z" fill="#B6D9A4"/>
   <circle cx="70" cy="62" r="6.5" fill="#FBFCF6"/><circle cx="70" cy="62" r="2.4" fill="#F7C948"/>
   <circle cx="360" cy="66" r="6" fill="#F7C3D8"/><circle cx="360" cy="66" r="2.2" fill="#F7C948"/>
  </g>

  {/* the grass, mid depth */}
  <g className="verge-sway">
   <path d="M14 148c-5-42 5-70 26-88-13 32-15 56-8 88z" fill="#8FBE7C"/>
   <path d="M40 148c-9-44 7-78 38-98-20 36-25 64-18 98z" fill="#7EB16A"/>
   <path d="M390 148c9-44-7-78-38-98 20 36 25 64 18 98z" fill="#8FBE7C"/>
   <path d="M416 148c5-42-5-70-26-88 13 32 15 56 8 88z" fill="#7EB16A"/>
   <path d="M150 148c-6-30 2-52 16-66-10 26-12 44-8 66z" fill="#9AC788"/>
   <path d="M282 148c6-30-2-52-16-66 10 26 12 44 8 66z" fill="#9AC788"/>
  </g>

  {/* the flowers, each on its own stem */}
  <g className="verge-sway verge-b">
   <path d="M54 148V62" stroke="#6FA765" strokeWidth="4.2" strokeLinecap="round"/>
   <path d="M53 104c-4-12-13-18-26-19 1 14 10 22 26 19z" fill="#9CCB8F"/>
   <ellipse cx="54" cy="52" rx="11.5" ry="15.5" fill="#F2A254"/>
   <ellipse cx="44" cy="50" rx="7" ry="12.5" fill="#F5B76F"/>
   <ellipse cx="64" cy="50" rx="7" ry="12.5" fill="#EE9445"/>
   <path d="M54 40c-3.5 4-5.5 8-5.5 12" stroke="#F7CE8F" strokeWidth="2" strokeLinecap="round" fill="none"/>

   <path d="M204 148V78" stroke="#6FA765" strokeWidth="3.4" strokeLinecap="round"/>
   <path d="M205 110c4-10 11-15 21-16-1 12-8 19-21 16z" fill="#8FBE7C"/>
   {[0, 51, 102, 153, 204, 255, 306].map(a =>
    <ellipse key={a} cx="204" cy="58" rx="6.2" ry="10.6" fill={a % 102 ? '#F7C3D8' : '#E9A0BF'} transform={`rotate(${a} 204 70)`}/>)}
   <circle cx="204" cy="70" r="5" fill="#F7C948"/>
  </g>

  <g className="verge-sway verge-d">
   <path d="M376 148V70" stroke="#6FA765" strokeWidth="4.2" strokeLinecap="round"/>
   <path d="M377 112c4-12 13-18 26-19-1 14-10 22-26 19z" fill="#9CCB8F"/>
   <ellipse cx="376" cy="60" rx="11.5" ry="15.5" fill="#F7CE63"/>
   <ellipse cx="366" cy="58" rx="7" ry="12.5" fill="#FADC86"/>
   <ellipse cx="386" cy="58" rx="7" ry="12.5" fill="#F2BE45"/>

   <path d="M120 148V96" stroke="#6FA765" strokeWidth="3" strokeLinecap="round"/>
   {[0, 72, 144, 216, 288].map(a =>
    <ellipse key={a} cx="120" cy="84" rx="5.4" ry="8.6" fill={a % 144 ? '#FFFFFF' : '#F0F3E6'} transform={`rotate(${a} 120 92)`}/>)}
   <circle cx="120" cy="92" r="3.8" fill="#F7C948"/>

   <path d="M312 148V92" stroke="#6FA765" strokeWidth="3" strokeLinecap="round"/>
   <path d="M311 118c-3-9-10-13-19-14 1 10 7 16 19 14z" fill="#9CCB8F"/>
   <ellipse cx="308" cy="76" rx="7" ry="8" fill="#88A6DA"/>
   <ellipse cx="318" cy="86" rx="7" ry="8" fill="#A9C4EC"/>
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
 const [sections, setSections] = useState(false)
 const meadowRef = useRef<MeadowHandle>(null)
 const asked = useRef(false)
 const [night, setNight] = useState(false)
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

 /* Home is the one screen the meadow is the point of, so the card rests low there and
    the field keeps the top of the screen. Everywhere else the card is the screen, and
    arriving with three readable lines above the nav bar was the reason people could
    not find anything. Those open raised; pulling the card down still shows the field. */
 useEffect(() => {
  const sync = () => {
   const next = location.hash.slice(1) || 'home'
   setRoute(next)
   setLift(next.split('/')[0] === 'home' ? 0 : 1)
  }
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

 /* Safari before 17 ignores both maximum-scale and touch-action for its own pinch,
    and answers with these three instead. Without them a two-finger drag on the field
    scales the entire page and the meadow slides out from under your fingers. */
 useEffect(() => {
  const stop = (e: Event) => e.preventDefault()
  for (const name of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(name, stop)
  return () => { for (const name of ['gesturestart', 'gesturechange', 'gestureend']) document.removeEventListener(name, stop) }
 }, [])

 /* One choice, three answers: follow the system, or override it either way. The
    meadow needs the resolved answer too, so it can put the sun down. */
 const theme = state?.settings.theme ?? 'system'
 useEffect(() => {
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
  const dark = window.matchMedia('(prefers-color-scheme: dark)')
  const resolve = () => setNight(theme === 'dark' || (theme === 'system' && dark.matches))
  resolve()
  dark.addEventListener('change', resolve)
  return () => dark.removeEventListener('change', resolve)
 }, [theme])

 const navigate = (next: string) => { location.hash = next }
 const page = route.split('/')[0]
 const weather = state?.weather ?? 'clear'
 const Icon = weatherIcon[weather]
 const waiting = state ? unseenAlerts(state) : 0

 /* One tap for the thing people actually reach for. Auto is still in Account for
    anyone who wants the phone to decide; this just flips between the two looks. */
 const flipTheme = () => update(s => ({ ...s, settings: { ...s.settings, theme: night ? 'light' : 'dark' } }))

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

 /* Collapsed past rest the card leaves the grab handle sitting right where the
    fixed nav bar floats, unreachable underneath it. Once it is collapsed that far,
    the nav has nothing to navigate to anyway, so it steps aside until the card
    comes back up. */
 return <div className="stage" data-reduced-motion={state?.settings.reducedMotion} data-dragging={dragging} data-camera={!!camera}
  data-collapsed={lift < -0.5}
  style={{ ['--lift' as string]: lift }}>
  <Meadow ref={meadowRef} weather={weather} sheetLift={lift} freshBloomId={fresh} bare={!!camera} night={night} onOpenBloom={setMoment}/>
  <div className="verge" aria-hidden="true"><Verge/></div>

  {/* Zoom, made into buttons: a pinch is not something everyone reaches for first. */}
  <div className="meadow-zoom" data-away={lift > 0.72}>
   <button type="button" onClick={() => meadowRef.current?.zoomBy(1.5)} aria-label="Zoom into the meadow"><Plus aria-hidden="true"/></button>
   <button type="button" onClick={() => meadowRef.current?.zoomBy(1 / 1.5)} aria-label="Zoom out of the meadow"><Minus aria-hidden="true"/></button>
  </div>

  <header className="topbar">
   <a href="#home" className="brand" aria-label="Harbor, home">
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 29V14" stroke="#1F6B43" strokeWidth="3" strokeLinecap="round"/><path d="M15 15.5c-1.2-5-5-7.6-11-8 .4 6.6 3.8 10 11 8z" fill="#59A468"/><path d="M17 13c1-5.6 4.8-8.8 11.6-9.4C28.2 11 24.4 15 17 13z" fill="#79BC7F"/></svg>
    <span className="brand-stack">
     <span className="brand-word">harbor</span>
     <span className="brand-line">A little closer, every&nbsp;day</span>
    </span>
   </a>
   <div className="top-acts">
    <button type="button" className="disc" onClick={() => navigate('alerts')}
     aria-label={waiting ? `Notifications, ${waiting} new` : 'Notifications'}>
     <Bell aria-hidden="true"/>{!!waiting && <i/>}
    </button>
    <button type="button" className="disc" data-tint="leaf" onClick={flipTheme}
     aria-label={night ? 'Switch to the day look' : 'Switch to the dusk look'}>
     <span className="weather-turn" aria-hidden="true">{night ? <Sun key="sun"/> : <Moon key="moon"/>}</span>
    </button>
   </div>
  </header>


  {/* Two taps living in one pill: the glyph turns the weather over, the label opens
      the garden's own map, since a pinch alone is not how everyone finds a person. */}
  <div className="meadow-chip" data-away={lift > 0.72}>
   <button type="button" className="meadow-chip-icon" onClick={turnWeather}
    aria-label={`Weather in your meadow: ${weathers[weatherIndex(weather)].label}. Turn it over.`}>
    <span className="weather-turn" aria-hidden="true"><Icon key={weather}/></span>
   </button>
   <button type="button" className="meadow-chip-label" onClick={() => setSections(true)} aria-label="Find people in your garden">
    <span className="chip-text" key={chipLabel}>{chipLabel}</span>
    <svg className="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
   </button>
  </div>
  {sections && <SectionsOverlay onClose={() => setSections(false)}
   onGo={id => meadowRef.current?.flyTo(id)} onOverview={() => meadowRef.current?.recenter()}/>}

  <Sheet lift={lift} onLift={setLift} onDragging={setDragging} label="Harbor" at={route}>
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
     {page === 'home' && <Home navigate={navigate} onCall={person => setCall({ person })}
      onOpenCamera={() => setCamera({})} onOpenStory={() => setStory(0)} onWeatherShown={showWeather} onExpand={() => setLift(1)}/>}
     {page === 'schedule' && <Schedule navigate={navigate}/>}
     {page === 'share' && <ShareLoad navigate={navigate}/>}
     {page === 'saved' && <NotesScreen navigate={navigate} onOpenCamera={() => setCamera({})} onOpenStory={() => setStory(0)}/>}
     {page === 'alerts' && <AlertsScreen navigate={navigate}/>}
     {page === 'account' && <AccountScreen navigate={navigate}/>}
     {page === 'chat' && <Conversation key={route} person={route.split('/')[1] || state.people[0]?.id} navigate={navigate} onCall={person => setCall({ person })}/>}
     {page === 'cue' && <CueScreen navigate={navigate} onFire={fireCue}/>}
     {!PAGES.includes(page) && <div className="wrap flow">
      <p className="small">This path is still growing.</p>
      <button type="button" className="btn btn-soft" onClick={() => navigate('home')}>Back home</button>
     </div>}
    </>}
  </Sheet>

  <nav className="nav" aria-label="Main">
   {leftTabs.map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`} className="nav-item" aria-current={page === id ? 'page' : undefined}>
    <Icon aria-hidden="true"/><b>{label}</b><i aria-hidden="true"/>
   </a>)}
   {/* A place to go, not a switch. It lights up when sharing is on, but tapping it
       opens the screen rather than turning anything on or off. */}
   <a href="#share" className="nav-share" data-on={!!state?.sharing} aria-current={page === 'share' ? 'page' : undefined}
    aria-label={`Share my load${state?.sharing ? ', sharing is on' : ''}`}>
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
  <Toaster theme={night ? 'dark' : 'light'} position="top-center"/>
 </div>
}
