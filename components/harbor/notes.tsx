'use client'
import { useState } from 'react'
import { Camera, PenLine, Plus, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { makeId, useHarbor } from '@/lib/harbor/store'
import { saveMedia } from '@/lib/harbor/media'
import type { Note } from '@/lib/harbor/model'
import { Avatar } from './avatar'
import { LocalPhoto } from './media-view'

const DAY = 86400000

/** Notes and snapshots: a line of text or one picture, small enough that nobody owes a reply. */
export function NotesStrip({ navigate }: { navigate: (page: string) => void }) {
 const { state, update } = useHarbor()
 const [composing, setComposing] = useState(false)
 const [open, setOpen] = useState<Note | null>(null)
 const [text, setText] = useState('')
 const [busy, setBusy] = useState(false)
 if (!state) return null

 const fresh = state.notes.filter(n => Date.now() - new Date(n.at).getTime() < 2 * DAY).slice().reverse()
 const mine = fresh.find(n => n.person === 'you')
 const theirs = fresh.filter(n => n.person !== 'you')

 const add = (note: Omit<Note, 'id' | 'at' | 'person'>) => {
  update(s => ({ ...s, notes: [...s.notes, { ...note, id: makeId(), at: new Date().toISOString(), person: 'you' }] }))
  setComposing(false); setText('')
  toast.success('Left for your people. No reply needed.')
 }
 const snapshot = async (file: File) => {
  if (!file.type.startsWith('image/')) { toast.error('Choose an image file.'); return }
  if (file.size > 10 * 1024 * 1024) { toast.error('Please choose a picture under 10 MB.'); return }
  setBusy(true)
  try { const id = makeId(); await saveMedia(id, file); add({ kind: 'snapshot', mediaId: id, text: text.trim() || undefined }) }
  catch { toast.error('Your browser could not save this picture.') }
  finally { setBusy(false) }
 }

 return <section className="flow">
  <div className="section-heading"><h2>A little something</h2><span className="small-copy">notes &amp; snapshots</span></div>
  <div className="notes-strip">
   <button type="button" className="note-item" onClick={() => setComposing(true)}>
    <span className="note-bubble note-bubble-own">{mine?.text ?? 'Leave a note…'}</span>
    <span className="note-face"><Avatar person="you" size="lg"/><span className="note-add-badge"><Plus/></span></span>
    <span className="note-name">You</span>
   </button>
   {theirs.map(note => {
    const person = state.people.find(p => p.id === note.person)
    return <button key={note.id} type="button" className="note-item" onClick={() => setOpen(note)}>
     {note.kind === 'snapshot' && note.mediaId
      ? <span className="note-snap"><LocalPhoto id={note.mediaId} className="note-snap-img"/></span>
      : <span className="note-bubble">{note.text}</span>}
     <span className="note-face"><Avatar person={note.person} size="lg"/></span>
     <span className="note-name">{person?.name ?? 'Family'}</span>
    </button>
   })}
   {!theirs.length && <p className="small-copy self-center">Quiet right now. Yours can be the first.</p>}
  </div>

  <Dialog open={composing} onOpenChange={value => { setComposing(value); if (!value) setText('') }}>
   <DialogContent>
    <DialogHeader>
     <DialogTitle>A little something</DialogTitle>
     <DialogDescription>One line, or one picture. It fades on its own after a couple of days, and nobody owes you an answer.</DialogDescription>
    </DialogHeader>
    <Field>
     <FieldLabel htmlFor="note-text">Your note</FieldLabel>
     <Input id="note-text" maxLength={90} placeholder="ate cereal for dinner again" value={text} onChange={e => setText(e.target.value)}/>
    </Field>
    <Button disabled={!text.trim()} onClick={() => add({ kind: 'note', text: text.trim() })}><PenLine data-icon="inline-start"/>Leave this note</Button>
    <div className="note-or"><span>or</span></div>
    <Field>
     <FieldLabel htmlFor="note-photo">A snapshot</FieldLabel>
     <Input id="note-photo" type="file" accept="image/*" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (file) void snapshot(file) }}/>
    </Field>
    <p className="notice"><ShieldCheck/>{busy ? 'Saving your picture…' : 'Stays on this device. Nothing is sent anywhere real.'}</p>
   </DialogContent>
  </Dialog>

  <Dialog open={!!open} onOpenChange={value => !value && setOpen(null)}>
   <DialogContent>
    {open && <>
     <DialogHeader>
      <DialogTitle>{state.people.find(p => p.id === open.person)?.name ?? 'Family'}</DialogTitle>
      <DialogDescription>{new Date(open.at).toLocaleString('en', { weekday: 'long', hour: 'numeric', minute: '2-digit' })}</DialogDescription>
     </DialogHeader>
     {open.kind === 'snapshot' && open.mediaId
      ? <><LocalPhoto id={open.mediaId} className="w-full max-h-72 rounded-xl object-cover"/>{open.text && <p className="font-serif text-xl">{open.text}</p>}</>
      : <p className="font-serif text-2xl">{open.text}</p>}
     <Button onClick={() => { const person = open.person; setOpen(null); navigate(`chat/${person}`) }}><Camera data-icon="inline-start"/>Say something back</Button>
     <Button variant="ghost" onClick={() => setOpen(null)}>Just noticing, thanks</Button>
    </>}
   </DialogContent>
  </Dialog>
 </section>
}
