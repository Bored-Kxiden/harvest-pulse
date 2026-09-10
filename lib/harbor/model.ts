export type Tone = 'green' | 'gold' | 'orange' | 'sky'
export type Person = { id: string; name: string; initials: string; tone: Tone; photoId?: string; note?: string }

export type Resolution = 'called' | 'reacted' | 'proposed_later' | 'message' | 'dismissed' | 'played'
export type Feeling = 'light' | 'warm' | 'steady' | 'tender'
export type Moment = {
 id: string; at: string; person: string; kind: Resolution; text: string
 source: 'manual' | 'walking_stop' | 'note' | 'game'
 proposedTime?: string; feedback?: 'good' | 'bad'; reminderDone?: boolean; cueId?: string
 minutes?: number; feeling?: Feeling; flower?: FlowerKind; topic?: string
}

export type ChatMessage = { id: string; text: string; mine: boolean; at: string; liked?: boolean }
export type Interval = { start: string; end: string }
export type Note = { id: string; at: string; person: string; kind: 'note' | 'snapshot'; text?: string; mediaId?: string }

export type Weather = 'clear' | 'bright' | 'cloudy' | 'rain' | 'storm'
export type FlowerKind = 'daisy' | 'tulip' | 'poppy' | 'cosmos' | 'marigold' | 'bluebell' | 'aster' | 'sunflower'

export type HarborState = {
 version: 2; name: string
 people: Person[]
 sharing: boolean; momConsent: boolean; sharingSetupDone: boolean
 schedules: Record<string, { you: Interval[]; mom: Interval[] }>
 weather: Weather; milestone: { title: string; date: string }
 messages: Record<string, ChatMessage[]>; read: string[]; drafts: Record<string, string>
 moments: Moment[]; cues: { id: string; at: string }[]
 notes: Note[]; games: Record<string, string>
 settings: { cuesEnabled: boolean; walkingMinutes: number; sessionMinutes: number; dailyCap: number; cooldownMinutes: number; sound: 'chime' | 'soft' | 'silent'; reducedMotion: boolean }
}

/* ---------- how life feels, read as weather — a scale, not a score ---------- */
export const weathers: { id: Weather; label: string; caption: string }[] = [
 { id: 'clear', label: 'Clear', caption: 'Room to breathe. Nothing pressing.' },
 { id: 'bright', label: 'Bright', caption: 'Good and busy. The kind you chose.' },
 { id: 'cloudy', label: 'Cloudy', caption: 'A little grey around the edges.' },
 { id: 'rain', label: 'Rain', caption: 'Heavy going. Steady, but heavy.' },
 { id: 'storm', label: 'Storm', caption: 'Too much at once. This passes.' },
]
export function weatherIndex(value: Weather) { const i = weathers.findIndex(w => w.id === value); return i < 0 ? 0 : i }

/* ---------- the flower library — what a call becomes ---------- */
export type FlowerSpec = { id: FlowerKind; name: string; note: string; petal: string; petalDeep: string; heart: string; petals: number; shape: 'round' | 'point' | 'cup' }
export const flowerLibrary: FlowerSpec[] = [
 { id: 'daisy', name: 'Daisy', note: 'An ordinary, easy call.', petal: '#FBFCF6', petalDeep: '#E7EBDA', heart: '#F0BD3E', petals: 9, shape: 'round' },
 { id: 'marigold', name: 'Marigold', note: 'Warm, a little loud, full of news.', petal: '#F5B14A', petalDeep: '#DE8F2E', heart: '#8B5A1C', petals: 11, shape: 'round' },
 { id: 'cosmos', name: 'Cosmos', note: 'Light and drifting. No agenda.', petal: '#F1C3D4', petalDeep: '#DB9BB4', heart: '#F0BD3E', petals: 7, shape: 'round' },
 { id: 'poppy', name: 'Poppy', note: 'Something honest got said.', petal: '#E2705A', petalDeep: '#C4523E', heart: '#3B2A22', petals: 5, shape: 'cup' },
 { id: 'tulip', name: 'Tulip', note: 'Short, and enough.', petal: '#E0879F', petalDeep: '#C4667F', heart: '#C4667F', petals: 3, shape: 'cup' },
 { id: 'bluebell', name: 'Bluebell', note: 'Quiet. Mostly listening.', petal: '#8FA6D6', petalDeep: '#6D85BC', heart: '#5A6FA5', petals: 5, shape: 'point' },
 { id: 'aster', name: 'Aster', note: 'Tangled, then untangled.', petal: '#B79CD8', petalDeep: '#9A7CC0', heart: '#F0BD3E', petals: 13, shape: 'point' },
 { id: 'sunflower', name: 'Sunflower', note: 'The long, good kind.', petal: '#F0C93E', petalDeep: '#D6A81F', heart: '#6B4A22', petals: 14, shape: 'point' },
]
export function flowerSpec(kind: FlowerKind | undefined): FlowerSpec { return flowerLibrary.find(f => f.id === kind) ?? flowerLibrary[0] }

