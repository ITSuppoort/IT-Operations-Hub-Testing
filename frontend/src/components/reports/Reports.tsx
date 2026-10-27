"use client";
import {useCallback,useEffect,useMemo,useState} from 'react';
import {apiRequest} from '@/lib/api';
import {makeActivityZip} from '@/lib/activityZip';
import {Download,RefreshCw,CalendarDays,Package,ArrowDownToLine,ArrowUpFromLine,AlertTriangle,Printer} from 'lucide-react';
type Metric={action:string;from_bucket:string|null;to_bucket:string|null;operations:number;units:number};
type Week={week:string;action:string;from_bucket:string|null;to_bucket:string|null;units:number};
type Summary={metrics:Metric[];weeks:Week[]};
type Event={id:string;created_at:string;action:string;quantity:number;from_bucket:string|null;to_bucket:string|null;position_code:string|null;reference:string|null;reason:string;actor:string;equipment_name:string;equipment_id:string};
type EventsResponse={rows:Event[];total:number};
type Damage={id:string;created_at:string;type:string;description:string;status:string;priority:string;reported_by:string|null;repaired_by:string|null;repaired_at:string|null;equipment_name:string;equipment_id:string;serial:string|null};
type DamagesResponse={rows:Damage[];total:number};
const date=(d:Date)=>d.toISOString().slice(0,10);
const endOfMonth=(s:string)=>{const [y,m]=s.split('-').map(Number);return date(new Date(Date.UTC(y,m,1)))};
const monday=(d:Date)=>{const x=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));x.setUTCDate(x.getUTCDate()-((x.getUTCDay()+6)%7));return date(x)};
const after=(s:string,n:number)=>{const d=new Date(s+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return date(d)};
const label=(r:{action:string;from_bucket:string|null;to_bucket:string|null})=>{
 if(r.action==='OPENING')return 'Entrada / saldo inicial';
 if(r.from_bucket==='WAREHOUSE_AVAILABLE'&&r.to_bucket==='PRODUCTION')return 'Entrega';
 if(r.from_bucket==='PRODUCTION'&&r.to_bucket==='WAREHOUSE_DAMAGED')return 'Devolución dañada';
 if(r.from_bucket==='PRODUCTION'&&r.to_bucket==='WAREHOUSE_AVAILABLE')return 'Devolución';
 if(r.to_bucket==='REPAIR')return 'En reparación';
 if(r.to_bucket==='RETIRED')return 'Baja';
 if(r.from_bucket==='REPAIR'&&r.to_bucket==='WAREHOUSE_AVAILABLE')return 'Reparado';
 return r.action==='TRANSFER'?'Transferencia':r.action;
};
const esc=(v:unknown)=>'"'+String(v??'').replace(/"/g,'""')+'"';
const n=(a:number)=>a.toLocaleString('es-DO');
export default function Reports(){
 const [mode,setMode]=useState<'month'|'week'>('month');
 const [month,setMonth]=useState(()=>date(new Date()).slice(0,7));
 const [week,setWeek]=useState(()=>monday(new Date()));
 const [summary,setSummary]=useState<Summary|null>(null);
 const [recent,setRecent]=useState<Event[]>([]);
 const [total,setTotal]=useState(0);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [refresh,setRefresh]=useState(0);
 const [exporting,setExporting]=useState(false);
 const [damages,setDamages]=useState<Damage[]>([]);
 const [damageTotal,setDamageTotal]=useState(0);
 const [comparison,setComparison]=useState<{weekCurrent:number;weekPrevious:number;monthCurrent:number;monthPrevious:number;priorDelivery:number;priorReturn:number;priorDamage:number;priorRetire:number}|null>(null);
 const [closing,setClosing]=useState(false);
 const [activeCard,setActiveCard]=useState<string|null>(null);
 const [weeklySummary,setWeeklySummary]=useState<Summary|null>(null);
 const [weeklyDamages,setWeeklyDamages]=useState(0);
 const start=mode==='month'?month+'-01':week;
 const end=mode==='month'?endOfMonth(start):after(start,7);
 const params=`start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
 // En modo mensual mostramos la semana UTC actual si pertenece al mes; si no, la ultima semana del mes.
 const todayUtc=date(new Date());
 const referenceDay=mode==='week'?week:(todayUtc>=start&&todayUtc<end?todayUtc:after(end,-1));
 const weeklyStart=mode==='week'?week:monday(new Date(referenceDay+'T00:00:00Z'));
 const weeklyEnd=after(weeklyStart,7);
 const weeklyParams=`start=${encodeURIComponent(weeklyStart)}&end=${encodeURIComponent(weeklyEnd)}`;
 // Comparaciones basadas en eventos reales, nunca porcentajes simulados.
 const compare=useCallback(async()=>{
  const currentStart=new Date(`${start}T00:00:00Z`);
  const days=Math.round((new Date(`${end}T00:00:00Z`).getTime()-currentStart.getTime())/86400000);
  const previousStart=after(start,-days);
  const dateToday=new Date();
  const weekStart=monday(dateToday),lastWeek=after(weekStart,-7);
  const monthStart=date(dateToday).slice(0,7)+'-01';
  const prevMonthDate=new Date(`${monthStart}T00:00:00Z`);prevMonthDate.setUTCMonth(prevMonthDate.getUTCMonth()-1);
  const prevMonth=date(prevMonthDate);
  const getSummary=async(a:string,b:string)=>{
    const result=await apiRequest(`/stock-engine/report-summary?start=${a}&end=${b}`);
    if(!result.ok)throw new Error('No se pudo calcular el periodo comparativo');
    return await result.json() as Summary;
  };
  const totals=(s:Summary)=>({count:s.metrics.reduce((n,x)=>n+x.operations,0),delivery:s.metrics.filter(x=>label(x)==='Entrega').reduce((n,x)=>n+x.units,0),returned:s.metrics.filter(x=>label(x).startsWith('Devolución')).reduce((n,x)=>n+x.units,0),retired:s.metrics.filter(x=>label(x)==='Baja').reduce((n,x)=>n+x.units,0)});
  const [w,lw,m,lm,p,damageResponse]=await Promise.all([
    getSummary(weekStart,after(weekStart,7)),getSummary(lastWeek,weekStart),
    getSummary(monthStart,endOfMonth(monthStart)),getSummary(prevMonth,monthStart),
    getSummary(previousStart,start),
    apiRequest(`/stock-engine/report-damages?start=${previousStart}&end=${start}&limit=1&offset=0`)
  ]);
  if(!damageResponse.ok)throw new Error('No se pudo calcular incidencia anterior');
  const previousDamage=await damageResponse.json() as DamagesResponse;
  setComparison({weekCurrent:totals(w).count,weekPrevious:totals(lw).count,monthCurrent:totals(m).count,monthPrevious:totals(lm).count,priorDelivery:totals(p).delivery,priorReturn:totals(p).returned,priorDamage:previousDamage.total,priorRetire:totals(p).retired});
 },[start,end]);
 const load=useCallback(async()=>{
   setLoading(true);setError('');
   try{
    const [a,b,c,ws,wd]=await Promise.all([apiRequest(`/stock-engine/report-summary?${params}`),apiRequest(`/stock-engine/report-events?${params}&limit=15&offset=0`),apiRequest(`/stock-engine/report-damages?${params}&limit=15&offset=0`),apiRequest(`/stock-engine/report-summary?${weeklyParams}`),apiRequest(`/stock-engine/report-damages?${weeklyParams}&limit=1&offset=0`)]);
    if(!a.ok||!b.ok){let message='Error al consultar reportes';try{const body=await (!a.ok?a:b).json();message=body.message||message}catch{}throw new Error(message)}
    const s=await a.json() as Summary;const e=await b.json() as EventsResponse;
    if(!c.ok)throw new Error('Error al consultar incidencias del módulo Daños');
    const d=await c.json() as DamagesResponse;setDamages(d.rows);setDamageTotal(d.total);
    if(!ws.ok||!wd.ok)throw new Error('No fue posible calcular el resumen semanal');
    const weeklyData=await ws.json() as Summary;const weeklyDamageData=await wd.json() as DamagesResponse;
    setWeeklySummary(weeklyData);setWeeklyDamages(weeklyDamageData.total);
    setSummary(s);setRecent(e.rows);setTotal(e.total);await compare();
   }catch(e){setError(e instanceof Error?e.message:'No se pudo consultar');setSummary(null);setRecent([]);setTotal(0);setDamages([]);setDamageTotal(0);setComparison(null);setWeeklySummary(null);setWeeklyDamages(0)}finally{setLoading(false)}
 },[params,weeklyParams,compare]);
 useEffect(()=>{void load()},[load,refresh]);
 const cards=useMemo(()=>{
  const metrics=summary?.metrics||[];
  const units=(name:string)=>metrics.filter(x=>label(x)===name).reduce((n,x)=>n+x.units,0);
  return [
   {title:'Movimientos esta semana',value:comparison?.weekCurrent??0,previous:comparison?.weekPrevious??null,icon:Package,accent:'cyan'},
   {title:'Movimientos del mes',value:comparison?.monthCurrent??0,previous:comparison?.monthPrevious??null,icon:CalendarDays,accent:'violet'},
   {title:'Entregas',value:units('Entrega'),previous:comparison?.priorDelivery??null,icon:ArrowUpFromLine,accent:'emerald'},
   {title:'Devoluciones',value:units('Devolución')+units('Devolución dañada'),previous:comparison?.priorReturn??null,icon:RefreshCw,accent:'amber'},
   {title:'Incidencias',value:damageTotal,previous:comparison?.priorDamage??null,icon:AlertTriangle,accent:'rose'},
   {title:'Bajas',value:units('Baja'),previous:comparison?.priorRetire??null,icon:Package,accent:'slate'}
  ];
 },[summary,comparison,damageTotal]);
 const trend=(value:number,previous:number|null)=>previous===null?'Sin comparación':previous===0?(value===0?'Sin cambios':'Nuevo movimiento'):`${value>=previous?'+':''}${Math.round((value-previous)/previous*100)}% vs. periodo anterior`;
 const relevantEvents=(title:string)=>recent.filter(e=>{const v=label(e);return title==='Entregas'?v==='Entrega':title==='Devoluciones'?v.startsWith('Devolución'):title==='Bajas'?v==='Baja':true});
 const cardDetails=activeCard==='Incidencias'?damages:activeCard?relevantEvents(activeCard):[];


 const weeklyRows=useMemo(()=>{
   const all=weeklySummary?.metrics||[];
   const sum=(predicate:(x:Metric)=>boolean)=>all.filter(predicate).reduce((count,x)=>count+x.units,0);
   const delivered=sum(x=>label(x)==='Entrega');
   const returned=sum(x=>label(x).startsWith('Devolución'));
   const replacements=sum(x=>/REPLAC/i.test(x.action)||/Reemplazo/i.test(label(x)));
   const rows=[
     {name:'Equipos entregados',value:delivered,color:'bg-blue-500',dot:'bg-blue-400'},
     {name:'Equipos devueltos',value:returned,color:'bg-emerald-500',dot:'bg-emerald-400'},
     {name:'Incidencias de daño',value:weeklyDamages,color:'bg-amber-500',dot:'bg-amber-400'},
     {name:'Reemplazos registrados',value:replacements,color:'bg-violet-500',dot:'bg-violet-400'}
   ];
   const total=rows.reduce((v,r)=>v+r.value,0);
   return {rows,total};
 },[weeklySummary,weeklyDamages]);
 const downloadWeekly=()=>{
   const weekHeader=['Concepto','Cantidad','Porcentaje','Inicio UTC','Fin exclusivo UTC'];
   const csv='\uFEFF'+[weekHeader,...weeklyRows.rows.map(r=>[r.name,String(r.value),weeklyRows.total?String((r.value/weeklyRows.total*100).toFixed(1)):'0',weeklyStart,weeklyEnd])].map(c=>c.map(esc).join(',')).join('\r\n');
   const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
   const anchor=document.createElement('a');anchor.href=url;anchor.download=`IT-Hub-resumen-semanal-${weeklyStart}.csv`;anchor.click();
   setTimeout(()=>URL.revokeObjectURL(url),2000);
 };

 const downloadCsv=async()=>{
 setExporting(true);setError('');
 try{
  const rows:Event[]=[];let offset=0;let totalRows=0;
  do{
   const response=await apiRequest(`/stock-engine/report-events?${params}&limit=500&offset=${offset}`);
   if(!response.ok)throw new Error('Falló la descarga de movimientos');
   const part=await response.json() as EventsResponse;totalRows=part.total;rows.push(...part.rows);offset+=part.rows.length;
   if(!part.rows.length&&offset<totalRows)throw new Error('Paginación incompleta');
  }while(offset<totalRows);
  const header=['ID','Fecha UTC','Operación','Equipo','Cantidad','Origen','Destino','Posición','Ticket','Motivo','Técnico'];
  const csv='\uFEFF'+[header,...rows.map(e=>[e.id,e.created_at,label(e),e.equipment_name,e.quantity,e.from_bucket,e.to_bucket,e.position_code,e.reference,e.reason,e.actor])].map(r=>r.map(esc).join(',')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download=`movimientos-${start}-${after(end,-1)}.csv`;link.click();URL.revokeObjectURL(url);
 }catch(e){setError(e instanceof Error?e.message:'Falló la exportación')}finally{setExporting(false)}
 };
 const fetchAll=async<T,>(path:string):Promise<T[]>=>{
   const result:T[]=[];let offset=0;let expected=0;
   do{
    const response=await apiRequest(`/stock-engine/${path}?${params}&limit=500&offset=${offset}`);
    if(!response.ok)throw new Error(`No se pudo exportar ${path} (HTTP ${response.status})`);
    const page=await response.json() as {rows:T[];total:number};
    if(!Array.isArray(page.rows)||!Number.isSafeInteger(page.total))throw new Error('Respuesta de paginación incorrecta');
    expected=page.total;result.push(...page.rows);offset+=page.rows.length;
    if(!page.rows.length&&offset<expected)throw new Error('Exportación incompleta, no se generó cierre');
   }while(offset<expected);
   if(result.length!==expected)throw new Error('Los registros cambiaron mientras se exportaba. Vuelve a intentarlo.');
   return result;
 };
 const closeMonth=async()=>{
  setClosing(true);setError('');
  try{
   if(mode!=='month')throw new Error('Selecciona periodo mensual para generar el cierre');
   const [events,incidents]=await Promise.all([fetchAll<Event>('report-events'),fetchAll<Damage>('report-damages')]);
   const csv=(head:string[],records:unknown[][])=>'\uFEFF'+[head,...records].map(row=>row.map(esc).join(',')).join('\r\n');
   const movements=csv(['ID','Fecha UTC','Operacion','Equipo','Cantidad','Origen','Destino','Posicion','Ticket','Motivo','Tecnico'],events.map(e=>[e.id,e.created_at,label(e),e.equipment_name,e.quantity,e.from_bucket,e.to_bucket,e.position_code,e.reference,e.reason,e.actor]));
   const damageCsv=csv(['ID','Fecha UTC','Equipo','Serial','Falla','Descripcion','Estado','Prioridad','Reportado por','Reparado por','Fecha reparacion'],incidents.map(d=>[d.id,d.created_at,d.equipment_name,d.serial,d.type,d.description,d.status,d.priority,d.reported_by,d.repaired_by,d.repaired_at]));
   const counts={totalMovimientos:events.length,unidadesEntregadas:events.filter(e=>label(e)==='Entrega').reduce((n,e)=>n+e.quantity,0),incidentes:incidents.length,incidentesReparados:incidents.filter(d=>['REPAIRED','RESOLVED','COMPLETED'].includes(d.status.toUpperCase())).length};
   const manifest={formato:'IT-Hub-Cierre-Actividad-v1',periodo:month,desdeUTC:start,hastaExclusivoUTC:end,creadoEnUTC:new Date().toISOString(),conteos:counts,archivos:['movimientos.csv','danos.csv','resumen.json','LEEME.txt'],advertencia:'Exportación de actividad, NO es un respaldo PostgreSQL restaurable.'};
   const zip=makeActivityZip([{name:'movimientos.csv',data:movements},{name:'danos.csv',data:damageCsv},{name:'resumen.json',data:JSON.stringify(manifest,null,2)},{name:'LEEME.txt',data:'Cierre mensual de actividad de IT Operations Hub. Las aperturas de stock no son necesariamente compras. Este ZIP NO sustituye el respaldo completo de PostgreSQL. No borrar registros originales.\n'}]);
   const url=URL.createObjectURL(zip);const a=document.createElement('a');a.href=url;a.download=`IT-Hub-cierre-${month}.zip`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
  }catch(e){setError(e instanceof Error?e.message:'Error al generar cierre mensual')}finally{setClosing(false)}
 };
 const reportMonth=mode==='month'?month:week.slice(0,7);
 const monthCaption=useMemo(()=>{
  const [y,m]=reportMonth.split('-').map(Number);
  const d=new Date(Date.UTC(y,(m||1)-1,1));
  return d.toLocaleDateString('es-DO',{month:'long',year:'numeric',timeZone:'UTC'});
 },[reportMonth]);
 const weekRangeLabel=(weekStart:string)=>{
  const begin=new Date(weekStart+'T00:00:00Z');
  const finish=new Date(begin);
  finish.setUTCDate(finish.getUTCDate()+6);
  const sameMonth=begin.getUTCMonth()===finish.getUTCMonth();
  const monthShort=finish.toLocaleDateString('es-DO',{month:'short',timeZone:'UTC'}).replace('.','');
  const beginMonth=begin.toLocaleDateString('es-DO',{month:'short',timeZone:'UTC'}).replace('.','');
  return sameMonth?`${begin.getUTCDate()} - ${finish.getUTCDate()} ${monthShort}`:`${begin.getUTCDate()} ${beginMonth} - ${finish.getUTCDate()} ${monthShort}`;
 };
 const monthRows=useMemo(()=>{
  const table=new Map<string,{week:string;entregas:number;devoluciones:number;incidencias:number;reemplazos:number}>();
  for(const x of summary?.weeks||[]){
   const row=table.get(x.week)||{week:x.week,entregas:0,devoluciones:0,incidencias:0,reemplazos:0};
   const l=label(x);
   if(l==='Entrega')row.entregas+=x.units;
   else if(l.startsWith('Devolución'))row.devoluciones+=x.units;
   if(/REPLAC/i.test(x.action)||/Reemplazo/i.test(l))row.reemplazos+=x.units;
   table.set(x.week,row);
  }
  for(const d of damages){
   const status=String(d.status||'').toUpperCase();
   if(['CANCELLED','CANCELED'].includes(status))continue;
   const key=monday(new Date(d.created_at));
   const row=table.get(key)||{week:key,entregas:0,devoluciones:0,incidencias:0,reemplazos:0};
   row.incidencias+=1;
   table.set(key,row);
  }
  return [...table.values()].sort((a,b)=>a.week.localeCompare(b.week));
 },[summary,damages]);
 const monthlySummary=useMemo(()=>{
  const uniqueAreas=new Set(recent.map(e=>String(e.position_code||'')).filter(Boolean).map(code=>{const parts=code.split('-');return parts[1]||code;}));
  const uniqueTickets=new Set(recent.map(e=>String(e.reference||'')).filter(Boolean));
  const openDamages=damages.filter(d=>!['REPAIRED','RESOLVED','COMPLETED','CANCELLED','CANCELED'].includes(String(d.status||'').toUpperCase())).length;
  const totalMonth=summary?.metrics.reduce((sum,item)=>sum+item.units,0)||0;
  return {totalMonth,areas:uniqueAreas.size,tickets:uniqueTickets.size,critical:openDamages};
 },[recent,damages,summary]);
 const monthlyCards=[
  {title:'Total del mes',value:monthlySummary.totalMonth,badge:comparison?.monthPrevious==null?null:trend(monthlySummary.totalMonth,comparison.monthPrevious),icon:CalendarDays,accent:'blue'},
  {title:'Áreas impactadas',value:monthlySummary.areas,badge:monthlySummary.areas?`+${monthlySummary.areas}`:'Sin cambios',icon:Package,accent:'indigo'},
  {title:'Tickets asociados',value:monthlySummary.tickets,badge:monthlySummary.tickets?`+${monthlySummary.tickets}`:'Sin cambios',icon:AlertTriangle,accent:'emerald'},
  {title:'Stock crítico',value:monthlySummary.critical,badge:monthlySummary.critical?`+${monthlySummary.critical}`:'Sin cambios',icon:ArrowDownToLine,accent:'amber'},
 ] as const;
 const monthlyChartMax=useMemo(()=>{
  const all=monthRows.flatMap(r=>[r.entregas,r.devoluciones,r.incidencias,r.reemplazos]);
  return Math.max(1,...all);
 },[monthRows]);
 const downloadMonthly=()=>{
  const header=['Semana','Rango','Entregas','Devoluciones','Incidencias','Reemplazos','Mes'];
  const csv='﻿'+[header,...monthRows.map(r=>[r.week,weekRangeLabel(r.week),String(r.entregas),String(r.devoluciones),String(r.incidencias),String(r.reemplazos),reportMonth])].map(r=>r.map(esc).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=`IT-Hub-resumen-mensual-${reportMonth}.csv`;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
 };
 return <div className="-mt-3 p-3 sm:p-4 space-y-3 text-slate-100">
 <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Reportes operativos</h1><p className="text-xs text-slate-400">Datos confirmados de Entregas y Almacén; las aperturas no son compras del período necesariamente.</p></div><div className="flex gap-2"><button className="rounded-lg border border-slate-600 px-3 py-2 text-xs" onClick={()=>setRefresh(v=>v+1)}><RefreshCw className="inline mr-1" size={14}/>Actualizar</button><button disabled={loading||exporting||!!error} className="rounded-lg bg-blue-600 px-3 py-2 text-xs disabled:opacity-40" onClick={()=>void downloadCsv()}><Download className="inline mr-1" size={14}/>{exporting?'Exportando...':'Exportar CSV completo'}</button><button className="rounded-lg border border-slate-600 px-3 py-2 text-xs" onClick={()=>window.print()}><Printer className="inline mr-1" size={14}/>Imprimir / PDF</button></div></div>
 <div className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-400/20 bg-slate-900/60 px-3 py-2"><label className="text-xs">Período<select className="inline-block ml-2 rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5" value={mode} onChange={e=>setMode(e.target.value as 'month'|'week')}><option value="month">Mensual</option><option value="week">Semanal</option></select></label>{mode==='month'?<label className="text-xs">Mes<input className="inline-block ml-2 rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5" type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label>:<label className="text-xs">Inicio de semana<input className="inline-block ml-2 rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5" type="date" value={week} onChange={e=>setWeek(e.target.value)}/></label>}<span className="text-xs text-slate-400 pb-2">{start} — {after(end,-1)} (UTC)</span></div>
 {error&&<div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">{error}</div>}
 <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">{cards.map(c=>{
 const Icon=c.icon;
 const tones:Record<string,string>={cyan:'text-cyan-400 border-cyan-400/35',violet:'text-violet-400 border-violet-400/35',emerald:'text-emerald-400 border-emerald-400/35',amber:'text-amber-400 border-amber-400/35',rose:'text-rose-400 border-rose-400/35',slate:'text-slate-300 border-slate-400/35'};
 const barTone:Record<string,string>={cyan:'bg-cyan-400',violet:'bg-violet-400',emerald:'bg-emerald-400',amber:'bg-amber-400',rose:'bg-rose-400',slate:'bg-slate-400'};
 const prev=c.previous??0,max=Math.max(1,prev,c.value);
 const change=c.previous===null?'Sin comparación':prev===0?(c.value===0?'Sin cambios':'Nueva actividad'):(c.value>prev?'Aumentó':c.value<prev?'Disminuyó':'Sin cambios');
 return <button type="button" key={c.title} aria-expanded={activeCard===c.title} aria-label={`Ver detalle de ${c.title}`} onClick={()=>setActiveCard(v=>v===c.title?null:c.title)} className={'text-left rounded-xl border p-3 transition-colors hover:bg-[#182c50] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 bg-[#10203a] '+tones[c.accent]+(activeCard===c.title?' ring-2 ring-blue-400/70':'')}>
 <div className="flex items-start justify-between gap-2"><Icon size={21}/><span className="text-[10px] text-slate-400">{activeCard===c.title?'Cerrar':'Ver detalle ›'}</span></div>
 <p className="text-xs text-slate-300 mt-2">{c.title}</p><b className="block text-2xl tabular-nums text-white">{loading?'…':error?'—':n(c.value)}</b>
 <div className="mt-3 flex items-end gap-1 h-7" aria-hidden="true"><div title="Período anterior" className="w-1/2 h-full flex items-end"><div className="w-full rounded-t bg-slate-600/70" style={{height:`${c.previous===null?5:Math.max(8,prev/max*100)}%`}}/></div><div title="Período actual" className="w-1/2 h-full flex items-end"><div className={'w-full rounded-t '+barTone[c.accent]} style={{height:`${Math.max(8,c.value/max*100)}%`}}/></div></div>
 <p className="text-[10px] text-slate-300 mt-2">{loading?'Consultando…':trend(c.value,c.previous)}</p>
 <p className="text-[10px] text-slate-500 mt-1">{change} · Anterior: {c.previous===null?'No disponible':n(prev)}</p>
 </button>})}</div>
 {activeCard&&<section className="rounded-xl border border-blue-400/35 bg-[#10203a] p-4" aria-label={`Detalle de ${activeCard}`}><div className="flex items-center justify-between gap-2"><h2 className="font-semibold">Detalle: {activeCard}</h2><button type="button" onClick={()=>setActiveCard(null)} className="text-xs border border-slate-600 rounded-lg px-3 py-1.5">Cerrar detalle</button></div><p className="text-xs text-slate-400 mt-1">Período: {start} — {after(end,-1)} UTC. Se muestran hasta 15 registros recientes; usa Exportar CSV para obtener todos los movimientos.</p><div className="mt-3 space-y-2">{activeCard==='Incidencias' ? (cardDetails as Damage[]).map(d=><div key={d.id} className="flex flex-wrap justify-between gap-2 border-b border-white/10 pb-2 text-xs"><span>{d.equipment_name} · {d.type} · {d.description}</span><span className="text-amber-300">{d.status} · {new Date(d.created_at).toLocaleDateString('es-DO')}</span></div>) : (cardDetails as Event[]).map(e=><div key={e.id} className="flex flex-wrap justify-between gap-2 border-b border-white/10 pb-2 text-xs"><span>{label(e)} · {e.equipment_name} · {n(e.quantity)} un. · {e.position_code||'Sin posición'}</span><span className="text-blue-300">{e.reference||'Sin ticket'} · {new Date(e.created_at).toLocaleDateString('es-DO')}</span></div>)}{cardDetails.length===0&&<p className="text-sm text-slate-400">No hay registros recientes para este indicador. Consulta el historial completo para otros períodos.</p>}</div></section>}
 <div className="grid lg:grid-cols-2 gap-3"><section className="rounded-xl border border-blue-400/25 bg-[#10203a] p-4"><div className="flex flex-wrap items-center justify-between gap-3 mb-3"><div className="flex items-center gap-2"><CalendarDays size={20} className="text-blue-400"/><div><h2 className="font-semibold">Resumen semanal</h2><p className="text-xs text-slate-400">Actividad del {weeklyStart} al {after(weeklyEnd,-1)} (UTC)</p></div></div><button type="button" onClick={downloadWeekly} disabled={loading||!!error||!weeklySummary} className="flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-600/20 px-3 py-2 text-xs font-semibold hover:bg-blue-600/30 disabled:opacity-50"><Download size={14}/> Exportar semanal</button></div><div className="overflow-hidden rounded-lg border border-slate-700/60"><div className="grid grid-cols-[minmax(0,1fr)_72px_70px_minmax(85px,1fr)] gap-3 bg-white/5 px-3 py-2 text-[11px] text-slate-300"><span>Concepto</span><span className="text-right">Cantidad</span><span className="text-right">%</span><span>Cobertura</span></div>{weeklyRows.rows.map(r=><div key={r.name} className="grid grid-cols-[minmax(0,1fr)_72px_70px_minmax(85px,1fr)] items-center gap-3 border-t border-white/5 px-3 py-2 text-xs"><span className="flex min-w-0 items-center gap-2"><i className={'h-2.5 w-2.5 shrink-0 rounded-full '+r.dot}/><span className="truncate">{r.name}</span></span><strong className="text-right tabular-nums">{n(r.value)}</strong><span className="text-right tabular-nums">{weeklyRows.total?Math.round(r.value/weeklyRows.total*100):0}%</span><div className="h-2 overflow-hidden rounded-full bg-slate-700"><div className={'h-full rounded-full '+r.color} style={{width:`${weeklyRows.total?r.value/weeklyRows.total*100:0}%`}}/></div></div>)}<div className="grid grid-cols-[minmax(0,1fr)_72px_70px_minmax(85px,1fr)] items-center gap-3 border-t border-blue-500/30 bg-blue-600/15 px-3 py-3 text-xs font-semibold text-blue-200"><span>Total de actividades</span><span className="text-right tabular-nums">{n(weeklyRows.total)}</span><span className="text-right">{weeklyRows.total?'100%':'0%'}</span><div className="h-2 rounded-full bg-blue-500"/></div></div><p className="mt-2 text-[11px] text-slate-400">Las incidencias proceden de Daños. El total suma categorías de actividad y puede incluir operaciones relacionadas. Los reemplazos solo cuentan si tienen identificación explícita.</p><div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-4">{weeklyRows.rows.map((item,idx)=>{const percentage=weeklyRows.total?Math.round(item.value/weeklyRows.total*100):0;const color=idx===0?'#3b82f6':idx===1?'#10b981':idx===2?'#f59e0b':'#a855f7';const angle=weeklyRows.total?item.value/weeklyRows.total*360:0;return <div key={item.name} className="flex min-w-0 items-center gap-3 rounded-xl border border-blue-400/20 bg-[#101e39] p-2.5"><div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full" style={{background:`conic-gradient(${color} ${angle}deg,#283954 ${angle}deg 360deg)`}}><div className="grid h-[51px] w-[51px] place-content-center rounded-full bg-[#101e39] text-center"><strong className="text-lg">{percentage}%</strong><span className="text-[10px] text-slate-400">{n(item.value)} / {n(weeklyRows.total)}</span></div></div><div className="min-w-0"><p className="text-xs font-semibold leading-snug break-words">{item.name}</p><p className="mt-1 text-[11px] text-slate-400">de las actividades de la semana</p></div></div>})}</div></section><section className="rounded-xl border border-blue-400/25 bg-[#10203a] p-4"><div className="flex flex-wrap items-center justify-between gap-3 mb-3"><div className="flex items-center gap-2"><CalendarDays size={20} className="text-blue-400"/><div><h2 className="font-semibold">Resumen mensual</h2><p className="text-xs text-slate-400">Actividad acumulada por semana · {monthCaption.charAt(0).toUpperCase()+monthCaption.slice(1)}</p></div></div><button type="button" onClick={downloadMonthly} disabled={loading||!!error||!monthRows.length} className="flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-600/20 px-3 py-2 text-xs font-semibold hover:bg-blue-600/30 disabled:opacity-50"><Download size={14}/> Exportar mensual</button></div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{monthlyCards.map(card=>{const Icon=card.icon;const accents:{[k:string]:string}={blue:'border-blue-400/25 bg-blue-500/10 text-blue-300',indigo:'border-indigo-400/25 bg-indigo-500/10 text-indigo-300',emerald:'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',amber:'border-amber-400/25 bg-amber-500/10 text-amber-300'};return <div key={card.title} className="rounded-xl border border-white/10 bg-slate-900/35 p-3"><div className="flex items-start justify-between gap-2"><div className="flex items-center gap-2"><span className={'rounded-lg border px-2 py-1 '+accents[card.accent]}><Icon size={14}/></span><span className="text-xs text-slate-300">{card.title}</span></div>{card.badge&&<span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold '+(card.title==='Stock crítico'&&card.value>0?'bg-red-500/15 text-red-300':card.title==='Total del mes'&&String(card.badge).startsWith('-')?'bg-amber-500/15 text-amber-300':'bg-emerald-500/15 text-emerald-300')}>{card.badge}</span>}</div><strong className="mt-3 block text-2xl tabular-nums text-white">{n(card.value)}</strong></div>})}</div><div className="mt-4 rounded-xl border border-white/10 bg-slate-950/30 p-4"><div className="grid grid-cols-[44px_repeat(auto-fit,minmax(90px,1fr))] gap-3"><div className="flex flex-col justify-between text-[10px] text-slate-500"><span>{n(monthlyChartMax)}</span><span>{n(Math.round(monthlyChartMax*0.66))}</span><span>{n(Math.round(monthlyChartMax*0.33))}</span><span>0</span></div><div className="col-span-1 sm:col-auto grid auto-cols-fr grid-flow-col gap-3 items-end min-h-[180px]">{monthRows.map(row=><div key={row.week} className="flex min-w-[88px] flex-col items-center"><div className="flex h-[160px] w-full items-end justify-center gap-1"><div className="w-3 rounded-t bg-blue-500" style={{height:`${Math.max(row.entregas?12:0,(row.entregas/monthlyChartMax)*100)}%`}} title={`Entregas: ${row.entregas}`}/><div className="w-3 rounded-t bg-emerald-500" style={{height:`${Math.max(row.devoluciones?12:0,(row.devoluciones/monthlyChartMax)*100)}%`}} title={`Devoluciones: ${row.devoluciones}`}/><div className="w-3 rounded-t bg-amber-500" style={{height:`${Math.max(row.incidencias?12:0,(row.incidencias/monthlyChartMax)*100)}%`}} title={`Incidencias: ${row.incidencias}`}/><div className="w-3 rounded-t bg-fuchsia-500" style={{height:`${Math.max(row.reemplazos?12:0,(row.reemplazos/monthlyChartMax)*100)}%`}} title={`Reemplazos: ${row.reemplazos}`}/></div><div className="mt-3 text-center"><p className="text-[11px] font-medium text-slate-200">Semana {monthRows.findIndex(x=>x.week===row.week)+1}</p><p className="text-[10px] text-slate-400">{weekRangeLabel(row.week)}</p></div></div>)}{!monthRows.length&&<div className="flex items-center justify-center text-sm text-slate-400">Sin actividad para graficar.</div>}</div></div><div className="mt-4 flex flex-wrap gap-4 text-[11px] text-slate-300"><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-blue-500"/>Entregas</span><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500"/>Devoluciones</span><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-amber-500"/>Incidencias</span><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-fuchsia-500"/>Reemplazos</span></div></div><p className="mt-2 text-[11px] text-slate-400">Las incidencias provienen del módulo Daños del período visible. Si cambias el rango a semanal, el resumen se adapta a la semana seleccionada pero mantiene el formato mensual de comparación.</p></section></div>
 <section className="rounded-xl border border-violet-400/30 bg-[#10203a] p-4 flex flex-wrap gap-4 items-center justify-between"><div><h2 className="font-semibold">Paquete de cierre mensual</h2><p className="text-xs text-slate-400">Descarga ZIP: movimientos completos, incidencias, resumen y manifiesto del período. No elimina registros.</p></div><button type="button" disabled={mode!=='month'||loading||closing||!!error} onClick={()=>void closeMonth()} className="rounded-lg bg-violet-600 disabled:opacity-40 px-4 py-2 text-sm font-semibold">{closing?'Preparando cierre…':'Descargar cierre mensual ZIP'}</button></section>
 <div className="rounded-xl border border-amber-500/25 p-3 text-xs text-amber-200">El CSV exporta todos los eventos del período, no solamente la tabla visible. La sección de Daños se consulta desde su propio módulo. El ZIP mensual contiene actividad exportada, no un respaldo PostgreSQL restaurable. Para recuperación completa conserva también respaldos de la base de datos.</div>
 </div>;
}
