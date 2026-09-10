'use client'
import { useState } from 'react'
import { Camera, ChevronRight, ImageUp, LockKeyhole, Play, ShieldCheck, Trash2, UserRoundPlus, Waves } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { chime, makeId, useHarbor } from '@/lib/harbor/store'
import { clearMedia, saveMedia } from '@/lib/harbor/media'
import { activePacts, callsFor, initialsOf, localDay, rollSnapWindow, type Person, type Tone } from '@/lib/harbor/model'
import { Avatar } from './avatar'

const tones: Tone[] = ['green', 'gold', 'orange', 'sky']

export function SettingsScreen({ navigate }: { navigate: (page: string) => void }) {
 const { state, update, reset } = useHarbor()
 const [privacy, setPrivacy] = useState(false)
 const [resetOpen, setResetOpen] = useState(false)
 const [adding, setAdding] = useState(false)
 const [newName, setNewName] = useState('')
 const [removing, setRemoving] = useState<Person | null>(null)
 const [pactFor, setPactFor] = useState<Person | null>(null)
 if (!state) return null
 const settings = state.settings
 const pactOf = (id: string) => state.pacts.find(p => p.personId === id)
 const setPact = (id: string, status: 'invited' | 'active' | null) => update(s => ({
  ...s,
  pacts: status ? [...s.pacts.filter(p => p.personId !== id), { personId: id, status, since: new Date().toISOString() }] : s.pacts.filter(p => p.personId !== id),
 }))

 const addPerson = () => {
  const name = newName.trim(); if (!name) return
  const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'friend'}-${makeId().slice(0, 4)}`
  const person: Person = { id, name, initials: initialsOf(name), tone: tones[state.people.length % tones.length] }
  update(s => ({ ...s, people: [...s.people, person], messages: { ...s.messages, [id]: [] } }))
  setNewName(''); setAdding(false)
  toast.success(`${name} has a patch in your garden now.`)
 }
 const removePerson = (person: Person) => {
  update(s => ({
   ...s,
   people: s.people.filter(p => p.id !== person.id),
   moments: s.moments.filter(m => m.person !== person.id),
   notes: s.notes.filter(n => n.person !== person.id),
   messages: Object.fromEntries(Object.entries(s.messages).filter(([id]) => id !== person.id)),
  }))
  setRemoving(null)
  toast.success(`${person.name}'s patch has been cleared.`)
 }
 const setPhoto = async (person: Person, file: File) => {
  if (!file.type.startsWith('image/')) { toast.error('Choose an image file.'); return }
  if (file.size > 10 * 1024 * 1024) { toast.error('Please choose a picture under 10 MB.'); return }
  try {
   const id = makeId(); await saveMedia(id, file)
   update(s => ({ ...s, people: s.people.map(p => p.id === person.id ? { ...p, photoId: id } : p) }))
   toast.success('Saved on this device only.')
  } catch { toast.error('Your browser could not save this picture.') }
 }

 return <div className="entrance">
  <div className="page-intro"><div className="eyebrow mb-2">Always on your terms</div><h1>Your account.</h1><p>A little space that fits your life.</p></div>
  <div className="page-content !pt-0 flow">

   <section className="surface flow">
    <h2 className="font-serif text-xl">Make yourself at home</h2>
    <Field><FieldLabel htmlFor="profile-name">What should we call you?</FieldLabel><Input id="profile-name" maxLength={40} value={state.name} onChange={e => update(s => ({ ...s, name: e.target.value }))} onBlur={() => { if (!state.name.trim()) update(s => ({ ...s, name: 'Maya' })) }}/></Field>
    <p className="notice"><LockKeyhole/>No account, no tracking. This sample family lives only in your browser. Please don&apos;t add sensitive information to the demo.</p>
   </section>

   <section className="surface flow">
    <div className="section-heading"><h2 className="font-serif text-xl">Your people</h2><span className="small-copy">one patch each</span></div>
    {state.people.map(person => <div key={person.id} className="person-row">
     <Avatar person={person.id}/>
     <span className="flex-1 min-w-0"><span className="text-sm font-medium block truncate">{person.name}</span><span className="small-copy">{callsFor(state, person.id).length} flowers growing</span></span>
     <label className="icon-button" aria-label={`Add a photo for ${person.name}`}>
      <ImageUp/>
      <input type="file" accept="image/*" className="sr-only" onChange={e => { const file = e.target.files?.[0]; if (file) void setPhoto(person, file) }}/>
     </label>
     {state.people.length > 1 && <button className="icon-button" aria-label={`Remove ${person.name}`} onClick={() => setRemoving(person)}><Trash2/></button>}
    </div>)}
    <Button variant="outline" onClick={() => setAdding(true)}><UserRoundPlus data-icon="inline-start"/>Add someone</Button>
   </section>

   <section className="surface flow">
    <div className="section-heading"><div className="flex items-center gap-2"><Camera className="size-5"/><h2 className="font-serif text-xl">Snap windows</h2></div></div>
    <p className="small-copy">Once a day, at a moment nobody picks, you both get the same nudge to take one picture of whatever you&apos;re doing. It only exists between two people who each said yes, and either of you can end it.</p>
    {state.people.map(person => {
     const pact = pactOf(person.id)
     return <div key={person.id} className="person-row">
      <Avatar person={person.id} size="sm"/>
      <span className="flex-1 min-w-0"><span className="text-sm font-medium block truncate">{person.name}</span><span className="small-copy">{pact?.status === 'active' ? 'On — you both agreed' : pact?.status === 'invited' ? 'Waiting on them' : 'Not set up'}</span></span>
      {pact?.status === 'active'
       ? <Button variant="ghost" onClick={() => setPact(person.id, null)}>End</Button>
       : pact?.status === 'invited'
        ? <Button variant="outline" onClick={() => setPact(person.id, 'active')}>Simulate yes</Button>
        : <Button variant="outline" onClick={() => setPactFor(person)}>Invite</Button>}
     </div>
    })}
    {!!activePacts(state).length && <>
     <p className="notice"><ShieldCheck/>{state.snapWindows[localDay()] ? `Today's moment is set for ${new Date(state.snapWindows[localDay()]).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}. You are not told in advance in the real thing.` : 'Rolling today’s moment…'}</p>
     <Button variant="outline" onClick={() => { update(s => ({ ...s, snapWindows: { ...s.snapWindows, [localDay()]: new Date(Date.now() - 1000).toISOString() } })); toast.success('Today’s window is open now.') }}>Open today&apos;s window now (demo)</Button>
     <Button variant="ghost" onClick={() => update(s => ({ ...s, snapWindows: { ...s.snapWindows, [localDay()]: rollSnapWindow() } }))}>Roll a new moment</Button>
    </>}
   </section>

   <section className="surface flow">
    <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Waves className="size-5"/><h2 className="font-serif text-xl">Slack Tide</h2></div><Switch aria-label="Enable cues" checked={settings.cuesEnabled} onCheckedChange={enabled => enabled ? setPrivacy(true) : update(s => ({ ...s, settings: { ...s.settings, cuesEnabled: false } }))}/></div>
    <p className="small-copy">A gentle cue at the end of a walk. In this web demo you stand in for the sensor; nothing runs in the background.</p>
    <form className="flow" key={`${settings.walkingMinutes}-${settings.dailyCap}-${settings.cooldownMinutes}`} onSubmit={e => {
     e.preventDefault(); const f = new FormData(e.currentTarget)
     const walkingMinutes = Number(f.get('walking')), sessionMinutes = Number(f.get('session')), dailyCap = Number(f.get('cap')), cooldownMinutes = Number(f.get('cooldown'))
     if (![walkingMinutes, sessionMinutes, dailyCap, cooldownMinutes].every(Number.isInteger) || walkingMinutes < 1 || walkingMinutes > 120 || sessionMinutes < 1 || sessionMinutes > 180 || dailyCap < 1 || dailyCap > 10 || cooldownMinutes < 1 || cooldownMinutes > 1440) { toast.error('Please use values within the shown limits.'); return }
     update(s => ({ ...s, settings: { ...s.settings, walkingMinutes, sessionMinutes, dailyCap, cooldownMinutes } })); toast.success('Your pace, saved.')
    }}>
     <FieldGroup><div className="grid grid-cols-2 gap-3">
      <Field><FieldLabel htmlFor="walking">Walking minutes</FieldLabel><Input id="walking" name="walking" type="number" min={1} max={120} required defaultValue={settings.walkingMinutes}/></Field>
      <Field><FieldLabel htmlFor="session">Session minutes</FieldLabel><Input id="session" name="session" type="number" min={1} max={180} required defaultValue={settings.sessionMinutes}/></Field>
      <Field><FieldLabel htmlFor="cap">Daily cue limit</FieldLabel><Input id="cap" name="cap" type="number" min={1} max={10} required defaultValue={settings.dailyCap}/></Field>
      <Field><FieldLabel htmlFor="cooldown">Cooldown minutes</FieldLabel><Input id="cooldown" name="cooldown" type="number" min={1} max={1440} required defaultValue={settings.cooldownMinutes}/></Field>
     </div></FieldGroup>
     <p className="small-copy">Suggested values, always editable. Nothing here is a product default you are stuck with.</p>
     <Button type="submit" variant="outline">Save my pace</Button>
    </form>
    <Field><FieldLabel htmlFor="sound">Your ringtone</FieldLabel><div className="flex gap-2">
     <select id="sound" className="select" value={settings.sound} onChange={e => update(s => ({ ...s, settings: { ...s.settings, sound: e.target.value as typeof settings.sound } }))}>
      <option value="chime">Little chime</option><option value="soft">Soft note</option><option value="silent">Silence</option>
     </select>
     <Button variant="outline" size="icon" aria-label="Preview sound" disabled={settings.sound === 'silent'} onClick={() => chime(settings.sound)}><Play/></Button>
    </div></Field>
    <p className="small-copy">The cue rings this two or three times, then stops on its own.</p>
    <Button variant="outline" onClick={() => navigate('cue')}>Try a demo moment <ChevronRight data-icon="inline-end"/></Button>
   </section>

   <section className="surface flow"><div className="flex items-center justify-between"><div><h2 className="font-serif text-xl">A little less movement</h2><p className="small-copy">Reduce interface animations.</p></div><Switch aria-label="Reduce motion" checked={settings.reducedMotion} onCheckedChange={reducedMotion => update(s => ({ ...s, settings: { ...s.settings, reducedMotion } }))}/></div></section>

   <button className="surface flex items-center justify-between text-left" onClick={() => navigate('schedule')}><span className="flex items-center gap-3"><ShieldCheck className="size-5"/>Mutual sharing &amp; privacy</span><ChevronRight className="size-4"/></button>
   <Button variant="outline" onClick={() => setResetOpen(true)}>Start the demo fresh</Button>
   <p className="demo-footnote">Harbor · a little closer, every day.<br/>Local demo. No real calls, messages, or calendar access.</p>
  </div>

  <Dialog open={adding} onOpenChange={value => { setAdding(value); if (!value) setNewName('') }}><DialogContent>
   <DialogHeader><DialogTitle>Who else belongs here?</DialogTitle><DialogDescription>They get their own patch of ground. Every call you have with them grows a flower in it.</DialogDescription></DialogHeader>
   <Field><FieldLabel htmlFor="new-person">Their name</FieldLabel><Input id="new-person" maxLength={40} value={newName} placeholder="Nani" onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPerson() } }}/></Field>
   <Button disabled={!newName.trim()} onClick={addPerson}><UserRoundPlus data-icon="inline-start"/>Give them a patch</Button>
  </DialogContent></Dialog>

  <Dialog open={!!pactFor} onOpenChange={value => !value && setPactFor(null)}><DialogContent>
   <DialogHeader><DialogTitle>A snap window with {pactFor?.name}?</DialogTitle><DialogDescription>Once a day, at a random moment, you both get the same nudge to take one picture of whatever you happen to be doing. Nothing is scheduled and nothing is scored.</DialogDescription></DialogHeader>
   <p className="notice"><ShieldCheck/>It takes both of you. {pactFor?.name} has to accept on their side, and either of you can end it at any time without explaining.</p>
   <Button onClick={() => { if (pactFor) { setPact(pactFor.id, 'invited'); toast.success(`Asked ${pactFor.name}.`) } setPactFor(null) }}>Ask {pactFor?.name}</Button>
   <Button variant="ghost" onClick={() => setPactFor(null)}>Not now</Button>
  </DialogContent></Dialog>

  <Dialog open={!!removing} onOpenChange={value => !value && setRemoving(null)}><DialogContent>
   <DialogHeader><DialogTitle>Remove {removing?.name}?</DialogTitle><DialogDescription>Their patch and every flower in it goes too. This cannot be undone.</DialogDescription></DialogHeader>
   <Button onClick={() => removing && removePerson(removing)}>Remove them</Button>
   <Button variant="ghost" onClick={() => setRemoving(null)}>Keep their patch</Button>
  </DialogContent></Dialog>

  <Dialog open={privacy} onOpenChange={setPrivacy}><DialogContent>
   <DialogHeader><DialogTitle>A cue, never a demand.</DialogTitle><DialogDescription>Slack Tide waits for a quiet moment. Your activity stays private, is never shared with your family, and every cue can be dismissed at no cost.</DialogDescription></DialogHeader>
   <p className="notice"><ShieldCheck/>This web version does not request motion permissions, monitor other apps, or reach you while the page is closed.</p>
   <Button onClick={() => { update(s => ({ ...s, settings: { ...s.settings, cuesEnabled: true } })); setPrivacy(false) }}>Turn cues on</Button>
   <Button variant="ghost" onClick={() => setPrivacy(false)}>Not now</Button>
  </DialogContent></Dialog>

  <Dialog open={resetOpen} onOpenChange={setResetOpen}><DialogContent>
   <DialogHeader><DialogTitle>A fresh patch of ground?</DialogTitle><DialogDescription>This clears your local people, messages, media, schedules, preferences and every flower in your garden, then restores the sample family. It cannot be undone.</DialogDescription></DialogHeader>
   <Button onClick={async () => { try { await clearMedia(); reset(); setResetOpen(false); navigate('home'); toast.success('A fresh little Harbor.') } catch { toast.error('Could not clear local media. Please try again.') } }}>Reset all demo data</Button>
   <Button variant="ghost" onClick={() => setResetOpen(false)}>Keep my garden</Button>
  </DialogContent></Dialog>
 </div>
}
