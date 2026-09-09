'use client'
import { Flame } from 'lucide-react'
import { beaconWarmth } from '@/lib/harbor/model'
import { useHarbor } from '@/lib/harbor/store'

/** The Lighthouse Beacon: an ambient, non-numeric read of time-since-last-connection. Warms gently, settles after a call — never a countdown, never a guilt cue. */
export function Beacon({compact=true}:{compact?: boolean}) {
 const {state}=useHarbor(); if(!state) return null
 const {level,label,settled}=beaconWarmth(state)
 const copy=settled?'Settled, right after your last call.':label
 if(compact) return <section className="surface beacon-strip" aria-label="Your lighthouse">
  <span className="beacon-orb" data-level={level} aria-hidden="true"/>
  <div className="flex-1 min-w-0"><p className="text-sm font-medium flex items-center gap-2"><Flame className="size-4 muted-icon"/>Your lighthouse</p><p className="small-copy">{copy}</p></div>
 </section>
 return <section className="soft-surface flex items-center gap-5" aria-label="Your lighthouse">
  <span className="beacon-orb beacon-orb-lg" data-level={level} aria-hidden="true"/>
  <div><h2 className="font-serif text-xl">Your lighthouse</h2><p className="small-copy">{copy} It warms a little with time, and settles again after any call — never a countdown, never a scold.</p></div>
 </section>
}
