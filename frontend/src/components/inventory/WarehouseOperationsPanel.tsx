'use client'
import { useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, ClipboardList, Boxes, Info } from 'lucide-react'
import EquipmentOperationForm from './EquipmentOperationForm'
import WarehouseMovements from './WarehouseMovements'
import MovementOperationsHub from './MovementOperationsHub'

type Mode = 'entry' | 'exit' | 'history'
export default function WarehouseOperationsPanel({ initialMode = 'entry' }: { initialMode?: 'entry'|'exit' }) {
  const [mode,setMode] = useState<Mode>(initialMode)
  const [bulk,setBulk] = useState(false)
  const tabs = [
    { id:'entry' as const, label:'Entrada', Icon:ArrowDownToLine },
    { id:'exit' as const, label:'Salida', Icon:ArrowUpFromLine },
    { id:'history' as const, label:'Historial', Icon:ClipboardList },
  ]
  return <div className="mt-5 space-y-4">
    <section className="inv-panel p-4 sm:p-6">
      <p className="text-xs font-bold tracking-widest text-cyan-400">GESTIÓN DE ALMACÉN</p>
      <h2 className="mt-2 text-2xl font-extrabold">Operaciones de almacén</h2>
      <p className="inv-muted mt-1 text-sm">Registra equipos que regresan a IT, entregas a producción y consulta los movimientos guardados.</p>
      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Operaciones de almacén">
        {tabs.map(({id,label,Icon})=><button key={id} type="button" role="tab" aria-selected={mode===id}
          onClick={()=>{setMode(id);setBulk(false)}}
          className={'inv-btn '+(mode===id?'inv-primary':'')}><Icon size={17}/>{label}</button>)}
      </div>
    </section>
    {mode==='history' ? <section className="inv-panel p-4 sm:p-5">
      <h3 className="text-lg font-extrabold">Historial de movimientos</h3>
      <p className="inv-muted mt-1 text-xs">Consulta de registros existentes; no genera movimientos de ejemplo.</p>
      <details className="mt-4" open><summary className="cursor-pointer text-sm font-semibold">Ver movimientos y filtros</summary><div className="mt-3"><MovementOperationsHub/></div></details>
    </section> : <>
      <section className="inv-panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="text-lg font-extrabold">{mode==='entry'?'Entrada / devolución a IT':'Salida / entrega a producción'}</h3>
            <p className="inv-muted mt-1 text-xs">{mode==='entry'?'Para devolver un equipo existente al almacén, conservando su identidad.':'Para entregar desde IT un equipo disponible; registra destino y responsable.'}</p></div>
          <button type="button" className="inv-btn text-xs" onClick={()=>setBulk(v=>!v)}><Boxes size={16}/>{bulk?'Usar equipo individual':'Equipos por cantidad / formulario anterior'}</button>
        </div>
        {!bulk ? <div className="mt-4"><EquipmentOperationForm key={mode} initialKind={mode==='entry'?'RETURN':'DELIVER'}/></div> : <div className="mt-4">
          <p className="inv-muted mb-3 flex items-center gap-2 text-xs"><Info size={15}/> Formulario original para cantidades y operaciones existentes. Conservado sin modificaciones.</p>
          <WarehouseMovements/>
        </div>}
      </section>
    </>}
  </div>
}
