"use client";
import {useCallback,useEffect,useMemo,useState} from 'react';
import {apiRequest} from '@/lib/api';
import {Download,RefreshCw,Search,AlertTriangle,History,FileClock,ArrowUpFromLine,ArrowDownToLine,Wrench,PackageX,CalendarDays,ChevronLeft,ChevronRight,Eye,X} from 'lucide-react';
type Event={id:string;created_at:string;action:string;quantity:number;from_bucket:string|null;to_bucket:string|null;position_code:string|null;reference:string|null;reason:string|null;actor:string|null;equipment_name:string;equipment_id:string};
type Damage={id:string;created_at:string;type:string;description:string;status:string;priority:string;reported_by:string|null;repaired_by:string|null;repaired_at:string|null;equipment_name:string;equipment_id:string;serial:string|null};
type Page<T>={rows:T[];total:number};
const esc=(value:unknown)=>'"'+String(value??'').replace(/"/g,'""')+'"';
const date=(d:Date)=>d.toISOString().slice(0,10);
const openCalendar=(input:HTMLInputElement|null)=>{if(!input)return;try{input.showPicker?.()}catch{input.focus()}};
const styleFor=(t:string)=>{const s=t.toLowerCase();return s.includes('entrada')?'text-sky-300 bg-sky-500/15 border-sky-500/30':s.includes('entrega')?'text-emerald-300 bg-emerald-500/15 border-emerald-500/30':s.includes('devolución')?'text-violet-300 bg-violet-500/15 border-violet-500/30':s.includes('daño')?'text-amber-300 bg-amber-500/15 border-amber-500/30':s.includes('repar')?'text-rose-300 bg-rose-500/15 border-rose-500/30':s.includes('baja')?'text-slate-300 bg-slate-500/15 border-slate-500/30':'text-cyan-300 bg-cyan-500/15 border-cyan-500/30'};
const statusFor=(t:string)=>['Confirmado','Completado','REPAIRED','RESOLVED'].includes(t)?'text-emerald-300 bg-emerald-500/15 border-emerald-500/30':['OPEN','PENDING'].includes(t)?'text-amber-300 bg-amber-500/15 border-amber-500/30':'text-slate-300 bg-slate-500/15 border-slate-500/30';
const n=(x:number)=>x.toLocaleString('es-DO');
const classify=(e:Event)=>e.action==='OPENING'?'Entrada / saldo inicial':e.from_bucket==='WAREHOUSE_AVAILABLE'&&e.to_bucket==='PRODUCTION'?'Entrega':e.from_bucket==='PRODUCTION'&&e.to_bucket==='WAREHOUSE_DAMAGED'?'Devolución dañada':e.from_bucket==='PRODUCTION'&&e.to_bucket==='WAREHOUSE_AVAILABLE'?'Devolución':e.to_bucket==='REPAIR'?'En reparación':e.from_bucket==='REPAIR'?'Reparado':e.to_bucket==='RETIRED'?'Baja':e.action==='TRANSFER'?'Transferencia':e.action;
const text=(value:unknown)=>String(value??'').toLocaleLowerCase();
export default function StockActivityHistory(){
 const [selected,setSelected]=useState<null|{time:string;type:string;equip:string;units:number;location:string;position:string;ticket:string;owner:string;reason:string;status:string}>(null);
 const [pageSize,setPageSize]=useState(25);
 const [from,setFrom]=useState(()=>{const d=new Date();d.setUTCDate(d.getUTCDate()-30);return date(d)});
 const [through,setThrough]=useState(()=>date(new Date()));
 const [kind,setKind]=useState('Todos');const [search,setSearch]=useState('');const [page,setPage]=useState(0);
 const [events,setEvents]=useState<Event[]>([]);const [damages,setDamages]=useState<Damage[]>([]);
 const [eventsTotal,setEventsTotal]=useState(0);const [damageTotal,setDamageTotal]=useState(0);
 const [loading,setLoading]=useState(false);const [error,setError]=useState('');const [tick,setTick]=useState(0);const [exporting,setExporting]=useState(false);
 const params=useMemo(()=>`start=${encodeURIComponent(from)}&end=${encodeURIComponent(date(new Date(new Date(through+'T00:00:00Z').getTime()+86400000)))}`,[from,through]);
 const load=useCallback(async()=>{setLoading(true);setError('');try{
  const [ev,dm]=await Promise.all([apiRequest(`/stock-engine/report-events?${params}&limit=500&offset=0`),apiRequest(`/stock-engine/report-damages?${params}&limit=500&offset=0`)]);
  if(!ev.ok||!dm.ok)throw new Error(`Error de consulta (${ev.status}/${dm.status}).`);
  const a=await ev.json() as Page<Event>;const b=await dm.json() as Page<Damage>;
  setEvents(a.rows||[]);setDamages(b.rows||[]);setEventsTotal(a.total||0);setDamageTotal(b.total||0);
 }catch(err){setError(err instanceof Error?err.message:'Error al consultar historial')}finally{setLoading(false)}},[params]);
 useEffect(()=>{void load()},[load,tick]);
 const rows=useMemo(()=>{
  const ev=events.map(e=>({id:'e:'+e.id,time:e.created_at,type:classify(e),equip:e.equipment_name,units:e.quantity,location:`${e.from_bucket||'Externo'} → ${e.to_bucket||'—'}`,position:e.position_code||'—',ticket:e.reference||'—',owner:e.actor||'—',reason:e.reason||'—',status:'Confirmado'}));
  const dm=damages.map(d=>({id:'d:'+d.id,time:d.created_at,type:'Daño / incidencia',equip:d.equipment_name,units:1,location:'Daños y reparaciones',position:'—',ticket:'—',owner:d.reported_by||'—',reason:`${d.type}: ${d.description}`,status:d.status}));
  return [...ev,...dm].filter(r=>(kind==='Todos'||r.type===kind)&&(!search||[r.equip,r.type,r.owner,r.position,r.ticket,r.reason].some(x=>text(x).includes(text(search))))).sort((a,b)=>b.time.localeCompare(a.time));
 },[events,damages,kind,search]);
 const visible=rows.slice(page*pageSize,(page+1)*pageSize);
 const pages=Math.max(1,Math.ceil(rows.length/pageSize));
 const exportCsv=async()=>{setExporting(true);setError('');try{
  const readAll=async<T,>(endpoint:string):Promise<T[]>=>{let offset=0,total=0;const all:T[]=[];do{const r=await apiRequest(`/stock-engine/${endpoint}?${params}&limit=500&offset=${offset}`);if(!r.ok)throw new Error('Error al exportar '+endpoint);const body=await r.json() as Page<T>;total=body.total;all.push(...body.rows);offset+=body.rows.length;if(!body.rows.length&&offset<total)throw new Error('Consulta incompleta');}while(offset<total);return all};
  const [ev,dm]=await Promise.all([readAll<Event>('report-events'),readAll<Damage>('report-damages')]);
  const all=[...ev.map(e=>[e.created_at,classify(e),e.equipment_name,e.quantity,e.position_code,e.reference,e.actor,e.reason,e.from_bucket,e.to_bucket]),...dm.map(d=>[d.created_at,'Daño / incidencia',d.equipment_name,1,'','',d.reported_by,d.description,'',d.status])].sort((a,b)=>String(b[0]).localeCompare(String(a[0])));
  const csv='\uFEFF'+[['Fecha UTC','Tipo','Equipo','Cantidad','Posición','Ticket','Responsable','Motivo','Origen','Destino'],...all].map(line=>line.map(esc).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`IT-Hub-historial-${from}-${through}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
 }catch(err){setError(err instanceof Error?err.message:'Error de exportación')}finally{setExporting(false)}};
 return <main className="-mt-3 space-y-3 p-3 sm:p-4 text-slate-100"><div className="flex flex-wrap justify-between gap-3"><div><div className="flex items-center gap-2"><History size={22} className="text-violet-400"/><h1 className="text-2xl font-bold">Historial de movimientos</h1></div><p className="text-xs text-slate-400 mt-1">Entradas, entregas, devoluciones e incidencias reales. Sin registros de acceso.</p></div><div className="flex gap-2"><button onClick={()=>setTick(v=>v+1)} className="rounded-lg border border-slate-600 px-3 py-2 text-xs"><RefreshCw size={14} className="inline mr-1"/>Actualizar</button><button onClick={()=>void exportCsv()} disabled={loading||exporting} className="rounded-lg bg-blue-600 px-3 py-2 text-xs disabled:opacity-50"><Download size={14} className="inline mr-1"/>{exporting?'Exportando':'Exportar CSV'}</button></div></div>
 <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">{[
  {title:'Entradas',count:events.filter(e=>classify(e)==='Entrada / saldo inicial').reduce((s,e)=>s+e.quantity,0),icon:ArrowDownToLine,tone:'cyan',items:events.filter(e=>classify(e)==='Entrada / saldo inicial').map(e=>({date:e.created_at,count:e.quantity}))},
  {title:'Entregas',count:events.filter(e=>classify(e)==='Entrega').reduce((s,e)=>s+e.quantity,0),icon:ArrowUpFromLine,tone:'emerald',items:events.filter(e=>classify(e)==='Entrega').map(e=>({date:e.created_at,count:e.quantity}))},
  {title:'Devoluciones',count:events.filter(e=>classify(e).startsWith('Devolución')).reduce((s,e)=>s+e.quantity,0),icon:RefreshCw,tone:'violet',items:events.filter(e=>classify(e).startsWith('Devolución')).map(e=>({date:e.created_at,count:e.quantity}))},
  {title:'Daños',count:damageTotal,icon:AlertTriangle,tone:'amber',items:damages.map(d=>({date:d.created_at,count:1}))},
  {title:'Reparaciones',count:events.filter(e=>classify(e)==='En reparación'||e.from_bucket==='REPAIR').reduce((s,e)=>s+e.quantity,0),icon:Wrench,tone:'rose',items:events.filter(e=>classify(e)==='En reparación'||e.from_bucket==='REPAIR').map(e=>({date:e.created_at,count:e.quantity}))},
  {title:'Bajas',count:events.filter(e=>classify(e)==='Baja').reduce((s,e)=>s+e.quantity,0),icon:PackageX,tone:'slate',items:events.filter(e=>classify(e)==='Baja').map(e=>({date:e.created_at,count:e.quantity}))}
 ].map(k=>{
  const Icon=k.icon;
  const styles:Record<string,{border:string,glow:string,text:string,bar:string}>={cyan:{border:'border-cyan-500/50',glow:'bg-cyan-500/15',text:'text-cyan-400',bar:'bg-cyan-400'},emerald:{border:'border-emerald-500/50',glow:'bg-emerald-500/15',text:'text-emerald-400',bar:'bg-emerald-400'},violet:{border:'border-violet-500/50',glow:'bg-violet-500/15',text:'text-violet-400',bar:'bg-violet-400'},amber:{border:'border-amber-500/50',glow:'bg-amber-500/15',text:'text-amber-400',bar:'bg-amber-400'},rose:{border:'border-rose-500/50',glow:'bg-rose-500/15',text:'text-rose-400',bar:'bg-rose-400'},slate:{border:'border-slate-500/50',glow:'bg-slate-400/10',text:'text-slate-300',bar:'bg-slate-400'}};
  const st=styles[k.tone];
  const today=new Date();today.setUTCHours(0,0,0,0);
  const days=Array.from({length:7},(_,i)=>{const d=new Date(today);d.setUTCDate(d.getUTCDate()-(6-i));return d.toISOString().slice(0,10)});
  const values=days.map(day=>k.items.filter(item=>item.date.slice(0,10)===day).reduce((n,item)=>n+item.count,0));
  const peak=Math.max(1,...values);
  return <div key={k.title} className={'relative flex min-w-0 items-center gap-2 rounded-xl border bg-[#101e39] px-2.5 py-2.5 shadow-sm '+st.border}>
    <span className={'shrink-0 rounded-lg border border-white/10 p-2 '+st.glow+' '+st.text}><Icon size={19}/></span>
    <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-medium text-slate-300">{k.title}</p><strong className="block text-xl font-bold leading-tight tabular-nums">{loading?'…':n(k.count)}</strong><p className="text-[9px] text-slate-500">En el período</p></div>
    <div className="flex h-9 w-14 shrink-0 items-end gap-[3px]" title="Actividad diaria real de los últimos 7 días (UTC)">{values.map((v,i)=><span key={i} className={'w-1.5 rounded-t '+(v?st.bar:'bg-white/10')} style={{height:`${Math.max(3,v/peak*28)}px`}} title={`${days[i]}: ${v}`}/>)}</div>
  </div>;
 })}</div>
 <section className="rounded-xl border border-blue-400/25 bg-[#10203a] p-4">
  <h2 className="mb-3 font-semibold">Filtros del historial</h2>
  <div className="grid gap-3 md:grid-cols-4">
   {([{name:'Desde',value:from,change:setFrom},{name:'Hasta',value:through,change:setThrough}] as const).map(f=><label key={f.name} className="text-xs font-medium text-slate-200">{f.name}
    <div className="relative mt-1"><input type="date" value={f.value} onChange={e=>{if(e.target.value){f.change(e.target.value);setPage(0)}}} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 pr-10 text-sm text-slate-100 [color-scheme:dark] focus:border-blue-400"/>
     <button type="button" aria-label={'Abrir calendario '+f.name} onClick={e=>openCalendar(e.currentTarget.previousElementSibling as HTMLInputElement)} className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-2 text-blue-300 hover:bg-blue-500/15"><CalendarDays size={16}/></button>
    </div></label>)}
   <label className="text-xs font-medium text-slate-200">Tipo<select value={kind} onChange={e=>{setKind(e.target.value);setPage(0)}} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm">{['Todos','Entrada / saldo inicial','Entrega','Devolución','Devolución dañada','Daño / incidencia','Transferencia','Baja','En reparación'].map(t=><option key={t}>{t}</option>)}</select></label>
   <label className="text-xs font-medium text-slate-200">Buscar equipo, ticket o responsable<div className="relative mt-1"><Search size={14} className="absolute left-3 top-3 text-slate-400"/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(0)}} className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 pl-9 text-sm" placeholder="Buscar..."/></div></label>
  </div>
 </section>
 {error&&<div className="rounded-lg border border-red-500/50 bg-red-900/20 p-3 text-sm">{error}</div>}
 <section className="rounded-xl border border-blue-400/25 bg-[#10203a] p-4">
  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
   <div><h2 className="text-lg font-semibold">Historial completo</h2><p className="text-xs text-slate-400">{rows.length} visibles en la consulta · {eventsTotal+damageTotal} registros del período</p></div>
   <div className="flex items-center gap-2 text-xs text-slate-300">
    <label htmlFor="historial-paginas">Mostrar</label>
    <select id="historial-paginas" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(0)}} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5">{[10,25,50].map(v=><option key={v} value={v}>{v}</option>)}</select>
    <button aria-label="Página anterior" type="button" disabled={page===0} onClick={()=>setPage(v=>Math.max(0,v-1))} className="rounded-lg border border-slate-700 p-1.5 disabled:opacity-30"><ChevronLeft size={15}/></button>
    <span>{page+1} de {pages}</span>
    <button aria-label="Página siguiente" type="button" disabled={page+1>=pages} onClick={()=>setPage(v=>Math.min(pages-1,v+1))} className="rounded-lg border border-slate-700 p-1.5 disabled:opacity-30"><ChevronRight size={15}/></button>
   </div>
  </div>
  <div className="overflow-x-auto rounded-lg border border-slate-700/60">
   <table className="min-w-[1160px] w-full text-left text-xs">
    <thead className="bg-[#192c4d] text-slate-300"><tr>{['Fecha','Tipo','Equipo','Cantidad','Origen → Destino','Usuario / Posición','Ticket','Responsable','Motivo','Estado','Acciones'].map(t=><th key={t} className="px-3 py-3 font-semibold">{t}</th>)}</tr></thead>
    <tbody>{visible.map(r=><tr key={r.id} className="border-t border-white/5 hover:bg-blue-400/5">
     <td className="whitespace-nowrap px-3 py-3">{new Date(r.time).toLocaleString('es-DO')}</td>
     <td className="px-3 py-3"><span className={'inline-flex whitespace-nowrap rounded-md border px-2 py-1 font-semibold '+styleFor(r.type)}>{r.type}</span></td>
     <td className="px-3 py-3 font-medium text-slate-100">{r.equip}</td>
     <td className="px-3 py-3 tabular-nums">{r.units}</td>
     <td className="px-3 py-3 text-slate-300">{r.location}</td>
     <td className="px-3 py-3">{r.position}</td>
     <td className="px-3 py-3">{r.ticket}</td>
     <td className="px-3 py-3">{r.owner}</td>
     <td className="max-w-[230px] truncate px-3 py-3" title={r.reason}>{r.reason}</td>
     <td className="px-3 py-3"><span className={'rounded-md border px-2 py-1 font-medium '+statusFor(r.status)}>{r.status}</span></td>
     <td className="px-3 py-3"><button type="button" onClick={()=>setSelected(r)} className="inline-flex items-center gap-1 rounded-lg border border-blue-400/25 bg-blue-500/10 px-2.5 py-1.5 font-medium hover:bg-blue-500/20"><Eye size={13}/> Ver</button></td>
    </tr>)}</tbody>
   </table>
   {!visible.length&&!loading&&<p className="p-6 text-center text-slate-400">No hay movimientos para estos filtros.</p>}
   {loading&&<p className="p-6 text-center text-slate-400">Cargando historial...</p>}
  </div>
 </section>
 {selected&&<div role="dialog" aria-modal="true" aria-label="Detalle del movimiento" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4" onClick={()=>setSelected(null)}>
  <div className="w-full max-w-xl rounded-2xl border border-blue-400/35 bg-[#10203a] p-5 shadow-2xl" onClick={e=>e.stopPropagation()}>
   <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">Detalle del movimiento</h2><button type="button" aria-label="Cerrar" onClick={()=>setSelected(null)} className="rounded-lg p-2 hover:bg-white/10"><X size={18}/></button></div>
   <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">{([{a:'Fecha',b:new Date(selected.time).toLocaleString('es-DO')},{a:'Operación',b:selected.type},{a:'Equipo',b:selected.equip},{a:'Cantidad',b:String(selected.units)},{a:'Origen → Destino',b:selected.location},{a:'Posición',b:selected.position},{a:'Ticket',b:selected.ticket},{a:'Responsable',b:selected.owner},{a:'Estado',b:selected.status},{a:'Motivo',b:selected.reason}]).map(item=><div key={item.a} className="min-w-0 rounded-lg border border-white/10 bg-black/10 p-3"><dt className="text-xs text-slate-400">{item.a}</dt><dd className="mt-1 break-words text-sm font-medium">{item.b}</dd></div>)}</dl>
  </div>
 </div>}
 <p className="text-xs text-amber-200">La tabla consulta hasta 500 registros por fuente. Exportar CSV descarga el período completo.</p>
</main>
}
