'use client'
import { Camera, Sparkles } from 'lucide-react'
import { useHarbor } from '@/lib/harbor/store'
import { activePacts } from '@/lib/harbor/model'

/** The daily window, once two people have agreed to it: a random moment, a short fuse,
    and no expectation that the picture is any good. */
export function SnapPrompt({ onTake, onSkip }: { onTake: () => void; onSkip: () => void }) {
 const { state } = useHarbor()
 if (!state) return null
 const withWhom = activePacts(state).map(p => state.people.find(x => x.id === p.personId)?.name).filter(Boolean).join(' and ')
 return <div className="curtain" role="dialog" aria-modal="true" aria-label="Time for an instant">
  <div className="curtain-sheet">
   <span className="halo"><span className="path-icon" style={{ width: 68, height: 68, borderRadius: '50%' }}><Sparkles aria-hidden="true"/></span></span>
   <h1 className="curtain-title">It&rsquo;s time.</h1>
   <p className="curtain-sub">Whatever you&rsquo;re doing right now — that&rsquo;s the one. {withWhom || 'Your people'} got the same nudge at the same moment.</p>
   <button type="button" className="btn btn-block" onClick={onTake}><Camera aria-hidden="true"/>Take It</button>
   <button type="button" className="btn btn-quiet" onClick={onSkip}>skip today</button>
  </div>
 </div>
}
