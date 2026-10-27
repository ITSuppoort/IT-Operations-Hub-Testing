'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, ClipboardList, Clock3, RefreshCw, Search, ShieldAlert, Wrench, X, PlusCircle, Download, Monitor, Laptop, Mouse, Keyboard, Headphones, Eye } from 'lucide-react'
import { apiRequest } from '@/lib/api'

type DamageRecord = {
  id: string
  equipmentId: string
  type: string
  description: string
  status: string
  priority: string
  reportedBy: string | null
  reportedAt: string
  repairedAt: string | null
  repairedBy: string | null
  repairNotes: string | null
  equipment?: { type?: string | null; brand?: string | null; model?: string | null; serial?: string | null; pcName?: string | null; quantity?: number; location?: string | null; status?: string | null } | null
}
const activeStatuses = ['OPEN', 'PENDING', 'IN_PROGRESS', 'REPAIR', 'IN_REPAIR', 'DIAGNOSIS']
const closedStatuses = ['RESOLVED', 'REPAIRED', 'CLOSED', 'COMPLETED']
const clean = (s: unknown) => String(s ?? '').trim().toUpperCase()
const labelStatus = (s: string) => ({ OPEN:'Abierto',PENDING:'Pendiente',IN_PROGRESS:'En proceso',REPAIR:'En reparación',IN_REPAIR:'En reparación',DIAGNOSIS:'En diagnóstico',RESOLVED:'Resuelto',REPAIRED:'Reparado',CLOSED:'Cerrado',COMPLETED:'Completado' } as Record<string,string>)[clean(s)] || s
const labelPriority = (s: string) => ({ LOW:'Baja',MEDIUM:'Media',HIGH:'Alta',CRITICAL:'Crítica' } as Record<string,string>)[clean(s)] || s
const formatDate = (value?: string | null) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleString('es-DO') : 'No registrada'
const equipmentTitle = (d: DamageRecord) => [d.equipment?.brand, d.equipment?.model].filter(Boolean).join(' ') || d.equipment?.pcName || d.equipment?.type || 'Activo no identificado'

// Barras segmentadas: cada segmento refleja la proporción respecto a su referencia.
function SegmentedBar({value,maximum,tone}:{value:number;maximum:number;tone:string}) {
  const filled = value>0 ? Math.max(1,Math.ceil(Math.min(1,value/Math.max(1,maximum))*8)) : 0
  return <div role="meter" aria-valuemin={0} aria-valuemax={Math.max(1,maximum)} aria-valuenow={Math.min(value,Math.max(1,maximum))} className="mt-2 flex gap-1" aria-label={`${value} de ${maximum}`}>
    {Array.from({length:8},(_,i)=><span key={i} className={`h-2 w-2.5 rounded-[2px] ${i<filled?tone:'bg-slate-700/80'}`}/>)}
  </div>
}

