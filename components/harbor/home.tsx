'use client'
import { ChevronRight, Waves } from 'lucide-react'
import { useHarbor } from '@/lib/harbor/store'
import { callsFor, dominantFlower } from '@/lib/harbor/model'
import { Avatar } from './avatar'
import { FlowerGlyph } from './flowers'
import { GardenView } from './garden-view'
import { NotesStrip } from './notes'
import { WeatherBar } from './weather-bar'

export function Home({ navigate, bloomId }: { navigate: (page: string) => void; bloomId?: string }) {
 const { state } = useHarbor()
 if (!state) return null
 const total = state.moments.filter(m => m.kind === 'called' && m.flower).length
 return <div className="entrance">
  <div className="home-greeting">
   <div className="eyebrow">A little closer, every day</div>
   <h1 className="font-serif">Hey, {state.name}.</h1>
   <p className="small-copy">{total ? `${total} calls have grown here.` : 'Your first call plants the first flower.'}</p>
  </div>

  <div className="garden-holder">
   <GardenView weather={state.weather} bloomId={bloomId} onAddPerson={() => navigate('settings')} height={344}/>
  </div>

  <div className="page-content flow">
   <WeatherBar/>

   <section className="flex flex-col gap-3" aria-labelledby="people-heading">
    <div className="section-heading"><h2 id="people-heading">Your people</h2></div>
    <div className="chat-grid">
     {state.people.map(p => {
      const messages = state.messages[p.id] ?? []
      const lastMessage = messages.at(-1)
      const flower = dominantFlower(state, p.id)
      const calls = callsFor(state, p.id).length
      return <button key={p.id} className="chat-tile" onClick={() => navigate(`chat/${p.id}`)}>
       <div className="flex items-start justify-between w-full">
        <Avatar person={p.id}/>
        {flower ? <FlowerGlyph kind={flower} size={30} className="chat-tile-flower"/> : null}
       </div>
       <span className="chat-name">{p.name}<ChevronRight className="size-4 text-muted-foreground"/></span>
       <span className="chat-preview">{lastMessage?.mine ? 'You: ' : ''}{lastMessage?.text ?? p.note ?? 'Say hello whenever.'}</span>
       <span className="chat-time">{calls ? `${calls} ${calls === 1 ? 'flower' : 'flowers'} in their patch` : 'No calls yet'}</span>
      </button>
     })}
    </div>
   </section>

   <NotesStrip navigate={navigate}/>

   <button className="text-link justify-center" onClick={() => navigate('cue')}><Waves/> Find a quiet moment <ChevronRight/></button>
   <p className="demo-footnote">An interactive demo · saved only on this device</p>
  </div>
 </div>
}
