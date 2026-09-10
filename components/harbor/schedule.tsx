'use client'
import { useState } from 'react'
import { CalendarClock, CalendarDays, ChevronRight, Clock3, Leaf, LockKeyhole, Plus, ShieldCheck, Sun, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { makeId, useHarbor } from '@/lib/harbor/store'
import { formatTime, isFuture, localDay, minutes, sharedWindows, validIntervals, type Interval } from '@/lib/harbor/model'

export function Schedule({ navigate }: { navigate: (page: string) => void }) {
 const { state, update, log } = useHarbor()
 const [day, setDay] = useState(localDay())
 const [shareDialog, setShareDialog] = useState(false)
 const [mutualDialog, setMutualDialog] = useState(false)
 const [editor, setEditor] = useState<'you' | 'mom' | null>(null)
 const [intervals, setIntervals] = useState<Interval[]>([])
 const [error, setError] = useState('')
 const [milestone, setMilestone] = useState(false)
 const [plan, setPlan] = useState(false)
 const [when, setWhen] = useState('')
 const [planError, setPlanError] = useState('')
 if (!state) return null

 const partner = state.people[0]
 const windows = sharedWindows(state, day)
 const schedule = state.schedules[day] ?? { you: [], mom: [] }
 const days = Math.ceil((new Date(`${state.milestone.date}T12:00:00`).getTime() - new Date(`${localDay()}T12:00:00`).getTime()) / 86400000)
 const openEditor = (person: 'you' | 'mom') => { setIntervals(schedule[person].map(v => ({ ...v }))); setError(''); setEditor(person) }

 return <div className="entrance">
  <div className="page-intro"><div className="eyebrow mb-2">Room for real life</div><h1>Your schedule.</h1><p>Different rhythms. A little common ground.</p></div>
  <div className="page-content !pt-0"><div className="flow">

   <section className="surface flow">
    <div className="share-row">
     <div className="share-cell">
      <span className="share-label">Share my load</span>
      {state.sharingSetupDone
       ? <button type="button" className="icon-toggle icon-toggle-sm" aria-pressed={state.sharing} aria-label="Share my load" onClick={() => update(s => ({ ...s, sharing: !s.sharing }))}><Leaf/></button>
       : <button type="button" className="icon-toggle icon-toggle-sm" aria-pressed="false" aria-label="Set up sharing my load" onClick={() => setShareDialog(true)}><Leaf/></button>}
     </div>
     {state.sharingSetupDone && state.sharing && <div className="share-cell">
      <span className="share-label">Mutual sharing</span>
      <button type="button" className="icon-toggle icon-toggle-sm" aria-pressed={state.momConsent} aria-label={`Mutual sharing with ${partner.name}`} onClick={() => update(s => ({ ...s, momConsent: !s.momConsent }))}><Users/></button>
     </div>}
    </div>
    <p className="notice"><ShieldCheck/>Only free and busy times. Never event names, locations, or activity.</p>
   </section>

   <section className="soft-surface flow">
    <div className="flex items-center gap-2"><Sun className="size-5" strokeWidth={1.4}/><span className="eyebrow !text-primary">A little window, together</span></div>
    {!state.sharing ? <><h2 className="font-serif text-2xl">Your rhythm stays yours.</h2><p className="small-copy">Turn on Share my load above to find a shared free window.</p></>
     : !state.momConsent ? <><h2 className="font-serif text-2xl">It takes two.</h2><p className="small-copy">Turn on Mutual sharing above once you&apos;re both ready.</p></>
      : windows.length ? <>{windows.map(w => <div key={w.start}><h2 className="window-time">{formatTime(w.start)} – {formatTime(w.end)}</h2><p className="small-copy">{minutes(w.end) - minutes(w.start)} unhurried minutes · {day === localDay() ? 'today' : new Date(`${day}T12:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</p></div>)}<p className="small-copy">A possibility, not an obligation.</p><Button variant="outline" onClick={() => setPlan(true)}>Make a little plan <ChevronRight data-icon="inline-end"/></Button></>
       : <><h2 className="font-serif text-2xl">A full day for both of you.</h2><p className="small-copy">No overlap on this day. That&apos;s okay—try another day or leave a little note.</p><Button variant="outline" onClick={() => navigate(`chat/${partner.id}`)}>Leave {partner.name} a note</Button></>}
   </section>

   <section className="flow">
    <div className="section-heading"><h2>Your daily rhythms</h2><Clock3 className="size-5 muted-icon"/></div>
    <Field><FieldLabel htmlFor="schedule-date">Choose a day</FieldLabel><Input id="schedule-date" type="date" value={day} required onChange={e => e.target.value && setDay(e.target.value)}/></Field>
    <div className="surface flow">
     {(['you', 'mom'] as const).map(person => <div key={person}>
      <div className="flex items-center justify-between"><span className="text-sm font-medium">{person === 'you' ? 'You' : partner.name}</span><button className="text-link" onClick={() => openEditor(person)}>{person === 'mom' ? 'Edit demo schedule' : 'Edit availability'}<ChevronRight/></button></div>
      {person === 'mom' && !(state.sharing && state.momConsent)
       ? <p className="notice"><LockKeyhole/>Private until you both opt in.</p>
       : <><div className="rhythm" role="img" aria-label={`${person === 'you' ? 'Your' : `${partner.name}'s`} free times: ${schedule[person].map(x => `${formatTime(x.start)} to ${formatTime(x.end)}`).join(', ') || 'not set'}`}>{schedule[person].map((v, i) => <span className="rhythm-free" key={i} style={{ left: `${minutes(v.start) / 14.4}%`, width: `${(minutes(v.end) - minutes(v.start)) / 14.4}%` }}/>)}</div><p className="small-copy mt-2">{schedule[person].length ? schedule[person].map(x => `${formatTime(x.start)}–${formatTime(x.end)}`).join(' · ') : 'No free blocks yet'}</p></>}
     </div>)}
     <div className="flex justify-between small-copy"><span>12 am</span><span>12 pm</span><span>12 am</span></div>
     <div className="flex gap-4 small-copy"><span className="flex items-center gap-2"><span className="size-3 rounded bg-accent"/>Free</span><span className="flex items-center gap-2"><span className="size-3 rounded bg-secondary border"/>Busy / unset</span></div>
    </div>
   </section>

   <button className="gold-surface flex items-center gap-3 text-left" onClick={() => setMilestone(true)}>
    <CalendarDays className="size-6" strokeWidth={1.4}/>
    <div className="flex-1"><p className="font-serif text-lg">{state.milestone.title} {days > 0 ? `in ${days % 7 === 0 ? `${days / 7} weeks` : `${days} days`}` : days === 0 ? 'today' : '— a season you moved through'}</p><p className="small-copy">A little context goes a long way.</p></div>
    <ChevronRight className="size-4"/>
   </button>
   <p className="demo-footnote">Editable demo schedules · no calendar connected</p>
  </div></div>

  <Dialog open={shareDialog} onOpenChange={setShareDialog}><DialogContent>
   <DialogHeader><DialogTitle>A little more understanding.</DialogTitle><DialogDescription>Share your free/busy rhythm with {partner.name}, only when you both agree. Your event titles, locations, and activity never leave your private view.</DialogDescription></DialogHeader>
   <p className="notice"><ShieldCheck/>Switch sharing off anytime. Your private schedule stays saved. This demo does not send data anywhere.</p>
   <Button onClick={() => { update(s => ({ ...s, sharing: true })); setShareDialog(false); setMutualDialog(true) }}>I agree to share my availability</Button>
   <Button variant="ghost" onClick={() => setShareDialog(false)}>Not now</Button>
  </DialogContent></Dialog>

  <Dialog open={mutualDialog} onOpenChange={open => { setMutualDialog(open); if (!open) update(s => ({ ...s, sharingSetupDone: true })) }}><DialogContent>
   <DialogHeader><DialogTitle>Ask {partner.name}, too?</DialogTitle><DialogDescription>Mutual sharing only works once they agree on their side. This demo lets you simulate that yes — you can flip it on or off anytime from the toggles.</DialogDescription></DialogHeader>
   <p className="notice"><ShieldCheck/>Nothing here is sent to a real person.</p>
   <Button onClick={() => { update(s => ({ ...s, momConsent: true, sharingSetupDone: true })); setMutualDialog(false) }}>Simulate their yes</Button>
   <Button variant="ghost" onClick={() => { update(s => ({ ...s, sharingSetupDone: true })); setMutualDialog(false) }}>Maybe later</Button>
  </DialogContent></Dialog>

  <Dialog open={!!editor} onOpenChange={open => !open && setEditor(null)}><DialogContent>
   <DialogHeader><DialogTitle>{editor === 'mom' ? `${partner.name}'s demo availability` : 'Make room in your day'}</DialogTitle><DialogDescription>{editor === 'mom' ? 'You are editing sample data, not a real person’s calendar. These blocks remain private while sharing is off.' : 'Add free blocks. Everything else is treated as busy or not set.'}</DialogDescription></DialogHeader>
   <form className="flow" onSubmit={e => { e.preventDefault(); if (!validIntervals(intervals)) { setError('Each end time must be after its start, on the same day.'); return } update(s => ({ ...s, schedules: { ...s.schedules, [day]: { ...(s.schedules[day] ?? { you: [], mom: [] }), [editor!]: intervals } } })); setEditor(null); toast.success('Your rhythm is saved.') }}>
    <FieldGroup>{intervals.map((v, i) => <div className="flex items-end gap-2" key={i}>
     <Field><FieldLabel htmlFor={`start-${i}`}>From</FieldLabel><Input id={`start-${i}`} type="time" required value={v.start} onChange={e => setIntervals(a => a.map((x, n) => n === i ? { ...x, start: e.target.value } : x))}/></Field>
     <Field><FieldLabel htmlFor={`end-${i}`}>Until</FieldLabel><Input id={`end-${i}`} type="time" required value={v.end} onChange={e => setIntervals(a => a.map((x, n) => n === i ? { ...x, end: e.target.value } : x))}/></Field>
     <Button variant="ghost" size="icon" aria-label={`Remove block ${i + 1}`} onClick={() => setIntervals(a => a.filter((_, n) => n !== i))}><Trash2/></Button>
    </div>)}</FieldGroup>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button variant="outline" disabled={intervals.length >= 12} onClick={() => setIntervals(a => [...a, { start: '18:00', end: '19:00' }])}><Plus data-icon="inline-start"/>Add free block</Button>
    <Button type="submit">Save availability</Button>
   </form>
  </DialogContent></Dialog>

  <Dialog open={milestone} onOpenChange={setMilestone}><DialogContent>
   <DialogHeader><DialogTitle>What&apos;s on the horizon?</DialogTitle><DialogDescription>Private context for your season. Nothing to keep up with.</DialogDescription></DialogHeader>
   <form className="flow" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); update(s => ({ ...s, milestone: { title: String(f.get('title')).trim(), date: String(f.get('date')) } })); setMilestone(false) }}>
    <Field><FieldLabel htmlFor="milestone-title">Milestone</FieldLabel><Input name="title" id="milestone-title" defaultValue={state.milestone.title} maxLength={60} required/></Field>
    <Field><FieldLabel htmlFor="milestone-date">Date</FieldLabel><Input name="date" id="milestone-date" type="date" defaultValue={state.milestone.date} required/></Field>
    <Button type="submit">Save this season</Button>
   </form>
  </DialogContent></Dialog>

  <Dialog open={plan} onOpenChange={setPlan}><DialogContent>
   <DialogHeader><DialogTitle>Leave a little room.</DialogTitle><DialogDescription>A reminder is a possibility, not a promise. It shows up when the time comes and never nags.</DialogDescription></DialogHeader>
   <Field><FieldLabel htmlFor="plan-when">A time that suits you</FieldLabel><Input id="plan-when" type="datetime-local" value={when} onChange={e => { setWhen(e.target.value); setPlanError('') }} aria-invalid={!!planError}/></Field>
   {planError && <p role="alert" className="text-sm text-destructive">{planError}</p>}
   <Button onClick={() => {
    if (!isFuture(when)) { setPlanError('Choose a time still ahead of you.'); return }
    log({ id: makeId(), at: new Date().toISOString(), person: partner.id, kind: 'proposed_later', text: 'Made a little room to talk later.', source: 'manual', proposedTime: new Date(when).toISOString() })
    setPlan(false); setWhen(''); toast.success('Saved. No pressure attached.')
   }}><CalendarClock data-icon="inline-start"/>Hold that time</Button>
  </DialogContent></Dialog>
 </div>
}
