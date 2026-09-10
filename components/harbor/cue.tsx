'use client'
import { useEffect, useRef, useState } from 'react'
import { CalendarClock, Check, Footprints, Heart, Phone, ShieldCheck, Waves } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Field, FieldLabel } from '@/components/ui/field'
import { buzz, makeId, ring, useHarbor } from '@/lib/harbor/store'
import { cueEligibility, isFuture, topics, usualCallMinutes, type Moment } from '@/lib/harbor/model'
import { Avatar } from './avatar'

export type Cue = { id: string; person: string }

/** The cue itself: a full screen that rings, states the shape of the ask, and offers three equal ways through. */
export function CueOverlay({ cue, onDismiss, onCall }: { cue: Cue; onDismiss: () => void; onCall: (topic?: string) => void }) {
 const { state, log } = useHarbor()
 const [step, setStep] = useState<'cue' | 'react' | 'later'>('cue')
 const [topic, setTopic] = useState<string>()
 const [line, setLine] = useState('')
 const [when, setWhen] = useState('')
 const [error, setError] = useState('')
 const settled = useRef(false)

 useEffect(() => {
  buzz()
  const stop = ring(state?.settings.sound ?? 'chime', 3)
  return () => stop()
 }, [])

 if (!state) return null
 const person = state.people.find(p => p.id === cue.person) ?? state.people[0]
 const usual = usualCallMinutes(state, person.id)

 const finish = (moment: Omit<Moment, 'id' | 'at' | 'person' | 'source' | 'cueId'>) => {
  settled.current = true
  log({ ...moment, id: makeId(), at: new Date().toISOString(), person: person.id, source: 'walking_stop', cueId: cue.id })
 }
 const leave = () => {
  if (!settled.current) log({ id: `dismiss-${cue.id}`, at: new Date().toISOString(), person: person.id, kind: 'dismissed', text: 'Kept a little space for yourself.', source: 'walking_stop', cueId: cue.id })
  onDismiss()
 }

 return <div className="cue-screen" role="dialog" aria-modal="true" aria-label={`A quiet moment to call ${person.name}`}>
  <div className="cue-sheet">
   <div className="cue-top">
    <span className="cue-mark"><Waves/>harbor</span>
    <span className="cue-now">now</span>
   </div>

   <div className="cue-person">
    <span className="cue-ring"><Avatar person={person.id} size="xl"/></span>
    <p className="cue-person-name">{person.name}</p>
   </div>

   {step === 'cue' && <div className="cue-body">
    <h1 className="cue-title">Looks like you&apos;re free.</h1>
    <p className="cue-sub">You just stopped walking — a good moment, if you want it.</p>
    <p className="cue-length">calls with {person.name} usually run <b>~{usual ?? 12} min</b></p>

    <div className="cue-topics" role="group" aria-label="Give the call a shape, before it starts">
     {topics.map(t => <button key={t} type="button" className="cue-topic" aria-pressed={topic === t} onClick={() => setTopic(topic === t ? undefined : t)}>{t}</button>)}
    </div>

    <div className="cue-paths">
     <button type="button" className="cue-path" onClick={() => { settled.current = true; onCall(topic) }}>
      <span className="cue-path-icon"><Phone/></span>
      <span className="cue-path-main">Call now</span>
      <span className="cue-path-sub">~{usual ?? 12} min, usually</span>
     </button>
     <button type="button" className="cue-path" onClick={() => setStep('react')}>
      <span className="cue-path-icon"><Heart/></span>
      <span className="cue-path-main">Send a reaction</span>
      <span className="cue-path-sub">a photo, one line</span>
     </button>
     <button type="button" className="cue-path" onClick={() => setStep('later')}>
      <span className="cue-path-icon"><CalendarClock/></span>
      <span className="cue-path-main">Propose a later time</span>
      <span className="cue-path-sub">becomes today&apos;s next nudge</span>
     </button>
    </div>

    <button type="button" className="cue-out" onClick={leave}>not now</button>
    <p className="cue-privacy"><ShieldCheck/>Your walking stays on this phone. {person.name} never sees it.</p>
   </div>}

   {step === 'react' && <div className="cue-body">
    <h1 className="cue-title cue-title-sm">A little love, then.</h1>
    <p className="cue-sub">One line is plenty. No call, no explanation.</p>
    <Field>
     <FieldLabel htmlFor="cue-line">Your line</FieldLabel>
     <Input id="cue-line" maxLength={120} placeholder="thinking of you, that&apos;s all" value={line} onChange={e => setLine(e.target.value)}/>
    </Field>
    <Button disabled={!line.trim()} onClick={() => { finish({ kind: 'reacted', text: line.trim(), topic }); toast.success('Sent. Nothing owed either way.'); onDismiss() }}><Check data-icon="inline-start"/>Send it</Button>
    <button type="button" className="cue-out" onClick={() => setStep('cue')}>back</button>
   </div>}

   {step === 'later' && <div className="cue-body">
    <h1 className="cue-title cue-title-sm">When would suit you?</h1>
    <p className="cue-sub">A possibility, not a promise. It becomes today&apos;s next nudge and nothing more.</p>
    <Field>
     <FieldLabel htmlFor="cue-when">A better time</FieldLabel>
     <Input id="cue-when" type="datetime-local" value={when} onChange={e => { setWhen(e.target.value); setError('') }} aria-invalid={!!error}/>
    </Field>
    {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    <Button onClick={() => {
     if (!isFuture(when)) { setError('Choose a time still ahead of you.'); return }
     finish({ kind: 'proposed_later', text: 'Made a little room to talk later.', proposedTime: new Date(when).toISOString(), topic })
     toast.success('Saved. You will see it when the time comes.')
     onDismiss()
    }}><CalendarClock data-icon="inline-start"/>Hold that time</Button>
    <button type="button" className="cue-out" onClick={() => setStep('cue')}>back</button>
   </div>}
  </div>
 </div>
}

/** The demo trigger. A real build watches for the walking-to-still transition; here you stand in for the sensor. */
export function CueScreen({ navigate, onFire }: { navigate: (page: string) => void; onFire: (personId: string) => void }) {
 const { state, update } = useHarbor()
 const [walked, setWalked] = useState('12')
 const [stopped, setStopped] = useState(true)
 const [reason, setReason] = useState('')
 if (!state) return null
 const person = state.people[0]

 const check = () => {
  const blocked = cueEligibility(state, Number(walked), stopped)
  if (blocked) { setReason(blocked); return }
  setReason(''); onFire(person.id)
 }

 return <div className="entrance">
  <div className="page-intro"><div className="eyebrow mb-2">A pause, not a push</div><h1>Find your slack tide.</h1><p>Sometimes the right moment is just after you stop.</p></div>
  <div className="page-content !pt-0 flow">
   <div className="soft-surface flow"><Waves className="size-10" strokeWidth={1}/><h2 className="font-serif text-2xl">Nothing to catch up on.</h2><p className="small-copy">When a walk ends, your phone buzzes and rings the sound you chose, and the cue takes over the screen. A call, a little love, or a plan for later — all are welcome. So is doing nothing.</p></div>
   <section className="surface flow">
    <div className="flex items-center gap-2"><Footprints className="size-5"/><h2 className="font-serif text-xl">Try a walking-stop moment</h2></div>
    <p className="small-copy">Manual simulation only. No sensors are active in this web demo.</p>
    <Field><FieldLabel htmlFor="walk-demo">Minutes walked</FieldLabel><Input id="walk-demo" type="number" min={0} max={300} value={walked} onChange={e => setWalked(e.target.value)}/></Field>
    <div className="flex items-center justify-between"><label htmlFor="stopped" className="text-sm">I have fully stopped walking</label><Switch id="stopped" checked={stopped} onCheckedChange={setStopped}/></div>
    <Button onClick={check}>Ring the cue</Button>
    {reason && <p className="small-copy" role="status">{reason}</p>}
    {!state.settings.cuesEnabled && <Button variant="outline" onClick={() => update(s => ({ ...s, settings: { ...s.settings, cuesEnabled: true } }))}>Turn cues on</Button>}
    <button className="text-link" onClick={() => navigate('settings')}>Adjust my pace, sound and limits</button>
   </section>
   <p className="notice"><ShieldCheck/>Your walking activity is never shared. Cues respect your daily limit, your cooldown, and any connection you have already made today.</p>
  </div>
 </div>
}
