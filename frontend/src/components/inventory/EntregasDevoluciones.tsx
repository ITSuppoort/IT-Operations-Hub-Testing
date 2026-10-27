'use client'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, Clock3, PackageCheck, RotateCcw, AlertTriangle, RefreshCw } from 'lucide-react'
import { apiRequest } from '@/lib/api'

type Item={id:string;type?:string;category?:string;brand?:string;model?:string;serial?:string|null;quantity:number;location?:string|null;status?:string;positionId?:string|null}
type Balance={bucket:string;units:number}
type EventRow={id:string;action:string;quantity:number;equipment_id:string;equipment_name?:string;from_bucket:string|null;to_bucket:string;position_id:string|null;position_code?:string|null;reference?:string|null;reason:string;actor:string;created_at:string}
type Position={id:string;code?:string;name?:string;wing?:string;floor?:string|number;equipment?:unknown;user?:unknown;assignedUser?:{firstName?:string;lastName?:string;name?:string}|null;inventoryPerson?:{firstName?:string;lastName?:string;name?:string}|null;area?:{name?:string}|null;location?:{name?:string;floor?:string|number}|null}
type Detail={item:Item;reconciled:boolean;balances:Balance[];events:EventRow[]}
type Mode='ENTREGA'|'DEVOLUCION_BUENA'|'DEVOLUCION_DANADA'|'REEMPLAZO'|'REPARACION'|'BAJA'
const buckets=['WAREHOUSE_AVAILABLE','PRODUCTION','WAREHOUSE_DAMAGED','REPAIR','RETIRED'] as const
const label:Record<string,string>={WAREHOUSE_AVAILABLE:'Almacén disponible',PRODUCTION:'Producción / asignados',WAREHOUSE_DAMAGED:'Almacén dañado',REPAIR:'Reparación',RETIRED:'Baja definitiva'}
const modes:Record<Mode,{name:string;from:string;to:string}>={ENTREGA:{name:'Entregar',from:'WAREHOUSE_AVAILABLE',to:'PRODUCTION'},DEVOLUCION_BUENA:{name:'Devolver (bueno)',from:'PRODUCTION',to:'WAREHOUSE_AVAILABLE'},DEVOLUCION_DANADA:{name:'Devolver (dañado)',from:'PRODUCTION',to:'WAREHOUSE_DAMAGED'},REEMPLAZO:{name:'Entregar reemplazo',from:'WAREHOUSE_AVAILABLE',to:'PRODUCTION'},REPARACION:{name:'Enviar a reparación',from:'WAREHOUSE_DAMAGED',to:'REPAIR'},BAJA:{name:'Dar de baja',from:'WAREHOUSE_DAMAGED',to:'RETIRED'}}
const input='w-full rounded-lg border border-white/15 bg-[#091427] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400'
const num=(v:unknown)=>Math.max(0,Number(v)||0)
const requestKey=()=>crypto.randomUUID()
const err=async(r:Response)=>{try{const j=await r.json();return String(j.message||j.error||`HTTP ${r.status}`)}catch{return `HTTP ${r.status}`}}
const description=(x:Item)=>[x.type||x.category,x.brand,x.model,x.serial?`Serie ${x.serial}`:null].filter(Boolean).join(' · ')
const normalized=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
const maxPerPosition=(item?:Item)=>{
 const name=normalized(`${item?.type||''} ${item?.category||''}`)
 if(/monitor|pantalla|cable|hdmi|displayport|power cord|video/.test(name))return 2
 return 1
}
const assignedName=(p:Position)=>{
 const u=p.assignedUser||p.inventoryPerson
 return [u?.firstName,u?.lastName].filter(Boolean).join(' ').trim()||u?.name||''
}
const getFloor=(p:Position)=>String(p.floor??p.location?.floor??'')
const getArea=(p:Position)=>p.area?.name||p.wing||p.location?.name||''
const causeByType:Record<string,string[]>={
 headset:['No se escucha de un lado','No se escucha de ambos lados','Micrófono no funciona','Audio intermitente','Cable o conector dañado','Nuevo ingreso','Equipo faltante','Reposición por desgaste'],
 mouse:['Dejó de funcionar','Cursor no responde','Clic izquierdo o derecho dañado','Rueda de desplazamiento defectuosa','Cable o conector dañado','Nuevo ingreso','Equipo faltante'],
 teclado:['Tecla rota','Teclas no responden','Derrame de líquido','Cable o conector dañado','Dejó de funcionar','Nuevo ingreso','Equipo faltante'],
 monitor:['Sin imagen','Pantalla rota','Píxeles o líneas en pantalla','No enciende','Fallo de alimentación','Completar posición','Equipo faltante'],
 cable:['Cable cortado','Conector roto','Sin señal','Fallo eléctrico','Completar posición','Equipo faltante'],
 desktop:['No enciende','Rendimiento lento','Fallo de disco','Fallo de red','Reemplazo por avería','Nuevo ingreso','Completar posición'],
 laptop:['No enciende','Rendimiento lento','Fallo de batería','Pantalla dañada','Reemplazo por avería','Nuevo ingreso'],
 generic:['Nuevo ingreso','Completar posición','Reposición por daño','Fallo de funcionamiento','Equipo faltante','Devolución por salida de personal','Cambio de ubicación','Renovación de equipo']
}
const causesFor=(x?:Item):string[]=>{
 const name=`${x?.type||''} ${x?.category||''}`.toLowerCase()
 const key=Object.keys(causeByType).filter(k=>k!=='generic').find(k=>name.includes(k)||(k==='cable'&&/hdmi|power|video|red|regleta/.test(name)))
 return [...new Set([...(key?causeByType[key]:[]),...causeByType.generic])]
}


