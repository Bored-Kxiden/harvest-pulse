'use client'
import { useState } from 'react'
import { Camera, ChevronRight, ImageUp, LockKeyhole, Play, ShieldCheck, Sprout, Trash2, UserRoundPlus, Waves } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { chime, makeId, useHarbor } from '@/lib/harbor/store'
import { clearMedia, saveMedia } from '@/lib/harbor/media'
import { activePacts, callsFor, initialsOf, localDay, rollSnapWindow, type Person, type Tone } from '@/lib/harbor/model'
import { Avatar } from './avatar'
import { Sprig } from './sprigs'

const tones: Tone[] = ['green', 'gold', 'orange', 'sky']

export function AccountScreen({ navigate }: { navigate: (page: string) => void }) {
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
  const name = newName.trim()
  if (!name) return
  const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'friend'}-${makeId().slice(0, 4)}`
  update(s => ({ ...s, people: [...s.people, { id, name, initials: initialsOf(name), tone: tones[s.people.length % tones.length] }], messages: { ...s.messages, [id]: [] } }))
  setNewName(''); setAdding(false)
  toast.success(`${name} has a patch of the meadow now.`)
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
  if (!file.type.startsWith('image/')) { toast.error('That is not an image. Choose a picture instead.'); return }
  if (file.size > 10 * 1024 * 1024) { toast.error('That picture is over 10 MB. Choose a smaller one.'); return }
  try {
   const id = makeId(); await saveMedia(id, file)
   update(s => ({ ...s, people: s.people.map(p => p.id === person.id ? { ...p, photoId: id } : p) }))
   toast.success('Saved on this device only.')
  } catch { toast.error('Your browser would not save that picture. Try a smaller one.') }
 }
 const savePace = (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault()
  const f = new FormData(event.currentTarget)
  const walkingMinutes = Number(f.get('walking')), sessionMinutes = Number(f.get('session'))
  const dailyCap = Number(f.get('cap')), cooldownMinutes = Number(f.get('cooldown'))
  if (![walkingMinutes, sessionMinutes, dailyCap, cooldownMinutes].every(Number.isInteger)
   || walkingMinutes < 1 || walkingMinutes > 120 || sessionMinutes < 1 || sessionMinutes > 180
   || dailyCap < 1 || dailyCap > 10 || cooldownMinutes < 1 || cooldownMinutes > 1440) {
   toast.error('Those values are outside the limits shown. Try numbers inside them.')
   return
  }
  update(s => ({ ...s, settings: { ...s.settings, walkingMinutes, sessionMinutes, dailyCap, cooldownMinutes } }))
  toast.success('Your pace, saved.')
 }

 return <div className="entrance">
  <div className="page-head">
   <span className="eyebrow">Your account.</span>
   <h1>Your account.</h1>
   <p>A little space that fits your life.</p>
  </div>

  <div className="wrap flow stagger">
   <section className="card card-pad flow" style={{ ['--i' as string]: 0 }}>
    <Sprig kind="leaf" className="person-sprig" style={{ width: 62, top: 6, bottom: 'auto' }}/>
    <div>
     <label className="label" htmlFor="profile-name">What should we call you?</label>
     <input className="input" id="profile-name" maxLength={40} value={state.name} name="nickname" autoComplete="nickname"
      onChange={e => update(s => ({ ...s, name: e.target.value }))}
      onBlur={() => { if (!state.name.trim()) update(s => ({ ...s, name: 'Maya' })) }}/>
    </div>
    <p className="note-strip"><LockKeyhole aria-hidden="true"/>No account, no tracking. This sample family lives only in your browser.</p>
   </section>

   <section className="card card-pad flow" style={{ ['--i' as string]: 1 }}>
    <div className="row-head" style={{ marginBottom: 0 }}>
     <h2 style={{ fontSize: 19 }}><Sprout style={{ width: 18, height: 18, color: 'var(--leaf)' }} aria-hidden="true"/>Your people</h2>
     <span className="small">one patch each</span>
    </div>
    {state.people.map(person => <div key={person.id} className="row" style={{ boxShadow: 'none', background: 'transparent', padding: '5px 0' }}>
     <Avatar person={person.id}/>
     <span className="row-body"><b>{person.name}</b><span>{callsFor(state, person.id).length} flowers growing</span></span>
     <label className="disc tap" style={{ width: 38, height: 38, boxShadow: 'none', background: 'var(--secondary)' }}>
      <ImageUp aria-hidden="true"/>
      <span className="sr-only">Add a photo for {person.name}</span>
      <input type="file" accept="image/*" className="sr-only" onChange={e => { const file = e.target.files?.[0]; if (file) void setPhoto(person, file) }}/>
     </label>
     {state.people.length > 1 && <button type="button" className="disc" style={{ width: 38, height: 38, boxShadow: 'none', background: 'var(--secondary)' }}
      aria-label={`Remove ${person.name}`} onClick={() => setRemoving(person)}><Trash2 aria-hidden="true"/></button>}
    </div>)}
    <button type="button" className="btn btn-soft btn-block" onClick={() => setAdding(true)}><UserRoundPlus aria-hidden="true"/>Add Someone</button>
   </section>

   <section className="card card-pad flow" style={{ ['--i' as string]: 2 }}>
    <div className="switch-row">
     <h2 style={{ fontSize: 19 }}><Camera style={{ width: 18, height: 18, color: 'var(--gold)' }} aria-hidden="true"/>Snap windows</h2>
    </div>
    <p className="small">Once a day, at a moment nobody picks, you both get the same nudge to take one picture of whatever you&rsquo;re doing. It only exists between two people who each said yes, and either of you can end it.</p>
    {state.people.map(person => {
     const pact = pactOf(person.id)
     return <div key={person.id} className="row" style={{ boxShadow: 'none', background: 'transparent', padding: '5px 0' }}>
      <Avatar person={person.id} size="sm"/>
      <span className="row-body"><b>{person.name}</b><span>{pact?.status === 'active' ? 'On, you both agreed' : pact?.status === 'invited' ? 'Waiting on them' : 'Not set up'}</span></span>
      {pact?.status === 'active'
       ? <button type="button" className="btn btn-quiet" style={{ minHeight: 38, padding: '0 12px' }} onClick={() => setPact(person.id, null)}>End</button>
       : pact?.status === 'invited'
        ? <button type="button" className="btn btn-soft" style={{ minHeight: 38, padding: '0 12px', fontSize: 13 }} onClick={() => setPact(person.id, 'active')}>Simulate Yes</button>
        : <button type="button" className="btn btn-soft" style={{ minHeight: 38, padding: '0 14px', fontSize: 13 }} onClick={() => setPactFor(person)}>Invite</button>}
     </div>
    })}
    {!!activePacts(state).length && <>
     <p className="note-strip"><ShieldCheck aria-hidden="true"/>{state.snapWindows[localDay()]
      ? `Today's moment is set for ${new Date(state.snapWindows[localDay()]).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}. You are not told in advance in the real thing.`
      : 'Rolling today’s moment…'}</p>
     <button type="button" className="btn btn-soft btn-block" onClick={() => { update(s => ({ ...s, snapWindows: { ...s.snapWindows, [localDay()]: new Date(Date.now() - 1000).toISOString() } })); toast.success('Today’s window is open now.') }}>Open Today&rsquo;s Window (Demo)</button>
     <button type="button" className="btn btn-quiet btn-block" onClick={() => update(s => ({ ...s, snapWindows: { ...s.snapWindows, [localDay()]: rollSnapWindow() } }))}>Roll a new moment</button>
    </>}
   </section>

   <section className="card card-pad flow" style={{ ['--i' as string]: 3 }}>
    <div className="switch-row">
     <h2 style={{ fontSize: 19 }}><Waves style={{ width: 18, height: 18, color: '#6C9FD6' }} aria-hidden="true"/>Slack Tide</h2>
     <button type="button" className="toggle" aria-pressed={settings.cuesEnabled} aria-label="Slack Tide cues"
      onClick={() => settings.cuesEnabled ? update(s => ({ ...s, settings: { ...s.settings, cuesEnabled: false } })) : setPrivacy(true)}/>
    </div>
    <p className="small">A gentle cue at the end of a walk. In this demo you stand in for the sensor; nothing runs in the background.</p>
    <form className="flow" key={`${settings.walkingMinutes}-${settings.dailyCap}-${settings.cooldownMinutes}`} onSubmit={savePace}>
     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
      <div><label className="label" htmlFor="walking">Walking minutes</label><input className="input" id="walking" name="walking" type="number" inputMode="numeric" min={1} max={120} required defaultValue={settings.walkingMinutes} autoComplete="off"/></div>
      <div><label className="label" htmlFor="session">Session minutes</label><input className="input" id="session" name="session" type="number" inputMode="numeric" min={1} max={180} required defaultValue={settings.sessionMinutes} autoComplete="off"/></div>
      <div><label className="label" htmlFor="cap">Daily cue limit</label><input className="input" id="cap" name="cap" type="number" inputMode="numeric" min={1} max={10} required defaultValue={settings.dailyCap} autoComplete="off"/></div>
      <div><label className="label" htmlFor="cooldown">Cooldown minutes</label><input className="input" id="cooldown" name="cooldown" type="number" inputMode="numeric" min={1} max={1440} required defaultValue={settings.cooldownMinutes} autoComplete="off"/></div>
     </div>
     <button type="submit" className="btn btn-soft btn-block">Save My Pace</button>
    </form>
    <div>
     <label className="label" htmlFor="sound">Your ringtone</label>
     <div style={{ display: 'flex', gap: 8 }}>
      <select id="sound" className="input" value={settings.sound} onChange={e => update(s => ({ ...s, settings: { ...s.settings, sound: e.target.value as typeof settings.sound } }))}>
       <option value="chime">Little chime</option><option value="soft">Soft note</option><option value="silent">Silence</option>
      </select>
      <button type="button" className="btn btn-soft" style={{ minWidth: 52, padding: 0 }} aria-label="Preview the ringtone"
       disabled={settings.sound === 'silent'} onClick={() => chime(settings.sound)}><Play aria-hidden="true"/></button>
     </div>
    </div>
    <p className="small">The cue rings this two or three times, then stops on its own.</p>
    <button type="button" className="btn btn-soft btn-block" onClick={() => navigate('cue')}>Try a Demo Moment <ChevronRight aria-hidden="true"/></button>
   </section>

   <section className="card card-pad" style={{ ['--i' as string]: 4 }}>
    <div className="switch-row">
     <div><b>A little less movement</b><p className="small">Reduce interface animations.</p></div>
     <button type="button" className="toggle" aria-pressed={settings.reducedMotion} aria-label="Reduce motion"
      onClick={() => update(s => ({ ...s, settings: { ...s.settings, reducedMotion: !s.settings.reducedMotion } }))}/>
    </div>
   </section>

   <button type="button" className="row" style={{ ['--i' as string]: 5 }} onClick={() => navigate('share')}>
    <span className="row-icon"><ShieldCheck aria-hidden="true"/></span>
    <span className="row-body"><b>Share my load &amp; privacy</b><span>Who sees your free and busy time</span></span>
    <ChevronRight className="caret" aria-hidden="true"/>
   </button>
   <button type="button" className="btn btn-soft btn-block" style={{ ['--i' as string]: 6 }} onClick={() => setResetOpen(true)}>Start the Demo Fresh</button>
   <p className="fineprint" style={{ ['--i' as string]: 7 }}>Harbor · a little closer, every day.<br/>Local demo. No real calls, messages, or calendar access.</p>
  </div>

  <Dialog open={adding} onOpenChange={value => { setAdding(value); if (!value) setNewName('') }}><DialogContent>
   <DialogHeader><DialogTitle>Who else belongs here?</DialogTitle><DialogDescription>They get their own patch of the meadow. Every call you have with them grows a flower in it.</DialogDescription></DialogHeader>
   <div><label className="label" htmlFor="new-person">Their name</label>
    <input className="input" id="new-person" maxLength={40} value={newName} placeholder="Nani…" autoComplete="off" spellCheck={false}
     onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPerson() } }}/></div>
   <button type="button" className="btn btn-block" disabled={!newName.trim()} onClick={addPerson}><UserRoundPlus aria-hidden="true"/>Give Them a Patch</button>
  </DialogContent></Dialog>

  <Dialog open={!!pactFor} onOpenChange={value => !value && setPactFor(null)}><DialogContent>
   <DialogHeader><DialogTitle>A snap window with {pactFor?.name}?</DialogTitle><DialogDescription>Once a day, at a random moment, you both get the same nudge to take one picture of whatever you happen to be doing. Nothing is scheduled and nothing is scored.</DialogDescription></DialogHeader>
   <p className="note-strip"><ShieldCheck aria-hidden="true"/>It takes both of you. {pactFor?.name} has to accept on their side, and either of you can end it at any time without explaining.</p>
   <button type="button" className="btn btn-block" onClick={() => { if (pactFor) { setPact(pactFor.id, 'invited'); toast.success(`Asked ${pactFor.name}.`) } setPactFor(null) }}>Ask {pactFor?.name}</button>
   <button type="button" className="btn btn-quiet btn-block" onClick={() => setPactFor(null)}>Not now</button>
  </DialogContent></Dialog>

  <Dialog open={!!removing} onOpenChange={value => !value && setRemoving(null)}><DialogContent>
   <DialogHeader><DialogTitle>Remove {removing?.name}?</DialogTitle><DialogDescription>Their patch and every flower in it goes too. This cannot be undone.</DialogDescription></DialogHeader>
   <button type="button" className="btn btn-block" onClick={() => removing && removePerson(removing)}>Remove Them</button>
   <button type="button" className="btn btn-quiet btn-block" onClick={() => setRemoving(null)}>Keep their patch</button>
  </DialogContent></Dialog>

  <Dialog open={privacy} onOpenChange={setPrivacy}><DialogContent>
   <DialogHeader><DialogTitle>A cue, never a demand.</DialogTitle><DialogDescription>Slack Tide waits for a quiet moment. Your activity stays private, is never shared with your family, and every cue can be dismissed at no cost.</DialogDescription></DialogHeader>
   <p className="note-strip"><ShieldCheck aria-hidden="true"/>This web version does not request motion permissions, monitor other apps, or reach you while the page is closed.</p>
   <button type="button" className="btn btn-block" onClick={() => { update(s => ({ ...s, settings: { ...s.settings, cuesEnabled: true } })); setPrivacy(false) }}>Turn Cues On</button>
   <button type="button" className="btn btn-quiet btn-block" onClick={() => setPrivacy(false)}>Not now</button>
  </DialogContent></Dialog>

  <Dialog open={resetOpen} onOpenChange={setResetOpen}><DialogContent>
   <DialogHeader><DialogTitle>A fresh patch of ground?</DialogTitle><DialogDescription>This clears your local people, messages, media, schedules, preferences and every flower in your meadow, then restores the sample family. It cannot be undone.</DialogDescription></DialogHeader>
   <button type="button" className="btn btn-block" onClick={async () => { try { await clearMedia(); reset(); setResetOpen(false); navigate('home'); toast.success('A fresh little Harbor.') } catch { toast.error('Local media would not clear. Close other tabs of this demo and try again.') } }}>Reset All Demo Data</button>
   <button type="button" className="btn btn-quiet btn-block" onClick={() => setResetOpen(false)}>Keep my meadow</button>
  </DialogContent></Dialog>
 </div>
}
