'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, Boxes, CheckCircle2, ClipboardList, Search, ShieldAlert, Wrench, X, HardDrive, Tag, Monitor, MapPin, Hash, Layers, Info } from 'lucide-react'
import type { EquipmentItem } from '@/context/InventoryContext'

type StatusFilter = '' | 'available' | 'assigned' | 'repair' | 'damaged' | 'retired' | 'returned'
type Props = {
  equipmentData: EquipmentItem[]
  remoteState: 'loading' | 'connected' | 'error'
  remoteError?: string
  initialStatus?: StatusFilter
}
const states: Record<string, string> = {
  available: 'Disponible', assigned: 'En uso', repair: 'En reparación',
  damaged: 'Dañado', retired: 'Retirado', returned: 'Devuelto'
}
const number = (value: number) => new Intl.NumberFormat('es-DO').format(value)
const quantity = (item: EquipmentItem) => Math.max(0, Number(item.quantity) || 0)
const label = (item: EquipmentItem) => [item.brand, item.model].filter(Boolean).join(' ') || item.pcName || `Activo ${item.id}`

export default function StockOverview({ equipmentData, remoteState, remoteError = '', initialStatus = '' }: Props) {
  const [selected, setSelected] = useState<EquipmentItem | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => { setReady(true) }, [])
  useEffect(() => {
    if (!selected) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [selected])
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState<StatusFilter>(initialStatus)
  const [mode, setMode] = useState<'all' | 'grouped'>('all')
  const [page, setPage] = useState(1)
  const total = equipmentData.reduce((sum, item) => sum + quantity(item), 0)
  const available = equipmentData.filter(item => item.status === 'available').reduce((s, e) => s + quantity(e), 0)
  const assigned = equipmentData.filter(item => item.status === 'assigned').reduce((s, e) => s + quantity(e), 0)
  const attention = equipmentData.filter(item => ['damaged', 'repair'].includes(item.status)).reduce((s, e) => s + quantity(e), 0)
  const retired = equipmentData.filter(item => item.status === 'retired').reduce((s, e) => s + quantity(e), 0)
  const uncategorized = equipmentData.filter(item => !item.type || item.type === 'Sin clasificar').length
  const types = useMemo(() => [...new Set(equipmentData.map(item => item.type?.trim() || 'Sin clasificar'))].sort(), [equipmentData])
  const filtered = useMemo(() => equipmentData.filter(item => {
    const category = item.type?.trim() || 'Sin clasificar'
    return (!type || type === category) && (!status || item.status === status) &&
      [item.pcName, item.serial, item.type, item.brand, item.model, String(item.id)]
        .some(v => String(v || '').toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()))
  }), [equipmentData, type, status, search])
  const grouped = useMemo(() => {
    const map = new Map<string, { key: string, category: string, count: number, available: number, assigned: number, attention: number, other: number }>()
    for (const item of filtered) {
      const category = item.type?.trim() || 'Sin clasificar'
      const key = JSON.stringify([category, item.brand || '', item.model || ''])
      const row = map.get(key) || { key, category: `${category} · ${label(item)}`, count: 0, available: 0, assigned: 0, attention: 0, other: 0 }
      const n = quantity(item)
      row.count += n
      if (item.status === 'available') row.available += n
      else if (item.status === 'assigned') row.assigned += n
      else if (['damaged', 'repair'].includes(item.status)) row.attention += n
      else row.other += n
      map.set(key, row)
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.category.localeCompare(b.category))
  }, [filtered])
  const limit = 25
  const rows = mode === 'all' ? filtered.length : grouped.length
  const pages = Math.max(1, Math.ceil(rows / limit))
  const currentPage = Math.min(page, pages)
  const visible = (mode === 'all' ? filtered : grouped).slice((currentPage - 1) * limit, currentPage * limit)
  const clear = () => { setSearch(''); setType(''); setStatus(''); setPage(1) }
  const cards = [
    { title: 'Unidades registradas', value: total, icon: Boxes, color: 'blue' },
    { title: 'Disponibles', value: available, icon: CheckCircle2, color: 'green' },
    { title: 'En uso / asignados', value: assigned, icon: ClipboardList, color: 'violet' },
    { title: 'Dañados / reparación', value: attention, icon: Wrench, color: 'amber' }
  ]
  return <div className="inv-master space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="inv-kicker text-xs font-bold tracking-widest">INVENTARIO MAESTRO</p>
        <h2 className="mt-1 text-xl font-extrabold">Control de existencias</h2>
        <p className="inv-muted mt-1 text-sm">Registro central de equipos. Consulta, filtra y abre cada ficha sin salir de Existencias.</p>
      </div>
      <span className="inv-master-source">{remoteState === 'connected' ? `${number(equipmentData.length)} registros consultados` : remoteState === 'loading' ? 'Cargando API…' : 'API no disponible'}</span>
    </div>
    {remoteState === 'error' && <div className="inv-note rounded-xl p-3 text-sm" role="alert">No se pudo consultar /equipment: {remoteError}. No se muestran ceros como cantidades confirmadas.</div>}
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{cards.map(({ title, value, icon: Icon, color }) =>
      <div key={title} className={`inv-panel inv-master-stat inv-${color}`}><div className="flex items-start justify-between gap-2"><span className="inv-muted text-xs">{title}</span><Icon size={20}/></div>
        <strong className="mt-3 block text-3xl font-extrabold tabular-nums">{remoteState === 'connected' ? number(value) : '—'}</strong><span className="inv-muted mt-1 block text-xs">{title === 'Unidades registradas' ? 'Todos los estados (incluye retirados)' : 'Del inventario registrado'}</span></div>)}</div>
    <div className="inv-v2-brief" aria-label="Indicadores complementarios">
      <span><Tag size={15}/> <strong>{remoteState === 'connected' ? number(types.length) : '—'}</strong> tipos registrados</span>
      <span><Layers size={15}/> <strong>{remoteState === 'connected' ? number(equipmentData.length) : '—'}</strong> fichas individuales</span>
      <span><ShieldAlert size={15}/> <strong>{remoteState === 'connected' ? number(retired) : '—'}</strong> unidades retiradas</span>
      {uncategorized > 0 && <span className="inv-v2-caution"><Info size={15}/> {number(uncategorized)} sin clasificar</span>}
    </div>
    <div className="inv-master-toolbar">
      <div className="inv-master-switch"><button type="button" className={mode === 'all' ? 'is-active' : ''} onClick={() => { setMode('all'); setPage(1) }}>Todos los activos</button><button type="button" className={mode === 'grouped' ? 'is-active' : ''} onClick={() => { setMode('grouped'); setPage(1) }}>Por tipo, marca y modelo</button></div>
      <div className="inv-master-filters"><label className="inv-search flex items-center gap-2"><Search size={16}/><input aria-label="Buscar existencias" placeholder="Nombre, serial, marca, modelo…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}/></label>
        <select aria-label="Filtrar tipo" className="inv-table-select" value={type} onChange={e => { setType(e.target.value); setPage(1) }}><option value="">Todos los tipos</option>{types.map(t => <option key={t}>{t}</option>)}</select>
        <select aria-label="Filtrar estado" className="inv-table-select" value={status} onChange={e => { setStatus(e.target.value as StatusFilter); setPage(1) }}><option value="">Todos los estados</option>{Object.entries(states).map(([key, val]) => <option key={key} value={key}>{val}</option>)}</select>
        {(search || status || type) && <button type="button" className="inv-table-reset" onClick={clear}><X size={14}/> Limpiar</button>}</div>
    </div>
    <div className="inv-master-table overflow-x-auto"><table className="inv-table inv-table-modern inv-v2-table w-full min-w-[1020px] text-left text-xs"><thead><tr>{(mode === 'all' ? ['Activo / identificación','Categoría','Marca / modelo','Serial','Unidades','Estado','Ficha'] : ['Tipo / marca / modelo','Total','Disponibles','Asignados','Dañados / reparación','Otros']).map(h => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
      <tbody>{mode === 'all' ? (visible as EquipmentItem[]).map(item => <tr key={item.id}>
        <td className="px-4 py-3"><div className="inv-v2-identity"><span className="inv-v2-device"><Monitor size={17}/></span><span><strong className="block text-sm">{item.pcName || label(item)}</strong><span className="inv-muted">{`Registro #${item.id}`}</span></span></div></td>
        <td className="px-4 py-3"><span className="inv-table-chip">{item.type || 'Sin clasificar'}</span></td>
        <td className="px-4 py-3"><strong>{label(item)}</strong></td>
        <td className="px-4 py-3 font-mono">{item.serial || 'No registrado'}</td>
        <td className="px-4 py-3 font-bold">{number(quantity(item))}</td>
        <td className="px-4 py-3"><span className={`inv-status status-${item.status}`}>{states[item.status] || item.status}</span></td>
        <td className="px-4 py-3"><button className="inv-v2-detail-button" type="button" title={`Abrir ficha de ${label(item)}`} onClick={() => setSelected(item)}><Info size={15}/> Ver ficha <ArrowRight size={14}/></button></td>
      </tr>) : (visible as typeof grouped).map(row => <tr key={row.key}><td className="px-4 py-3 font-semibold">{row.category}</td><td className="px-4 py-3 font-bold">{number(row.count)}</td><td className="px-4 py-3">{number(row.available)}</td><td className="px-4 py-3">{number(row.assigned)}</td><td className="px-4 py-3">{number(row.attention)}</td><td className="px-4 py-3">{number(row.other)}</td></tr>)}
        {rows === 0 && <tr><td colSpan={mode === 'all' ? 7 : 6} className="inv-muted px-4 py-12 text-center">{remoteState === 'connected' ? 'No hay activos para los filtros seleccionados.' : 'Esperando registros confirmados de la API.'}</td></tr>}</tbody></table></div>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="inv-muted text-xs">{remoteState === 'connected' ? `${number(rows)} resultados · página ${currentPage} de ${pages}` : 'Sin resultados verificados'} · Los retirados siguen visibles para trazabilidad.</p><div className="flex gap-2"><button type="button" className="inv-btn" disabled={currentPage <= 1} onClick={() => setPage(v => v - 1)}>Anterior</button><button type="button" className="inv-btn" disabled={currentPage >= pages} onClick={() => setPage(v => v + 1)}>Siguiente</button></div></div>
    {ready && selected && createPortal(<div className="inv-v2-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null) }} role="presentation">
      <section className="inv-v2-modal" role="dialog" aria-modal="true" aria-label={`Ficha de ${label(selected)}`}>
        <header className="inv-v2-modal-head"><div><p className="inv-kicker text-xs font-bold tracking-widest">FICHA DE ACTIVO · SOLO CONSULTA</p><h2>{selected.pcName || label(selected)}</h2><p>{label(selected)}</p></div><button type="button" onClick={() => setSelected(null)} aria-label="Cerrar detalle"><X size={20}/></button></header>
        <div className="inv-v2-modal-content">
          <div className="inv-v2-modal-highlight"><Monitor size={27}/><div><strong>{selected.pcName || label(selected)}</strong><span>{states[selected.status] || selected.status || 'Estado no registrado'}</span></div><span className="inv-status">{number(quantity(selected))} unidad(es)</span></div>
          <div className="inv-v2-facts">
            {[
              { title: 'Registro interno', value: `#${selected.id}`, icon: Tag },
              { title: 'Serial', value: selected.serial || 'No registrado', icon: Hash },
              { title: 'Tipo / categoría', value: selected.type || 'Sin clasificar', icon: Boxes },
              { title: 'Marca', value: selected.brand || 'No registrada', icon: Layers },
              { title: 'Modelo', value: selected.model || 'No registrado', icon: HardDrive },
              { title: 'Nombre del equipo', value: selected.pcName || 'No registrado', icon: Monitor },
              { title: 'Identificador interno', value: String(selected.id), icon: Info },
              { title: 'Ubicación', value: 'Pendiente de integración', icon: MapPin }
            ].map(({ title, value, icon: Icon }) => <div key={title} className="inv-v2-fact"><Icon size={17}/><div><span>{title}</span><strong>{value}</strong></div></div>)}
          </div>
          <p className="inv-v2-footnote"><ShieldAlert size={16}/> Esta ficha consulta los datos disponibles de /equipment. No inventa ubicación, responsable ni movimientos. Las operaciones se gestionan en sus módulos correspondientes.</p>
        </div>
        <footer className="inv-v2-modal-footer"><button type="button" onClick={() => setSelected(null)}>Cerrar ficha</button></footer>
      </section>
    </div>, document.body)}
    <p className="inv-muted text-xs"><ShieldAlert size={13} className="mr-1 inline"/> Los mínimos de stock y las ubicaciones no se deducen. Este panel es de consulta: altas, bajas y movimientos siguen en sus módulos respectivos.</p>
  </div>
}
