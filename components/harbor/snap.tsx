'use client'
import { useEffect, useRef, useState } from 'react'
import { BookHeart, Camera, Check, ImageUp, RotateCcw, ShieldCheck, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { makeId, useHarbor } from '@/lib/harbor/store'
import { saveMedia } from '@/lib/harbor/media'
import { activePacts, type Snap } from '@/lib/harbor/model'
import { Avatar } from './avatar'
import { LocalPhoto } from './media-view'

export type SnapOrigin = { x: number; y: number; scale: number }
export type SnapIntent = { view: 'capture' | 'scrapbook'; promptDay?: string; origin?: SnapOrigin }

/** Pull the expand-from-here numbers off whatever was tapped, so the sheet grows out of it. */
export function originOf(element: Element | null): SnapOrigin | undefined {
 if (!element) return undefined
 const rect = element.getBoundingClientRect()
 return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, scale: Math.max(0.12, rect.width / Math.max(window.innerWidth, 1)) }
}

function SnapPlaceholder({ snap, small = false }: { snap: Snap; small?: boolean }) {
 const { state } = useHarbor()
 const tone = state?.people.find(p => p.id === snap.person)?.tone ?? 'green'
 return <span className="snap-placeholder" data-tone={tone}>{!small && <span>{snap.caption ?? 'a moment'}</span>}</span>
}

function SnapFace({ snap }: { snap: Snap }) {
 return snap.mediaId ? <LocalPhoto id={snap.mediaId} className="snap-fill"/> : <SnapPlaceholder snap={snap}/>
}

/** The daily window, once two people have agreed to it: a random moment, a short fuse, no retakes expected. */
export function SnapPrompt({ onTake, onSkip }: { onTake: () => void; onSkip: () => void }) {
 const { state } = useHarbor()
 if (!state) return null
 const withWhom = activePacts(state).map(p => state.people.find(x => x.id === p.personId)?.name).filter(Boolean).join(' and ')
 return <div className="curtain" style={{ zIndex: 68 }} role="dialog" aria-modal="true" aria-label="Time for a snap">
  <div className="curtain-sheet">
   <span className="halo"><span className="path-icon" style={{ width: 72, height: 72, borderRadius: '50%' }}><Sparkles/></span></span>
   <h1 className="curtain-title">It&apos;s time.</h1>
   <p className="curtain-sub">Whatever you&apos;re doing right now — that&apos;s the one. {withWhom} got the same nudge at the same moment.</p>
   <button type="button" className="btn btn-block" onClick={onTake}><Camera/>Take it</button>
   <button type="button" className="btn btn-quiet" onClick={onSkip}>skip today</button>
  </div>
 </div>
}