export const feelings: { id: Feeling; label: string; caption: string; flower: FlowerKind }[] = [
 { id: 'light', label: 'Lighter', caption: 'Something lifted.', flower: 'cosmos' },
 { id: 'warm', label: 'Warm', caption: 'Glad you picked up.', flower: 'marigold' },
 { id: 'steady', label: 'Steady', caption: 'Ordinary, in a good way.', flower: 'daisy' },
 { id: 'tender', label: 'Tender', caption: 'A lot, but worth it.', flower: 'poppy' },
]

/* ---------- topic shapes — the sender sets the shape before a call happens ---------- */
export const topics = ['Catch up', 'Ask for help', 'Share news', 'Just because']

export function localDay(date: Date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
export function minutes(value: string) { const [h, m] = value.split(':').map(Number); return h * 60 + m }
export function validIntervals(values: Interval[]) {
 if (!Array.isArray(values) || values.length > 12) return false
 return values.every(v => v && /^([01]\d|2[0-3]):[0-5]\d$/.test(v.start) && /^([01]\d|2[0-3]):[0-5]\d$/.test(v.end) && minutes(v.start) < minutes(v.end))
}
export function overlaps(a: Interval[], b: Interval[]): Interval[] {
 const raw = a.flatMap(x => b.flatMap(y => {
  const start = x.start > y.start ? x.start : y.start; const end = x.end < y.end ? x.end : y.end
  return start < end ? [{ start, end }] : []
 })).sort((x, y) => x.start.localeCompare(y.start))
 return raw.reduce<Interval[]>((out, value) => { const last = out.at(-1); if (last && value.start <= last.end) last.end = last.end > value.end ? last.end : value.end; else out.push({ ...value }); return out }, [])
}
export function formatTime(value: string) { const m = minutes(value); return `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, '0')} ${m >= 720 ? 'pm' : 'am'}` }
export function sharedWindows(state: HarborState, day: string) { const s = state.schedules[day]; return state.sharing && state.momConsent && s ? overlaps(s.you, s.mom) : [] }
export function isFuture(value: string, now = new Date()) { const t = new Date(value).getTime(); return Number.isFinite(t) && t > now.getTime() }
export function personOf(state: HarborState, id: string) { return state.people.find(p => p.id === id) }
export function initialsOf(name: string) { return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '·' }

/* ---------- calls, and what they grow into ---------- */
export function callsFor(state: HarborState, personId: string) { return state.moments.filter(m => m.kind === 'called' && m.person === personId && m.flower) }
export function usualCallMinutes(state: HarborState, personId: string) {
 const lengths = callsFor(state, personId).map(m => m.minutes).filter((n): n is number => Number.isFinite(n))
 if (!lengths.length) return null
 return Math.max(1, Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length))
}
export function dominantFlower(state: HarborState, personId: string): FlowerKind | null {
 const counts = new Map<FlowerKind, number>()
 for (const m of callsFor(state, personId)) counts.set(m.flower!, (counts.get(m.flower!) ?? 0) + 1)
 let best: FlowerKind | null = null; let top = 0
 for (const [kind, n] of counts) if (n > top) { top = n; best = kind }
 return best
}
/** A longer call opens a fuller bloom. Bounded so a two-minute call is still a whole flower. */
export function bloomScale(minutesLong: number | undefined) {
 const m = Number.isFinite(minutesLong) ? (minutesLong as number) : 8
 return Math.round(Math.min(1.45, Math.max(0.68, 0.6 + Math.sqrt(m) / 7)) * 100) / 100
}
export function formatDuration(m: number | undefined) {
 if (!Number.isFinite(m)) return 'a little while'
 const n = m as number
 if (n < 60) return `${n} min`
 const h = Math.floor(n / 60); const rest = n % 60
 return rest ? `${h} hr ${rest} min` : `${h} hr`
}

export function addMoment(state: HarborState, moment: Moment): HarborState {
 if (state.moments.some(x => x.id === moment.id)) return state
 return { ...state, moments: [...state.moments, moment] }
}

