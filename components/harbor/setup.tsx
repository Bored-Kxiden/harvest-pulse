'use client'
import { ArrowRight, GraduationCap, House } from 'lucide-react'
import { useHarbor } from '@/lib/harbor/store'

/** The one question left once you are signed in: which side of the phone this
 *  is. It used to ask for a name too, on a second step -- that question is
 *  answered when the account is made now, so asking again here was asking
 *  somebody to type their own name twice inside the same minute. Neither
 *  answer is final: Account can switch sides later.
 */
export function Setup() {
 const { start } = useHarbor()

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

   <div className="setup-step">
    <h1>Who is using this phone?</h1>
    <p className="setup-sub">It changes what you see. You can switch later.</p>
    <div className="setup-picks">
     <button type="button" className="setup-pick" onClick={() => start('parent')}>
      <span className="setup-pick-icon" data-tone="warm"><House aria-hidden="true"/></span>
      <b>I am a parent</b>
      <span>Call or message my child, see their photos, nothing else in the way.</span>
      <ArrowRight className="setup-pick-go" aria-hidden="true"/>
     </button>
     <button type="button" className="setup-pick" onClick={() => start('student')}>
      <span className="setup-pick-icon" data-tone="cool"><GraduationCap aria-hidden="true"/></span>
      <b>I am away from home</b>
      <span>Share when I am free, keep up with family, and grow the meadow.</span>
      <ArrowRight className="setup-pick-go" aria-hidden="true"/>
     </button>
    </div>
   </div>
  </div>
 </div>
}