export function SnapSheet({ intent, onClose }: { intent: SnapIntent; onClose: () => void }) {
 const { state, update } = useHarbor()
 const [view, setView] = useState<'capture' | 'review' | 'scrapbook'>(intent.view === 'scrapbook' ? 'scrapbook' : 'capture')
 const [tab, setTab] = useState<'instants' | 'saved'>('instants')
 const [shot, setShot] = useState<{ url: string; blob: Blob } | null>(null)
 const [caption, setCaption] = useState('')
 const [keep, setKeep] = useState(false)
 const [cameraError, setCameraError] = useState(false)
 const [busy, setBusy] = useState(false)
 const [viewing, setViewing] = useState<Snap | null>(null)
 const video = useRef<HTMLVideoElement>(null)
 const streamRef = useRef<MediaStream | null>(null)

 useEffect(() => {
  if (view !== 'capture') return
  let live = true
  navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' }, audio: false })
   .then(stream => {
    if (!live) { stream.getTracks().forEach(t => t.stop()); return }
    streamRef.current = stream
    if (video.current) { video.current.srcObject = stream; void video.current.play().catch(() => {}) }
   })
   .catch(() => setCameraError(true))
  if (!navigator.mediaDevices) setCameraError(true)
  return () => { live = false; streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null }
 }, [view])
 useEffect(() => () => { if (shot) URL.revokeObjectURL(shot.url) }, [shot])

 if (!state) return null

 const useBlob = (blob: Blob) => { setShot({ blob, url: URL.createObjectURL(blob) }); setView('review') }
 const shoot = async () => {
  const element = video.current
  if (!element || !element.videoWidth) { toast.error('The camera is not ready yet.'); return }
  const side = Math.min(element.videoWidth, element.videoHeight)
  const canvas = document.createElement('canvas'); canvas.width = 720; canvas.height = 720
  const ctx = canvas.getContext('2d'); if (!ctx) return
  ctx.translate(720, 0); ctx.scale(-1, 1)
  ctx.drawImage(element, (element.videoWidth - side) / 2, (element.videoHeight - side) / 2, side, side, 0, 0, 720, 720)
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.86))
  if (blob) useBlob(blob)
 }
 const pick = (file: File) => {
  if (!file.type.startsWith('image/')) { toast.error('Choose an image file.'); return }
  if (file.size > 10 * 1024 * 1024) { toast.error('Please choose a picture under 10 MB.'); return }
  useBlob(file)
 }
 const send = async () => {
  if (!shot) return
  setBusy(true)
  try {
   const mediaId = makeId()
   await saveMedia(mediaId, shot.blob)
   const at = new Date().toISOString()
   const mine: Snap = { id: makeId(), at, person: 'you', mediaId, caption: caption.trim() || undefined, saved: keep || undefined, prompted: !!intent.promptDay, promptDay: intent.promptDay }
   /* When a window is answered, the people on the other side of the pact answer it too. */
   const theirs: Snap[] = intent.promptDay
    ? activePacts(state).map(pact => ({ id: makeId(), at: new Date(Date.now() + 1000).toISOString(), person: pact.personId, caption: 'theirs, same moment', prompted: true, promptDay: intent.promptDay, simulated: true }))
    : []
   update(s => ({ ...s, snaps: [...s.snaps, mine, ...theirs] }))
   toast.success(intent.promptDay ? 'Caught it. Theirs is in too.' : 'Sent. It fades unless someone keeps it.')
   setCaption(''); setKeep(false); setShot(null); setView('scrapbook')
  } catch { toast.error('Your browser could not save this picture.') }
  finally { setBusy(false) }
 }
 const toggleSaved = (snap: Snap) => {
  update(s => ({ ...s, snaps: s.snaps.map(x => x.id === snap.id ? { ...x, saved: !x.saved } : x) }))
  setViewing(v => v && v.id === snap.id ? { ...v, saved: !v.saved } : v)
 }

 const all = state.snaps.slice().sort((a, b) => b.at.localeCompare(a.at))
 const shown = tab === 'saved' ? all.filter(s => s.saved) : all
 const style = intent.origin ? { ['--ox' as string]: `${intent.origin.x}px`, ['--oy' as string]: `${intent.origin.y}px`, ['--s0' as string]: intent.origin.scale } : undefined

 return <div className="snap-screen" style={style} role="dialog" aria-modal="true" aria-label="Instants">
  <div className="snap-bar">
   <button type="button" className="snap-icon" aria-label="Close" onClick={onClose}><X/></button>
   <span className="snap-bar-title">{view === 'scrapbook' ? 'Instants' : intent.promptDay ? 'Your window' : 'Snap'}</span>
   <button type="button" className="snap-icon" aria-label={view === 'scrapbook' ? 'Take a snap' : 'Open the scrapbook'} onClick={() => setView(view === 'scrapbook' ? 'capture' : 'scrapbook')}>
    {view === 'scrapbook' ? <Camera/> : <BookHeart/>}
   </button>
  </div>

  {view === 'capture' && <div className="snap-stage">
   <div className="snap-lens">
    {cameraError
     ? <label className="snap-fallback">
      <ImageUp/>
      <span className="font-serif text-xl">No camera here.</span>
      <span className="small-copy">Choose a picture instead — it works the same way.</span>
      <input type="file" accept="image/*" className="sr-only" onChange={e => { const file = e.target.files?.[0]; if (file) pick(file) }}/>
     </label>
     : <video ref={video} className="snap-video" playsInline muted autoPlay/>}
   </div>
   {!cameraError && <button type="button" className="snap-shutter" aria-label="Take the snap" onClick={shoot}><span/></button>}
   <p className="snap-foot">{intent.promptDay ? 'One picture of right now. No staging, no retakes expected.' : 'One picture, sent as it is. It fades unless someone keeps it.'}</p>
  </div>}

  {view === 'review' && shot && <div className="snap-stage">
   <div className="snap-lens"><img src={shot.url} alt="The snap you just took" className="snap-fill"/></div>
   <div className="snap-review">
    <div><label className="field-label" htmlFor="snap-caption">A line, if you want one</label><input className="input" id="snap-caption" maxLength={80} placeholder="no reason" value={caption} onChange={e => setCaption(e.target.value)}/></div>
    <button type="button" className="snap-keep" aria-pressed={keep} onClick={() => setKeep(k => !k)}><BookHeart/><span className="line-body"><b>Keep it in the scrapbook</b><span>Otherwise it just fades.</span></span><span className="snap-keep-box">{keep && <Check/>}</span></button>
    <button type="button" className="btn btn-block" disabled={busy} onClick={send}>{busy ? 'Sending…' : `Send to ${state.people.length === 1 ? state.people[0].name : 'your people'}`}</button>
    <button type="button" className="btn btn-quiet btn-block" onClick={() => { setShot(null); setView('capture') }}><RotateCcw/>Take another</button>
   </div>
  </div>}

  {view === 'scrapbook' && <div className="snap-book">
   <div className="snap-tabs" role="tablist">
    <button type="button" role="tab" aria-selected={tab === 'instants'} onClick={() => setTab('instants')}>Everything</button>
    <button type="button" role="tab" aria-selected={tab === 'saved'} onClick={() => setTab('saved')}>Scrapbook</button>
   </div>
   {shown.length
    ? <div className="snap-grid">{shown.map(snap => <button key={snap.id} type="button" className="snap-cell" onClick={() => setViewing(snap)}>
     <SnapFace snap={snap}/>
     <span className="snap-cell-face"><Avatar person={snap.person} size="xs"/></span>
     {snap.saved && <span className="snap-cell-kept"><BookHeart/></span>}
     {snap.prompted && <span className="snap-cell-tag">window</span>}
    </button>)}</div>
    : <p className="empty-line">{tab === 'saved' ? 'Nothing kept yet. Open an instant and keep the ones worth keeping.' : 'No instants yet. The camera is one tap away.'}</p>}
   <p className="snap-foot">{tab === 'saved' ? 'Kept on purpose. These stay until you remove them.' : 'Instants fade on their own. Keep the ones you want to hold on to.'}</p>
  </div>}

  {viewing && <div className="snap-viewer" role="dialog" aria-modal="true" aria-label="Instant">
   <button type="button" className="snap-icon snap-viewer-close" aria-label="Close" onClick={() => setViewing(null)}><X/></button>
   <div className="snap-viewer-frame"><SnapFace snap={viewing}/></div>
   <div className="snap-viewer-meta">
    <Avatar person={viewing.person} size="sm"/>
    <span className="flex-1 min-w-0">
     <span className="text-sm font-medium block">{viewing.person === 'you' ? 'You' : state.people.find(p => p.id === viewing.person)?.name ?? 'Family'}</span>
     <span className="small-copy">{new Date(viewing.at).toLocaleString('en', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
    </span>
   </div>
   {viewing.caption && <p style={{ fontFamily: 'var(--font-round), sans-serif', fontSize: 19, fontWeight: 700, color: '#FFFDF8', textAlign: 'center', padding: '0 24px' }}>{viewing.caption}</p>}
   <button type="button" className={viewing.saved ? 'btn' : 'btn btn-soft'} onClick={() => toggleSaved(viewing)}><BookHeart/>{viewing.saved ? 'Kept in your scrapbook' : 'Keep this one'}</button>
   {viewing.simulated && <p className="notice" style={{ color: 'rgba(255,253,248,.7)', justifyContent: 'center' }}><ShieldCheck/>Sample instant from the demo family.</p>}
  </div>}
 </div>
}
