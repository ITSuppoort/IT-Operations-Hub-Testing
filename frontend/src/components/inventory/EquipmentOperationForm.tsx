'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '@/lib/api'

type Equipment = {
  id: string; pcName?: string|null; assetTag?: string|null; serial?: string|null;
  brand?: string|null; model?: string|null; status: string;
  location?: string|null; updatedAt: string; quantity: number
}
type Kind = 'RETURN'|'DELIVER'|'TRANSFER'
const kinds: { id: Kind; text: string }[] = [
  {id:'RETURN',text:'Devolución hacia IT'},
  {id:'DELIVER',text:'Entrega a producción'},
  {id:'TRANSFER',text:'Traslado interno'}
]
export default function EquipmentOperationForm({initialKind='RETURN'}:{initialKind?:'RETURN'|'DELIVER'|'TRANSFER'}={}) {
  const [items,setItems] = useState<Equipment[]>([])
  const [kind,setKind] = useState<Kind>(initialKind)
  const [selected,setSelected] = useState('')
  const [destination,setDestination] = useState('Almacén IT')
  const [recipient,setRecipient] = useState('')
  const [reason,setReason] = useState('')
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')
  const [confirmed,setConfirmed] = useState(false)
  const refresh = useCallback(async () => {
    try {
      const result=await apiRequest('/equipment')
      if(!result.ok) throw new Error(`Error API ${result.status}`)
      const data:unknown=await result.json()
      if(!Array.isArray(data)) throw new Error('Respuesta inesperada')
      const rows=data.filter((x):x is Equipment=>!!x&&typeof x==='object'&&typeof x.id==='string'&&typeof x.updatedAt==='string')
      setItems(rows)
      setSelected('')
      setMessage('')
      setConfirmed(false)
    } catch(e) {setMessage(e instanceof Error?e.message:'No fue posible cargar equipos')}
  },[])
  useEffect(()=>{void refresh()},[refresh])
  const item=items.find(x=>x.id===selected)
  const status=String(item?.status??'').toUpperCase()
  const allowed=item?.quantity===1 && !['RETIRED','DISPOSED','DECOMMISSIONED'].includes(status)
    && (kind==='RETURN'?['ASSIGNED','IN_USE','IN-USE','ACTIVE'].includes(status)
      :kind==='DELIVER'?['AVAILABLE','RETURNED','IN_STOCK','STOCK'].includes(status)
        :true)
  async function submit() {
    if(!item || !allowed || !confirmed || !destination.trim() || reason.trim().length<5 || (kind==='DELIVER'&&!recipient.trim())) return
    setBusy(true);setMessage('')
    try {
      const res=await apiRequest('/movements/equipment-operation',{method:'POST',body:JSON.stringify({
        equipmentId:item.id,kind,targetLocation:destination.trim(),reason:reason.trim(),
        expectedUpdatedAt:item.updatedAt,recipient:kind==='DELIVER'?recipient.trim():undefined
      })})
      const body:unknown=await res.json()
      if(!res.ok) {const value=body as {message?:string};throw new Error(value.message||`HTTP ${res.status}`)}
      setMessage('Operación registrada en la API. Actualiza Existencias para ver el estado nuevo.')
      setReason('');setConfirmed(false);setRecipient('')
      const latest=await apiRequest('/equipment')
      if(latest.ok){const rows:unknown=await latest.json();if(Array.isArray(rows))setItems(rows as Equipment[])}
      setSelected('')
    } catch(e){setMessage(e instanceof Error?e.message:'Error inesperado')}
    finally{setBusy(false)}
  }
  return <section className="rounded-2xl border border-cyan-400/25 bg-[#0c1930] p-5 text-white space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-cyan-300">M3.2 · Movimientos de equipo individual</p><h3 className="mt-1 text-xl font-extrabold">Operación con trazabilidad permanente</h3><p className="mt-1 text-xs text-slate-300">Solo administradores. Sin crear activos ni editar stock por cantidad.</p></div><button type="button" onClick={()=>void refresh()} className="rounded-lg border border-white/20 px-3 py-2 text-xs">Actualizar equipos</button></div>
    <div className="grid gap-3 md:grid-cols-2">
      <label className="text-sm">Operación<select className="mt-2 w-full rounded-lg border border-white/20 bg-[#152441] p-3" value={kind} onChange={e=>{const k=e.target.value as Kind;setKind(k);setConfirmed(false);setDestination(k==='RETURN'?'Almacén IT':'')}}>{kinds.map(x=><option key={x.id} value={x.id}>{x.text}</option>)}</select></label>
      <label className="text-sm">Equipo existente<select className="mt-2 w-full rounded-lg border border-white/20 bg-[#152441] p-3" value={selected} onChange={e=>{setSelected(e.target.value);setConfirmed(false)}}><option value="">Seleccionar equipo</option>{items.map(x=><option key={x.id} value={x.id}>{x.assetTag||x.pcName||x.id} · {x.serial||'Sin serial'} · {x.status}</option>)}</select></label>
      <label className="text-sm">Destino<input maxLength={150} value={destination} onChange={e=>{setDestination(e.target.value);setConfirmed(false)}} placeholder="Almacén IT / Piso 2 Este" className="mt-2 w-full rounded-lg border border-white/20 bg-[#152441] p-3"/></label>
      {kind==='DELIVER'&&<label className="text-sm">Responsable receptor<input maxLength={150} value={recipient} onChange={e=>{setRecipient(e.target.value);setConfirmed(false)}} className="mt-2 w-full rounded-lg border border-white/20 bg-[#152441] p-3"/></label>}
      <label className="text-sm md:col-span-2">Motivo de la operación<textarea maxLength={500} value={reason} onChange={e=>{setReason(e.target.value);setConfirmed(false)}} rows={2} placeholder="Explica por qué se mueve el equipo (mínimo 5 caracteres)" className="mt-2 w-full rounded-lg border border-white/20 bg-[#152441] p-3"/></label>
    </div>
    {item&&<div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-slate-200">Antes: {item.pcName||item.assetTag||item.id} · {item.status} · {item.location||'Ubicación no registrada'} · {item.quantity} unidad(es). Después: {kind==='RETURN'?'Disponible':kind==='DELIVER'?'Asignado':'Mismo estado'} · {destination||'Destino pendiente'}.</div>}
    {!allowed&&item&&<p className="text-sm text-amber-300">Este activo no cumple los requisitos para la operación seleccionada.</p>}
    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Confirmo que revisé el equipo, origen, destino y motivo. Esta operación modificará datos reales.</label>
    <div className="flex flex-wrap items-center gap-3"><button type="button" disabled={busy||!confirmed||!allowed||reason.trim().length<5||!destination.trim()||(kind==='DELIVER'&&!recipient.trim())} onClick={()=>void submit()} className="rounded-xl bg-cyan-600 px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40">{busy?'Registrando...':'Registrar operación real'}</button><p className="text-sm text-slate-200" role="status">{message}</p></div>
  </section>
}
