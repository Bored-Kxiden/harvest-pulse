'use client'
import { ArrowRight, ChevronRight, Flower2, Heart, Mail, Sprout, Users, Waves } from 'lucide-react'
import { useHarbor } from '@/lib/harbor/store'
import { people } from '@/lib/harbor/model'
import { cn } from '@/lib/utils'
export function Avatar({person,small=false}:{person:string;small?:boolean}) {
 const p=people.find(x=>x.id===person)??people[0]
 return <span className={cn('avatar',p.style,small&&'!size-9 !text-base')} aria-hidden="true">{p.id==='family'?<Users className="size-5" strokeWidth={1.5}/>:p.initials}</span>
}
export function Home({navigate}:{navigate:(page:string)=>void}) {
 const {state}=useHarbor(); if(!state) return null
 const pending=state.dispatches.filter(d=>d.status==='delivered').length
 return <div className="entrance">
  <section className="home-hero" aria-label="Welcome home">
   <img className="hero-image" src="/images/meadow.png" alt="A hand-painted meadow of daisies, with a little home in the distance" fetchPriority="high"/>
   <div className="hero-copy"><div className="eyebrow mb-2">A little closer, every day</div><h1 className="font-serif">Hey, {state.name}.<br/>There&apos;s a little love<br/>waiting for you.</h1><p>Your people. Your pace.</p></div>
   <button className="hero-footer" onClick={()=>navigate('garden')}><Flower2/> Good things are growing <ChevronRight/></button><div className="wave" aria-hidden="true"/>
  </section>
  <div className="page-content"><div className="flow">
   <section className="flex flex-col gap-3" aria-labelledby="inbox-heading"><div className="section-heading"><h2 id="inbox-heading">Your people</h2><button className="text-link" onClick={()=>navigate('inbox')}>Inbox <ArrowRight/></button></div>
    <div className="chat-grid">{people.map(p=>{const messages=state.messages[p.id]??[];const last=messages.at(-1);return <button key={p.id} className="chat-tile" onClick={()=>navigate(`chat/${p.id}`)}><div className="flex items-center justify-between w-full"><Avatar person={p.id}/>{!state.read.includes(p.id)&&<span className="unread-dot" aria-label="Unread message"/>}</div><span className="chat-name">{p.name}<ChevronRight className="size-4 text-muted-foreground"/></span><span className="chat-preview">{last?.mine?'You: ':''}{last?.text??p.note}</span><span className="chat-time">{messages.length>1?'A moment shared':p.time}</span></button>})}</div>
   </section>
   <button className="together-card" onClick={()=>navigate('chat/family')}><div className="flex items-center gap-3"><Users className="size-7" strokeWidth={1.2}/><div><strong>A little time, together.</strong><p>Study, cook, or just be.</p></div></div><ArrowRight className="size-5"/></button>
   <section className="flex flex-col gap-2"><div className="section-heading"><h2>From home, with love</h2><Mail className="size-5 muted-icon"/></div><button className="surface text-left flex items-center gap-4" onClick={()=>navigate('dispatch')}><div className="moment-icon"><Mail/></div><div className="flex-1"><p className="font-serif text-lg">The little things edition</p><p className="small-copy">{pending?`${pending} little ${pending===1?'note':'notes'} from Mom. No rush to reply.`:'A place for all the ordinary, lovely things.'}</p></div><ChevronRight className="size-4"/></button></section>
   <button className="text-link justify-center" onClick={()=>navigate('tide')}><Waves/> Find a quiet moment <ChevronRight/></button>
   <p className="notice justify-center"><Heart/> Close, even from a little further away.</p>
   <p className="demo-footnote">An interactive demo · saved only on this device</p>
  </div></div>
 </div>
}
export function Inbox({navigate}:{navigate:(page:string)=>void}) {
 return <><div className="page-intro"><span className="eyebrow">The people who feel like home</span><h1>Your inbox</h1><p>No read receipts. No rush. Just you and your people.</p></div><div className="page-content flow">{people.map(p=><button key={p.id} className="surface flex items-center gap-4 text-left" onClick={()=>navigate(`chat/${p.id}`)}><Avatar person={p.id}/><span className="flex-1"><strong>{p.name}</strong><span className="small-copy block">Open your conversation</span></span><ChevronRight className="size-5"/></button>)}<p className="notice"><Sprout/> All conversations use sample family data.</p></div></>
}