export default function Repairs() {
  const [damages, setDamages] = useState<DamageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all'|'active'|'closed'>('all')
  const [selected, setSelected] = useState<DamageRecord | null>(null)
  const [editing, setEditing] = useState(false)
  const [editDraft, setEditDraft] = useState({type:'',description:'',priority:'MEDIUM',reportedBy:'',repairedBy:'',repairNotes:''})
  const [actionSaving,setActionSaving] = useState(false)
  const [actionError,setActionError] = useState('')
  const [actionReason,setActionReason] = useState('')
  const [historyRows,setHistoryRows] = useState<{id:string;action:string;description:string|null;createdAt:string}[]>([])
  const [showHistory,setShowHistory] = useState(false)
  const [editSaving,setEditSaving] = useState(false)
  const [editError,setEditError] = useState('')
  const openDetail = (d:DamageRecord) => {
    setSelected(d);setEditing(false);setEditError('');setActionError('');setActionReason('');setHistoryRows([]);setShowHistory(false)
    setEditDraft({type:d.type,description:d.description||'',priority:d.priority||'MEDIUM',reportedBy:d.reportedBy||'',repairedBy:d.repairedBy||'',repairNotes:d.repairNotes||''})
  }
  const saveDetail = async () => {
    if (!selected) return
    setEditSaving(true);setEditError('')
    try {
      const response=await apiRequest(`/damages/${encodeURIComponent(selected.id)}/metadata`,{method:'PATCH',body:JSON.stringify(editDraft)})
      if (!response.ok) {const data=await response.json().catch(()=>({}));throw new Error(data.message||`HTTP ${response.status}`)}
      const updated=await response.json() as DamageRecord
      setSelected(updated);setEditing(false)
      await refresh()
    } catch(e) {setEditError(e instanceof Error?e.message:'No se pudieron guardar los cambios')}
    finally {setEditSaving(false)}
  }
  const runTransition = async (action:'REPAIR'|'AVAILABLE'|'RETIRE') => {
    if(!selected || actionSaving) return
    if(action==='RETIRE' && actionReason.trim().length<12){setActionError('Introduce un motivo de baja de al menos 12 caracteres.');return}
    const message=action==='REPAIR'?'¿Confirmas que el equipo fue reparado? Permanecera como dañado hasta que se devuelva a disponible.':action==='AVAILABLE'?'¿Confirmas que el equipo paso las pruebas y vuelve a disponible en Almacen IT?':'¿Confirmas la baja definitiva? El equipo se retirara del inventario operativo. No se puede deshacer desde esta pantalla.'
    if(!window.confirm(message)) return
    setActionSaving(true);setActionError('')
    try {
      const response=await apiRequest(`/damages/${encodeURIComponent(selected.id)}/transition`,{method:'POST',body:JSON.stringify({action,reason:actionReason})})
      const body=await response.json().catch(()=>({}))
      if(!response.ok) throw new Error(body.message||`HTTP ${response.status}`)
      setSelected(body as DamageRecord);setActionReason('');await refresh()
      if(showHistory) await loadHistory(selected.id)
    }catch(e){setActionError(e instanceof Error?e.message:'No se pudo completar la operacion')}
    finally{setActionSaving(false)}
  }
  const loadHistory = async(id:string) => {
    setActionError('')
    try{
      const response=await apiRequest(`/damages/${encodeURIComponent(id)}/history`)
      if(!response.ok) throw new Error(`HTTP ${response.status}`)
      const rows=await response.json()
      if(!Array.isArray(rows)) throw new Error('Respuesta de historial invalida')
      setHistoryRows(rows);setShowHistory(true)
    }catch(e){setActionError(e instanceof Error?e.message:'Error cargando historial')}
  }
  const [draftOpen, setDraftOpen] = useState(false)
  const [draftType, setDraftType] = useState('Desktop / All in One')
  const [draftFaults, setDraftFaults] = useState<string[]>([])
  const [draftNotes, setDraftNotes] = useState('')
  const [draftPriority, setDraftPriority] = useState('MEDIUM')
  const [draftEquipment, setDraftEquipment] = useState('')
  const [assets,setAssets] = useState<{id:string;name:string;quantity:number;type:string;status:string;serial:string}[]>([])
  const [lotBalance,setLotBalance]=useState<Record<string,number>>({})
  const [lotSource,setLotSource]=useState<'PRODUCTION'|'WAREHOUSE_AVAILABLE'>('PRODUCTION')
  const [lotQty,setLotQty]=useState(1)
  const [lotTicket,setLotTicket]=useState('')
  const [saving,setSaving] = useState(false)
  const [saveError,setSaveError] = useState('')
  const [draftLocation, setDraftLocation] = useState('Almacén IT')
  const [extraFilter, setExtraFilter] = useState<'all'|'priority'|'repairable'|'irreparable'>('all')
  const failureOptions: Record<string,string[]> = {
    'Desktop / All in One':['No enciende','No da video','Disco / SSD dañado','Memoria RAM','Fuente de poder','Sobrecalentamiento','Puertos dañados','Sistema operativo','Daño físico','Otro'],
    Laptop:['No enciende','Pantalla dañada','Batería','Cargador','Teclado','Disco / SSD','Sobrecalentamiento','Bisagra / carcasa','Puertos dañados','Otro'],
    Monitor:['Sin imagen','No enciende','Líneas / píxeles','Pantalla rota','Conector dañado','Fuente / cable','Otro'],
    Mouse:['No funciona','Click defectuoso','Cable dañado','Conexión intermitente','Daño físico','Otro'],
    Teclado:['Teclas defectuosas','No funciona','Cable dañado','Conexión intermitente','Daño físico','Otro'],
    Headset:['No hay audio','Micrófono defectuoso','Cable dañado','Audio intermitente','Diadema rota','Otro'],
    Otros:['No funciona','Daño físico','Cable / conector','Falla intermitente','Pieza faltante','Otro'],
  }
  // Categorías del formulario: se compara por tipo real, no por estado ni por marca.
  const categoryFor=(value:string)=>{
    const type=value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    if(['desktop','all in one','all-in-one','aio','computadora de escritorio'].includes(type))return 'Desktop / All in One';
    if(['laptop','notebook','portatil'].includes(type))return 'Laptop';
    if(['monitor','pantalla'].includes(type))return 'Monitor';
    if(['mouse','raton'].includes(type))return 'Mouse';
    if(['teclado','keyboard'].includes(type))return 'Teclado';
    if(['headset','auricular','audifono','headphone'].includes(type))return 'Headset';
    return 'Otros';
  };
  const categoryAssets=assets.filter(a=>categoryFor(a.type)===draftType);
  const chosenAsset=categoryAssets.find(a=>a.id===draftEquipment);
  const isLot=!!chosenAsset && chosenAsset.quantity>1 && !chosenAsset.serial;
  const availableFrom=lotBalance[lotSource]||0;
  const diagnosisOptions:Record<string,string[]>={
    'Desktop / All in One':['No enciende: falla de alimentación','No da video: falla de pantalla o video','No inicia Windows: problema de almacenamiento o sistema','Falla de memoria RAM','Sobrecalentamiento / ventilación','Puertos o conectores defectuosos','Daño físico en gabinete'],
    Laptop:['No enciende: problema de alimentación','No carga: cargador o conector defectuoso','No retiene carga: batería deteriorada','Pantalla dañada o sin imagen','Teclado integrado defectuoso','Disco / SSD con fallo','Sobrecalentamiento','Bisagra o carcasa dañada','Puertos USB / video defectuosos'],
    Monitor:['No enciende','No muestra imagen','Pantalla rota','Líneas o píxeles defectuosos','Puerto HDMI / DP dañado','Fuente de alimentación defectuosa'],
    Mouse:['Dejó de funcionar','No reconoce conexión','Clic defectuoso','Rueda de desplazamiento dañada','Cable o receptor dañado'],
    Teclado:['No responde','Tecla rota o atascada','Daño por líquido','Conexión defectuosa','Cable dañado'],
    Headset:['Sin audio en uno de los lados','Sin audio en ambos lados','Micrófono sin funcionar','Audio intermitente','Cable o conector roto','Diadema o almohadilla dañada'],
    Otros:['No funciona','Daño físico','Conector defectuoso','Comportamiento intermitente','Pieza faltante']
  };
  const exportCsv = () => {
    const rows = [['ID','Equipo','Categoría','Falla','Estado','Prioridad','Fecha','Reportado por'], ...visible.map(d=>[d.id,equipmentTitle(d),d.equipment?.type||'',d.type,labelStatus(d.status),labelPriority(d.priority),formatDate(d.reportedAt),d.reportedBy||''])]
    const content = rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n')
    const blob = new Blob(['\uFEFF'+content],{type:'text/csv;charset=utf-8'})
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a'); anchor.href=url; anchor.download='danos-reparaciones.csv'; anchor.click(); URL.revokeObjectURL(url)
  }

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [response, assetResponse] = await Promise.all([apiRequest('/damages'),apiRequest('/equipment')])
      if (!response.ok) throw new Error(`No se pudieron cargar las incidencias (HTTP ${response.status})`)
      if (!assetResponse.ok) throw new Error(`No se pudieron cargar equipos (HTTP ${assetResponse.status})`)
      const json: unknown = await response.json()
      const records: unknown = await assetResponse.json()
      if (!Array.isArray(json) || !Array.isArray(records)) throw new Error('Respuesta invalida del backend')
      setDamages(json as DamageRecord[])
      const list = records.filter((v):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)).map(v=>({
        id:String(v.id||''),quantity:Number(v.quantity)||1,type:String(v.type||''),status:String(v.status||''),
        serial:String(v.serial||''),
        name:[v.type,v.brand,v.model,v.serial||v.pcName].filter(Boolean).join(' · ')
      })).filter(v=>v.id && v.quantity>0)
      setAssets(list)
      setError('')
    } catch (e) { setError(e instanceof Error ? e.message : 'Error consultando incidencias') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void refresh() }, [refresh])
  useEffect(()=>{let active=true;setLotBalance({});setLotSource('PRODUCTION');setLotQty(1);
    if(!draftEquipment || !assets.some(a=>a.id===draftEquipment&&a.quantity>1&&!a.serial))return;
    void (async()=>{try{const response=await apiRequest(`/stock-engine/equipment/${encodeURIComponent(draftEquipment)}`);if(!response.ok)throw new Error('No se pudo consultar el saldo.');const data=await response.json();if(!active)return;const b:Record<string,number>={};for(const v of (data.balances||[]))b[String(v.bucket)]=Number(v.units)||0;setLotBalance(b)}catch(e){if(active)setSaveError(e instanceof Error?e.message:'Error al consultar existencias')}})();
    return ()=>{active=false};
  },[draftEquipment,assets]);
  const saveDamage=async()=>{
    if(!draftEquipment||!draftFaults.length||!draftNotes){setSaveError('Selecciona un activo, una falla y el diagnóstico.');return}
    if(!categoryAssets.some(a=>a.id===draftEquipment)){setSaveError('El activo no corresponde a la categoría seleccionada.');return}
    if(isLot && (!lotTicket.trim()||!Number.isSafeInteger(lotQty)||lotQty<1||lotQty>availableFrom)){setSaveError('Para un lote selecciona origen, cantidad disponible y ticket obligatorio.');return}
    setSaving(true);setSaveError('')
    try{
      const endpoint=isLot?'/stock-engine/lot-damage':'/damages/register-individual';
      const payload=isLot?{equipmentId:draftEquipment,quantity:lotQty,fromBucket:lotSource,faults:draftFaults,notes:draftNotes,priority:draftPriority,reference:lotTicket.trim(),actor:'IT / DAMAGES',requestKey:`lot-damage:${crypto.randomUUID()}`}:{equipmentId:draftEquipment,faults:draftFaults,notes:draftNotes,priority:draftPriority};
      const response=await apiRequest(endpoint,{method:'POST',body:JSON.stringify(payload)})
      if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.message||`HTTP ${response.status}`)}
      setDraftOpen(false);setDraftEquipment('');setDraftFaults([]);setDraftNotes('');setLotTicket('');setLotQty(1);await refresh()
    }catch(e){setSaveError(e instanceof Error?e.message:'No se pudo guardar el daño')}
    finally{setSaving(false)}
  }

  const withoutReport = useMemo(() => assets.filter(a =>
    ['DAMAGED','REPAIR','IN_REPAIR'].includes(clean(a.status)) &&
    !damages.some(d=>d.equipmentId===a.id && !closedStatuses.includes(clean(d.status)))
  ), [assets,damages])
  const stats = useMemo(() => ({
    total: damages.length,
    active: damages.filter(d => !closedStatuses.includes(clean(d.status)) && !['RETIRED','DISCARDED'].includes(clean(d.status))).length,
    closed: damages.filter(d => closedStatuses.includes(clean(d.status))).length,
    priority: damages.filter(d => ['HIGH','CRITICAL'].includes(clean(d.priority)) && !closedStatuses.includes(clean(d.status))).length,
    repairable: damages.filter(d => ['REPAIRABLE','REPARABLE'].includes(clean(d.status))).length,
    irreparable: damages.filter(d => ['IRREPARABLE','UNREPAIRABLE'].includes(clean(d.status))).length,
  }), [damages])
  const categoryCounts = useMemo(() => {
    const counts:Record<string,number>={desktop:0,laptop:0,monitor:0,mouse:0,keyboard:0,headset:0}
    damages.forEach(d=>{
      const kind=clean(d.equipment?.type).replace(/[_-]/g,' ')
      if(['DESKTOP','ALL IN ONE','ALLINONE','AIO'].includes(kind)) counts.desktop++
      else if (kind==='LAPTOP') counts.laptop++
      else if (kind==='MONITOR') counts.monitor++
      else if (kind==='MOUSE') counts.mouse++
      else if (['KEYBOARD','TECLADO'].includes(kind)) counts.keyboard++
      else if (['HEADSET','HEADPHONE','HEADPHONES','AURICULAR'].includes(kind)) counts.headset++
    })
    return counts
  },[damages])
  const visible = useMemo(() => damages.filter(d => {
    if (extraFilter === 'priority' && !['HIGH','CRITICAL'].includes(clean(d.priority))) return false
    if (extraFilter === 'repairable' && !['REPAIRABLE','REPARABLE'].includes(clean(d.status))) return false
    if (extraFilter === 'irreparable' && !['IRREPARABLE','UNREPAIRABLE'].includes(clean(d.status))) return false
    if (filter === 'active' && !activeStatuses.includes(clean(d.status))) return false
    if (filter === 'closed' && !closedStatuses.includes(clean(d.status))) return false
    const needle = query.trim().toLowerCase()
    return !needle || [equipmentTitle(d), d.equipment?.pcName, d.equipment?.serial, d.type, d.description, d.status, d.reportedBy].some(v => String(v ?? '').toLowerCase().includes(needle))
  }), [damages, query, filter, extraFilter])

  return <div className="min-h-full space-y-5 p-4 text-slate-100 sm:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-[11px] font-semibold tracking-[.18em] text-cyan-400">IT ASSET MANAGEMENT · MANTENIMIENTO</p><h1 className="mt-1 text-2xl font-extrabold">Daños y Reparaciones</h1><p className="mt-1 text-sm text-slate-400">Incidencias registradas, diagnósticos y trazabilidad por activo.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>{setDraftOpen(true);setDraftFaults([]);setDraftNotes('')}} className="inline-flex items-center gap-2 rounded-lg border border-violet-400/40 bg-violet-500/15 px-3 py-2 text-sm text-violet-200 hover:bg-violet-500/25"><PlusCircle size={16}/> Nuevo caso</button><button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/25"><Download size={16}/> Exportar CSV</button><button type="button" onClick={()=>void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"><RefreshCw size={16}/> Actualizar</button></div>
    </header>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
      {[
        {label:'Incidencias registradas',value:stats.total,Icon:ClipboardList,color:'text-cyan-300',border:'border-cyan-500/35',fill:'bg-cyan-400'},
        {label:'Casos activos',value:stats.active,Icon:Wrench,color:'text-amber-300',border:'border-amber-500/35',fill:'bg-amber-400'},
        {label:'Casos resueltos',value:stats.closed,Icon:CheckCircle2,color:'text-emerald-300',border:'border-emerald-500/35',fill:'bg-emerald-400'},
        {label:'Prioridad alta / crítica',value:stats.priority,Icon:ShieldAlert,color:'text-rose-300',border:'border-rose-500/35',fill:'bg-rose-400'},
        {label:'Reparables',value:stats.repairable,Icon:Wrench,color:'text-violet-300',border:'border-violet-500/35',fill:'bg-violet-400'},
        {label:'Irreparables',value:stats.irreparable,Icon:AlertTriangle,color:'text-pink-300',border:'border-pink-500/35',fill:'bg-pink-400'},
      ].map(({label,value,Icon,color,border,fill},index)=><div key={label} className={`min-w-0 rounded-xl border ${border} bg-[#152139] p-3 shadow-[inset_0_0_20px_rgba(25,80,140,.08)]`}>
        <div className="flex items-center gap-2"><span className={`rounded-lg border border-white/10 bg-[#101b30] p-2 ${color}`}><Icon size={20}/></span><div className="min-w-0"><p className="text-[11px] leading-4 text-slate-300">{label}</p><div className="flex flex-wrap items-center gap-x-2"><strong className={`text-2xl font-extrabold ${color}`}>{loading?'—':value}</strong><SegmentedBar value={loading?0:value} maximum={index===0?Math.max(10,Math.ceil(stats.total/10)*10):Math.max(1,stats.total)} tone={fill}/></div></div></div>
        <p className="mt-2 text-[10px] text-slate-500">{index===0?'Escala cada 10 casos':'Sobre el total de incidencias'}</p>
      </div>)}
    </div>
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 2xl:grid-cols-6">{[
      {name:'Desktop / All in One',value:categoryCounts.desktop,Icon:Monitor,tone:'text-cyan-300',fill:'bg-cyan-400',border:'border-cyan-400/30'},
      {name:'Laptop',value:categoryCounts.laptop,Icon:Laptop,tone:'text-violet-300',fill:'bg-violet-400',border:'border-violet-400/30'},
      {name:'Monitor',value:categoryCounts.monitor,Icon:Monitor,tone:'text-amber-300',fill:'bg-amber-400',border:'border-amber-400/30'},
      {name:'Mouse',value:categoryCounts.mouse,Icon:Mouse,tone:'text-sky-300',fill:'bg-sky-400',border:'border-sky-400/30'},
      {name:'Teclado',value:categoryCounts.keyboard,Icon:Keyboard,tone:'text-blue-300',fill:'bg-blue-400',border:'border-blue-400/30'},
      {name:'Headset',value:categoryCounts.headset,Icon:Headphones,tone:'text-rose-300',fill:'bg-rose-400',border:'border-rose-400/30'},
    ].map(({name,value,Icon,tone,fill,border})=><div key={name} className={`flex min-w-0 items-center gap-3 rounded-xl border ${border} bg-[#152139] p-3`}>
      <span className={`shrink-0 rounded-lg border border-white/10 bg-[#101b30] p-2 ${tone}`}><Icon size={21}/></span>
      <div className="min-w-0"><p className="text-[11px] text-slate-300">{name}</p><div className="flex flex-wrap items-center gap-x-2"><strong className={`text-xl ${tone}`}>{loading?'—':value}</strong><SegmentedBar value={loading?0:value} maximum={Math.max(1,stats.total)} tone={fill}/></div></div>
    </div>)}
    </div>
    <section className="rounded-xl border border-white/10 bg-[#151f35] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Registro de incidencias</h2><p className="text-xs text-slate-400">Incidencias y equipos dañados pendientes de diagnóstico. El registro de un daño nuevo actualiza inventario.</p></div><div className="flex flex-wrap gap-2">{([{value:'all',label:'Todos'},{value:'active',label:'Activos'},{value:'closed',label:'Resueltos'}] as const).map(f=><button type="button" key={f.value} onClick={()=>setFilter(f.value)} className={`rounded-lg border px-3 py-2 text-xs ${filter===f.value?'border-cyan-400 bg-cyan-500/15 text-cyan-200':'border-white/10 text-slate-300 hover:bg-white/5'}`}>{f.label}</button>)}</div></div>
      <div className="relative mt-4 max-w-lg"><Search size={17} className="absolute left-3 top-2.5 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar equipo, serial, falla o responsable..." className="w-full rounded-lg border border-white/15 bg-[#101a2c] py-2 pl-10 pr-3 text-sm outline-none focus:border-cyan-400"/></div>
      <div className="mt-3 flex flex-wrap gap-2">{([{id:'all',name:'Todas las prioridades'},{id:'priority',name:'Alta / crítica'},{id:'repairable',name:'Reparables'},{id:'irreparable',name:'Irreparables'}] as const).map(f=><button type="button" key={f.id} onClick={()=>setExtraFilter(f.id)} className={`rounded-lg border px-3 py-1.5 text-xs ${extraFilter===f.id?'border-cyan-400 bg-cyan-500/15 text-cyan-200':'border-white/10 text-slate-300'}`}>{f.name}</button>)}</div>
      {error&&<div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200"><AlertTriangle size={16}/>{error}</div>}
      {withoutReport.length>0 && filter!=='closed' && extraFilter==='all' && <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3"><p className="mb-2 text-sm font-semibold text-amber-300">Equipos dañados sin incidencia ({withoutReport.length})</p><p className="mb-3 text-xs text-slate-400">Ya están marcados como dañados en Inventario. Registra su diagnóstico sin descontarlos de nuevo.</p><div className="space-y-2">{withoutReport.filter(a=>!query.trim()||a.name.toLowerCase().includes(query.trim().toLowerCase())).map(a=><div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#101b30] p-3"><div><strong className="text-sm">{a.name}</strong><p className="text-xs text-amber-200">Dañado · Pendiente de diagnóstico</p></div><button type="button" onClick={()=>{setDraftEquipment(a.id);setDraftFaults([]);setDraftNotes('');setSaveError('');setDraftOpen(true)}} className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">Registrar diagnóstico</button></div>)}</div></div>}
      <div className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-[#111d32]">
        <table className="w-full min-w-[1100px] text-left text-xs">
          <thead className="bg-[#1a3049] text-[10px] uppercase tracking-wider text-slate-300"><tr>{['Fecha','Activo / PCNAME','Categoría','Falla','Estado','Prioridad','Ubicación','Técnico','Acciones'].map(h=><th key={h} scope="col" className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-white/10">
            {!loading&&!error&&visible.length===0&&<tr><td colSpan={9} className="py-12 text-center text-slate-400"><Clock3 size={24} className="mx-auto mb-2 text-cyan-300"/>No hay incidencias registradas para esta consulta.</td></tr>}
            {visible.map(d=>{
              const kind=clean(d.equipment?.type)
              const StatusIcon=['DESKTOP','ALL IN ONE','AIO','MONITOR'].includes(kind)?Monitor:kind==='LAPTOP'?Laptop:kind==='MOUSE'?Mouse:['KEYBOARD','TECLADO'].includes(kind)?Keyboard:kind==='HEADSET'?Headphones:Wrench
              const high=['HIGH','CRITICAL'].includes(clean(d.priority))
              const done=closedStatuses.includes(clean(d.status))
              return <tr key={d.id} className="transition-colors hover:bg-cyan-400/5">
                <td className="whitespace-nowrap px-3 py-3 text-slate-300">{formatDate(d.reportedAt)}</td>
                <td className="px-3 py-3"><div className="flex items-center gap-2"><span className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 p-2 text-cyan-300"><StatusIcon size={17}/></span><div className="min-w-0"><strong className="block max-w-40 truncate text-slate-100" title={equipmentTitle(d)}>{d.equipment?.pcName||equipmentTitle(d)}</strong><span className="block max-w-40 truncate text-[10px] text-slate-400">{d.equipment?.serial||'Sin serial'}</span></div></div></td>
                <td className="px-3 py-3"><span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-cyan-200">{d.equipment?.type||'Sin categoría'}</span></td>
                <td className="max-w-44 truncate px-3 py-3 text-slate-200" title={d.type}>{d.type||'Sin falla'}</td>
                <td className="px-3 py-3"><span className={`whitespace-nowrap rounded-full border px-2 py-1 ${done?'border-emerald-400/40 bg-emerald-400/10 text-emerald-300':'border-amber-400/40 bg-amber-400/10 text-amber-300'}`}>{labelStatus(d.status)}</span></td>
                <td className="px-3 py-3"><span className={`whitespace-nowrap rounded-full px-2 py-1 ${high?'bg-rose-400/15 text-rose-300':'bg-slate-500/15 text-slate-300'}`}>{labelPriority(d.priority)}</span></td>
                <td className="max-w-32 truncate px-3 py-3 text-slate-300">{d.equipment?.location||'No registrada'}</td>
                <td className="px-3 py-3 text-slate-300">{d.repairedBy||d.reportedBy||'Sin asignar'}</td>
                <td className="px-3 py-3"><button type="button" onClick={()=>openDetail(d)} className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-[#1a2942] px-3 py-2 text-cyan-100 hover:border-cyan-400 hover:bg-cyan-500/15"><Eye size={14}/> Ver</button></td>
              </tr>
            })}
          </tbody>
        </table>
      </div>
      {loading&&<p className="py-7 text-center text-slate-400">Cargando incidencias...</p>}
    </section>
    {draftOpen&&<div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/75 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)setDraftOpen(false)}}><div role="dialog" aria-modal="true" aria-label="Nuevo reporte de daño - vista previa" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-cyan-400/35 bg-[#15213a] p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-bold">Nuevo reporte de daño</h3><p className="mt-1 text-xs text-amber-300">Registro de daños individuales y unidades por lote · historial verificable</p></div><button type="button" aria-label="Cerrar" onClick={()=>setDraftOpen(false)} className="rounded-lg border border-white/20 p-2 hover:bg-white/10"><X size={18}/></button></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs text-slate-300">Categoría<select value={draftType} onChange={e=>{setDraftType(e.target.value);setDraftFaults([]);setDraftEquipment('');setDraftNotes('');setSaveError('')}} className="mt-1 w-full rounded-lg border border-white/20 bg-[#0e1930] p-2 text-sm text-white">{Object.keys(failureOptions).map(x=><option key={x}>{x}</option>)}</select></label><label className="text-xs text-slate-300">Activo / PCNAME / Serial<select value={draftEquipment} onChange={e=>setDraftEquipment(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-[#0e1930] p-2 text-sm text-white"><option value="">Selecciona un activo registrado</option>{categoryAssets.map(a=><option key={a.id} value={a.id}>{a.name}{a.quantity>1?` · Lote ${a.quantity} unidades`:''}</option>)}</select></label><label className="text-xs text-slate-300">Ubicación actual<input value={draftLocation} onChange={e=>setDraftLocation(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-[#0e1930] p-2 text-sm text-white"/></label><label className="text-xs text-slate-300">Prioridad<select value={draftPriority} onChange={e=>setDraftPriority(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-[#0e1930] p-2 text-sm text-white"><option value="LOW">Baja</option><option value="MEDIUM">Media</option><option value="HIGH">Alta</option><option value="CRITICAL">Crítica</option></select></label></div>
      <p className="mt-5 text-sm font-semibold text-cyan-200">Fallas identificadas</p><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{(failureOptions[draftType]||failureOptions.Otros).map(f=><label key={f} className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-[#101b30] p-2 text-xs"><input type="checkbox" checked={draftFaults.includes(f)} onChange={e=>setDraftFaults(old=>e.target.checked?[...old,f]:old.filter(x=>x!==f))} className="accent-cyan-400"/>{f}</label>)}</div>
      <label className="mt-4 block text-xs text-slate-300">Diagnóstico / causa identificada<select value={draftNotes} onChange={e=>setDraftNotes(e.target.value)} className="mt-1 block w-full rounded-lg border border-white/20 bg-[#0e1930] p-3 text-sm text-white"><option value="">Selecciona un diagnóstico del catálogo</option>{(diagnosisOptions[draftType]||diagnosisOptions.Otros).map(option=><option key={option} value={option}>{option}</option>)}</select></label>
      <div className="mt-4 rounded-lg border border-cyan-400/20 bg-[#101b30] p-3 text-xs text-slate-300"><strong>Resumen:</strong> {draftFaults.length} fallas seleccionadas · {labelPriority(draftPriority)} · {categoryAssets.find(a=>a.id===draftEquipment)?.name||'Activo por seleccionar'} · {draftNotes||'Diagnóstico pendiente'}. La selección definitiva se vinculará al inventario y permitirá cantidades dañadas por lote.</div>
      {saveError&&<p role="alert" className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-200">{saveError}</p>}
      <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={()=>setDraftOpen(false)} className="rounded-lg border border-white/20 px-4 py-2 text-sm">Cerrar</button><button type="button" disabled={saving||!draftEquipment||!draftFaults.length||!draftNotes||(isLot&&(!lotTicket.trim()||availableFrom<lotQty||lotQty<1))} onClick={()=>void saveDamage()} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50">{saving?'Guardando...':'Guardar caso'}</button></div>
    </div></div>}
    {selected&&<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-3 sm:p-6" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}>
      <div role="dialog" aria-modal="true" aria-label="Detalle de incidencia" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-cyan-400/35 bg-[#15213a] p-5 shadow-[0_20px_85px_rgba(0,0,0,.7)]">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-400">Ficha de incidencia · {editing?"Edición":"Consulta"}</p><h3 className="mt-1 text-xl font-bold text-slate-100">{selected.equipment?.pcName||equipmentTitle(selected)}</h3><p className="mt-1 text-xs text-slate-400">Caso #{selected.id} · {selected.equipment?.brand||''} {selected.equipment?.model||''}</p></div><button type="button" onClick={()=>setSelected(null)} aria-label="Cerrar" className="rounded-lg border border-white/20 p-2 hover:bg-white/10"><X size={18}/></button></div>
        <div className="mt-4 flex flex-wrap items-center gap-2"><span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs text-amber-300">{labelStatus(selected.status)}</span><span className="rounded-full border border-rose-400/30 bg-rose-400/10 px-3 py-1 text-xs text-rose-200">Prioridad: {labelPriority(selected.priority)}</span><span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">{selected.equipment?.type||'Activo'}</span></div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{[['PCNAME',selected.equipment?.pcName||'Sin PCNAME'],['Serial',selected.equipment?.serial||'Sin serial'],['Ubicación actual',selected.equipment?.location||'No registrada'],['Reportado por',selected.reportedBy||'No informado'],['Fecha de reporte',formatDate(selected.reportedAt)],['Técnico / reparación',selected.repairedBy||'Sin asignar'],['Fecha de reparación',formatDate(selected.repairedAt)],['Estado del activo',selected.equipment?.status||'No registrado'],['Unidades en registro',String(selected.equipment?.quantity??1)]].map(([label,value])=><div key={label} className="rounded-lg border border-white/10 bg-[#101b30] p-3"><p className="text-[11px] text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-semibold text-slate-100">{value}</p></div>)}</div>
        {editing&&<div className="mt-4 rounded-xl border border-cyan-400/30 bg-[#101b30] p-4">
          <h4 className="mb-3 text-sm font-semibold text-cyan-200">Editar datos del reporte</h4>
          <p className="mb-3 text-xs text-slate-400">PCNAME, serial, ubicación y fechas se consultan del inventario y no se modifican aquí.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-300">Reportado por<input maxLength={120} value={editDraft.reportedBy} onChange={e=>setEditDraft(v=>({...v,reportedBy:e.target.value}))} className="mt-1 w-full rounded-lg border border-white/20 bg-[#0a152b] p-2.5 text-sm text-white" placeholder="Persona que reportó"/></label>
            <label className="text-xs text-slate-300">Técnico asignado<input maxLength={120} value={editDraft.repairedBy} onChange={e=>setEditDraft(v=>({...v,repairedBy:e.target.value}))} className="mt-1 w-full rounded-lg border border-white/20 bg-[#0a152b] p-2.5 text-sm text-white" placeholder="Técnico responsable"/></label>
            <label className="text-xs text-slate-300">Prioridad<select value={editDraft.priority} onChange={e=>setEditDraft(v=>({...v,priority:e.target.value}))} className="mt-1 w-full rounded-lg border border-white/20 bg-[#0a152b] p-2.5 text-sm text-white">{[['LOW','Baja'],['MEDIUM','Media'],['HIGH','Alta'],['CRITICAL','Crítica']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
            <label className="text-xs text-slate-300">Fallas reportadas (separar por comas)<input maxLength={500} value={editDraft.type} onChange={e=>setEditDraft(v=>({...v,type:e.target.value}))} className="mt-1 w-full rounded-lg border border-white/20 bg-[#0a152b] p-2.5 text-sm text-white"/></label>
          </div>
          <label className="mt-3 block text-xs text-slate-300">Diagnóstico y observaciones<textarea rows={3} maxLength={4000} value={editDraft.description} onChange={e=>setEditDraft(v=>({...v,description:e.target.value}))} className="mt-1 w-full rounded-lg border border-white/20 bg-[#0a152b] p-2.5 text-sm text-white"/></label>
          <label className="mt-3 block text-xs text-slate-300">Notas técnicas / reparación<textarea rows={3} maxLength={4000} value={editDraft.repairNotes} onChange={e=>setEditDraft(v=>({...v,repairNotes:e.target.value}))} className="mt-1 w-full rounded-lg border border-white/20 bg-[#0a152b] p-2.5 text-sm text-white"/></label>
          {editError&&<p role="alert" className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 p-2 text-xs text-rose-200">{editError}</p>}
          {isLot&&<div className="mt-3 rounded-xl border border-cyan-400/30 bg-[#0f1b30] p-3">
        <p className="text-sm font-semibold text-cyan-200">Control de unidades del lote</p>
        <p className="mt-1 text-xs text-slate-400">Total del lote: {chosenAsset?.quantity}. El código interno de cada incidencia se generará al confirmar, sin serial de fábrica.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
         <label className="text-xs">Origen real<select value={lotSource} onChange={e=>{setLotSource(e.target.value as 'PRODUCTION'|'WAREHOUSE_AVAILABLE');setLotQty(1)}} className="mt-1 w-full rounded-lg border border-white/20 bg-[#0e1930] p-2"><option value="PRODUCTION">Producción / asignados</option><option value="WAREHOUSE_AVAILABLE">Almacén disponible</option></select></label>
         <label className="text-xs">Unidades dañadas<input type="number" min={1} max={Math.max(1,availableFrom)} value={lotQty} onChange={e=>setLotQty(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-white/20 bg-[#0e1930] p-2"/></label>
         <label className="text-xs">Ticket / incidente *<input required value={lotTicket} onChange={e=>setLotTicket(e.target.value)} placeholder="Ej. INC-2026-001" className="mt-1 w-full rounded-lg border border-white/20 bg-[#0e1930] p-2"/></label>
        </div>
        <p className="mt-2 text-xs text-cyan-300">Disponibles en el origen: {availableFrom}. El reporte moverá únicamente las unidades indicadas a almacén dañado.</p>
      </div>}
      <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" disabled={editSaving} onClick={()=>{setEditing(false);setEditError('')}} className="rounded-lg border border-white/20 px-4 py-2 text-xs">Cancelar</button><button type="button" disabled={editSaving||!editDraft.type.trim()||!editDraft.description.trim()} onClick={()=>void saveDetail()} className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold disabled:opacity-50">{editSaving?'Guardando...':'Guardar cambios'}</button></div>
        </div>}
        <div className="mt-4 rounded-lg border border-cyan-400/20 bg-[#101b30] p-3"><h4 className="mb-2 text-sm font-semibold text-cyan-200">Checklist · Fallas reportadas</h4><div className="flex flex-wrap gap-2">{selected.type.split(/[,;|]/).map(x=>x.trim()).filter(Boolean).map((fault,i)=><span key={i} className="inline-flex items-center gap-1.5 rounded-md border border-cyan-400/25 bg-cyan-500/10 px-2 py-1.5 text-xs text-cyan-100"><CheckCircle2 size={14}/>{fault}</span>)}</div></div>
        <div className="mt-3 rounded-lg border border-white/10 bg-[#101b30] p-3"><h4 className="text-sm font-semibold text-slate-100">Diagnóstico y observaciones</h4><p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{selected.description||'Sin diagnóstico registrado'}</p></div>
        <div className="mt-3 rounded-lg border border-white/10 bg-[#101b30] p-3"><h4 className="text-sm font-semibold text-slate-100">Notas de reparación</h4><p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{selected.repairNotes||'Aún no hay notas de reparación'}</p></div>
        <div className="mt-4 rounded-lg border border-white/10 bg-[#101b30] p-3"><div className="flex items-center gap-2 text-sm font-semibold"><Clock3 size={16} className="text-cyan-300"/> Historial del caso</div><div className="mt-3 space-y-3 border-l border-cyan-400/30 pl-4"><div><p className="text-xs font-medium text-cyan-200">{formatDate(selected.reportedAt)} · Incidencia registrada</p><p className="text-xs text-slate-400">Estado inicial y falla reportada: {selected.type}</p></div>{selected.repairedAt&&<div><p className="text-xs font-medium text-emerald-300">{formatDate(selected.repairedAt)} · Reparación registrada</p><p className="text-xs text-slate-400">{selected.repairedBy||'Técnico no informado'}</p></div>}</div><p className="mt-3 text-[11px] text-slate-500">Solo se muestran los eventos que existen en los datos actuales. La bitácora completa por cambios de estado se implementará en una fase posterior.</p></div>
        <div className="mt-4 rounded-xl border border-cyan-400/25 bg-[#101b30] p-3">
          <h4 className="mb-3 text-sm font-semibold text-cyan-200">Acciones del caso · Inventario conectado</h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button type="button" disabled={actionSaving||editing||!['OPEN','PENDING','IN_PROGRESS','REPAIR','IN_REPAIR','DIAGNOSIS','REPAIRABLE'].includes(clean(selected.status))} onClick={()=>void runTransition('REPAIR')} className="rounded-lg border border-emerald-400/40 bg-emerald-600/25 px-3 py-2.5 text-sm font-semibold text-emerald-200 disabled:opacity-40">✓ Marcar reparado</button>
            <button type="button" disabled={actionSaving||editing||clean(selected.status)!=='REPAIRED'} onClick={()=>void runTransition('AVAILABLE')} className="rounded-lg border border-cyan-400/40 bg-cyan-600/20 px-3 py-2.5 text-sm font-semibold text-cyan-200 disabled:opacity-40">↩ Mover a disponible</button>
            <button type="button" disabled={actionSaving||editing||['DISCARDED','RETIRED','RESOLVED','CLOSED','COMPLETED'].includes(clean(selected.status))} onClick={()=>void runTransition('RETIRE')} className="rounded-lg border border-rose-400/40 bg-rose-600/25 px-3 py-2.5 text-sm font-semibold text-rose-200 disabled:opacity-40">Baja definitiva</button>
            <button type="button" disabled={actionSaving} onClick={()=>void loadHistory(selected.id)} className="rounded-lg border border-slate-400/30 px-3 py-2.5 text-sm text-slate-200">Ver historial completo</button>
          </div>
          <label className="mt-3 block text-xs text-slate-300">Motivo de baja (obligatorio para baja definitiva, mínimo 12 caracteres)<textarea rows={2} value={actionReason} onChange={e=>setActionReason(e.target.value)} maxLength={1000} className="mt-1 w-full rounded-lg border border-white/20 bg-[#0a152b] p-2 text-sm text-white" placeholder="Describe la causa, evaluación técnica y autorización..."/></label>
          {showHistory&&<div className="mt-3 rounded-lg border border-white/10 p-3"><h5 className="mb-2 text-sm font-semibold">Historial de transiciones</h5>{historyRows.length===0?<p className="text-xs text-slate-400">Sin transiciones registradas todavía.</p>:historyRows.map(h=><div key={h.id} className="border-l border-cyan-400/35 py-2 pl-3 text-xs"><span className="text-cyan-200">{formatDate(h.createdAt)} · {h.action}</span><p className="text-slate-400">{h.description||'Sin observación'}</p></div>)}</div>}
          {actionError&&<p role="alert" className="mt-3 rounded-lg border border-rose-400/40 bg-rose-500/10 p-3 text-xs text-rose-200">{actionError}</p>}
          {actionSaving&&<p className="mt-2 text-xs text-amber-200">Procesando y registrando historial...</p>}
        </div>
        <div className="mt-4 flex flex-wrap justify-between gap-2"><p className="max-w-md text-xs text-amber-300">Solo activos individuales. Una baja conserva la incidencia y el historial; no elimina filas de PostgreSQL.</p><div className="flex gap-2">{!editing&&<button type="button" onClick={()=>setEditing(true)} className="rounded-lg border border-violet-400/40 bg-violet-500/15 px-4 py-2 text-sm font-semibold text-violet-200">Editar ficha</button>}<button type="button" onClick={()=>setSelected(null)} className="rounded-lg border border-cyan-400/35 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100">Cerrar ficha</button></div></div>
      </div>
    </div>}
  </div>
}
