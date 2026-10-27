'use client'

/**
 * Executive CEO office based on the approved visual reference.
 * Visual-only furniture for the unified floor plan.
 */
export default function CEOOfficeExactFit({floorColor = '#E4DCD0'}: {floorColor?: string}) {
  return (
    <svg viewBox="0 0 520 440" preserveAspectRatio="none" className="h-full w-full" role="img" aria-label="Oficina del CEO con escritorio ejecutivo, sofás, sillas de visita, plantas y pantalla mural">
      <defs>
        <pattern id="ceo-floor-grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <rect width="32" height="32" fill={floorColor} />
          <path d="M32 0H0V32" fill="none" stroke="#8f8a84" strokeOpacity=".18" strokeWidth=".7" />
        </pattern>
        <linearGradient id="ceo-wood" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#d7b68b" />
          <stop offset="1" stopColor="#8f6540" />
        </linearGradient>
        <linearGradient id="ceo-screen" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#86ecff" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="ceo-sofa" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#1f2937" />
          <stop offset="1" stopColor="#0b1220" />
        </linearGradient>
        <radialGradient id="ceo-light" cx="50%" cy="50%" r="70%">
          <stop stopColor="#fef3c7" stopOpacity=".20" />
          <stop offset="1" stopColor="#fef3c7" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="520" height="440" fill="url(#ceo-floor-grid)" />
      <rect x="6" y="6" width="508" height="428" rx="10" fill="none" stroke="#f1f5f9" strokeOpacity=".18" strokeWidth="2" />

      {/* ambient lighting */}
      <ellipse cx="105" cy="34" rx="88" ry="28" fill="url(#ceo-light)" />
      <ellipse cx="260" cy="34" rx="88" ry="28" fill="url(#ceo-light)" />
      <ellipse cx="417" cy="34" rx="88" ry="28" fill="url(#ceo-light)" />

      {/* area rug */}
      <rect x="170" y="120" width="180" height="190" rx="10" fill="#6b7280" fillOpacity=".20" stroke="#94a3b8" strokeOpacity=".25" strokeWidth="2" />

      {/* executive desk */}
      <rect x="214" y="130" width="88" height="160" rx="8" fill="#0b1220" opacity=".18" />
      <rect x="208" y="124" width="88" height="160" rx="7" fill="url(#ceo-wood)" stroke="#edd5ad" strokeOpacity=".7" strokeWidth="1.6" />
      <rect x="232" y="160" width="40" height="46" rx="4" fill="#0f172a" stroke="#dbeafe" strokeOpacity=".6" strokeWidth="1.2" />
      <rect x="236" y="164" width="32" height="34" rx="2" fill="url(#ceo-screen)" />
      <rect x="247" y="206" width="10" height="4" rx="1" fill="#64748b" />
      <rect x="245" y="220" width="14" height="18" rx="4" fill="#334155" />

      {/* main chair behind desk */}
      <rect x="227" y="95" width="50" height="24" rx="8" fill="url(#ceo-sofa)" stroke="#64748b" strokeWidth="1.3" />
      <rect x="237" y="117" width="30" height="13" rx="5" fill="#334155" />

      {/* visitor chairs at right of desk */}
      {[145, 225].map((y, idx) => (
        <g key={idx} transform={`translate(335,${y})`}>
          <rect width="46" height="58" rx="12" fill="url(#ceo-sofa)" stroke="#64748b" strokeWidth="1.4" />
          <rect x="6" y="7" width="34" height="24" rx="8" fill="#334155" />
          <rect x="8" y="33" width="30" height="17" rx="7" fill="#334155" />
        </g>
      ))}

      {/* lounge set on left */}
      <g transform="translate(75,150)">
        <rect width="64" height="128" rx="14" fill="url(#ceo-sofa)" stroke="#64748b" strokeWidth="1.4" />
        <rect x="8" y="10" width="48" height="45" rx="10" fill="#334155" />
        <rect x="8" y="61" width="48" height="24" rx="9" fill="#334155" />
      </g>
      <g transform="translate(105,295)">
        <rect width="60" height="56" rx="14" fill="url(#ceo-sofa)" stroke="#64748b" strokeWidth="1.4" />
        <rect x="8" y="9" width="44" height="20" rx="8" fill="#334155" />
        <rect x="10" y="31" width="40" height="16" rx="7" fill="#334155" />
      </g>

      {/* coffee table for lounge */}
      <ellipse cx="182" cy="322" rx="24" ry="18" fill="#111827" opacity=".18" />
      <rect x="160" y="304" width="44" height="34" rx="14" fill="url(#ceo-wood)" stroke="#edd5ad" strokeOpacity=".7" />

      {/* right wall TV / screen */}
      <rect x="463" y="145" width="13" height="120" rx="3" fill="#e2e8f0" stroke="#93c5fd" strokeOpacity=".65" />
      <rect x="465" y="152" width="9" height="106" rx="2" fill="url(#ceo-screen)" />
      <rect x="458" y="176" width="5" height="58" rx="2" fill="#94a3b8" opacity=".8" />

      {/* door reference top-left */}
      <path d="M20 92V28H86" fill="none" stroke="#d6d3d1" strokeOpacity=".65" strokeWidth="4" />
      <path d="M20 92A66 66 0 0 0 86 26" fill="none" stroke="#94a3b8" strokeDasharray="5 5" strokeOpacity=".6" />
      <rect x="12" y="69" width="13" height="33" rx="2" fill="#a16207" />

      {/* bottom windows hint */}
      <rect x="116" y="430" width="290" height="6" rx="3" fill="#60a5fa" fillOpacity=".25" />
      <rect x="126" y="426" width="110" height="5" rx="2.5" fill="#93c5fd" fillOpacity=".45" />
      <rect x="286" y="426" width="110" height="5" rx="2.5" fill="#93c5fd" fillOpacity=".45" />

      {/* plants */}
      {[
        [35, 40], [477, 42], [42, 385], [474, 382], [56, 246], [451, 310],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x},${y})`}>
          <circle r="11" fill="#6b4f3b" />
          <circle r="9" fill="#047857" />
          <path d="M0 -12 L4 -4 L12 0 L4 4 L0 12 L-4 4 L-12 0 L-4 -4 Z" fill="#22c55e" />
        </g>
      ))}
    </svg>
  )
}
