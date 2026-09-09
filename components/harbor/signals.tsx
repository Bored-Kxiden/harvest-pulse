'use client'
import { useState } from 'react'
import { Camera, ChevronRight, Film, Newspaper, Plus, ShieldCheck, UtensilsCrossed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldLabel } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useHarbor, makeId } from '@/lib/harbor/store'
import { saveMedia } from '@/lib/harbor/media'
import { exaggerateRecap, people, type Signal, type SignalKind } from '@/lib/harbor/model'
import { LocalMedia } from './media-view'
import { ResolutionChoices } from './resolution'
import { toast } from 'sonner'

const kindIcon: Record<SignalKind, typeof Camera> = { photo: Camera, watching: Film, meal: UtensilsCrossed, recap: Newspaper }
const kindLabel: Record<SignalKind, string> = { photo: 'A little photo', watching: 'Something watched', meal: 'A meal status', recap: 'Today’s dramatic recap' }
function signalGist(s: Signal) {
 if(s.kind==='photo') return s.caption||'A little photo, no words needed.'
 if(s.kind==='watching') return s.title||'Something worth a look.'
 if(s.kind==='meal') return s.meal==='just_ate'?'Just ate.':'About to eat.'
 return s.recapText||s.recapInput||''
}

/** Home's horizontal strip of recent low-friction signals — every card is visible on its own; a response is offered, never required. */
export function SignalFeed() {
 const {state}=useHarbor(); const [selected,setSelected]=useState<Signal|null>(null); const [done,setDone]=useState(false)
 if(!state) return null
 const recent=state.signals.slice(-8).reverse()
 return <section className="flow"><div className="section-heading"><h2>A little something</h2><a className="text-link" href="#quick">Quick share <ChevronRight/></a></div>
  <div className="signal-scroller">
   <a href="#quick" className="signal-add" aria-label="Send a quick share"><Plus/><span className="small-copy">Add</span></a>
   {recent.map(s=>{const Icon=kindIcon[s.kind];const p=people.find(x=>x.id===s.person);return <button key={s.id} className="signal-card text-left" onClick={()=>{setSelected(s);setDone(false)}}>{s.kind==='photo'&&s.mediaId?<LocalMedia id={s.mediaId} kind="photo"/>:<span className="signal-card-icon"><Icon/></span>}<span className="text-sm font-medium block line-clamp-2">{signalGist(s)}</span><span className="small-copy">{p?.name??'Family'}</span></button>})}
   {!recent.length&&<p className="small-copy py-2">Nothing yet. The first little share can be yours.</p>}
  </div>
  <Dialog open={!!selected} onOpenChange={open=>!open&&setSelected(null)}>
   <DialogContent>
    {selected&&<>
     <DialogHeader><DialogTitle>{kindLabel[selected.kind]}</DialogTitle><DialogDescription>{people.find(p=>p.id===selected.person)?.name??'Family'} · {new Date(selected.at).toLocaleDateString('en',{month:'short',day:'numeric'})}</DialogDescription></DialogHeader>
     {selected.kind==='photo'&&selected.mediaId&&<LocalMedia id={selected.mediaId} kind="photo"/>}
     {selected.kind==='recap'?<article className="dispatch-paper flow"><p className="eyebrow text-center">Today’s dramatic recap</p><p className="whitespace-pre-wrap text-base leading-relaxed">{selected.recapText}</p></article>:<p className="font-serif text-xl">{signalGist(selected)}</p>}
     {selected.note&&selected.kind==='watching'&&<p className="small-copy">{selected.note}</p>}
     {done?<p className="small-copy" role="status">Saved to your garden.</p>:<><p className="small-copy text-center">No right way to reply. Choose what feels like you, or just close this.</p><ResolutionChoices person={selected.person} source="signal" onDone={()=>setDone(true)}/></>}
    </>}
   </DialogContent>
  </Dialog>
 </section>
}

