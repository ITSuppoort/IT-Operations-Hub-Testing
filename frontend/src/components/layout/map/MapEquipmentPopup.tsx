'use client'

type PositionInfo={
 code:string
 status?:string|null
 inventoryPerson?:{firstName:string;lastName:string}|null
 equipment?:{brand?:string;model?:string|null;pcName?:string|null;serial?:string|null;status?:string|null}|null
}
export function MapEquipmentPopup({roomName,index,position,verified,onClose}:{roomName:string;index:number;position:PositionInfo|null;verified:boolean;onClose:()=>void}){
 const equipment=position?.equipment
 const user=position?.inventoryPerson
 const damaged=Boolean(equipment?.status && /damage|dañad|broken|repair/i.test(equipment.status))
 const status=damaged?'Dañado':equipment?'Equipo vinculado':position?'Sin equipo':'Sin identificar'
 const color=damaged?'text-rose-300 bg-rose-500/15':equipment?'text-sky-200 bg-sky-500/15':'text-slate-300 bg-slate-500/15'
 return <div className="w-[278px] rounded-xl border border-cyan-400/35 bg-[#081326]/95 p-3 text-slate-100 shadow-[0_18px_46px_rgba(0,0,0,.68)] backdrop-blur-xl">
   <div className="flex justify-between gap-3"><div className="min-w-0"><p className="truncate text-[10px] uppercase tracking-wider text-cyan-300">{roomName}</p><p className="text-sm font-semibold">Computadora visual {index}</p></div><button type="button" aria-label="Cerrar detalle" onClick={onClose} className="h-7 w-7 shrink-0 rounded-md bg-white/10 hover:bg-white/20">×</button></div>
   <div className={'mt-2 inline-block rounded-md px-2 py-1 text-[11px] font-semibold '+color}>{status}</div>
   <dl className="mt-2 space-y-1 text-xs">
    <div><dt className="inline text-slate-400">Puesto: </dt><dd className="inline">{position?.code||'Sin vínculo identificado'}</dd></div>
    <div><dt className="inline text-slate-400">PCNAME: </dt><dd className="inline">{equipment?.pcName||'No registrado'}</dd></div>
    <div><dt className="inline text-slate-400">Equipo: </dt><dd className="inline">{equipment?[equipment.brand,equipment.model].filter(Boolean).join(' ')||'Vinculado':'Sin equipo vinculado'}</dd></div>
    <div><dt className="inline text-slate-400">Usuario: </dt><dd className="inline">{user?`${user.firstName} ${user.lastName}`:'Sin usuario asignado'}</dd></div>
   </dl>
   {!verified&&<p className="mt-2 rounded-md border border-amber-400/20 bg-amber-500/10 p-2 text-[10px] leading-relaxed text-amber-100">Ubicación ilustrativa. El orden visual aún no certifica qué equipo físico ocupa este punto.</p>}
 </div>
}
