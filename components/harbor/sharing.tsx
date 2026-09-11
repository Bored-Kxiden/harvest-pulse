'use client'
import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useHarbor } from '@/lib/harbor/store'

/** Share my load is set up once, in two steps: your yes, then theirs. After that it is a plain toggle. */
export function useSharing() {
 const { state, update } = useHarbor()
 const [step, setStep] = useState<'closed' | 'mine' | 'mutual'>('closed')
 const open = () => setStep('mine')
 const toggle = () => {
  if (!state) return
  if (!state.sharingSetupDone) { setStep('mine'); return }
  update(s => ({ ...s, sharing: !s.sharing }))
 }
 return { step, setStep, open, toggle, sharing: !!state?.sharing }
}

export function SharingSetup({ step, setStep }: { step: 'closed' | 'mine' | 'mutual'; setStep: (value: 'closed' | 'mine' | 'mutual') => void }) {
 const { state, update } = useHarbor()
 if (!state) return null
 const partner = state.people[0]

 return <>
  <Dialog open={step === 'mine'} onOpenChange={value => !value && setStep('closed')}><DialogContent>
   <DialogHeader>
    <DialogTitle>A little more understanding.</DialogTitle>
    <DialogDescription>Share your free and busy rhythm with {partner?.name ?? 'them'}, only when you both agree. What you are actually doing — the labels on your blocks — never leaves your own view.</DialogDescription>
   </DialogHeader>
   <p className="notice"><ShieldCheck/>Switch sharing off anytime. Your private schedule stays saved. This demo does not send data anywhere.</p>
   <button type="button" className="btn btn-block" onClick={() => { update(s => ({ ...s, sharing: true })); setStep('mutual') }}>I agree to share my availability</button>
   <button type="button" className="btn btn-quiet btn-block" onClick={() => setStep('closed')}>Not now</button>
  </DialogContent></Dialog>

  <Dialog open={step === 'mutual'} onOpenChange={value => { if (!value) { update(s => ({ ...s, sharingSetupDone: true })); setStep('closed') } }}><DialogContent>
   <DialogHeader>
    <DialogTitle>Ask {partner?.name ?? 'them'}, too?</DialogTitle>
    <DialogDescription>Mutual sharing only works once they agree on their side. This demo lets you simulate that yes — you can flip it on or off anytime from the toggles.</DialogDescription>
   </DialogHeader>
   <p className="notice"><ShieldCheck/>Nothing here is sent to a real person.</p>
   <button type="button" className="btn btn-block" onClick={() => { update(s => ({ ...s, momConsent: true, sharingSetupDone: true })); setStep('closed') }}>Simulate their yes</button>
   <button type="button" className="btn btn-quiet btn-block" onClick={() => { update(s => ({ ...s, sharingSetupDone: true })); setStep('closed') }}>Maybe later</button>
  </DialogContent></Dialog>
 </>
}
