'use client'
import { useState } from 'react'
import { Camera, MessageCircle, PenLine } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { makeId, useHarbor } from '@/lib/harbor/store'
import type { Note } from '@/lib/harbor/model'
import { LocalPhoto } from './media-view'
import { originOf, type SnapIntent } from './snap'

const DAY = 86400000

/** Notes: one line each, small enough that nobody owes a reply. Pictures live in instants,
    which keep their place at the right edge however far the notes run on. */
export function NotesRail({ navigate, onOpenSnap }: { navigate: (page: string) => void; onOpenSnap: (intent: SnapIntent) => void }) {
 const { state, update } = useHarbor()
 const [composing, setComposing] = useState(false)
 const [open, setOpen] = useState<Note | null>(null)
 const [text, setText] = useState('')
 if (!state) return null

 const fresh = state.notes.filter(n => Date.now() - new Date(n.at).getTime() < 2 * DAY).slice().reverse()
 const mine = fresh.find(n => n.person === 'you')
 const latestSnap = state.snaps.slice().sort((a, b) => b.at.localeCompare(a.at))[0]

 const add = () => {
  const value = text.trim(); if (!value) return
  update(s => ({ ...s, notes: [...s.notes, { id: makeId(), at: new Date().toISOString(), person: 'you', text: value }] }))
  setComposing(false); setText('')
  toast.success('Left for your people. No reply needed.')
 }

 return <section className="section" aria-labelledby="something-heading">
  <div className="row-head">
   <h2 id="something-heading">A little something</h2>
   <button type="button" className="link" onClick={() => onOpenSnap({ view: 'scrapbook' })}>notes &amp; instants <ChevronGlyph/></button>
  </div>
  <div className="something">
   <div className="notes-rail">
    <button type="button" className="note-item" onClick={() => setComposing(true)}>
     {mine && <span className="note-bubble">{mine.text}</span>}
     <span className="note-face tint-gold"><PenLine/></span>
     <span className="note-name">You</span>
    </button>
    {state.people.map(person => {
     const note = fresh.find(n => n.person === person.id)
     return <button key={person.id} type="button" className="note-item"
      onClick={() => note ? setOpen(note) : navigate(`chat/${person.id}`)}>
      {note && <span className="note-bubble">{note.text}</span>}
      <span className={`note-face tint-${person.tone}`}>
       {person.photoId ? <LocalPhoto id={person.photoId} className="avatar-photo"/> : <span style={{ fontFamily: 'var(--font-round), sans-serif', fontWeight: 700, fontSize: 24 }}>{person.initials}</span>}
       {note && <span className="note-dot"/>}
      </span>
      <span className="note-name">{person.name}</span>
     </button>
    })}
   </div>
   <div className="instants-pin">
    <button type="button" className="instants-tile" onClick={e => onOpenSnap({ view: 'capture', origin: originOf(e.currentTarget) })}>
     <span className="instants-face">
      {latestSnap?.mediaId && <span className="instants-back"><LocalPhoto id={latestSnap.mediaId}/></span>}
      <Camera/>
     </span>
     <span className="note-name">Instants</span>
    </button>
   </div>
  </div>

  <Dialog open={composing} onOpenChange={value => { setComposing(value); if (!value) setText('') }}>
   <DialogContent>
    <DialogHeader>
     <DialogTitle>A little something</DialogTitle>
     <DialogDescription>One line. It fades on its own after a couple of days, and nobody owes you an answer.</DialogDescription>
    </DialogHeader>
    <label className="field-label" htmlFor="note-text">Your note</label>
    <input id="note-text" className="input" maxLength={90} placeholder="ate cereal for dinner again" value={text}
     onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}/>
    <button type="button" className="btn btn-block" disabled={!text.trim()} onClick={add}><PenLine/>Leave this note</button>
   </DialogContent>
  </Dialog>

  <Dialog open={!!open} onOpenChange={value => !value && setOpen(null)}>
   <DialogContent>
    {open && <>
     <DialogHeader>
      <DialogTitle>{state.people.find(p => p.id === open.person)?.name ?? 'Family'}</DialogTitle>
      <DialogDescription>{new Date(open.at).toLocaleString('en', { weekday: 'long', hour: 'numeric', minute: '2-digit' })}</DialogDescription>
     </DialogHeader>
     <p style={{ fontFamily: 'var(--font-round), sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>{open.text}</p>
     <button type="button" className="btn btn-block" onClick={() => { const person = open.person; setOpen(null); navigate(`chat/${person}`) }}><MessageCircle/>Say something back</button>
     <button type="button" className="btn btn-quiet btn-block" onClick={() => setOpen(null)}>Just noticing, thanks</button>
    </>}
   </DialogContent>
  </Dialog>
 </section>
}

function ChevronGlyph() {
 return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m9 6 6 6-6 6"/></svg>
}
