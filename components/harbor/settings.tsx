'use client'
import { useState } from 'react'
import { Camera, ChevronRight, ImageUp, LockKeyhole, Play, ShieldCheck, Sprout, Trash2, UserRoundPlus, Waves } from 'lucide-react'
import { toast } from 'sonner'
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
 const savePace = (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault()
  const f = new FormData(event.currentTarget)
  const walkingMinutes = Number(f.get('walking')), sessionMinutes = Number(f.get('session')), dailyCap = Number(f.get('cap')), cooldownMinutes = Number(f.get('cooldown'))
  if (![walkingMinutes, sessionMinutes, dailyCap, cooldownMinutes].every(Number.isInteger) || walkingMinutes < 1 || walkingMinutes > 120 || sessionMinutes < 1 || sessionMinutes > 180 || dailyCap < 1 || dailyCap > 10 || cooldownMinutes < 1 || cooldownMinutes > 1440) {
   toast.error('Please use values within the shown limits.'); return
  }
  update(s => ({ ...s, settings: { ...s.settings, walkingMinutes, sessionMinutes, dailyCap, cooldownMinutes } }))
  toast.success('Your pace, saved.')
 }

 return <div className="entrance">
  <div className="page-intro">
   <p className="eyebrow">Always on your terms</p>
   <h1>Your account.</h1>
   <p>A little space that fits your life.</p>
  </div>

  <div className="section section-first flow">
   <section className="card card-pad flow">
    <h2 style={{ fontSize: 20, color: 'var(--ink)' }}>Make yourself at home</h2>
    <div>
     <label className="field-label" htmlFor="profile-name">What should we call you?</label>
     <input className="input" id="profile-name" maxLength={40} value={state.name}
      onChange={e => update(s => ({ ...s, name: e.target.value }))}
      onBlur={() => { if (!state.name.trim()) update(s => ({ ...s, name: 'Maya' })) }}/>
    </div>
    <p className="notice"><LockKeyhole/>No account, no tracking. This sample family lives only in your browser. Please don&apos;t add sensitive information to the demo.</p>
   </section>

   <section className="card card-pad flow">
    <div className="row-head" style={{ marginBottom: 0 }}><h2 style={{ fontSize: 20 }}>Your people</h2><span className="small-copy">one patch each</span></div>
    {state.people.map(person => <div key={person.id} className="line" style={{ boxShadow: 'none', background: 'transparent', padding: '6px 0' }}>
     <Avatar person={person.id}/>
     <span className="line-body"><b>{person.name}</b><span>{callsFor(state, person.id).length} flowers growing</span></span>
     <label className="icon-button" aria-label={`Add a photo for ${person.name}`}>
      <ImageUp/>
      <input type="file" accept="image/*" className="sr-only" onChange={e => { const file = e.target.files?.[0]; if (file) void setPhoto(person, file) }}/>
     </label>
     {state.people.length > 1 && <button className="icon-button" aria-label={`Remove ${person.name}`} onClick={() => setRemoving(person)}><Trash2/></button>}
    </div>)}
    <button type="button" className="btn btn-soft btn-block" onClick={() => setAdding(true)}><UserRoundPlus/>Add someone</button>
   </section>

   <section className="card card-pad flow">
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Camera className="size-5" style={{ color: 'var(--ink)' }}/><h2 style={{ fontSize: 20 }}>Snap windows</h2></div>
    <p className="small-copy">Once a day, at a moment nobody picks, you both get the same nudge to take one picture of whatever you&apos;re doing. It only exists between two people who each said yes, and either of you can end it.</p>
    {state.people.map(person => {
     const pact = pactOf(person.id)
     return <div key={person.id} className="line" style={{ boxShadow: 'none', background: 'transparent', padding: '6px 0' }}>
      <Avatar person={person.id} size="sm"/>
      <span className="line-body"><b>{person.name}</b><span>{pact?.status === 'active' ? 'On — you both agreed' : pact?.status === 'invited' ? 'Waiting on them' : 'Not set up'}</span></span>
      {pact?.status === 'active'
       ? <button type="button" className="btn btn-quiet" onClick={() => setPact(person.id, null)}>End</button>
       : pact?.status === 'invited'
        ? <button type="button" className="btn btn-soft" style={{ minHeight: 40 }} onClick={() => setPact(person.id, 'active')}>Simulate yes</button>
        : <button type="button" className="btn btn-soft" style={{ minHeight: 40 }} onClick={() => setPactFor(person)}>Invite</button>}
     </div>
    })}
    {!!activePacts(state).length && <>
     <p className="notice"><ShieldCheck/>{state.snapWindows[localDay()] ? `Today's moment is set for ${new Date(state.snapWindows[localDay()]).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}. You are not told in advance in the real thing.` : 'Rolling today’s moment…'}</p>
     <button type="button" className="btn btn-soft btn-block" onClick={() => { update(s => ({ ...s, snapWindows: { ...s.snapWindows, [localDay()]: new Date(Date.now() - 1000).toISOString() } })); toast.success('Today’s window is open now.') }}>Open today&apos;s window now (demo)</button>
     <button type="button" className="btn btn-quiet btn-block" onClick={() => update(s => ({ ...s, snapWindows: { ...s.snapWindows, [localDay()]: rollSnapWindow() } }))}>Roll a new moment</button>
    </>}
   </section>

   <section className="card card-pad flow">
    <div className="switch-row">
     <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Waves className="size-5" style={{ color: 'var(--ink)' }}/><h2 style={{ fontSize: 20 }}>Slack Tide</h2></div>
     <button type="button" className="toggle" aria-pressed={settings.cuesEnabled} aria-label="Enable cues"
      onClick={() => settings.cuesEnabled ? update(s => ({ ...s, settings: { ...s.settings, cuesEnabled: false } })) : setPrivacy(true)}/>
    </div>
    <p className="small-copy">A gentle cue at the end of a walk. In this web demo you stand in for the sensor; nothing runs in the background.</p>
    <form className="flow" key={`${settings.walkingMinutes}-${settings.dailyCap}-${settings.cooldownMinutes}`} onSubmit={savePace}>
     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div><label className="field-label" htmlFor="walking">Walking minutes</label><input className="input" id="walking" name="walking" type="number" min={1} max={120} required defaultValue={settings.walkingMinutes}/></div>
      <div><label className="field-label" htmlFor="session">Session minutes</label><input className="input" id="session" name="session" type="number" min={1} max={180} required defaultValue={settings.sessionMinutes}/></div>
      <div><label className="field-label" htmlFor="cap">Daily cue limit</label><input className="input" id="cap" name="cap" type="number" min={1} max={10} required defaultValue={settings.dailyCap}/></div>
      <div><label className="field-label" htmlFor="cooldown">Cooldown minutes</label><input className="input" id="cooldown" name="cooldown" type="number" min={1} max={1440} required defaultValue={settings.cooldownMinutes}/></div>
     </div>
     <p className="small-copy">Suggested values, always editable. Nothing here is a product default you are stuck with.</p>
     <button type="submit" className="btn btn-soft btn-block">Save my pace</button>
    </form>
    <div>
     <label className="field-label" htmlFor="sound">Your ringtone</label>
     <div style={{ display: 'flex', gap: 8 }}>
      <select id="sound" className="input" value={settings.sound} onChange={e => update(s => ({ ...s, settings: { ...s.settings, sound: e.target.value as typeof settings.sound } }))}>
       <option value="chime">Little chime</option><option value="soft">Soft note</option><option value="silent">Silence</option>
      </select>
      <button type="button" className="btn btn-soft" style={{ minWidth: 52, padding: 0 }} aria-label="Preview sound" disabled={settings.sound === 'silent'} onClick={() => chime(settings.sound)}><Play/></button>
     </div>
    </div>
    <p className="small-copy">The cue rings this two or three times, then stops on its own.</p>
    <button type="button" className="btn btn-soft btn-block" onClick={() => navigate('cue')}>Try a demo moment <ChevronRight/></button>
   </section>

   <section className="card card-pad">
    <div className="switch-row">
     <div><b>A little less movement</b><p className="small-copy">Reduce interface animations.</p></div>
     <button type="button" className="toggle" aria-pressed={settings.reducedMotion} aria-label="Reduce motion"
      onClick={() => update(s => ({ ...s, settings: { ...s.settings, reducedMotion: !s.settings.reducedMotion } }))}/>
    </div>
   </section>

   <button type="button" className="line" onClick={() => navigate('schedule')}>
    <span className="line-icon tint-green"><ShieldCheck/></span>
    <span className="line-body"><b>Mutual sharing &amp; privacy</b><span>Who sees your free and busy time</span></span>
    <ChevronRight/>
   </button>
   <button type="button" className="btn btn-soft btn-block" onClick={() => setResetOpen(true)}>Start the demo fresh</button>
   <p className="footnote"><Sprout style={{ color: 'var(--leaf)' }}/>Harbor · a little closer, every day.</p>
   <p className="demo-footnote">Local demo. No real calls, messages, or calendar access.</p>
  </div>

  <Dialog open={adding} onOpenChange={value => { setAdding(value); if (!value) setNewName('') }}><DialogContent>
   <DialogHeader><DialogTitle>Who else belongs here?</DialogTitle><DialogDescription>They get their own patch of ground. Every call you have with them grows a flower in it.</DialogDescription></DialogHeader>
   <div><label className="field-label" htmlFor="new-person">Their name</label>
    <input className="input" id="new-person" maxLength={40} value={newName} placeholder="Nani" onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPerson() } }}/></div>
   <button type="button" className="btn btn-block" disabled={!newName.trim()} onClick={addPerson}><UserRoundPlus/>Give them a patch</button>
  </DialogContent></Dialog>

  <Dialog open={!!pactFor} onOpenChange={value => !value && setPactFor(null)}><DialogContent>
   <DialogHeader><DialogTitle>A snap window with {pactFor?.name}?</DialogTitle><DialogDescription>Once a day, at a random moment, you both get the same nudge to take one picture of whatever you happen to be doing. Nothing is scheduled and nothing is scored.</DialogDescription></DialogHeader>
   <p className="notice"><ShieldCheck/>It takes both of you. {pactFor?.name} has to accept on their side, and either of you can end it at any time without explaining.</p>
   <button type="button" className="btn btn-block" onClick={() => { if (pactFor) { setPact(pactFor.id, 'invited'); toast.success(`Asked ${pactFor.name}.`) } setPactFor(null) }}>Ask {pactFor?.name}</button>
   <button type="button" className="btn btn-quiet btn-block" onClick={() => setPactFor(null)}>Not now</button>
  </DialogContent></Dialog>

  <Dialog open={!!removing} onOpenChange={value => !value && setRemoving(null)}><DialogContent>
   <DialogHeader><DialogTitle>Remove {removing?.name}?</DialogTitle><DialogDescription>Their patch and every flower in it goes too. This cannot be undone.</DialogDescription></DialogHeader>
   <button type="button" className="btn btn-block" onClick={() => removing && removePerson(removing)}>Remove them</button>
   <button type="button" className="btn btn-quiet btn-block" onClick={() => setRemoving(null)}>Keep their patch</button>
  </DialogContent></Dialog>

  <Dialog open={privacy} onOpenChange={setPrivacy}><DialogContent>
   <DialogHeader><DialogTitle>A cue, never a demand.</DialogTitle><DialogDescription>Slack Tide waits for a quiet moment. Your activity stays private, is never shared with your family, and every cue can be dismissed at no cost.</DialogDescription></DialogHeader>
   <p className="notice"><ShieldCheck/>This web version does not request motion permissions, monitor other apps, or reach you while the page is closed.</p>
   <button type="button" className="btn btn-block" onClick={() => { update(s => ({ ...s, settings: { ...s.settings, cuesEnabled: true } })); setPrivacy(false) }}>Turn cues on</button>
   <button type="button" className="btn btn-quiet btn-block" onClick={() => setPrivacy(false)}>Not now</button>
  </DialogContent></Dialog>

  <Dialog open={resetOpen} onOpenChange={setResetOpen}><DialogContent>
   <DialogHeader><DialogTitle>A fresh patch of ground?</DialogTitle><DialogDescription>This clears your local people, messages, media, schedules, preferences and every flower in your garden, then restores the sample family. It cannot be undone.</DialogDescription></DialogHeader>
   <button type="button" className="btn btn-block" onClick={async () => { try { await clearMedia(); reset(); setResetOpen(false); navigate('home'); toast.success('A fresh little Harbor.') } catch { toast.error('Could not clear local media. Please try again.') } }}>Reset all demo data</button>
   <button type="button" className="btn btn-quiet btn-block" onClick={() => setResetOpen(false)}>Keep my garden</button>
  </DialogContent></Dialog>
 </div>
}
