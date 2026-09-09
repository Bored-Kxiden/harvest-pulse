'use client'
import { useState } from 'react'
import { Footprints, ShieldCheck, Waves } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Field, FieldLabel } from '@/components/ui/field'
import { cueEligibility } from '@/lib/harbor/model'
import { chime, makeId, useHarbor } from '@/lib/harbor/store'
import { ResolutionChoices } from './resolution'
export function SlackTide({navigate}:{navigate:(page:string)=>void}) {
 const {state,update,log}=useHarbor();const [walked,setWalked]=useState('12');const [stopped,setStopped]=useState(true);const [reason,setReason]=useState('');const [cue,setCue]=useState<string|null>(null);const [resolved,setResolved]=useState(false)
 if(!state)return null
 const show=()=>{const reason=cueEligibility(state,Number(walked),stopped);if(reason){setReason(reason);return}const id=makeId();update(s=>({...s,cues:[...s.cues,{id,at:new Date().toISOString()}]}));setReason('');setResolved(false);setCue(id);chime(state.settings.sound)}
 const dismiss=()=>{if(cue&&!resolved)log({id:`dismiss-${cue}`,cueId:cue,at:new Date().toISOString(),person:'mom',kind:'dismissed',text:'Kept a little space for yourself.',source:'walking_stop'});setCue(null)}
 return <div className="entrance"><div className="page-intro"><div className="eyebrow mb-2">A pause, not a push</div><h1>Find your slack tide.</h1><p>Sometimes the right moment is just after you stop.</p></div><div className="page-content !pt-0 flow"><div className="soft-surface flow"><Waves className="size-10" strokeWidth={1}/><h2 className="font-serif text-2xl">Nothing to catch up on.</h2><p className="small-copy">Just an invitation to hear a familiar voice. A call, a little love, or a plan for later—all are welcome. So is doing nothing.</p></div><section className="surface flow"><div className="flex items-center gap-2"><Footprints className="size-5"/><h2 className="font-serif text-xl">Try a walking-stop moment</h2></div><p className="small-copy">Manual simulation only. No sensors are active.</p><Field><FieldLabel htmlFor="walk-demo">Minutes walked</FieldLabel><Input id="walk-demo" type="number" min={0} max={300} value={walked} onChange={e=>setWalked(e.target.value)}/></Field><div className="flex items-center justify-between"><label htmlFor="stopped" className="text-sm">I have fully stopped walking</label><Switch id="stopped" checked={stopped} onCheckedChange={setStopped}/></div><Button onClick={show}>Check this moment</Button>{reason&&<p className="small-copy" role="status">{reason}</p>}<button className="text-link" onClick={()=>navigate('settings')}>Adjust my pace and cue preferences</button></section><p className="notice"><ShieldCheck/>Your walking activity is never shared with Mom. Cues respect your daily limit, cooldown, and existing connections or reminders.</p></div>
 <Dialog open={!!cue} onOpenChange={open=>!open&&dismiss()}><DialogContent><DialogHeader><DialogTitle>A little stillness. A familiar voice?</DialogTitle><DialogDescription>Mom left a little note: “The jasmine is blooming. Thought of you.” No college talk today—just a catch-up.</DialogDescription></DialogHeader><p className="notice"><ShieldCheck/>Private demo cue. Your activity is never shared.</p><ResolutionChoices key={cue} source="walking_stop" cueId={cue??undefined} onDone={()=>setResolved(true)}/><Button variant="ghost" onClick={dismiss}>{resolved?'Back to my day':'Not now, and that’s okay'}</Button></DialogContent></Dialog>
 </div>
}
