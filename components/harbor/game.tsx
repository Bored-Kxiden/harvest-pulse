'use client'
import { Dices, Sprout } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldLabel } from '@/components/ui/field'
import { gameForDay, localDay, people } from '@/lib/harbor/model'
import { makeId, useHarbor } from '@/lib/harbor/store'
import { toast } from 'sonner'

/** The daily family game ritual: one tiny shared prompt, always visible, no streak counter anywhere. */
export function DailyGame({navigate}:{navigate:(page:string)=>void}) {
 const {state,update,log}=useHarbor(); if(!state) return null
 const day=localDay(); const prompt=gameForDay(day); const mine=state.games[day]
 const submit=(e: React.FormEvent<HTMLFormElement>)=>{
  e.preventDefault()
  const text=String(new FormData(e.currentTarget).get('answer')||'').trim()
  if(!text) return
  const first=!mine
  update(s=>({...s,games:{...s.games,[day]:text}}))
  if(first) log({id:makeId(),at:new Date().toISOString(),person:'family',kind:'played',text:`Answered today’s little question: “${prompt.q}”`,source:'game'})
  toast.success(first?'Thanks for playing along.':'Your answer is updated.')
 }
 return <div className="entrance"><div className="page-intro"><div className="eyebrow mb-2">A tiny shared ritual</div><h1>Today’s little question.</h1><p>No streak to keep. Answer today, skip tomorrow — either is fine.</p></div>
 <div className="page-content !pt-0 flow">
  <section className="gold-surface flow"><div className="flex items-center gap-2"><Dices className="size-5"/><span className="eyebrow !text-foreground">One question, every day</span></div><h2 className="font-serif text-2xl leading-snug">{prompt.q}</h2></section>
  <section className="flow"><div className="section-heading"><h2>What the family said</h2></div>
   {(['mom','dad'] as const).map(id=>{const p=people.find(x=>x.id===id)!; return <div key={id} className="moment-row"><span className="moment-icon"><Sprout/></span><span className="flex-1 min-w-0"><span className="text-sm block font-medium">{p.name}</span><span className="small-copy">{prompt[id]}</span></span></div>})}
   {mine&&<div className="moment-row"><span className="moment-icon"><Sprout/></span><span className="flex-1 min-w-0"><span className="text-sm block font-medium">You</span><span className="small-copy">{mine}</span></span></div>}
  </section>
  <form key={day} className="surface flow" onSubmit={submit}>
   <Field><FieldLabel htmlFor="game-answer">{mine?'Change your answer':'Your answer'}</FieldLabel><Textarea id="game-answer" name="answer" maxLength={200} required placeholder="Whatever comes to mind…" defaultValue={mine??''}/></Field>
   <Button type="submit">{mine?'Update my answer':'Share my answer'}</Button>
   <p className="small-copy">Totally optional. Nothing is lost by skipping a day.</p>
  </form>
  <button className="text-link justify-center" onClick={()=>navigate('home')}>Back home</button>
 </div></div>
}
