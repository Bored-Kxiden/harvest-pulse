'use client'
import { useState } from 'react'
import { Dices } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldLabel } from '@/components/ui/field'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { gameForDay, localDay } from '@/lib/harbor/model'
import { makeId, useHarbor } from '@/lib/harbor/store'
import { Avatar } from './avatar'

/** One small shared question a day. It opens once when the app does, and skipping costs nothing. */
export function DailyQuestion({ open, onOpenChange }: { open: boolean; onOpenChange: (value: boolean) => void }) {
 const { state, update, log } = useHarbor()
 const [answer, setAnswer] = useState('')
 const day = localDay()
 if (!state) return null
 const prompt = gameForDay(day)
 const mine = state.games[day]
 const replies = [state.people[0] && { person: state.people[0], text: prompt.mom }, state.people[1] && { person: state.people[1], text: prompt.dad }].filter(Boolean) as { person: { id: string; name: string }; text: string }[]

 const submit = (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault()
  const text = answer.trim(); if (!text) return
  update(s => ({ ...s, games: { ...s.games, [day]: text } }))
  log({ id: makeId(), at: new Date().toISOString(), person: state.people[0]?.id ?? 'family', kind: 'played', text: `Answered today’s little question: “${prompt.q}”`, source: 'game' })
  toast.success('Thanks for playing along.')
 }

 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent>
  <DialogHeader>
   <DialogTitle className="flex items-start gap-2"><Dices className="size-5 mt-1 shrink-0"/>{prompt.q}</DialogTitle>
   <DialogDescription>Today&apos;s little question. No streak to keep — answer today, skip tomorrow, either is fine.</DialogDescription>
  </DialogHeader>

  {mine ? <>
   <div className="flow">
    {replies.map(r => <div key={r.person.id} className="question-answer"><Avatar person={r.person.id} size="sm"/><span><span className="text-sm font-medium block">{r.person.name}</span><span className="small-copy">{r.text}</span></span></div>)}
    <div className="question-answer"><Avatar person="you" size="sm"/><span><span className="text-sm font-medium block">You</span><span className="small-copy">{mine}</span></span></div>
   </div>
   <Button onClick={() => onOpenChange(false)}>Back to your garden</Button>
  </> : <form className="flow" onSubmit={submit}>
   <Field><FieldLabel htmlFor="question-answer">Your answer</FieldLabel><Textarea id="question-answer" maxLength={200} required placeholder="Whatever comes to mind…" value={answer} onChange={e => setAnswer(e.target.value)}/></Field>
   <Button type="submit">Share my answer</Button>
   <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>Not today</Button>
  </form>}
 </DialogContent></Dialog>
}
