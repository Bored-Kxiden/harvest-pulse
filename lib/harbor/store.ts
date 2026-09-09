'use client'
import useSWR from 'swr'
import { toast } from 'sonner'
import { addMoment, parseState, reconcile, seedState, type HarborState, type Moment } from './model'
const KEY='harbor-demo-v1'
let current: HarborState | undefined
let warned=false
function persist(state: HarborState) {
 try { localStorage.setItem(KEY,JSON.stringify(state)) } catch { if(!warned) { toast.error('Storage is unavailable. Changes will last only for this visit.');warned=true } }
}
function read() {
 if(!current) {
  try { const raw=localStorage.getItem(KEY); current=raw?parseState(raw)??undefined:undefined; if(raw&&!current) toast.info('Saved demo data could not be read. A fresh garden is ready.') } catch { /* Browsers can deny storage access; the in-memory demo remains usable. */ }
  current??=seedState(); persist(current)
 }
 const next=reconcile(current); if(next!==current){current=next;persist(current)}
 return current
}
export function useHarbor() {
 const {data,mutate}=useSWR<HarborState>(KEY,read,{refreshInterval:15000,revalidateOnFocus:true,dedupingInterval:1000})
 const update=(fn:(state:HarborState)=>HarborState)=>{current=fn(current??data??read());persist(current);void mutate(current,false)}
 const log=(moment:Moment)=>update(s=>addMoment(s,moment))
 const reset=()=>{current=seedState();persist(current);void mutate(current,false)}
 return {state:data,update,log,reset}
}
export function makeId() { return crypto.randomUUID() }
export function chime(sound: string) {
 if(sound==='silent') return
 try {
  const ctx=new AudioContext(); const osc=ctx.createOscillator(); const gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.type='sine';osc.frequency.setValueAtTime(sound==='soft'?440:660,ctx.currentTime);gain.gain.setValueAtTime(.08,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+1);osc.start();osc.stop(ctx.currentTime+1);osc.onended=()=>void ctx.close()
 } catch { toast.info('Sound is not supported in this browser.') }
}
