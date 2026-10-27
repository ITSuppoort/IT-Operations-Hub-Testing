"use client"
import { useMemo, useState } from 'react'
import { Save, X, ShieldCheck } from 'lucide-react'
import { apiRequest } from '@/lib/api'
import type { WarehouseAsset } from './WarehouseHome'

type Editable = 'brand'|'model'|'serial'|'assetTag'|'pcName'|'type'|'location'
const fields: {key:Editable; label:string; required?:boolean}[] = [
 {key:'assetTag',label:'Código de activo'}, {key:'pcName',label:'Nombre de equipo'},
 {key:'type',label:'Tipo / categoría'}, {key:'brand',label:'Marca',required:true},
 {key:'model',label:'Modelo'}, {key:'serial',label:'Número de serie'},
 {key:'location',label:'Ubicación física (almacén, piso o área)'}
]

const specsEnabled = (type:string)=>{
 const t=String(type||'').trim().toLowerCase()
 return ['desktop','laptop','all in one'].includes(t)
}
export default function WarehouseAssetEditor({item,onCancel,onSaved}:{item:WarehouseAsset;onCancel:()=>void;onSaved:()=>void}) {
 const [form,setForm]=useState<Record<Editable,string>>({
  brand:item.brand||'',model:item.model||'',serial:item.serial||'',assetTag:item.assetTag||'',
  pcName:item.pcName||'',type:item.type==='Sin clasificar'?'':item.type||'',location:item.location||''
 })
 const [ram,setRam]=useState(item.ramGB==null?'':String(item.ramGB))
 const [storage,setStorage]=useState(item.storageGB==null?'':String(item.storageGB))
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [confirm,setConfirm]=useState(false)
 const showSpecs = useMemo(()=>specsEnabled(form.type||item.type||''),[form.type,item.type])
 async function save(){
  if(!item.apiId || busy || !confirm)return
  if(!form.brand.trim()){setError('La marca es obligatoria.');return}
  const data:Record<string,string|null>={}
  for(const f of fields){
   const previous= f.key==='type' && item.type==='Sin clasificar'?'':String(item[f.key]||'')
   const next=form[f.key].trim()
   if(next!==previous)data[f.key]=next||null
  }
  const payload:Record<string,string|number|null>={...data}
  if(showSpecs){
   if(ram!=='' && (!/^\d+$/.test(ram) || Number(ram)<1 || Number(ram)>1000)){setError('RAM debe estar entre 1 y 1000 GB.');return}
   if(storage!=='' && (!/^\d+$/.test(storage) || Number(storage)<1 || Number(storage)>100000)){setError('Disco debe estar entre 1 y 100000 GB.');return}
   if(ram!==String(item.ramGB??''))payload.ramGB=ram===''?null:Number(ram)
   if(storage!==String(item.storageGB??''))payload.storageGB=storage===''?null:Number(storage)
  }
  if(!Object.keys(payload).length){onCancel();return}
  setBusy(true);setError('')
  try{
   const response=await apiRequest('/equipment/'+encodeURIComponent(item.apiId),{method:'PUT',body:JSON.stringify(payload)})
   if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(typeof body?.message==='string'?body.message:'No se guardaron los cambios. HTTP '+response.status)}
   onSaved()
  }catch(e){setError(e instanceof Error?e.message:'No se pudo actualizar el equipo.')}finally{setBusy(false)}
 }
 return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Editar equipo">
  <div className="inv-panel w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 shadow-2xl">
   <div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-extrabold">Editar equipo</h3><p className="inv-muted mt-1 text-xs">Modifica la ficha existente. No se crea un equipo nuevo.</p></div><button type="button" className="inv-btn" onClick={onCancel} disabled={busy} aria-label="Cerrar"><X size={17}/></button></div>
   <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">{fields.map(f=><label key={f.key} className="flex flex-col gap-1 text-xs font-semibold"><span>{f.label}</span>{f.key==='type'?<select className="inv-table-select w-full" value={form.type} onChange={ev=>{setForm(v=>({...v,type:ev.target.value}));setConfirm(false)}}><option value="">Seleccionar</option>{['Desktop','Laptop','All in One','Monitor','Teclado','Mouse','Headset','Impresoras','Webcam','UPS','SSD','HDD','Memoria RAM','Otros componentes'].map(v=><option key={v} value={v}>{v}</option>)}</select>:<input className="inv-table-select w-full" value={form[f.key]} maxLength={250} onChange={e=>{setForm(v=>({...v,[f.key]:e.target.value}));setConfirm(false)}} placeholder={f.key==='location'?'Ej. Almacén IT / Piso 1':'Sin registrar'}/>}</label>)}</div>
      {showSpecs&&<div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="flex flex-col gap-1 text-xs font-semibold"><span>RAM (GB)</span><input className="inv-table-select w-full" type="number" min={1} max={1000} step={1} value={ram} onChange={ev=>{setRam(ev.target.value);setConfirm(false)}}/></label><label className="flex flex-col gap-1 text-xs font-semibold"><span>Disco (GB)</span><input className="inv-table-select w-full" type="number" min={1} max={100000} step={1} value={storage} onChange={ev=>{setStorage(ev.target.value);setConfirm(false)}}/></label></div>}
   <div className="inv-note mt-4 rounded-xl p-3 text-xs"><ShieldCheck size={14} className="mr-1 inline"/> Estado actual: <strong>{item.rawStatus||item.status}</strong>. Los cambios de estado, asignación, daños y reparación deben realizarse desde su proceso correspondiente; aquí solo se corrigen datos del catálogo y ubicación.</div>
   <label className="mt-4 flex items-start gap-2 text-xs"><input type="checkbox" checked={confirm} onChange={e=>setConfirm(e.target.checked)}/><span>Confirmo que verifiqué los datos y deseo actualizar este registro en el inventario real.</span></label>
   {error&&<p className="mt-3 text-sm text-red-400" role="alert">{error}</p>}
   <div className="mt-5 flex justify-end gap-2"><button type="button" className="inv-btn" onClick={onCancel} disabled={busy}>Cancelar</button><button type="button" className="inv-btn inv-primary" disabled={!confirm||busy} onClick={()=>void save()}><Save size={16}/>{busy?'Guardando...':'Guardar cambios'}</button></div>
  </div>
 </div>
}