export function cueEligibility(state: HarborState, walked: number, stopped: boolean, now = new Date()) {
 if (!state.settings.cuesEnabled) return 'Cues are off. You can turn them on in Settings when you feel ready.'
 if (!stopped) return 'Still walking. A cue waits until you have fully stopped.'
 if (!Number.isFinite(walked) || walked < state.settings.walkingMinutes) return `Below your ${state.settings.walkingMinutes}-minute walking threshold.`
 const today = localDay(now)
 if (state.moments.some(m => localDay(new Date(m.at)) === today && ['called', 'reacted', 'message'].includes(m.kind))) return 'You already connected today. Enjoy the quiet.'
 if (state.moments.some(m => m.kind === 'proposed_later' && !m.reminderDone)) return 'You already have a gentle reminder planned.'
 const cues = state.cues.filter(c => localDay(new Date(c.at)) === today)
 if (cues.length >= state.settings.dailyCap) return 'Your daily cue limit is reached. No more nudges today.'
 const last = state.cues.at(-1)
 if (last && now.getTime() - new Date(last.at).getTime() < state.settings.cooldownMinutes * 60000) return 'Taking a little breathing room. Your cooldown is still active.'
 return null
}

/* ---------- daily family question: one shared prompt per day, no streak anywhere ---------- */
export type GamePrompt = { q: string; mom: string; dad: string }
export const gamePrompts: GamePrompt[] = [
 { q: 'Tea, coffee, or neither today?', mom: 'Chai, obviously. Extra ginger today.', dad: 'Black coffee. The tomatoes needed watering early.' },
 { q: 'Window seat or aisle?', mom: 'Window. I like watching the world go by.', dad: 'Aisle. More room for my knees.' },
 { q: 'One good thing about today, however small?', mom: 'The jasmine finally opened.', dad: 'Found my old radio in the garage. Still works.' },
 { q: 'Sweet or savory breakfast?', mom: 'Sweet. Always sweet.', dad: 'Savory, every time.' },
 { q: 'Beach or mountains?', mom: 'Mountains. Somewhere quiet.', dad: 'Beach. I like the noise, actually.' },
 { q: 'If today had a theme song, what would it be?', mom: 'Something old, from a film we watched together once.', dad: 'Whatever was on the radio in the car.' },
 { q: 'Early bird or night owl, honestly?', mom: 'Early bird. Mornings feel like mine.', dad: 'Night owl, but I pretend otherwise.' },
 { q: 'What smell reminds you of home right now?', mom: 'Whatever is simmering on the stove.', dad: 'Fresh-cut grass, if I am honest.' },
 { q: 'Rain or sunshine today?', mom: 'A little rain. Good for the garden.', dad: 'Sunshine. Always rooting for sunshine.' },
 { q: 'One word for how today felt?', mom: 'Full.', dad: 'Steady.' },
 { q: 'Cat person, dog person, or neither?', mom: 'Dog person, no contest.', dad: 'Whichever one leaves me alone the longest.' },
 { q: 'One small thing you are looking forward to?', mom: 'Hearing about your day, actually.', dad: 'The weekend. No particular reason.' },
]
export function gameForDay(day: string): GamePrompt { let h = 0; for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0; return gamePrompts[h % gamePrompts.length] }

export const seedPeople: Person[] = [
 { id: 'mom', name: 'Mom', initials: 'M', tone: 'gold', note: 'Made your favorite today. Guess what it is?' },
 { id: 'dad', name: 'Dad', initials: 'D', tone: 'green', note: 'The tomatoes are finally growing!' },
 { id: 'aanya', name: 'Aanya', initials: 'A', tone: 'orange', note: 'Saving this story for our next call.' },
]

