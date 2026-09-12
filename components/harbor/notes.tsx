'use client'
import { useState } from 'react'
import { BookHeart, Camera, ChevronRight, MessageCircle, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useHarbor } from '@/lib/harbor/store'
import type { Snap } from '@/lib/harbor/model'
import { Avatar } from './avatar'
import { LocalPhoto } from './media-view'
import { Sprig } from './sprigs'

/** Everything anyone left lately, and the pictures somebody chose to keep.
    Two views of the same shoebox: the lines, and the photographs. */
export function NotesScreen({ navigate, onOpenCamera, onOpenStory }: {
 navigate: (page: string) => void; onOpenCamera: () => void; onOpenStory: () => void
}) {
 const { state, update } = useHarbor()
 const [view, setView] = useState<'notes' | 'scrapbook'>('notes')
 if (!state) return null

 const notes = state.notes.slice().sort((a, b) => b.at.localeCompare(a.at))
 const kept = state.snaps.filter(s => s.saved).sort((a, b) => b.at.localeCompare(a.at))
 const loose = state.snaps.filter(s => !s.saved).sort((a, b) => b.at.localeCompare(a.at))

 const keep = (snap: Snap) => {
  update(s => ({ ...s, snaps: s.snaps.map(x => x.id === snap.id ? { ...x, saved: !x.saved } : x) }))
  toast.success(snap.saved ? 'Let it fade.' : 'Kept in your scrapbook.')
 }

 return <div className="entrance">
  <div className="page-head">
   <span className="eyebrow">{view === 'notes' ? 'A little something' : 'Scrapbook'}</span>
   <h1>{view === 'notes' ? 'Lines from home.' : 'Moments, saved.'}</h1>
   <p>{view === 'notes' ? 'Small things, said out loud. Nobody owes a reply.' : 'Little memories, big feelings.'}</p>
  </div>

  <div className="wrap flow stagger">
   <div className="tool-row" role="tablist" aria-label="What to look at" style={{ ['--i' as string]: 0, padding: 5, gap: 3 }}>
    {(['notes', 'scrapbook'] as const).map(id => <button key={id} type="button" role="tab" aria-selected={view === id}
     className="chip-choice" aria-pressed={view === id} style={{ flex: 1, justifyContent: 'center', display: 'flex' }}
     onClick={() => setView(id)}>{id === 'notes' ? 'Notes' : 'Scrapbook'}</button>)}
   </div>

   {view === 'notes' ? <>
    {notes.length ? notes.map((note, i) => {
     const who = note.person === 'you' ? null : state.people.find(p => p.id === note.person)
     return <article key={note.id} className="card card-pad" style={{ ['--i' as string]: i + 1 }}>
      <Sprig kind={i % 2 ? 'cosmos' : 'leaf'} className="person-sprig" style={{ width: 54, bottom: 2 }}/>
      <div className="row" style={{ boxShadow: 'none', background: 'transparent', padding: 0 }}>
       <Avatar person={note.person} size="sm"/>
       <span className="row-body">
        <b>{who?.name ?? 'You'}</b>
        <span>{new Date(note.at).toLocaleString(undefined, { weekday: 'long', hour: 'numeric', minute: '2-digit' })}</span>
       </span>
      </div>
      <p style={{ fontFamily: 'var(--font-script), cursive', fontSize: 23, lineHeight: 1.25, color: 'var(--ink-deep)', margin: '10px 2px 0', position: 'relative', zIndex: 1 }}>{note.text}</p>
      {who && <button type="button" className="text-link" onClick={() => navigate(`chat/${who.id}`)}>
       <MessageCircle aria-hidden="true"/>Say something back
      </button>}
     </article>
    }) : <p className="empty">Nothing left lately. The quiet is allowed.</p>}
    <button type="button" className="row" style={{ ['--i' as string]: notes.length + 1 }} onClick={onOpenStory}>
     <span className="row-icon" style={{ background: 'var(--tint-blue)' }}><BookHeart aria-hidden="true"/></span>
     <span className="row-body"><b>Today&rsquo;s instants</b><span>{state.snaps.length} picture{state.snaps.length === 1 ? '' : 's'} from your people</span></span>
     <ChevronRight className="caret" aria-hidden="true"/>
    </button>
   </> : <>
    {kept.length || loose.length ? <div className="scrap" style={{ ['--i' as string]: 1 }}>
     {[...kept, ...loose].map(snap => {
      const who = state.people.find(p => p.id === snap.person)
      return <button key={snap.id} type="button" className="polaroid" onClick={() => keep(snap)}
       aria-label={`${snap.caption ?? 'An instant'} from ${who?.name ?? 'you'}. ${snap.saved ? 'Kept. Tap to let it fade.' : 'Tap to keep it.'}`}>
       <span className="polaroid-tape" aria-hidden="true"/>
       <span className={`polaroid-shot tint-${who?.tone ?? 'green'}`}>
        {snap.mediaId ? <LocalPhoto id={snap.mediaId}/> : <Sprig kind="cosmos" style={{ width: 54 }}/>}
       </span>
       <span className="polaroid-date">{new Date(snap.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
       <span className="polaroid-note">{snap.caption ?? 'no reason'}</span>
      </button>
     })}
     <p className="scrap-note">Collect moments,<br/>not things.</p>
    </div> : <p className="empty">Nothing kept yet. The camera is one tap away.</p>}
   </>}

   <p className="fineprint" style={{ ['--i' as string]: 9 }}>Instants fade on their own. Tap one to keep it.</p>
  </div>

  <button type="button" className="fab" aria-label="Take an instant" onClick={onOpenCamera}>
   {view === 'scrapbook' ? <Plus aria-hidden="true"/> : <Camera aria-hidden="true"/>}
  </button>
 </div>
}
