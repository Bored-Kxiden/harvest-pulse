'use client'
import { useState } from 'react'
import { ArrowRight, GraduationCap, House, UserRoundPlus } from 'lucide-react'
import { useHarbor } from '@/lib/harbor/store'
import type { Mode } from '@/lib/harbor/model'

/** The first two questions, now that a third one -- your own name -- moved to
 *  AuthGate, where the account is made.
 *
 *  Step one decides which side of the phone this is. Step two offers to add
 *  a real person before the sample family does the introducing -- optional,
 *  because the whole reason the sample family exists is so the app already
 *  makes sense with nobody added yet, and a required field here would be
 *  asking for a name Harbor does not need in order to work.
 */
export function Setup() {
 const { start } = useHarbor()
 const [step, setStep] = useState<0 | 1>(0)
 const [mode, setMode] = useState<Mode>('parent')
 const [name, setName] = useState('')

 const choose = (next: Mode) => { setMode(next); setStep(1) }

 return <div className="setup">
  <div className="setup-inner">
   <div className="setup-brand">
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" width="26" height="26">
     <path d="M16 29V14" stroke="#1F6B43" strokeWidth="3" strokeLinecap="round"/>
     <path d="M15 15.5c-1.2-5-5-7.6-11-8 .4 6.6 3.8 10 11 8z" fill="#59A468"/>
     <path d="M17 13c1-5.6 4.8-8.8 11.6-9.4C28.2 11 24.4 15 17 13z" fill="#79BC7F"/>
    </svg>
    <span>harbor</span>
   </div>

   {step === 0 ? <div className="setup-step" key="who">
    <h1>Who is using this phone?</h1>
    <p className="setup-sub">It changes what you see. You can switch later.</p>
    <div className="setup-picks">
     <button type="button" className="setup-pick" onClick={() => choose('parent')}>
      <span className="setup-pick-icon" data-tone="warm"><House aria-hidden="true"/></span>
      <b>I am a parent</b>
      <span>Call or message my child, see their photos, nothing else in the way.</span>
      <ArrowRight className="setup-pick-go" aria-hidden="true"/>
     </button>
     <button type="button" className="setup-pick" onClick={() => choose('student')}>
      <span className="setup-pick-icon" data-tone="cool"><GraduationCap aria-hidden="true"/></span>
      <b>I am away from home</b>
      <span>Share when I am free, keep up with family, and grow the meadow.</span>
      <ArrowRight className="setup-pick-go" aria-hidden="true"/>
     </button>
    </div>
   </div> : <div className="setup-step" key="person">
    <h1>Add somebody to call?</h1>
    <p className="setup-sub">A sample family is already here to explore -- this is for
     somebody real, if you would rather start with them. You can add more, or add
     nobody yet, from Your People at any time.</p>
    <label className="label" htmlFor="setup-person">Their name</label>
    {/* Not autofocused, same reasoning as the account name field before this
        one moved out: the keyboard should not cover a question nobody has
        read yet. */}
    <input className="input" id="setup-person" maxLength={40} autoComplete="off" spellCheck={false}
     placeholder="Nani…" value={name}
     onChange={e => setName(e.target.value)}
     onKeyDown={e => { if (e.key === 'Enter') start(mode, name) }}/>
    <button type="button" className="btn btn-block setup-go" onClick={() => start(mode, name)} disabled={!name.trim()}>
     <UserRoundPlus aria-hidden="true"/>Add Them and Start
    </button>
    <button type="button" className="btn btn-quiet btn-block" onClick={() => start(mode)}>Skip for now</button>
    <button type="button" className="btn btn-quiet btn-block" onClick={() => setStep(0)}>Back</button>
   </div>}
  </div>
 </div>
}
