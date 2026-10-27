'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarClock, RefreshCcw, Search, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, ClipboardList } from 'lucide-react'
import { apiRequest } from '@/lib/api'

type Movement = { id: string; kind: 'equipment' | 'component'; date: string; item: string; reference: string; action: string; direction: 'entry'|'exit'|'other'; origin: string; destination: string; actor: string; quantity: string }
type Raw = Record<string, unknown>
const object = (v: unknown): Raw => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Raw : {}
const str = (v: unknown): string => typeof v === 'string' ? v : typeof v === 'number' ? String(v) : ''
const direction = (action: string): Movement['direction'] => {
 const a=action.toLowerCase()
 if (/return|devoluci|entrada|entry|received|receive|intake|stock.in|created|compra|alta/.test(a)) return 'entry'
 if (/deliver|entrega|salida|exit|dispatch|retiro|retire|despacho|asignaci|consum/.test(a)) return 'exit'
 return 'other'
}
const movementLabel = (action: string): string => {
 const code = action.trim().toUpperCase()
 if(code === 'ENTRY_NEW') return 'Nuevo equipo · Entrada'
 if(code === 'ENTRY_DAMAGED') return 'Equipo dañado · Entrada'
 return action.replace(/_/g, ' ')
}
const locationLabel = (location:string):string => {
 const code = location.trim().toUpperCase()
 if(code === 'PROVEEDOR / NUEVO INGRESO') return 'Proveedor / Nuevo ingreso'
 if(code === 'IT / PENDIENTE DE UBICACION') return 'IT / Ubicación pendiente'
 return location || 'No registrado'
}
const actorLabel = (actor:string):string => actor.trim().toUpperCase() === 'SYSTEM / EQUIPMENT_CREATE' ? 'Sistema automático' : actor || 'No registrado'
const formatDate=(v:string)=>{if(!v)return 'Sin fecha';const d=new Date(v);return Number.isNaN(d.getTime())?'Fecha no válida':d.toLocaleString('es-DO')}
function normalize(raw:unknown,kind:'equipment'|'component'): Movement[] {
 const data=Array.isArray(raw)?raw: Array.isArray(object(raw).data)?object(raw).data as unknown[]: Array.isArray(object(raw).movements)?object(raw).movements as unknown[]: []
 return data.map((entry,index)=>{
  const r=object(entry), e=object(r.equipment), c=object(r.component)
  const action=str(r.action||r.type||r.movementType||r.operation||r.reason)||'Movimiento'
  return {id:str(r.id)||`${kind}-${index}`,kind,date:str(r.createdAt||r.date||r.timestamp),item:kind==='equipment'?[str(e.brand),str(e.model)].filter(Boolean).join(' ')||str(e.pcName)||'Equipo':str(c.name||c.description||r.componentName)||'Componente',reference:str(e.pcName||e.assetTag||e.serial||c.code||c.sku||r.equipmentId||r.componentId),action,direction:direction(action),origin:str(r.fromLocation||r.from||r.source||r.origin),destination:str(r.toLocation||r.to||r.destination),actor:str(r.createdBy||r.assignedUser||r.userName),quantity:str(r.quantity)||'1'}
 })
}
export default function WarehouseMovementHistory(){
 const [rows,setRows]=useState<Movement[]>([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [scope,setScope]=useState<'all'|'entry'|'exit'|'other'>('all')
 const [search,setSearch]=useState('')
 const reload=useCallback(async()=>{
  setLoading(true);setError('')
  try{
   const urls=['/movements','/inventory/movements'] as const
   const results=await Promise.allSettled(urls.map(u=>apiRequest(u)))
   const all:Movement[]=[];const failures:string[]=[]
   for(let i=0;i<results.length;i++){
    const outcome=results[i]
    if(outcome.status==='rejected'){failures.push(urls[i]);continue}
    if(!outcome.value.ok){failures.push(`${urls[i]} (${outcome.value.status})`);continue}
    try {all.push(...normalize(await outcome.value.json(),i===0?'equipment':'component'))}catch{failures.push(urls[i])}
   }
   all.sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime())
   setRows(all)
   if(failures.length)setError('No se pudieron consultar: '+failures.join(', ')+'. La lista puede estar incompleta.')
  }finally{setLoading(false)}
 },[])
 useEffect(()=>{void reload()},[reload])
 const filtered=useMemo(()=>rows.filter(r=>(scope==='all'||r.direction===scope)&&[r.item,r.reference,r.action,r.origin,r.destination,r.actor].join(' ').toLowerCase().includes(search.toLowerCase().trim())),[rows,scope,search])
 const tabs=[{id:'all' as const,label:'Todos',Icon:ClipboardList},{id:'entry' as const,label:'Entradas',Icon:ArrowDownToLine},{id:'exit' as const,label:'Salidas',Icon:ArrowUpFromLine},{id:'other' as const,label:'Otros cambios',Icon:ArrowLeftRight}]
 return <section className="inv-history-v5 space-y-3">
  <div className="flex flex-wrap justify-between gap-3"><div><h3 className="flex items-center gap-2 text-lg font-extrabold"><CalendarClock size={20}/> Historial de movimientos</h3><p className="inv-muted mt-1 text-xs">Consulta los movimientos realmente guardados en el sistema, sin generar registros de ejemplo.</p></div><button type="button" className="inv-btn" onClick={()=>void reload()} disabled={loading}><RefreshCcw size={15}/> Actualizar</button></div>
  <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar movimientos">{tabs.map(({id,label,Icon})=><button type="button" key={id} role="tab" aria-selected={scope===id} onClick={()=>setScope(id)} className={'inv-btn '+(scope===id?'inv-primary':'')}><Icon size={15}/>{label}</button>)}</div>
  <label className="inv-search flex items-center gap-2 max-w-lg"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar equipo, PCNAME, operación, responsable..." /></label>
  {error&&<p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">{error}</p>}
  {loading?<p className="inv-muted py-8 text-sm">Consultando historial...</p>:<div className="overflow-x-auto"><table className="inv-table inv-table-modern w-full min-w-[800px] text-left text-xs"><thead><tr>{['Fecha','Activo / componente','Movimiento','Origen','Destino','Responsable','Cantidad'].map(h=><th key={h} className="px-3 py-3">{h}</th>)}</tr></thead><tbody>{filtered.slice(0,200).map(r=><tr key={r.kind+'-'+r.id}><td className="px-3 py-3 whitespace-nowrap">{formatDate(r.date)}</td><td className="px-3 py-3"><strong>{r.item}</strong><p className="inv-muted">{r.reference||'Sin referencia'}</p></td><td className="px-3 py-3">{movementLabel(r.action)}</td><td className="px-3 py-3">{locationLabel(r.origin)}</td><td className="px-3 py-3">{locationLabel(r.destination)}</td><td className="px-3 py-3">{actorLabel(r.actor)}</td><td className="px-3 py-3">{r.quantity}</td></tr>)}{!filtered.length&&<tr><td colSpan={7} className="inv-muted px-4 py-8 text-center">No hay movimientos registrados para esta consulta.</td></tr>}</tbody></table><p className="inv-muted p-3 text-xs">{filtered.length} movimientos encontrados{filtered.length>200?' · Se muestran los primeros 200':''}.</p></div>}
 </section>
}
