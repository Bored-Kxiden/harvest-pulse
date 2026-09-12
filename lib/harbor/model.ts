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
/** A block of time somebody is busy. The label is what they are doing; only they ever see it. */
export type Interval = { start: string; end: string; label?: string; linked?: boolean }
export type CalendarLink = { provider: CalendarProvider; connectedAt: string }
export type CalendarProvider = 'outlook' | 'google' | 'apple'
export const calendarProviders: { id: CalendarProvider; name: string }[] = [
 { id: 'outlook', name: 'Outlook' }, { id: 'google', name: 'Google Calendar' }, { id: 'apple', name: 'Apple Calendar' },
]
export type Note = { id: string; at: string; person: string; text: string }

/** An instant: one picture, taken now rather than chosen. Kept only if someone keeps it. */
export type Snap = { id: string; at: string; person: string; mediaId?: string; caption?: string; prompted?: boolean; promptDay?: string; saved?: boolean; simulated?: boolean }
/** A snap window only exists between two people who both said yes, and either can end it. */
export type SnapPact = { personId: string; status: 'invited' | 'active'; since: string }

export type Weather = 'clear' | 'bright' | 'cloudy' | 'rain' | 'storm'
export type Theme = 'system' | 'light' | 'dark'
export const themes: { id: Theme; label: string }[] = [
 { id: 'system', label: 'Auto' },
 { id: 'light', label: 'Day' },
 { id: 'dark', label: 'Dusk' },
]
export type FlowerKind = 'daisy' | 'tulip' | 'poppy' | 'cosmos' | 'marigold' | 'bluebell' | 'aster' | 'sunflower'

export type HarborState = {
 version: 4; name: string
 people: Person[]
 sharing: boolean; momConsent: boolean; sharingSetupDone: boolean
 schedules: Record<string, { you: Interval[]; mom: Interval[] }>; calendar: CalendarLink | null
 weather: Weather; milestone: { title: string; date: string }
 messages: Record<string, ChatMessage[]>; read: string[]; drafts: Record<string, string>
 moments: Moment[]; cues: { id: string; at: string }[]
 notes: Note[]; games: Record<string, string>
 snaps: Snap[]; pacts: SnapPact[]; snapWindows: Record<string, string>
 settings: { cuesEnabled: boolean; walkingMinutes: number; sessionMinutes: number; dailyCap: number; cooldownMinutes: number; sound: 'chime' | 'soft' | 'silent'; reducedMotion: boolean; theme: Theme }
}

/* ---------- how life feels, read as weather: a scale, not a score ---------- */
export const weathers: { id: Weather; label: string; caption: string }[] = [
 { id: 'clear', label: 'Clear', caption: 'Room to breathe. Nothing pressing.' },
 { id: 'bright', label: 'Bright', caption: 'Good and busy. The kind you chose.' },
 { id: 'cloudy', label: 'Cloudy', caption: 'A little grey around the edges.' },
 { id: 'rain', label: 'Rain', caption: 'Heavy going. Steady, but heavy.' },
 { id: 'storm', label: 'Storm', caption: 'Too much at once. This passes.' },
]
export function weatherIndex(value: Weather) { const i = weathers.findIndex(w => w.id === value); return i < 0 ? 0 : i }

/* ---------- the flower library: what a call becomes ---------- */
export type FlowerSpec = { id: FlowerKind; name: string; note: string; petal: string; petalDeep: string; heart: string; petals: number; shape: 'round' | 'point' | 'cup' }
export const flowerLibrary: FlowerSpec[] = [
 { id: 'daisy', name: 'Daisy', note: 'An ordinary, easy call.', petal: '#FFFFFF', petalDeep: '#F0F3E6', heart: '#F7C948', petals: 9, shape: 'round' },
 { id: 'marigold', name: 'Marigold', note: 'Warm, a little loud, full of news.', petal: '#F9C46A', petalDeep: '#EDA63F', heart: '#9A6526', petals: 11, shape: 'round' },
 { id: 'cosmos', name: 'Cosmos', note: 'Light and drifting. No agenda.', petal: '#F7C3D8', petalDeep: '#E9A0BF', heart: '#F7C948', petals: 7, shape: 'round' },
 { id: 'poppy', name: 'Poppy', note: 'Something honest got said.', petal: '#F08C79', petalDeep: '#DC6C58', heart: '#5E3F33', petals: 5, shape: 'cup' },
 { id: 'tulip', name: 'Tulip', note: 'Short, and enough.', petal: '#F3A0B6', petalDeep: '#DE7F99', heart: '#DE7F99', petals: 4, shape: 'cup' },
 { id: 'bluebell', name: 'Bluebell', note: 'Quiet. Mostly listening.', petal: '#A9C4EC', petalDeep: '#88A6DA', heart: '#6E86BE', petals: 5, shape: 'point' },
 { id: 'aster', name: 'Aster', note: 'Tangled, then untangled.', petal: '#C9AEE9', petalDeep: '#AC8CD6', heart: '#F7C948', petals: 13, shape: 'point' },
 { id: 'sunflower', name: 'Sunflower', note: 'The long, good kind.', petal: '#F7D35E', petalDeep: '#E2B733', heart: '#8A6230', petals: 14, shape: 'point' },
]
export function flowerSpec(kind: FlowerKind | undefined): FlowerSpec { return flowerLibrary.find(f => f.id === kind) ?? flowerLibrary[0] }

