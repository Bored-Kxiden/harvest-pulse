'use client'
import { useState } from 'react'
import { UserRoundPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { makeId, useHarbor } from '@/lib/harbor/store'
import { makePerson } from '@/lib/harbor/model'

/** One dialog, opened from two places -- the Your people grid on Home, for the
 *  moment it is clear the sample family is not who you actually meant to
 *  call, and the Your people list in Account, for doing it deliberately
 *  later. Same question, same shape of answer either way, so adding somebody
 *  does not read as a different action depending on where you started it.
 */
export function AddPersonDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
 const { state, update } = useHarbor()
 const [name, setName] = useState('')

 const close = (value: boolean) => { onOpenChange(value); if (!value) setName('') }
 const add = () => {
  const trimmed = name.trim()
  if (!trimmed || !state) return
  const id = `${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'friend'}-${makeId().slice(0, 4)}`
  update(s => ({ ...s, people: [...s.people, makePerson(id, trimmed, s.people.length)], messages: { ...s.messages, [id]: [] } }))
  close(false)
  toast.success(`${trimmed} is in your list now.`)
 }

 return <Dialog open={open} onOpenChange={close}><DialogContent>
  <DialogHeader><DialogTitle>Who else belongs here?</DialogTitle><DialogDescription>They get their own patch of the meadow. Every call you have with them grows a flower in it.</DialogDescription></DialogHeader>
  <div><label className="label" htmlFor="new-person">Their name</label>
   <input className="input" id="new-person" maxLength={40} value={name} placeholder="Nani…" autoComplete="off" spellCheck={false}
    onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}/></div>
  <button type="button" className="btn btn-block" disabled={!name.trim()} onClick={add}><UserRoundPlus aria-hidden="true"/>Give Them a Patch</button>
 </DialogContent></Dialog>
}
