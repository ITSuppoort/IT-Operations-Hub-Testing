'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, ChevronDown, Minus, PackagePlus, Plus, X } from 'lucide-react'
import { apiRequest } from '@/lib/api'

const items = [
  {name:'Desktop',group:'principal',brands:['Dell','HP','Lenovo','MSI']},
  {name:'Laptop',group:'principal',brands:['Dell','HP','Lenovo','MSI']},
  {name:'All in One',group:'principal',brands:['Dell','HP','Lenovo','MSI']},
  {name:'Monitor',group:'principal',brands:['Dell','HP','Lenovo','Samsung','LG','AOC']},
  {name:'Impresoras',group:'principal',brands:['HP','Brother','Epson','Canon']},
  {name:'Webcam',group:'principal',brands:['Logitech','Dell','HP']},
  {name:'Teclado',group:'peripheral',brands:['Dell','Logitech']},
  {name:'Mouse',group:'peripheral',brands:['Dell','Logitech']},
  {name:'Headset',group:'peripheral',brands:['Jabra','Logitech','JBL']},
  {name:'Docking Station',group:'peripheral',brands:['Dell','9 en 1']},
  {name:'UPS',group:'peripheral',brands:['Forza']},
  {name:'Regleta',group:'peripheral',brands:[]},
  {name:'Cable de red',group:'component',brands:[]},
  {name:'Cables de video',group:'component',brands:[]},
  {name:'Cables de poder / fuente',group:'component',brands:[]},
  {name:'Cargador de laptop',group:'component',brands:[]},
  {name:'SSD',group:'component',brands:['Kingston','Crucial','Samsung','Western Digital','ADATA']},
  {name:'HDD',group:'component',brands:['Seagate','Western Digital','Toshiba']},
  {name:'Memoria RAM',group:'component',brands:['Kingston','Crucial','Corsair','ADATA']},
  {name:'Otros componentes',group:'component',brands:[]},
] as const
const computers = ['Desktop','Laptop','All in One']
type Language = 'es' | 'en'
const translations: Record<string,string> = {
 'Nuevo activo':'New asset','Datos generales':'General information','Especificaciones':'Specifications','Revisar y guardar':'Review and save',
 'Tipo de activo':'Asset type','Selecciona tipo':'Select type','Marca':'Brand','Otra marca':'Other brand','Escribe la marca':'Enter the brand',
 'Modelo':'Model','Número de serie':'Serial number','Cantidad':'Quantity','Estado inicial':'Initial status',
 'Disponible en almacén':'Available in stock','En uso / Asignado':'In use / Assigned','Dañado':'Damaged','En reparación':'Under repair',
 'Generación Intel':'Intel generation','Procesador Intel Core':'Intel Core processor','Capacidad / detalle':'Capacity / details',
 'Cable de video':'Video cable','Tipo de conexión':'Connection type','Seleccionar':'Select',
 'Cancelar':'Cancel','Registrar activo':'Register asset','Guardando...':'Saving...',
 'Campos obligatorios':'Required fields','No se inventan asignaciones ni ubicaciones.':'No assignments or locations are fabricated.',
 'Ingresa un modelo':'Enter a model','Ingresa el serial':'Enter the serial','Observaciones':'Notes',
 'La cantidad debe estar entre 1 y 1000.':'Quantity must be between 1 and 1000.',
 'Elige un tipo de activo.':'Select an asset type.','La marca es obligatoria.':'Brand is required.',
 'El modelo es obligatorio para este equipo.':'Model is required for this device.',
 'El número de serie es obligatorio para este equipo.':'Serial number is required for this device.',
 'Ya existe un equipo con ese número de serie.':'An asset with that serial number already exists.',
 'Un activo con serie individual debe registrarse de uno en uno.':'Serialized assets must be registered one at a time.',
 'La API no pudo registrar el activo.':'The API could not save the asset.'
}
const tr=(language:Language,text:string)=>language==='en'?(translations[text]||text):text
export default function InventoryNewAsset({onClose,onSaved,existingSerials}:{onClose:()=>void;onSaved:()=>void;existingSerials:string[]}) {
 const [language,setLanguage]=useState<Language>('es')
 const [type,setType]=useState('')
 const [brand,setBrand]=useState('')
 const [otherBrand,setOtherBrand]=useState('')
 const [model,setModel]=useState('')
 const [serial,setSerial]=useState('')
 const [aioPcName,setAioPcName]=useState('')
 const [quantity,setQuantity]=useState(1)
 const [status,setStatus]=useState('ACTIVE')
 const [processor,setProcessor]=useState('')
 const [generation,setGeneration]=useState('')
 const [capacity,setCapacity]=useState('')
 const [ramGB,setRamGB]=useState('')
 const [storageGB,setStorageGB]=useState('')
 const [connection,setConnection]=useState('')
 const [error,setError]=useState('')
 const [busy,setBusy]=useState(false)
 const [review,setReview]=useState(false)
 const selected=items.find(item=>item.name===type)
 const isComputer=computers.includes(type)
 const isAio=type.toLowerCase()==='all in one'
 const serialized=isComputer||type==='Headset'
 const pcPreview=isComputer&&serial.trim()?`${type==='Laptop'?'TRUELPT':'TRUEWKS'}-${serial.trim().toUpperCase()}`:''
 const needBrand=selected && selected.brands.length>0
 useEffect(()=>{
  const sync=()=>{const html=document.documentElement;const body=document.body;const raw=html.getAttribute('data-it-language')||body.getAttribute('data-it-language')||html.lang;setLanguage(raw?.toLowerCase().startsWith('en')?'en':'es')}
  sync();const observer=new MutationObserver(sync);observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-it-language','lang']});observer.observe(document.body,{attributes:true,attributeFilter:['data-it-language']});return()=>observer.disconnect()
 },[])
 useEffect(()=>{const handle=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!busy)onClose()};window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle)},[busy,onClose])
 const submit=async()=>{
  if(busy)return
  setError('')
  if(!selected){setError(tr(language,'Elige un tipo de activo.'));return}
  const actualBrand=(brand==='__other__'?otherBrand:brand).trim()
  if(needBrand&&!actualBrand){setError(tr(language,'La marca es obligatoria.'));return}
  if(isComputer&&!model.trim()){setError(tr(language,'El modelo es obligatorio para este equipo.'));return}
  if(serialized&&!serial.trim()){setError(tr(language,'El número de serie es obligatorio para este equipo.'));return}
  if(!Number.isSafeInteger(quantity)||quantity<1||quantity>1000){setError(tr(language,'La cantidad debe estar entre 1 y 1000.'));return}
  if(serial.trim()&&existingSerials.some(value=>value.trim().toLowerCase()===serial.trim().toLowerCase())){setError(tr(language,'Ya existe un equipo con ese número de serie.'));return}
  if(serial.trim()&&quantity!==1){setError(tr(language,'Un activo con serie individual debe registrarse de uno en uno.'));return}
  if(isComputer && (!processor || !generation || !ramGB || !storageGB || !Number.isInteger(Number(ramGB)) || Number(ramGB)<1 || Number(ramGB)>1000 || !Number.isInteger(Number(storageGB)) || Number(storageGB)<1 || Number(storageGB)>100000)){setError(language==='es'?'Completa procesador, generación, RAM y almacenamiento.':'Complete CPU, generation, RAM and storage.');return}
  if(!review){setReview(true);return}
  // La creación guarda Equipment y apertura de stock juntos cuando el estado es Disponible en almacén.
  // Processor / generation require dedicated schema columns; they are not submitted until a reviewed migration.
  const detail=[capacity.trim(),type==='Cables de video'?connection:''].filter(Boolean).join(' | ')
  const payload={category:selected.group,type,brand:actualBrand||'Sin marca',model:model.trim()||null,serial:serial.trim()||null,quantity,condition:status==='DAMAGED'?'DAMAGED':'NEW',status,pcName:isAio?(aioPcName.trim()||null):null,assignedUser:null,location:status==='ACTIVE'?'Almacen':null,ramGB:isComputer?Number(ramGB):null,storageGB:isComputer?Number(storageGB):null}
  try{
   setBusy(true)
   const response=await apiRequest('/equipment',{method:'POST',body:JSON.stringify(payload)})
   if(!response.ok){const body=await response.json().catch(()=>null) as {message?:string}|null;throw new Error(body?.message||`${tr(language,'La API no pudo registrar el activo.')} (${response.status})`)}
   onSaved()
  }catch(e){setError(e instanceof Error?e.message:tr(language,'La API no pudo registrar el activo.'))}finally{setBusy(false)}
 }
 const field='inv-i3-field'
 const label=(text:string)=><span className="inv-i3-label">{tr(language,text)}</span>
 const content=<div className="inv-i3-overlay" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)onClose()}}>
  <section role="dialog" aria-modal="true" aria-label={tr(language,'Nuevo activo')} className="inv-i3-dialog">
   <header className="inv-i3-header"><div className="inv-i3-headicon"><PackagePlus size={25}/></div><div className="min-w-0 flex-1"><p className="inv-i3-eyebrow">IT ASSET MANAGEMENT / STORE</p><h2 className="text-xl font-extrabold">{tr(language,'Nuevo activo')}</h2><p className="inv-i3-muted text-xs">{tr(language,'No se inventan asignaciones ni ubicaciones.')}</p></div><button type="button" className="inv-i3-close" aria-label="Cerrar" disabled={busy} onClick={onClose}><X size={20}/></button></header>
   <div className="inv-i3-scroll" onChange={()=>{if(review)setReview(false)}}><div className="inv-i3-sectiontitle"><CheckCircle2 size={17}/>{tr(language,'Datos generales')}</div>
    <div className="inv-i3-grid"><label className={field}>{label('Tipo de activo')}<span className="inv-i3-required">*</span><select value={type} onChange={e=>{setType(e.target.value);setBrand('');setOtherBrand('');setSerial('');setAioPcName('');setQuantity(1);setError('')}}><option value="">{tr(language,'Selecciona tipo')}</option>{items.map(item=><option key={item.name} value={item.name}>{item.name}</option>)}</select></label>
    <label className={field}>{label('Marca')}{needBrand?<span className="inv-i3-required">*</span>:null}{needBrand?<select value={brand} onChange={e=>{setBrand(e.target.value);setError('')}}><option value="">{tr(language,'Seleccionar')}</option>{selected?.brands.map(item=><option key={item} value={item}>{item}</option>)}<option value="__other__">{tr(language,'Otra marca')}</option></select>:<input value={otherBrand} onChange={e=>setOtherBrand(e.target.value)} placeholder={tr(language,'Otra marca')}/>}</label>
    {needBrand&&brand==='__other__'&&<label className={field}>{label('Escribe la marca')}<span className="inv-i3-required">*</span><input value={otherBrand} onChange={e=>setOtherBrand(e.target.value)} maxLength={80}/></label>}
    {(isComputer||type==='Docking Station'||type==='Monitor'||type==='Impresoras')&&<label className={field}>{label('Modelo')}{isComputer&&<span className="inv-i3-required">*</span>}<input value={model} onChange={e=>setModel(e.target.value)} placeholder={tr(language,'Ingresa un modelo')}/></label>}
    {selected&&<label className={field}>{label('Número de serie')}{serialized&&<span className="inv-i3-required">*</span>}<input value={serial} onChange={e=>setSerial(e.target.value)} placeholder={tr(language,'Ingresa el serial')}/></label>}
    {isAio&&<label className={field} style={{gridColumn:'1/-1'}}>{language==='es'?'PCNAME (opcional, solo All in One)':'PCNAME (optional, All in One only)'}<input value={aioPcName} onChange={e=>setAioPcName(e.target.value)} maxLength={80} placeholder={language==='es'?'Escribir PCNAME o dejar vacío':'Enter PCNAME or leave blank'}/><small>{language==='es'?'No se genera desde el serial.':'Not generated from serial.'}</small></label>}
    {isComputer&&!isAio&&<div className="inv-f4-preview" role="status" style={{gridColumn:'1/-1'}}><strong>PCNAME · {language==='es'?'automático':'automatic'}</strong><div>{pcPreview||'Introduce el serial para previsualizarlo'}</div><small>{language==='es'?'El serial se escribe manualmente. El PCNAME no se edita.':'The serial is entered manually. PCNAME is automatic.'}</small></div>}
    <label className={field}>{label('Cantidad')}<span className="inv-i3-required">*</span><div className="inv-i3-counter"><button type="button" disabled={quantity<=1||busy} onClick={()=>{setReview(false);setQuantity(v=>Math.max(1,v-1))}} aria-label="Reducir cantidad"><Minus size={15}/></button><input aria-label={tr(language,'Cantidad')} type="number" min={1} max={1000} step={1} value={quantity} onChange={e=>setQuantity(e.target.value===''?0:Number(e.target.value))}/><button type="button" disabled={quantity>=1000||busy} onClick={()=>{setReview(false);setQuantity(v=>Math.min(1000,v+1))}} aria-label="Aumentar cantidad"><Plus size={15}/></button></div></label>
    <label className={field}>{label('Estado inicial')}<select value={status} onChange={e=>setStatus(e.target.value)}><option value="ACTIVE">{tr(language,'Disponible en almacén')}</option><option value="DAMAGED">{tr(language,'Dañado')}</option><option value="REPAIR">{tr(language,'En reparación')}</option></select></label></div>
    {selected&&<><div className="inv-i3-sectiontitle mt-5"><ChevronDown size={17}/>{tr(language,'Especificaciones')}</div><div className="inv-i3-grid">
     {isComputer&&<><label className={field}>{label('Procesador Intel Core')}<select value={processor} onChange={e=>setProcessor(e.target.value)}><option value="">{tr(language,'Seleccionar')}</option>{['i3','i5','i7','i9'].map(p=><option value={`Intel Core ${p}`} key={p}>Intel Core {p}</option>)}</select></label><label className={field}>{label('Generación Intel')}<select value={generation} onChange={e=>setGeneration(e.target.value)}><option value="">{tr(language,'Seleccionar')}</option>{Array.from({length:15},(_,i)=>i+1).map(v=><option key={v} value={String(v)}>{v}</option>)}</select></label></>}
     {isComputer&&<><label className={field}>{language==='es'?'RAM (GB)':'RAM (GB)'}<span className="inv-i3-required">*</span><input type="number" min={1} max={1000} step={1} value={ramGB} onChange={e=>setRamGB(e.target.value)} placeholder="Ej. 16"/></label><label className={field}>{language==='es'?'Disco / almacenamiento (GB)':'Storage (GB)'}<span className="inv-i3-required">*</span><input type="number" min={1} max={100000} step={1} value={storageGB} onChange={e=>setStorageGB(e.target.value)} placeholder="Ej. 512"/></label></>}
     {type==='Cables de video'&&<label className={field}>{label('Tipo de conexión')}<select value={connection} onChange={e=>setConnection(e.target.value)}><option value="">{tr(language,'Seleccionar')}</option>{['HDMI','DisplayPort','VGA','USB-C a HDMI','HDMI a DisplayPort','Otro'].map(v=><option key={v} value={v}>{v}</option>)}</select></label>}
     {['SSD','HDD','Memoria RAM','UPS','Otros componentes'].includes(type)&&<label className={field}>{label('Capacidad / detalle')}<input value={capacity} onChange={e=>setCapacity(e.target.value)} placeholder="Ej. 16 GB / 1 TB"/></label>}
    </div></>}
    <p className="inv-i3-help">{language==='es'?'Los accesorios sin serie se registran por cantidad. Una serie identifica una unidad y exige cantidad 1. No se realizan asignaciones automáticamente.':'Accessories without a serial number are recorded by quantity. A serial number represents one unit. No assignments are made automatically.'}</p>
    {review&&selected&&<div role="status" className="inv-i3-help" style={{borderColor:'var(--it-accent, #6d5dfc)',marginTop:12}}><strong>{language==='es'?'CONFIRMAR REGISTRO':'CONFIRM REGISTRATION'}</strong><div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:8,marginTop:8}}><span>{tr(language,'Tipo de activo')}: <b>{type}</b></span><span>{tr(language,'Marca')}: <b>{(brand==='__other__'?otherBrand:brand)||'—'}</b></span><span>{tr(language,'Modelo')}: <b>{model||'—'}</b></span><span>{tr(language,'Número de serie')}: <b>{serial||'—'}</b></span>{isAio&&<span>PCNAME: <b>{aioPcName.trim()||'Sin PCNAME'}</b></span>}<span>{tr(language,'Cantidad')}: <b>{quantity}</b></span><span>{tr(language,'Estado inicial')}: <b>{status}</b></span>{isComputer&&<><span>RAM: <b>{ramGB} GB</b></span><span>Disco: <b>{storageGB} GB</b></span><span>CPU: <b>{processor}</b></span><span>Generación: <b>{generation}</b></span></>}</div><p style={{marginTop:9}}>{language==='es'?'Al confirmar se creará el registro en la API. No se asignará a personas ni posiciones.':'Confirming will create the API record. No person or position will be assigned.'}</p></div>}
    {error&&<p role="alert" className="inv-i3-error">{error}</p>}
   </div>
   <footer className="inv-i3-footer"><span className="inv-i3-muted hidden text-xs sm:block">{language==='es'?'Registro directo en /equipment':'Direct registration to /equipment'}</span><div className="flex gap-2"><button type="button" disabled={busy} className="inv-i3-secondary" onClick={onClose}>{tr(language,'Cancelar')}</button><button type="button" disabled={busy} className="inv-i3-primary" onClick={()=>void submit()}>{busy?tr(language,'Guardando...'):review?(language==='es'?'Confirmar y registrar':'Confirm and register'):(language==='es'?'Revisar datos':'Review details')}</button></div></footer>
  </section></div>
 return typeof document==='undefined'?null:createPortal(content,document.body)
}
