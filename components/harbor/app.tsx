'use client'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CalendarDays, House, Sprout, UserRound } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { makeId, useHarbor } from '@/lib/harbor/store'
import { localDay } from '@/lib/harbor/model'
import { Home } from './home'
import { Schedule } from './schedule'
import { SettingsScreen } from './settings'
import { Conversation } from './conversation'
import { CueOverlay, CueScreen, type Cue } from './cue'
import { CallFlow } from './call'
import { DailyQuestion } from './daily-question'

const tabs = [{ id: 'home', label: 'Home', icon: House }, { id: 'schedule', label: 'Schedule', icon: CalendarDays }, { id: 'settings', label: 'Account', icon: UserRound }]

export function HarborApp() {
 const [route, setRoute] = useState('home')
 const { state, update } = useHarbor()
 const [cue, setCue] = useState<Cue | null>(null)
 const [call, setCall] = useState<{ person: string; topic?: string } | null>(null)
 const [bloom, setBloom] = useState<string>()
 const [question, setQuestion] = useState(false)
 const asked = useRef(false)

 useEffect(() => {
  const sync = () => { setRoute(location.hash.slice(1) || 'home'); window.scrollTo(0, 0) }
  sync(); window.addEventListener('hashchange', sync); return () => window.removeEventListener('hashchange', sync)
 }, [])

 useEffect(() => {
  if (!state || asked.current) return
  asked.current = true
  const day = localDay()
  let skipped = false
  try { skipped = sessionStorage.getItem('harbor-question') === day } catch { /* private mode blocks session storage; the question simply shows again */ }
  if (!state.games[day] && !skipped) { const timer = setTimeout(() => setQuestion(true), 700); return () => clearTimeout(timer) }
 }, [state])

 const navigate = (next: string) => { location.hash = next }
 const page = route.split('/')[0]
 const top = tabs.some(t => t.id === page)

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
  <a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>
  <header className="app-header">
   {top
    ? <a href="#home" className="brand" aria-label="Harbor home"><Sprout/>harbor<span className="text-accent">.</span></a>
    : <button className="icon-button" onClick={() => navigate('home')} aria-label="Go back"><ArrowLeft/></button>}
   {!top && <span className="font-serif text-xl">{page === 'chat' ? 'A little closer' : 'harbor.'}</span>}
   <span className="w-11" aria-hidden="true"/>
  </header>

  <main id="main">{!state
   ? <div className="page-content flex min-h-96 flex-col items-center justify-center gap-4" role="status"><Sprout className="size-10"/><p className="font-serif text-xl">Making a little room for you…</p></div>
   : <>
    {page === 'home' && <Home navigate={navigate} bloomId={bloom}/>}
    {page === 'schedule' && <Schedule navigate={navigate}/>}
    {page === 'settings' && <SettingsScreen navigate={navigate}/>}
    {page === 'chat' && <Conversation key={route} person={route.split('/')[1] || state.people[0]?.id} navigate={navigate} onCall={person => setCall({ person })}/>}
    {page === 'cue' && <CueScreen navigate={navigate} onFire={fireCue}/>}
    {!['home', 'schedule', 'settings', 'chat', 'cue'].includes(page) && <div className="page-content"><p>This path is still growing.</p><button className="text-link" onClick={() => navigate('home')}>Back home</button></div>}
   </>}</main>

  <nav className="bottom-nav" aria-label="Main navigation">
   {tabs.map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`} className="nav-item" aria-current={page === id ? 'page' : undefined}>
    <span className="nav-icon"><Icon/></span><span className="nav-label">{label}</span>
   </a>)}
  </nav>

  {cue && <CueOverlay cue={cue} onDismiss={() => setCue(null)} onCall={topic => { setCue(null); setCall({ person: cue.person, topic }) }}/>}
  {call && <CallFlow person={call.person} topic={call.topic} onCancel={() => setCall(null)}
   onDone={momentId => { setCall(null); setBloom(momentId); navigate('home'); setTimeout(() => setBloom(undefined), 2600) }}/>}
  <DailyQuestion open={question} onOpenChange={closeQuestion}/>
  <Toaster theme="light" position="top-center"/>
 </div>
}
