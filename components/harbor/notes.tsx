'use client'
import { useState } from 'react'
import { MessageCircle, PenLine, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { makeId, useHarbor } from '@/lib/harbor/store'
import type { Note } from '@/lib/harbor/model'
import { Avatar } from './avatar'
import { SnapTile, type SnapIntent } from './snap'

const DAY = 86400000

/** Notes: a line of text, small enough that nobody owes a reply. Pictures live in Snap. */
export function NotesStrip({ navigate, onOpenSnap }: { navigate: (page: string) => void; onOpenSnap: (intent: SnapIntent) => void }) {
 const { state, update } = useHarbor()
 const [composing, setComposing] = useState(false)
 const [open, setOpen] = useState<Note | null>(null)
 const [text, setText] = useState('')
 if (!state) return null

 const fresh = state.notes.filter(n => Date.now() - new Date(n.at).getTime() < 2 * DAY).slice().reverse()
 const mine = fresh.find(n => n.person === 'you')
 const theirs = fresh.filter(n => n.person !== 'you')

 const add = () => {
  const value = text.trim(); if (!value) return
  update(s => ({ ...s, notes: [...s.notes, { id: makeId(), at: new Date().toISOString(), person: 'you', text: value }] }))
  setComposing(false); setText('')
  toast.success('Left for your people. No reply needed.')
 }

 return <section className="flow">
  <div className="section-heading"><h2>A little something</h2><span className="small-copy">notes &amp; instants</span></div>
  <div className="notes-strip">
   <button type="button" className="note-item" onClick={() => setComposing(true)}>
    <span className="note-bubble note-bubble-own">{mine?.text ?? 'Leave a note…'}</span>
    <span className="note-face"><Avatar person="you" size="lg"/><span className="note-add-badge"><Plus/></span></span>
    <span className="note-name">You</span>
   </button>
   {theirs.map(note => <button key={note.id} type="button" className="note-item" onClick={() => setOpen(note)}>
    <span className="note-bubble">{note.text}</span>
    <span className="note-face"><Avatar person={note.person} size="lg"/></span>
    <span className="note-name">{state.people.find(p => p.id === note.person)?.name ?? 'Family'}</span>
   </button>)}
   <SnapTile onOpen={onOpenSnap}/>
  </div>

  <Dialog open={composing} onOpenChange={value => { setComposing(value); if (!value) setText('') }}>
   <DialogContent>
    <DialogHeader>
     <DialogTitle>A little something</DialogTitle>
     <DialogDescription>One line. It fades on its own after a couple of days, and nobody owes you an answer.</DialogDescription>
    </DialogHeader>
    <Field>
     <FieldLabel htmlFor="note-text">Your note</FieldLabel>
     <Input id="note-text" maxLength={90} placeholder="ate cereal for dinner again" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}/>
    </Field>
    <Button disabled={!text.trim()} onClick={add}><PenLine data-icon="inline-start"/>Leave this note</Button>
   </DialogContent>
  </Dialog>

  <Dialog open={!!open} onOpenChange={value => !value && setOpen(null)}>
   <DialogContent>
    {open && <>
     <DialogHeader>
      <DialogTitle>{state.people.find(p => p.id === open.person)?.name ?? 'Family'}</DialogTitle>
      <DialogDescription>{new Date(open.at).toLocaleString('en', { weekday: 'long', hour: 'numeric', minute: '2-digit' })}</DialogDescription>
     </DialogHeader>
     <p className="font-serif text-2xl">{open.text}</p>
     <Button onClick={() => { const person = open.person; setOpen(null); navigate(`chat/${person}`) }}><MessageCircle data-icon="inline-start"/>Say something back</Button>
     <Button variant="ghost" onClick={() => setOpen(null)}>Just noticing, thanks</Button>
    </>}
   </DialogContent>
  </Dialog>
 </section>
}
