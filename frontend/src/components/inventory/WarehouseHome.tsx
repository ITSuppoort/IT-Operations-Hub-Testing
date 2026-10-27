/* INV-FECHAS-ALMACEN-V5 */
"use client"
import { Fragment, useEffect, useMemo, useState } from 'react'
import WarehouseAssetEditor from './WarehouseAssetEditor'
import EquipmentDetailsF1 from './EquipmentDetailsF1'
import WarehouseMovementHistory from './WarehouseMovementHistory'
import { apiRequest } from '@/lib/api'
import { Package, Search, ArrowDownToLine, ArrowUpFromLine, CalendarClock, Eye, X, RefreshCcw, Plus, MapPin, Monitor, Laptop, Keyboard, Mouse, Printer, HardDrive, Headphones, Webcam, Boxes, Cpu, Database, Download, Trash2, MoreVertical, AlertTriangle } from 'lucide-react'
import type { EquipmentItem } from '@/context/InventoryContext'

type Props = { items: WarehouseAsset[]; state: 'loading'|'connected'|'error'; error: string; onEntry:()=>void; onExit:()=>void; onPlanning:()=>void; onNew:()=>void; onRefresh:()=>void }
export type WarehouseAsset = EquipmentItem & { apiId?: string; location?: string; assetTag?: string; rawStatus?: string; rawCondition?: string; assignedUser?: string }
const names: Record<string,string>={available:'Disponible',assigned:'En uso',damaged:'Dañado',repair:'En reparación',retired:'Retirado',returned:'Devuelto'}

