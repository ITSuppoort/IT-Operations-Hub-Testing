import { Box, Maximize2, MapPin, MousePointer2, Monitor, UserRound, ArrowUpRight } from 'lucide-react'
import type { MapItem } from './MapObject'

type LivePosition = {
  id: string
  code: string
  inventoryPerson?: {firstName: string; lastName: string} | null
  equipment?: {brand?: string; model?: string | null; pcName?: string | null; serial?: string | null; category?: string} | null
}
type Props = {
  selectedItem: MapItem | null
  positions: LivePosition[]
  positionsState: 'loading' | 'ready' | 'error'
  positionsError: string
  selectedPositionId: string | null
  onSelectPosition: (id: string | null) => void
}
export default function MapInspector({selectedItem, positions, positionsState, positionsError, selectedPositionId, onSelectPosition}: Props) {
  const activePosition = positions.find(p=>p.id===selectedPositionId) ?? null
  const occupied = positions.filter(p => !!p.inventoryPerson).length
  const equipped = positions.filter(p => !!p.equipment).length
  return <aside className="w-[300px] shrink-0 overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#10111d]">
    <div className="border-b border-white/[0.07] px-5 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-400">Inspector · Posiciones reales</p>
      <h3 className="mt-1 font-semibold text-white">{selectedItem ? selectedItem.name : 'Información del mapa'}</h3>
    </div>
    {!selectedItem ? <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
      <MousePointer2 size={25} className="text-violet-400" />
      <p className="mt-4 text-sm font-medium text-slate-300">Selecciona un área</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">Haz clic en una oficina o Training Pod para consultar las posiciones vinculadas.</p>
    </div> : <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-2">
        <Info icon={Box} label="Tipo" value={selectedItem.type} />
        <Info icon={Maximize2} label="Tamaño" value={`${Math.round(selectedItem.width)} × ${Math.round(selectedItem.height)}`} />
      </div>
      {positionsState === 'loading' && <p className="text-xs text-slate-400">Cargando posiciones reales…</p>}
      {positionsState === 'error' && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">{positionsError}</p>}
      {positionsState === 'ready' && <>
        <div className="grid grid-cols-3 gap-2">
          <Metric name="Posiciones" count={positions.length}/>
          <Metric name="Con usuario" count={occupied}/>
          <Metric name="Con equipo" count={equipped}/>
        </div>
        {positions.length === 0 ? <p className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-xs text-sky-200">No hay posiciones vinculadas por nombre de área. Los datos no se asignarán automáticamente a este espacio.</p> :
        <div className="max-h-[370px] space-y-2 overflow-y-auto pr-1">
          {positions.map(p=><div key={p.id} className={'rounded-xl border p-3 transition-colors '+(selectedPositionId===p.id?'border-violet-400 bg-violet-500/20':'border-white/10 bg-[#16233a]')}><button type="button" className="mb-2 w-full rounded-lg bg-white/5 px-3 py-2 text-left text-xs font-semibold text-violet-200 transition hover:bg-violet-500/20 active:scale-[.99]" onClick={()=>onSelectPosition(p.id)} aria-pressed={selectedPositionId===p.id}>Seleccionar escritorio · {p.code}</button>
            <div className="flex items-center justify-between gap-2"><strong className="break-all text-xs text-white">{p.code}</strong><span className={'rounded-full px-2 py-0.5 text-[10px] '+(p.inventoryPerson?'bg-emerald-500/10 text-emerald-300':'bg-sky-500/10 text-sky-300')}>{p.inventoryPerson?'Con usuario':'Sin usuario'}</span></div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-300"><UserRound size={13}/>{p.inventoryPerson?`${p.inventoryPerson.firstName} ${p.inventoryPerson.lastName}`:'Sin usuario asignado'}</div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-300"><Monitor size={13}/>{p.equipment?[p.equipment.pcName,p.equipment.brand,p.equipment.model].filter(Boolean).join(' · '):'Sin equipo principal'}</div>
            <a className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-violet-300 hover:text-violet-100" href="/users">Administrar en Usuarios y Posiciones <ArrowUpRight size={12}/></a>
          </div>)}
        </div>}
      </>}
      {activePosition && <div className="rounded-xl border border-violet-400/40 bg-violet-500/10 p-3" role="region" aria-label="Ficha de la posicion seleccionada">
        <div className="mb-2 flex items-center justify-between gap-2"><strong className="text-sm text-white">{activePosition.code}</strong><button type="button" className="text-xs text-violet-200 hover:text-white" onClick={()=>onSelectPosition(null)}>Cerrar</button></div>
        <p className="text-xs text-slate-300">Usuario: {activePosition.inventoryPerson ? `${activePosition.inventoryPerson.firstName} ${activePosition.inventoryPerson.lastName}` : 'Sin usuario'}</p>
        <p className="mt-1 text-xs text-slate-300">Equipo: {activePosition.equipment ? [activePosition.equipment.pcName,activePosition.equipment.brand,activePosition.equipment.model].filter(Boolean).join(' · ') : 'Sin equipo principal'}</p>
        <p className="mt-2 text-[11px] text-slate-400">Consulta informativa; no modifica asignaciones.</p>
        <a href="/users" className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-violet-300 hover:text-violet-100">Administrar posición <ArrowUpRight size={13}/></a>
      </div>}
      <a href="/users" className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-3 text-xs font-semibold text-white transition hover:bg-violet-500 active:scale-[0.98]">Ver todas las posiciones <ArrowUpRight size={14}/></a>
      <p className="text-[11px] text-slate-500">Las posiciones se relacionan por el nombre registrado del área. El plano sigue guardándose solo en este navegador.</p>
    </div>}
  </aside>
}
function Metric({name,count}:{name:string; count:number}) { return <div className="rounded-xl border border-white/10 bg-[#17243b] p-2 text-center"><strong className="text-lg text-white">{count}</strong><p className="text-[10px] text-slate-400">{name}</p></div> }
function Info({icon:Icon,label,value}:{icon:typeof Box; label:string;value:string}) {return <div className="rounded-xl border border-white/10 bg-[#16233a] p-2"><Icon size={14} className="mb-1 text-violet-400"/><p className="text-[10px] text-slate-400">{label}</p><p className="mt-1 break-words text-xs text-white">{value}</p></div>}
