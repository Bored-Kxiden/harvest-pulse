'use client'
import { useEffect, useState } from 'react'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { confirmReset, currentSession, requestReset, signIn, signOut, signUp } from '@/lib/harbor/demo-auth'

/** Nothing in the app renders until somebody is signed in, the way it would
 *  in front of a real backend -- the difference here is entirely inside
 *  demo-auth.ts, not in this gate or in how the app behind it looks.
 *
 *  `ready` exists only to dodge a hydration mismatch: the server has no
 *  localStorage to check, so the first client render has to match what the
 *  server sent before it is safe to look. It is a read, not a request, so
 *  the wait is a render tick, not a spinner worth showing.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
 const [ready, setReady] = useState(false)
 const [signedIn, setSignedIn] = useState(false)

 useEffect(() => { setSignedIn(!!currentSession()); setReady(true) }, [])

 if (!ready) return null
 if (!signedIn) return <SignIn onIn={() => setSignedIn(true)}/>
 return <>{children}</>
}

function Brand() {
 return (
  <div className="setup-brand">
   <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" width="26" height="26">
    <path d="M16 29V14" stroke="#1F6B43" strokeWidth="3" strokeLinecap="round"/>
    <path d="M15 15.5c-1.2-5-5-7.6-11-8 .4 6.6 3.8 10 11 8z" fill="#59A468"/>
    <path d="M17 13c1-5.6 4.8-8.8 11.6-9.4C28.2 11 24.4 15 17 13z" fill="#79BC7F"/>
   </svg>
   <span>harbor</span>
  </div>
 )
}

/** A password field with a way to see what is in it. On a phone this is the
    difference between getting in and giving up on a keyboard; ported here
    unchanged because the demo should feel like the real screens, not a
    simplified stand-in for them. */
function Secret({ id, label, value, onChange, onEnter, autoComplete }: {
 id: string; label: string; value: string; onChange: (v: string) => void
 onEnter?: () => void; autoComplete: string
}) {
 const [shown, setShown] = useState(false)
 return (
  <>
   <label className="label" htmlFor={id}>{label}</label>
   <div className="reveal">
    <input className="input" id={id} type={shown ? 'text' : 'password'}
     autoComplete={autoComplete} autoCapitalize="none" autoCorrect="off"
     spellCheck={false} value={value}
     onChange={e => onChange(e.target.value)}
     onKeyDown={e => { if (e.key === 'Enter') onEnter?.() }}/>
    <button type="button" className="reveal-eye" onClick={() => setShown(!shown)}
     aria-pressed={shown} aria-controls={id}
     aria-label={shown ? 'Hide the password' : 'Show the password'}>
     {shown ? <EyeOff aria-hidden="true"/> : <Eye aria-hidden="true"/>}
    </button>
   </div>
  </>
 )
}

/** Getting back in when the password is gone. A real account would email a
    code; a demo has nowhere to send one, so it is shown right here instead of
    pretending an email went out. Still a real, working exchange -- the code
    has to be typed back correctly, same as the password after it. */
function Forgot({ email: initial, onDone, onCancel }: { email: string; onDone: () => void; onCancel: () => void }) {
 const [stage, setStage] = useState<'ask' | 'code'>('ask')
 const [email, setEmail] = useState(initial)
 const [shownCode, setShownCode] = useState('')
 const [code, setCode] = useState('')
 const [password, setPassword] = useState('')
 const [error, setError] = useState<string>()

 const send = () => {
  setError(undefined)
  const result = requestReset(email)
  if (!result.ok) { setError(result.error); return }
  setShownCode(result.code ?? ''); setStage('code')
 }
 const finish = () => {
  setError(undefined)
  const digits = code.replace(/\D/g, '')
  if (digits.length !== 6) { setError('The code is the six digits above.'); return }
  if (password.length < 6) { setError('A new password of at least six characters.'); return }
  const result = confirmReset(email, digits, password)
  if (!result.ok) { setError(result.error); return }
  onDone()
 }

 return (
  <div className="setup">
   <div className="setup-inner">
    <Brand/>
    <div className="setup-step">
     <h1>{stage === 'ask' ? 'Let us get you back in.' : 'Here is your code.'}</h1>
     {stage === 'ask' ? (
      <>
       <p className="setup-sub">In the real app this goes to your email. A demo has
        nowhere to send it, so it will just appear on the next screen.</p>
       <label className="label" htmlFor="forgot-email">Email</label>
       <input className="input" id="forgot-email" type="email" inputMode="email"
        autoComplete="email" spellCheck={false} autoFocus value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') send() }}/>
      </>
     ) : (
      <>
       <p className="setup-sub">Type it below with the new password you want.</p>
       <p className="code-shown" aria-live="polite">{shownCode}</p>
       <label className="label" htmlFor="forgot-code">The six digits</label>
       <input className="input code-in" id="forgot-code" inputMode="numeric"
        autoComplete="one-time-code" autoFocus placeholder="000000"
        value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}/>
       <Secret id="forgot-password" label="Your new password" value={password}
        onChange={setPassword} onEnter={finish} autoComplete="new-password"/>
      </>
     )}
     {error && <p className="field-error" role="alert">{error}</p>}
     <button type="button" className="btn btn-block setup-go" onClick={stage === 'ask' ? send : finish}>
      {stage === 'ask' ? 'Show me a code' : 'Set it and sign in'} <ArrowRight aria-hidden="true"/>
     </button>
     <button type="button" className="btn btn-quiet btn-block" onClick={onCancel}>Back to signing in</button>
    </div>
   </div>
  </div>
 )
}