const statusPillClass = (status:string)=>{
 const s=String(status||'').trim().toLowerCase()
 if(s==='available')return 'inv-status status-available'
 if(s==='assigned')return 'inv-status status-assigned'
 if(s==='damaged')return 'inv-status status-damaged'
 if(s==='repair')return 'inv-status status-repair'
 return 'inv-status'
}
const label=(e:WarehouseAsset)=>[e.brand,e.model].filter(Boolean).join(' ')||e.pcName||e.type||'Activo'
const assetVisual=(type:string)=>{const t=type.toLowerCase(); if(t.includes('laptop'))return {Icon:Laptop,tone:'blue'};if(t.includes('desktop')||t.includes('all in one'))return {Icon:Monitor,tone:'purple'};if(t.includes('monitor'))return {Icon:Monitor,tone:'amber'};if(t.includes('teclado')||t.includes('keyboard'))return {Icon:Keyboard,tone:'slate'};if(t.includes('mouse'))return {Icon:Mouse,tone:'cyan'};if(t.includes('impresora')||t.includes('printer'))return {Icon:Printer,tone:'indigo'};if(t.includes('ssd')||t.includes('hdd')||t.includes('disco'))return {Icon:HardDrive,tone:'blue'};if(t.includes('headset'))return {Icon:Headphones,tone:'rose'};return {Icon:Boxes,tone:'teal'}}
const count=(list:WarehouseAsset[])=>list.reduce((n,e)=>n+Math.max(1,Number(e.quantity)||1),0)
export default function WarehouseHome({items,state,error,onEntry,onExit,onPlanning,onNew,onRefresh}:Props){
 const [expandedProduct,setExpandedProduct]=useState<string|null>(null);const [warehouseView,setWarehouseView]=useState<'inventory'|'history'>('inventory');const [resolving,setResolving]=useState(false);const [resolveError,setResolveError]=useState('');const [query,setQuery]=useState('');const [type,setType]=useState('');const [status,setStatus]=useState('');const [page,setPage]=useState(1);const [selected,setSelected]=useState<WarehouseAsset|null>(null);const [editing,setEditing]=useState(false); const [detailsOpen,setDetailsOpen]=useState(false)
 const [actionMenu,setActionMenu]=useState<string|null>(null)
 const [deleting,setDeleting]=useState(false)
 const [confirmDelete,setConfirmDelete]=useState(false)
 // Los saldos son la fuente real de disponibilidad; Equipment.quantity indica el total adquirido.
 const [stockLedger,setStockLedger] = useState<Map<string,{available:number;production:number;reconciled:boolean}>|null>(null)
 const [allocations,setAllocations] = useState<Array<{id:string;equipmentId:string;code:string;role:string;quantity:number}>>([])
 const [stockError,setStockError] = useState('')
 useEffect(()=>{
  let active=true
  const load=async()=>{
   try {
    const [catalogResponse,assignedResponse]=await Promise.all([apiRequest('/position-lots/catalog'),apiRequest('/position-lots/assigned')])
    if(!catalogResponse.ok||!assignedResponse.ok)throw new Error('No se pudo consultar saldos/asignaciones')
    const [catalog,assigned]:unknown[]=await Promise.all([catalogResponse.json(),assignedResponse.json()])
    if(!Array.isArray(catalog)||!Array.isArray(assigned))throw new Error('Formato de saldos inesperado')
    const ledger=new Map<string,{available:number;production:number;reconciled:boolean}>()
    for(const row of catalog){
     if(!row||typeof row!=='object')continue
     const x=row as Record<string,unknown>
     if(typeof x.id!=='string')continue
     ledger.set(x.id.toLowerCase(),{available:Math.max(0,Number(x.available)||0),production:Math.max(0,Number(x.production)||0),reconciled:x.reconciled===true})
    }
    const ass=assigned.filter((row):row is {id:string;equipmentId:string;code:string;role:string;quantity:number}=>{
     if(!row||typeof row!=='object')return false
     const x=row as Record<string,unknown>
     return typeof x.id==='string'&&typeof x.equipmentId==='string'&&typeof x.code==='string'
    })
    if(active){setStockLedger(ledger);setAllocations(ass);setStockError('')}
   }catch(e){if(active){setStockLedger(null);setAllocations([]);setStockError(e instanceof Error?e.message:'No se pudieron leer los saldos')}}
  }
  void load()
  const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void load()},15000)
  const onFocus=()=>{void load()}
  window.addEventListener('focus',onFocus)
  return()=>{active=false;window.clearInterval(timer);window.removeEventListener('focus',onFocus)}
 },[items])
 const stockFor=(asset:WarehouseAsset)=>stockLedger?.get(String(asset.apiId||'').toLowerCase())
 const quantities=(assets:WarehouseAsset[])=>assets.reduce((sum,asset)=>{
  const raw=Math.max(0,Number(asset.quantity)||0)
  const stock=stockFor(asset)
  return {total:sum.total+raw,available:sum.available+(stock?.reconciled?stock.available:asset.status==='available'?raw:0),production:sum.production+(stock?.reconciled?stock.production:asset.status==='assigned'?raw:0),unreconciled:sum.unreconciled+(!stock?.reconciled?raw:0)}
 },{total:0,available:0,production:0,unreconciled:0})

 const [verifiedMissing,setVerifiedMissing]=useState<string[]>([])
 const [pendingChecks,setPendingChecks]=useState<string[]>([])
 // El listado puede conservar lotes retirados; comprobar su ficha contra GET /equipment/:id.
 // No ocultar un equipo por 401/403/500 o fallo de conexión.
 const candidatesToVerify=useMemo(()=>items.filter(item=>
   Number(item.quantity)>1 && !String(item.serial||'').trim() &&
   /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(item.apiId||''))
 ).map(item=>String(item.apiId)),[items])
 const candidateKey=candidatesToVerify.join('|')
 useEffect(()=>{
  let active=true
  const ids=candidateKey?candidateKey.split('|'):[]
  setPendingChecks(ids)
  setVerifiedMissing([])
  if(!ids.length)return ()=>{active=false}
  void (async()=>{
   const missing:string[]=[]
   await Promise.all(ids.map(async id=>{
    try{
     const response=await apiRequest(`/equipment/${encodeURIComponent(id)}`)
     if(response.status===404){missing.push(id)}
    }catch{ /* Una caída de red nunca elimina activos de la vista. */ }
   }))
   if(active){setVerifiedMissing(missing);setPendingChecks([])}
  })()
  return ()=>{active=false}
 },[candidateKey])
 // Este UUID fue eliminado y comprobado mediante Prisma y GET /equipment/:id (404).
 // Proteccion de interfaz mientras se corrige el listado remoto. No afecta otras fichas.
 const retiredLegacyId='4e9cb2c2-6d38-4a79-97df-e85d696d041'
 const visibleItems=useMemo(()=>items.filter(item=>{
  const id=String(item.apiId||'').trim().toLowerCase()
  return String(item.type||'').trim().toLowerCase()!=='mouse' && id!==retiredLegacyId && !verifiedMissing.includes(id) && !pendingChecks.includes(id)
 }),[items,verifiedMissing,pendingChecks])
 useEffect(()=>{
  if(selected?.apiId && verifiedMissing.includes(selected.apiId)){
   setSelected(null);setConfirmDelete(false);setEditing(false);setDetailsOpen(false)
  }
  if(expandedProduct && !visibleItems.some(item=>{
   const normalized=(value:string|undefined)=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()
   const individual=Boolean(item.serial?.trim())&&!['desktop','laptop','all in one'].includes(normalized(item.type))
   const key=individual?'individual:'+String(item.apiId||item.assetTag||item.serial||item.id):'producto:'+JSON.stringify([normalized(item.type),normalized(item.brand),normalized(item.model)])
   return key===expandedProduct
  }))setExpandedProduct(null)
 },[verifiedMissing,visibleItems,selected?.apiId,expandedProduct])
 async function deleteSelected(){
  if(!selected?.apiId || deleting)return;
  const uuid=selected.apiId;
  setConfirmDelete(false);
  setDeleting(true);setResolveError('');
  try{
   const response=await apiRequest(`/equipment/${encodeURIComponent(uuid)}`,{
    method:'DELETE',headers:{'x-confirm-delete-asset-id':uuid}
   });
   const payload=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(response.status===409?'No se puede eliminar: la ficha tiene historial, saldos o asignaciones. Debe retirarse del inventario activo mediante un proceso controlado.':(payload.message||`HTTP ${response.status}`));
   setSelected(null);setExpandedProduct(null);onRefresh();
  }catch(err){setResolveError(err instanceof Error?err.message:'No se pudo eliminar');}
  finally{setDeleting(false)}
 }
 async function openAsset(e: WarehouseAsset){
  setSelected(e);setEditing(false);setResolveError('')
  // Validar el UUID directamente contra la API, sin inventar IDs.
  setResolving(true)
  try {
   const response=await apiRequest('/equipment')
   if(!response.ok)throw new Error('No se pudo verificar el equipo. HTTP '+response.status)
   const raw:unknown=await response.json()
   if(!Array.isArray(raw))throw new Error('El servidor no devolvió una lista válida.')
   const candidates=raw.filter((v):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)).filter(v=>{
    const serial=String(v.serial||'').trim()
    const tag=String(v.assetTag||'').trim()
    const code=String(v.pcName||'').trim()
    if(e.serial&&serial&&e.serial.trim()===serial)return true
    if(e.assetTag&&tag&&e.assetTag.trim()===tag)return true
    return !!(e.pcName&&code&&e.pcName.trim()===code)
   })
   if(candidates.length!==1){setResolveError(candidates.length?'Identificación ambigua. No se habilita la edición.':'No se pudo identificar el equipo de forma única.');return}
   const actual=candidates[0]
   const uuid=typeof actual.id==='string'?actual.id.trim():''
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)){
    setResolveError('La API no devuelve un identificador UUID válido. Edición bloqueada.');return
   }
   setSelected(previous=>previous?{...previous,apiId:uuid,assetTag:String(actual.assetTag||''),location:String(actual.location||''),rawStatus:String(actual.status||''),brand:String(actual.brand||''),model:String(actual.model||''),serial:String(actual.serial||''),pcName:String(actual.pcName||''),type:String(actual.type||'')||'Sin clasificar'}:null)
  }catch(error){setResolveError(error instanceof Error?error.message:'No fue posible verificar el equipo.')}
  finally{setResolving(false)}
 }
 const types=useMemo(()=>[...new Set(visibleItems.map(e=>e.type||'Sin clasificar'))].sort(),[visibleItems])
 const filtered=useMemo(()=>visibleItems.filter(e=>(!type||e.type===type)&&(!status||e.status===status)&&[e.pcName,e.brand,e.model,e.type,e.serial,e.assetTag,String(e.id)].join(' ').toLowerCase().includes(query.toLowerCase().trim())),[visibleItems,type,status,query])
   // Consolidacion visual: un producto por tipo + marca + modelo. No muta registros ni saldos.
  // Unidades con serial y equipos principales conservan su ficha individual.
  const productRows=useMemo(()=>{
    const groups=new Map<string,{key:string;items:WarehouseAsset[];quantity:number}>()
    const norm=(value:string|undefined)=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()
    for(const e of filtered){
      const individual=Boolean(e.serial?.trim())&&!['desktop','laptop','all in one'].includes(norm(e.type))
      const key=individual?'individual:'+String(e.apiId||e.assetTag||e.serial||e.id):'producto:'+JSON.stringify([norm(e.type),norm(e.brand),norm(e.model)])
      const group=groups.get(key)||{key,items:[],quantity:0}
      group.items.push(e)
      group.quantity+=Math.max(0,Number(e.quantity)||0)
      groups.set(key,group)
    }
    return [...groups.values()]
  },[filtered])
  const totalPages=Math.max(1,Math.ceil(productRows.length/20));const safePage=Math.min(page,totalPages)
 const totals=quantities(visibleItems)
 const stat=[{text:'Registrados',value:totals.total,tone:'blue'},{text:'Disponibles',value:stockLedger?totals.available:0,tone:'teal'},{text:'En uso',value:stockLedger?totals.production:0,tone:'purple'},{text:'Otros estados',value:count(visibleItems.filter(e=>!['assigned','available'].includes(e.status))),tone:'amber'}]
 const summaryCards=useMemo(()=>{
  const normalize=(value:string|undefined)=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()
  const specs=[
   {label:'Desktop', match:['desktop'], tone:'sky', Icon:Monitor},
   {label:'All in One', match:['all in one'], tone:'violet', Icon:Monitor},
   {label:'Laptop', match:['laptop'], tone:'emerald', Icon:Laptop},
   {label:'Monitor', match:['monitor'], tone:'amber', Icon:Monitor},
   {label:'Teclado', match:['teclado','keyboard'], tone:'rose', Icon:Keyboard},
   {label:'Headset', match:['headset'], tone:'purple', Icon:Headphones},
  ]
  return specs.map(spec=>({
   ...spec,
   total:visibleItems.reduce((sum,item)=>spec.match.some(token=>normalize(item.type).includes(token))?sum+Math.max(0,Number(item.quantity)||0):sum,0)
  }))
 },[visibleItems])
 return <div className="inv-warehouse-v5 mt-3 space-y-3">

  <style jsx>{`
   .inv-status{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.12);font-weight:700;font-size:12px}
   .inv-status::before{content:'';width:9px;height:9px;border-radius:999px;background:currentColor;box-shadow:0 0 0 4px rgba(255,255,255,.05)}
   .status-available{color:#34d399;background:rgba(16,185,129,.10);border-color:rgba(52,211,153,.28)}
   .status-assigned{color:#60a5fa;background:rgba(59,130,246,.12);border-color:rgba(96,165,250,.28)}
   .status-damaged{color:#fb7185;background:rgba(244,63,94,.12);border-color:rgba(251,113,133,.28)}
   .status-repair{color:#fbbf24;background:rgba(251,191,36,.12);border-color:rgba(251,191,36,.28)}
   .inv-mini-card{position:relative;overflow:hidden;border:1px solid rgba(148,163,184,.2);background:linear-gradient(180deg,rgba(12,26,48,.96),rgba(9,18,35,.92));box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 12px 28px rgba(2,8,23,.22);transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease}
   .inv-mini-card:hover{transform:translateY(-2px);box-shadow:0 16px 32px rgba(8,47,73,.28), inset 0 1px 0 rgba(255,255,255,.08)}
   .inv-mini-card::after{content:'';position:absolute;inset:auto -20% -55% auto;width:120px;height:120px;border-radius:999px;filter:blur(10px);opacity:.16;background:currentColor}
   .inv-mini-icon{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:12px;border:1px solid currentColor;background:rgba(15,23,42,.55);box-shadow:0 0 0 1px rgba(255,255,255,.03),0 0 20px color-mix(in srgb,currentColor 28%,transparent)}
   .tone-sky{color:#38bdf8}.tone-violet{color:#a78bfa}.tone-emerald{color:#34d399}.tone-amber{color:#fbbf24}.tone-rose{color:#f472b6}.tone-purple{color:#c084fc}
   .inv-quick-action{display:flex;width:100%;align-items:center;gap:12px;border-radius:14px;border:1px solid rgba(255,255,255,.08);padding:10px 12px;text-align:left;font-size:12px;font-weight:700;transition:transform .14s ease, box-shadow .14s ease, background .14s ease, border-color .14s ease}
   .inv-quick-action:hover{transform:translateY(-1px);background:rgba(255,255,255,.08)}
   .inv-quick-action:active{transform:translateY(1px) scale(.985);box-shadow:inset 0 2px 10px rgba(0,0,0,.28)}
   .inv-quick-action-icon{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:999px;border:1px solid currentColor;background:rgba(15,23,42,.65);box-shadow:0 0 0 1px rgba(255,255,255,.04),0 0 18px currentColor, inset 0 0 14px rgba(255,255,255,.08);transition:transform .14s ease, box-shadow .14s ease}
   .inv-quick-action:hover .inv-quick-action-icon{transform:scale(1.06);box-shadow:0 0 0 1px rgba(255,255,255,.06),0 0 24px currentColor, inset 0 0 18px rgba(255,255,255,.12)}
   .inv-quick-action-add{color:#6ee7b7}
   .inv-quick-action-damage{color:#fda4af}
  `}</style>

  <div className="inv-warehouse-kpi-grid grid grid-cols-2 gap-3 lg:grid-cols-4">{stat.map((s,i)=>{const KpiIcon=[Database,Package,Monitor,Boxes][i];return <div key={s.text} className={'inv-panel inv-kpi inv-'+s.tone+' inv-kpi-v4-card'}><span className="inv-kpi-v4-icon" aria-hidden="true"><KpiIcon size={19}/></span><div className="inv-kpi-v4-main"><span className="inv-kpi-v4-label">{s.text}</span><div className="inv-kpi-v4-row"><strong className="inv-kpi-v4-number">{state==='connected'&&(i===0||stockLedger)?s.value.toLocaleString('es-DO'):'—'}</strong><span className="inv-kpi-v4-bars" aria-hidden="true">{[0,1,2,3,4,5].map(n=><i key={n}/>)}</span></div></div></div>})}</div>
  <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">{summaryCards.map(card=>{const {Icon}=card;return <div key={card.label} className={'inv-mini-card tone-'+card.tone+' rounded-2xl p-3'}><div className="mb-3 flex items-center justify-between gap-2"><span className="inv-mini-icon"><Icon size={18}/></span><span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Total</span></div><div className="space-y-1"><div className="text-sm font-semibold text-slate-100">{card.label}</div><div className="flex items-end justify-between gap-2"><strong className="text-2xl leading-none text-white">{card.total.toLocaleString('es-DO')}</strong><span className="text-[11px] text-slate-400">unidades</span></div></div></div>})}</div>
  {stockError&&<p role="status" className="mx-1 text-xs text-amber-300">Existencias no verificadas: {stockError}. No se mostraran cantidades estimadas como saldos reales.</p>}
  {stockLedger&&totals.unreconciled>0&&<p role="status" className="mx-1 text-xs text-amber-300">{totals.unreconciled} unidades sin conciliacion de saldos. Verifica el motor de existencias antes de asignarlas.</p>}
  <section className="inv-panel inv-f4-premium overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="flex items-center gap-3"><div className="inv-f4-logo"><Database size={23}/></div><div><h2 className="font-extrabold text-lg">Inventario de activos</h2><p className="inv-muted mt-1 text-xs">Catálogo general de activos y existencias reales.</p></div></div><div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Almacén">
    <button type="button" role="tab" aria-selected={warehouseView==='inventory'} className={'inv-btn '+(warehouseView==='inventory'?'inv-primary':'')} onClick={()=>setWarehouseView('inventory')}><Database size={15}/> Inventario</button>
    <button type="button" className="inv-btn" onClick={onRefresh}><RefreshCcw size={15}/> Actualizar</button>
  </div>
  {warehouseView==='inventory'&&<div className="flex flex-wrap gap-2"><label className="inv-search flex items-center gap-2"><Search size={15}/><input placeholder="PCNAME, serial, modelo..." value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}}/></label><select className="inv-table-select" value={type} onChange={e=>{setType(e.target.value);setPage(1)}}><option value="">Todas las categorías</option>{types.map(t=><option key={t} value={t}>{t}</option>)}</select><select className="inv-table-select" value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}><option value="">Todos los estados</option>{Object.entries(names).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>}</div>
  {warehouseView==='inventory' ? <>
  {state!=='connected'?<p className="inv-muted px-5 py-8 text-sm">{state==='loading'?'Consultando equipos...':'No se pudo consultar /equipment: '+error}</p>:<><div className="overflow-x-auto"><table className="inv-table inv-table-modern w-full min-w-[820px] text-left text-xs"><thead><tr>{['Producto','Activo','Categoría','Unidades','Ubicación','Estado','Acciones'].map(h=><th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody>{productRows.slice((safePage-1)*20,safePage*20).map(({key,items:records,quantity})=>{
    const e=records[0]
    const groupStock=quantities(records)
    const groupAllocations=allocations.filter(a=>records.some(r=>String(r.apiId||'').toLowerCase()===a.equipmentId.toLowerCase()))
    const locations=[...new Set(records.map(r=>r.location||'No registrada'))]
    const statuses=[...new Set(records.map(r=>r.status))]
    return <Fragment key={key}><tr><td className="px-4 py-3 font-mono">{records.length===1&&Boolean(e.serial)?(e.pcName||e.assetTag||'Producto individual'):'Producto consolidado'}</td><td className="px-4 py-3"><div className="flex items-center gap-2"><span className={'inv-f4-asset-icon inv-f4-tone-'+assetVisual(e.type||'').tone}>{(()=>{const {Icon}=assetVisual(e.type||'');return <Icon size={19}/>})()}</span><strong>{label(e)}</strong></div><div className="inv-muted">{records.length>1?`${records.length} entradas del mismo producto`:e.serial?'Serial: '+e.serial:'Sin serial'}</div></td><td className="px-4 py-3"><span className={'inv-f4-chip inv-f4-tone-'+assetVisual(e.type||'').tone}>{e.type||'Sin categoría'}</span></td><td className="px-4 py-3"><div className="flex w-max overflow-hidden rounded-lg border border-sky-300/15 bg-[#0b203e] text-center"><div className="min-w-[56px] px-2 py-1"><strong className="block text-sm text-white">{quantity}</strong><span className="text-[10px] text-slate-300">Total</span></div><div className="min-w-[65px] border-l border-white/10 px-2 py-1"><strong className="block text-sm text-emerald-300">{stockLedger?groupStock.available:'—'}</strong><span className="text-[10px] text-emerald-200">Disponibles</span></div><div className="min-w-[56px] border-l border-white/10 px-2 py-1"><strong className="block text-sm text-sky-300">{stockLedger?groupStock.production:'—'}</strong><span className="text-[10px] text-sky-200">En uso</span></div></div>{stockLedger&&groupStock.unreconciled>0&&<div className="mt-1 text-[11px] text-amber-300">{groupStock.unreconciled} sin conciliar</div>}</td><td className="inv-muted px-4 py-3">{locations.length===1?locations[0]:'Varias / sin confirmar'}</td><td className="px-4 py-3">{stockLedger&&groupStock.unreconciled>0?<span className="inline-flex rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-amber-200">Por conciliar</span>:stockLedger&&groupStock.available>0&&groupStock.production>0?<span className="inline-flex rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-amber-200">Disponibilidad parcial</span>:stockLedger&&groupStock.available===0&&groupStock.production>0?<span className="inline-flex rounded-full border border-sky-400/40 bg-sky-500/10 px-3 py-1 text-sky-200">Todo en uso</span>:statuses.length===1?<span className={'inv-status status-'+e.status}>{names[e.status]||e.status}</span>:<span className="inv-muted">Estados mixtos</span>}</td><td className="px-4 py-3"><div className="flex items-center gap-2"><button type="button" className="inv-btn whitespace-nowrap" title="Consultar unidades y ubicación" onClick={()=>{setActionMenu(null);setExpandedProduct(current=>current===key?null:key)}}><Eye size={15}/>{expandedProduct===key?' Cerrar':' Ver unidades'}</button><div className="relative"><button type="button" className="inv-btn" aria-label={'Más acciones para '+label(e)} aria-expanded={actionMenu===key} aria-haspopup="menu" title="Más acciones" onClick={()=>setActionMenu(current=>current===key?null:key)}><MoreVertical size={16}/></button>{actionMenu===key&&<div role="menu" className="absolute right-0 top-full z-50 mt-1 w-60 rounded-2xl border border-sky-400/30 bg-[#101e35] p-2 shadow-2xl backdrop-blur"><button type="button" role="menuitem" className="inv-quick-action inv-quick-action-add" onClick={()=>{setActionMenu(null);onNew()}}><span className="inv-quick-action-icon"><Plus size={15}/></span><span>Agregar dispositivos</span></button><button type="button" role="menuitem" className="inv-quick-action inv-quick-action-damage mt-1.5" onClick={()=>{setActionMenu(null);window.location.assign('/maintenance')}}><span className="inv-quick-action-icon"><AlertTriangle size={15}/></span><span>Reportar equipo dañado</span></button></div>}</div></div></td></tr>{expandedProduct===key&&<tr key={key+":details"}><td colSpan={7} className="p-0 bg-[#08182e]">{(()=>{
       const first=records[0]
       const machines=['desktop','laptop','all in one'].includes(String(first.type||'').trim().toLowerCase())
              const total=quantity
       const shown=records.flatMap((asset)=>Array.from({length:Math.min(Math.max(0,Number(asset.quantity)||0),1000)},(_,index)=>({asset,index}))).slice(0,200)
       return <div className="mx-2 my-2 rounded-xl border border-cyan-400/30 bg-[#0c1930] p-4 shadow-xl">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold text-slate-100">Detalle del producto: {label(first)}</h3><p className="text-xs text-slate-400">{total} unidades globales · {records.length} fichas originales · Agrupación por categoría, marca y modelo</p></div><button className="inv-btn" onClick={()=>setExpandedProduct(null)}><X size={14}/> Cerrar detalle</button></div>
        <div className="mb-3 text-xs text-slate-200">Total: {groupStock.total} · Disponibles: {stockLedger?groupStock.available:'Sin verificar'} · En uso: {stockLedger?groupStock.production:'Sin verificar'}</div>
        {groupAllocations.length>0&&<div className="mb-3 rounded-lg border border-sky-400/20 bg-sky-500/10 p-3"><strong className="text-xs text-sky-200">Unidades asignadas a posiciones</strong><ul className="mt-2 space-y-1 text-xs text-slate-200">{groupAllocations.map(a=><li key={a.id}>Posicion {a.code} · Equipo {a.equipmentId.slice(0,8)}… · Asignacion {a.id.slice(0,8)}…</li>)}</ul></div>}
        <p className="mb-3 rounded-lg border border-blue-400/20 bg-blue-500/10 p-2 text-xs text-blue-200">{machines?'Cada computadora conserva su PCNAME y número de serie individual.':'Las unidades sin serial son solo una vista del lote. Sus estados y ubicaciones individuales NO están verificados; las asignaciones se conectarán en la próxima integración. Los códigos definitivos requieren integración con el motor de existencias.'}</p>
        <div className="max-h-[360px] overflow-auto rounded-xl border border-white/10"><table className="w-full min-w-[760px] text-left text-xs"><thead className="sticky top-0 bg-[#1b2c4d] text-slate-300"><tr>{['Referencia / PCNAME','Serial de fábrica','Modelo','Estado','Ubicación registrada','Acción'].map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>
        {machines?records.map((asset,i)=><tr className="border-t border-white/10" key={String(asset.apiId||asset.id)+'-'+i}><td className="p-3 font-semibold">{asset.pcName||asset.assetTag||'PC sin código'}</td><td className="p-3">{asset.serial||'No registrado'}</td><td className="p-3">{asset.model||'Sin modelo'}</td><td className="p-3"><span className={statusPillClass(asset.status)}>{names[asset.status]||asset.status}</span></td><td className="p-3">{asset.location||'No registrada'}</td><td className="p-3"><button className="inv-btn" onClick={()=>void openAsset(asset)}><Eye size={13}/> Ver</button></td></tr>):shown.map(({asset,index},i)=><tr className="border-t border-white/10" key={String(asset.apiId||asset.id)+'-'+index}><td className="p-3 font-mono text-sky-300">{Number(asset.quantity)===1?String(asset.apiId||asset.assetTag||'Unidad sin ID').slice(0,14):`Unidad ${String(i+1).padStart(5,'0')}`} {Number(asset.quantity)>1&&<span className="text-slate-500">(vista)</span>}</td><td className="p-3">{asset.serial||'Sin serial'}</td><td className="p-3">{asset.model||'Sin modelo'}</td><td className="p-3">{(()=>{const a=allocations.filter(x=>x.equipmentId.toLowerCase()===String(asset.apiId||'').toLowerCase())[index];return <span className={statusPillClass(a?'assigned':asset.status)}>{a?'En uso':names[asset.status]||asset.status}</span>})()}</td><td className="p-3">{allocations.filter(x=>x.equipmentId.toLowerCase()===String(asset.apiId||'').toLowerCase())[index]?.code||asset.location||'Pendiente de ubicación'}</td><td className="p-3"><button className="inv-btn" onClick={()=>void openAsset(asset)}><Eye size={13}/> Ver</button></td></tr>)}
        </tbody></table></div>
        {!machines&&total>shown.length&&<p className="mt-2 text-xs text-amber-300">Vista limitada a {shown.length} de {total} unidades; no se crean miles de registros en el navegador.</p>}
       </div>
      })()}</td></tr>}</Fragment>
  })}{!productRows.length&&<tr><td colSpan={7} className="inv-muted px-4 py-10 text-center">No hay equipos para estos filtros.</td></tr>}</tbody></table></div><div className="flex items-center justify-between gap-3 p-4 text-xs"><span className="inv-muted">{productRows.length} productos · Página {safePage} de {totalPages}</span><div className="flex gap-2"><button className="inv-btn" disabled={safePage===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Anterior</button><button className="inv-btn" disabled={safePage===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Siguiente</button></div></div></>}
</> : <div className="p-3 sm:p-4"><WarehouseMovementHistory/></div>}
  </section>
  {detailsOpen&&selected&&<EquipmentDetailsF1 pcName={selected.pcName} serial={selected.serial} onClose={()=>setDetailsOpen(false)}/>} 
  {editing&&selected&&<WarehouseAssetEditor item={selected} onCancel={()=>setEditing(false)} onSaved={()=>{setEditing(false);setSelected(null);onRefresh()}}/>}
  {confirmDelete && selected && <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/75 p-4" role="presentation">
    <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#13213a] p-6 text-slate-100 shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="delete-confirm-title" aria-describedby="delete-confirm-description">
      <div className="mb-3 flex items-center gap-2 text-rose-300"><Trash2 size={20}/><h3 id="delete-confirm-title" className="text-lg font-bold">¿Eliminar ficha?</h3></div>
      <p id="delete-confirm-description" className="text-sm text-slate-200">Vas a eliminar <strong>{label(selected)}</strong>. Esta acción solo es posible si no tiene historial, existencias registradas ni vínculos a posiciones.</p>
      <p className="mt-2 text-xs text-amber-200">Si tiene dependencias, el servidor bloqueará la eliminación para proteger el inventario.</p>
      <div className="mt-5 flex justify-end gap-3">
        <button type="button" className="inv-btn" disabled={deleting} onClick={()=>setConfirmDelete(false)}>Cancelar</button>
        <button type="button" className="inv-btn border border-rose-500 bg-rose-600 text-white" disabled={deleting} onClick={()=>void deleteSelected()}>{deleting?'Eliminando...':'Sí, eliminar'}</button>
      </div>
    </div>
  </div>}
  {selected&&!editing&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><div className="inv-panel w-full max-w-xl p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label="Ficha de activo"><div className="flex justify-between gap-3"><div><h3 className="text-xl font-extrabold">{label(selected)}</h3><p className="inv-muted text-xs">Ficha de consulta · sin cambios de datos</p></div><button className="inv-btn" onClick={()=>{setSelected(null);setEditing(false)}} aria-label="Cerrar"><X size={17}/></button></div><div className="mt-5 grid grid-cols-2 gap-3 text-sm">{[['PCNAME',selected.pcName||selected.assetTag||'No registrado'],['Serial',selected.serial||'No registrado'],['Categoría',selected.type],['Unidades',String(selected.quantity||1)],['Estado',names[selected.status]||selected.status],['Ubicación',selected.location||'No registrada'],['Marca',selected.brand||'No registrada'],['Modelo',selected.model||'No registrado']].map(([k,v])=><div key={k} className="rounded-xl border border-white/10 p-3"><div className="inv-muted text-xs">{k}</div><strong>{v}</strong></div>)}</div><div className="mt-4 flex flex-wrap items-center gap-2"><button type="button" className="inv-btn" onClick={()=>setDetailsOpen(true)}>Ver capacidades y fechas</button><button type="button" className="inv-btn inv-primary" disabled={!selected.apiId||resolving} onClick={()=>setEditing(true)}>Editar ficha</button><button type="button" className="inv-btn border border-rose-500/50 text-rose-300" disabled={!selected.apiId||resolving||deleting} onClick={()=>setConfirmDelete(true)}><Trash2 size={14}/>{deleting?"Eliminando...":"Eliminar ficha"}</button>{resolving&&<span className="inv-muted text-xs">Verificando equipo...</span>}{resolveError&&<span className="text-red-400 text-xs">{resolveError}</span>}{!resolving&&!resolveError&&!selected.apiId&&<span className="inv-muted text-xs">No se recibió un UUID válido.</span>}</div><p className="inv-muted mt-3 text-xs"><MapPin size={13} className="inline"/> Estado de producción, daños y reparaciones se administran desde sus operaciones correspondientes.</p></div></div>}
 </div>
}
