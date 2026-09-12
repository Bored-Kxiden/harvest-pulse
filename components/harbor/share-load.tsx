'use client'
import { useState } from 'react'
import { LockKeyhole, MessageCircle, Plus, Send, Users } from 'lucide-react'
import { toast } from 'sonner'
import { makeId, useHarbor } from '@/lib/harbor/store'
import { formatTime, localDay, minutes, sharedWindows } from '@/lib/harbor/model'
import { Avatar } from './avatar'
import { BackBar } from './back'
import { Sprig } from './sprigs'

/** Say the heavy thing once, pick who hears it, and let that be the end of the asking. */
export function ShareLoad({ navigate }: { navigate: (page: string) => void }) {
 const { state, update, log } = useHarbor()
 const [text, setText] = useState('')
 const [who, setWho] = useState<string[]>([])
 const [how, setHow] = useState<'message' | 'group'>('message')
 if (!state) return null
 const windows = sharedWindows(state, localDay())

 const toggle = (id: string) => setWho(list => list.includes(id) ? list.filter(x => x !== id) : [...list, id])
 const share = () => {
  const body = text.trim()
  if (!body || !who.length) return
  const at = new Date().toISOString()
  update(s => ({
   ...s,
   messages: Object.fromEntries(Object.entries(s.messages).map(([id, ms]) =>
    who.includes(id) ? [id, [...ms, { id: makeId(), at, text: body, mine: true }]] : [id, ms])),
  }))
  log({ id: makeId(), at, person: who[0], kind: 'message', text: body, source: 'manual' })
  const names = state.people.filter(p => who.includes(p.id)).map(p => p.name)
  setText(''); setWho([])
  toast.success(`Carried by ${names.join(' and ')}. Nothing owed back.`)
 }

 return <div className="entrance">
  <BackBar onBack={() => navigate('home')}/>
  <div className="page-head">
   <span className="eyebrow">Share my load</span>
   <h1>Let&rsquo;s lighten it.</h1>
   <p>Say the heavy thing once, pick who hears it, and let that be the end of the asking.</p>
  </div>

  <div className="wrap flow stagger">
   <section className="card card-pad flow" style={{ ['--i' as string]: 0 }}>
    <Sprig kind="cosmos" className="person-sprig" style={{ width: 60, bottom: 4 }}/>
    <label className="label" htmlFor="load-text" style={{ fontSize: 16, color: 'var(--ink-deep)', fontWeight: 700 }}>What&rsquo;s on your mind?</label>
    <textarea id="load-text" className="input" maxLength={400} value={text} onChange={e => setText(e.target.value)}
     placeholder="e.g. work, family, studies, just life…"/>
    <p className="note-strip"><LockKeyhole aria-hidden="true"/>This goes to the people you pick, privately. Nothing is posted anywhere.</p>
   </section>

   <section className="card card-pad flow" style={{ ['--i' as string]: 1 }} aria-labelledby="who-heading">
    <div>
     <h2 id="who-heading" style={{ fontSize: 17 }}>Choose who to share with</h2>
     <p className="small">Pick a person, or a few of them.</p>
    </div>
    <div className="who-row">
     <button type="button" className="who" onClick={() => navigate('account')}>
      <span className="who-add"><Plus aria-hidden="true"/></span><b>Add</b>
     </button>
     {state.people.map(person => <button key={person.id} type="button" className="who"
      aria-pressed={who.includes(person.id)} onClick={() => toggle(person.id)}>
      <span className="who-face"><Avatar person={person.id}/></span>
      <b>{person.name}</b>
     </button>)}
    </div>
   </section>

   <section className="flow" style={{ gap: 9, ['--i' as string]: 2 }} aria-labelledby="how-heading">
    <h2 id="how-heading" style={{ fontSize: 17, paddingLeft: 2 }}>Share as</h2>
    <div role="radiogroup" aria-labelledby="how-heading" className="flow" style={{ gap: 9 }}>
     <button type="button" role="radio" aria-checked={how === 'message'} className="pick" onClick={() => setHow('message')}>
      <span className="row-icon" style={{ background: 'var(--tint-mint)' }}><MessageCircle aria-hidden="true"/></span>
      <span className="row-body"><b>Message</b><span>Send it as a private note.</span></span>
      <span className="pick-mark" aria-hidden="true"/>
     </button>
     <button type="button" role="radio" aria-checked={how === 'group'} className="pick" onClick={() => setHow('group')}>
      <span className="row-icon" style={{ background: 'var(--tint-blue)' }}><Users aria-hidden="true"/></span>
      <span className="row-body"><b>Group load</b><span>Share it with everyone you picked at once.</span></span>
      <span className="pick-mark" aria-hidden="true"/>
     </button>
    </div>
   </section>

   <section className="card card-pad flow" style={{ ['--i' as string]: 3 }} aria-labelledby="rhythm-heading">
    <div className="switch-row">
     <div><b id="rhythm-heading">Share my rhythm too</b><p className="small">Free and busy times only, never what a block is called.</p></div>
     <button type="button" className="toggle" aria-pressed={state.sharing} aria-labelledby="rhythm-heading"
      onClick={() => update(s => ({ ...s, sharing: !s.sharing, sharingSetupDone: true }))}/>
    </div>
    {state.sharing && <div className="switch-row">
     <div><b>Mutual sharing</b><p className="small">{state.people[0]?.name ?? 'They'} shares back.</p></div>
     <button type="button" className="toggle" aria-pressed={state.momConsent} aria-label={`Mutual sharing with ${state.people[0]?.name ?? 'them'}`}
      onClick={() => update(s => ({ ...s, momConsent: !s.momConsent }))}/>
    </div>}
    {state.sharing && state.momConsent && <p className="note-strip">
     <Users aria-hidden="true"/>
     {windows.length
      ? `You are both free ${formatTime(windows[0].start)} – ${formatTime(windows[0].end)} today, ${minutes(windows[0].end) - minutes(windows[0].start)} unhurried minutes.`
      : 'No overlap today. Try another day, or just leave a note.'}
    </p>}
   </section>

   <button type="button" className="btn btn-block" style={{ ['--i' as string]: 4 }} disabled={!text.trim() || !who.length} onClick={share}>
    <Send aria-hidden="true"/>Share
   </button>
   <p className="fineprint" style={{ ['--i' as string]: 5 }}>
    {!text.trim() ? 'Write a line first.' : !who.length ? 'Pick at least one person.' : 'Saved here, not delivered to a real person.'}
   </p>
  </div>
 </div>
}
