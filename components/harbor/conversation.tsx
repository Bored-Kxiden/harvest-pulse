'use client'
import { useEffect, useState } from 'react'
import { Heart, Phone, Send, Users } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { addMoment } from '@/lib/harbor/model'
import { makeId, useHarbor } from '@/lib/harbor/store'
import { Avatar } from './avatar'

export function Conversation({ person, navigate, onCall }: { person: string; navigate: (page: string) => void; onCall: (person: string) => void }) {
 const { state, update } = useHarbor()
 const [together, setTogether] = useState(false)
 useEffect(() => { update(s => s.read.includes(person) ? s : { ...s, read: [...s.read, person] }) }, [person])
 if (!state) return null
 const p = state.people.find(x => x.id === person)
 if (!p) return <div className="section"><p className="small-copy">This conversation isn&apos;t in your circle.</p><button className="link" onClick={() => navigate('home')}>Back home</button></div>
 const draft = state.drafts[person] ?? ''
 const messages = state.messages[person] ?? []

 function send(text = draft) {
  if (!text.trim()) return
  const at = new Date().toISOString(), id = makeId()
  update(s => addMoment({ ...s, messages: { ...s.messages, [person]: [...(s.messages[person] ?? []), { id, at, text: text.trim(), mine: true }] }, drafts: { ...s.drafts, [person]: '' } }, { id, at, person, kind: 'message', text: text.trim(), source: 'manual' }))
 }

 return <div className="entrance">
  <div className="chat-head">
   <Avatar person={person}/>
   <div style={{ flex: 1 }}><h1>{p.name}</h1><p className="small-copy">A demo conversation · no read receipts</p></div>
   <button className="round-button" aria-label={`Call ${p.name}`} onClick={() => onCall(person)}><Phone/></button>
  </div>

  <div className="section section-first flow">
   <button type="button" className="line" onClick={() => setTogether(true)}>
    <span className="line-icon tint-sky"><Users/></span>
    <span className="line-body"><b>Work together, from wherever</b><span>No agenda, just company</span></span>
   </button>

   <div className="transcript">
    <span className="transcript-day">A little space for you two</span>
    {messages.map(m => <div key={m.id} className="bubble-row" data-mine={m.mine}>
     <span className="bubble">{m.text}</span>
     {!m.mine && <button className="link" aria-label={m.liked ? 'Love already sent' : 'Send love for this message'} disabled={m.liked}
      onClick={() => update(s => addMoment({ ...s, messages: { ...s.messages, [person]: s.messages[person].map(x => x.id === m.id ? { ...x, liked: true } : x) } }, { id: `reaction-${m.id}`, at: new Date().toISOString(), person, kind: 'reacted', text: 'Sent love for a little note from home.', source: 'manual' }))}>
      <Heart style={{ fill: m.liked ? 'var(--ink)' : 'none' }}/>{m.liked ? 'A little love, sent' : 'Send a little love'}
     </button>}
    </div>)}
   </div>

   <form style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }} onSubmit={e => { e.preventDefault(); send() }}>
    <label htmlFor="message" className="sr-only">Your message</label>
    <textarea id="message" className="input" rows={1} placeholder="A little note is enough…" value={draft} maxLength={2000}
     onChange={e => update(s => ({ ...s, drafts: { ...s.drafts, [person]: e.target.value } }))}
     onKeyDown={e => { if (e.nativeEvent.isComposing || e.keyCode === 229) return; if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}/>
    <button type="submit" className="btn" style={{ minWidth: 52, padding: 0 }} aria-label="Send message" disabled={!draft.trim()}><Send/></button>
   </form>
   <p className="demo-footnote">Saved here, not delivered to a real person.</p>
  </div>

  <Dialog open={together} onOpenChange={setTogether}><DialogContent>
   <DialogHeader><DialogTitle>Just being there counts.</DialogTitle><DialogDescription>A shared-session invitation in your demo chat. No real audio or video session starts.</DialogDescription></DialogHeader>
   <div className="flow">{['Study with me for a little while?', 'Shall we cook dinner together?', 'No agenda. Just a little company?'].map(text =>
    <button key={text} type="button" className="btn btn-soft btn-block" style={{ minHeight: 52, whiteSpace: 'normal' }} onClick={() => { send(text); setTogether(false) }}>{text}</button>)}</div>
  </DialogContent></Dialog>
 </div>
}
