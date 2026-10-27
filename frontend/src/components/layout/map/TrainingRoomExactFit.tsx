'use client'
import { useId } from 'react'

/** One proportional drawing per real training room. Visual only. */
export default function TrainingRoomExactFit({name, floorColor = "#DCE0E3"}: {name:string; floorColor?:string}) {
 const unique = useId().replace(/[^a-zA-Z0-9]/g,'')
 const wood = `trainingwood${unique}`
 const screen = `trainingscreen${unique}`
 const floor = `trainingfloor${unique}`
 const tables = [
  {x:133,y:34}, {x:232,y:34},
  {x:89,y:224}, {x:180,y:224}, {x:271,y:224},
 ]
 return <svg viewBox="0 0 390 500" preserveAspectRatio="none" className="h-full w-full" role="img" aria-label={`${name}: cinco mesas largas de cuatro computadoras, veinte puestos, mesa del instructor y proyector`}>
  <defs>
   <linearGradient id={wood} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#deb987"/><stop offset="1" stopColor="#8b613c"/></linearGradient>
   <linearGradient id={screen} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#92e3ff"/><stop offset="1" stopColor="#1456d8"/></linearGradient>
   <pattern id={floor} width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill={floorColor}/><path d="M28 0H0V28" fill="none" stroke="#7191a6" strokeOpacity=".12"/></pattern>
  </defs>
  <rect width="390" height="500" fill={`url(#${floor})`}/>
  <rect x="2" y="2" width="386" height="496" rx="8" fill="none" stroke="#94a3b8" strokeOpacity=".5" strokeWidth="3"/>
  <text x="195" y="18" textAnchor="middle" fontFamily="sans-serif" fontSize="12" fontWeight="700" fill="#e4efff">{name}</text>
  {/* The teaching wall is on the LEFT, facing the right-side students. */}
  <rect x="9" y="143" width="8" height="128" rx="2" fill="#ccedff" stroke="#60a5fa" strokeWidth="2"/>
  <rect x="20" y="154" width="19" height="104" rx="2" fill="#253c61" stroke="#60a5fa" strokeOpacity=".5"/>
  <text x="29" y="276" textAnchor="middle" fontFamily="sans-serif" fontSize="9" fill="#c6e6ff">Pantalla</text>
  {/* Instructor desk, without a computer, on the left side */}
  <rect x="42" y="168" width="38" height="84" rx="5" fill={`url(#${wood})`} stroke="#eed0a7" strokeWidth="1.4"/>
  <circle cx="64" cy="182" r="7" fill="#1b8059"/>
  <rect x="25" y="189" width="15" height="35" rx="6" fill="#0f172a" stroke="#64748b"/>
  <text x="61" y="264" textAnchor="middle" fontFamily="sans-serif" fontSize="9" fill="#cbd5e1">Trainer</text>
  {/* Projector on the left wall. */}
  <rect x="12" y="111" width="28" height="17" rx="3" fill="#e2e8f0" stroke="#94a3b8"/>
  <circle cx="19" cy="119" r="4" fill="#155eaa"/>
  <path d="M40 119L58 107M40 119L58 132" fill="none" stroke="#60a5fa" strokeOpacity=".5"/>
  {tables.map((table,index)=><g key={index} transform={`translate(${table.x},${table.y})`}>
    <rect x="-2" y="-2" width="39" height="164" rx="5" fill="#080d17" opacity=".45"/>
    <rect width="35" height="160" rx="5" fill={`url(#${wood})`} stroke="#e9c99c" strokeWidth="1.3"/>
    {Array.from({length:4},(_,seat)=><g key={seat} transform={`translate(0,${7+seat*38})`}>
     <rect x="8" y="0" width="19" height="20" rx="2" fill="#0c1425" stroke="#d6f0ff" strokeWidth="1.1"/>
     <rect x="10" y="2" width="15" height="15" rx="1" fill={`url(#${screen})`}/>
     <rect x="16" y="20" width="4" height="3" fill="#64748b"/>
     <rect x="39" y="0" width="23" height="27" rx="8" fill="#0f172a" stroke="#6b798d" strokeWidth="1.5"/>
     <rect x="42" y="3" width="17" height="20" rx="5" fill="#344256"/>
    </g>)}
   </g>)}
  {/* Door access at the bottom, not under the tables */}
  <path d="M338 498H382V456" fill="none" stroke="#f2d3a2" strokeWidth="4"/>
  <path d="M338 498A44 44 0 0 1 382 454" fill="none" stroke="#b7c9da" strokeDasharray="4 4" strokeOpacity=".65"/>
  <text x="195" y="483" textAnchor="middle" fontFamily="sans-serif" fontSize="10" fontWeight="600" fill="#c1d7f2">5 mesas | 20 posiciones</text>
 </svg>
}
