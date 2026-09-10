'use client'
import { useEffect, useState } from 'react'
import { ArrowLeft, Flower2, House, Leaf, Settings2, Sprout, Sun } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { useHarbor } from '@/lib/harbor/store'
import { Home, Inbox } from './home'
import { Harvest } from './harvest'
import { Garden } from './garden'
import { Conversation } from './conversation'
import { DispatchScreen } from './dispatch'
import { SettingsScreen } from './settings'
import { SlackTide } from './slack-tide'
import { QuickShare } from './signals'
import { DailyGame } from './game'

export function HarborApp() {
 const [route,setRoute]=useState('home'); const {state}=useHarbor()
 useEffect(()=>{const sync=()=>{setRoute(location.hash.slice(1)||'home');window.scrollTo(0,0)};sync();window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync)},[])
 const navigate=(next:string)=>{location.hash=next}
 const top=['home','harvest','garden'].includes(route)
 const page=route.split('/')[0]
 return <div className="app-shell" data-reduced-motion={state?.settings.reducedMotion}>
  <a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>
  <header className="app-header">{top?<a href="#home" className="brand" aria-label="Harbor home"><Sprout/>harbor<span className="text-accent">.</span></a>:<button className="icon-button" onClick={()=>navigate(page==='chat'?'inbox':'home')} aria-label="Go back"><ArrowLeft/></button>}
   {!top&&<span className="font-serif text-xl">{page==='chat'?'A little closer':'harbor.'}</span>}
   <button className="icon-button" aria-label="Open settings" onClick={()=>navigate('settings')}><Settings2/></button>
  </header>
  <main id="main">{!state?<div className="page-content flex min-h-96 flex-col items-center justify-center gap-4" role="status"><Sprout className="size-10"/><p className="font-serif text-xl">Making a little room for you…</p></div>:<>
   {page==='home'&&<Home navigate={navigate}/>}
   {page==='inbox'&&<Inbox navigate={navigate}/>}
   {page==='harvest'&&<Harvest navigate={navigate}/>}
   {page==='garden'&&<Garden navigate={navigate}/>}
   {page==='chat'&&<Conversation key={route} person={route.split('/')[1]||'mom'} navigate={navigate}/>}
   {page==='dispatch'&&<DispatchScreen navigate={navigate}/>}
   {page==='tide'&&<SlackTide navigate={navigate}/>}
   {page==='quick'&&<QuickShare navigate={navigate}/>}
   {page==='game'&&<DailyGame navigate={navigate}/>}
   {page==='settings'&&<SettingsScreen navigate={navigate}/>}
   {!['home','inbox','harvest','garden','chat','dispatch','tide','quick','game','settings'].includes(page)&&<div className="page-content"><p>This path is still growing.</p><button className="text-link" onClick={()=>navigate('home')}>Back home</button></div>}
  </>}</main>
  <nav className="bottom-nav" aria-label="Main navigation">{[{id:'home',label:'Home',icon:House},{id:'harvest',label:'Harvest',icon:Sun},{id:'garden',label:'Garden',icon:Flower2}].map(({id,label,icon:Icon})=><a key={id} href={`#${id}`} className="nav-item" aria-current={page===id?'page':undefined}><span className="nav-icon"><Icon/></span><span className="nav-label">{label}</span></a>)}</nav>
  <Toaster theme="light" position="top-center"/>
 </div>
}
