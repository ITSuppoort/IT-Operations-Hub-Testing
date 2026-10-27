'use client'

import { useMemo, useState } from 'react'
import { Boxes, Laptop, Monitor, Package, Search, Plus, CalendarDays, HardDrive } from 'lucide-react'
import type { EquipmentItem } from '@/context/InventoryContext'
import EquipmentDetailsF1 from './EquipmentDetailsF1'

type Props = {
  items: EquipmentItem[]
  state: 'loading' | 'connected' | 'error'
  onNew: () => void
}

const titleFor = (e: EquipmentItem) => [e.brand, e.model].filter(Boolean).join(' ') || e.pcName || e.type || 'Equipo'
const statusLabels: Record<string, string> = {
  available: 'Disponible', assigned: 'En uso', retired: 'Retirado',
  damaged: 'Dañado', repair: 'En reparación', returned: 'Devuelto'
}
function iconFor(type: string) {
  const t = (type || '').toLowerCase()
  if (t.includes('laptop')) return Laptop
  if (t.includes('desktop') || t.includes('all in one')) return Monitor
  if (t.includes('disco') || t.includes('ssd') || t.includes('hdd')) return HardDrive
  return Package
}

export default function RecentEquipmentPremium({ items, state, onNew }: Props) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [details, setDetails] = useState<EquipmentItem | null>(null)
  const sorted = useMemo(() => [...items].sort((a, b) => {
    const left = a.entryDate ? new Date(a.entryDate).getTime() : 0
    const right = b.entryDate ? new Date(b.entryDate).getTime() : 0
    return (Number.isFinite(right) ? right : 0) - (Number.isFinite(left) ? left : 0)
  }), [items])
  const filtered = sorted.filter(e => [e.pcName,e.serial,e.brand,e.model,e.type].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
  const pages = Math.max(1, Math.ceil(filtered.length / 10))
  const currentPage = Math.min(page, pages)
  const visible = filtered.slice((currentPage - 1) * 10, currentPage * 10)
  return <section className="inv-panel inv-f4-premium overflow-hidden mt-5">
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
      <div className="flex items-center gap-3">
        <span className="inv-f4-logo"><Boxes size={21}/></span>
        <div><h2 className="text-lg font-extrabold">Nuevos equipos</h2><p className="inv-muted mt-1 text-xs">Últimos equipos registrados, sin duplicar el inventario.</p></div>
      </div>
      <button type="button" className="inv-btn inv-primary" onClick={onNew}><Plus size={16}/> Agregar nuevo equipo</button>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 border-y border-white/10 px-4 py-3">
      <label className="inv-search flex items-center gap-2"><Search size={16}/><input aria-label="Buscar equipo recién registrado" placeholder="Buscar PCNAME, serial, marca o modelo..." value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}}/></label>
<span className="inv-muted text-xs">{state==='connected' ? `${filtered.length} equipos` : 'Sin datos confirmados'}</span>
    </div>
    {state !== 'connected' ? <p className="inv-muted px-5 py-8 text-sm">{state==='loading' ? 'Consultando equipos...' : 'No se pudo confirmar el catálogo desde la API.'}</p> : <>
      <div className="overflow-x-auto"><table className="inv-table inv-table-modern w-full min-w-[780px] text-left text-xs">
        <thead><tr>{['PCNAME','Activo','Categoría','Estado','Fecha de entrada','Acciones'].map(h=><th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
        <tbody>{visible.map((e,i)=>{
          const Icon = iconFor(e.type)
          const rawDate = e.entryDate ? new Date(e.entryDate) : null
          const date = rawDate && !Number.isNaN(rawDate.getTime()) ? rawDate.toLocaleDateString('es-DO') : 'No registrada'
          return <tr key={String(e.id)+'-'+i} className="border-t border-white/10">
            <td className="px-4 py-3 font-mono">{e.pcName || 'Sin PCNAME'}</td>
            <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="inv-recent-icon"><Icon size={18}/></span><div><strong className="block">{titleFor(e)}</strong><span className="inv-muted text-[11px]">Serial: {e.serial || 'No registrado'}</span></div></div></td>
            <td className="px-4 py-3"><span className="inv-table-chip">{e.type || 'Sin clasificar'}</span></td>
            <td className="px-4 py-3"><span className={`inv-status status-${e.status}`}>{statusLabels[e.status] || e.status}</span></td>
            <td className="px-4 py-3"><span className="inline-flex items-center gap-2"><CalendarDays size={14}/>{date}</span></td><td className="px-4 py-3"><button type="button" className="inv-btn" onClick={()=>setDetails(e)}>Ver detalles</button></td>
          </tr>
        })}{!visible.length && <tr><td colSpan={6} className="inv-muted px-4 py-12 text-center">No hay equipos para esta búsqueda.</td></tr>}</tbody>
      </table></div>
      <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3"><span className="inv-muted text-xs">{filtered.length} registros · Página {currentPage} de {pages}</span><div className="flex gap-2"><button type="button" className="inv-btn" disabled={currentPage<=1} onClick={()=>setPage(currentPage-1)}>Anterior</button><button type="button" className="inv-btn" disabled={currentPage>=pages} onClick={()=>setPage(currentPage+1)}>Siguiente</button></div></div>
    </>}
    {details&&<EquipmentDetailsF1 pcName={details.pcName} serial={details.serial} onClose={()=>setDetails(null)}/>} 
  </section>
}