function SignIn({ onIn }: { onIn: () => void }) {
 const [joining, setJoining] = useState(false)
 const [forgot, setForgot] = useState(false)
 const [email, setEmail] = useState('')
 const [password, setPassword] = useState('')
 const [name, setName] = useState('')
 const [error, setError] = useState<string>()

 const go = () => {
  setError(undefined)
  if (joining && !name.trim()) { setError('A name, so your people know who they are hearing from.'); return }
  if (!email.trim() || password.length < 6) { setError('An email, and a password of at least six characters.'); return }
  const result = joining ? signUp(email, password, name) : signIn(email, password)
  if (!result.ok) { setError(result.error); return }
  onIn()
 }

 if (forgot) return <Forgot email={email} onCancel={() => setForgot(false)}
  onDone={() => { setForgot(false); setPassword(''); onIn() }}/>

 return (
  <div className="setup">
   <div className="setup-inner">
    <Brand/>
    <div className="setup-step">
     <h1>{joining ? 'Make your Harbor.' : 'Welcome back.'}</h1>
     <p className="setup-sub">
      {joining
       ? 'One account, kept on this device. You will say who is using it next.'
       : 'Sign in and your meadow comes back exactly as you left it.'}
     </p>

     {joining && (
      <>
       <label className="label" htmlFor="auth-name">Your name</label>
       <input className="input" id="auth-name" autoComplete="given-name" spellCheck={false}
        maxLength={40} placeholder="What they call you" value={name}
        onChange={e => setName(e.target.value)}/>
      </>
     )}

     <label className="label" htmlFor="auth-email">Email</label>
     <input className="input" id="auth-email" type="email" inputMode="email"
      autoComplete="email" spellCheck={false} value={email}
      onChange={e => setEmail(e.target.value)}/>

     <Secret id="auth-password" label="Password" value={password} onChange={setPassword}
      onEnter={go} autoComplete={joining ? 'new-password' : 'current-password'}/>

     {error && <p className="field-error" role="alert">{error}</p>}

     <button type="button" className="btn btn-block setup-go" onClick={go}>
      {joining ? 'Create my account' : 'Sign in'} <ArrowRight aria-hidden="true"/>
     </button>
     <button type="button" className="btn btn-quiet btn-block"
      onClick={() => { setJoining(!joining); setError(undefined) }}>
      {joining ? 'I already have an account' : 'I am new here'}
     </button>
     {!joining && (
      <button type="button" className="btn btn-quiet btn-block"
       onClick={() => { setForgot(true); setError(undefined) }}>
       I have forgotten my password
      </button>
     )}
     <p className="note-strip">This is the demo: your account is real only in this
      browser, kept the same way this sample family is. Nothing here is sent anywhere.</p>
    </div>
   </div>
  </div>
 )
}

/** For Account's sign-out button: no cross-component signal exists for "somebody
    else changed whether we are signed in", so a reload is the honest, simple way
    to make AuthGate re-check rather than inventing shared state for one button. */
export function signOutAndReload() {
 signOut()
 window.location.reload()
}
