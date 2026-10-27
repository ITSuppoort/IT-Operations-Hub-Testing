'use client'

/**
 * Lobby 2D: a single coherent coordinate system scaled to the room.
 * Visual only; no inventory, assignment or Supabase writes.
 */
export default function LobbyExactFit({floorColor = "#EDE7DA"}: {floorColor?:string}) {
  return (
    <svg viewBox="0 0 280 670" preserveAspectRatio="none" className="h-full w-full" role="img" aria-label="Lobby: cuatro reclutadores a la izquierda, dos equipos para examenes arriba a la derecha, impresora en el lateral y recepcion para dos en la parte inferior">
      <defs>
        <pattern id="it-lobby-tiles-10e" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="#a8a29e" strokeOpacity=".18" strokeWidth=".6"/></pattern>
        <linearGradient id="it-lobby-wood-10e" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d4a46d"/><stop offset="1" stopColor="#805338"/></linearGradient>
        <linearGradient id="it-lobby-screen-10e" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#60a5fa"/><stop offset="1" stopColor="#1d4ed8"/></linearGradient>
        <radialGradient id="it-lobby-light-10e"><stop stopColor="#fef3c7" stopOpacity=".22"/><stop offset="1" stopColor="#fef3c7" stopOpacity="0"/></radialGradient>
      </defs>
      <rect width="280" height="670" fill={floorColor} />
      <rect width="280" height="670" fill="url(#it-lobby-tiles-10e)" />
      <rect x="6" y="8" width="268" height="654" rx="4" fill="none" stroke="#f8fafc" strokeOpacity=".12" strokeWidth="1" />
      <ellipse cx="65" cy="30" rx="85" ry="40" fill="url(#it-lobby-light-10e)" />
      <ellipse cx="210" cy="35" rx="85" ry="40" fill="url(#it-lobby-light-10e)" />
      {/* Reclutamiento: mesa vertical de cuatro, pegada arriba */}
      <rect x="63" y="22" width="63" height="330" rx="5" fill="#111827" opacity=".55" />
      <rect x="60" y="19" width="63" height="330" rx="4" fill="url(#it-lobby-wood-10e)" stroke="#f2d9b6" strokeOpacity=".55" strokeWidth="1.2" />
      {[0,1,2,3].map(n => <g key={'recruit-'+n} transform={`translate(0,${n*76})`}>
        <rect x="32" y="30" width="24" height="29" rx="7" fill="#101827" stroke="#64748b" strokeWidth="1.5"/>
        <rect x="35" y="34" width="18" height="18" rx="4" fill="#263448" />
        <rect x="86" y="35" width="26" height="22" rx="3" fill="#111827" stroke="#b9e5fc" strokeWidth="1.2" />
        <rect x="89" y="38" width="20" height="15" rx="1.5" fill="url(#it-lobby-screen-10e)" />
        <rect x="96" y="57" width="6" height="3" fill="#64748b" />
      </g>)}
      {/* Examenes: estaciones en pared superior, sillas orientadas hacia arriba */}
      <rect x="157" y="25" width="102" height="61" rx="4" fill="url(#it-lobby-wood-10e)" stroke="#f2d9b6" strokeOpacity=".55" strokeWidth="1"/>
      {[0,1].map(n => <g key={'exam-'+n} transform={`translate(${n*43},0)`}>
        <rect x="170" y="35" width="29" height="23" rx="3" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.2" />
        <rect x="173" y="38" width="23" height="16" rx="1" fill="url(#it-lobby-screen-10e)" />
        <rect x="175" y="90" width="26" height="25" rx="8" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
        <rect x="180" y="94" width="16" height="16" rx="4" fill="#263448" />
      </g>)}
      {/* Impresora ubicada debajo del rotulo de examen HR. Serial aun sin verificar. */}
      <rect x="221" y="166" width="39" height="37" rx="5" fill="#b8c3d2" stroke="#f1f5f9" strokeWidth="1.2" />
      <rect x="227" y="171" width="27" height="14" rx="2" fill="#263449" />
      <rect x="227" y="187" width="27" height="6" rx="1" fill="#64748b"/>
      <text x="240" y="215" fill="#334155" fontSize="10" fontWeight="700" textAnchor="middle">Impresora</text>
      <text x="240" y="226" fill="#334155" fontSize="8" textAnchor="middle">Serial pendiente</text>
      {/* Una sola silla auxiliar de espera con mesa redonda. */}
      <rect x="24" y="572" width="31" height="32" rx="10" fill="#0f172a" stroke="#64748b" strokeWidth="1.4" />
      <circle cx="77" cy="588" r="17" fill="url(#it-lobby-wood-10e)" stroke="#e9cfaa" strokeOpacity=".6" />
      {/* Recepcion vertical, dos monitores en linea y sillas a la derecha. */}
      <rect x="160" y="493" width="54" height="135" rx="6" fill="url(#it-lobby-wood-10e)" stroke="#f2d9b6" strokeOpacity=".55" />
      {[0,1].map(n => <g key={'reception-'+n} transform={`translate(0,${n*62})`}>
        <rect x="170" y="507" width="30" height="25" rx="3" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1" />
        <rect x="173" y="510" width="24" height="18" rx="1.5" fill="url(#it-lobby-screen-10e)" />
        <rect x="219" y="505" width="29" height="31" rx="9" fill="#0f172a" stroke="#64748b" strokeWidth="1.2" />
      </g>)}
      {/* Small, readable legend that does not cover desks */}
      <g fontFamily="system-ui, sans-serif" fontSize="9" fontWeight="650" textAnchor="middle">
        <rect x="147" y="123" width="124" height="24" rx="6" fill="#0b1424" fillOpacity=".94" stroke="#818cf8" strokeOpacity=".45" />
        <text x="209" y="138.5" fill="#e0e7ff" fontSize="10">Área de examen HR</text>
        <rect x="145" y="640" width="102" height="19" rx="6" fill="#0b1424" fillOpacity=".9" stroke="#34d399" strokeOpacity=".45" />
        <text x="195" y="652.5" fill="#d1fae5">Recepción</text>
      </g>
      {/* Plantas: ornamentacion dentro del area */}
      {[ [16,15],[253,14],[258,505],[19,525] ].map(([x,y],n) => <g key={'plant-'+n} transform={`translate(${x},${y})`}>
        <circle r="10" fill="#66513e" />
        <circle r="8" fill="#047857" />
        <path d="M0 -10 L3 -3 L10 0 L3 3 L0 10 L-3 3 L-10 0 L-3 -3 Z" fill="#22c55e" />
      </g>)}
    </svg>
  )
}
