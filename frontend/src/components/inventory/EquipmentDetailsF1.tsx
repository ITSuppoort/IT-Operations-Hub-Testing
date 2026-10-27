'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Cpu, HardDrive, MemoryStick, CalendarDays, Pencil, Save } from 'lucide-react'
import { apiRequest } from '@/lib/api'
import WarehouseAssetEditor from './WarehouseAssetEditor'
import type { WarehouseAsset } from './WarehouseHome'

type Asset = Record<string, unknown>
type Props = { pcName?: string | null; serial?: string | null; onClose: () => void }
type Key = 'type'|'brand'|'model'|'serial'|'location'|'ramGB'|'storageGB'
const kinds = ['Desktop','Laptop','All in One','Monitor','Teclado','Mouse','Headset','Impresoras','Webcam','UPS','SSD','HDD','Memoria RAM','Otros componentes']
const fields: {key:Key; label:string}[] = [{key:'type',label:'Tipo de equipo'},{key:'brand',label:'Marca'},{key:'model',label:'Modelo'},{key:'serial',label:'Serial'},{key:'location',label:'Ubicación'},{key:'ramGB',label:'RAM (GB)'},{key:'storageGB',label:'Disco (GB)'}]
const shown = (value: unknown) => value == null || String(value).trim() === '' ? 'No registrado' : String(value)
const date = (value: unknown) => { const d = new Date(typeof value === 'string' ? value : ''); return Number.isFinite(d.getTime()) ? d.toLocaleDateString('es-DO') : 'No registrada' }
const asText = (value: unknown) => value == null ? '' : String(value)
const makeForm = (asset:Asset):Record<Key,string> => ({type:asText(asset.type),brand:asText(asset.brand),model:asText(asset.model),serial:asText(asset.serial),location:asText(asset.location),ramGB:asText(asset.ramGB),storageGB:asText(asset.storageGB)})

const specsEnabled = (type:string)=>{
 const t=String(type||'').trim().toLowerCase()
 return ['desktop','laptop','all in one'].includes(t)
}

