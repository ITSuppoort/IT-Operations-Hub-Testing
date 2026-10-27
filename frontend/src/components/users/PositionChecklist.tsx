"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Check, CheckCircle2, AlertTriangle, Minus, Plus, Save, Monitor, MonitorSmartphone, MousePointer2, Keyboard, PlugZap, Cable, Network, Power, BatteryCharging, Package2, X, ShoppingCart } from "lucide-react";

type Equipment = {category:string; role?:string; quantity?:number};
type Props={positionId:string;positionCode:string; main?:{category?:string;type?:string|null}|null; accessories:Equipment[]; onComputedChange?:(state:{completed:number;total:number;isComplete:boolean;isEmpty:boolean;saved:boolean})=>void;onReviewSaved?:()=>void;onManageMain?:()=>void};
type Rule={key:string;name:string;desktop:number;laptop:number;allinone:number};
type Lot={id:string;category:string;type:string|null;brand:string;model:string|null;quantity:number;available:number;production:number;reconciled:boolean;role:string};
type Allocation={id:string;positionId:string;equipmentId:string;role:string;quantity:number;brand:string;model:string|null};

const rules:Rule[]=[
 {key:"computer",name:"Equipo principal",desktop:1,laptop:1,allinone:1},
 {key:"monitor",name:"Monitores",desktop:2,laptop:1,allinone:0},
 {key:"mouse",name:"Mouse",desktop:1,laptop:1,allinone:1},
 {key:"keyboard",name:"Teclado",desktop:1,laptop:1,allinone:1},
 {key:"power",name:"Cables de poder / fuente",desktop:3,laptop:0,allinone:1},
 {key:"video",name:"Cables de video",desktop:2,laptop:1,allinone:0},
 {key:"network",name:"Cable de red (RJ45)",desktop:1,laptop:1,allinone:1},
 {key:"strip",name:"Regleta (opcional en Laptop/AIO)",desktop:1,laptop:0,allinone:0},
 {key:"charger",name:"Cargador de laptop",desktop:0,laptop:1,allinone:0},
];

const ruleIcons:Record<string,typeof Monitor>={
 computer:MonitorSmartphone,monitor:Monitor,mouse:MousePointer2,keyboard:Keyboard,
 power:PlugZap,video:Cable,network:Network,strip:Power,charger:BatteryCharging
};

function categoryOf(value:string):string{
 const t=value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
 if(/ALL.IN.ONE|ALL IN ONE|AIO/.test(t))return "allinone";
 if(/LAPTOP|NOTEBOOK|PORTATIL/.test(t))return "laptop";
 if(/DESKTOP|ALL.IN.ONE|COMPUTADORA|\bPC\b/.test(t))return "computer";
 if(/MONITOR|PANTALLA|DISPLAY/.test(t))return "monitor";
 if(/MOUSE|RATON/.test(t))return "mouse";
 if(/KEYBOARD|TECLADO/.test(t))return "keyboard";
 if(/CARGADOR|CHARGER|ADAPTADOR.*(CORRIENTE|LAPTOP)/.test(t))return "charger";
 if(/REGLETA|POWER STRIP|MULTITOMA/.test(t))return "strip";
 if(/CABLE/.test(t)&&/PODER|POWER|CORRIENTE/.test(t))return "power";
 if(/CABLE/.test(t)&&/RED|ETHERNET|LAN|RJ45/.test(t))return "network";
 if(/HDMI|DISPLAYPORT|\bDP\b|VGA|CABLE DE VIDEO/.test(t))return "video";
 return "other";
}

function stockButtonClass(available:number){
 if(available===0)return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
 if(available<=3)return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
 return 'border-blue-500/40 bg-blue-500/15 text-blue-200';
}

function stockLabel(available:number){
 if(available===0)return 'No disponible';
 if(available<=3)return `Escaseando · ${available}`;
 return `Disponible · ${available}`;
}

