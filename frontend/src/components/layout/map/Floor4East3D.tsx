'use client'

import { useMemo, useState } from 'react'

type State = 'empty'|'incomplete'|'complete'|'occupied'|'unknown'
type Position3D = {code:string; x:number; y:number; category:'agent'|'supervisor'|'admin'; caption?:string}
type Props = {
  rowCodes: Record<number,string[]>
  supervisorCodes: Record<number,[string,string]>
  upperCodes: string[]
  lowerCodes: string[]
  adminLeft: string[]
  adminRight: string[][]
  statuses: Record<string,State>
  assignedNames: Record<string,string>
  spotlightCode?: string
  onSelect: (code:string) => void
}
const STATUS: Record<State,{color:string;text:string}> = {
  empty:{color:'#fb7185',text:'Vacía'}, incomplete:{color:'#fbbf24',text:'Incompleta'},
  complete:{color:'#34d399',text:'Completa / libre'},occupied:{color:'#38bdf8',text:'En uso'},
  unknown:{color:'#94a3b8',text:'Sin verificar'}
}
const trimCode = (code:string) => code.startsWith('P4E-') ? code.slice(4) : code

export default function Floor4East3D({rowCodes,supervisorCodes,upperCodes,lowerCodes,adminLeft,adminRight,statuses,assignedNames,spotlightCode,onSelect}:Props) {
  const [yaw,setYaw] = useState(-12)
  const [tilt,setTilt] = useState(51)
  const [scale,setScale] = useState(0.91)
  const [labels,setLabels] = useState(false)
  const [architecture,setArchitecture] = useState(true)
  const [showNames,setShowNames] = useState(false)
  const [selectedOnly,setSelectedOnly] = useState(false)
  const [active,setActive] = useState('')
  const [query,setQuery] = useState('')
  const [filter,setFilter] = useState<State | 'all'>('all')
  const [categoryFilter,setCategoryFilter] = useState<'all'|'agent'|'supervisor'|'admin'>('all')
  const positions=useMemo<Position3D[]>(()=>{
    const result:Position3D[]=[]
    // The coordinates describe the same 9 central rows and physical code order as 2D.
    for(let row=1;row<=9;row++) {
      const centerX=243+(row-1)*111
      ;(rowCodes[row]||[]).forEach((code,i)=>{
        if(code)result.push({code,x:centerX+(i%2)*36-18,y:269+Math.floor(i/2)*57,category:'agent'})
      })
      const [upper,lower]=supervisorCodes[row]||['','']
      if(upper)result.push({code:upper,x:centerX,y:221,category:'supervisor'})
      if(lower)result.push({code:lower,x:centerX,y:739,category:'supervisor'})
    }
    upperCodes.forEach((code,i)=>result.push({code,x:221+i*29.35,y:112,category:'agent'}))
    lowerCodes.forEach((code,i)=>result.push({code,x:220+i*39.1,y:852,category:'agent'}))
    const admins=[...adminLeft,...adminRight.flat()]
    const locs=[[87,625],[1277,235],[1334,235],[1277,415],[1334,415]]
    admins.forEach((code,i)=>result.push({code,x:locs[i][0],y:locs[i][1],category:'admin'}))
    return result
  },[rowCodes,supervisorCodes,upperCodes,lowerCodes,adminLeft,adminRight])
  const availableCodes=useMemo(()=>new Set(positions.map(p=>p.code)),[positions])
  const matching=useMemo(()=>{
    const q=query.trim().toLocaleLowerCase()
    return positions.filter(p=> !q || p.code.toLocaleLowerCase().includes(q) || (assignedNames[p.code]||'').toLocaleLowerCase().includes(q)).slice(0,12)
  },[positions,query,assignedNames])
  const totals=useMemo(()=>positions.reduce((acc,p)=>{acc[statuses[p.code]||'unknown']++;return acc}, {empty:0,incomplete:0,complete:0,occupied:0,unknown:0} as Record<State,number>),[positions,statuses])
  const [selectedCode,setSelectedCode]=useState('')
  const useCamera=(mode:'general'|'inspect'|'top')=>{
    if(mode==='general'){setYaw(-9);setTilt(43);setScale(.97)}
    if(mode==='inspect'){setYaw(-5);setTilt(33);setScale(1.18)}
    if(mode==='top'){setYaw(0);setTilt(0);setScale(.9)}
  }
  const focused=availableCodes.has(spotlightCode||'') ? spotlightCode||'' : selectedCode
  const hasFilter=filter!=='all'||categoryFilter!=='all'||!!query.trim()
  const relevant=(p:Position3D)=> (filter==='all'||(statuses[p.code]||'unknown')===filter) && (categoryFilter==='all'||p.category===categoryFilter) && (!query.trim()||p.code.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())||(assignedNames[p.code]||'').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  const pick=(code:string)=>{setSelectedCode(code);setActive(code);onSelect(code)}
  const hoverCode = active && positions.find(p=>p.code===active)
  return <div className="relative overflow-hidden rounded-2xl border border-sky-600/50 bg-[radial-gradient(ellipse_at_50%_15%,#eef3ef,#415a67_78%)] text-white shadow-[inset_0_0_65px_#0005]">
    <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0c2038]/95 px-5 py-3">
      <div><div className="text-base font-extrabold tracking-wide">PISO 4 ESTE · CENTRO DE OPERACIONES 3D</div><div className="text-xs text-sky-200/80">{positions.length} escritorios vinculados al catálogo · selecciona cualquiera para abrir su ficha real</div></div>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <button type="button" onClick={()=>useCamera('general')} className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-2.5 py-1.5 hover:bg-cyan-500/20">Isométrica</button>
        <button type="button" onClick={()=>useCamera('inspect')} className="rounded-lg border border-cyan-400/40 px-2.5 py-1.5 hover:bg-cyan-500/20">Acercar puestos</button>
        <button type="button" onClick={()=>useCamera('top')} className="rounded-lg border border-cyan-400/40 px-2.5 py-1.5 hover:bg-cyan-500/20">Cenital</button>
        <label className="flex items-center gap-2">Giro <input aria-label="Giro del mapa 3D" type="range" min="-32" max="32" value={yaw} onChange={e=>setYaw(Number(e.target.value))}/></label>
        <label className="flex items-center gap-2">Inclinación <input aria-label="Inclinación del mapa 3D" type="range" min="25" max="62" value={tilt} onChange={e=>setTilt(Number(e.target.value))}/></label>
        <button type="button" className="rounded-lg border border-sky-400/40 px-3 py-1.5 hover:bg-white/10" onClick={()=>setScale(s=>Math.max(0.52,Math.round((s-.08)*100)/100))}>−</button>
        <span>{Math.round(scale*100)}%</span>
        <button type="button" className="rounded-lg border border-sky-400/40 px-3 py-1.5 hover:bg-white/10" onClick={()=>setScale(s=>Math.min(1.25,Math.round((s+.08)*100)/100))}>+</button>
        <label className="flex items-center gap-1"><input type="checkbox" checked={architecture} onChange={e=>setArchitecture(e.target.checked)}/> Arquitectura</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={showNames} onChange={e=>setShowNames(e.target.checked)}/> Personas</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={selectedOnly} onChange={e=>setSelectedOnly(e.target.checked)}/> Solo seleccionado</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={labels} onChange={e=>setLabels(e.target.checked)}/> Códigos</label>
        <button type="button" className="rounded-lg bg-sky-600 px-3 py-1.5 font-semibold" onClick={()=>{useCamera('general');setSelectedCode('');setActive('')}}>Restablecer</button>
      </div>
    </div>
    <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-b border-cyan-400/20 bg-[#102840] px-4 py-3 text-xs">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <label className="font-semibold text-cyan-200" htmlFor="p4e-3d-query">Localizar</label>
        <input id="p4e-3d-query" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Código o nombre de colaborador" className="w-full max-w-[300px] rounded-lg border border-slate-500/60 bg-[#081629] px-3 py-2 text-white outline-none placeholder:text-slate-400 focus:border-cyan-300" />
        <label htmlFor="p4e-3d-status">Estado</label>
        <select id="p4e-3d-status" value={filter} onChange={e=>setFilter(e.target.value as State|'all')} className="rounded-lg border border-slate-500/60 bg-[#081629] px-2 py-2 text-white"><option value="all">Todos</option>{(Object.entries(STATUS) as Array<[State,{color:string;text:string}]>).map(([key,value])=><option key={key} value={key}>{value.text}</option>)}</select>
        <label htmlFor="p4e-3d-type">Tipo</label>
        <select id="p4e-3d-type" value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value as 'all'|'agent'|'supervisor'|'admin')} className="rounded-lg border border-slate-500/60 bg-[#081629] px-2 py-2 text-white"><option value="all">Todos</option><option value="agent">Operativos</option><option value="supervisor">Supervisión</option><option value="admin">Administrativos</option></select>
        {hasFilter && <button type="button" onClick={()=>{setQuery('');setFilter('all');setCategoryFilter('all')}} className="rounded-md border border-cyan-500/50 px-2 py-2 text-cyan-100">Limpiar filtros</button>}
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Resumen del Piso 4 Este">
        {(Object.entries(STATUS) as Array<[State,{color:string;text:string}]>).map(([key,v])=><button type="button" key={key} onClick={()=>setFilter(current=>current===key?'all':key)} className={`rounded-md border px-2 py-1 ${filter===key?'border-cyan-200 bg-cyan-800':'border-white/15 bg-black/20'}`} title={`Filtrar ${v.text}`}><span className="mr-1" style={{color:v.color}}>●</span>{totals[key]}</button>)}
      </div>
      {query.trim() && <div className="w-full rounded-lg border border-cyan-400/30 bg-[#0a1a30] p-2"><div className="mb-1 text-cyan-200">Resultados encontrados: {matching.length}{matching.length===12?' (primeros 12)':''}</div>{matching.length===0?<div className="text-slate-300">Sin coincidencias en los escritorios de este piso.</div>:<div className="flex max-h-28 flex-wrap gap-1 overflow-auto">{matching.map(p=><button type="button" key={p.code} onClick={()=>{setSelectedCode(p.code);setActive(p.code);setQuery('');setFilter('all');setCategoryFilter('all')}} className="rounded-md border border-sky-500/30 bg-[#1d3f5e] px-2 py-1 text-left hover:border-cyan-300"><strong>{p.code}</strong>{assignedNames[p.code] && <span className="ml-2 text-slate-200">{assignedNames[p.code]}</span>}</button>)}</div>}</div>}
    </div>
    <div className="relative z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/10 bg-[#0a1930]/90 px-4 py-2 text-[11px]">
      {(Object.entries(STATUS) as Array<[State,{color:string;text:string}]>).map(([key,v])=><span key={key} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{background:v.color}}/>{v.text}</span>)}
      <span className="ml-auto text-sky-200/75">Modelo arquitectónico interactivo · lectura de datos</span>
    </div>
    <div className="relative overflow-auto" style={{height:850,perspective:'2200px',perspectiveOrigin:'50% 31%',background:'radial-gradient(ellipse at 52% 37%, #edf3ef 0%, #aabec5 50%, #345065 95%)'}}>
      <div className="absolute left-1/2 top-[44%]" style={{width:1420,height:950,transformStyle:'preserve-3d',transform:`translate(-50%,-50%) scale(${scale}) rotateX(${tilt}deg) rotateZ(${yaw}deg)`,transition:'transform 180ms ease-out'}}>
        <div className="absolute inset-0 rounded-md border-[12px] border-[#9baba9] shadow-[0_18px_0_#53666d,0_45px_0_#354851,0_65px_55px_#263641aa,inset_0_0_70px_#889b9740]" style={{background:'repeating-linear-gradient(0deg,transparent 0px,transparent 59px,#d5d9d1 60px),repeating-linear-gradient(90deg,#f0f0e9 0px,#f0f0e9 59px,#dadfd7 60px)'}} />
        {architecture && <>
          {/* Transparent cutaway walls: visual architecture only, never selectable positions. */}
          {[192,1241].map((left,idx)=><div key={'wall-vertical-'+idx} className="pointer-events-none absolute top-[20px] h-[910px] w-[9px] border-x border-[#edf6f3] bg-[#84b5bc]/50 shadow-[5px_3px_0_#3d6370,0_8px_15px_#1b394344]" style={{left,transform:'translateZ(22px)'}} />)}
          {[200,655].map((top,idx)=><div key={'glass-'+idx} className="pointer-events-none absolute left-[1245px] h-[9px] w-[160px] border-y border-white/70 bg-[#8bb8b6]/65 shadow-[2px_4px_0_#4c757c,0_8px_10px_#0003]" style={{top,transform:'translateZ(22px)'}} />)}
          {Array.from({length:10},(_,i)=><div key={'divider-'+i} className="pointer-events-none absolute h-[470px] w-[6px] rounded border border-white/50 bg-[#8db0b6]/25 shadow-[4px_3px_0_#688f95aa]" style={{left:187+i*111,top:264,transform:'translateZ(6px)'}} />)}
          {Array.from({length:13},(_,i)=><div key={'greenery-'+i} className="pointer-events-none absolute flex items-center justify-center" style={{left:210+i*80,top:169,transform:'translateZ(14px)'}}><div className="h-[15px] w-[15px] rounded-full border-2 border-[#8d745b] bg-[#408759] shadow-[0_-8px_0_3px_#5fa26a,0_4px_4px_#0004]" /></div>)}
          {[{x:43,y:186},{x:43,y:446},{x:43,y:651},{x:1269,y:350},{x:1269,y:643}].map((p,i)=><div key={'door-'+i} className="pointer-events-none absolute h-[13px] w-[52px] rounded border border-white/70 bg-[#b8d5d4]/65 shadow-[0_5px_0_#66848b]" style={{left:p.x,top:p.y,transform:'translateZ(10px)'}} />)}
        </>}
        {/* Glass perimeter walls and architectural columns, viewed in cutaway. */}
        <div className="pointer-events-none absolute left-[9px] right-[9px] top-[8px] h-[13px] border-y-2 border-[#30414a] bg-[#a9c9c8]/55 shadow-[0_-31px_0_#c6d5d0a8,0_-35px_0_#3a5258,0_8px_8px_#1e333455]" />
        <div className="pointer-events-none absolute bottom-[8px] left-[9px] right-[9px] h-[12px] border-y-2 border-[#30414a] bg-[#a9c9c8]/55 shadow-[0_18px_0_#3a515b,0_22px_0_#233641]" />
        {Array.from({length:11},(_,i)=><div key={'column-'+i} className="pointer-events-none absolute h-[30px] w-[13px] rounded-sm bg-[#3a4a4a] shadow-[0_0_0_2px_#8a9890,8px_8px_8px_#0004]" style={{top:4,left:98+i*118}} />)}
        {Array.from({length:12},(_,i)=><div key={'plant-'+i} className="pointer-events-none absolute" style={{top:i%2===0?151:796,left:210+i*88,transform:'translateZ(20px)'}}><div className="h-[14px] w-[14px] rounded-full border-[3px] border-[#826c53] bg-[#416a40] shadow-[0_-10px_0_3px_#68925d,0_4px_6px_#0006]" /></div>)}
        {[186,774].map((y,i)=><div key={i} className="absolute left-[194px] w-[1044px] rounded-lg border-y-4 border-sky-900/40 bg-[#b0b9ad]/50 text-center text-xs font-bold tracking-[.2em] text-[#43605d]" style={{top:y,height:20}}>{i===0?'CIRCULACIÓN SUPERIOR':'CIRCULACIÓN INFERIOR'}</div>)}
        <Zone x={13} y={20} w={171} h={175} title="SALA DE REUNIÓN" tint="#e7bb8e"/>
        <Zone x={13} y={212} w={171} h={230} title="SERVIDOR IT" tint="#a4c8c5"/>
        <Zone x={13} y={460} w={171} h={183} title="OFICINA INDIVIDUAL" tint="#c9b5df"/>
        <Zone x={13} y={665} w={171} h={265} title="QA / AUDITORÍA" tint="#e4c6b9"/>
        <Zone x={1245} y={20} w={161} h={332} title="VP / GERENCIA" tint="#e8ce91"/>
        <Zone x={1245} y={370} w={161} h={272} title="GERENCIA QA" tint="#c9d6ee"/>
        <Zone x={1245} y={665} w={161} h={265} title="SALIDA DE EMERGENCIA" tint="#f9dd94"/>
        {Array.from({length:9},(_,i)=><div key={i} className="pointer-events-none absolute text-center text-[12px] font-black text-[#134466]" style={{left:205+i*111,top:242,width:76}}>ROW {i+1}</div>)}
        {Array.from({length:5},(_,i)=><div key={i} className="pointer-events-none absolute rounded bg-[#124c79] py-1 text-center text-[12px] font-bold text-white" style={{left:213+i*203,top:57,width:i===4?130:187}}>ROW {i+10}</div>)}
        {Array.from({length:4},(_,i)=><div key={i} className="pointer-events-none absolute rounded bg-[#124c79] py-1 text-center text-[12px] font-bold text-white" style={{left:209+i*260,top:813,width:246}}>ROW {i+15}</div>)}
        <div className="pointer-events-none absolute rounded bg-black px-2 py-1 text-xs font-bold text-white" style={{left:435,top:213}}>MURO</div>
        <div className="pointer-events-none absolute rounded bg-black px-2 py-1 text-xs font-bold text-white" style={{left:880,top:213}}>MURO</div>
        {positions.map(p=>{
          const state=statuses[p.code]||'unknown'
          if(selectedOnly && focused && focused!==p.code) return null
          const faded=hasFilter && !relevant(p) && focused!==p.code
          const isSelected=focused===p.code
          const isSupervisor=p.category==='supervisor'
          return <button key={p.code} type="button" data-seat-code={p.code} title={`${p.code} · ${STATUS[state].text}${assignedNames[p.code]?` · ${assignedNames[p.code]}`:''}`} aria-label={`${p.code}: ${STATUS[state].text}`} onMouseEnter={()=>setActive(p.code)} onMouseLeave={()=>setActive('')} onClick={()=>pick(p.code)}
            className="group absolute flex items-center justify-center rounded-[4px] border border-[#3d5766]/65 shadow-[0_5px_0_#637e8b,0_8px_6px_#1c39445a] transition-[filter,box-shadow] hover:z-50 hover:brightness-125 focus-visible:z-50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-cyan-300"
            style={{left:p.x-16,top:p.y-13,width:isSupervisor?43:33,height:isSupervisor?33:27,background:isSupervisor?'#a2ded0':p.category==='admin'?'#e2c99b':'#d6b289',opacity:faded?.18:1,filter:faded?'grayscale(1)':undefined,borderColor:isSelected?'#06b6d4':undefined,boxShadow:isSelected?'0 0 0 5px #22d3ee,0 0 30px 13px #06b6d488':'0 5px 0 #917455,0 10px 8px #1c394455'}}>
            {/* Monitor, keyboard and chair have separate volumes and highlights. */}
            <span className="pointer-events-none absolute left-[4px] top-[2px] h-[15px] w-[19px] rounded-[2px] border-[2px] border-[#243640] bg-[linear-gradient(130deg,#5cbed3,#18344c)] shadow-[2px_2px_0_#304751,0_4px_0_#182a31]" />
            <span className="pointer-events-none absolute left-[10px] top-[19px] h-[2px] w-[13px] rounded-sm bg-[#eeeeea] shadow-[0_1px_0_#677c82]" />
            <span className="pointer-events-none absolute bottom-[-12px] left-1/2 h-[12px] w-[15px] -translate-x-1/2 rounded-[5px_5px_7px_7px] border border-[#243c46] bg-[#394d53] shadow-[0_5px_0_#273e45,0_8px_5px_#0005]" />
            <span className="pointer-events-none absolute right-[-3px] top-[-4px] h-2.5 w-2.5 rounded-full border border-white shadow-[0_0_5px_#fff7]" style={{background:STATUS[state].color}} />
            {showNames && assignedNames[p.code] && <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-3 max-w-[90px] -translate-x-1/2 truncate rounded bg-[#10283e] px-1 text-[8px] text-white">{assignedNames[p.code]}</span>}
            {(labels||isSelected) && <span className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-1 w-max -translate-x-1/2 rounded bg-[#0c2c45] px-1.5 py-0.5 text-[9px] font-bold text-white shadow-lg">{trimCode(p.code)}</span>}
          </button>
        })}
      </div>
      {focused && <div className="absolute right-5 top-5 z-30 max-w-[280px] rounded-xl border border-cyan-300/40 bg-[#0c2038]/95 p-4 text-sm text-white shadow-2xl"><div className="mb-1 text-xs uppercase tracking-widest text-cyan-300">Puesto seleccionado</div><div className="font-bold">{focused}</div><div className="text-xs text-slate-300">{assignedNames[focused]||'Sin colaborador asignado'}</div><div className="mt-1 text-xs text-slate-300">{STATUS[statuses[focused]||'unknown'].text}</div><button type="button" className="mt-3 rounded bg-cyan-700 px-3 py-1.5 text-xs font-semibold hover:bg-cyan-600" onClick={()=>onSelect(focused)}>Abrir ficha / checklist</button></div>}
      {hoverCode && <div className="pointer-events-none absolute bottom-5 left-5 z-30 rounded-xl border border-sky-300/40 bg-[#08172f]/95 px-4 py-3 text-sm text-white shadow-xl"><div className="font-bold text-cyan-200">{hoverCode.code}</div><div className="text-xs">{STATUS[statuses[hoverCode.code]||'unknown'].text}</div><div className="text-xs">{assignedNames[hoverCode.code]||'Sin colaborador asignado'}</div></div>}
    </div>
    <div className="border-t border-sky-500/20 bg-[#0a1c32] px-4 py-3 text-xs text-sky-100/80">Los colores proceden del checklist real. Al seleccionar un escritorio se abre la misma ficha del mapa 2D. Las tres posiciones pendientes de localizar no se dibujan.</div>
  </div>
}
function Zone({x,y,w,h,title,tint}:{x:number;y:number;w:number;h:number;title:string;tint:string}) {
  const isServer=title.includes('SERVIDOR')
  const isExit=title.includes('SALIDA')
  const isMeeting=title.includes('REUNIÓN')
  return <div className="absolute overflow-visible rounded-sm border-[6px] border-[#6d8383] shadow-[0_18px_0_#536a6f,0_24px_18px_#0005,inset_0_0_18px_#fff8]" style={{left:x,top:y,width:w,height:h,background:`linear-gradient(135deg,${tint},#f2eee4)`}}>
    <div className="pointer-events-none absolute -left-[6px] -top-[24px] h-[24px] w-[6px] bg-[#344c52] shadow-[3px_0_1px_#b4c2bc]" />
    <div className="pointer-events-none absolute -right-[6px] -top-[24px] h-[24px] w-[6px] bg-[#344c52]" />
    <div className="pointer-events-none absolute -left-[4px] -top-[7px] h-[8px] w-[calc(100%+8px)] bg-[#a9c1bd]/75 shadow-[0_-11px_0_#bcd0cd55]" />
    <div className="relative z-20 m-2 rounded bg-[#183e4c]/95 px-1 py-2 text-center text-[10px] font-extrabold text-white shadow-sm">{title}</div>
    {isServer ? <div className="mx-auto mt-2 flex w-[120px] justify-center gap-1">{[0,1,2].map(i=><div key={i} className="h-[92px] w-[29px] rounded-t-sm border-[3px] border-[#43525e] bg-[#18232c] shadow-[4px_5px_0_#69777a]">{Array.from({length:7},(_,j)=><div key={j} className="mx-1 mt-1 h-[5px] rounded-sm border border-[#566674] bg-[#243c58]"><span className="ml-[4px] inline-block h-[3px] w-[3px] rounded-full bg-sky-400" /></div>)}</div>)}</div> : isExit ? <div className="mx-auto mt-10 flex h-[90px] w-[112px] items-center justify-center rounded border-[3px] border-[#aac0a8] bg-[#e3f0d6]"><span className="text-center text-3xl text-emerald-700">↗</span></div> : <div className="relative mx-auto mt-6 flex h-[67px] w-[107px] items-center justify-center rounded-sm border-[5px] border-[#a37c56] bg-[#d2a477] shadow-[0_8px_0_#916e52,0_14px_8px_#0004]">
      {!isMeeting && <div className="h-[27px] w-[37px] rounded border-4 border-[#31444d] bg-[#23788f] shadow-[2px_3px_0_#304c55]" />}
      <div className="absolute -bottom-[19px] left-1/2 h-[20px] w-[21px] -translate-x-1/2 rounded-b-lg border-2 border-[#374e57] bg-[#4b666d] shadow-[0_5px_5px_#0005]" />
      {isMeeting && <><div className="absolute -top-[19px] left-[20px] h-[18px] w-[21px] rounded-t-lg bg-[#5b7779]"/><div className="absolute -top-[19px] right-[20px] h-[18px] w-[21px] rounded-t-lg bg-[#5b7779]"/></>}
    </div>}
    <div className="pointer-events-none absolute bottom-3 right-3 h-[14px] w-[14px] rounded-full bg-[#557b4b] shadow-[0_-11px_0_3px_#6b985c,0_2px_4px_#0004]" />
  </div>
}
