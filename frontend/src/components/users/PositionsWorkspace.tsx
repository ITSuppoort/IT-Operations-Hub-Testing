"use client";

import { useCallback, useEffect, useMemo, useState , Fragment} from "react";
import PositionChecklist from "./PositionChecklist";
import { AlertTriangle, ArrowUpRight, Boxes, ChevronDown, ClipboardList, Eye, MapPinned, Monitor, MoreHorizontal, RefreshCw, Search, UserMinus, Users, X, Link2, Unlink, Building2, MapPin, UserRound, Laptop, MonitorSmartphone, Hash, Barcode, Layers3, Pencil, BriefcaseBusiness, ChartNoAxesColumnIncreasing, UserRoundCheck, MonitorCheck, CircleAlert, PackageOpen, Trash2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Person = { id:string; firstName:string; lastName:string; employeeId?:string; status?:string };
type Device = { id:string; category:string; type?:string|null; brand:string; model?:string|null; pcName?:string|null; serial?:string|null; condition?:string; quantity?:number };
type Accessory = {id:string; equipmentId:string; role:string; category:string; brand:string; model?:string|null; serial?:string|null; pcName?:string|null; quantity:number};
type Position = {
  id:string; code:string; name?:string|null; status?:string; wing?:string|null;
  inventoryPersonId?:string|null; assignedUserId?:string|null; userCell?:string|null; equipmentCell?:string|null;
  location?:{name?:string; floorNumber?:number|null; wing?:string|null}|null;
  area?:{name?:string}|null;
  inventoryPerson?:Person|null; equipment?:Device|null;
};
// Prefer a specific category; use the registered Equipment.type for generic categories.
// Never infer hardware class from the brand alone.
const classifyAccessoryText = (category:string):string => {
  const c = (category || "").trim().toUpperCase().replace(/[ÁÀÄ]/g,"A").replace(/[ÉÈË]/g,"E").replace(/[ÍÌÏ]/g,"I").replace(/[ÓÒÖ]/g,"O").replace(/[ÚÙÜ]/g,"U");
  if (/MONITOR|DISPLAY|PANTALLA/.test(c)) return "MONITOR";
  if (/KEYBOARD|TECLADO/.test(c)) return "KEYBOARD";
  if (/MOUSE|RATON|RATÓN/.test(c)) return "MOUSE";
  if (/HEADSET|HEADPHONE|AURICULAR|DIADEMA|AUDIFONO/.test(c)) return "HEADSET";
  if (/WEBCAM|WEB.?CAM|CAMARA/.test(c)) return "WEBCAM";
  if (/\bUPS\b|NO.?BREAK/.test(c)) return "UPS";
  if (/DESKTOP|LAPTOP|NOTEBOOK|ALL.?IN.?ONE|COMPUTER|COMPUTADORA|PC\b/.test(c)) return "MAIN";
  return "OTHER";
};
const accessoryCategory = (category:string, type?:string|null):string => {
  const explicitCategory = classifyAccessoryText(category);
  return explicitCategory !== "OTHER" ? explicitCategory : classifyAccessoryText(type || "");
};
const card = "rounded-xl border border-[#30445f] bg-[#172239]";
const box = "rounded-lg border border-[#2b3b56] bg-[#101c30]";
function statusOf(p:Position){
  const status=(p.status||"").toUpperCase();
  if(status.includes("DAMAGE")||status.includes("ISSUE")||status.includes("FAULT"))return {label:"Con incidencia",color:"rose"};
  if(!(p.equipment||p.inventoryPersonId||p.assignedUserId||p.inventoryPerson))return {label:"Vacía",color:"rose"};
  if(status.includes("INCOMPLETE")||status.includes("PENDING"))return {label:"Incompleta",color:"amber"};
  if(p.inventoryPersonId||p.assignedUserId||p.inventoryPerson)return {label:"Ocupada",color:"emerald"};
  if(p.equipment)return {label:"Disponible equipada",color:"sky"};
  if(status==="EMPTY"||status==="VACANT")return {label:"Sin usuario ni equipo",color:"slate"};
  return {label:"Por verificar",color:"slate"};
}
const tones:Record<string,string>={emerald:"text-emerald-300 bg-emerald-500/10 border-emerald-500/30",sky:"text-sky-300 bg-sky-500/10 border-sky-500/30",rose:"text-rose-300 bg-rose-500/10 border-rose-500/30",amber:"text-amber-300 bg-amber-500/10 border-amber-500/30",slate:"text-slate-300 bg-slate-500/10 border-slate-500/30"};
const deviceIcon=(p:Position)=>{const t=[p.equipment?.category,p.equipment?.type].filter(Boolean).join(" ").toUpperCase();return /LAPTOP|NOTEBOOK/.test(t)?<Laptop size={14} className="shrink-0 text-cyan-300"/>:/ALL.?IN.?ONE|AIO/.test(t)?<MonitorSmartphone size={14} className="shrink-0 text-cyan-300"/>:<Monitor size={14} className="shrink-0 text-cyan-300"/>};
const shortName=(p:Position)=>p.inventoryPerson?`${p.inventoryPerson.firstName} ${p.inventoryPerson.lastName}`:p.userCell?.trim()||"Sin usuario";
function deviceName(p:Position){const e=p.equipment;return e?[e.category,e.brand,e.model].filter(Boolean).join(" · "):p.equipmentCell?.trim()||"Sin equipo vinculado";}
function Badge({p}:{p:Position}){const s=statusOf(p);return <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${tones[s.color]}`}>{s.label}</span>}
export default function PositionsWorkspace(){
  const [positions,setPositions]=useState<Position[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [query,setQuery]=useState("");
  const [floor,setFloor]=useState("ALL");
  const [wing,setWing]=useState("ALL");
  const [filter,setFilter]=useState("ALL");
  const [selected,setSelected]=useState<string|null>(null);
  const [detailOpen,setDetailOpen]=useState(false);
  const [quickView,setQuickView]=useState<Position|null>(null);
  const [checklistState,setChecklistState]=useState<{completed:number;total:number;isComplete:boolean;isEmpty:boolean;saved:boolean}|null>(null);
  const [reviewSummary,setReviewSummary]=useState<Record<string,{completed:number;total:number;isEmpty:boolean;count:number}>>({});
  const [liveStatus,setLiveStatus]=useState<Record<string,{label:string;color:string}>>({});
  const [statusLoaded,setStatusLoaded]=useState(false);
  const refreshLiveStatus=useCallback(async(list:Position[])=>{
    setStatusLoaded(false);
    try {
      const response=await fetch(`${API}/position-lots/assigned`,{credentials:"include",cache:"no-store"});
      if(!response.ok)throw Error(`HTTP ${response.status}`);
      const allAllocations:Array<{positionId:string;role:string;quantity:number}>=await response.json();
      const rows=await Promise.all(list.map(async p=>{
        const [accessoryResponse,reviewResponse]=await Promise.all([
          fetch(`${API}/positions/${encodeURIComponent(p.id)}/accessories`,{credentials:"include",cache:"no-store"}),
          fetch(`${API}/positions/${encodeURIComponent(p.id)}/checklist-review`,{credentials:"include",cache:"no-store"})
        ]);
        if(!accessoryResponse.ok||!reviewResponse.ok)throw Error(`Posicion ${p.code}: error al cargar checklist`);
        const accessories:Accessory[]=await accessoryResponse.json();
        const review=await reviewResponse.json();
        const counts:Record<string,number>={computer:p.equipment?1:0,monitor:0,mouse:0,keyboard:0,power:0,video:0,network:0,strip:0,charger:0};
        const classify=(raw:string)=>{
          const v=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
          if(/MONITOR|PANTALLA|DISPLAY/.test(v))return 'monitor';
          if(/MOUSE|RATON/.test(v))return 'mouse';
          if(/TECLADO|KEYBOARD/.test(v))return 'keyboard';
          if(/CARGADOR|CHARGER|ADAPTADOR.*(CORRIENTE|LAPTOP)/.test(v))return 'charger';
          if(/REGLETA|POWER STRIP|MULTITOMA/.test(v))return 'strip';
          if(/CABLE/.test(v)&&/PODER|POWER|CORRIENTE/.test(v))return 'power';
          if(/CABLE/.test(v)&&/RED|ETHERNET|LAN|RJ45/.test(v))return 'network';
          if(/HDMI|DISPLAYPORT|\bDP\b|VGA|CABLE DE VIDEO/.test(v))return 'video';
          return 'other';
        };
        for(const a of accessories){const key=classify([a.role,a.category].join(' '));if(key in counts)counts[key]+=Math.max(0,Number(a.quantity)||0);}
        const names:Record<string,string>={MONITOR:'monitor',MOUSE:'mouse',KEYBOARD:'keyboard',POWER:'power',VIDEO:'video',NETWORK:'network',STRIP:'strip',CHARGER:'charger'};
        for(const a of allAllocations){if(a.positionId!==p.id)continue;const key=names[a.role];if(key)counts[key]+=Math.max(0,Number(a.quantity)||0);}
        const equipmentType=[p.equipment?.category||'',p.equipment?.type||''].join(' ').toUpperCase();
        const profile=/ALL.?IN.?ONE|AIO/.test(equipmentType)?'allinone':/LAPTOP|NOTEBOOK|PORTATIL/.test(equipmentType)?'laptop':'desktop';
        const monitor=counts.monitor;
        const expected:Record<string,number>={
          computer:1,monitor:profile==='desktop'?2:profile==='laptop'?1:0,
          mouse:1,keyboard:1,
          power:profile==='desktop'?3:profile==='laptop'?monitor:1+monitor,
          video:profile==='desktop'?2:monitor,
          network:1,strip:profile==='desktop'?1:0,charger:profile==='laptop'?1:0
        };
        // La regla de monitor del checklist permite 1 en desktop; 2 es el valor normal.
        // Los motivos de excepción solo aumentan límites, no convierten faltantes en equipos.
        const hasAnything=Object.values(counts).some(n=>n>0);
        const complete=Object.entries(expected).every(([key,min])=>counts[key]>=min);
        const label=!hasAnything?'Vacía':complete?'Completa':'Incompleta';
        return [p.id,{label,color:label==='Vacía'?'rose':label==='Completa'?'emerald':'amber'}] as const;
      }));
      setLiveStatus(Object.fromEntries(rows));setStatusLoaded(true);
    }catch(err){console.error('No fue posible calcular estados reales',err);setLiveStatus({});setStatusLoaded(false);}
  },[]);

  const loadReviews=useCallback(async()=>{
    try {const response=await fetch(`${API}/positions/checklist-review-summary`,{credentials:"include",cache:"no-store"});
      if(!response.ok)throw Error(`HTTP ${response.status}`);
      const rows: Array<{positionId:string;completed:number;total:number;counts:Record<string,number>}> = await response.json();
      setReviewSummary(Object.fromEntries(rows.map(r=>[r.positionId,{completed:r.completed,total:r.total,isEmpty:Object.values(r.counts||{}).every(n=>n===0),count:Object.values(r.counts||{}).reduce((a,n)=>a+(Number.isFinite(Number(n))?Math.max(0,Number(n)):0),0)}])));
    }catch(e){console.error('No se pudo cargar resumen de revisiones',e)}
  },[]);
  const [menu,setMenu]=useState<string|null>(null);
  const [deleteTarget,setDeleteTarget]=useState<Position|null>(null);
  const [deleteBusy,setDeleteBusy]=useState(false);
  const [deleteError,setDeleteError]=useState("");
  const [people,setPeople]=useState<Person[]>([]);
  const [devices,setDevices]=useState<Device[]>([]);
  const [deviceError,setDeviceError]=useState("");
  const [accessories,setAccessories]=useState<Accessory[]>([]);
  const [accessoryError,setAccessoryError]=useState("");
  const [accessoryDeviceId,setAccessoryDeviceId]=useState("");
  const [accessoryRole,setAccessoryRole]=useState("MONITOR");
  const [accessoryBusy,setAccessoryBusy]=useState(false);

  const [equipmentEditing,setEquipmentEditing]=useState<Position|null>(null);
  const [deviceId,setDeviceId]=useState("");
  const [deviceSaving,setDeviceSaving]=useState(false);
  const [metadataEditing,setMetadataEditing]=useState<Position|null>(null);
  const [metaDraft,setMetaDraft]=useState({code:"",name:"",floor:"2",wing:"WEST",areaName:""});
  const [metaError,setMetaError]=useState("");
  const [metaBusy,setMetaBusy]=useState(false);
  const [editing,setEditing]=useState<Position|null>(null);
  const [personId,setPersonId]=useState("");
  const [saving,setSaving]=useState(false);
  const [notice,setNotice]=useState("");
  const [mapExpanded,setMapExpanded]=useState(false);
  const [adding,setAdding]=useState(false);
  const [newFloor,setNewFloor]=useState("2");
  const [newWing,setNewWing]=useState("WEST");
  const [newArea,setNewArea]=useState("OPERACIONES");
  const [newCode,setNewCode]=useState("");
  const [newName,setNewName]=useState("");
  const [creating,setCreating]=useState(false);
  const [createError,setCreateError]=useState("");
  const createPosition=async()=>{
    if(creating)return;
    setCreateError("");
    const raw=newCode.trim().toUpperCase();
    if(!raw||raw.length>70||!/^[A-Z0-9 -]+$/.test(raw)){setCreateError("Código requerido: letras, números, espacios o guiones; máximo 70 caracteres.");return;}
    if(!window.confirm(`¿Crear posición ${raw} en piso ${newFloor} / ${newWing}? No se asignará usuario ni equipo.`))return;
    setCreating(true);
    try{
      const resp=await fetch(`${API}/positions/manual`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:raw,name:newName.trim(),floorNumber:Number(newFloor),wing:newWing,areaName:newArea.trim()})});
      const data=await resp.json().catch(()=>({}));
      if(!resp.ok)throw new Error(typeof data.message==="string"?data.message:`HTTP ${resp.status}`);
      setAdding(false);setNewCode("");setNewName("");await load();
      if(data.id)setSelected(data.id);
    }catch(e){setCreateError(e instanceof Error?e.message:"No se pudo crear la posición.");}
    finally{setCreating(false)}
  };
  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try{const r=await fetch(`${API}/positions`,{credentials:"include",cache:"no-store"});if(!r.ok)throw new Error(`No fue posible consultar posiciones (HTTP ${r.status})`);
      const data:unknown=await r.json();if(!Array.isArray(data))throw new Error("El servidor no devolvió una lista de posiciones");
      setPositions(data as Position[]);void loadReviews();void refreshLiveStatus(data as Position[]);
    }catch(e){setError(e instanceof Error?e.message:"Error cargando posiciones");}finally{setLoading(false)}
  },[loadReviews,refreshLiveStatus]);
  useEffect(()=>{void load()},[load]);
  useEffect(()=>{fetch(`${API}/inventory-people`,{credentials:"include",cache:"no-store"}).then(async r=>{if(!r.ok)throw Error(String(r.status));return r.json()}).then(data=>{if(Array.isArray(data))setPeople(data as Person[])}).catch(()=>{});},[]);
  useEffect(()=>{fetch(`${API}/equipment`,{credentials:"include",cache:"no-store"}).then(async r=>{if(!r.ok)throw Error(String(r.status));return r.json()}).then(data=>{
    const list=Array.isArray(data)?data:Array.isArray(data?.equipment)?data.equipment:Array.isArray(data?.data)?data.data:[];
    setDevices(list as Device[]);
  }).catch(()=>setDeviceError("No se pudo consultar Inventario."));},[]);
  const manageEquipment=(p:Position)=>{setEquipmentEditing(p);setDeviceId(p.equipment?.id||"");setDeviceError("");setMenu(null)};
  const saveEquipment=async(unlink=false)=>{
    if(!equipmentEditing||deviceSaving)return;
    const target=unlink?null:(deviceId||null);
    if(target===null&&!unlink){setDeviceError("Selecciona primero un equipo.");return;}
    if((equipmentEditing.equipment?.id||null)===target){setDeviceError("La asignación no cambió.");return;}
    const message=unlink?`¿Desvincular el equipo de ${equipmentEditing.code}? El equipo seguirá existiendo en Inventario.`:`¿Vincular el equipo seleccionado a ${equipmentEditing.code}? No se modificarán cantidades, condición ni usuario.`;
    if(!window.confirm(message))return;
    setDeviceSaving(true);setDeviceError("");
    try{const resp=await fetch(`${API}/positions/${encodeURIComponent(equipmentEditing.id)}/equipment`,{method:"PATCH",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({equipmentId:target})});
      const data=await resp.json().catch(()=>({}));if(!resp.ok)throw Error(typeof data.message==="string"?data.message:`HTTP ${resp.status}`);
      setEquipmentEditing(null);await load();
    }catch(e){setDeviceError(e instanceof Error?e.message:"No se pudo actualizar el equipo.")}
    finally{setDeviceSaving(false)}
  };
  const manageMetadata=(p:Position)=>{setMetadataEditing(p);setMetaDraft({code:p.code.startsWith("P1-CENTRAL-")?p.code.replace(/^P1-CENTRAL-/,""):p.code.replace(/^P\d+-(WEST|EAST|CENTRAL|OTRA)-/,""),name:p.name||"",floor:String(p.location?.floorNumber??2),wing:p.wing||p.location?.wing||"WEST",areaName:p.area?.name||""});setMetaError("");setMenu(null)};
  const saveMetadata=async()=>{
    if(!metadataEditing||metaBusy)return;
    if(!window.confirm(`¿Guardar los cambios de ubicación e identificador de ${metadataEditing.code}? No mueve equipos ni inventario.`))return;
    setMetaBusy(true);setMetaError("");
    try {const r=await fetch(`${API}/positions/${encodeURIComponent(metadataEditing.id)}/metadata`,{method:"PATCH",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({...metaDraft,floorNumber:Number(metaDraft.floor)})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||`HTTP ${r.status}`);setMetadataEditing(null);await load();}
    catch(e){setMetaError(e instanceof Error?e.message:"No se pudo actualizar la posición.")}
    finally{setMetaBusy(false)}
  };
  const manage=(p:Position)=>{setEditing(p);setPersonId(p.inventoryPersonId||p.inventoryPerson?.id||"");setNotice("");setMenu(null)};
  const savePerson=async(remove=false)=>{
    if(!editing||saving)return;
    if(!remove&&!personId){setNotice("Selecciona una persona registrada.");return}
    const current=editing.inventoryPersonId||editing.inventoryPerson?.id||null;
    if((remove?null:personId)===current){setNotice("La asignación no cambió.");return}
    if(!window.confirm(remove?`¿Quitar usuario de ${editing.code}? La posición y sus equipos permanecerán.`:`¿Confirmar asignación de usuario a ${editing.code}?`))return;
    setSaving(true);setNotice("");
    try{const r=await fetch(`${API}/positions/${encodeURIComponent(editing.id)}/person`,{method:"PATCH",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({inventoryPersonId:remove?null:personId})});
      const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(typeof data.message==="string"?data.message:`HTTP ${r.status}`);
      setEditing(null);await load();
    }catch(e){setNotice(e instanceof Error?e.message:"No fue posible guardar la asignación")}
    finally{setSaving(false)}
  };
  const confirmDelete=async()=>{
    if(!deleteTarget||deleteBusy)return;
    const target=deleteTarget;
    if(target.code.toUpperCase().startsWith("P2O-")){setDeleteError("Las 170 posiciones oficiales P2O están protegidas.");return;}
    if(target.inventoryPersonId||target.assignedUserId||target.inventoryPerson||target.equipment||target.userCell?.trim()||target.equipmentCell?.trim()){
      setDeleteError("Hay usuarios, equipos o datos asociados. Desvincula primero desde las acciones correspondientes. Los registros de Inventario no se eliminarán.");return;
    }
    setDeleteBusy(true);setDeleteError("");
    try{
      const response=await fetch(`${API}/positions/${encodeURIComponent(target.id)}`,{method:"DELETE",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({confirmCode:target.code})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(typeof data.message==="string"?data.message:`HTTP ${response.status}`);
      setDeleteTarget(null);setMenu(null);setDetailOpen(false);setSelected(null);await load();
    }catch(err){setDeleteError(err instanceof Error?err.message:"No se pudo eliminar la posición.");}
    finally{setDeleteBusy(false);}
  };
  const floors=useMemo(()=>[...new Set(positions.map(p=>p.location?.floorNumber).filter((v):v is number=>typeof v==="number"))].sort((a,b)=>a-b),[positions]);
  const wings=useMemo(()=>[...new Set(positions.map(p=>p.wing||p.location?.wing).filter((v):v is string=>!!v))].sort(),[positions]);
  const derivedStatus=(p:Position)=>liveStatus[p.id]||(statusLoaded?{label:"Por verificar",color:"slate"}:{label:"Por verificar",color:"slate"});
  const shown=useMemo(()=>positions.filter(p=>{
    if(floor!=="ALL"&&String(p.location?.floorNumber)!==floor)return false;
    if(wing!=="ALL"&&(p.wing||p.location?.wing)!==wing)return false;
    if(filter!=="ALL"&&derivedStatus(p).label!==filter)return false;
    const hay=[p.code,p.name,p.area?.name,p.location?.name,shortName(p),deviceName(p),p.equipment?.pcName,p.equipment?.serial].join(" ").toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  }),[positions,floor,wing,filter,query,reviewSummary]);
  const chosen=positions.find(p=>p.id===selected)||null;
  const chosenId=chosen?.id||null;
  const detailStatus = chosen ? derivedStatus(chosen) : {label:"Por verificar",color:"slate"};
  const positionAccessories = useMemo(
    () => accessories.filter((a) => accessoryCategory(a.category, a.role) !== "HEADSET"),
    [accessories],
  );
  const personalAccessoryCount = useMemo(
    () => accessories.filter((a) => accessoryCategory(a.category, a.role) === "HEADSET").length,
    [accessories],
  );
  const fetchAccessories=useCallback(async(id:string)=>{
    setAccessoryError("");
    try{const r=await fetch(`${API}/positions/${encodeURIComponent(id)}/accessories`,{credentials:"include",cache:"no-store"});const d=await r.json().catch(()=>[]);
      if(!r.ok)throw new Error(typeof d?.message==="string"?d.message:`HTTP ${r.status}`);
      setAccessories(Array.isArray(d)?d:[]);
    }catch(e){setAccessories([]);setAccessoryError(e instanceof Error?e.message:"No se pudieron consultar accesorios.");}
  },[]);
  useEffect(()=>{if(chosenId){void fetchAccessories(chosenId)}else{setAccessories([])}},[chosenId,fetchAccessories]);
  const saveAccessory=async()=>{
    const candidate=devices.find(d=>d.id===accessoryDeviceId);
    if (!candidate || accessoryCategory(candidate.category,candidate.type)!==accessoryRole) {setAccessoryError("Selecciona un activo que corresponda a la categoria indicada.");return;}
    if(!chosenId||!accessoryDeviceId||accessoryBusy)return;
    if(!window.confirm("¿Vincular este activo individual a la posición? No cambia las cantidades del inventario."))return;
    setAccessoryBusy(true);setAccessoryError("");
    try{const r=await fetch(`${API}/positions/${encodeURIComponent(chosenId)}/accessories`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({equipmentId:accessoryDeviceId,role:accessoryRole})});
      const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||`HTTP ${r.status}`);
      setAccessoryDeviceId("");await fetchAccessories(chosenId);
    }catch(e){setAccessoryError(e instanceof Error?e.message:"No se pudo vincular.")}
    finally{setAccessoryBusy(false)}
  };
  const removeAccessory=async(link:Accessory)=>{
    if(!chosenId||accessoryBusy||!window.confirm(`¿Desvincular ${link.brand} (${link.role})? El activo seguirá en Inventario.`))return;
    setAccessoryBusy(true);setAccessoryError("");
    try{const r=await fetch(`${API}/positions/${encodeURIComponent(chosenId)}/accessories/${encodeURIComponent(link.id)}`,{method:"DELETE",credentials:"include"});
      const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||`HTTP ${r.status}`);
      await fetchAccessories(chosenId);
    }catch(e){setAccessoryError(e instanceof Error?e.message:"No se pudo desvincular.")}
    finally{setAccessoryBusy(false)}
  };

  const metric=(label:string,val:number,color:string,Icon:typeof Users,fill:string)=>{
    const total=positions.length;
    const percent=total>0?Math.min(100,Math.max(0,(val/total)*100)):0;
    const percentText=total>0?`${Number(percent.toFixed(1))}%`:"0%";
    return <div className={`${card} min-w-0 p-3`}>
      <div className="flex items-center justify-between gap-2"><span className="text-xs text-slate-400">{label}</span><span className={`rounded-lg border border-[#334864] bg-[#20314d] p-2 ${color}`}><Icon size={16}/></span></div>
      <div className={`mt-1 text-2xl font-bold ${color}`}>{val}</div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400"><span>{label==="Posiciones registradas"?"Total del directorio":"Del total de posiciones"}</span><span className="font-semibold text-slate-200">{percentText}</span></div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-700"><div className={`h-full rounded-full ${fill} transition-[width] duration-300`} style={{width:`${percent}%`}}/></div>
    </div>;
  };
  return <section className="space-y-4 text-slate-100">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[.22em] text-cyan-400">IT ASSET MANAGEMENT / POSITIONS</p><h1 className="mt-1 text-2xl font-bold">Usuarios y Posiciones</h1><p className="text-sm text-slate-400">La posición es permanente; usuarios y equipos se vinculan a ella.</p></div><div className="flex flex-wrap gap-2"><button onClick={()=>{setCreateError("");setAdding(true)}} className="rounded-lg border border-emerald-700 bg-emerald-900/20 px-4 py-2 text-sm font-semibold text-emerald-200">+ Nueva posición</button><button onClick={()=>void load()} className="flex items-center gap-2 rounded-lg border border-cyan-700 bg-cyan-900/20 px-4 py-2 text-sm text-cyan-200"><RefreshCw size={15}/>Actualizar</button></div></header>
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">{metric("Posiciones registradas",positions.length,"text-cyan-300",ChartNoAxesColumnIncreasing,"bg-cyan-400")}{metric("Con usuario",positions.filter(p=>!!(p.inventoryPersonId||p.assignedUserId||p.inventoryPerson)).length,"text-emerald-300",UserRoundCheck,"bg-emerald-400")}{metric("Disponibles equipadas",positions.filter(p=>!p.inventoryPersonId&&!p.assignedUserId&&!p.inventoryPerson&&!!p.equipment&&derivedStatus(p).label==="Completa").length,"text-sky-300",MonitorCheck,"bg-sky-400")}{metric("Incompletas",positions.filter(p=>derivedStatus(p).label.startsWith("Incompleta")).length,"text-amber-300",CircleAlert,"bg-amber-400")}{metric("Vacías",positions.filter(p=>derivedStatus(p).label.startsWith("Vacía")).length,"text-rose-300",PackageOpen,"bg-rose-400")}</div>
    {error&&<div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
    <div className="grid grid-cols-1 gap-3">
      <div className={`${card} min-w-0 overflow-hidden`}><div className="border-b border-[#30445f] p-3"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-bold">Vista de posiciones</h2><p className="text-xs text-slate-400">{shown.length} visibles · Al pulsar “Ver” la posición despliega su checklist y detalle justo debajo de la fila.</p></div><span className="rounded-lg bg-cyan-500/10 px-2 py-1 text-xs text-cyan-300">Datos reales</span></div>
      <div className="grid gap-2 md:grid-cols-4"><label className="relative md:col-span-1"><Search size={15} className="absolute left-3 top-3 text-slate-500"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar posición, usuario, PCNAME..." className={`${box} w-full py-2 pl-9 pr-2 text-xs outline-none focus:border-cyan-500`}/></label>
      <select value={floor} onChange={e=>setFloor(e.target.value)} className={`${box} min-w-0 p-2 text-xs`}><option value="ALL">Todos los pisos</option>{floors.map(f=><option key={f} value={String(f)}>Piso {f}</option>)}</select>
      <select value={wing} onChange={e=>setWing(e.target.value)} className={`${box} min-w-0 p-2 text-xs`}><option value="ALL">Todas las divisiones</option>{wings.map(w=><option key={w} value={w}>{w}</option>)}</select>
      <select value={filter} onChange={e=>setFilter(e.target.value)} className={`${box} min-w-0 p-2 text-xs`}><option value="ALL">Todos los estados</option>{["Completa","Incompleta","Vacía","Por verificar"].map(s=><option key={s}>{s}</option>)}</select></div></div>
      <div className="max-h-[570px] overflow-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="sticky top-0 bg-[#21314a] text-[10px] uppercase tracking-wider text-slate-300"><tr>{["Posición","Piso / área","Usuario asignado","Equipo vinculado","Estado","Acción"].map(x=><th key={x} className="px-3 py-3">{x}</th>)}</tr></thead><tbody>{shown.map(p=><Fragment key={p.id}><tr key={p.id} className={`border-t border-[#263953] hover:bg-cyan-500/5 ${chosen?.id===p.id?"bg-cyan-500/10":""}`}><td className="px-3 py-3 font-semibold text-cyan-200"><span className="inline-flex items-center gap-1.5"><MapPin size={14}/>{p.code}</span></td><td className="px-3 py-3"><div className="flex items-center gap-1.5"><Building2 size={13} className="text-cyan-300"/>Piso {p.location?.floorNumber??"—"}</div><div className="text-[11px] text-slate-400">{p.area?.name||p.location?.name||"Área no registrada"}</div></td><td className="px-3 py-3"><span className="inline-flex items-center gap-1.5"><UserRound size={14} className="text-cyan-300"/>{shortName(p)}</span></td><td className="px-3 py-3"><span className="inline-flex items-center gap-1.5">{deviceIcon(p)}{deviceName(p)}</span>{p.equipment?.pcName&&<div className="text-slate-400">{p.equipment.pcName}</div>}</td><td className="px-3 py-3">{<span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${tones[derivedStatus(p).color]}`}>{derivedStatus(p).label}</span>}</td><td className="px-3 py-3"><div className="flex gap-2"><button onClick={()=>{setSelected(p.id);setChecklistState(null);setQuickView(null);setDetailOpen(selected!==p.id||!detailOpen);setMenu(null)}} aria-expanded={chosen?.id===p.id&&detailOpen} className="flex items-center gap-1 rounded-lg border border-cyan-600/30 px-2 py-1.5 text-cyan-200"><Eye size={13}/>Ver</button><button title="Más opciones" onClick={()=>{setSelected(p.id);setMenu(menu===p.id?null:p.id)}} className="rounded-lg border border-[#314967] p-1.5"><MoreHorizontal size={16}/></button></div>{menu===p.id&&<div className="mt-2 w-44 rounded-lg border border-[#34516c] bg-[#0a172b] p-2 text-[11px]"><button onClick={()=>manageMetadata(p)} className="block w-full rounded p-2 text-left text-violet-200 hover:bg-slate-700"><Pencil size={13} className="mr-1 inline"/>Editar posición</button><button onClick={()=>manage(p)} className="block w-full rounded p-2 text-left text-cyan-200 hover:bg-slate-700">{p.inventoryPersonId||p.inventoryPerson?"Cambiar / quitar usuario":"Asignar usuario"}</button><button onClick={()=>manageEquipment(p)} className="block w-full rounded p-2 text-left text-emerald-200 hover:bg-slate-700">{p.equipment?"Cambiar / quitar equipo":"Vincular equipo principal"}</button><button onClick={()=>{setDeleteTarget(p);setDeleteError("");setMenu(null)}} className="mt-1 flex w-full items-center gap-1 rounded border border-rose-500/30 bg-rose-500/10 p-2 text-left font-semibold text-rose-300 hover:bg-rose-500/20"><Trash2 size={13}/>Eliminar posición</button><button onClick={()=>setMenu(null)} className="mt-1 text-slate-400">Cerrar</button></div>}</td></tr>{detailOpen&&chosen?.id===p.id&&<tr className="border-t border-cyan-500/30 bg-[#0a172b]"><td colSpan={6} className="p-3 sm:p-4"><div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(290px,0.8fr)]"><div className="min-w-0"><PositionChecklist positionId={p.id} positionCode={p.code} main={p.equipment} accessories={accessories} onComputedChange={setChecklistState} onReviewSaved={()=>{void loadReviews();void refreshLiveStatus(positions)}} onManageMain={()=>manageEquipment(p)}/></div><aside className={`${card} min-w-0 p-3`}><div className="mb-3 flex items-center justify-between gap-2"><h3 className="font-bold text-cyan-200">Detalle · {p.code}</h3><button onClick={()=>{setDetailOpen(false);setChecklistState(null)}} className="rounded-lg border border-[#314967] px-3 py-1.5 text-xs text-slate-300">Cerrar</button></div><div className="mb-3 flex items-center justify-between rounded-lg border border-[#314967] p-3 text-sm"><span>Estado</span><span className={`rounded-full border px-2 py-1 text-xs ${tones[derivedStatus(p).color]}`}>{derivedStatus(p).label}</span></div><dl className="space-y-2 text-xs">{[["Piso",`Piso ${p.location?.floorNumber??"—"}`],["División",p.wing||p.location?.wing||"—"],["Área",p.area?.name||"—"],["Usuario",shortName(p)],["Equipo",deviceName(p)],["PCNAME",p.equipment?.pcName||"No asignado"],["Serial",p.equipment?.serial||"No registrado"]].map(([k,v])=><div key={k} className="flex justify-between gap-3 border-b border-[#293d59] py-2"><dt className="text-slate-400">{k}</dt><dd className="max-w-[60%] break-words text-right font-medium">{v}</dd></div>)}</dl><div className="mt-4 grid gap-2"><button onClick={()=>manageMetadata(p)} className="rounded-lg border border-violet-600/50 px-3 py-2 text-left text-xs text-violet-200">Editar posición</button><button onClick={()=>manage(p)} className="rounded-lg border border-cyan-600/50 px-3 py-2 text-left text-xs text-cyan-200">Asignar / quitar usuario</button><button onClick={()=>manageEquipment(p)} className="rounded-lg border border-emerald-600/50 px-3 py-2 text-left text-xs text-emerald-200">Vincular / quitar equipo</button></div></aside></div></td></tr>}</Fragment>)}{!loading&&shown.length===0&&<tr><td colSpan={6} className="px-3 py-10 text-center text-slate-400">No hay posiciones para esta consulta. No se crearán posiciones automáticamente.</td></tr>}{loading&&<tr><td colSpan={6} className="px-3 py-10 text-center text-slate-400">Cargando posiciones...</td></tr>}</tbody></table></div></div>
    </div>
    <div className={`${card} overflow-hidden`}><button onClick={()=>setMapExpanded(!mapExpanded)} className="flex w-full items-center justify-between gap-2 p-4 text-left"><span className="flex items-center gap-2 font-semibold"><MapPinned className="text-cyan-300" size={20}/>Mapa de posiciones</span><span className="flex items-center gap-2 text-xs text-cyan-300">{mapExpanded?"Ocultar":"Mostrar"} <ChevronDown size={15} className={mapExpanded?"rotate-180":""}/></span></button>{mapExpanded&&<div className="border-t border-[#30445f] px-4 pb-4 pt-3 text-sm text-slate-300"><p>El mapa físico se mantiene en su módulo original para no reemplazar los planos existentes. Cuando validemos las posiciones importadas, mostraremos aquí la misma distribución enlazada.</p><a href="/map" className="mt-3 inline-flex items-center gap-2 rounded-lg border border-cyan-600/40 bg-cyan-500/10 px-4 py-2 text-cyan-300"><MapPinned size={16}/>Abrir Mapa / Posiciones <ArrowUpRight size={14}/></a></div>}</div>
    {positions.length===0&&<div className="rounded-lg border border-amber-700/30 bg-amber-500/5 p-3 text-sm text-amber-200"><AlertTriangle size={15} className="mr-2 inline"/>No hay posiciones registradas. La asignación de usuarios estará disponible cuando validemos e importemos el mapa físico; esta fase no crea posiciones automáticamente.</div>}
    {adding&&<div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4" onClick={()=>!creating&&setAdding(false)}><div onClick={e=>e.stopPropagation()} className="w-full max-w-xl rounded-xl border border-cyan-700 bg-[#172239] p-5 shadow-2xl"><div className="flex items-center justify-between"><h3 className="text-lg font-bold text-cyan-100">Registrar posición física</h3><button disabled={creating} onClick={()=>setAdding(false)}><X size={20}/></button></div><p className="mb-4 mt-2 text-xs text-slate-400">Registra una estación verificada. La posición será permanente y comenzará sin usuario ni equipo; no se afectan inventarios.</p><div className="grid grid-cols-2 gap-3"><label className="text-xs text-slate-300">Piso<select value={newFloor} onChange={e=>setNewFloor(e.target.value)} className={`${box} mt-1 w-full p-2 text-sm`}>{["1","2","3","4"].map(f=><option key={f} value={f}>Piso {f}</option>)}<option value="0">Sótano</option></select></label><label className="text-xs text-slate-300">División<select value={newWing} onChange={e=>setNewWing(e.target.value)} className={`${box} mt-1 w-full p-2 text-sm`}>{["WEST","EAST","CENTRAL","OTRA"].map(w=><option key={w}>{w}</option>)}</select></label><label className="col-span-2 text-xs text-slate-300">Área / departamento<input value={newArea} onChange={e=>setNewArea(e.target.value)} maxLength={80} placeholder="OPERACIONES, IT, FINANZAS, TRAINING..." className={`${box} mt-1 w-full p-2 text-sm`}/></label><label className="text-xs text-slate-300">Código físico<input value={newCode} onChange={e=>setNewCode(e.target.value)} maxLength={70} placeholder="R1-C17" className={`${box} mt-1 w-full p-2 text-sm`}/></label><label className="text-xs text-slate-300">Nombre opcional<input value={newName} onChange={e=>setNewName(e.target.value)} maxLength={100} placeholder="Puesto C17" className={`${box} mt-1 w-full p-2 text-sm`}/></label></div><p className="mt-3 text-xs text-amber-300">El sistema añade piso y división al identificador interno para evitar coincidencias entre pisos. Comprueba el código físico antes de guardar.</p>{createError&&<div className="mt-3 rounded-lg border border-rose-500/40 p-2 text-sm text-rose-200">{createError}</div>}<div className="mt-5 flex justify-end gap-2"><button disabled={creating} onClick={()=>setAdding(false)} className="rounded-lg border border-slate-600 px-4 py-2 text-sm">Cancelar</button><button disabled={creating||!newCode.trim()||!newArea.trim()} onClick={()=>void createPosition()} className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold disabled:opacity-40">{creating?"Guardando...":"Crear posición"}</button></div></div></div>}
    {quickView&&<div className="fixed inset-0 z-[155] flex items-center justify-center bg-black/80 p-4" onClick={()=>setQuickView(null)}><div className="w-full max-w-lg rounded-2xl border border-cyan-500/40 bg-[#111c31] p-5 shadow-2xl shadow-cyan-950/50" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-cyan-300">Detalle de posición</p><h3 className="mt-1 text-xl font-bold text-white">{quickView.code}</h3></div><button onClick={()=>setQuickView(null)} aria-label="Cerrar detalles" className="rounded-lg border border-slate-600 p-2"><X size={17}/></button></div><div className="mt-4 flex items-center justify-between rounded-lg border border-slate-600/40 bg-slate-800/60 p-3"><span className="text-sm text-slate-300">Estado actual</span><Badge p={quickView}/></div><dl className="mt-3 space-y-1 text-sm">{[["Piso",`Piso ${quickView.location?.floorNumber??"—"}`],["División",quickView.wing||quickView.location?.wing||"No registrada"],["Área",quickView.area?.name||"Sin área"],["Usuario",shortName(quickView)],["Equipo",deviceName(quickView)],["PCNAME",quickView.equipment?.pcName||"No asignado"],["Serial",quickView.equipment?.serial||"No registrado"]].map(([key,value])=><div key={key} className="flex justify-between gap-3 border-b border-slate-700/60 py-2"><dt className="text-slate-400">{key}</dt><dd className="max-w-[65%] break-words text-right text-slate-100">{value}</dd></div>)}</dl><div className="mt-5 flex flex-wrap justify-end gap-2"><button onClick={()=>{setQuickView(null);manageMetadata(quickView)}} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/50 bg-violet-500/10 px-3 py-2 text-sm text-violet-200"><Pencil size={14}/> Editar posición</button><button onClick={()=>{setQuickView(null);setDetailOpen(true);setSelected(quickView.id);setTimeout(()=>document.getElementById("p2o-detalle-completo")?.scrollIntoView({behavior:"smooth",block:"start"}),50)}} className="rounded-lg border border-cyan-600/50 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200">Checklist y detalle completo</button></div></div></div>}
    {deleteTarget&&<div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/85 p-4" onClick={()=>!deleteBusy&&setDeleteTarget(null)}><div className="w-full max-w-md rounded-2xl border border-rose-500/40 bg-[#111c31] p-5 shadow-2xl shadow-rose-950/50" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-lg font-bold text-rose-200"><Trash2 size={19}/>Eliminar posición</h3><button disabled={deleteBusy} onClick={()=>setDeleteTarget(null)} aria-label="Cerrar"><X size={18}/></button></div><p className="mt-3 text-sm text-slate-300">Posición seleccionada: <strong className="text-cyan-200">{deleteTarget.code}</strong></p><p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-100">Esta acción elimina únicamente el registro de posición. Nunca elimina usuarios ni equipos del inventario. Los códigos P2O oficiales están protegidos.</p>{deleteError&&<p role="alert" className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{deleteError}</p>}<div className="mt-5 flex justify-end gap-2"><button disabled={deleteBusy} onClick={()=>setDeleteTarget(null)} className="rounded-lg border border-slate-600 px-4 py-2 text-sm">Cancelar</button><button disabled={deleteBusy||deleteTarget.code.toUpperCase().startsWith("P2O-")} onClick={()=>void confirmDelete()} className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{deleteBusy?"Verificando...":"Confirmar eliminación"}</button></div></div></div>}
    {metadataEditing&&<div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-4" onClick={()=>!metaBusy&&setMetadataEditing(null)}><div onClick={e=>e.stopPropagation()} className="w-full max-w-xl rounded-xl border border-violet-600/40 bg-[#172239] p-5 shadow-2xl"><div className="flex items-center justify-between"><h3 className="font-bold text-violet-200">Editar posición · {metadataEditing.code}</h3><button disabled={metaBusy} onClick={()=>setMetadataEditing(null)}><X size={18}/></button></div><p className="my-3 text-xs text-slate-400">Editar el identificador y su ubicación no mueve equipos ni modifica almacén. El ID interno permanece. Para puestos antiguos de Piso 1 Central puedes usar P1-ADMIN-01 como código completo.</p><div className="grid grid-cols-2 gap-3"><label className="text-xs">Código físico<input maxLength={70} value={metaDraft.code} onChange={e=>setMetaDraft(d=>({...d,code:e.target.value.toUpperCase()}))} className={`${box} mt-1 w-full p-2`}/></label><label className="text-xs">Nombre<input maxLength={100} value={metaDraft.name} onChange={e=>setMetaDraft(d=>({...d,name:e.target.value}))} className={`${box} mt-1 w-full p-2`}/></label><label className="text-xs">Piso<select value={metaDraft.floor} onChange={e=>setMetaDraft(d=>({...d,floor:e.target.value}))} className={`${box} mt-1 w-full p-2`}>{["0","1","2","3","4"].map(v=><option key={v} value={v}>{v==="0"?"Sótano":`Piso ${v}`}</option>)}</select></label><label className="text-xs">División<select value={metaDraft.wing} onChange={e=>setMetaDraft(d=>({...d,wing:e.target.value}))} className={`${box} mt-1 w-full p-2`}>{["WEST","EAST","CENTRAL","OTRA"].map(v=><option key={v}>{v}</option>)}</select></label><label className="col-span-2 text-xs">Área<input maxLength={80} value={metaDraft.areaName} onChange={e=>setMetaDraft(d=>({...d,areaName:e.target.value}))} className={`${box} mt-1 w-full p-2`}/></label></div>{metaError&&<p className="mt-3 text-sm text-rose-300">{metaError}</p>}<div className="mt-5 flex justify-end gap-2"><button disabled={metaBusy} onClick={()=>setMetadataEditing(null)} className="rounded border border-slate-600 px-3 py-2 text-sm">Cancelar</button><button disabled={metaBusy||!metaDraft.code.trim()||!metaDraft.areaName.trim()} onClick={()=>void saveMetadata()} className="rounded bg-violet-700 px-4 py-2 text-sm disabled:opacity-40">{metaBusy?"Guardando...":"Guardar cambios"}</button></div></div></div>}
    {equipmentEditing&&<div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4" onClick={()=>!deviceSaving&&setEquipmentEditing(null)}><div className="w-full max-w-xl rounded-xl border border-emerald-700/50 bg-[#172239] p-5 shadow-2xl" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold text-emerald-100">Equipo principal · {equipmentEditing.code}</h3><button disabled={deviceSaving} onClick={()=>setEquipmentEditing(null)}><X size={19}/></button></div><p className="my-3 text-sm text-slate-300">Vincula un activo individual existente en Inventario. La posición y su usuario permanecen. No se modifica cantidad ni condición del activo.</p><label className="mb-2 block text-xs text-slate-300">Seleccionar por PCNAME, serial o modelo</label><select value={deviceId} onChange={e=>setDeviceId(e.target.value)} className={`${box} w-full p-3 text-sm`}><option value="">Selecciona un equipo...</option>{devices.filter(d=>d.quantity===1 && !["DAMAGED","RETIRED","DISCARDED","SCRAPPED","IN_REPAIR","REPAIR"].includes((d.condition||"").toUpperCase()) && (!positions.some(p=>p.equipment?.id===d.id && p.id!==equipmentEditing.id))).map(d=><option key={d.id} value={d.id}>{[d.pcName,d.serial,d.category,d.brand,d.model].filter(Boolean).join(" · ")}</option>)}</select><p className="mt-3 text-xs text-amber-300">Solo un equipo principal por posición. Los accesorios individuales se vinculan desde la ficha lateral; los lotes quedan pendientes.</p>{deviceError&&<p className="mt-3 rounded-lg border border-rose-500/40 p-3 text-xs text-rose-200">{deviceError}</p>}<div className="mt-5 flex flex-wrap justify-end gap-2"><button disabled={deviceSaving} onClick={()=>setEquipmentEditing(null)} className="rounded-lg border border-slate-600 px-3 py-2 text-sm">Cancelar</button>{equipmentEditing.equipment&&<button disabled={deviceSaving} onClick={()=>void saveEquipment(true)} className="inline-flex items-center gap-1 rounded-lg border border-rose-600/50 px-3 py-2 text-sm text-rose-200"><Unlink size={14}/>Quitar equipo</button>}<button disabled={deviceSaving||!deviceId} onClick={()=>void saveEquipment(false)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold disabled:opacity-40"><Link2 size={14}/>{deviceSaving?"Guardando...":"Guardar vínculo"}</button></div></div></div>}
    {editing&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4" onClick={()=>!saving&&setEditing(null)}><div onClick={e=>e.stopPropagation()} className="w-full max-w-lg rounded-xl border border-cyan-700 bg-[#172239] p-5 shadow-2xl"><div className="flex items-center justify-between"><h3 className="text-lg font-bold">Gestionar usuario · {editing.code}</h3><button disabled={saving} onClick={()=>setEditing(null)}><X size={20}/></button></div><p className="my-3 text-sm text-slate-300">La posición física y sus equipos NO serán modificados.</p><label className="mb-2 block text-xs text-slate-300">Usuario del directorio</label><select className={`${box} w-full p-3 text-sm`} value={personId} onChange={e=>setPersonId(e.target.value)}><option value="">Selecciona un usuario...</option>{people.filter(p=>p.status!=="INACTIVE"&&p.status!=="DISABLED").map(p=><option key={p.id} value={p.id}>{p.firstName} {p.lastName} · {p.employeeId||p.id}</option>)}</select>{people.length===0&&<p className="mt-2 text-xs text-amber-300">No se encontraron personas del directorio. Verifica el servicio /inventory-people.</p>}{notice&&<div className="mt-3 rounded border border-rose-500/40 p-2 text-sm text-rose-200">{notice}</div>}<div className="mt-5 flex flex-wrap justify-end gap-2"><button disabled={saving} onClick={()=>setEditing(null)} className="rounded-lg border border-slate-600 px-3 py-2 text-sm">Cancelar</button>{(editing.inventoryPersonId||editing.inventoryPerson)&&<button disabled={saving} onClick={()=>void savePerson(true)} className="rounded-lg border border-rose-600 px-3 py-2 text-sm text-rose-200"><UserMinus size={14} className="mr-1 inline"/>Quitar usuario</button>}<button disabled={saving||!personId} onClick={()=>void savePerson(false)} className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold disabled:opacity-40">{saving?"Guardando...":"Guardar asignación"}</button></div></div></div>}
    <div className="rounded-lg border border-amber-700/20 p-3 text-xs text-slate-400"><AlertTriangle size={14} className="mr-2 inline text-amber-300"/>Los estados provienen de vínculos actuales. Quitar un usuario solo cambia su asignación a la posición: no elimina al empleado, ni cambia el inventario.</div>
  </section>;
}
