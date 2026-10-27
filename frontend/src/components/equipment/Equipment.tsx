 'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { apiRequest } from '@/lib/api'
import { assetCategories, categoryFields, fieldLabels, requiredFields, type AssetCategory, type AssetField } from './equipmentConfig'
import {
  Activity, ArrowRight, Boxes, Cable, ChevronRight, Download, Database,
  HardDrive, Headphones, Keyboard, Laptop, MapPin, Monitor, Mouse,
  Package, Plus, Printer, Search, ShieldAlert, Warehouse,
  Webcam, Wrench, X, ChevronDown, ChevronUp, PcCase, BatteryCharging, MemoryStick,
  Cpu, PlugZap, EthernetPort, CircuitBoard, Camera, Plug, Server, PackageOpen,
  MonitorSmartphone
} from 'lucide-react'
import type { EquipmentItem, EquipmentStatus } from '@/context/InventoryContext'

type EquipmentForm = Omit<EquipmentItem, 'id' | 'entryDate'>
type ApiEquipment = Record<string, unknown>
type ViewEquipment = EquipmentItem & { locationName: string; rawType: string; amount: number; assetTag: string }
type PositionEquipmentInfo = { equipmentId:string; positionCode:string; locationName:string; assignmentId?:string }
const initialForm: EquipmentForm = {
  category: 'principal', brand: '', model: '', quantity: 1, capacity: '',
  ramGB: null, storageGB: null, pcName: '', serial: '', type: '', user: '',
  condition: 'new', status: 'available',
}
const fmt = (v: number) => new Intl.NumberFormat('es-DO').format(v)
const categoryGroups = [
  { title: 'Equipos principales', subtitle: 'Activos individuales y asignaciones', icon: Monitor, color: 'blue', types: ['Desktop','Laptop','All in One','Monitor','Impresoras','Webcam','Sin clasificar'] },
  { title: 'Periféricos', subtitle: 'Dispositivos de uso diario', icon: Headphones, color: 'rose', types: ['Teclado','Mouse','Headset','Docking Station','UPS','Regleta'] },
  { title: 'Componentes / Consumibles', subtitle: 'Artículos, repuestos y accesorios', icon: Cable, color: 'green', types: ['Cable de red','Cables de video','Cables de poder','SSD','HDD','Memoria RAM','Otros componentes'] },
] as const
const icons: Record<string, typeof Monitor> = {
  Desktop: PcCase, Laptop, 'All in One': MonitorSmartphone, Monitor,
  Impresoras: Printer, Webcam: Camera, 'Sin clasificar': PackageOpen,
  Teclado: Keyboard, Mouse, Headset: Headphones,
  'Docking Station': Server, UPS: BatteryCharging, Regleta: PlugZap,
  'Cable de red': EthernetPort, 'Cables de video': Cable,
  'Cables de poder': Plug, SSD: CircuitBoard, HDD: HardDrive,
  'Memoria RAM': MemoryStick, 'Otros componentes': Cpu,
}
// E4: stickers vectoriales del catálogo (sin depender de imágenes antiguas).
const typeVisuals: Record<string, { shell: string; glow: string; tile: string; img: string; badge: string }> = {
  'Desktop': {
    shell: 'from-sky-950/95 via-[#0f1a2b] to-[#121c31]',
    glow: 'from-cyan-400/20 via-sky-500/12 to-transparent',
    tile: 'bg-gradient-to-br from-sky-500/20 via-[#10192a] to-[#0a1220]',
    img: 'object-contain scale-[1.08] drop-shadow-[0_12px_20px_rgba(0,0,0,.45)]',
    badge: 'border-sky-400/30 bg-sky-500/15 text-sky-200',
  },
  'Laptop': {
    shell: 'from-indigo-950/95 via-[#16193a] to-[#11172b]',
    glow: 'from-violet-400/20 via-fuchsia-500/10 to-transparent',
    tile: 'bg-gradient-to-br from-violet-500/20 via-[#151b33] to-[#0d1223]',
    img: 'object-contain scale-[1.12] drop-shadow-[0_14px_22px_rgba(0,0,0,.5)]',
    badge: 'border-violet-400/30 bg-violet-500/15 text-violet-200',
  },
  'All in One': {
    shell: 'from-cyan-950/95 via-[#111c32] to-[#0e1626]',
    glow: 'from-cyan-300/18 via-sky-500/12 to-transparent',
    tile: 'bg-gradient-to-br from-cyan-400/20 via-[#101c31] to-[#0b1220]',
    img: 'object-contain scale-[1.02] drop-shadow-[0_14px_22px_rgba(0,0,0,.45)]',
    badge: 'border-cyan-400/30 bg-cyan-500/15 text-cyan-200',
  },
  'Monitor': {
    shell: 'from-blue-950/95 via-[#141a31] to-[#0e1626]',
    glow: 'from-blue-300/16 via-cyan-500/10 to-transparent',
    tile: 'bg-gradient-to-br from-blue-400/18 via-[#10192a] to-[#0b1220]',
    img: 'object-contain scale-[1.04] drop-shadow-[0_14px_22px_rgba(0,0,0,.45)]',
    badge: 'border-blue-400/30 bg-blue-500/15 text-blue-200',
  },
  'Impresoras': {
    shell: 'from-slate-900/95 via-[#1d2233] to-[#111827]',
    glow: 'from-slate-200/8 via-cyan-500/10 to-transparent',
    tile: 'bg-gradient-to-br from-slate-200/8 via-[#161f2d] to-[#0b1220]',
    img: 'object-contain scale-[1.07] drop-shadow-[0_14px_22px_rgba(0,0,0,.5)]',
    badge: 'border-slate-300/20 bg-slate-100/10 text-slate-200',
  },
  'Webcam': {
    shell: 'from-[#111827] via-[#1a1933] to-[#0d1223]',
    glow: 'from-fuchsia-300/18 via-violet-500/12 to-transparent',
    tile: 'bg-gradient-to-br from-fuchsia-500/18 via-[#141a31] to-[#0b1220]',
    img: 'object-contain scale-[1.12] drop-shadow-[0_14px_22px_rgba(0,0,0,.5)]',
    badge: 'border-fuchsia-400/30 bg-fuchsia-500/15 text-fuchsia-200',
  },
  'Sin clasificar': {
    shell: 'from-[#18181b] via-[#201a22] to-[#12151f]',
    glow: 'from-amber-300/16 via-orange-500/10 to-transparent',
    tile: 'bg-gradient-to-br from-amber-500/15 via-[#191b29] to-[#0b1220]',
    img: 'object-contain scale-[1.08] drop-shadow-[0_14px_22px_rgba(0,0,0,.45)]',
    badge: 'border-amber-400/30 bg-amber-500/15 text-amber-200',
  },
  'UPS': {
    shell: 'from-slate-950/95 via-[#172132] to-[#101726]',
    glow: 'from-cyan-200/12 via-slate-300/8 to-transparent',
    tile: 'bg-gradient-to-br from-slate-300/10 via-[#131c2b] to-[#0b1220]',
    img: 'object-contain scale-[1.08] drop-shadow-[0_14px_22px_rgba(0,0,0,.5)]',
    badge: 'border-slate-300/20 bg-white/10 text-slate-100',
  },
  'Otros componentes': {
    shell: 'from-slate-950/95 via-[#151c2b] to-[#101726]',
    glow: 'from-violet-300/12 via-cyan-500/8 to-transparent',
    tile: 'bg-gradient-to-br from-slate-400/10 via-[#111929] to-[#0b1220]',
    img: 'object-contain scale-[1.06] drop-shadow-[0_14px_22px_rgba(0,0,0,.45)]',
    badge: 'border-violet-400/20 bg-violet-500/12 text-violet-200',
  },
}

// E6: color de apoyo por categoria, no cambia los datos ni los filtros.
const iconAccents: Record<string, string> = {
  Desktop: '#38bdf8', Laptop: '#a78bfa', 'All in One': '#22d3ee',
  Monitor: '#60a5fa', Impresoras: '#cbd5e1', Webcam: '#f0abfc',
  'Sin clasificar': '#fbbf24', Teclado: '#a78bfa', Mouse: '#a78bfa',
  Headset: '#c4b5fd', 'Docking Station': '#93c5fd', UPS: '#67e8f9',
  Regleta: '#fbbf24', 'Cable de red': '#22d3ee',
  'Cables de video': '#818cf8', 'Cables de poder': '#fb923c',
  SSD: '#38bdf8', HDD: '#94a3b8', 'Memoria RAM': '#34d399',
  'Otros componentes': '#c084fc',
}
const iconStyle = (type: string): CSSProperties => ({
  '--e6-icon-accent': iconAccents[type] || '#38bdf8',
} as CSSProperties)