/** A composer lighter than Dispatch — one tap or a line of text, delivered right away, no headline or topic required. */
export function QuickShare({navigate}:{navigate:(page:string)=>void}) {
 const {state,update}=useHarbor(); const [kind,setKind]=useState<SignalKind>('photo'); const [person,setPerson]=useState('mom')
 const [caption,setCaption]=useState(''); const [mediaId,setMediaId]=useState<string>()
 const [title,setTitle]=useState(''); const [note,setNote]=useState('')
 const [recapInput,setRecapInput]=useState(''); const [recapText,setRecapText]=useState('')
 const [busy,setBusy]=useState(false)
 if(!state) return null
 const upload=async(file:File)=>{if(!file.type.startsWith('image/')){toast.error('Choose an image file.');return}if(file.size>10*1024*1024){toast.error('Please choose a file smaller than 10 MB.');return}setBusy(true);try{const id=makeId();await saveMedia(id,file);setMediaId(id);toast.success('Photo saved only on this device.')}catch{toast.error('Your browser could not save this photo.')}finally{setBusy(false)}}
 const share=(signal:Omit<Signal,'id'|'at'|'person'>)=>{update(s=>({...s,signals:[...s.signals,{...signal,id:makeId(),at:new Date().toISOString(),person}]}));toast.success('Sent — a little something, no big production.');navigate('home')}
 return <div className="entrance"><div className="page-intro"><div className="eyebrow mb-2">Faster than a full dispatch</div><h1>Quick share.</h1><p>Small, low-effort ways to reach out — no headline required.</p></div>
 <div className="page-content !pt-0 flow">
  <Badge variant="secondary">Simulated family view · demo composer</Badge>
  <Field><FieldLabel htmlFor="qs-from">From</FieldLabel><select id="qs-from" className="select" value={person} onChange={e=>setPerson(e.target.value)}>{people.filter(p=>p.id!=='family').map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
  <div className="season-options" role="radiogroup" aria-label="What kind of quick share">
   {([['photo','Photo',Camera],['watching','Watch',Film],['meal','Meal',UtensilsCrossed],['recap','Recap',Newspaper]] as const).map(([id,label,Icon])=><label key={id}><input type="radio" name="kind" value={id} checked={kind===id} onChange={()=>setKind(id)}/><span><Icon className="size-4"/>{label}</span></label>)}
  </div>

  {kind==='photo'&&<div className="surface flow">
   <Field><FieldLabel htmlFor="qs-photo">A photo</FieldLabel><Input id="qs-photo" type="file" accept="image/*" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f)}}/></Field>
   {mediaId&&<LocalMedia id={mediaId} kind="photo"/>}
   <Field><FieldLabel htmlFor="qs-caption">An optional line</FieldLabel><Input id="qs-caption" maxLength={140} placeholder="No words needed, really" value={caption} onChange={e=>setCaption(e.target.value)}/></Field>
   <Button disabled={!mediaId||busy} onClick={()=>share({kind:'photo',mediaId,caption:caption.trim()||undefined})}>Send this photo</Button>
  </div>}

  {kind==='watching'&&<div className="surface flow">
   <Field><FieldLabel htmlFor="qs-title">What I just watched</FieldLabel><Input id="qs-title" maxLength={100} value={title} onChange={e=>setTitle(e.target.value)}/></Field>
   <Field><FieldLabel htmlFor="qs-note">An optional line</FieldLabel><Textarea id="qs-note" maxLength={200} value={note} onChange={e=>setNote(e.target.value)}/></Field>
   <Button disabled={!title.trim()} onClick={()=>share({kind:'watching',title:title.trim(),note:note.trim()||undefined})}>Send this along</Button>
  </div>}

  {kind==='meal'&&<div className="surface flow">
   <p className="small-copy">One tap. No words needed — that’s the whole point.</p>
   <div className="grid grid-cols-2 gap-2">
    <Button variant="outline" onClick={()=>share({kind:'meal',meal:'about_to_eat'})}>About to eat</Button>
    <Button variant="outline" onClick={()=>share({kind:'meal',meal:'just_ate'})}>Just ate</Button>
   </div>
  </div>}

  {kind==='recap'&&<div className="surface flow">
   <Field><FieldLabel htmlFor="qs-recap">Three little, ordinary things from today</FieldLabel><Textarea id="qs-recap" maxLength={400} placeholder="Woke up late. Ate leftover rice. Watched the rain for a bit." value={recapInput} onChange={e=>{setRecapInput(e.target.value);setRecapText('')}}/></Field>
   {!recapText?<Button variant="outline" disabled={!recapInput.trim()} onClick={()=>setRecapText(exaggerateRecap(recapInput))}>Make it dramatic</Button>:<>
    <article className="dispatch-paper flow"><p className="eyebrow text-center">Today’s dramatic recap</p><p className="whitespace-pre-wrap text-base leading-relaxed">{recapText}</p></article>
    <div className="flex gap-2"><Button onClick={()=>share({kind:'recap',recapInput,recapText})}>Share this headline</Button><Button variant="ghost" onClick={()=>setRecapText('')}>Try again</Button></div>
   </>}
  </div>}

  <p className="notice"><ShieldCheck/>Delivered right away in this local demo. Nothing is sent anywhere real.</p>
 </div></div>
}
