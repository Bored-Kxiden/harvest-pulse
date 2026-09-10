export type Resolution = 'called' | 'reacted' | 'proposed_later' | 'message' | 'dismissed' | 'played'
export type Moment = { id: string; at: string; person: string; kind: Resolution; text: string; source: 'manual' | 'walking_stop' | 'dispatch' | 'signal' | 'game'; proposedTime?: string; feedback?: 'good' | 'bad'; reminderDone?: boolean; cueId?: string }
export type ChatMessage = { id: string; text: string; mine: boolean; at: string; liked?: boolean }
export type Interval = { start: string; end: string }
export type Dispatch = { id: string; title: string; body: string; topic: string; kind: 'headline' | 'photo' | 'audio'; status: 'draft' | 'rendered' | 'queued' | 'delivered' | 'logged'; due?: string; mediaId?: string }
export type SignalKind = 'photo' | 'watching' | 'meal' | 'recap'
export type Signal = { id: string; at: string; person: string; kind: SignalKind; mediaId?: string; caption?: string; title?: string; note?: string; meal?: 'about_to_eat' | 'just_ate'; recapInput?: string; recapText?: string }
export type HarborState = {
 version: 1; name: string; sharing: boolean; momConsent: boolean; sharingSetupDone: boolean;
 schedules: Record<string, { you: Interval[]; mom: Interval[] }>;
 season: 'Quiet' | 'Steady' | 'Full'; milestone: { title: string; date: string };
 messages: Record<string, ChatMessage[]>; read: string[]; drafts: Record<string,string>;
 moments: Moment[]; jarDays: string[]; cues: { id: string; at: string }[];
 dispatches: Dispatch[]; signals: Signal[]; games: Record<string, string>;
 settings: { cuesEnabled: boolean; walkingMinutes: number; sessionMinutes: number; dailyCap: number; cooldownMinutes: number; minimum: 'any' | 'call' | null; sound: 'chime' | 'soft' | 'silent'; reducedMotion: boolean };
}
export const people = [
 { id: 'mom', name: 'Mom', initials: 'M', style: 'gold', note: 'Made your favorite today. Guess what it is?', time: 'A little while ago' },
 { id: 'dad', name: 'Dad', initials: 'D', style: '', note: 'The tomatoes are finally growing!', time: 'This morning' },
 { id: 'aanya', name: 'Aanya', initials: 'A', style: 'outline', note: 'Saving this story for our next call.', time: 'Yesterday' },
 { id: 'family', name: 'Our little tribe', initials: '', style: 'gold', note: 'Sunday chai, same time?', time: 'Yesterday' },
]
export function localDay(date: Date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` }
export function minutes(value: string) { const [h,m] = value.split(':').map(Number); return h*60+m }
export function validIntervals(values: Interval[]) {
 if (!Array.isArray(values) || values.length>12) return false
 return values.every(v => v && /^([01]\d|2[0-3]):[0-5]\d$/.test(v.start) && /^([01]\d|2[0-3]):[0-5]\d$/.test(v.end) && minutes(v.start)<minutes(v.end))
}
export function overlaps(a: Interval[], b: Interval[]): Interval[] {
 const raw = a.flatMap(x => b.flatMap(y => {
  const start = x.start > y.start ? x.start : y.start; const end = x.end < y.end ? x.end : y.end
  return start < end ? [{ start, end }] : []
 })).sort((x,y)=>x.start.localeCompare(y.start))
 return raw.reduce<Interval[]>((out, value) => { const last=out.at(-1); if(last && value.start<=last.end) last.end=last.end>value.end?last.end:value.end; else out.push({...value}); return out },[])
}
export function formatTime(value: string) { const m=minutes(value); return `${Math.floor(m/60)%12||12}:${String(m%60).padStart(2,'0')} ${m>=720?'pm':'am'}` }
export function sharedWindows(state: HarborState, day: string) { const s=state.schedules[day]; return state.sharing && state.momConsent && s ? overlaps(s.you,s.mom) : [] }
export function isFuture(value: string, now = new Date()) { const t=new Date(value).getTime(); return Number.isFinite(t) && t>now.getTime() }

/* ---------- daily family game: no streaks, no backend — a stable prompt per day with pre-written family answers ---------- */
export type GamePrompt = { q: string; mom: string; dad: string }
export const gamePrompts: GamePrompt[] = [
 { q:'Tea, coffee, or neither today?', mom:'Chai, obviously. Extra ginger today.', dad:'Black coffee. The tomatoes needed watering early.' },
 { q:'Window seat or aisle?', mom:'Window. I like watching the world go by.', dad:'Aisle. More room for my knees.' },
 { q:'One good thing about today, however small?', mom:'The jasmine finally opened.', dad:'Found my old radio in the garage. Still works.' },
 { q:'Sweet or savory breakfast?', mom:'Sweet. Always sweet.', dad:'Savory, every time.' },
 { q:'Beach or mountains?', mom:'Mountains. Somewhere quiet.', dad:'Beach. I like the noise, actually.' },
 { q:'If today had a theme song, what would it be?', mom:'Something old, from a film we watched together once.', dad:'Whatever was on the radio in the car.' },
 { q:'Early bird or night owl, honestly?', mom:'Early bird. Mornings feel like mine.', dad:'Night owl, but I pretend otherwise.' },
 { q:'What smell reminds you of home right now?', mom:'Whatever is simmering on the stove.', dad:'Fresh-cut grass, if I am honest.' },
 { q:'Rain or sunshine today?', mom:'A little rain. Good for the garden.', dad:'Sunshine. Always rooting for sunshine.' },
 { q:'One word for how today felt?', mom:'Full.', dad:'Steady.' },
 { q:'Cat person, dog person, or neither?', mom:'Dog person, no contest.', dad:'Whichever one leaves me alone the longest.' },
 { q:'One small thing you are looking forward to?', mom:'Hearing about your day, actually.', dad:'The weekend. No particular reason.' },
]
export function gameForDay(day: string): GamePrompt { let h=0; for(const c of day) h=(h*31+c.charCodeAt(0))>>>0; return gamePrompts[h%gamePrompts.length] }

/* ---------- exaggerated daily recap: a deliberately over-the-top reframe, generated client-side, no AI call ---------- */
const recapOpeners=['BREAKING NEWS FROM THE HOME FRONT:','BULLETIN, HOT OFF THE PRESS:','STOP THE PRESSES:','BY POPULAR DEMAND, TODAY’S HEADLINES:','THIS JUST IN:']
const recapClosers=['Witnesses describe the day as "surprisingly eventful."','Experts are calling it a triumph of the ordinary.','More updates as this developing story continues.','A day for the history books, some say.','Sources close to the story call it "just another day" — we respectfully disagree.']
function seededPick<T>(arr: T[], seed: string) { let h=0; for(const c of seed) h=(h*31+c.charCodeAt(0))>>>0; return arr[h%arr.length] }
export function exaggerateRecap(input: string): string {
 const lines=input.split(/\n|\.(?=\s|$)/).map(s=>s.trim()).filter(Boolean).slice(0,3)
 if(!lines.length) return ''
 const opener=seededPick(recapOpeners,input); const closer=seededPick(recapClosers,input+'x')
 const body=lines.map((l,i)=>i===0?l.charAt(0).toUpperCase()+l.slice(1)+'.':`And if that were not enough: ${l.charAt(0).toLowerCase()+l.slice(1)}.`).join(' ')
 return `${opener} ${body} ${closer}`
}

/* ---------- lighthouse beacon: warms gently with time since the last connection, settles after a call — never a guilt clock ---------- */
export type BeaconLevel = 0 | 1 | 2 | 3 | 4
const beaconLabels=['Just settled, warm and glowing.','Still holding on to today’s glow.','A little warmer, whenever you’re ready.','Glowing a bit brighter now — no rush at all.','Glowing bright, patiently waiting.']
export function beaconWarmth(state: HarborState, now = new Date()) {
 const last=state.moments.filter(m=>m.kind!=='dismissed').slice().sort((a,b)=>a.at.localeCompare(b.at)).at(-1)
 if(!last) return { level:4 as BeaconLevel, label:'Waiting for your first little moment.', settled:false, hours:Infinity }
 const hours=(now.getTime()-new Date(last.at).getTime())/3600000
 const level:BeaconLevel = hours<6?0:hours<24?1:hours<72?2:hours<168?3:4
 return { level, label:beaconLabels[level], settled:last.kind==='called'&&hours<6, hours }
}

export function addMoment(state: HarborState, moment: Moment): HarborState {
 if(state.moments.some(x=>x.id===moment.id)) return state
 const qualifies=state.settings.minimum==='any' ? moment.kind!=='dismissed' : state.settings.minimum==='call' && moment.kind==='called'
 const day=localDay(new Date(moment.at))
 return {...state,moments:[...state.moments,moment],jarDays:qualifies && !state.jarDays.includes(day)?[...state.jarDays,day]:state.jarDays}
}
export function cueEligibility(state: HarborState, walked: number, stopped: boolean, now = new Date()) {
 if(!state.settings.cuesEnabled) return 'Cues are off. You can turn them on in Settings when you feel ready.'
 if(!stopped) return 'Still walking. A cue waits until you have fully stopped.'
 if(!Number.isFinite(walked) || walked<state.settings.walkingMinutes) return `Below your ${state.settings.walkingMinutes}-minute walking threshold.`
 const today=localDay(now)
 if(state.moments.some(m=>localDay(new Date(m.at))===today && ['called','reacted','message'].includes(m.kind))) return 'You already connected today. Enjoy the quiet.'
 if(state.moments.some(m=>m.kind==='proposed_later' && !m.reminderDone)) return 'You already have a gentle reminder planned.'
 const cues=state.cues.filter(c=>localDay(new Date(c.at))===today)
 if(cues.length>=state.settings.dailyCap) return 'Your daily cue limit is reached. No more nudges today.'
 const last=state.cues.at(-1)
 if(last && now.getTime()-new Date(last.at).getTime()<state.settings.cooldownMinutes*60000) return 'Taking a little breathing room. Your cooldown is still active.'
 return null
}
export function seedState(now = new Date()): HarborState {
 const today=localDay(now); const milestone=new Date(now); milestone.setDate(milestone.getDate()+21)
 const moments: Moment[] = [
  ['called','mom','A long chat about absolutely nothing.'], ['reacted','dad','The first tomatoes in Dad’s garden.'], ['message','aanya','A little encouragement before her presentation.'], ['called','family','Sunday chai, together from afar.'], ['reacted','mom','Her new recipe, made with love.'],
 ].map((a,i)=>{ const at=new Date(now); at.setDate(at.getDate()-i-1); return {id:`seed-${i}`,at:at.toISOString(),kind:a[0] as Resolution,person:a[1],text:a[2],source:'manual'} })
 moments.push(...(['called','reacted','message'] as Resolution[]).map((kind,i)=>({id:`march-${i}`,at:new Date(now.getFullYear(),2,12+i,17).toISOString(),person:'mom',kind,text:['A recipe passed down over the phone.','A little love, just because.','A photo of spring back home.'][i],source:'manual' as const})))
 const signals: Signal[] = [
  {id:'seed-meal',at:new Date(now.getTime()-3600000).toISOString(),person:'mom',kind:'meal',meal:'just_ate',note:'Made a little extra of your favorite, out of habit.'},
  {id:'seed-watch',at:new Date(now.getTime()-86400000+3600000*3).toISOString(),person:'dad',kind:'watching',title:'A documentary about the Amazon',note:'Made me think of your old school project.'},
 ]
 return {version:1,name:'Maya',sharing:false,momConsent:false,sharingSetupDone:false,schedules:{[today]:{you:[{start:'20:40',end:'22:00'}],mom:[{start:'20:00',end:'21:30'}]}},season:'Full',milestone:{title:'Midterms',date:localDay(milestone)},messages:Object.fromEntries(people.map(p=>[p.id,[{id:`hello-${p.id}`,text:p.note,mine:false,at:new Date(now.getTime()-3600000).toISOString()}]])),read:[],drafts:{},moments,jarDays:[],cues:[],dispatches:[{id:'from-mom',title:'A little taste of home.',body:'The kitchen smelled like your favorite dal today. I made a little extra out of habit. Some things don’t change, even when you’re miles away.\n\nThe balcony jasmine is blooming, too. Thought you’d like to know.',topic:'Just a little catch-up. No college talk today.',kind:'headline',status:'delivered'}],signals,games:{},settings:{cuesEnabled:false,walkingMinutes:10,sessionMinutes:20,dailyCap:2,cooldownMinutes:120,minimum:null,sound:'chime',reducedMotion:false}}
}
export function parseState(raw: string): HarborState | null {
 try {
  const s=JSON.parse(raw) as HarborState
  if(s.version!==1 || typeof s.name!=='string' || typeof s.sharing!=='boolean' || typeof s.momConsent!=='boolean' || typeof s.sharingSetupDone!=='boolean' || !s.settings || !s.schedules || !s.milestone || !s.messages || !s.drafts) return null
  if(!['Quiet','Steady','Full'].includes(s.season) || typeof s.milestone.title!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.milestone.date)) return null
  if(!Object.values(s.schedules).every(v=>v && validIntervals(v.you)&&validIntervals(v.mom))) return null
  if(!Object.values(s.messages).every(ms=>Array.isArray(ms)&&ms.every(m=>typeof m.text==='string'&&typeof m.mine==='boolean'&&typeof m.id==='string'))) return null
  if(!Array.isArray(s.moments)||!s.moments.every(m=>m && typeof m.id==='string' && typeof m.text==='string' && typeof m.person==='string' && Number.isFinite(Date.parse(m.at)) && ['called','reacted','proposed_later','message','dismissed','played'].includes(m.kind))) return null
  if(!Array.isArray(s.dispatches)||!s.dispatches.every(d=>d&&typeof d.id==='string'&&typeof d.title==='string'&&typeof d.body==='string'&&typeof d.topic==='string'&&['draft','rendered','queued','delivered','logged'].includes(d.status))) return null
  if(!Array.isArray(s.signals)||!s.signals.every(x=>x&&typeof x.id==='string'&&typeof x.person==='string'&&Number.isFinite(Date.parse(x.at))&&['photo','watching','meal','recap'].includes(x.kind))) return null
  if(!s.games||typeof s.games!=='object'||Array.isArray(s.games)||!Object.entries(s.games).every(([k,v])=>typeof k==='string'&&typeof v==='string')) return null
  if(!Array.isArray(s.cues)||!s.cues.every(c=>c&&typeof c.id==='string'&&Number.isFinite(Date.parse(c.at)))) return null
  if(!Array.isArray(s.jarDays)||!s.jarDays.every(d=>typeof d==='string')||!Array.isArray(s.read)||!s.read.every(d=>typeof d==='string')) return null
  const v=s.settings
  if(!['any','call',null].includes(v.minimum) || typeof v.cuesEnabled!=='boolean' || typeof v.reducedMotion!=='boolean' || !['chime','soft','silent'].includes(v.sound)) return null
  if(![v.walkingMinutes,v.sessionMinutes,v.dailyCap,v.cooldownMinutes].every(n=>Number.isFinite(n)&&n>=1) || v.dailyCap>10) return null
  return s
 } catch { return null }
}
export function reconcile(state: HarborState, now = new Date()) {
 let changed=false
 const dispatches=state.dispatches.map(d=>{ if(d.status==='queued'&&d.due&&new Date(d.due)<=now) {changed=true;return {...d,status:'delivered' as const}} return d })
 return changed?{...state,dispatches}:state
}
