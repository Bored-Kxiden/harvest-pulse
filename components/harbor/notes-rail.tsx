'use client'
import { useState } from 'react'
import { Camera, MessageCircle, PenLine } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { makeId, useHarbor } from '@/lib/harbor/store'
import type { Note } from '@/lib/harbor/model'
import { LocalPhoto } from './media-view'

const DAY = 86400000

/** One bubble per person, each over its own face, with room between them.
    Pictures do not live here — they live on the rail down the right of the meadow. */
export function NotesRail({ navigate, onOpenCamera }: { navigate: (page: string) => void; onOpenCamera: () => void }) {
 const { state, update } = useHarbor()
 const [composing, setComposing] = useState(false)
 const [open, setOpen] = useState<Note | null>(null)
 const [text, setText] = useState('')
 if (!state) return null

 const fresh = state.notes.filter(n => Date.now() - new Date(n.at).getTime() < 2 * DAY).slice().reverse()
 const mine = fresh.find(n => n.person === 'you')

 const add = () => {
  const value = text.trim()
  if (!value) return
  update(s => ({ ...s, notes: [...s.notes, { id: makeId(), at: new Date().toISOString(), person: 'you', text: value }] }))
  setComposing(false); setText('')
  toast.success('Left for your people. No reply needed.')
 }

 return <div className="something">
  <div className="notes-rail">
   <button type="button" className="note-item" onClick={() => setComposing(true)}>
    {mine && <span className="note-bubble">{mine.text}</span>}
    <span className="note-face tint-gold"><PenLine aria-hidden="true"/></span>
    <span className="note-name">You</span>
   </button>
   {state.people.map(person => {
    const note = fresh.find(n => n.person === person.id)
    return <button key={person.id} type="button" className="note-item"
     onClick={() => note ? setOpen(note) : navigate(`chat/${person.id}`)}>
     {note && <span className="note-bubble">{note.text}</span>}
     <span className={`note-face tint-${person.tone}`}>
      {person.photoId ? <LocalPhoto id={person.photoId} className="avatar-photo"/> : <span className="note-initial">{person.initials}</span>}
      {note && <span className="note-dot"/>}
     </span>
     <span className="note-name">{person.name}</span>
    </button>
   })}
  </div>
  <button type="button" className="note-item" style={{ paddingBottom: 6 }} onClick={onOpenCamera}>
   <span className="note-face" style={{ background: 'var(--ink)' }}><Camera aria-hidden="true" style={{ color: '#FEFCF5' }}/></span>
   <span className="note-name">Instant</span>
  </button>

  <Dialog open={composing} onOpenChange={value => { setComposing(value); if (!value) setText('') }}>
   <DialogContent>
    <DialogHeader>
     <DialogTitle>A little something</DialogTitle>
     <DialogDescription>One line. It fades on its own after a couple of days, and nobody owes you an answer.</DialogDescription>
    </DialogHeader>
    <label className="label" htmlFor="note-text">Your note</label>
    <input id="note-text" className="input" maxLength={90} placeholder="ate cereal for dinner again…" value={text}
     autoComplete="off" onChange={e => setText(e.target.value)}
     onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}/>
    <button type="button" className="btn btn-block" disabled={!text.trim()} onClick={add}><PenLine aria-hidden="true"/>Leave This Note</button>
   </DialogContent>
  </Dialog>

  <Dialog open={!!open} onOpenChange={value => !value && setOpen(null)}>
   <DialogContent>
    {open && <>
     <DialogHeader>
      <DialogTitle>{state.people.find(p => p.id === open.person)?.name ?? 'Family'}</DialogTitle>
      <DialogDescription>{new Date(open.at).toLocaleString(undefined, { weekday: 'long', hour: 'numeric', minute: '2-digit' })}</DialogDescription>
     </DialogHeader>
     <p style={{ fontFamily: 'var(--font-script), cursive', fontSize: 24, lineHeight: 1.25, color: 'var(--ink-deep)' }}>{open.text}</p>
     <button type="button" className="btn btn-block" onClick={() => { const person = open.person; setOpen(null); navigate(`chat/${person}`) }}>
      <MessageCircle aria-hidden="true"/>Say Something Back
     </button>
     <button type="button" className="btn btn-quiet btn-block" onClick={() => setOpen(null)}>Just noticing, thanks</button>
    </>}
   </DialogContent>
  </Dialog>
 </div>
}
