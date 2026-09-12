'use client'
import useSWR from 'swr'
import { toast } from 'sonner'
import { addMoment, parseState, seedState, type HarborState, type Moment } from './model'
const KEY = 'harbor-demo-v5'
let current: HarborState | undefined
let warned = false
function persist(state: HarborState) {
 try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { if (!warned) { toast.error('Storage is unavailable. Changes will last only for this visit.'); warned = true } }
}
function read() {
 if (!current) {
  try { const raw = localStorage.getItem(KEY); current = raw ? parseState(raw) ?? undefined : undefined; if (raw && !current) toast.info('Saved demo data could not be read. A fresh garden is ready.') } catch { /* Browsers can deny storage access; the in-memory demo remains usable. */ }
  current ??= seedState(); persist(current)
 }
 return current
}
export function useHarbor() {
 const { data, mutate } = useSWR<HarborState>(KEY, read, { refreshInterval: 0, revalidateOnFocus: true, dedupingInterval: 1000 })
 const update = (fn: (state: HarborState) => HarborState) => { current = fn(current ?? data ?? read()); persist(current); void mutate(current, false) }
 const log = (moment: Moment) => update(s => addMoment(s, moment))
 const reset = () => { current = seedState(); persist(current); void mutate(current, false) }
 return { state: data, update, log, reset }
}
export function makeId() { return crypto.randomUUID() }

function tone(sound: string, at: number, ctx: AudioContext) {
 const osc = ctx.createOscillator(); const gain = ctx.createGain()
 osc.connect(gain); gain.connect(ctx.destination); osc.type = 'sine'
 osc.frequency.setValueAtTime(sound === 'soft' ? 440 : 660, at)
 osc.frequency.exponentialRampToValueAtTime(sound === 'soft' ? 330 : 495, at + 0.5)
 gain.gain.setValueAtTime(0.0001, at); gain.gain.exponentialRampToValueAtTime(0.09, at + 0.04); gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.9)
 osc.start(at); osc.stop(at + 0.95)
 return osc
}
export function chime(sound: string) {
 if (sound === 'silent') return
 try { const ctx = new AudioContext(); const osc = tone(sound, ctx.currentTime, ctx); osc.onended = () => void ctx.close() } catch { toast.info('Sound is not supported in this browser.') }
}
/** The cue rings a few times like a call would, then stops on its own. Never loops indefinitely. */
export function ring(sound: string, times = 3) {
 if (sound === 'silent') return () => {}
 try {
  const ctx = new AudioContext(); const start = ctx.currentTime
  let last: OscillatorNode | undefined
  for (let i = 0; i < times; i++) last = tone(sound, start + i * 1.25, ctx)
  if (last) last.onended = () => void ctx.close()
  return () => { try { void ctx.close() } catch { /* already closed */ } }
 } catch { return () => {} }
}
export function buzz(pattern: number[] = [180, 110, 180, 110, 260]) {
 try { navigator.vibrate?.(pattern) } catch { /* vibration is unavailable or blocked; the cue still shows */ }
}