export function seedState(now = new Date()): HarborState {
 const today = localDay(now); const milestone = new Date(now); milestone.setDate(milestone.getDate() + 21)
 const seedCalls: [string, number, Feeling, FlowerKind, string, string][] = [
  ['mom', 14, 'warm', 'marigold', 'Catch up', 'A long chat about absolutely nothing.'],
  ['mom', 6, 'steady', 'daisy', 'Just because', 'A quick hello between classes.'],
  ['mom', 31, 'tender', 'poppy', 'Ask for help', 'The one where I finally said it out loud.'],
  ['mom', 9, 'light', 'cosmos', 'Share news', 'Told her about the presentation.'],
  ['dad', 22, 'steady', 'sunflower', 'Catch up', 'The full tomato report.'],
  ['dad', 4, 'light', 'tulip', 'Just because', 'Two minutes, just to hear his voice.'],
  ['dad', 11, 'warm', 'daisy', 'Share news', 'He laughed at the same joke twice.'],
  ['aanya', 26, 'tender', 'aster', 'Ask for help', 'Untangling the whole week together.'],
  ['aanya', 8, 'light', 'bluebell', 'Just because', 'Mostly listening. That was the point.'],
 ]
 const moments: Moment[] = seedCalls.map(([person, mins, feeling, flower, topic, text], i) => {
  const at = new Date(now); at.setDate(at.getDate() - (i * 3 + 2)); at.setHours(17 + (i % 4), 20, 0, 0)
  return { id: `seed-call-${i}`, at: at.toISOString(), person, kind: 'called' as const, text, source: 'manual' as const, minutes: mins, feeling, flower, topic }
 })
 const notes: Note[] = [
  { id: 'seed-note-mom', at: new Date(now.getTime() - 3600000).toISOString(), person: 'mom', kind: 'note', text: 'Made a little extra of your favorite, out of habit.' },
  { id: 'seed-note-dad', at: new Date(now.getTime() - 5 * 3600000).toISOString(), person: 'dad', kind: 'note', text: 'Radio still works. Unbelievable.' },
  { id: 'seed-note-aanya', at: new Date(now.getTime() - 26 * 3600000).toISOString(), person: 'aanya', kind: 'note', text: 'saving a story for you' },
 ]
 return {
  version: 2, name: 'Maya', people: seedPeople.map(p => ({ ...p })),
  sharing: false, momConsent: false, sharingSetupDone: false,
  schedules: { [today]: { you: [{ start: '20:40', end: '22:00' }], mom: [{ start: '20:00', end: '21:30' }] } },
  weather: 'bright', milestone: { title: 'Midterms', date: localDay(milestone) },
  messages: Object.fromEntries(seedPeople.map(p => [p.id, [{ id: `hello-${p.id}`, text: p.note ?? 'Thinking of you.', mine: false, at: new Date(now.getTime() - 3600000).toISOString() }]])),
  read: [], drafts: {}, moments, cues: [], notes, games: {},
  settings: { cuesEnabled: true, walkingMinutes: 10, sessionMinutes: 20, dailyCap: 2, cooldownMinutes: 120, sound: 'chime', reducedMotion: false },
 }
}

export function parseState(raw: string): HarborState | null {
 try {
  const s = JSON.parse(raw) as HarborState
  if (s.version !== 2 || typeof s.name !== 'string' || typeof s.sharing !== 'boolean' || typeof s.momConsent !== 'boolean' || typeof s.sharingSetupDone !== 'boolean') return null
  if (!s.settings || !s.schedules || !s.milestone || !s.messages || !s.drafts) return null
  if (!Array.isArray(s.people) || !s.people.length || !s.people.every(p => p && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.initials === 'string' && ['green', 'gold', 'orange', 'sky'].includes(p.tone))) return null
  if (!weathers.some(w => w.id === s.weather) || typeof s.milestone.title !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.milestone.date)) return null
  if (!Object.values(s.schedules).every(v => v && validIntervals(v.you) && validIntervals(v.mom))) return null
  if (!Object.values(s.messages).every(ms => Array.isArray(ms) && ms.every(m => typeof m.text === 'string' && typeof m.mine === 'boolean' && typeof m.id === 'string'))) return null
  if (!Array.isArray(s.moments) || !s.moments.every(m => m && typeof m.id === 'string' && typeof m.text === 'string' && typeof m.person === 'string' && Number.isFinite(Date.parse(m.at)) && ['called', 'reacted', 'proposed_later', 'message', 'dismissed', 'played'].includes(m.kind) && (m.flower === undefined || flowerLibrary.some(f => f.id === m.flower)))) return null
  if (!Array.isArray(s.notes) || !s.notes.every(n => n && typeof n.id === 'string' && typeof n.person === 'string' && Number.isFinite(Date.parse(n.at)) && ['note', 'snapshot'].includes(n.kind))) return null
  if (!s.games || typeof s.games !== 'object' || Array.isArray(s.games) || !Object.entries(s.games).every(([k, v]) => typeof k === 'string' && typeof v === 'string')) return null
  if (!Array.isArray(s.cues) || !s.cues.every(c => c && typeof c.id === 'string' && Number.isFinite(Date.parse(c.at)))) return null
  if (!Array.isArray(s.read) || !s.read.every(d => typeof d === 'string')) return null
  const v = s.settings
  if (typeof v.cuesEnabled !== 'boolean' || typeof v.reducedMotion !== 'boolean' || !['chime', 'soft', 'silent'].includes(v.sound)) return null
  if (![v.walkingMinutes, v.sessionMinutes, v.dailyCap, v.cooldownMinutes].every(n => Number.isFinite(n) && n >= 1) || v.dailyCap > 10) return null
  return s
 } catch { return null }
}
