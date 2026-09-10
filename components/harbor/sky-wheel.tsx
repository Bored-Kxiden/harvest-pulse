'use client'
import { weatherIndex, weathers, type Weather } from '@/lib/harbor/model'

const STEP = 360 / weathers.length

function SkyEmblem({ kind }: { kind: Weather }) {
 const sun = <g className="emblem-sun">
  <g className="emblem-rays">{Array.from({ length: 8 }, (_, i) => <line key={i} x1={50} y1={17} x2={50} y2={5} transform={`rotate(${i * 45} 50 50)`}/>)}</g>
  <circle cx={50} cy={50} r={21}/>
 </g>
 const cloud = (className: string) => <g className={className}>
  <circle cx={36} cy={56} r={15}/><circle cx={54} cy={48} r={20}/><circle cx={71} cy={58} r={13}/>
  <rect x={28} y={58} width={52} height={17} rx={8.5}/>
 </g>
 if (kind === 'clear') return <>{sun}</>
 if (kind === 'bright') return <><g transform="translate(-9 -11) scale(.86)" style={{ transformOrigin: '50px 50px' }}>{sun}</g><g transform="translate(6 9) scale(.82)" style={{ transformOrigin: '50px 50px' }}>{cloud('emblem-cloud')}</g></>
 if (kind === 'cloudy') return <><g transform="translate(-14 -12) scale(.66)" style={{ transformOrigin: '50px 50px' }}>{cloud('emblem-cloud emblem-cloud-back')}</g>{cloud('emblem-cloud')}</>
 if (kind === 'rain') return <>{cloud('emblem-cloud emblem-cloud-grey')}
  <g className="emblem-drops">{[38, 50, 62].map((x, i) => <line key={x} x1={x} y1={80} x2={x - 4} y2={93} style={{ animationDelay: `${i * 0.18}s` }}/>)}</g>
 </>
 return <>{cloud('emblem-cloud emblem-cloud-dark')}
  <path className="emblem-bolt" d="M55 68 L44 86 L53 86 L48 99 L63 80 L54 80 Z"/>
 </>
}

/** The sky itself, on a wheel behind the garden: choosing a weather turns it overhead. */
export function SkyWheel({ weather, width, height }: { weather: Weather; width: number; height: number }) {
 if (!width || !height) return null
 const radius = Math.max(width, 300) * 1.06
 const centerY = height + 26
 const orbit = radius * 0.75
 return <div className="sky-wheel" aria-hidden="true" style={{ width: radius * 2, height: radius * 2, left: width / 2 - radius, top: centerY - radius }}>
  <div className="sky-wheel-spin" style={{ transform: `rotate(${-weatherIndex(weather) * STEP}deg)` }}>
   <span className="sky-wheel-ring"/>
   {weathers.map((w, i) => <span key={w.id} className="sky-wheel-slot" data-active={w.id === weather}
    style={{ transform: `rotate(${i * STEP}deg) translateY(${-orbit}px) rotate(${(weatherIndex(weather) - i) * STEP}deg)` }}>
    <svg viewBox="0 0 100 110" className="sky-emblem"><SkyEmblem kind={w.id}/></svg>
   </span>)}
  </div>
 </div>
}
