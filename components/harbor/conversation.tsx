'use client'
import { useEffect, useState } from 'react'
import { Heart, Phone, Send, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldLabel } from '@/components/ui/field'
import { Message, MessageContent } from '@/components/ui/message'
import { Bubble, BubbleContent } from '@/components/ui/bubble'
import { MessageScroller, MessageScrollerViewport, MessageScrollerContent, MessageScrollerItem, MessageScrollerButton } from '@/components/ui/message-scroller'
import { Marker } from '@/components/ui/marker'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { addMoment, people } from '@/lib/harbor/model'
import { makeId, useHarbor } from '@/lib/harbor/store'
import { Avatar } from './home'
import { ResolutionChoices } from './resolution'
export function Conversation({person,navigate}:{person:string;navigate:(page:string)=>void}) {
 const {state,update}=useHarbor(); const [call,setCall]=useState(false);const [together,setTogether]=useState(false)
 const p=people.find(p=>p.id===person)
 useEffect(()=>{update(s=>s.read.includes(person)?s:{...s,read:[...s.read,person]})},[person])
 if(!state)return null
 if(!p)return <div className="page-content"><p>This conversation isn&apos;t in your circle.</p><Button onClick={()=>navigate('inbox')}>Back to inbox</Button></div>
 const draft=state.drafts[person]??'';const messages=state.messages[person]??[]
 function send(text=draft){if(!text.trim())return; const at=new Date().toISOString(),id=makeId(); update(s=>addMoment({...s,messages:{...s.messages,[person]:[...(s.messages[person]??[]),{id,at,text:text.trim(),mine:true}]},drafts:{...s.drafts,[person]:''}},{id,at,person,kind:'message',text:text.trim(),source:'manual'}))}
 return <div className="page-content !pt-2 flow entrance"><div className="flex items-center gap-3"><Avatar person={person}/><div className="flex-1"><h1 className="font-serif text-2xl">{p.name}</h1><p className="small-copy">A demo conversation · no read receipts</p></div><button className="icon-button" aria-label={`Call ${p.name}`} onClick={()=>setCall(true)}><Phone/></button></div><button className="together-card" onClick={()=>setTogether(true)}><span className="flex items-center gap-3"><Users className="size-5"/> Work together, from wherever</span><span aria-hidden="true">+</span></button>
 <div className="transcript"><MessageScroller><MessageScrollerViewport><MessageScrollerContent><Marker variant="separator">A little space for you two</Marker>{messages.map(m=><MessageScrollerItem key={m.id}><Message align={m.mine?'end':'start'}><MessageContent><Bubble variant={m.mine?'default':'secondary'}><BubbleContent>{m.text}</BubbleContent></Bubble>{!m.mine&&<button className="text-link !min-h-11 self-start" aria-label={m.liked?'Love already sent':'Send love for this message'} disabled={m.liked} onClick={()=>{update(s=>addMoment({...s,messages:{...s.messages,[person]:s.messages[person].map(x=>x.id===m.id?{...x,liked:true}:x)}},{id:`reaction-${m.id}`,at:new Date().toISOString(),person,kind:'reacted',text:'Sent love for a little note from home.',source:'manual'}))}}><Heart className={m.liked?'fill-primary':''}/>{m.liked?'A little love, sent':'Send a little love'}</button>}</MessageContent></Message></MessageScrollerItem>)}</MessageScrollerContent></MessageScrollerViewport><MessageScrollerButton/></MessageScroller></div>
 <form className="flex items-end gap-2" onSubmit={e=>{e.preventDefault();send()}}><Field><FieldLabel htmlFor="message" className="sr-only">Your message</FieldLabel><Textarea id="message" placeholder="A little note is enough…" value={draft} maxLength={2000} onChange={e=>update(s=>({...s,drafts:{...s.drafts,[person]:e.target.value}}))} onKeyDown={e=>{if(e.nativeEvent.isComposing||e.keyCode===229)return;if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}}/></Field><Button type="submit" size="icon" aria-label="Send message" disabled={!draft.trim()}><Send/></Button></form><p className="demo-footnote">Saved here, not delivered to a real person.</p>
 <Dialog open={call} onOpenChange={setCall}><DialogContent><DialogHeader><DialogTitle>A little time with {p.name}.</DialogTitle><DialogDescription>Keep it to what feels comfortable. No updates or explanations required. This is a simulated call.</DialogDescription></DialogHeader><ResolutionChoices person={person}/></DialogContent></Dialog>
 <Dialog open={together} onOpenChange={setTogether}><DialogContent><DialogHeader><DialogTitle>Just being there counts.</DialogTitle><DialogDescription>A shared-session invitation in your demo chat. No real audio or video session starts.</DialogDescription></DialogHeader><div className="flow">{['Study with me for a little while?','Shall we cook dinner together?','No agenda. Just a little company?'].map(text=><Button key={text} variant="outline" className="!whitespace-normal h-auto py-3" onClick={()=>{send(text);setTogether(false)}}>{text}</Button>)}</div></DialogContent></Dialog>
 </div>
}