export default function EquipmentDetailsF1({ pcName, serial, onClose }: Props) {
 const [item,setItem] = useState<Asset|null>(null)
 const [error,setError] = useState('')
 const [loading,setLoading] = useState(true)
 const [editing,setEditing] = useState(false)
 const [busy,setBusy] = useState(false)
 const [confirm,setConfirm] = useState(false)
 const [form,setForm] = useState<Record<Key,string>>({type:'',brand:'',model:'',serial:'',location:'',ramGB:'',storageGB:''})
 useEffect(()=>{
  let active=true
  const load = async()=>{
   try {
    const response=await apiRequest('/equipment')
    if(!response.ok) throw new Error('No se pudo consultar la API.')
    const data:unknown=await response.json()
    if(!Array.isArray(data)) throw new Error('La respuesta de la API es incorrecta.')
    const matches=data.filter((v):v is Asset=>!!v&&typeof v==='object'&&!Array.isArray(v)).filter(v=>pcName && asText(v.pcName).toLowerCase()===pcName.toLowerCase() || (!pcName && !!serial && asText(v.serial).toLowerCase()===serial.toLowerCase()))
    if(matches.length!==1) throw new Error('No se pudo identificar un único equipo.')
    if(active){setItem(matches[0]);setForm(makeForm(matches[0]))}
   }catch(e){if(active)setError(e instanceof Error?e.message:'No se pudo cargar la ficha.')}
   finally{if(active)setLoading(false)}
  }
  void load()
  return ()=>{active=false}
 },[pcName,serial])
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!busy){if(editing){setEditing(false);setConfirm(false)}else onClose()}};document.addEventListener('keydown',key);return ()=>document.removeEventListener('keydown',key)},[onClose,editing,busy])
 async function save(){
  if(!item||busy||!confirm)return
  const id=asText(item.id)
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)){setError('No se encontró un UUID válido. No se modificó nada.');return}
  if(!form.brand.trim()){setError('La marca es obligatoria.');return}
  const currentType=asText(item.type)
  if(!kinds.includes(form.type) && form.type!==currentType){setError('Selecciona un tipo válido.');return}
  const allowSpecs = specsEnabled(form.type||asText(item.type))
  if(allowSpecs){for(const key of ['ramGB','storageGB'] as const){const v=form[key].trim();const max=key==='ramGB'?1000:100000;if(v!==''&&(!/^\d+$/.test(v)||Number(v)<1||Number(v)>max)){setError(`${key==='ramGB'?'RAM':'Disco'} debe ser un número entre 1 y ${max} GB.`);return}}}
  const changes:Record<string,string|number|null>={}
  for(const {key} of fields){if((key==='ramGB'||key==='storageGB')&&!allowSpecs)continue;const next=form[key].trim();const old=asText(item[key]);if(next!==old) changes[key]=key==='ramGB'||key==='storageGB'?(next===''?null:Number(next)):(next||null)}
  if(Object.keys(changes).length===0){setEditing(false);setConfirm(false);return}
  setBusy(true);setError('')
  try{
   const response=await apiRequest('/equipment/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify(changes)})
   if(!response.ok){const data:unknown=await response.json().catch(()=>null);let message='No se guardaron los cambios (HTTP '+response.status+').';if(data&&typeof data==='object'&&'message' in data&&typeof data.message==='string')message=data.message;throw new Error(message)}
   // Refrescamos el inventario visible; la ficha se volverá a consultar desde la API.
   window.location.reload()
  }catch(e){setError(e instanceof Error?e.message:'Error al guardar.')}finally{setBusy(false)}
 }
 const allowSpecs = specsEnabled(asText(item?.type))
 const rows:[string,string][] = item ? [
  ['PCNAME',shown(item.pcName)],['Serial',shown(item.serial)],['Tipo',shown(item.type)],['Marca',shown(item.brand)],['Modelo',shown(item.model)],
  ...(allowSpecs?([
   ['RAM',typeof item.ramGB==='number'?`${item.ramGB} GB`:'No registrada'],
   ['Disco',typeof item.storageGB==='number'?`${item.storageGB} GB`:'No registrado'],
   ['Procesador','Pendiente de campo en base de datos'],
   ['Generación','Pendiente de campo en base de datos'],
  ] as [string,string][]):[]),
  ['Ubicación',shown(item.location)],['Estado',shown(item.status)],['Cantidad',shown(item.quantity)],['Fecha de alta',date(item.entryDate||item.createdAt)],['Última actualización',date(item.updatedAt)]
 ] : []
 // Reutilizar exactamente el editor existente de Almacén; no duplicar formularios.
  if(editing && item){
  const uuid=asText(item.id)
  const warehouseAsset={
   ...item,
   apiId:uuid,
   id:typeof item.id==='number'?item.id:0,
   pcName:asText(item.pcName),
   assetTag:asText(item.assetTag),
   serial:asText(item.serial),
   brand:asText(item.brand),
   model:asText(item.model),
   type:asText(item.type),
   location:asText(item.location),
   status:asText(item.status).toLowerCase(),
   rawStatus:asText(item.status),
   quantity:Number(item.quantity)||1
  } as unknown as WarehouseAsset
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
   return createPortal(<div role="alert" style={{position:'fixed',inset:0,zIndex:2147483000,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.85)',padding:20,color:'#fff'}}><div style={{background:'#182842',padding:24,borderRadius:16,maxWidth:450}}><p>No se puede editar: identificador del equipo invalido.</p><button type="button" onClick={()=>setEditing(false)}>Volver a detalles</button></div></div>,document.body)
  }
  return createPortal(
   <div id="it-shared-asset-editor" className="inv-root" style={{position:'fixed',inset:0,zIndex:2147483000,color:'#f3f7ff',colorScheme:'dark'}}>
    <style>{`#it-shared-asset-editor .fixed.inset-0{position:fixed!important;inset:0!important;z-index:1!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:16px!important;background:rgba(0,0,0,.84)!important;box-sizing:border-box!important}
#it-shared-asset-editor .inv-panel{box-sizing:border-box!important;flex:none!important;width:min(100%,700px)!important;max-width:700px!important;max-height:calc(100dvh - 32px)!important;overflow-y:auto!important;overscroll-behavior:contain!important;background:#15233e!important;color:#f3f7ff!important;border:1px solid #425a80!important;border-radius:18px!important;box-shadow:0 28px 90px rgba(0,0,0,.72)!important;padding:22px!important;opacity:1!important}
#it-shared-asset-editor .inv-muted{color:#b7c7e2!important}
#it-shared-asset-editor .inv-table-select{box-sizing:border-box!important;display:block!important;min-height:38px!important;width:100%!important;background:#1c2d4c!important;color:#fff!important;border:1px solid #405b87!important;border-radius:9px!important;padding:9px 11px!important;opacity:1!important}
#it-shared-asset-editor .inv-btn{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;min-height:38px!important;border:1px solid #405b87!important;border-radius:9px!important;padding:8px 13px!important;background:#23365a!important;color:#fff!important;cursor:pointer!important}
#it-shared-asset-editor .inv-btn.inv-primary{background:#a40c97!important;border-color:#ba24ad!important;color:#fff!important}
#it-shared-asset-editor .inv-btn:disabled{opacity:.55!important;cursor:not-allowed!important}
#it-shared-asset-editor .inv-note{background:#243248!important;color:#f1f5fb!important;border:1px solid #8f7447!important}
#it-shared-asset-editor input[type=checkbox]{accent-color:#af20a5!important;min-width:14px;min-height:14px}
@media(max-width:640px){#it-shared-asset-editor .inv-panel{padding:14px!important}}`}</style>
    <WarehouseAssetEditor item={warehouseAsset} onCancel={()=>setEditing(false)} onSaved={()=>window.location.reload()}/>
   </div>,document.body
  )
 }

 if(typeof document==='undefined')return null
 const inputStyle={width:'100%',border:'1px solid #4b628e',borderRadius:9,backgroundColor:'#1c2c4b',color:'#f8fafc',padding:'10px 12px'}
 return createPortal(
  <div role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose()}} style={{position:'fixed',inset:0,zIndex:2147483000,display:'flex',alignItems:'center',justifyContent:'center',padding:16,backgroundColor:'rgba(0,0,0,.84)',backdropFilter:'blur(5px)'}}>
   <section role="dialog" aria-modal="true" aria-label={editing?'Editar equipo':'Detalles del equipo'} style={{position:'relative',isolation:'isolate',width:'100%',maxWidth:700,maxHeight:'min(88dvh,850px)',overflowY:'auto',borderRadius:18,padding:24,backgroundColor:'#14213c',color:'#f8fafc',border:'1px solid #4b628e',boxShadow:'0 28px 100px rgba(0,0,0,.75)'}}>
    <div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="text-xl font-extrabold">{editing?'Editar ficha del equipo':'Detalles del equipo'}</h2><p style={{color:'#aabbd8',fontSize:12}}>{editing?'Corrige el registro existente; no crea un equipo nuevo.':'Información real consultada desde el backend'}</p></div><button type="button" onClick={onClose} disabled={busy} aria-label="Cerrar detalles" style={{border:'1px solid #486083',borderRadius:9,padding:9,backgroundColor:'#243756',color:'#fff'}}><X size={18}/></button></div>
    {loading?<p className="py-6 text-sm">Consultando datos...</p>:item?<>
     {!editing?<><div className="mb-4 flex gap-3" style={{color:'#67e8f9'}}><Cpu size={18}/><MemoryStick size={18}/><HardDrive size={18}/><CalendarDays size={18}/></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{rows.map(([key,value])=><div key={key} style={{backgroundColor:'#1c2c4b',border:'1px solid #36496c',padding:13,borderRadius:12,minWidth:0}}><span style={{display:'block',fontSize:12,color:'#aabbd8'}}>{key}</span><strong className="break-words text-sm">{value}</strong></div>)}</div><div className="mt-5 flex justify-end"><button className="inv-btn inv-primary" type="button" onClick={()=>{setEditing(true);setError('')}}><Pencil size={16}/> Editar ficha</button></div></>:<>
      <div className="mb-4 rounded-xl border border-white/10 p-3 text-sm"><strong>PCNAME: {shown(item.pcName)}</strong><p className="mt-1 text-xs text-slate-300">PCNAME y estado no se editan aquí. Para asignaciones, reparaciones o retiros utiliza los módulos correspondientes.</p></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{fields.filter(({key})=>allowSpecs || (key!=='ramGB'&&key!=='storageGB')).map(({key,label})=><label key={key} className="flex flex-col gap-1 text-xs"><span>{label}</span>{key==='type'?<select style={inputStyle} value={form.type} onChange={e=>{setForm(v=>({...v,type:e.target.value}));setConfirm(false)}}>{form.type&&!kinds.includes(form.type)&&<option value={form.type}>{form.type} (actual)</option>}{kinds.map(k=><option key={k} value={k}>{k}</option>)}</select>:<input style={inputStyle} type={key==='ramGB'||key==='storageGB'?'number':'text'} min={1} max={key==='ramGB'?1000:key==='storageGB'?100000:undefined} step={1} maxLength={key==='ramGB'||key==='storageGB'?undefined:250} value={form[key]} onChange={e=>{setForm(v=>({...v,[key]:e.target.value}));setConfirm(false)}}/>}</label>)}</div>
      <label className="mt-4 flex items-start gap-2 text-xs"><input type="checkbox" checked={confirm} onChange={e=>setConfirm(e.target.checked)}/><span>Confirmo que revisé los cambios que se guardarán en el equipo real.</span></label>
      <div className="mt-5 flex justify-end gap-2"><button className="inv-btn" type="button" disabled={busy} onClick={()=>{setEditing(false);setError('');setConfirm(false)}}>Cancelar</button><button className="inv-btn inv-primary" type="button" disabled={!confirm||busy} onClick={()=>void save()}><Save size={16}/>{busy?'Guardando...':'Guardar cambios'}</button></div>
     </>}
    </>:null}
    {error&&<p className="mt-4 text-sm text-red-400" role="alert">{error}</p>}
   </section>
  </div>,document.body)
}