export default function PositionChecklist({positionId,positionCode,main,accessories,onComputedChange,onReviewSaved,onManageMain}:Props){
 const detected=categoryOf([main?.category||'',main?.type||''].join(' '));
 const profile: 'desktop'|'laptop'|'allinone'=detected==='laptop'?'laptop':detected==='allinone'?'allinone':'desktop';
 const laptop=profile==='laptop';
 const allinone=profile==='allinone';
 const registered=useMemo(()=>{
  const counts:Record<string,number>=Object.fromEntries(rules.map(r=>[r.key,0]));
  if(main)counts.computer=1;
  for(const a of accessories){
    const key=categoryOf([a.role||'',a.category||''].join(' '));
    if(key in counts)counts[key]+=Math.max(0,Number(a.quantity)||0);
  }
  return counts;
 },[main,accessories]);

 const [draft,setDraft]=useState<Record<string,number>>({});
 const [reason,setReason]=useState('none');
 const [powerReason,setPowerReason]=useState('none');
 const [videoReason,setVideoReason]=useState('none');
 const [reviewSaved,setReviewSaved]=useState(false);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [loaded,setLoaded]=useState(false);
 const [lots,setLots]=useState<Lot[]>([]);
 const [allocations,setAllocations]=useState<Allocation[]>([]);
 const [stockError,setStockError]=useState("");
 const [returnFeedback,setReturnFeedback]=useState("");
 const [expanded,setExpanded]=useState<string|null>(null);
 const [picked,setPicked]=useState("");
 const [moving,setMoving]=useState(false);
 const [orderQty,setOrderQty]=useState(1);
 const [showReturns,setShowReturns]=useState<Record<string,boolean>>({});
 const [stockLoaded,setStockLoaded]=useState(false);
 const api=process.env.NEXT_PUBLIC_API_URL||"http://localhost:3001";

 useEffect(()=>{
   let alive=true;
   setLoaded(false);setError("");setReviewSaved(false);
   fetch(`${api}/positions/${encodeURIComponent(positionId)}/checklist-review`,{credentials:"include",cache:"no-store"})
    .then(async r=>{if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json()})
    .then(data=>{if(!alive)return;
      if(data.exists){
        setDraft(data.counts||{});
        setReason(data.reasons?.monitor||'none');
        setPowerReason(data.reasons?.power||'none');
        setVideoReason(data.reasons?.video||'none');
        setReviewSaved(true);
      }
    }).catch(e=>{if(alive)setError(`No se pudo consultar la revisión guardada (${String(e.message||e)}).`)})
    .finally(()=>{if(alive)setLoaded(true)});
   return()=>{alive=false};
 },[positionId,api]);

 const stockRole:Record<string,string>={monitor:'MONITOR',mouse:'MOUSE',keyboard:'KEYBOARD',power:'POWER',video:'VIDEO',network:'NETWORK',strip:'STRIP',charger:'CHARGER'};
 const compatible=(key:string,l:Lot)=>l.role===stockRole[key];
 const rowsFor=(key:string)=>lots.filter(l=>compatible(key,l));
 const refreshStock=async()=>{
  setStockLoaded(false);
  try{
   const [a,b]=await Promise.all([
     fetch(`${api}/position-lots/catalog`,{credentials:'include',cache:'no-store'}),
     fetch(`${api}/position-lots/assigned`,{credentials:'include',cache:'no-store'})
   ]);
   if(!a.ok||!b.ok)throw Error(`Catalogo HTTP ${a.status}, asignaciones HTTP ${b.status}`);
   setLots(await a.json());
   setAllocations((await b.json()).filter((x:Allocation)=>x.positionId===positionId));
   setStockError("");
  }catch(e){
   setStockError(`No se pudo consultar Almacén: ${e instanceof Error?e.message:String(e)}`);
  }finally{setStockLoaded(true)}
 };
 useEffect(()=>{setExpanded(null);setPicked("");void refreshStock()},[api,positionId]);

 const assignedCount=(key:string)=>allocations.filter(a=>a.role===stockRole[key]).reduce((n,a)=>n+a.quantity,0);
 const verified=(key:string)=>key==='computer'?(main?1:0):(registered[key]||0)+assignedCount(key);

 const required=(r:Rule)=>profile==='laptop'?r.laptop:profile==='allinone'?r.allinone:r.desktop;
 const current=(key:string)=>draft[key]??registered[key]??0;
 const monitorCount=current('monitor');
 const maxFor=(key:string)=>{
   if(['computer','mouse','keyboard','network','strip','charger'].includes(key))return 1;
   if(key==='monitor')return reason==='none'?(laptop?1:allinone?0:2):3;
   if(key==='power')return powerReason==='none'?(laptop?monitorCount:allinone?Math.min(4,1+monitorCount):3):4;
   if(key==='video')return videoReason==='none'?(laptop||allinone?monitorCount:3):4;
   return 1;
 };
 const dynamicRequired=(key:string)=>{
   if(key==='power' && laptop)return monitorCount;
   if(key==='video' && (laptop||allinone))return monitorCount;
   if(key==='power' && allinone)return 1+monitorCount;
   return required(rules.find(r=>r.key===key)!);
 };
 const setCount=(key:string,value:number)=>{setReviewSaved(false);setDraft(old=>({...old,[key]:Math.max(0,Math.min(maxFor(key),value))}))};

 const assign=async(key:string,lotId?:string)=>{
  const selectedId=lotId||picked;
  if(!selectedId||moving)return;
  if(verified(key)+orderQty>maxFor(key)){setStockError('La cantidad supera el máximo autorizado.');return}
  setMoving(true);setStockError("");
  try{
   const resp=await fetch(`${api}/position-lots/assign`,{
     method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({equipmentId:selectedId,positionId,expectedRole:stockRole[key],quantity:orderQty,requestKey:crypto.randomUUID()})
   });
   const data=await resp.json().catch(()=>({}));
   if(!resp.ok)throw Error(data.message||`HTTP ${resp.status}`);
   setReviewSaved(false);setPicked("");setOrderQty(1);setExpanded(null);
   await refreshStock();
   onReviewSaved?.();
  }catch(e){setStockError(e instanceof Error?e.message:String(e))}
  finally{setMoving(false)}
 };
 const returnOne=async(a:Allocation)=>{
  if(moving||!window.confirm('¿Remover ESTA unidad de la posición y devolverla a Almacén? Confirma que regresó físicamente en buen estado.'))return;
  setMoving(true);setStockError("");setReturnFeedback("");
  try{
   const resp=await fetch(`${api}/position-lots/return`,{
     method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({allocationId:a.id,requestKey:crypto.randomUUID()})
   });
   const data=await resp.json().catch(()=>({}));
   if(!resp.ok)throw Error(`No se pudo remover (HTTP ${resp.status}): ${data.message||data.error||"El servidor rechazó la devolución"}`);
   await refreshStock();
   setReturnFeedback("Unidad removida de la posición y devuelta a Almacén. Verifica el saldo actualizado.");
   setReviewSaved(false);
   onReviewSaved?.();
  }catch(e){const msg=e instanceof Error?e.message:String(e);setStockError(msg);setReturnFeedback("");}
  finally{setMoving(false)}
 };
 const saveReview=async()=>{
   if(!loaded||saving)return;
   setSaving(true);setError("");
   try{
     const counts=Object.fromEntries(rules.map(r=>[r.key,current(r.key)]));
     const resp=await fetch(`${api}/positions/${encodeURIComponent(positionId)}/checklist-review`,{
       method:'PUT',credentials:'include',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({counts,reasons:{monitor:reason,power:powerReason,video:videoReason},profile})
     });
     const data=await resp.json().catch(()=>({}));
     if(!resp.ok)throw Error(data.message||`HTTP ${resp.status}`);
     setReviewSaved(true);onReviewSaved?.();
   }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar')}
   finally{setSaving(false)}
 };

 useEffect(()=>{setDraft({});setReason('none');setPowerReason('none');setVideoReason('none');setReviewSaved(false)},[positionCode]);

 const completed=rules.filter(r=>verified(r.key)>=dynamicRequired(r.key)).length;
 const missing=rules.filter(r=>verified(r.key)<dynamicRequired(r.key));
 const modified=rules.some(r=>current(r.key)!==(registered[r.key]||0));
 useEffect(()=>{onComputedChange?.({completed,total:rules.length,isComplete:completed===rules.length,isEmpty:rules.every(r=>verified(r.key)===0),saved:reviewSaved})},[completed,onComputedChange,positionCode,reviewSaved,draft]);

 return <section className="min-w-0 rounded-xl border border-cyan-500/30 bg-[#0f1d34] p-4 text-slate-100">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h3 className="font-bold">Checklist de equipamiento · {positionCode}</h3>
      <p className="mt-1 text-xs text-slate-400">Perfil: {laptop?'Laptop':allinone?'All in One':'Desktop'} · La cantidad del checklist es una revisión; solo <span className="font-semibold text-cyan-200">Confirmar asignación</span> mueve inventario.</p>
    </div>
    <span className={'rounded-full border px-3 py-1 text-xs font-bold '+(completed===rules.length?'border-emerald-500/40 bg-emerald-500/10 text-emerald-300':'border-amber-500/40 bg-amber-500/10 text-amber-300')}>
      {rules.every(r=>current(r.key)===0)?'Vacía':completed===rules.length?'Completa':'Incompleta'} · {completed}/{rules.length}
    </span>
  </div>

  <div className="mt-4 overflow-x-auto">
    <table className="w-full min-w-[780px] text-left text-xs">
      <thead className="bg-[#223653] text-slate-300">
        <tr>{['Elemento','Regla','Máximo autorizado','Cantidad','Verificación','Stock en almacén'].map(x=><th key={x} className="p-3">{x}</th>)}</tr>
      </thead>
      <tbody>
      {rules.map(r=>{
        const n=verified(r.key);
        const goal=dynamicRequired(r.key);
        const ok=n>=goal;
        const available=rowsFor(r.key).reduce((v,l)=>v+(l.reconciled?Math.max(0,l.available):0),0);
        const assigned=allocations.filter(a=>a.role===stockRole[r.key]);
        const lotRows=rowsFor(r.key).filter(l=>l.available>0&&l.reconciled);
        const selectedLot=lotRows.find(l=>l.id===picked) || lotRows[0] || null;
        const maxDeliverable=Math.max(0,Math.min(maxFor(r.key)-n, selectedLot?.available||0));
        return <React.Fragment key={r.key}>
          <tr className="border-t border-white/10">
            <td className="p-3 font-semibold"><div className="flex items-center gap-2">{(() => { const Icon = ruleIcons[r.key]; return <Icon size={16} className="shrink-0 text-cyan-400" aria-hidden="true" />; })()}<span>{r.name}</span></div></td>
            <td className="p-3">{goal}</td>
            <td className="p-3 text-slate-400">{maxFor(r.key)}</td>
            <td className="p-3">
              <div className="inline-flex items-center gap-2">
                <button aria-label={'Retirar '+r.name} className="rounded border border-slate-600 p-1.5 disabled:opacity-25" disabled={moving||r.key==='computer'||assigned.length===0} title={assigned.length===0?'Sin unidades asignadas mediante Almacén; los vínculos históricos se gestionan por separado':'Ver unidades asignadas y devolver una'} onClick={()=>{setExpanded(r.key);setPicked(selectedLot?.id||'');setShowReturns(old=>({...old,[r.key]:true}));}}><Minus size={14}/></button>
                <span className="min-w-5 text-center font-bold">{n}</span>
                <button aria-label={'Asignar '+r.name} className="rounded border border-slate-600 p-1.5 disabled:opacity-25" disabled={moving||r.key==='computer'||n>=maxFor(r.key)} onClick={()=>{setExpanded(r.key);setPicked(selectedLot?.id||'');setOrderQty(1);setShowReturns(old=>({...old,[r.key]:false}));}}><Plus size={14}/></button>
              </div>
            </td>
            <td className="p-3"><span className={'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-semibold '+(ok?'border-emerald-500/40 bg-emerald-500/10 text-emerald-300':'border-amber-500/40 bg-amber-500/10 text-amber-300')}>{ok?<Check size={14}/>:<AlertTriangle size={14}/>} {ok?'Completo':`Faltan ${Math.max(0,goal-n)}`}</span></td>
            <td className="p-2 min-w-[210px]">
              {r.key==='computer'
                ? <div className="space-y-2"><button type="button" disabled className={'w-full rounded-lg border px-3 py-2 text-[11px] font-semibold '+(main?'border-emerald-500/40 bg-emerald-500/10 text-emerald-300':'border-amber-500/40 bg-amber-500/10 text-amber-300')}><Package2 className="mr-1 inline" size={13}/> {main?'En uso · vinculado a posición':'Sin equipo vinculado'}</button><button type="button" disabled={!onManageMain} onClick={()=>onManageMain?.()} className="w-full rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] font-bold text-rose-200 disabled:opacity-50">{main?'Remover / Reemplazar':'Asignar equipo principal'}</button></div>
                : !stockLoaded
                  ? <span className="text-slate-400">Consultando...</span>
                  : stockError&&!lots.length
                    ? <span className="text-rose-300">Sin conexión</span>
                    : <button type="button" disabled={moving} onClick={()=>{const next=expanded===r.key?null:r.key;setExpanded(next);setPicked(selectedLot?.id||'');setOrderQty(1);if(next===r.key){setShowReturns(old=>({...old,[r.key]:false}));}}} className={'w-full rounded-lg border px-2 py-1.5 text-[11px] font-semibold '+stockButtonClass(available)}>{stockLabel(available)} ▾</button>}
            </td>
          </tr>
          {expanded===r.key&&r.key!=='computer'&&<tr className="bg-[#0b1930]">
            <td colSpan={6} className="p-3">
              <div className="rounded-xl border border-blue-500/40 bg-[#0c1730] p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-100">Opciones de Almacén — {r.name}</div>
                    <p className="text-xs text-slate-400">Selecciona el modelo correcto y confirma la cantidad a entregar para esta posición.</p>
                  </div>
                  <button type="button" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white" aria-label="Cerrar opciones de almacén" onClick={()=>setExpanded(null)}>Cerrar <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-600 text-white shadow hover:bg-rose-500"><X size={16}/></span></button>
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,1fr)]">
                  <div className="space-y-2">
                    {available===0 ? (
                      <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-blue-500/35 bg-[#0b1931] px-5 py-8 text-center">
                        {(() => {const Icon=ruleIcons[r.key];return <Icon size={40} className="text-cyan-400/80" aria-hidden="true"/>})()}
                        <p className="text-base font-semibold text-rose-300">Opción en almacén no disponible</p>
                        <p className="text-sm text-slate-400">No hay unidades disponibles de {r.name} para esta posición.</p>
                        <div className="mt-1 inline-flex items-center gap-2 rounded-lg border border-blue-500/25 bg-blue-500/10 px-3 py-2 text-xs text-blue-200"><ShoppingCart size={15}/> Favor solicitar compra o conciliar existencias con Almacén.</div>
                      </div>
                    ) : lotRows.map(l=>{
                      const active=(picked||selectedLot?.id)===l.id;
                      return <label key={l.id} className={'block cursor-pointer rounded-lg border p-3 transition '+(active?'border-blue-500/60 bg-blue-500/10':'border-slate-700 hover:bg-blue-500/10')}>
                        <div className="flex items-start justify-between gap-3">
                          <span className="flex items-start gap-3">
                            <input type="radio" name={'stock-'+r.key} checked={active} onChange={()=>{setPicked(l.id);setOrderQty(1)}} className="mt-3" />
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-cyan-500/25 bg-[#112742] text-cyan-300">{(() => {const Icon=ruleIcons[r.key];return <Icon size={22} aria-hidden="true"/>})()}</span>
                            <span>
                              <span className="block font-semibold text-slate-100">{l.brand} {l.model||l.category}</span>
                              <span className="block text-xs text-slate-400">Identificador: {l.id.slice(0,12)} · Total: {l.quantity}</span>
                            </span>
                          </span>
                          <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300">Disponible: {l.available}</span>
                        </div>
                      </label>;
                    })}
                  </div>
                  <div className="rounded-xl border border-blue-500/30 bg-[#101b34] p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-cyan-500/25 bg-[#0c1527] text-cyan-300">{(() => {const Icon=ruleIcons[r.key];return <Icon size={30} aria-hidden="true"/>})()}</div>
                      <div>
                        <div className="font-bold text-slate-100">{selectedLot?`${selectedLot.brand} ${selectedLot.model||selectedLot.category}`:r.name}</div>
                        <div className="text-xs text-slate-400">Categoría: {r.name}</div>
                      </div>
                    </div>
                    {available===0&&<div className="mb-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm font-semibold text-rose-300">No disponible · Favor solicitar compra</div>}
                    <div className="space-y-1.5 text-sm text-slate-300">
                      <div><span className="text-slate-400">Disponible en almacén:</span> <span className={'font-semibold '+(available===0?'text-rose-300':'text-emerald-300')}>{selectedLot?.available||0}</span></div>
                      <div><span className="text-slate-400">Total registrado:</span> <span className="font-semibold">{selectedLot?.quantity??rowsFor(r.key).reduce((v,l)=>v+l.quantity,0)}</span></div>
                      <div><span className="text-slate-400">Máximo restante en esta posición:</span> <span className="font-semibold">{Math.max(0,maxFor(r.key)-n)}</span></div>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <label className="text-sm text-slate-300">Cantidad a entregar
                        <input type="number" min={1} max={Math.max(1,maxDeliverable)} disabled={!selectedLot||maxDeliverable===0} className="ml-2 w-16 rounded border border-slate-500 bg-[#0f1930] p-1.5 disabled:opacity-40" value={orderQty} onChange={e=>setOrderQty(Math.max(1,Number(e.target.value)||1))}/>
                      </label>
                      <button type="button" disabled={!selectedLot||moving||n>=maxFor(r.key)||orderQty>maxDeliverable||maxDeliverable===0} onClick={()=>selectedLot&&void assign(r.key,selectedLot.id)} className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white shadow disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">{moving?'Procesando...':`Confirmar asignación de ${orderQty} unidad(es)`}</button>
                      {assigned.length>0&&<button type="button" disabled={moving} onClick={()=>setShowReturns(old=>({...old,[r.key]:!old[r.key]}))} className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 font-bold text-rose-200 shadow disabled:cursor-not-allowed disabled:opacity-40">{showReturns[r.key]?`Ocultar unidades para remover (${assigned.length})`:`Remover (${assigned.length})`}</button>}
                    </div>
                    {available>0&&maxDeliverable===0&&<p className="mt-3 text-xs text-amber-200">Esta posición alcanzó el máximo permitido o el lote no tiene suficientes unidades.</p>}
                    {assigned.length>0&&!showReturns[r.key]&&<p className="mt-3 text-xs text-slate-400">Si necesitas retirar una unidad ya entregada, usa el botón <span className="font-semibold text-rose-200">Desasignar ({assigned.length})</span>.</p>}
                  </div>
                </div>

                {stockError&&<div role="alert" className="mt-3 rounded-lg border border-rose-500/60 bg-rose-950/50 p-3 text-sm font-semibold text-rose-100">Error al procesar Almacén: {stockError}</div>}
                {returnFeedback&&<div role="status" className="mt-3 rounded-lg border border-emerald-500/50 bg-emerald-950/30 p-3 text-sm text-emerald-200">{returnFeedback}</div>}
                {assigned.length>0&&showReturns[r.key]&&<div className="mt-4 border-t border-slate-700 pt-3">
                  <p className="mb-2 text-sm font-semibold text-slate-200">Unidades asignadas a esta posición · selecciona cuál remover:</p><p className="mb-2 text-xs text-slate-400">La devolución solo se aplica después de confirmar que la unidad regresó físicamente en buen estado. Se descontará 1 de Producción y se sumará 1 a Almacén.</p>
                  <div className="space-y-2">
                    {assigned.map(a=><div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 bg-[#0f1930] px-3 py-2"><span className="text-sm text-slate-200">{a.brand} {a.model||''} · {a.quantity} unidad</span><button disabled={moving} className="rounded border border-rose-500/50 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 disabled:opacity-30" onClick={()=>void returnOne(a)}>Remover 1 y devolver a Almacén</button></div>)}
                  </div>
                </div>}
              </div>
            </td>
          </tr>}
        </React.Fragment>;
      })}
      </tbody>
    </table>
  </div>

  <div className="mt-4 grid gap-3 md:grid-cols-3">
    <label className="text-xs text-slate-300">Excepción para monitores
      <select className="mt-1 w-full rounded-lg border border-slate-600 bg-[#101c30] p-2" value={reason} onChange={e=>{setReviewSaved(false);setReason(e.target.value);if(e.target.value==='none'&&current('monitor')>(laptop?1:allinone?0:2))setDraft(old=>({...old,monitor:laptop?1:allinone?0:2}))}}>
        <option value="none">Sin excepción: máximo {laptop?1:allinone?0:2}</option>
        <option value="admin">Autorización administrativa</option>
        <option value="workflow">Necesidad de workflow</option>
        <option value="qa">QA / Calidad</option>
        <option value="supervisor">Supervisor con múltiples plataformas</option>
      </select>
    </label>
    <label className="text-xs text-slate-300">Excepción: cables de poder
      <select className="mt-1 w-full rounded-lg border border-slate-600 bg-[#101c30] p-2" value={powerReason} onChange={e=>{setReviewSaved(false);setPowerReason(e.target.value);if(e.target.value==='none'&&current('power')>3)setDraft(old=>({...old,power:3}))}}>
        <option value="none">Sin excepción: {laptop?"1 por monitor; cargador separado":allinone?"1 cable de fuente":"máximo 3"}</option>
        <option value="admin">Autorización administrativa</option>
        <option value="workflow">Necesidad de workflow</option>
        <option value="supervisor">Supervisor / plataformas adicionales</option>
      </select>
    </label>
    <label className="text-xs text-slate-300">Excepción: cables de video
      <select className="mt-1 w-full rounded-lg border border-slate-600 bg-[#101c30] p-2" value={videoReason} onChange={e=>{setReviewSaved(false);setVideoReason(e.target.value);if(e.target.value==='none'&&current('video')>3)setDraft(old=>({...old,video:3}))}}>
        <option value="none">Sin excepción: {laptop?"1 por monitor":allinone?"sin cable externo":"máximo 3"}</option>
        <option value="admin">Autorización administrativa</option>
        <option value="workflow">Necesidad de workflow</option>
        <option value="qa">QA / Calidad</option>
      </select>
    </label>
    <div className="flex items-end justify-between gap-2 text-xs md:col-span-3">
      <span className="text-slate-300">Revisión: {completed}/{rules.length} reglas {modified?'· Pendiente de guardar':''}</span>
      <button className="inline-flex items-center gap-2 rounded-lg border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-emerald-200" disabled={!loaded||saving} onClick={()=>void saveReview()}><Save size={13}/>{saving?"Guardando...":"Guardar revisión en BD"}</button>
    </div>
  </div>

  {reviewSaved&&<p className="mt-3 text-xs text-emerald-300"><CheckCircle2 size={14} className="mr-1 inline"/>Revisión guardada en PostgreSQL. No se movió inventario ni se certificaron entregas.</p>}
  {stockError&&<p className="mt-3 rounded-lg border border-rose-500/30 p-3 text-xs text-rose-200">{stockError}</p>}
  {error&&<p className="mt-3 rounded-lg border border-rose-500/30 p-3 text-xs text-rose-200">{error}</p>}
  {!!missing.length&&<p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">Faltantes confirmados: {missing.map(r=>`${r.name} (${dynamicRequired(r.key)-verified(r.key)})`).join(' · ')}</p>}
  <p className="mt-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-cyan-200">La cantidad verificada corresponde a equipos vinculados más entregas registradas. El botón <span className="font-semibold">+</span> abre Almacén para asignar; el botón <span className="font-semibold">−</span> muestra las entregas registradas para gestionar devolución. Las revisiones manuales se conservan separadas.</p>
 </section>;
}