const statusName: Record<string, EquipmentStatus> = {
  ASSIGNED: 'assigned', ASSIGN: 'assigned', IN_USE: 'assigned',
  ACTIVE: 'available', AVAILABLE: 'available', IN_STOCK: 'available',
  REPAIR: 'repair', IN_REPAIR: 'repair', UNDER_REPAIR: 'repair',
  DAMAGED: 'damaged', BROKEN: 'damaged', RETIRED: 'retired',
  RETURNED: 'returned',
}
const statusLabels: Record<EquipmentStatus, string> = {
  assigned: 'En uso', available: 'En almacén', repair: 'En reparación',
  damaged: 'Dañado', retired: 'Retirado', returned: 'Devuelto',
}
const statusColors: Record<EquipmentStatus, string> = {
  assigned: 'text-emerald-300 bg-emerald-500/10', available: 'text-sky-300 bg-sky-500/10',
  repair: 'text-amber-300 bg-amber-500/10', damaged: 'text-red-300 bg-red-500/10',
  retired: 'text-slate-300 bg-white/5', returned: 'text-slate-300 bg-white/5',
}
function textValue(value: unknown): string { return typeof value === 'string' ? value : '' }
function normalize(item: ApiEquipment): ViewEquipment {
  const raw = textValue(item.status).toUpperCase()
  const condition = textValue(item.condition).toUpperCase()
  const status: EquipmentStatus = raw === 'DAMAGED' || condition === 'DAMAGED' ? 'damaged'
    : raw === 'ACTIVE' && textValue(item.assignedUser).trim() ? 'assigned'
    : statusName[raw] || 'available'
  const itemType = textValue(item.type).trim() || 'Sin clasificar'
  const category = textValue(item.category)
  return {
    id: item.id as unknown as number,
    category: (category === 'principal' || category === 'peripheral' || category === 'component' ? category : 'principal') as AssetCategory,
    brand: textValue(item.brand), model: textValue(item.model),
    quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
    capacity: textValue(item.capacity),
    ramGB: typeof item.ramGB === 'number' ? item.ramGB : null,
    storageGB: typeof item.storageGB === 'number' ? item.storageGB : null,
    pcName: textValue(item.pcName), serial: textValue(item.serial), assetTag: textValue(item.assetTag),
    type: itemType, rawType: itemType,
    user: textValue(item.assignedUser) || textValue(item.user),
    condition: condition === 'DAMAGED' ? 'damaged' : condition === 'USED' ? 'used' : 'new',
    status,
    entryDate: textValue(item.entryDate) || textValue(item.createdAt) || new Date().toISOString(),
    locationName: textValue(item.location) || 'Sin ubicación',
    amount: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
  }
}
function classify(item: ViewEquipment, name: string): boolean {
  if (name === 'Todos los equipos') return true
  if (name === 'Sin clasificar') return item.type === 'Sin clasificar' && !categoryGroups.some(group => group.types.some(t => t !== 'Sin clasificar' && classify(item,t)))
  const type = item.type.toLowerCase()
  if (type !== 'sin clasificar') {
    if (name === 'Cables de video') return ['cables de video','hdmi a hdmi','hdmi a displayport','displayport a displayport','usb-c a hdmi','vga a vga'].includes(type)
    if (name === 'UPS') return ['ups','ups / regleta'].includes(type)
    if (name === 'Regleta') return type === 'regleta'
    return type === name.toLowerCase()
  }
  // Solo inferimos cuando hay información explícita en el modelo, no por la categoría genérica.
  const model = item.model.toLowerCase()
  const nameHints: Record<string, string[]> = {
    Desktop: ['desktop', 'optiplex', 'prodesk', 'thinkcentre'],
    Laptop: ['laptop', 'latitude', 'elitebook', 'thinkpad', 'notebook'],
    Monitor: ['monitor'], Impresoras: ['impresora', 'printer'],
  }
  return (nameHints[name] || []).some(hint => model.includes(hint))
}
export default function Equipment() {
  const router = useRouter()
  // E8: read the theme/language exposed by AppLayout; no duplicate settings.
  const [uiLanguage, setUiLanguage] = useState<'es' | 'en'>('es')
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>('.it-shell[data-it-language]')
    if (!shell) return
    const sync = () => setUiLanguage(shell.getAttribute('data-it-language') === 'en' ? 'en' : 'es')
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(shell, { attributes: true, attributeFilter: ['data-it-language'] })
    return () => observer.disconnect()
  }, [])
  const tr = (es: string, en: string) => uiLanguage === 'en' ? en : es

  const [equipment, setEquipment] = useState<ViewEquipment[]>([])
  const [positionEquipmentInfo, setPositionEquipmentInfo] = useState<PositionEquipmentInfo[]>([])
  const [assignmentError, setAssignmentError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [apiError, setApiError] = useState('')
  const [isNewEquipmentOpen, setIsNewEquipmentOpen] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<ViewEquipment | null>(null)
  // FASE 5D - EDITOR DE ACTIVOS: estado aislado del formulario de alta.
  const [isEditing, setIsEditing] = useState(false)
  const [assetDetailTab, setAssetDetailTab] = useState<'general' | 'components' | 'history'>('general')
  const [editForm, setEditForm] = useState<(EquipmentForm & { assetTag: string }) | null>(null)
  const [editError, setEditError] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [form, setForm] = useState<EquipmentForm>(initialForm)
  const [formError, setFormError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | ''>('')
  const visibleFields = selectedCategory ? categoryFields[selectedCategory] : []
  const [activeType, setActiveType] = useState('Todos los equipos')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAll, setShowAll] = useState(false)
  // IT_ESTACIONES_RESUMEN_V1: oculto al montar y despues de refrescar.
  const [detailOpen, setDetailOpen] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setIsLoading(true)
        const response = await apiRequest('/equipment')
        if (!response.ok) throw new Error(`No fue posible consultar los equipos (${response.status}).`)
        const data: unknown = await response.json()
        if (!cancelled) setEquipment(Array.isArray(data) ? data.map((value: ApiEquipment) => normalize(value)) : [])
        // Contrastar inventario con vínculos REALES a posiciones (principal y accesorios).
        // Nunca sumar requerimientos estimados como existencias.
        const positionResponse = await apiRequest('/equipment/position-usage')
        if (!positionResponse.ok) throw new Error(`No se pudieron verificar asignaciones a posiciones (HTTP ${positionResponse.status}).`)
        const positionData: unknown = await positionResponse.json()
        if (!positionData || typeof positionData !== 'object' || !('equipmentIds' in positionData) || !Array.isArray(positionData.equipmentIds)) throw new Error('Respuesta inválida de posiciones.')
        if (!cancelled) {
          const rawLinks = 'links' in positionData ? positionData.links : undefined
          const positionLinks: PositionEquipmentInfo[] = Array.isArray(rawLinks)
            ? rawLinks.filter((entry):entry is PositionEquipmentInfo => {
                if (!entry || typeof entry !== 'object') return false
                const row = entry as Record<string,unknown>
                return typeof row.equipmentId==='string' && typeof row.positionCode==='string' && typeof row.locationName==='string'
              }) : []
          setPositionEquipmentInfo(positionLinks)
          setAssignmentError('')
        }

      } catch (error) {
        if (!cancelled) setAssignmentError(error instanceof Error ? error.message : 'No se pudo cargar asignaciones')
      } finally { if (!cancelled) setIsLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  const tally = (items: ViewEquipment[]) => items.reduce((sum, item) => sum + item.amount, 0)
  const total = tally(equipment)
  const countStatus = (status: EquipmentStatus) => tally(equipment.filter(e => e.status === status))
  // Una unidad vinculada a una posición cuenta como 'en uso' aunque su estado
  // antiguo en Equipment no se actualizara. Deduplificado por ID.
  // Solo activos que tienen un vínculo de posición verificable en el backend.
  // No confundir estado ASSIGNED con una ubicación de posición; ni una
  // revisión de checklist con entrega física. Una relación = una unidad.
  const assignedEquipment = useMemo(() => {
    if (assignmentError) return []
    const byId = new Map(equipment.map(item => [String(item.id), item]))
    const seen = new Set<string>()
    return positionEquipmentInfo.flatMap(link => {
      const key = link.assignmentId ? `allocation:${link.assignmentId}` : `${link.equipmentId}::${link.positionCode}`
      if (seen.has(key)) return []
      seen.add(key)
      const item = byId.get(link.equipmentId)
      if (!item || ['damaged', 'repair', 'retired'].includes(item.status)) return []
      return [{ ...item, status: 'assigned' as EquipmentStatus,
        locationName: link.locationName || link.positionCode, amount: 1, assignmentKey: key }]
    })
  }, [equipment, positionEquipmentInfo, assignmentError])
  const activeItems = useMemo(() => assignedEquipment.filter(item => classify(item, activeType)), [assignedEquipment, activeType])
  const categoryTotal = tally(activeItems)
  const unclassified = equipment.filter(item => classify(item, 'Sin clasificar')).length
  const locations = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of activeItems) counts.set(item.locationName, (counts.get(item.locationName) || 0) + item.amount)
    return [...counts].sort((a,b) => b[1]-a[1]).slice(0,7)
  }, [activeItems])
  const brands = useMemo(() => {
    const counts = new Map<string,number>()
    for (const item of activeItems) {
      const brand = item.brand.trim() || 'Sin marca'
      counts.set(brand, (counts.get(brand) || 0) + item.amount)
    }
    return [...counts].sort((a,b) => b[1]-a[1]).slice(0,5)
  }, [activeItems])
  const visibleRows = activeItems.filter(item => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false
    const search = query.toLowerCase().trim()
    return !search || [item.brand,item.pcName,item.serial,item.model,item.user,item.locationName].some(s => s.toLowerCase().includes(search))
  })
  const rows = showAll ? visibleRows : visibleRows.slice(0, 7)
  const toggleGroup = (name: string) => setCollapsedGroups(previous => previous.includes(name) ? previous.filter(value => value !== name) : [...previous, name])

  const handleRegisterEquipment = async () => {
    if (!selectedCategory || !form.type) { setFormError('Selecciona una categoría y un tipo de activo.'); return }
    const missing = requiredFields[selectedCategory].filter(field => {
      const value = form[field]
      return field === 'quantity' ? !Number.isInteger(Number(value)) || Number(value) < 1 : !String(value ?? '').trim()
    })
    if (missing.length) { setFormError(`Completa los campos obligatorios: ${missing.map(f => fieldLabels[f]).join(', ')}.`); return }
    if (form.serial.trim() && equipment.some(e => e.serial?.toLowerCase() === form.serial.trim().toLowerCase())) {
      setFormError('Ya existe un activo con ese número de serie.'); return
    }
    try {
      setFormError('')
      const payload = {
        category: selectedCategory, brand: form.brand.trim() || 'Sin marca',
        model: form.model.trim() || null, serial: form.serial.trim() || null,
        type: form.type.trim(), pcName: form.pcName.trim() || null, quantity: Number(form.quantity),
        condition: form.condition === 'damaged' ? 'DAMAGED' : form.condition === 'used' ? 'USED' : 'NEW',
        status: ({ available:'ACTIVE',assigned:'ASSIGNED',repair:'REPAIR',damaged:'DAMAGED',retired:'RETIRED',returned:'ACTIVE' } as Record<EquipmentStatus,string>)[form.status],
        location: null, assignedUser: form.user.trim() || null,
        // No alterar category ni model para encubrir el tipo.
      }
      const response = await apiRequest('/equipment', { method:'POST', body:JSON.stringify(payload) })
      if (!response.ok) {
        const message = await response.json().catch(() => null) as { message?: string } | null
        throw new Error(message?.message || 'No se pudo registrar el activo')
      }
      const created: ApiEquipment = await response.json()
      setEquipment(current => [normalize(created), ...current])
      setForm(initialForm); setSelectedCategory(''); setIsNewEquipmentOpen(false)
    } catch(error) { setFormError(error instanceof Error ? error.message : 'Error al guardar') }
  }

  // FASE 5D - EDITOR DE ACTIVOS. No borra registros ni modifica relaciones.
  const startEdit = () => {
    if (!selectedEquipment) return
    setEditForm({
      category: selectedEquipment.category, type: selectedEquipment.type === 'Sin clasificar' ? '' : selectedEquipment.type,
      brand: selectedEquipment.brand, model: selectedEquipment.model,
      pcName: selectedEquipment.pcName, serial: selectedEquipment.serial,
      assetTag: selectedEquipment.assetTag, quantity: selectedEquipment.quantity,
      capacity: selectedEquipment.capacity, ramGB: selectedEquipment.ramGB,
      storageGB: selectedEquipment.storageGB, user: selectedEquipment.user,
      condition: selectedEquipment.condition, status: selectedEquipment.status,
    })
    setEditError('')
    setIsEditing(true)
  }

  const saveEdit = async () => {
    if (!selectedEquipment || !editForm || isSavingEdit) return
    const category = editForm.category
    if (!editForm.type.trim() || !assetCategories[category]?.types.some(value => value === editForm.type)) {
      setEditError('Selecciona un tipo válido para la categorÃ­a.'); return
    }
    if (!editForm.brand.trim()) { setEditError('La marca es obligatoria.'); return }
    if (!Number.isSafeInteger(Number(editForm.quantity)) || Number(editForm.quantity) < 1) {
      setEditError('La cantidad debe ser un número entero mayor que cero.'); return
    }
    if (editForm.serial.trim() && equipment.some(item => String(item.id) !== String(selectedEquipment.id) && item.serial.toLowerCase() === editForm.serial.trim().toLowerCase())) {
      setEditError('Ese número de serie ya está registrado.'); return
    }
    if (editForm.assetTag.trim() && equipment.some(item => String(item.id) !== String(selectedEquipment.id) && item.assetTag.toLowerCase() === editForm.assetTag.trim().toLowerCase())) {
      setEditError('Ese cÃ³digo de activo ya está registrado.'); return
    }
    const toGB = (value: number | null) => value === null || value === undefined || value === 0 ? null : Number(value)
    if ([toGB(editForm.ramGB), toGB(editForm.storageGB)].some(value => value !== null && (!Number.isSafeInteger(value) || value < 0))) {
      setEditError('La memoria y el almacenamiento deben ser valores válidos.'); return
    }
    setIsSavingEdit(true)
    setEditError('')
    try {
      const payload = {
        category, type: editForm.type.trim(), brand: editForm.brand.trim(), model: editForm.model.trim() || null,
        pcName: editForm.pcName.trim() || null, serial: editForm.serial.trim() || null,
        assetTag: editForm.assetTag.trim() || null, quantity: Number(editForm.quantity),
        ramGB: toGB(editForm.ramGB), storageGB: toGB(editForm.storageGB),
        condition: editForm.condition === 'damaged' ? 'DAMAGED' : editForm.condition === 'used' ? 'USED' : 'NEW',
        status: ({ available:'ACTIVE', assigned:'ASSIGNED', repair:'REPAIR', damaged:'DAMAGED', retired:'RETIRED', returned:'ACTIVE' } as Record<EquipmentStatus,string>)[editForm.status],
        assignedUser: editForm.user.trim() || null,
      }
      const response = await apiRequest(`/equipment/${encodeURIComponent(String(selectedEquipment.id))}`, { method: 'PUT', body: JSON.stringify(payload) })
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { message?: string } | null
        throw new Error(result?.message || `No se pudo actualizar el activo (${response.status}).`)
      }
      const updated = normalize(await response.json() as ApiEquipment)
      setEquipment(current => current.map(item => String(item.id) === String(updated.id) ? updated : item))
      setSelectedEquipment(updated)
      setIsEditing(false)
      setEditForm(null)
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'No se pudo actualizar el activo.')
    } finally {
      setIsSavingEdit(false)
    }
  }
  function exportCsv() {
    const headers = ['PC Name','Serial','Marca','Modelo','Tipo','Usuario','Ubicación','Estado','Cantidad','Fecha entrada']
    const csv = [headers,...visibleRows.filter(e=>e.status==='assigned').map(e=>[e.pcName,e.serial,e.brand,e.model,e.type,e.user,e.locationName,statusLabels[e.status],String(e.amount),e.entryDate])]
      .map(row=>row.map(val=>`"${String(val ?? '').replace(/"/g,'""')}"`).join(',')).join('\r\n')
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'})
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href=url; link.download='equipos-en-uso-'+activeType.toLowerCase().replace(/\s/g,'-')+'.csv'; link.click()
    URL.revokeObjectURL(url)
  }
  const activeIcon = icons[activeType] || Package
  const ActiveIcon = activeIcon
  const palette=['#327ffc','#8b43f8','#23c688','#f59e0b','#8896b3']
  const donutStops = brands.reduce<{start:number;value:number;color:string}[]>((acc, brand, index) => {
    const start = acc.length ? acc[acc.length-1].start + acc[acc.length-1].value : 0
    acc.push({start,value: categoryTotal ? brand[1] / categoryTotal * 100 : 0,color:palette[index%palette.length]})
    return acc
  }, [])
  const donut = donutStops.length ? `conic-gradient(${donutStops.map(s=>`${s.color} ${s.start}% ${s.start+s.value}%`).join(',')}, #172034 ${donutStops[donutStops.length-1].start+donutStops[donutStops.length-1].value}% 100%)` : 'conic-gradient(#26324a 0 100%)'
  const small = 'rounded-xl border border-white/[.085] bg-[#151e30]'
  return (
    <div className="it-equipment-executive min-h-full bg-[#0a1220] p-4 text-slate-100 sm:p-6 lg:p-7">
      <style>{`
.it-e2-summary-card{background:linear-gradient(145deg,#132644,#0c1930);border-color:rgba(78,154,228,.32);box-shadow:inset 0 1px rgba(255,255,255,.05),0 10px 28px rgba(2,8,23,.25);transition:transform .18s ease,box-shadow .18s ease}
.it-e2-summary-card:hover{transform:translateY(-2px);box-shadow:inset 0 1px rgba(255,255,255,.08),0 14px 28px rgba(8,31,67,.28)}
.it-e2-summary-icon{border-color:currentColor;background:rgba(13,27,51,.8)}
.it-e2-summary-cyan .it-e2-summary-icon{color:#38bdf8;box-shadow:0 0 16px rgba(56,189,248,.16)}
.it-e2-summary-purple .it-e2-summary-icon{color:#c084fc;box-shadow:0 0 16px rgba(192,132,252,.16)}
.it-e2-summary-blue .it-e2-summary-icon{color:#60a5fa;box-shadow:0 0 16px rgba(96,165,250,.16)}
.it-e2-summary-amber .it-e2-summary-icon{color:#fbbf24;box-shadow:0 0 16px rgba(251,191,36,.16)}

/* E6 - Tarjetas operativas: iconografia legible y temas coherentes. */
.it-equipment-executive .it-e6-card {
  --e6-selected: var(--it-accent, #8257f5);
  background: linear-gradient(135deg, rgba(29,48,76,.92), rgba(14,26,45,.94));
  border-color: rgba(114,151,206,.22);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.035), 0 7px 18px rgba(0,0,0,.10);
  color: #f3f7ff;
}
.it-equipment-executive .it-e6-card:hover {
  border-color: color-mix(in srgb, var(--it-accent, #8257f5) 50%, rgba(255,255,255,.2));
  box-shadow: 0 12px 24px rgba(0,0,0,.23), 0 0 0 1px color-mix(in srgb,var(--it-accent,#8257f5) 20%, transparent);
  transform: translateY(-2px);
}
.it-equipment-executive .it-e6-card-active {
  border-color: color-mix(in srgb, var(--it-accent, #8257f5) 65%, transparent);
  background: linear-gradient(135deg, color-mix(in srgb,var(--it-accent,#8257f5) 15%,#172842), #111f36);
}
.it-equipment-executive .it-e6-icon {
  color: var(--e6-icon-accent, #38bdf8);
  border-color: color-mix(in srgb,var(--e6-icon-accent,#38bdf8) 40%, transparent);
  background: radial-gradient(circle at 35% 25%,color-mix(in srgb,var(--e6-icon-accent,#38bdf8) 25%, transparent),transparent 75%), #15233d;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.1),0 4px 12px rgba(0,0,0,.2);
}
.it-equipment-executive .it-e6-card-title,.it-equipment-executive .it-e6-card-value { color:#f7faff; }
.it-equipment-executive .it-e6-card-note,.it-equipment-executive .it-e6-arrow { color:#a8b8d2; }
.it-equipment-executive .it-e6-divider { border-color:rgba(162,187,225,.12); }
.it-equipment-executive .it-e6-card-state { color:#a8b8d2; }
.it-equipment-executive .it-e6-assigned { color:#5ee6bd; }
/* Aplica sobre el contenedor de la pagina; respeta las opciones de tema ya presentes. */
:root[data-theme="light"] .it-equipment-executive,
html.light .it-equipment-executive,
body.light .it-equipment-executive,
[data-theme="light"] .it-equipment-executive {
  color:#18283e;
  background: radial-gradient(ellipse at 80% 0%, rgba(110,158,232,.10), transparent 55%), #f1f5fb;
}
:root[data-theme="light"] .it-equipment-executive .it-e2-group,
html.light .it-equipment-executive .it-e2-group,
body.light .it-equipment-executive .it-e2-group,
[data-theme="light"] .it-equipment-executive .it-e2-group {
  color:#1c2b44;
  background:linear-gradient(150deg,#fff,#f6f9fe);
  border-color:#cbd8eb;
  box-shadow:0 8px 22px rgba(36,63,105,.08);
}
:root[data-theme="light"] .it-equipment-executive .it-e6-card,
html.light .it-equipment-executive .it-e6-card,
body.light .it-equipment-executive .it-e6-card,
[data-theme="light"] .it-equipment-executive .it-e6-card {
  color:#15243c;
  background:linear-gradient(140deg,#fff,#f1f6ff);
  border-color:#d0dded;
  box-shadow:inset 0 1px 0 #fff,0 5px 14px rgba(40,70,112,.09);
}
:root[data-theme="light"] .it-equipment-executive .it-e6-card-active,
html.light .it-equipment-executive .it-e6-card-active,
body.light .it-equipment-executive .it-e6-card-active,
[data-theme="light"] .it-equipment-executive .it-e6-card-active {
  background:linear-gradient(135deg,color-mix(in srgb,var(--it-accent,#8257f5) 10%,white),#fff);
  border-color:color-mix(in srgb,var(--it-accent,#8257f5) 48%, #cbd8eb);
}
:root[data-theme="light"] .it-equipment-executive .it-e6-icon,
html.light .it-equipment-executive .it-e6-icon,
body.light .it-equipment-executive .it-e6-icon,
[data-theme="light"] .it-equipment-executive .it-e6-icon {
  background:color-mix(in srgb,var(--e6-icon-accent,#38bdf8) 12%,white);
  border-color:color-mix(in srgb,var(--e6-icon-accent,#38bdf8) 26%,#d7e2f0);
  box-shadow:inset 0 1px 0 white,0 3px 9px rgba(48,74,110,.11);
}
:root[data-theme="light"] .it-equipment-executive .it-e6-card-title,
:root[data-theme="light"] .it-equipment-executive .it-e6-card-value,
html.light .it-equipment-executive .it-e6-card-title,
html.light .it-equipment-executive .it-e6-card-value,
body.light .it-equipment-executive .it-e6-card-title,
body.light .it-equipment-executive .it-e6-card-value,
[data-theme="light"] .it-equipment-executive .it-e6-card-title,
[data-theme="light"] .it-equipment-executive .it-e6-card-value { color:#16253d; }
:root[data-theme="light"] .it-equipment-executive .it-e6-card-note,
:root[data-theme="light"] .it-equipment-executive .it-e6-card-state,
:root[data-theme="light"] .it-equipment-executive .it-e6-arrow,
html.light .it-equipment-executive .it-e6-card-note,
html.light .it-equipment-executive .it-e6-card-state,
html.light .it-equipment-executive .it-e6-arrow,
body.light .it-equipment-executive .it-e6-card-note,
body.light .it-equipment-executive .it-e6-card-state,
body.light .it-equipment-executive .it-e6-arrow,
[data-theme="light"] .it-equipment-executive .it-e6-card-note,
[data-theme="light"] .it-equipment-executive .it-e6-card-state,
[data-theme="light"] .it-equipment-executive .it-e6-arrow { color:#59708d; }
:root[data-theme="light"] .it-equipment-executive .it-e6-assigned,
html.light .it-equipment-executive .it-e6-assigned,
body.light .it-equipment-executive .it-e6-assigned,
[data-theme="light"] .it-equipment-executive .it-e6-assigned { color:#077b59; }
:root[data-theme="light"] .it-equipment-executive .it-e6-divider,
html.light .it-equipment-executive .it-e6-divider,
body.light .it-equipment-executive .it-e6-divider,
[data-theme="light"] .it-equipment-executive .it-e6-divider { border-color:#d8e3f0; }
@media (prefers-reduced-motion: reduce) {
 .it-equipment-executive .it-e6-card { transition:none; }
 .it-equipment-executive .it-e6-card:hover { transform:none; }
}

/* E8: actual AppLayout scope is [data-it-theme], not [data-theme]. */
[data-it-theme='light'] .it-equipment-executive {
 color:#1b2b43 !important;
 background: radial-gradient(ellipse at 90% 0%, rgba(93,146,231,.09), transparent 56%),#eef3fb !important;
}
[data-it-theme='light'] .it-equipment-executive .it-e2-group,
[data-it-theme='light'] .it-equipment-executive .it-e2-summary,
[data-it-theme='light'] .it-equipment-executive #equipos-detalle {
 color:#172b45 !important;
 background:#ffffff !important;
 border-color:#cfdbed !important;
 box-shadow:0 8px 26px rgba(36,72,120,.065);
}
[data-it-theme='light'] .it-equipment-executive .it-e6-card {
 color:#14263f !important;
 background:linear-gradient(140deg,#ffffff,#f3f7fd) !important;
 border-color:#cbd9eb !important;
}
[data-it-theme='light'] .it-equipment-executive .it-e6-card-active {
 border-color:var(--it-accent,#8257f5) !important;
 background:color-mix(in srgb, var(--it-accent,#8257f5) 8%, white) !important;
}
[data-it-theme='light'] .it-equipment-executive .it-e6-card-title,
[data-it-theme='light'] .it-equipment-executive .it-e6-card-value { color:#14263f !important; }
[data-it-theme='light'] .it-equipment-executive .it-e6-card-note,
[data-it-theme='light'] .it-equipment-executive .it-e6-card-state,
[data-it-theme='light'] .it-equipment-executive .it-e6-arrow { color:#4f6683 !important; }
[data-it-theme='light'] .it-equipment-executive .it-e6-divider { border-color:#d6e2f0 !important; }
[data-it-theme='light'] .it-equipment-executive .it-e6-assigned { color:#087b59 !important; }
[data-it-theme='light'] .it-equipment-executive .it-e6-icon {
 background:color-mix(in srgb,var(--e6-icon-accent,#38bdf8) 10%,white) !important;
 border-color:color-mix(in srgb,var(--e6-icon-accent,#38bdf8) 30%,#d5e1ef) !important;
}
/* Handle fixed-color Tailwind utility declarations inside equipment only. */
[data-it-theme='light'] .it-equipment-executive .text-white,
[data-it-theme='light'] .it-equipment-executive .text-slate-100,
[data-it-theme='light'] .it-equipment-executive .text-slate-200 { color:#172b45 !important; }
[data-it-theme='light'] .it-equipment-executive .text-slate-300,
[data-it-theme='light'] .it-equipment-executive .text-slate-400,
[data-it-theme='light'] .it-equipment-executive .text-slate-500 { color:#536b8a !important; }
[data-it-theme='light'] .it-equipment-executive .text-sky-300,
[data-it-theme='light'] .it-equipment-executive .text-cyan-300 { color:#087998 !important; }
[data-it-theme='light'] .it-equipment-executive [class*='bg-[#'],
[data-it-theme='light'] .it-equipment-executive [class*='bg-gradient-to-'] {
 background-color:#f7faff;
}
[data-it-theme='light'] .it-equipment-executive #equipos-detalle > div:first-child {
 background:linear-gradient(90deg,color-mix(in srgb,var(--it-accent,#8257f5) 10%,white),#f1f6fe) !important;
}
[data-it-theme='light'] .it-equipment-executive #equipos-detalle [class*='bg-[#'],
[data-it-theme='light'] .it-equipment-executive #equipos-detalle [class*='bg-white/'] {
 background:#f7faff !important; border-color:#d6e1ef;
}
[data-it-theme='light'] .it-equipment-executive input,
[data-it-theme='light'] .it-equipment-executive select { background:#fff !important;color:#14263f !important;border-color:#cbd8e8 !important; }
[data-it-theme='light'] .it-equipment-executive .it-e2-summary > div,
[data-it-theme='light'] .it-equipment-executive .it-e2-summary > button {background-color:transparent;}
/* E8 accent control: highlight selected card and clickable focus rings. */
.it-equipment-executive button:focus-visible,
.it-equipment-executive input:focus-visible,
.it-equipment-executive select:focus-visible {outline:2px solid var(--it-accent,#8257f5);outline-offset:2px;}


[data-it-theme='light'] .it-e102-dialog aside {background:#f5f9ff !important;color:#153055 !important;}
[data-it-theme='light'] .it-e102-dialog aside .text-violet-200 {color:#7041c3 !important;}
/* E10 asset detail modal: dark/light parity without touching global layout. */
[data-it-theme='light'] .it-e10-dialog {background:#ffffff !important;color:#122540 !important;border-color:#cbd9ec !important;box-shadow:0 26px 85px rgba(25,49,95,.19) !important;}
[data-it-theme='light'] .it-e10-dialog .text-slate-400 {color:#5c6f8d !important;}
[data-it-theme='light'] .it-e10-dialog .text-slate-500 {color:#697b98 !important;}
[data-it-theme='light'] .it-e10-dialog .border-white\/10,[data-it-theme='light'] .it-e10-dialog .border-white\/\[\.07\] {border-color:#e3eaf4 !important;}
[data-it-theme='light'] .it-e10-dialog .it-e10-part {background:#f5f8fd !important;border-color:#dce6f3 !important;}
[data-it-theme='light'] .it-e10-dialog .it-e10-tab:not(.it-e10-tab-active) {color:#5c6f8d !important;}
[data-it-theme='light'] .it-e10-dialog .it-e10-tab-active {background:#e7f4ff !important;color:#115582 !important;}
[data-it-theme='light'] .it-e10-dialog .it-e10-hero-icon {background:#e5f6ff !important;color:#0783ac !important;}
[data-it-theme='light'] .it-e10-dialog .it-e10-note {color:#6b5430 !important;background:#fff9e9 !important;}
[data-it-theme='light'] .it-e10-dialog .it-e10-edit {color:#186ca8 !important;border-color:#b5d6ed !important;}
[data-it-theme='light'] .it-e10-dialog .it-e10-close:hover {color:#162a46 !important;background:#f2f5fb !important;}
`}</style>
      <div className="it-e2-heading mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0"><p className="mb-1 text-[11px] font-medium tracking-widest text-sky-300">IT ASSET MANAGEMENT · EQUIPOS EN USO</p><h1 className="text-2xl font-extrabold tracking-tight">{tr('Equipos en uso', 'Equipment in use')}</h1><p className="mt-1 text-xs text-slate-400">{tr('Activos operativos, periféricos y necesidades tecnológicas.', 'Operating assets, peripherals and technology needs.')}</p></div>
        <button type="button" onClick={exportCsv} title="Exportar solamente activos en uso de la categoría seleccionada" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm transition hover:border-sky-400/50 hover:bg-white/10"><Download size={16}/> {tr('Exportar equipos en uso', 'Export equipment in use')}</button>
      </div>
      {apiError && <div role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{apiError}</div>}
      {assignmentError && <div role="alert" className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">No se pudieron verificar los equipos vinculados a posiciones: {assignmentError}. Los contadores pueden estar incompletos.</div>}
      <p className="mb-2 rounded-xl border border-cyan-400/20 bg-[#111e32] px-4 py-3 text-xs text-slate-300">
        <span className="font-semibold text-cyan-200">Equipos realmente vinculados a posiciones.</span>{' '}
        Los totales de abajo se calculan solo con relaciones registradas en el backend.
        No incluyen demandas teóricas, checklist de revisión ni equipos en uso sin posición.
        {isLoading ? ' Consultando vínculos…' : assignmentError ? ' No fue posible validar vínculos.' : ` ${fmt(assignedEquipment.length)} vínculo(s) verificado(s).`}
      </p>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {([
          { label:tr('Registrados','Registered'), count:total, Icon:Database, glow:'cyan', note:tr('Total de fichas','Total asset records') },
          { label:tr('Disponibles','Available'), count:Math.max(0,tally(equipment.filter(item=>item.status==='available'))-assignedEquipment.filter(item=>item.status==='assigned' && equipment.some(origin=>String(origin.id)===String(item.id)&&origin.status==='available')).length), Icon:Package, glow:'purple', note:tr('Estado de fichas, sin saldos de Almacén','Record status, not warehouse stock') },
          { label:tr('En uso','In use'), count:assignedEquipment.length, Icon:Monitor, glow:'blue', note:tr('Vínculos confirmados a posiciones','Verified position links') },
          { label:tr('Otros estados','Other statuses'), count:tally(equipment.filter(item=>['damaged','repair','retired'].includes(item.status))), Icon:Boxes, glow:'amber', note:tr('Dañados, reparación y retirados','Damaged, repair and retired') }
        ]).map(card=>{
          const CardIcon=card.Icon
          return <div key={card.label} className={`it-e2-summary-card it-e2-summary-${card.glow} rounded-2xl border p-4`}>
            <div className="flex items-center gap-3">
              <span className="it-e2-summary-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"><CardIcon size={21}/></span>
              <div className="min-w-0"><p className="text-xs text-slate-300">{card.label}</p><strong className="block text-2xl font-extrabold tabular-nums text-white">{isLoading || (card.glow==='blue' && assignmentError) ? '—' : fmt(card.count)}</strong></div>
            </div>
            <p className="mt-2 text-[10px] text-slate-400">{card.note}</p>
          </div>
        })}
      </div>
      <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-3">
        {categoryGroups.map(group=>{
          const GroupIcon=group.icon
          return <section key={group.title} className={`${small} it-e2-group min-w-0 p-3`}>
            <div className="mb-2 flex items-center gap-2 border-b border-white/5 px-1 pb-2"><span className="rounded-xl bg-violet-500/10 p-3 text-violet-400"><GroupIcon size={22}/></span><div className="min-w-0 flex-1"><h2 className="font-bold">{group.title === 'Equipos principales' ? tr(group.title, 'Main equipment') : group.title === 'Periféricos' ? tr(group.title, 'Peripherals') : tr(group.title, 'Components / Supplies')}</h2><p className="text-[11px] text-slate-400">{group.title === 'Equipos principales' ? tr(group.subtitle, 'Individual assets and assignments') : group.title === 'Periféricos' ? tr(group.subtitle, 'Everyday devices') : tr(group.subtitle, 'Parts, supplies and accessories')}</p></div><span className="rounded-lg bg-white/5 px-2 py-1 text-[10px] text-slate-300">{group.types.length} {tr('tipos', 'types')}</span><button type="button" onClick={()=>toggleGroup(group.title)} aria-label={`${collapsedGroups.includes(group.title) ? "Mostrar" : "Ocultar"} ${group.title}`} aria-expanded={!collapsedGroups.includes(group.title)} className="rounded-lg border border-white/10 p-1.5 text-slate-300 hover:bg-white/10">{collapsedGroups.includes(group.title) ? <ChevronDown size={17}/> : <ChevronUp size={17}/>}</button></div>
            {!collapsedGroups.includes(group.title) && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{group.types.map(type=>{
              const Icon=icons[type] || Package
              const items=assignedEquipment.filter(item=>classify(item,type))
              const count=tally(items)
              const hasVerifiedData = !isLoading && !assignmentError && !apiError
              const activityPercent = hasVerifiedData && count > 0 ? 100 : 0
              const visual = typeVisuals[type] || typeVisuals['Otros componentes']
              const footerLabel = group.title === 'Equipos principales' ? tr('Tipo principal', 'Primary asset') : group.title === 'Periféricos' ? tr('Accesorio operativo', 'Peripheral') : tr('Consumo / repuesto', 'Component / supply')
              return <button type="button" key={type} style={iconStyle(type)} onClick={()=>{setActiveType(type);setStatusFilter('all');setShowAll(false);setDetailOpen(true);document.getElementById('equipos-detalle')?.scrollIntoView({behavior:'smooth',block:'nearest'})}} aria-label={`${type}: ${fmt(count)} unidad(es) vinculada(s) a posiciones. Ver detalle`} className={`it-e6-card group relative flex min-h-[118px] min-w-0 flex-col justify-between rounded-xl border px-3 py-3 text-left transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${activeType===type ? 'it-e6-card-active' : ''}`}>
                <div className="relative flex min-w-0 items-center gap-3">
                  <span className="it-e6-icon flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl border">
                    <Icon size={25} strokeWidth={1.85} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="it-e6-card-title break-words text-[13px] font-semibold leading-[1.3]" title={type}>{type}</p>
                    <p className="it-e6-card-note mt-1 text-[11px] leading-4">{footerLabel}</p>
                  </div>
                  <ChevronRight size={14} className="it-e6-arrow shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </div>
                <div className="it-e6-divider relative mt-2 grid grid-cols-2 gap-2 border-t pt-2">
                  <div className="min-w-0">
                    <span className="it-e6-card-note block text-[10px]">{tr('En posiciones', 'At workstations')}</span>
                    <span className="it-e6-card-value block text-[23px] font-bold leading-none tabular-nums">{hasVerifiedData ? fmt(count) : '—'}</span>
                  </div>
                  <div className="min-w-0 text-right" title={tr('Unidades asignadas en inventario; aún no representan una auditoría física del puesto', 'Inventory-assigned units; not yet a physical workstation audit')}>
                    <span className="it-e6-card-note block text-[10px]">{tr('Origen', 'Source')}</span>
                    <span className="it-e6-card-note block pt-1 text-[10px]">{hasVerifiedData ? (count > 0 ? 'Vinculado' : 'Sin vínculos') : 'Sin verificar'}</span>
                  </div>
                </div>
                <div className="relative mt-2">
                  <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-slate-400">
                    <span>{tr('Registro verificado', 'Verified record')}</span>
                    <span className="tabular-nums">{hasVerifiedData ? (count > 0 ? 'Con registro' : '0 registros') : 'N/D'}</span>
                  </div>
                  <div role="progressbar" aria-label="Existencia de registros vinculados a posiciones" aria-valuemin={0} aria-valuemax={100} aria-valuenow={activityPercent} className="relative h-1.5 overflow-hidden rounded-full bg-slate-600/40">
                    {activityPercent > 0 && <div className="relative h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500" style={{width:`${activityPercent}%`}}/>}
                  </div>
                </div>
              </button>
            })}</div>}
          </section>
        })}
      </div>
      {unclassified>0 && <p className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-200">{fmt(unclassified)} registro(s) no tienen tipo identificable; no se asignan arbitrariamente a una categoría. Se clasificarán cuando se habilite el campo Tipo en la base de datos.</p>}
      <section id="equipos-detalle" className="mt-3 scroll-mt-4 overflow-hidden rounded-2xl border border-violet-500/35 bg-[#121b2c]">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-violet-800/80 via-indigo-900/70 to-[#151e30] px-5 py-4">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-white/10 p-3"><ActiveIcon size={27}/></span><div><h2 className="text-xl font-bold">{activeType}</h2><p className="text-xs text-violet-200">Activos vinculados a posiciones · registros verificables</p></div></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>setDetailOpen(!detailOpen)} aria-expanded={detailOpen} className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-xs hover:bg-white/10">{detailOpen ? <ChevronUp size={15}/> : <ChevronDown size={15}/>} {detailOpen ? "Ocultar detalle" : "Mostrar detalle"}</button><button type="button" onClick={()=>router.push('/inventory')} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold hover:bg-violet-500">Ver inventario / Store <ArrowRight size={15}/></button></div>
        </div>
        {detailOpen && <>
        <div className="grid gap-3 p-3 lg:grid-cols-3">
          <div className={`${small} p-4`}><p className="text-xs text-slate-400">Total de {activeType.toLowerCase()}</p><p className="mt-2 text-3xl font-bold">{fmt(categoryTotal)}</p><p className="mt-1 text-xs text-slate-500">Activos en esta categoría</p>
            <div className="mt-4 space-y-2">{(['assigned','available','repair','damaged'] as EquipmentStatus[]).map((status,i)=>{
              const n=tally(activeItems.filter(x=>x.status===status));return <button type="button" key={status} onClick={()=>{setStatusFilter(status);setShowAll(true)}} className="flex w-full items-center justify-between text-left text-xs hover:text-violet-300"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{background:palette[[2,0,3,4][i]]}}/>{statusLabels[status]}</span><span>{fmt(n)} <span className="ml-3 text-slate-500">{categoryTotal ? Math.round(n/categoryTotal*100):0}%</span></span></button>
            })}</div>
          </div>
          <div className={`${small} p-4`}><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Distribución por ubicación</h3><button type="button" onClick={()=>router.push('/map')} className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-slate-300 hover:text-white"><MapPin size={13}/> Ver en mapa</button></div>
            {locations.length===0?<p className="py-12 text-center text-xs text-slate-500">Sin datos de ubicación para mostrar</p>:<div className="mt-4 flex h-40 items-end gap-2 border-b border-white/10">{locations.map(([name,value],index)=>{const max=locations[0][1];return <div key={name} title={`${name}: ${fmt(value)}`} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"><span className="text-[10px]">{fmt(value)}</span><div className="w-full max-w-11 rounded-t-sm bg-gradient-to-t from-blue-700 to-blue-400" style={{height:`${Math.max(7, Math.round(value/max*114))}px`}}/><span className="w-full truncate text-center text-[10px] text-slate-400" title={name}>{name}</span></div>})}</div>}
          </div>
          <div className={`${small} p-4`}><h3 className="text-sm font-semibold">Distribución por marca</h3><div className="mt-4 flex flex-wrap items-center justify-center gap-5"><div className="relative h-32 w-32 shrink-0 rounded-full" style={{background:donut}}><div className="absolute inset-[24px] flex flex-col items-center justify-center rounded-full bg-[#151e30]"><span className="text-lg font-bold">{fmt(categoryTotal)}</span><span className="text-[10px] text-slate-400">Total</span></div></div><div className="min-w-[110px] flex-1 space-y-2">{brands.length ? brands.map(([brand,n],index)=><div key={brand} className="flex items-center justify-between gap-2 text-[11px]"><span className="flex min-w-0 items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full" style={{background:palette[index%palette.length]}}/><span className="truncate">{brand}</span></span><span className="text-slate-400">{fmt(n)}</span></div>):<p className="text-xs text-slate-500">Sin datos</p>}</div></div></div>
        </div>
        <div className="mx-3 mb-3 overflow-hidden rounded-xl border border-white/[.085] bg-[#111a2b]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 p-3"><div><h3 className="text-sm font-semibold">{activeType} registrados</h3><p className="mt-1 text-xs text-slate-400">{visibleRows.length} registros encontrados</p></div><div className="flex flex-wrap items-center gap-2"><div className="relative"><Search size={15} className="absolute left-3 top-2.5 text-slate-500"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar serial, marca, PC Name..." className="w-52 rounded-lg border border-white/10 bg-[#192438] py-2 pl-9 pr-3 text-xs outline-none focus:border-violet-500 sm:w-64"/></div><select aria-label="Filtrar por estado" value={statusFilter} onChange={event=>setStatusFilter(event.target.value)} className="rounded-lg border border-white/10 bg-[#192438] px-3 py-2 text-xs"><option value="all">Todos los estados</option>{Object.entries(statusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[750px] text-left text-xs"><thead className="bg-white/[.03] text-slate-400"><tr>{['PC NAME','SERIAL','MARCA / MODELO','USUARIO','UBICACIÓN','ESTADO','FECHA ENTRADA','ACCIONES'].map(h=><th key={h} className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead><tbody>{rows.map(item=><tr key={String((item as ViewEquipment & {assignmentKey?:string}).assignmentKey || item.id)} className="border-t border-white/[.06] hover:bg-white/[.025]"><td className="px-3 py-3 font-medium">{item.pcName||'—'}</td><td className="px-3 py-3">{item.serial||'—'}</td><td className="px-3 py-3">{item.brand} {item.model}</td><td className="px-3 py-3">{item.user||'Sin asignar'}</td><td className="px-3 py-3">{item.locationName}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 ${statusColors[item.status]}`}>{statusLabels[item.status]}</span></td><td className="px-3 py-3">{Number.isNaN(Date.parse(item.entryDate))?'—':new Date(item.entryDate).toLocaleDateString('es-DO')}</td><td className="px-3 py-3"><button type="button" onClick={()=>{setAssetDetailTab('general');setSelectedEquipment(item)}} className="font-semibold text-violet-400 hover:text-violet-200">Ver detalles</button></td></tr>)}{rows.length===0&&<tr><td colSpan={8} className="p-8 text-center text-slate-400">{isLoading?'Cargando vínculos...':'No hay activos vinculados a posiciones en esta categoría.'}</td></tr>}</tbody></table></div>
          {visibleRows.length>7&&<div className="border-t border-white/10 p-3 text-right"><button type="button" onClick={()=>setShowAll(!showAll)} className="text-xs font-medium text-violet-400 hover:text-violet-200">{showAll?'Mostrar menos':'Ver todos'} <ChevronRight size={14} className="inline"/></button></div>}
        </div>
        </>}
      </section>
      {/* MODAL NUEVO EQUIPO */}

      {isNewEquipmentOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/[0.08] bg-[#13131d] shadow-2xl">

            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Nuevo activo
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Registra un nuevo equipo físico en el inventario.
                </p>
              </div>

              <button
                onClick={() => { setIsNewEquipmentOpen(false); setFormError('') }}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/[0.06] hover:text-white"
              >
                <X size={19} />
              </button>
            </div>

            {/* FORMULARIO CONDICIONAL */}
            <div className="max-h-[65vh] overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-400">Categoría *</label>
                  <select value={selectedCategory} onChange={e => {
                    const category = e.target.value as AssetCategory | ''
                    setSelectedCategory(category)
                    setForm({ ...initialForm, category: category || 'principal' })
                    setFormError('')
                  }} className="h-11 w-full rounded-xl border border-white/10 bg-[#181822] px-4 text-sm text-white">
                    <option value="">Seleccionar categoría</option>
                    {(Object.keys(assetCategories) as AssetCategory[]).map(category => (
                      <option key={category} value={category}>{assetCategories[category].label}</option>
                    ))}
                  </select>
                </div>
                {selectedCategory && (
                  <div>
                    <label className="mb-2 block text-sm text-slate-400">Tipo de activo *</label>
                    <select value={form.type} onChange={e => { setForm(current => ({ ...current, type: e.target.value })); setFormError('') }} className="h-11 w-full rounded-xl border border-white/10 bg-[#181822] px-4 text-sm text-white">
                      <option value="">Seleccionar tipo</option>
                      {assetCategories[selectedCategory].types.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                )}
                {selectedCategory && form.type && (
                  <>
                    <p className="md:col-span-2 rounded-xl border border-violet-500/20 bg-violet-500/10 p-3 text-sm text-violet-200">
                      Completa los datos de {form.type}. Los campos con * son obligatorios. El tipo de activo se guarda con el registro y permite clasificarlo automaticamente.
                    </p>
                    {visibleFields.map((field: AssetField) => {
                      const required = requiredFields[selectedCategory].includes(field)
                      const value = form[field]
                      return (
                        <div key={field}>
                          <label className="mb-2 block text-sm text-slate-400">{fieldLabels[field]}{required ? ' *' : ''}</label>
                          <input
                            type={field === 'quantity' ? 'number' : 'text'}
                            min={field === 'quantity' ? 1 : undefined}
                            step={field === 'quantity' ? 1 : undefined}
                            value={value}
                            onChange={e => {
                              const next = field === 'quantity' ? Number(e.target.value) : e.target.value
                              setForm(current => ({ ...current, [field]: next }))
                              setFormError('')
                            }}
                            placeholder={fieldLabels[field]}
                            className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none focus:border-violet-500/50"
                          />
                        </div>
                      )
                    })}
                    <div>
                      <label className="mb-2 block text-sm text-slate-400">Estado</label>
                      <select value={form.status} onChange={e => setForm(current => ({ ...current, status: e.target.value as EquipmentStatus }))} className="h-11 w-full rounded-xl border border-white/10 bg-[#181822] px-4 text-sm text-white">
                        <option value="available">Disponible</option>
                        <option value="assigned">Asignado</option>
                        <option value="repair">En reparación</option>
                        <option value="damaged">Dañado</option>
                        <option value="retired">Retirado</option>
                      </select>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-sm text-slate-400">
                      Fecha de entrada <span className="ml-2 text-emerald-400">Automática al guardar</span>
                    </div>
                  </>
                )}
              </div>
              {formError && <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{formError}</p>}
            </div>

            {/* FOOTER */}

            <div className="flex items-center justify-end gap-3 border-t border-white/[0.07] px-6 py-4">

              <button
                onClick={() => { setIsNewEquipmentOpen(false); setFormError('') }}
                className="h-10 rounded-xl border border-white/[0.08] px-4 text-sm text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
              >
                Cancelar
              </button>

              <button
              onClick={handleRegisterEquipment}
                className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 text-sm font-medium text-white transition hover:from-violet-500 hover:to-purple-500"
              >
                <Plus size={17} />
                Registrar activo
              </button>

            </div>

          </div>

        </div>
      )}

      {/* E10: ficha por activo; historial no inferido ni inventado. */}
      {selectedEquipment && !isEditing && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-5"
          onMouseDown={event => { if (event.target === event.currentTarget && !isEditing) setSelectedEquipment(null) }}>
          <section role="dialog" aria-modal="true" aria-labelledby="equipment-details-title"
            className="it-e10-dialog it-e102-dialog flex max-h-[93vh] w-full max-w-[1060px] flex-col overflow-hidden rounded-[24px] border border-cyan-400/40 bg-[#09162b] text-slate-100 shadow-[0_0_0_1px_rgba(139,92,246,.22),0_40px_110px_rgba(0,0,0,.68)]">
            <header className="flex items-start gap-4 border-b border-cyan-400/20 bg-gradient-to-br from-sky-500/[.19] via-[#101e45] to-violet-700/20 p-5 sm:p-7">
              <div className="it-e10-hero-icon flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-violet-400/60 bg-violet-500/15 text-violet-300 shadow-[0_0_28px_rgba(139,92,246,.25)]">
                {(() => { const AssetIcon = icons[selectedEquipment.type] || Package; return <AssetIcon size={25} strokeWidth={1.7}/> })()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-cyan-300">{tr('Ficha técnica del activo','Asset technical record')}</p>
                <h2 id="equipment-details-title" className="mt-1 break-words text-xl font-bold tracking-tight">{selectedEquipment.pcName || selectedEquipment.assetTag || selectedEquipment.type}</h2>
                <p className="mt-1 text-xs text-slate-400">{[selectedEquipment.type,selectedEquipment.brand,selectedEquipment.model].filter(Boolean).join(' · ')}</p>
              </div>
              <span className={`it-e10-state mt-1 hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:block ${statusColors[selectedEquipment.status]}`}>{statusLabels[selectedEquipment.status]}</span>
              <button type="button" aria-label={tr('Cerrar detalles','Close details')} onClick={()=>setSelectedEquipment(null)} className="it-e10-close rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"><X size={19}/></button>
            </header>
            <nav className="it-e10-tabs flex gap-1 border-b border-white/10 px-4 pt-3 sm:px-5" aria-label={tr('Secciones del activo','Asset sections')}>
              {([{id:'general',es:'General',en:'General'},{id:'components',es:'Componentes',en:'Components'},{id:'history',es:'Historial',en:'History'}] as const).map(tab=><button
                key={tab.id} type="button" aria-current={assetDetailTab===tab.id?'page':undefined} onClick={()=>setAssetDetailTab(tab.id)}
                className={`it-e10-tab rounded-t-xl px-4 py-2.5 text-xs font-semibold transition ${assetDetailTab===tab.id?'it-e10-tab-active bg-cyan-400/10 text-cyan-200':'text-slate-400 hover:bg-white/5 hover:text-slate-100'}`}>
                {tr(tab.es,tab.en)}
              </button>)}
            </nav>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              {assetDetailTab==='general' && <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,1fr)]">
                <div className="space-y-4">
                  <section className="it-e10-part rounded-2xl border border-white/10 bg-gradient-to-br from-sky-500/[.08] to-transparent p-4">
                    <div className="mb-4 flex items-center justify-between gap-2 border-b border-white/10 pb-3"><h3 className="flex items-center gap-2 text-sm font-bold"><MapPin size={18} className="text-cyan-300"/>{tr('Asignación y ubicación', 'Assignment and location')}</h3></div>
                    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                      {([
                        [tr('Ubicación registrada','Recorded location'),selectedEquipment.locationName || tr('Sin ubicación','No location')],
                        [tr('Responsable / agente','Assigned user / agent'),selectedEquipment.user || tr('Sin agente asignado','No agent assigned')],
                        [tr('Tipo de equipo','Equipment type'),selectedEquipment.type],
                        [tr('Estado del activo','Asset status'),statusLabels[selectedEquipment.status]],
                      ] as [string,string][]).map(([label,value])=><div key={label} className="min-w-0 border-b border-white/[.07] pb-3"><p className="text-[11px] text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-semibold">{value}</p></div>)}
                    </div>
                    <p className="mt-4 rounded-xl border border-cyan-400/10 bg-cyan-400/[.04] px-3 py-2 text-[11px] leading-5 text-slate-400">{tr('Estructura futura: piso · lado Este/Oeste · R1/R2 · área · posición. No se asignan códigos automáticamente sin datos verificados.','Future structure: floor · East/West side · R1/R2 · area · position. Codes are not auto-assigned without verified data.')}</p>
                  </section>
                  <section className="it-e10-part rounded-2xl border border-white/10 bg-white/[.025] p-4">
                    <h3 className="mb-3 border-b border-white/10 pb-3 text-sm font-bold">{tr('Identificación y especificaciones','Identification and specifications')}</h3>
                    <div className="grid gap-x-5 gap-y-4 sm:grid-cols-3">
                      {([
                        [tr('PC Name','PC Name'),selectedEquipment.pcName || '—'],
                        [tr('Serie','Serial'),selectedEquipment.serial || '—'],
                        [tr('Código interno','Asset tag'),selectedEquipment.assetTag || '—'],
                        [tr('Marca','Brand'),selectedEquipment.brand || '—'],
                        [tr('Modelo','Model'),selectedEquipment.model || '—'],
                        [tr('Condición','Condition'),({new:tr('Nuevo','New'),used:tr('Usado','Used'),damaged:tr('Dañado','Damaged')} as const)[selectedEquipment.condition]],
                        [tr('Cantidad','Quantity'),fmt(selectedEquipment.amount)],
                        [tr('Fecha de entrada','Entry date'),Number.isNaN(Date.parse(selectedEquipment.entryDate))?'—':new Date(selectedEquipment.entryDate).toLocaleDateString(uiLanguage === 'en'?'en-US':'es-DO')],
                      ] as [string,string][]).map(([label,value])=><div key={label} className="min-w-0"><p className="text-[11px] text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-semibold">{value}</p></div>)}
                    </div>
                  </section>
                </div>
                <aside className="it-e10-part rounded-2xl border border-cyan-400/15 bg-gradient-to-b from-[#102446] to-[#0d1b37] p-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold"><Activity className="text-cyan-300" size={18}/>{tr('Referencia operativa','Operational baseline')}</h3>
                  <p className="mt-2 text-[11px] leading-5 text-slate-400">{tr('Componentes que requiere el estándar del equipo. Instalación física aún sin verificar por posición.','Components required by equipment standard. Physical installation is not yet verified per station.')}</p>
                  {(['Desktop','Laptop','All in One'].includes(selectedEquipment.type) ? <div className="mt-4 space-y-2">
                    {([
                      [tr('Monitores externos','External monitors'),selectedEquipment.type==='Desktop'?2:selectedEquipment.type==='Laptop'?1:0],
                      [tr('Teclado','Keyboard'),selectedEquipment.type==='Laptop'?null:1],
                      ['Mouse',selectedEquipment.type==='Laptop'?null:1],
                      [tr('Cable de video','Video cable'),selectedEquipment.type==='Desktop'?2:selectedEquipment.type==='Laptop'?1:0],
                      [tr('Cable de red','Network cable'),1],
                      [tr('Regleta','Power strip'),1],
                    ] as [string,number|null][]).map(([label,value])=><div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-white/[.08] bg-white/[.035] px-3 py-2.5"><span className="text-xs">{label}</span><span className="rounded-lg bg-violet-500/15 px-2.5 py-1 text-xs font-bold text-violet-200">{value===null?tr('Opcional','Optional'):value}</span></div>)}
                  </div> : <p className="mt-5 rounded-xl border border-white/10 p-3 text-xs text-slate-400">{tr('Este activo no tiene una plantilla de estación estándar.','This asset has no standard workstation template.')}</p>)}
                  <p className="mt-4 border-t border-white/10 pt-3 text-[11px] leading-5 text-cyan-200">{tr('Pendiente: vincular equipos físicos a una posición. Los valores estándar no cambian al retirar un accesorio.','Pending: link physical assets to a position. Standard values stay unchanged when an accessory is removed.')}</p>
                </aside>
              </div>}
              {assetDetailTab==='components' && <div className="space-y-4">
                {(['Desktop','Laptop','All in One'].includes(selectedEquipment.type) ? <>
                  <div><h3 className="text-sm font-semibold">{tr('Configuración estándar de estación','Standard workstation configuration')}</h3>
                    <p className="mt-1 text-[11px] text-slate-400">{tr('Referencias estimadas, no accesorios físicamente asignados.','Estimated baselines, not physically assigned accessories.')}</p></div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {([
                      {es:'Monitores',en:'Monitors',value:selectedEquipment.type==='Desktop'?2:selectedEquipment.type==='Laptop'?1:0},
                      {es:'Teclado',en:'Keyboard',value:selectedEquipment.type==='Laptop'?null:1},
                      {es:'Mouse',en:'Mouse',value:selectedEquipment.type==='Laptop'?null:1},
                      {es:'Regleta',en:'Power strip',value:1},
                      {es:'Cable de red',en:'Network cable',value:1},
                      {es:'Cable de video',en:'Video cable',value:selectedEquipment.type==='Desktop'?2:selectedEquipment.type==='Laptop'?1:0},
                      {es:'SSD',en:'SSD',value:1},
                    ]).map(part=><div key={part.es} className="it-e10-part rounded-xl border border-white/10 bg-white/[.035] p-3"><p className="text-[11px] text-slate-400">{tr(part.es,part.en)}</p><p className="mt-2 text-lg font-bold">{part.value===null?tr('Opcional','Optional'):part.value}</p></div>)}
                  </div>
                  <div className="it-e10-note rounded-xl border border-amber-400/20 bg-amber-500/[.06] p-3 text-xs text-amber-200">{tr('La API actual no confirma cuáles accesorios están vinculados a esta estación. Las excepciones requieren asignación verificada.','The current API does not confirm which accessories are linked to this workstation. Exceptions require verified assignments.')}</div>
                </> : <div className="it-e10-note rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-300">{tr('Este tipo de activo se controla por su registro o asignación. No aplica una configuración estándar de workstation.','This asset type is tracked by its record or assignment. No workstation baseline applies.')}</div>)}
                {(selectedEquipment.ramGB!==null || selectedEquipment.storageGB!==null || selectedEquipment.capacity) && <div><h3 className="mb-2 text-sm font-semibold">{tr('Especificaciones registradas','Recorded specifications')}</h3><dl className="grid gap-2 sm:grid-cols-2">{([
                  [tr('Memoria RAM','RAM'),selectedEquipment.ramGB===null?'':`${selectedEquipment.ramGB} GB`],
                  [tr('Almacenamiento','Storage'),selectedEquipment.storageGB===null?'':`${selectedEquipment.storageGB} GB`],
                  [tr('Capacidad / descripción','Capacity / description'),selectedEquipment.capacity],
                ] as [string,string][]).filter(([,v])=>Boolean(v)).map(([k,v])=><div key={k} className="border-b border-white/10 py-2"><dt className="text-[11px] text-slate-400">{k}</dt><dd className="mt-1 text-sm font-medium">{v}</dd></div>)}</dl></div>}
              </div>}
              {assetDetailTab==='history' && <div className="py-8 text-center">
                <div className="it-e10-history-icon mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[.05] text-slate-300"><Activity size={24}/></div>
                <h3 className="mt-4 text-sm font-semibold">{tr('Historial aún no disponible','History not yet available')}</h3>
                <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-400">{tr('La consulta actual no entrega eventos de cambios de usuario, ubicación o estado. No se muestran movimientos que no estén respaldados por registros.','The current endpoint does not provide assignment, location or status change events. Unverified movements are never displayed.')}</p>
                <p className="mt-4 text-[11px] text-slate-500">{tr('La auditoría automática se conectará cuando exista una fuente de eventos verificable.','Automatic audit trails will be connected when a verifiable event source is available.')}</p>
              </div>}
            </div>
            <footer className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 sm:px-6">
              <span className="text-[11px] text-slate-400">{tr('Información del inventario','Inventory record')}</span>
              <div className="flex gap-2"><button type="button" onClick={startEdit} className="it-e10-edit rounded-xl border border-cyan-500/30 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/10">{tr('Editar activo','Edit asset')}</button><button type="button" onClick={()=>setSelectedEquipment(null)} className="it-e10-done rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500">{tr('Cerrar','Close')}</button></div>
            </footer>
          </section>
        </div>, document.body
      )}
        {/* FASE 5D - EDITOR DE ACTIVOS */}
        {isEditing && editForm && selectedEquipment && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <section role="dialog" aria-modal="true" aria-labelledby="edit-equipment-title" className="it-e10-dialog flex max-h-[92vh] w-full max-w-[900px] flex-col overflow-hidden rounded-3xl border border-cyan-400/30 bg-[#101b30] shadow-[0_30px_110px_rgba(0,0,0,.7)]">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
                <div><h2 id="edit-equipment-title" className="text-lg font-semibold">Editar activo</h2><p className="mt-1 text-xs text-slate-400">Actualiza los datos y el estado. No se creará otro registro.</p></div>
                <button type="button" aria-label="Cerrar edición" disabled={isSavingEdit} onClick={() => {setIsEditing(false);setEditError('')}} className="rounded-lg p-2 text-slate-400 hover:bg-white/10"><X size={20}/></button>
              </div>
              <div className="grid min-h-0 grid-cols-1 gap-4 overflow-y-auto p-6 sm:grid-cols-2">
                <label className="text-xs text-slate-400">Categoría
                  <select value={editForm.category} onChange={e => { const category=e.target.value as AssetCategory;setEditForm(v=>v?{...v, category, type:''}:v) }} className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#181822] px-3 text-white">
                    {(Object.keys(assetCategories) as AssetCategory[]).map(c=><option key={c} value={c}>{assetCategories[c].label}</option>)}
                  </select>
                </label>
                <label className="text-xs text-slate-400">Tipo de activo *
                  <select value={editForm.type} onChange={e=>setEditForm(v=>v?{...v,type:e.target.value}:v)} className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#181822] px-3 text-white">
                    <option value="">Seleccionar tipo</option>
                    {assetCategories[editForm.category].types.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                {([
                  ['pcName','Nombre de PC'],['serial','Número de serie'],['assetTag','Código interno del activo'],
                  ['brand','Marca *'],['model','Modelo'],['user','Usuario asignado'],
                ] as const).map(([key,label])=><label key={key} className="text-xs text-slate-400">{label}<input value={editForm[key]} onChange={e=>setEditForm(v=>v?{...v,[key]:e.target.value}:v)} className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-white/[.035] px-3 text-sm text-white outline-none focus:border-violet-500"/></label>)}
                <label className="text-xs text-slate-400">Cantidad *<input type="number" min={1} step={1} value={editForm.quantity} onChange={e=>setEditForm(v=>v?{...v,quantity:Number(e.target.value)}:v)} className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-white/[.035] px-3 text-white"/></label>
                <label className="text-xs text-slate-400">Condición<select value={editForm.condition} onChange={e=>setEditForm(v=>v?{...v,condition:e.target.value as EquipmentForm['condition']}:v)} className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#181822] px-3 text-white"><option value="new">Nuevo</option><option value="used">Usado</option><option value="damaged">Dañado</option></select></label>
                <label className="text-xs text-slate-400">Estado<select value={editForm.status} onChange={e=>setEditForm(v=>v?{...v,status:e.target.value as EquipmentStatus}:v)} className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#181822] px-3 text-white"><option value="available">Disponible / En almacén</option><option value="assigned">Asignado / En uso</option><option value="repair">En reparación</option><option value="damaged">Dañado</option><option value="retired">Retirado (sin eliminar)</option></select></label>
                {editError && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 sm:col-span-2">{editError}</p>}
              </div>
              <div className="flex justify-end gap-3 border-t border-white/10 px-6 py-4">
                <button type="button" disabled={isSavingEdit} onClick={()=>{setIsEditing(false);setEditError('')}} className="rounded-xl border border-white/10 px-5 py-2 text-sm text-slate-300">Cancelar</button>
                <button type="button" disabled={isSavingEdit} onClick={()=>void saveEdit()} className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50">{isSavingEdit?'Guardando...':'Guardar cambios'}</button>
              </div>
            </section>
          </div>, document.body
        )}
    </div>
  )
}