export default function EntregasDevoluciones(){
 const [items,setItems]=useState<Item[]>([]),[itemId,setItemId]=useState(''),[detail,setDetail]=useState<Detail|null>(null)
 const [positions,setPositions]=useState<Position[]>([]),[positionId,setPositionId]=useState(''),[events,setEvents]=useState<EventRow[]>([])
 const [stockOverview,setStockOverview]=useState<{equipment_id:string;bucket:string;units:number}[]>([])
 const [positionSearch,setPositionSearch]=useState(''),[floorFilter,setFloorFilter]=useState(''),[areaFilter,setAreaFilter]=useState('')
 const [mode,setMode]=useState<Mode>('ENTREGA'),[quantity,setQuantity]=useState(1),[actor,setActor]=useState(''),[reason,setReason]=useState(''),[reference,setReference]=useState('')
 const [actorReady,setActorReady]=useState(false),[actorError,setActorError]=useState('')
 const [opening,setOpening]=useState<Record<string,number>>({WAREHOUSE_AVAILABLE:0,PRODUCTION:0,WAREHOUSE_DAMAGED:0,REPAIR:0,RETIRED:0})
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [receipt,setReceipt]=useState<{eventId:string;date:string;item:string;quantity:number;operation:string;position:string;recipient:string;actor:string;ticket:string;reason:string}|null>(null)
 const selected=items.find(x=>x.id===itemId),selectedPosition=positions.find(x=>x.id===positionId),flow=modes[mode]
 const available=detail?.balances.find(x=>x.bucket===flow.from)?.units??0
 const floorChoices=[...new Set(positions.map(getFloor).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))
 const areaChoices=[...new Set(positions.filter(p=>!floorFilter||getFloor(p)===floorFilter).map(getArea).filter(Boolean))].sort()
 const filteredPositions=positions.filter(p=>(!floorFilter||getFloor(p)===floorFilter)&&(!areaFilter||getArea(p)===areaFilter)&&(!positionSearch||normalized([p.code,p.name,getArea(p),getFloor(p),assignedName(p)].join(' ')).includes(normalized(positionSearch))))
 const maxDelivery= maxPerPosition(selected)
 const stockEligible=items.filter(x=>{
  if(x.id===itemId)return true
  const from=mode.startsWith('DEVOLUCION')?'PRODUCTION':mode==='REPARACION'||mode==='BAJA'?'WAREHOUSE_DAMAGED':'WAREHOUSE_AVAILABLE'
  return stockOverview.some(b=>b.equipment_id===x.id&&b.bucket===from&&Number(b.units)>0)
 })
 const bucketAmount=(id:string,bucket:string)=>stockOverview.find(b=>b.equipment_id===id&&b.bucket===bucket)?.units??0
 const warehouseAvailable=detail?.balances.find(x=>x.bucket==='WAREHOUSE_AVAILABLE')?.units??0
 const total=detail?.balances.reduce((s,x)=>s+num(x.units),0)??0
 const sumOpening=buckets.reduce((s,k)=>s+num(opening[k]),0)
 const preview=detail?.reconciled?{beforeFrom:available,afterFrom:available-quantity,beforeTo:detail.balances.find(x=>x.bucket===flow.to)?.units??0,afterTo:(detail.balances.find(x=>x.bucket===flow.to)?.units??0)+quantity}:null
 const loadEvents=async()=>{const r=await apiRequest('/stock-engine/recent');if(!r.ok)throw Error(await err(r));const j=await r.json();setEvents(Array.isArray(j)?j:[])}
 const loadOverview=async()=>{const r=await apiRequest('/stock-engine/overview');if(!r.ok)throw Error(await err(r));const v=await r.json();setStockOverview(Array.isArray(v)?v:[])}
 const loadDetail=async(id:string)=>{if(!id){setDetail(null);return}const r=await apiRequest(`/stock-engine/equipment/${encodeURIComponent(id)}`);if(!r.ok)throw Error(await err(r));const d=await r.json() as Detail;setDetail(d);if(!d.reconciled){setOpening({WAREHOUSE_AVAILABLE:0,PRODUCTION:0,WAREHOUSE_DAMAGED:0,REPAIR:0,RETIRED:0})}}
 useEffect(()=>{let cancelled=false;(async()=>{try{
  const response=await apiRequest('/auth/me');if(!response.ok)throw new Error('La sesión no está disponible. Inicia sesión nuevamente.')
  const result=await response.json() as {user?:{firstName?:string;lastName?:string;email?:string}}
  const u=result.user;const name=[u?.firstName,u?.lastName].filter(Boolean).join(' ').trim()||u?.email||''
  if(!name)throw new Error('No se pudo identificar al técnico conectado.')
  if(!cancelled){setActor(name);setActorReady(true);setActorError('')}
 }catch(e){if(!cancelled){setActorReady(false);setActorError(e instanceof Error?e.message:'Error de sesión')}}})();return()=>{cancelled=true}},[])
 useEffect(()=>{let done=false;(async()=>{try{const [a,b,c,d]=await Promise.allSettled([apiRequest('/equipment'),apiRequest('/positions'),apiRequest('/stock-engine/recent'),apiRequest('/stock-engine/overview')]);if(done)return;if(a.status==='fulfilled'&&a.value.ok){const v=await a.value.json();setItems(Array.isArray(v)?v:[])}else setError('No se pudo consultar el inventario.');if(b.status==='fulfilled'&&b.value.ok){const v=await b.value.json();setPositions(Array.isArray(v)?v:Array.isArray(v.positions)?v.positions:[])}if(c.status==='fulfilled'&&c.value.ok){const v=await c.value.json();setEvents(Array.isArray(v)?v:[])}else setError('No se pudo consultar el motor de existencias.');if(d.status==='fulfilled'&&d.value.ok){const v=await d.value.json();setStockOverview(Array.isArray(v)?v:[])}}catch(e){if(!done)setError(e instanceof Error?e.message:'Error de carga')}finally{if(!done)setLoading(false)}})();return()=>{done=true}},[])
 useEffect(()=>{let alive=true;setError('');setNotice('');setDetail(null);if(itemId)void loadDetail(itemId).catch(e=>{if(alive)setError(e instanceof Error?e.message:'No se pudo consultar el lote')});return()=>{alive=false}},[itemId])
 const recentTransfers=events.filter(e=>e.action==='TRANSFER')
 const daily=useMemo(()=>{const today=new Date().toDateString();const rows=recentTransfers.filter(e=>new Date(e.created_at).toDateString()===today);return {out:rows.filter(e=>e.from_bucket==='WAREHOUSE_AVAILABLE'&&e.to_bucket==='PRODUCTION').reduce((n,e)=>n+num(e.quantity),0),returns:rows.filter(e=>e.from_bucket==='PRODUCTION').reduce((n,e)=>n+num(e.quantity),0)}},[events])
 const pending=items.filter(i=>!i.location&&!i.positionId).length
 const confirmed=detail?.reconciled===true
 const canTransfer=confirmed&&quantity>0&&Number.isSafeInteger(quantity)&&quantity<=available&&quantity<=maxDelivery&&actorReady&&!!actor.trim()&&!!reason.trim()&&!!reference.trim()&&(!(['ENTREGA','DEVOLUCION_BUENA','DEVOLUCION_DANADA','REEMPLAZO'] as Mode[]).includes(mode)||!!positionId)
 async function submit(){if(!selected)return;setError('');setNotice('');setReceipt(null);if(!actorReady||!actor.trim())return setError('No se pudo validar el técnico conectado.');if(!reason.trim())return setError('Selecciona un motivo.');if(!reference.trim())return setError('El número de ticket o incidencia es obligatorio.');if(!confirmed){if(sumOpening!==selected.quantity)return setError('La suma de las cinco ubicaciones debe coincidir con el total del lote.');if(!window.confirm(`¿Confirmas la conciliación de ${selected.quantity} unidad(es)? Verifica la ubicación física antes de continuar.`))return}else{if(!canTransfer)return setError(`Verifica saldo, posición y límite permitido (${maxDelivery} por operación).`);if(!window.confirm(`¿Confirmas ${modes[mode].name.toLowerCase()} ${quantity} unidad(es) de ${description(selected)}?`))return}
 setBusy(true);try{const body=confirmed?{equipmentId:itemId,fromBucket:flow.from,toBucket:flow.to,quantity,positionId:positionId||null,reason:reason.trim(),actor:actor.trim(),reference:reference.trim()||null,requestKey:requestKey()}:{equipmentId:itemId,opening,reason:reason.trim(),actor:actor.trim(),requestKey:requestKey()};const response=await apiRequest(confirmed?'/stock-engine/transfer':'/stock-engine/opening',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!response.ok)throw Error(await err(response));
 const saved=await response.json() as {eventId?:string;duplicate?:boolean};
 if(confirmed&&saved.eventId){setReceipt({eventId:saved.eventId,date:new Date().toLocaleString('es-DO'),item:description(selected),quantity,operation:modes[mode].name,position:selectedPosition?.code||'—',recipient:selectedPosition?assignedName(selectedPosition)||'Posición sin usuario':'—',actor,ticket:reference,reason})}
 await Promise.all([loadDetail(itemId),loadEvents(),loadOverview()]);setNotice(confirmed?'Movimiento confirmado y saldos actualizados. Comprobante disponible.':'Conciliación inicial guardada. Ahora puedes operar con este lote.');setReason('')}catch(e){setError(e instanceof Error?e.message:'No se pudo guardar la operación')}finally{setBusy(false)}}

 function printReceipt(){
  if(!receipt)return;
  const win=window.open('','_blank','width=800,height=720');
  if(!win){setError('Permite las ventanas emergentes para imprimir el comprobante.');return}
  win.document.title='Comprobante de entrega IT';
  const style=win.document.createElement('style');style.textContent='body{font:15px Arial,sans-serif;max-width:680px;margin:42px auto;color:#172033}h1{border-bottom:2px solid #26364f;padding-bottom:14px}dl{display:grid;grid-template-columns:190px 1fr;gap:13px}dt{font-weight:bold}dd{margin:0}footer{margin-top:60px;display:flex;gap:80px}';
  win.document.head.appendChild(style);
  const title=win.document.createElement('h1');title.textContent='IT Operations Hub · Comprobante de movimiento';win.document.body.appendChild(title);
  const fields:[string,string][]=[['Operación',receipt.operation],['Folio',receipt.eventId],['Fecha',receipt.date],['Equipo',receipt.item],['Cantidad',String(receipt.quantity)],['Posición',receipt.position],['Usuario / destinatario',receipt.recipient],['Responsable IT',receipt.actor],['Ticket',receipt.ticket],['Motivo',receipt.reason]];
  const dl=win.document.createElement('dl');fields.forEach(([k,v])=>{const dt=win.document.createElement('dt');dt.textContent=k;const dd=win.document.createElement('dd');dd.textContent=v;dl.append(dt,dd)});win.document.body.appendChild(dl);
  const foot=win.document.createElement('footer');foot.textContent='Recibido por: _______________________      Entregado por: _______________________';win.document.body.appendChild(foot);
  win.focus();win.print();
 }
 return <section className="mt-5 space-y-3 text-slate-100">
 <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
 {title:'Entregas hoy',value:daily.out,sub:'Unidades entregadas desde almacén',Icon:PackageCheck,tone:'text-emerald-300'},
 {title:'Devoluciones hoy',value:daily.returns,sub:'Unidades recibidas desde producción',Icon:RotateCcw,tone:'text-purple-300'},
 {title:'Operaciones recientes',value:recentTransfers.length,sub:'Últimos movimientos consultados',Icon:ArrowLeftRight,tone:'text-amber-300'},
 {title:'Equipos sin ubicación',value:pending,sub:'Requieren verificación de ubicación',Icon:AlertTriangle,tone:'text-rose-300'}
 ].map(k=><div key={k.title} className="rounded-2xl border border-cyan-500/25 bg-[#10223b] p-4"><div className="flex items-start justify-between gap-2"><div><p className="text-xs font-semibold">{k.title}</p><strong className="mt-1 block text-3xl tabular-nums">{k.value}</strong></div><k.Icon className={k.tone} size={25}/></div><p className="mt-2 text-[11px] text-slate-400">{k.sub}</p><div className="mt-3 h-1 rounded-full bg-slate-700/80"/></div>)}</div>
 <div className="grid gap-3 xl:grid-cols-[minmax(0,1.55fr)_minmax(270px,1fr)_minmax(240px,.8fr)]">
 <div className="rounded-2xl border border-cyan-500/25 bg-[#102039] p-4 sm:p-5"><h2 className="font-bold text-lg">Nueva operación</h2><p className="text-xs text-slate-400 mt-1">Entregar, devolver o reemplazar equipos sin alterar su total global.</p>
 <div className="mt-4 grid grid-cols-3 gap-1 rounded-lg border border-white/10 p-1">{(['ENTREGA','DEVOLUCION_BUENA','REEMPLAZO'] as Mode[]).map(m=><button key={m} type="button" onClick={()=>setMode(m)} className={`rounded-md py-2 text-xs ${mode===m?'bg-blue-600 font-bold':'hover:bg-white/5 text-slate-300'}`}>{m==='ENTREGA'?'Entregar':m==='DEVOLUCION_BUENA'?'Devolver':'Reemplazar'}</button>)}</div>
 <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium sm:col-span-2">Activo o lote<select className={`${input} mt-1`} value={itemId} onChange={e=>{setItemId(e.target.value);setQuantity(1);setReason('')}}><option value="">Seleccionar equipo</option>{stockEligible.map(i=><option key={i.id} value={i.id}>{description(i)}{i.id===itemId?(detail?.reconciled?` · Disponibles: ${warehouseAvailable}`:' · Saldo por verificar'):` · Disponibles: ${bucketAmount(i.id,mode.startsWith('DEVOLUCION')?'PRODUCTION':'WAREHOUSE_AVAILABLE')}`}</option>)}</select>{selected&&<span className="mt-1 block text-cyan-300">Disponibles en almacén: {detail?.reconciled?warehouseAvailable:'Sin saldo confirmado'} · Total global: {selected.quantity} · Máximo por posición: {maxDelivery}</span>}
 {!stockEligible.length&&<p role="alert" className="mt-2 text-xs text-amber-200">No hay equipos con saldo para esta operación. Consulta Almacén o solicita reposición.</p>}
 {selected&&detail?.reconciled&&warehouseAvailable===0&&<p role="alert" className="mt-2 rounded-lg border border-amber-400/30 bg-amber-400/10 p-2 text-xs text-amber-200">No hay unidades disponibles de este equipo. Solicita reposición a Compras/Almacén.</p>}</label>
  {confirmed?<><label className="text-xs">Cantidad<input className={`${input} mt-1`} type="number" min="1" max={Math.min(available,maxDelivery)} value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label><label className="text-xs">Tipo de operación<select className={`${input} mt-1`} value={mode} onChange={e=>setMode(e.target.value as Mode)}>{(Object.keys(modes) as Mode[]).map(m=><option key={m} value={m}>{modes[m].name}</option>)}</select></label><div className="sm:col-span-2 rounded-lg border border-white/10 p-3"><strong className="text-xs">Destinatario: buscar usuario o posición</strong>
 <div className="mt-2 grid gap-2 sm:grid-cols-3"><input aria-label="Buscar persona o posición" className={input} placeholder="Nombre, apellido o código" value={positionSearch} onChange={e=>setPositionSearch(e.target.value)}/>
 <select aria-label="Filtrar piso" className={input} value={floorFilter} onChange={e=>{setFloorFilter(e.target.value);setAreaFilter('')}}><option value="">Todos los pisos</option>{floorChoices.map(f=><option key={f} value={f}>Piso {f}</option>)}</select>
 <select aria-label="Filtrar área" className={input} value={areaFilter} onChange={e=>setAreaFilter(e.target.value)}><option value="">Todas las áreas</option>{areaChoices.map(a=><option key={a} value={a}>{a}</option>)}</select></div>
 <select aria-label="Seleccionar posición" className={`${input} mt-2`} value={positionId} onChange={e=>setPositionId(e.target.value)}><option value="">Seleccionar posición ({filteredPositions.length} resultados)</option>{filteredPositions.map(p=><option key={p.id} value={p.id}>{p.code||p.name||p.id} · Piso {getFloor(p)||'?'} · {getArea(p)||'Sin área'}{assignedName(p)?` · ${assignedName(p)}`:' · Disponible'}</option>)}{selectedPosition&&!filteredPositions.some(p=>p.id===selectedPosition.id)&&<option value={selectedPosition.id}>{selectedPosition.code||selectedPosition.id} (seleccionada)</option>}</select>
 <p className="mt-2 text-[11px] text-slate-400">Cantidad máxima de {selected?.type||'este equipo'} por entrega: {maxDelivery}. Solo aparecen posiciones existentes.</p></div></>:null}
 <label className="text-xs">Responsable IT (sesión activa)<input className={`${input} mt-1`} value={actorReady?actor:'Verificando sesión...'} readOnly aria-readonly="true" />{actorError&&<span className="block text-rose-300 mt-1">{actorError}</span>}</label><label className="text-xs">Ticket / incidencia *<input className={`${input} mt-1`} required value={reference} maxLength={250} onChange={e=>setReference(e.target.value)} placeholder="Ej.: INC-2026-001"/></label>
 <label className="text-xs sm:col-span-2">Motivo de la operación *<select className={`${input} mt-1`} required value={reason} onChange={e=>setReason(e.target.value)}><option value="">Seleccionar motivo</option>{causesFor(selected).map(c=><option key={c} value={c}>{c}</option>)}</select></label></div>
 {!confirmed&&detail&&<div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/[.07] p-3"><strong className="text-xs text-amber-200">Conciliación inicial pendiente</strong><p className="mt-1 text-xs text-slate-300">Verifica físicamente el reparto antes de aprobarlo. No se ha registrado ninguna entrega.</p><button type="button" onClick={()=>setOpening({WAREHOUSE_AVAILABLE:selected?.quantity||0,PRODUCTION:0,WAREHOUSE_DAMAGED:0,REPAIR:0,RETIRED:0})} className="mt-3 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/20">Confirmé que todo este lote antiguo está disponible en almacén</button><p className="mt-1 text-[11px] text-amber-200">Solo úsalo después de comprobar la ubicación física; no hace descuentos ni duplica unidades.</p><div className="grid grid-cols-2 gap-2 mt-3 sm:grid-cols-3">{buckets.map(k=><label key={k} className="text-[11px]">{label[k]}<input className={`${input} mt-1`} type="number" min={0} max={selected?.quantity} value={opening[k]} onChange={e=>setOpening(old=>({...old,[k]:Math.max(0,Math.trunc(Number(e.target.value)||0))}))}/></label>)}</div><p className="mt-2 text-xs">Distribución: {sumOpening} / {selected?.quantity}</p></div>}
 <button type="button" onClick={()=>void submit()} disabled={busy||!selected||!actorReady||!actor.trim()||!reference.trim()||!reason.trim()||(confirmed?!canTransfer:sumOpening!==selected.quantity)} className="mt-4 w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-bold hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-40">{busy?'Procesando...':!confirmed?'Confirmar saldo inicial':'Confirmar operación'}</button>
 {loading&&<p className="mt-2 text-xs">Cargando datos...</p>}{error&&<p role="alert" className="mt-3 rounded-lg bg-red-500/10 border border-red-400/30 p-3 text-xs text-red-200">{error}</p>}{notice&&<p role="status" className="mt-3 rounded-lg bg-green-500/10 border border-green-400/30 p-3 text-xs text-green-200">{notice}</p>}{receipt&&<div className="mt-3 rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-3 text-xs"><strong>Comprobante confirmado · {receipt.eventId}</strong><p className="mt-1">{receipt.item} · {receipt.quantity} unidad(es) · {receipt.recipient} · {receipt.position}</p><button type="button" onClick={printReceipt} className="mt-2 rounded-lg border border-emerald-400/40 px-3 py-2 font-semibold">Imprimir / guardar PDF</button></div>}</div>
 <div className="rounded-2xl border border-cyan-500/25 bg-[#102039] p-4"><h2 className="font-semibold">Posición y equipamiento actual</h2><p className="text-xs text-slate-400 mt-1">Datos de la posición seleccionada, sin estimar equipos.</p><div className="mt-4 space-y-2 text-sm">{[['Posición',selectedPosition?.code||selectedPosition?.name||'Sin seleccionar'],['Piso',selectedPosition?getFloor(selectedPosition)||'—':'—'],['Área',selectedPosition?getArea(selectedPosition)||'—':'—'],['Usuario',selectedPosition?assignedName(selectedPosition)||'Sin usuario':'—'],['Equipo seleccionado',selected?description(selected):'—'],['Cantidad global',selected?.quantity??'—'],['Conciliación',selected?(confirmed?'Verificada':'Pendiente'):'—']].map(([k,v])=><div key={k} className="flex justify-between gap-2 border-b border-white/10 py-2"><span className="text-slate-400">{k}</span><strong className="text-right break-all text-xs">{v}</strong></div>)}</div><p className="mt-4 text-xs text-amber-200">Los accesorios existentes en posiciones se conservan. La asignación de nuevas unidades por posición se sincronizará en la segunda integración.</p></div>
 <div className="space-y-3"><div className="rounded-2xl border border-amber-400/25 bg-[#102039] p-4"><div className="flex items-center gap-2"><Clock3 className="text-amber-300" size={19}/><strong className="text-sm">Estado del lote</strong></div><p className="mt-3 text-xs text-slate-300">{!selected?'Selecciona un lote para consultar sus existencias.':!confirmed?'Este lote necesita conciliación antes de realizar entregas.':'Lote conciliado: se pueden realizar movimientos con saldo disponible.'}</p></div>
 <div className="rounded-2xl border border-cyan-500/25 bg-[#102039] p-4"><h3 className="font-semibold text-sm">Impacto en inventario</h3><p className="text-xs text-slate-400 mt-1">Vista previa; no modifica cantidades.</p>{preview?<div className="mt-3 space-y-3 text-xs"><div className="flex justify-between gap-2"><span>{label[flow.from]}</span><strong>{preview.beforeFrom} → <span className={preview.afterFrom<0?'text-red-300':'text-amber-300'}>{preview.afterFrom}</span></strong></div><div className="flex justify-between gap-2"><span>{label[flow.to]}</span><strong>{preview.beforeTo} → <span className="text-emerald-300">{preview.afterTo}</span></strong></div><div className="flex justify-between gap-2 border-t border-white/10 pt-2"><span>Total global</span><strong>{total} (sin cambio)</strong></div></div>:<p className="mt-3 text-xs text-slate-400">Selecciona un lote conciliado para ver el impacto.</p>}</div></div></div>
 <div className="rounded-2xl border border-cyan-500/25 bg-[#102039] p-4"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Historial reciente de entregas y devoluciones</h2><p className="text-xs text-slate-400">Movimientos registrados en el motor de existencias</p></div><button className="flex gap-1 items-center text-xs text-cyan-300" onClick={()=>void loadEvents().catch(e=>setError(e instanceof Error?e.message:'Error consultando historial'))}><RefreshCw size={14}/> Actualizar</button></div><div className="mt-3 overflow-auto"><table className="w-full min-w-[820px] text-left text-xs"><thead><tr className="text-slate-400">{['Fecha','Operación','Equipo','Cantidad','Origen → Destino','Posición','Responsable / Motivo'].map(h=><th className="border-b border-white/10 px-2 py-2" key={h}>{h}</th>)}</tr></thead><tbody>{events.map(e=><tr key={e.id} className="border-b border-white/[.06]"><td className="px-2 py-2">{new Date(e.created_at).toLocaleDateString('es-DO')}</td><td className="px-2 py-2">{e.action==='OPENING'?'Conciliación':e.to_bucket==='PRODUCTION'?'Entrega':e.to_bucket==='WAREHOUSE_DAMAGED'?'Devolución dañada':e.from_bucket==='PRODUCTION'?'Devolución':'Traslado'}</td><td className="px-2 py-2">{e.equipment_name||e.equipment_id}</td><td className="px-2 py-2">{e.quantity}</td><td className="px-2 py-2">{label[e.from_bucket||'']||'Inicial'} → {label[e.to_bucket]||e.to_bucket}</td><td className="px-2 py-2">{e.position_code||'—'}</td><td className="px-2 py-2">{e.actor} · {e.reason}</td></tr>)}</tbody></table>{!events.length&&<p className="py-6 text-center text-xs text-slate-400">No hay movimientos registrados todavía.</p>}</div></div>
 </section>
}