export const feelings: { id: Feeling; label: string; caption: string; flower: FlowerKind }[] = [
 { id: 'light', label: 'Lighter', caption: 'Something lifted.', flower: 'cosmos' },
 { id: 'warm', label: 'Warm', caption: 'Glad you picked up.', flower: 'marigold' },
 { id: 'steady', label: 'Steady', caption: 'Ordinary, in a good way.', flower: 'daisy' },
 { id: 'tender', label: 'Tender', caption: 'A lot, but worth it.', flower: 'poppy' },
]

/* ---------- topic shapes: the sender sets the shape before a call happens ---------- */
export const topics = ['Catch up', 'Ask for help', 'Share news', 'Just because']

export function localDay(date: Date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
export function minutes(value: string) { const [h, m] = value.split(':').map(Number); return h * 60 + m }
export function validIntervals(values: Interval[]) {
 if (!Array.isArray(values) || values.length > 40) return false
 return values.every(v => v && /^([01]\d|2[0-3]):[0-5]\d$/.test(v.start) && /^([01]\d|2[0-3]):[0-5]\d$/.test(v.end) && minutes(v.start) < minutes(v.end)
  && (v.label === undefined || (typeof v.label === 'string' && v.label.length <= 60)))
}

/* ---------- busy in, free out ----------
   Blocks are what somebody is doing. What matters to the other person is the gaps
   between them, so free time is worked out rather than entered. */
export const DAY_OPEN = '07:00'
export const DAY_CLOSE = '22:00'
export function freeWindows(busy: Interval[], open = DAY_OPEN, close = DAY_CLOSE): Interval[] {
 const sorted = busy.slice().sort((a, b) => minutes(a.start) - minutes(b.start))
 const out: Interval[] = []
 let cursor = minutes(open)
 const end = minutes(close)
 for (const block of sorted) {
  const from = Math.max(minutes(block.start), minutes(open)), to = Math.min(minutes(block.end), end)
  if (to <= cursor) continue
  if (from > cursor) out.push({ start: clockOf(cursor), end: clockOf(Math.min(from, end)) })
  cursor = Math.max(cursor, to)
  if (cursor >= end) break
 }
 if (cursor < end) out.push({ start: clockOf(cursor), end: clockOf(end) })
 return out.filter(v => minutes(v.end) - minutes(v.start) >= 20)
}
export function clockOf(total: number) { return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}` }
export function blocksFor(state: HarborState, day: string, person: 'you' | 'mom') { return state.schedules[day]?.[person] ?? [] }

/** A week of seven day keys, Monday first, around whatever day you are looking at. */
export function weekOf(day: string) {
 const base = new Date(`${day}T12:00:00`)
 const shift = (base.getDay() + 6) % 7
 base.setDate(base.getDate() - shift)
 return Array.from({ length: 7 }, (_, i) => { const d = new Date(base); d.setDate(d.getDate() + i); return localDay(d) })
}

/** What a connected calendar would drop in: a week of plausible, already-labelled blocks. */
export function linkedWeek(day: string): Record<string, Interval[]> {
 const template: Interval[][] = [
  [{ start: '09:00', end: '11:00', label: 'Design studio' }, { start: '14:00', end: '15:30', label: 'Seminar' }],
  [{ start: '10:00', end: '12:30', label: 'Lab' }, { start: '18:00', end: '19:00', label: 'Swim' }],
  [{ start: '09:00', end: '10:30', label: 'Lecture' }, { start: '13:00', end: '17:00', label: 'Shift at the cafe' }],
  [{ start: '11:00', end: '13:00', label: 'Studio crit' }],
  [{ start: '09:30', end: '11:00', label: 'Lecture' }, { start: '16:00', end: '18:30', label: 'Group project' }],
  [{ start: '12:00', end: '14:00', label: 'Groceries and laundry' }],
  [{ start: '19:00', end: '20:30', label: 'Dinner with friends' }],
 ]
 return Object.fromEntries(weekOf(day).map((key, i) => [key, template[i].map(v => ({ ...v, linked: true }))]))
}
export function overlaps(a: Interval[], b: Interval[]): Interval[] {
 const raw = a.flatMap(x => b.flatMap(y => {
  const start = x.start > y.start ? x.start : y.start; const end = x.end < y.end ? x.end : y.end
  return start < end ? [{ start, end }] : []
 })).sort((x, y) => x.start.localeCompare(y.start))
 return raw.reduce<Interval[]>((out, value) => { const last = out.at(-1); if (last && value.start <= last.end) last.end = last.end > value.end ? last.end : value.end; else out.push({ ...value }); return out }, [])
}
export function formatTime(value: string) { const m = minutes(value); return `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, '0')} ${m >= 720 ? 'pm' : 'am'}` }
/** The quiet ground between two busy days: only ever computed when both people opted in. */
export function sharedWindows(state: HarborState, day: string) {
 if (!state.sharing || !state.momConsent) return []
 const s = state.schedules[day]
 if (!s) return []
 return overlaps(freeWindows(s.you), freeWindows(s.mom)).filter(v => minutes(v.end) - minutes(v.start) >= 20)
}
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

/* ---------- snap windows: only ever between two people who both said yes ---------- */
export function activePacts(state: HarborState) { return state.pacts.filter(p => p.status === 'active' && state.people.some(x => x.id === p.personId)) }
/** A genuinely random moment, rolled once a day: not a slot anyone can plan around. */
export function rollSnapWindow(now = new Date()) {
 const earliest = now.getTime() + 2 * 60000
 const close = new Date(now); close.setHours(22, 30, 0, 0)
 const latest = close.getTime() > earliest + 60000 ? close.getTime() : earliest + 45 * 60000
 return new Date(earliest + Math.floor(Math.random() * (latest - earliest))).toISOString()
}
export function answeredWindow(state: HarborState, day: string) { return state.snaps.some(s => s.person === 'you' && s.promptDay === day) }
export function snapWindowDue(state: HarborState, now = new Date()) {
 if (!activePacts(state).length) return false
 const day = localDay(now)
 const at = state.snapWindows[day]
 return !!at && Date.parse(at) <= now.getTime() && !answeredWindow(state, day)
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
  { id: 'seed-note-mom', at: new Date(now.getTime() - 3600000).toISOString(), person: 'mom', text: 'Made a little extra of your favorite, out of habit.' },
  { id: 'seed-note-dad', at: new Date(now.getTime() - 5 * 3600000).toISOString(), person: 'dad', text: 'Radio still works. Unbelievable.' },
  { id: 'seed-note-aanya', at: new Date(now.getTime() - 26 * 3600000).toISOString(), person: 'aanya', text: 'saving a story for you' },
 ]
 const snaps: Snap[] = [
  { id: 'seed-snap-mom', at: new Date(now.getTime() - 2 * 3600000).toISOString(), person: 'mom', caption: 'the jasmine, finally', simulated: true },
  { id: 'seed-snap-dad', at: new Date(now.getTime() - 30 * 3600000).toISOString(), person: 'dad', caption: 'first tomato of the year', saved: true, simulated: true },
  { id: 'seed-snap-aanya', at: new Date(now.getTime() - 52 * 3600000).toISOString(), person: 'aanya', caption: 'library, 1am, send help', simulated: true },
 ]
 /* A believable week of real life, so the calendar has something in it from the first run. */
 const week = weekOf(today)
 const yours: Interval[][] = [
  [{ start: '09:00', end: '11:00', label: 'Design studio' }, { start: '15:00', end: '17:00', label: 'Library' }],
  [{ start: '10:00', end: '12:30', label: 'Lab' }, { start: '18:30', end: '19:30', label: 'Run' }],
  [{ start: '09:00', end: '10:30', label: 'Lecture' }, { start: '13:00', end: '17:00', label: 'Shift at the cafe' }],
  [{ start: '11:00', end: '13:00', label: 'Studio crit' }],
  [{ start: '09:30', end: '11:00', label: 'Lecture' }, { start: '16:00', end: '18:00', label: 'Group project' }],
  [{ start: '12:00', end: '14:00', label: 'Laundry and groceries' }],
  [{ start: '19:00', end: '20:30', label: 'Dinner with friends' }],
 ]
 const theirs: Interval[][] = [
  [{ start: '08:00', end: '13:00', label: 'Work' }, { start: '18:00', end: '19:30', label: 'Dinner' }],
  [{ start: '08:00', end: '13:00', label: 'Work' }],
  [{ start: '08:00', end: '13:00', label: 'Work' }, { start: '17:00', end: '18:30', label: 'Temple' }],
  [{ start: '08:00', end: '13:00', label: 'Work' }, { start: '18:00', end: '19:00', label: 'Dinner' }],
  [{ start: '08:00', end: '13:00', label: 'Work' }],
  [{ start: '10:00', end: '12:00', label: 'Market' }],
  [{ start: '12:00', end: '15:00', label: 'Family lunch' }],
 ]
 return {
  version: 4, name: 'Maya', people: seedPeople.map(p => ({ ...p })),
  sharing: false, momConsent: false, sharingSetupDone: false, calendar: null,
  schedules: Object.fromEntries(week.map((key, i) => [key, { you: yours[i], mom: theirs[i] }])),
  weather: 'bright', milestone: { title: 'Midterms', date: localDay(milestone) },
  messages: Object.fromEntries(seedPeople.map(p => [p.id, [{ id: `hello-${p.id}`, text: p.note ?? 'Thinking of you.', mine: false, at: new Date(now.getTime() - 3600000).toISOString() }]])),
  read: [], drafts: {}, moments, cues: [], notes, games: {}, snaps, pacts: [], snapWindows: {},
  settings: { cuesEnabled: true, walkingMinutes: 10, sessionMinutes: 20, dailyCap: 2, cooldownMinutes: 120, sound: 'chime', reducedMotion: false, theme: 'system' },
 }
}

export function parseState(raw: string): HarborState | null {
 try {
  const s = JSON.parse(raw) as HarborState
  if (s.version !== 4 || typeof s.name !== 'string' || typeof s.sharing !== 'boolean' || typeof s.momConsent !== 'boolean' || typeof s.sharingSetupDone !== 'boolean') return null
  if (!s.settings || !s.schedules || !s.milestone || !s.messages || !s.drafts) return null
  if (s.calendar !== null && !(s.calendar && calendarProviders.some(c => c.id === s.calendar!.provider))) return null
  if (!Array.isArray(s.people) || !s.people.length || !s.people.every(p => p && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.initials === 'string' && ['green', 'gold', 'orange', 'sky'].includes(p.tone))) return null
  if (!weathers.some(w => w.id === s.weather) || typeof s.milestone.title !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.milestone.date)) return null
  if (!Object.values(s.schedules).every(v => v && validIntervals(v.you) && validIntervals(v.mom))) return null
  if (!Object.values(s.messages).every(ms => Array.isArray(ms) && ms.every(m => typeof m.text === 'string' && typeof m.mine === 'boolean' && typeof m.id === 'string'))) return null
  if (!Array.isArray(s.moments) || !s.moments.every(m => m && typeof m.id === 'string' && typeof m.text === 'string' && typeof m.person === 'string' && Number.isFinite(Date.parse(m.at)) && ['called', 'reacted', 'proposed_later', 'message', 'dismissed', 'played'].includes(m.kind) && (m.flower === undefined || flowerLibrary.some(f => f.id === m.flower)))) return null
  if (!Array.isArray(s.notes) || !s.notes.every(n => n && typeof n.id === 'string' && typeof n.person === 'string' && typeof n.text === 'string' && Number.isFinite(Date.parse(n.at)))) return null
  if (!Array.isArray(s.snaps) || !s.snaps.every(x => x && typeof x.id === 'string' && typeof x.person === 'string' && Number.isFinite(Date.parse(x.at)))) return null
  if (!Array.isArray(s.pacts) || !s.pacts.every(p => p && typeof p.personId === 'string' && ['invited', 'active'].includes(p.status))) return null
  if (!s.snapWindows || typeof s.snapWindows !== 'object' || Array.isArray(s.snapWindows) || !Object.values(s.snapWindows).every(v => typeof v === 'string')) return null
  if (!s.games || typeof s.games !== 'object' || Array.isArray(s.games) || !Object.entries(s.games).every(([k, v]) => typeof k === 'string' && typeof v === 'string')) return null
  if (!Array.isArray(s.cues) || !s.cues.every(c => c && typeof c.id === 'string' && Number.isFinite(Date.parse(c.at)))) return null
  if (!Array.isArray(s.read) || !s.read.every(d => typeof d === 'string')) return null
  const v = s.settings
  if (typeof v.cuesEnabled !== 'boolean' || typeof v.reducedMotion !== 'boolean' || !['chime', 'soft', 'silent'].includes(v.sound)) return null
  /* Saved before the theme existed: carry it forward rather than throwing the demo away. */
  if (!['system', 'light', 'dark'].includes(v.theme)) v.theme = 'system'
  if (![v.walkingMinutes, v.sessionMinutes, v.dailyCap, v.cooldownMinutes].every(n => Number.isFinite(n) && n >= 1) || v.dailyCap > 10) return null
  return s
 } catch { return null }
}
