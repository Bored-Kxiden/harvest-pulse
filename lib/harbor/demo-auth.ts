'use client'
/** A local stand-in for the real thing.
 *
 *  This is the Vercel demo: there is nowhere for a password to travel to, and
 *  nothing to check it against but this browser. So this is a real account in
 *  the only sense that fits a demo honestly -- typed once, remembered here,
 *  and checked again on the way back in -- rather than a rehearsal of what a
 *  real sign-in will eventually check. Nothing here is sent anywhere; that is
 *  not a simplification, it is the whole point of a demo.
 *
 *  Kept in its own localStorage keys, separate from the household state in
 *  store.ts, so "Start the Demo Fresh" (which re-seeds the household) does not
 *  have to also mean "sign out", and multiple demo accounts really can exist
 *  side by side in the same browser.
 */

export type DemoAccount = { email: string; password: string; name: string }
type Result = { ok: true } | { ok: false; error: string }

const ACCOUNTS_KEY = 'harbor-demo-accounts'
const SESSION_KEY = 'harbor-demo-session'
const resetKey = (email: string) => `harbor-demo-reset-${email}`

function readAccounts(): Record<string, DemoAccount> {
 try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '{}') } catch { return {} }
}
function writeAccounts(accounts: Record<string, DemoAccount>) {
 try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts)) } catch { /* storage may be blocked; the account simply will not be remembered past this visit */ }
}
const keyOf = (email: string) => email.trim().toLowerCase()

/** The signed-in email, or null. Synchronous, since it is only ever a
    localStorage read -- there is no server round trip to wait on here. */
export function currentSession(): string | null {
 try { return localStorage.getItem(SESSION_KEY) } catch { return null }
}
/** The name on the signed-in account, for the household `start()` lays down. */
export function accountName(): string | undefined {
 const key = currentSession()
 return key ? readAccounts()[key]?.name : undefined
}

export function signUp(email: string, password: string, name: string): Result {
 const key = keyOf(email)
 if (!key) return { ok: false, error: 'An email, please.' }
 const accounts = readAccounts()
 if (accounts[key]) return { ok: false, error: 'There is already an account with that email. Sign in instead.' }
 accounts[key] = { email: key, password, name: name.trim() }
 writeAccounts(accounts)
 try { localStorage.setItem(SESSION_KEY, key) } catch { /* the account is made; only staying signed in is at risk */ }
 return { ok: true }
}

export function signIn(email: string, password: string): Result {
 const key = keyOf(email)
 const account = readAccounts()[key]
 if (!account || account.password !== password) return { ok: false, error: 'That email and password do not go together.' }
 try { localStorage.setItem(SESSION_KEY, key) } catch { /* signed in for this render; will not be remembered on reload */ }
 return { ok: true }
}

export function signOut() {
 try { localStorage.removeItem(SESSION_KEY) } catch { /* nothing to remove if storage is already gone */ }
}

/** Asks for a six-digit code. A real account would have this emailed; a demo
    has nowhere to send it, so it comes straight back rather than pretending an
    email went anywhere it did not. */
export function requestReset(email: string): Result & { code?: string } {
 const key = keyOf(email)
 if (!readAccounts()[key]) return { ok: false, error: 'There is no demo account under that email yet.' }
 const code = String(Math.floor(100000 + Math.random() * 900000))
 try { localStorage.setItem(resetKey(key), code) } catch { /* nothing to do if storage is blocked; the caller still has the code in hand */ }
 return { ok: true, code }
}

export function confirmReset(email: string, code: string, newPassword: string): Result {
 const key = keyOf(email)
 let saved: string | null = null
 try { saved = localStorage.getItem(resetKey(key)) } catch { /* treated the same as a missing code below */ }
 if (!saved || saved !== code.trim()) return { ok: false, error: 'That code is not right.' }
 const accounts = readAccounts()
 const account = accounts[key]
 if (!account) return { ok: false, error: 'That account no longer exists.' }
 account.password = newPassword
 writeAccounts(accounts)
 try { localStorage.removeItem(resetKey(key)); localStorage.setItem(SESSION_KEY, key) } catch { /* the password is changed either way */ }
 return { ok: true }
}
