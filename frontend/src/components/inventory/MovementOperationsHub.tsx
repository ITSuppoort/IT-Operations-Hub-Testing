'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Boxes, ClipboardList, ShieldAlert, RefreshCw, ArchiveX, ArrowRightLeft } from 'lucide-react'
import { apiRequest } from '@/lib/api'

type Asset = { id?: number | string; quantity?: number | null; status?: string | null }
type EquipmentMovement = {
  id: string; action: string; createdAt: string; fromLocation?: string | null;
  toLocation?: string | null; createdBy?: string | null;
  equipment?: { pcName?: string | null; assetTag?: string | null; serial?: string | null; brand?: string | null; model?: string | null } | null
}
type StockMovement = {
  id: string; type: string; quantity: number; createdAt: string;
  previousQuantity: number; newQuantity: number; reason?: string | null;
  component?: { type?: string | null; brand?: string | null } | null
}
type ViewState = 'loading' | 'connected' | 'error'
const qty = (a: Asset) => Math.max(0, Number(a.quantity ?? 1) || 0)

export default function MovementOperationsHub() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [state, setState] = useState<ViewState>('loading')
  const [updatedAt, setUpdatedAt] = useState<string>('')
  const [equipmentMovements, setEquipmentMovements] = useState<EquipmentMovement[]>([])
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([])
  const [movementError, setMovementError] = useState<string>('')
  const [movementTab, setMovementTab] = useState<'equipment' | 'stock'>('equipment')
  const [movementSearch, setMovementSearch] = useState('')
  const [movementPage, setMovementPage] = useState(1)

  const reloadMovements = useCallback(async () => {
    const results = await Promise.allSettled([
      apiRequest('/movements'),
      apiRequest('/inventory/movements'),
    ])
    const messages: string[] = []
    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      try {
        if (result.status !== 'fulfilled') throw new Error('Sin conexión')
        if (!result.value.ok) throw new Error(`HTTP ${result.value.status}`)
        const body: unknown = await result.value.json()
        if (!Array.isArray(body)) throw new Error('Respuesta inválida')
        if (i === 0) setEquipmentMovements(body as EquipmentMovement[])
        else setStockMovements(body as StockMovement[])
      } catch (error) {
        messages.push(`${i === 0 ? 'Equipos' : 'Componentes'}: ${error instanceof Error ? error.message : 'Error'}`)
        if (i === 0) setEquipmentMovements([])
        else setStockMovements([])
      }
    }
    setMovementError(messages.join(' · '))
  }, [])

  const reload = useCallback(async () => {
    setState('loading')
    try {
      const response = await apiRequest('/equipment')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data: unknown = await response.json()
      if (!Array.isArray(data)) throw new Error('Formato de respuesta inesperado')
      setAssets(data as Asset[])
      setUpdatedAt(new Date().toLocaleTimeString('es-DO'))
      setState('connected')
    } catch {
      setState('error')
    }
  }, [])
  useEffect(() => { void reload(); void reloadMovements() }, [reload, reloadMovements])

  const total = assets.reduce((sum, a) => sum + qty(a), 0)
  const available = assets.filter(a => String(a.status ?? '').toLowerCase() === 'available').reduce((sum, a) => sum + qty(a), 0)
  const assigned = assets.filter(a => ['assigned', 'in_use', 'in-use'].includes(String(a.status ?? '').toLowerCase())).reduce((sum, a) => sum + qty(a), 0)
  const retired = assets.filter(a => ['retired', 'disposed', 'decommissioned'].includes(String(a.status ?? '').toLowerCase())).reduce((sum, a) => sum + qty(a), 0)

  function goToLegacy(operation: 'entry' | 'exit') {
    const formulario = document.getElementById('it-warehouse-existing-forms')
    if (!formulario) return

    formulario.hidden = false

    const boton = Array.from(formulario.querySelectorAll('button')).find(
      (element) => element.textContent?.trim() === (operation === 'entry' ? 'Entrada' : 'Salida')
    )

    boton?.click()
    formulario.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const display = (n: number) => state === 'connected' ? n.toLocaleString('es-DO') : '—'

  return (
    <div className="mb-5 space-y-5">
      <div className="rounded-2xl border border-blue-400/20 bg-gradient-to-r from-[#0d2041] via-[#111a36] to-[#21183c] p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-[.18em] text-sky-300">Logística y trazabilidad IT</div>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Centro de entradas y salidas</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Consulta el inventario real y accede a las operaciones existentes. Los traslados y descargos definitivos requieren un flujo auditado antes de habilitarse.</p>
          </div>
          <button type="button" onClick={() => { void reload(); void reloadMovements() }} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-slate-100 hover:bg-white/20"><RefreshCw size={14}/> Actualizar datos</button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {label:'Unidades registradas',value:display(total), icon:Boxes, tone:'text-sky-300'},
            {label:'Disponibles',value:display(available),icon:ClipboardList,tone:'text-teal-300'},
            {label:'En uso / asignadas',value:display(assigned),icon:ArrowUpFromLine,tone:'text-violet-300'},
            {label:'Retiradas',value:display(retired),icon:ArchiveX,tone:'text-amber-300'},
          ].map(k => { const Icon = k.icon; return <div key={k.label} className="rounded-xl border border-white/10 bg-[#091429]/65 p-4"><div className="flex items-center justify-between gap-2"><span className="text-xs text-slate-300">{k.label}</span><Icon className={k.tone} size={19}/></div><p className="mt-3 text-3xl font-black tabular-nums">{k.value}</p></div> })}
        </div>
        <p className="mt-3 text-xs text-slate-400" role="status">{state === 'loading' ? 'Consultando /equipment…' : state === 'error' ? 'No se pudo consultar /equipment. No se muestran cantidades inventadas.' : `Datos de /equipment · Actualizado: ${updatedAt} · ${assets.length} registros`}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-emerald-400/25 bg-[#102438] p-5 text-white"><ArrowDownToLine className="text-emerald-300" size={26}/><h3 className="mt-3 text-lg font-bold">Entrada / devolución</h3><p className="mt-1 min-h-[58px] text-xs leading-5 text-slate-300">Recepción y devolución de activos bajo control de IT. Evitar duplicar equipos existentes.</p><button onClick={() => goToLegacy('entry')} type="button" className="mt-4 w-full rounded-xl bg-emerald-500/20 px-3 py-2.5 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30">Ir al formulario existente</button></div>
        <div className="rounded-2xl border border-sky-400/25 bg-[#102438] p-5 text-white"><ArrowUpFromLine className="text-sky-300" size={26}/><h3 className="mt-3 text-lg font-bold">Salida / entrega</h3><p className="mt-1 min-h-[58px] text-xs leading-5 text-slate-300">Entregas desde almacén a producción, reparación o devolución, según las opciones actuales.</p><button onClick={() => goToLegacy('exit')} type="button" className="mt-4 w-full rounded-xl bg-sky-500/20 px-3 py-2.5 text-sm font-semibold text-sky-100 hover:bg-sky-500/30">Ir al formulario existente</button></div>
        <div className="rounded-2xl border border-violet-400/25 bg-[#102438] p-5 text-white"><ArrowRightLeft className="text-violet-300" size={26}/><h3 className="mt-3 text-lg font-bold">Traslado interno</h3><p className="mt-1 min-h-[58px] text-xs leading-5 text-slate-300">Movimiento entre pisos, posiciones o departamentos sin crear un activo nuevo.</p><div className="mt-4 rounded-xl border border-violet-400/20 px-3 py-2.5 text-center text-xs text-violet-200">Pendiente de integración segura</div></div>
        <div className="rounded-2xl border border-amber-400/25 bg-[#102438] p-5 text-white"><ArchiveX className="text-amber-300" size={26}/><h3 className="mt-3 text-lg font-bold">Descargo definitivo</h3><p className="mt-1 min-h-[58px] text-xs leading-5 text-slate-300">Baja por daño irreparable u obsolescencia, con motivo, autorización y trazabilidad.</p><div className="mt-4 rounded-xl border border-amber-400/20 px-3 py-2.5 text-center text-xs text-amber-200">Pendiente de aprobación y auditoría</div></div>
      </div>
      <section className="rounded-2xl border border-sky-400/20 bg-[#0c192e] p-5 text-white sm:p-6" aria-label="Historial persistente">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-widest text-sky-300">Auditoría real</p><h3 className="mt-1 text-xl font-bold">Movimientos registrados en la API</h3><p className="mt-1 text-xs text-slate-400">Solo lectura · no crea ni cambia existencias</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setMovementTab('equipment'); setMovementPage(1) }} className={`rounded-lg px-3 py-2 text-xs font-bold ${movementTab === 'equipment' ? 'bg-sky-500 text-white' : 'border border-white/20 text-slate-300'}`}>Equipos ({equipmentMovements.length})</button>
            <button type="button" onClick={() => { setMovementTab('stock'); setMovementPage(1) }} className={`rounded-lg px-3 py-2 text-xs font-bold ${movementTab === 'stock' ? 'bg-sky-500 text-white' : 'border border-white/20 text-slate-300'}`}>Componentes ({stockMovements.length})</button>
          </div>
        </div>
        {movementError && <p role="alert" className="mt-3 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-200">No fue posible consultar todo el historial: {movementError}</p>}
        <div className="mt-4">
          <input type="search" value={movementSearch} onChange={e => { setMovementSearch(e.target.value); setMovementPage(1) }} placeholder="Buscar equipo, serial, acción, componente..." aria-label="Buscar movimientos" className="w-full rounded-xl border border-white/15 bg-[#071226] px-4 py-3 text-sm text-white outline-none focus:border-sky-400" />
        </div>
        {(() => {
          const term = movementSearch.trim().toLocaleLowerCase()
          const isEquipment = movementTab === 'equipment'
          const items = (isEquipment ? equipmentMovements : stockMovements).filter(m => JSON.stringify(m).toLocaleLowerCase().includes(term))
          const pages = Math.max(1, Math.ceil(items.length / 10))
          const current = Math.min(movementPage, pages)
          const rows = items.slice((current - 1) * 10, current * 10)
          return <>
            <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-white/[.06] text-slate-300"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Activo / componente</th><th className="px-4 py-3">Operación</th><th className="px-4 py-3">Información</th></tr></thead>
                <tbody className="divide-y divide-white/10">
                {rows.map(m => {
                  if (isEquipment) {
                    const x = m as EquipmentMovement
                    const device = x.equipment
                    return <tr key={`e-${x.id}`}><td className="px-4 py-3 text-slate-300">{new Date(x.createdAt).toLocaleString('es-DO')}</td><td className="px-4 py-3"><strong>{device?.pcName || device?.assetTag || device?.serial || 'Equipo'}</strong><span className="block text-slate-400">{device?.brand || ''} {device?.model || ''}</span></td><td className="px-4 py-3 text-sky-300">{x.action}</td><td className="px-4 py-3 text-slate-300">{x.fromLocation || 'Sin origen'} → {x.toLocation || 'Sin destino'}<span className="block text-slate-400">{x.createdBy || 'Responsable no registrado'}</span></td></tr>
                  }
                  const x = m as StockMovement
                  return <tr key={`s-${x.id}`}><td className="px-4 py-3 text-slate-300">{new Date(x.createdAt).toLocaleString('es-DO')}</td><td className="px-4 py-3"><strong>{x.component?.type || 'Componente'}</strong><span className="block text-slate-400">{x.component?.brand || 'Sin marca'}</span></td><td className="px-4 py-3 text-sky-300">{x.type}</td><td className="px-4 py-3 text-slate-300">{x.quantity} ud. · {x.previousQuantity} → {x.newQuantity}<span className="block text-slate-400">{x.reason || 'Sin motivo'}</span></td></tr>
                })}
                {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Sin registros en esta consulta. No se generan movimientos de ejemplo.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-400"><span>{items.length} movimientos · Página {current} de {pages}</span><div className="flex gap-2"><button type="button" disabled={current === 1} onClick={() => setMovementPage(p => Math.max(1, p - 1))} className="rounded-lg border border-white/20 px-3 py-2 disabled:opacity-30">Anterior</button><button type="button" disabled={current >= pages} onClick={() => setMovementPage(p => Math.min(pages, p + 1))} className="rounded-lg border border-white/20 px-3 py-2 disabled:opacity-30">Siguiente</button></div></div>
          </>
        })()}
      </section>
      <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[.07] px-4 py-3 text-xs leading-5 text-slate-200"><ShieldAlert className="mt-0.5 shrink-0 text-amber-300" size={17}/><span>Esta fase es una capa de consulta y navegación. Los formularios antiguos siguen intactos; antes de procesar operaciones reales verificaremos qué se persiste en el backend y qué permanece solo en memoria.</span></div>
    </div>
  )
}
