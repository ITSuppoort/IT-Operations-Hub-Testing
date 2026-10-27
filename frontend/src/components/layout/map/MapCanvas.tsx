'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { apiRequest } from '@/lib/api'
import {
  Building2,
  RotateCcw,
  Save,
  Unlock,
  Lock,
  MapPinned,
  LayoutGrid,
  Layers3,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Move,
  Combine,
  Plus,
  Undo2,
} from 'lucide-react'

import type { MapItem } from './MapObject'
import LobbyExactFit from './LobbyExactFit'
import TrainingRoomExactFit from './TrainingRoomExactFit'
import CEOOfficeExactFit from './CEOOfficeExactFit'
import FloorSectorView from './FloorSectorView'
import PositionChecklist from '../../users/PositionChecklist'

type LivePosition = {
  id: string
  code: string
  name?: string | null
  wing?: string | null
  status?: string | null
  location?: {name?: string | null; floorNumber?: number | null; wing?: string | null} | null
  area?: {name?: string | null} | null
  inventoryPerson?: {firstName: string; lastName: string} | null
  equipment?: {brand?: string; model?: string | null; pcName?: string | null; serial?: string | null; category?: string; status?: string | null} | null
}
const clean = (value?: string | null) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
function positionsForArea(item: MapItem, positions: LivePosition[]) {
  // Authoritative registry mapping by position code, not guessed area labels.
  const prefixes: Record<string, RegExp> = {
    'training-1': /^P1-T1-(?:0[1-9]|1[0-9]|20)$/,
    'training-2': /^P1-T2-(?:0[1-9]|1[0-9]|20)$/,
    'training-3': /^P1-T3-(?:0[1-9]|1[0-9]|20)$/,
    'finance': /^P1-F0[1-4]$/,
    'vp-finance': /^P1-VP[12]$/,
    'hr-director': /^P1-HRD$/,
    'ceo-office': /^P1-CEO$/,
    'hr-manager': /^P1-HRG$/,
    'hr-office': /^P1-H0[1-4]$/,
    'lobby-recruitment': /^P1-(?:R0[1-4]|EX0[1-2]|REC0[1-2])$/,
  }
  const pattern = prefixes[item.id]
  if (!pattern) return []
  return positions.filter(p => pattern.test(p.code)).sort((a,b)=>a.code.localeCompare(b.code,undefined,{numeric:true}))
}
function positionAtDesk(room: MapItem, index: number, positions: LivePosition[]): LivePosition | null {
  const pod = /^training-(1|2|3)$/.exec(room.id)
  if (pod) {
    const code = `P1-T${pod[1]}-${String(index+1).padStart(2,'0')}`
    return positions.find(p => p.code === code) ?? null
  }
  if (room.id === 'lobby-recruitment') {
    // Fixed visual order: recruitment 1-4, exams 1-2, reception 1-2.
    const code = index < 4 ? `P1-R0${index+1}` : index < 6 ? `P1-EX0${index-3}` : `P1-REC0${index-5}`
    return positions.find(p => p.code === code) ?? null
  }
  const matches = positionsForArea(room, positions)
  return matches[index] ?? null
}

const STORAGE_KEY = 'inventory-floor-map-v1'
const MARKERS_KEY = 'inventory-floor-position-markers-v1'
// Visual-only floor palettes saved locally, separately from the room coordinates.
const FLOOR_PALETTE_KEY = 'inventory-floor-colors-v1'
type FloorZone = 'lobby' | 'training' | 'executive' | 'common' | 'corridor'
const DEFAULT_FLOOR_COLORS: Record<FloorZone, string> = {
  lobby: '#EDE7DA', training: '#DCE0E3', executive: '#E4DCD0',
  common: '#E8E5DE', corridor: '#616975',
}
const FLOOR_COLORS: Record<FloorZone, {title:string; options: {name:string;hex:string}[]}> = {
  lobby: {title:'Lobby / recepcion', options:[{name:'Marfil calido',hex:'#EDE7DA'},{name:'Gris calido',hex:'#DCE0E3'},{name:'Beige premium',hex:'#E4DCD0'}]},
  training: {title:'Training Pods', options:[{name:'Gris perla',hex:'#DCE0E3'},{name:'Marfil calido',hex:'#EDE7DA'},{name:'Gris azulado',hex:'#BEC9D1'}]},
  executive: {title:'Oficinas ejecutivas', options:[{name:'Beige piedra',hex:'#E4DCD0'},{name:'Gris calido',hex:'#DCE0E3'},{name:'Marfil',hex:'#EDE7DA'}]},
  common: {title:'Otras oficinas', options:[{name:'Marfil neutro',hex:'#E8E5DE'},{name:'Gris perla',hex:'#DCE0E3'},{name:'Beige',hex:'#E4DCD0'}]},
  corridor: {title:'Pasillo', options:[{name:'Gris pizarra',hex:'#616975'},{name:'Azul grafito',hex:'#344054'},{name:'Piedra media',hex:'#85868A'}]},
}
function zoneForRoom(id: string): FloorZone {
  if (id === 'lobby-recruitment') return 'lobby'
  if (id.startsWith('training')) return 'training'
  if (['ceo-office','vp-finance','hr-manager','hr-director'].includes(id)) return 'executive'
  return 'common'
}

const PHASE9_MIGRATION_KEY = 'inventory-floor-phase9-default-applied'
const PHASE9_PREVIOUS_KEY = 'inventory-floor-phase9-previous-layout'
const PHASE10F_KEY = 'inventory-floor-phase10f-layout-applied'
const PHASE10F_BACKUP_KEY = 'inventory-floor-phase10f-previous-layout'
const PHASE11A_APPLIED = 'inventory-floor-phase11a-master-applied'
const PHASE11A_BACKUP = 'inventory-floor-phase11a-previous-layout'
const PHASE11D_APPLIED = 'inventory-floor-phase11d-upper-applied'
const PHASE11D_BACKUP = 'inventory-floor-phase11d-previous-layout'
const PHASE11E_APPLIED = 'inventory-floor-phase11e-swaps-applied'
const PHASE11E_BACKUP = 'inventory-floor-phase11e-previous-layout'
const PHASE11F_APPLIED = 'inventory-floor-phase11f-bath-compact-applied'
const PHASE11F_BACKUP = 'inventory-floor-phase11f-previous-layout'
type MarkerLocation = {x:number;y:number}
const markerLimit=(number:number)=>Math.min(92,Math.max(8,number))


const initialItems: MapItem[] = [
  {
    id: 'training-1',
    name: 'Training Pod 1',
    type: 'Training · 20 Lenovo AIO',
    x: 40,
    y: 300,
    width: 270,
    height: 210,
    color: '#8b5cf6',
  },
  {
    id: 'training-2',
    name: 'Training Pod 2',
    type: 'Training · 20 Lenovo AIO',
    x: 330,
    y: 300,
    width: 270,
    height: 210,
    color: '#8b5cf6',
  },
  {
    id: 'training-3',
    name: 'Training Pod 3',
    type: 'Training · 20 Lenovo AIO',
    x: 620,
    y: 300,
    width: 270,
    height: 210,
    color: '#f59e0b',
  },
  {
    id: 'ceo-office',
    name: 'CEO de Trueshore',
    type: 'Oficina · Abraham Tabar',
    x: 910,
    y: 300,
    width: 230,
    height: 210,
    color: '#22c55e',
  },
  {
    id: 'conference-room',
    name: 'Conference Room',
    type: 'Sala de conferencia',
    x: 40,
    y: 40,
    width: 300,
    height: 200,
    color: '#ec4899',
  },
  {
    id: 'finance',
    name: 'Finanzas',
    type: 'Área · 4 posiciones',
    x: 360,
    y: 40,
    width: 260,
    height: 200,
    color: '#06b6d4',
  },
]

// Fase 8B: áreas conceptuales. No se crean registros ni se inventan equipos en Supabase.
const newZones: MapItem[] = [
  { id:'lobby-recruitment', name:'Lobby · Reclutamiento y recepción', type:'Lobby · mesa 4 reclutadores, recepción 2 personas, 2 AIO de examen, impresora (ilustrativo)', x:40,y:315,width:295,height:455,color:'#38bdf8' },
  { id:'vp-finance', name:'VP de Finanzas',type:'Oficina ejecutiva · distribución conceptual',x:1060,y:45,width:170,height:200,color:'#eab308' },
  { id:'hr-director',name:'Director de RRHH',type:'Oficina · distribución conceptual',x:880,y:45,width:170,height:200,color:'#a78bfa' },
  { id:'kitchen',name:'Cocina pequeña',type:'Área común · sin posiciones verificadas',x:730,y:45,width:140,height:200,color:'#14b8a6' },
  { id:'bathroom',name:'Baño',type:'Área de servicio · sin posiciones verificadas',x:630,y:45,width:90,height:200,color:'#64748b' },
  { id:'hr-manager',name:'Gerente de RRHH',type:'Oficina · distribución conceptual',x:490,y:45,width:130,height:200,color:'#c084fc' },
  { id:'hr-office',name:'Recursos Humanos · 4 personas',type:'Oficina · 4 puestos ilustrativos',x:320,y:45,width:160,height:200,color:'#22c55e' },
]
// Distribución propuesta, editable y reversible: NO altera registros reales.
const PROPOSED_LAYOUT: Record<string, {x:number;y:number;width:number;height:number}> = {
  // De izquierda a derecha: Finanzas, VP, Director RRHH, cocina, bano,
  // Gerente RRHH, Recursos Humanos y sala de conferencias.
  // 11E: intercambiar exactamente los seis espacios solicitados.
  'hr-office': {x:380,y:85,width:230,height:230},
  'hr-manager': {x:610,y:85,width:200,height:230},
  'bathroom': {x:810,y:85,width:105,height:230},
  'kitchen': {x:915,y:85,width:145,height:230},
  'hr-director': {x:1060,y:85,width:190,height:230},
  'vp-finance': {x:1250,y:85,width:175,height:230},
  'finance': {x:1425,y:85,width:225,height:230},
  'conference-room': {x:1650,y:85,width:480,height:230},
  'lobby-recruitment': {x:25,y:85,width:355,height:835},
  'training-1': {x:380,y:480,width:410,height:440},
  'training-2': {x:790,y:480,width:410,height:440},
  'training-3': {x:1200,y:480,width:410,height:440},
  'ceo-office': {x:1610,y:480,width:520,height:440},
}
const PREVIOUS_UPPER_X: Record<string,number> = {
  'conference-room':380,'finance':745,'vp-finance':965,'hr-director':1165,
  'kitchen':1350,'hr-manager':1520,'hr-office':1710,'bathroom':1925,
}
const UPPER_ROOM_IDS = Object.keys(PREVIOUS_UPPER_X)
function isPreviousUpperLayout(items: MapItem[]): boolean {
  return UPPER_ROOM_IDS.every(id => items.some(item => item.id === id && item.x === PREVIOUS_UPPER_X[id] && item.y === 85))
}
const FASE11D_UPPER_SLOTS: Record<string,{x:number;width:number}> = {
 'finance':{x:380,width:230}, 'vp-finance':{x:610,width:200},
 'hr-director':{x:810,width:185}, 'kitchen':{x:995,width:145},
 'bathroom':{x:1140,width:110}, 'hr-manager':{x:1250,width:175},
 'hr-office':{x:1425,width:225}, 'conference-room':{x:1650,width:480},
}
const FASE11E_UPPER_SLOTS: Record<string,{x:number;width:number}> = {
 'hr-office':{x:380,width:230}, 'hr-manager':{x:610,width:200},
 'bathroom':{x:810,width:185}, 'kitchen':{x:995,width:145},
 'hr-director':{x:1140,width:110}, 'vp-finance':{x:1250,width:175},
 'finance':{x:1425,width:225}, 'conference-room':{x:1650,width:480},
}
function is11ELayout(items:MapItem[]) {
 return Object.entries(FASE11E_UPPER_SLOTS).every(([id,slot]) =>
  items.some(item => item.id === id && item.x === slot.x && item.width === slot.width && item.y === 85 && item.height === 230))
}
function is11DLayout(items:MapItem[]) {
 return Object.entries(FASE11D_UPPER_SLOTS).every(([id,slot])=>
   items.some(item=>item.id===id&&item.x===slot.x&&item.width===slot.width&&item.y===85&&item.height===230))
}
const withNewZones = (list:MapItem[]) => [...list, ...newZones.filter(zone=>!list.some(old=>old.id===zone.id))]
const BASE_WIDTH=2170
const BASE_HEIGHT=970
const DEFAULT_LAYOUT: MapItem[] = withNewZones(initialItems).map(item=>({...item,...(PROPOSED_LAYOUT[item.id]||{})}))

function FloorOneMap() {
  const [items, setItems] = useState<MapItem[]>(() => {
    // Migración única y reversible. La distribución anterior se conserva
    // antes de establecer como predeterminada la planta aprobada.
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      const migrated = localStorage.getItem(PHASE9_MIGRATION_KEY)
      if (migrated === '1' && saved) {
        const parsed: unknown = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length) {
          const oldItems = parsed as MapItem[]
          if (localStorage.getItem(PHASE10F_KEY) !== '1') {
            // Preserve the previous user-defined plan before changing any coordinates.
            localStorage.setItem(PHASE10F_BACKUP_KEY, saved)
            const moved = oldItems.map(item => item.id === 'lobby-recruitment'
              ? {...item, x:25, y:85, width:355, height:835}
              : {...item, x:item.x+(item.y < 350 ? 390 : 83)})
            localStorage.setItem(STORAGE_KEY, JSON.stringify(moved))
            localStorage.setItem(PHASE10F_KEY, '1')
            return moved
          }
          if (localStorage.getItem(PHASE11A_APPLIED) !== '1') {
            // Snapshot the precise current layout before switching to the fixed master plan.
            localStorage.setItem(PHASE11A_BACKUP, saved)
            const masterItems = withNewZones(oldItems).map(item => ({...item,...(PROPOSED_LAYOUT[item.id] || {})}))
            localStorage.setItem(STORAGE_KEY, JSON.stringify(masterItems))
            localStorage.setItem(PHASE11A_APPLIED, '1')
            return masterItems
          }
          // Migration 11D only applies to the untouched 11C default positions.
          // Do not overwrite a user-customized arrangement.
          if (localStorage.getItem(PHASE11D_APPLIED) !== '1' && isPreviousUpperLayout(oldItems)) {
            localStorage.setItem(PHASE11D_BACKUP, saved)
            const reordered = oldItems.map(item => UPPER_ROOM_IDS.includes(item.id)
              ? {...item, ...PROPOSED_LAYOUT[item.id]} : item)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(reordered))
            localStorage.setItem(PHASE11D_APPLIED, '1')
            return reordered
          }
          // Unica migracion 11E: protege configuraciones personalizadas.
          if (localStorage.getItem(PHASE11E_APPLIED) !== '1' && is11DLayout(oldItems)) {
            localStorage.setItem(PHASE11E_BACKUP, saved)
            const swapped = oldItems.map(item => ({...item,...(PROPOSED_LAYOUT[item.id] || {})}))
            localStorage.setItem(STORAGE_KEY, JSON.stringify(swapped))
            localStorage.setItem(PHASE11E_APPLIED, '1')
            return swapped
          }
          // Phase 11F: apply only to the verified stock layout of 11E.
          if (localStorage.getItem(PHASE11F_APPLIED) !== '1' && is11ELayout(oldItems)) {
            localStorage.setItem(PHASE11F_BACKUP, saved)
            const adjusted = oldItems.map(item =>
              ['bathroom','kitchen','hr-director'].includes(item.id)
                ? {...item,...PROPOSED_LAYOUT[item.id]} : item)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(adjusted))
            localStorage.setItem(PHASE11F_APPLIED, '1')
            return adjusted
          }
          return oldItems
        }
      }
      if (!migrated) {
        if (saved) localStorage.setItem(PHASE9_PREVIOUS_KEY, saved)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_LAYOUT))
        localStorage.setItem(PHASE9_MIGRATION_KEY, '1')
      }
    } catch {
      // Una configuración local dañada no bloquea el editor.
    }
    return DEFAULT_LAYOUT
  })

  const [layoutUndo, setLayoutUndo] = useState<MapItem[] | null>(null)
  const [joinedIds, setJoinedIds] = useState<string[]>([])
  const [joinedPreview, setJoinedPreview] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(
    null,
  )
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null)
  const [hoverComputer, setHoverComputer] = useState<{roomId:string; index:number; x:number; y:number} | null>(null)
  const [pinnedComputer, setPinnedComputer] = useState<{roomId:string; index:number; x:number; y:number} | null>(null)
  const [p1Search, setP1Search] = useState('')
  const [p1Spotlight, setP1Spotlight] = useState<string | null>(null)
  // Dos estaciones administrativas PROVISIONALES. No son registros de /positions.
  const [p1ResultsOpen, setP1ResultsOpen] = useState(false)

  const [floorPlanVisible, setFloorPlanVisible] = useState(true)
  const [accessVisible, setAccessVisible] = useState(true)
  const [officeVisual, setOfficeVisual] = useState(true)
  const [fullView, setFullView] = useState(false)
  const [zoom, setZoom] = useState(.75)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [toolsOpen, setToolsOpen] = useState(false)
  // Vista operativa por defecto. Herramientas editables ocultas hasta que alguien las abra.
  const [adminToolsVisible, setAdminToolsVisible] = useState(false)
  function closeAdminTools() {
    setAdminToolsVisible(false)
    setToolsOpen(false)
    setFloorColorPanelOpen(false)
    setMarkerMode(false)
    setPendingPositionId(null)
    setEditMode(false)
  }

  const [floorColors, setFloorColors] = useState<Record<FloorZone,string>>(() => {
    try {
      const saved = localStorage.getItem(FLOOR_PALETTE_KEY)
      if (saved) {
        const parsed: unknown = JSON.parse(saved)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const result = {...DEFAULT_FLOOR_COLORS}
          for (const key of Object.keys(result) as FloorZone[]) {
            const hex = (parsed as Record<string,unknown>)[key]
            if (typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex)) result[key] = hex
          }
          return result
        }
      }
    } catch { /* Browser defaults are always available. */ }
    return {...DEFAULT_FLOOR_COLORS}
  })
  const [floorColorPanelOpen, setFloorColorPanelOpen] = useState(false)
  function updateFloorColor(zone: FloorZone, hex: string) {
    const next = {...floorColors, [zone]:hex}
    setFloorColors(next)
    try { localStorage.setItem(FLOOR_PALETTE_KEY,JSON.stringify(next)) } catch { /* local persistence optional */ }
  }

  const [pan, setPan] = useState({ x: 0, y: 0 })
  function fitMap() {
    const viewport=canvasRef.current
    if (!viewport) return
    // Encaje sobre el contorno arquitectonico real (no sobre el margen decorativo).
    // No cambia ninguna coordenada de escritorios, salas o hotspots.
    const inset=8
    const planLeft=25, planTop=85, planWidth=2105, planHeight=835
    const next=Math.min(1.7,Math.max(.45,Math.min((viewport.clientWidth-inset*2)/planWidth,(viewport.clientHeight-inset*2)/planHeight)))
    setZoom(next)
    setPan({
      x:(viewport.clientWidth-planWidth*next)/2-planLeft*next,
      y:(viewport.clientHeight-planHeight*next)/2-planTop*next
    })
  }

  const [panning, setPanning] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [markerMode, setMarkerMode] = useState(false)
  const [pendingPositionId, setPendingPositionId] = useState<string | null>(null)
  const [markers, setMarkers] = useState<Record<string,MarkerLocation>>({})
  const [markersSaved, setMarkersSaved] = useState(true)
  useEffect(()=>{
    try {
      const raw=localStorage.getItem(MARKERS_KEY)
      if(raw){const saved=JSON.parse(raw) as Record<string,MarkerLocation>;if(saved && typeof saved==='object' && !Array.isArray(saved))setMarkers(saved)}
    } catch { /* Un mapa anterior debe seguir funcionando. */ }
  },[])


  const [saved, setSaved] = useState(true)
  const [positions, setPositions] = useState<LivePosition[]>([])
  const [positionsState, setPositionsState] = useState<'loading'|'ready'|'error'>('loading')
  const [positionsError, setPositionsError] = useState('')
  const [checklistOpen, setChecklistOpen] = useState(false)
  const [checklistAccessories, setChecklistAccessories] = useState<Array<{category:string;role?:string;quantity?:number}>>([])
  const [checklistLoading, setChecklistLoading] = useState(false)
  const [checklistError, setChecklistError] = useState('')
  const [checklistRefresh, setChecklistRefresh] = useState(0)
  const [reviewSummaries, setReviewSummaries] = useState<Array<{positionId:string;completed:number;total:number}>>([])
  const [reviewsLoaded, setReviewsLoaded] = useState(false)
  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await apiRequest('/positions/checklist-review-summary', {cache:'no-store'})
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data: unknown = await response.json()
        if (!Array.isArray(data)) throw new Error('Respuesta inesperada')
        if (active) {setReviewSummaries(data as Array<{positionId:string;completed:number;total:number}>);setReviewsLoaded(true)}
      } catch {if(active){setReviewsLoaded(false);setReviewSummaries([])}}
    }
    void load()
    return () => { active=false }
  }, [checklistRefresh])
  // P1 resumen: mismas cinco categorias del Piso 2; derivadas solo de registros y checklist real.
  const p1Summary = useMemo(() => {
    const total = {empty:0, incomplete:0, complete:0, occupied:0, unknown:0}
    if (positionsState !== 'ready') return total
    const reviews = new Map(reviewSummaries.map(r => [r.positionId, r]))
    for (const p of positions.filter(p => p.location?.floorNumber === 1)) {
      const review = reviews.get(p.id)
      if (!reviewsLoaded) { total.unknown++; continue }
      if (!p.equipment) { total.empty++; continue }
      if (!review || review.total <= 0) { total.unknown++; continue }
      if (review.completed < review.total) { total.incomplete++; continue }
      if (p.inventoryPerson) total.occupied++
      else total.complete++
    }
    return total
  }, [positions, positionsState, reviewSummaries, reviewsLoaded])
  const [p1EditorOpen, setP1EditorOpen] = useState(false)
  const checklistPosition = useMemo(() => {
    if (!pinnedComputer) return null
    const room=items.find(item=>item.id===pinnedComputer.roomId)
    return room ? positionAtDesk(room,pinnedComputer.index,positions) : null
  },[pinnedComputer,items,positions])
  useEffect(() => {
    if (!checklistOpen || !checklistPosition) {setChecklistAccessories([]);setChecklistError('');return}
    let active=true
    setChecklistLoading(true)
    setChecklistError('')
    apiRequest(`/positions/${encodeURIComponent(checklistPosition.id)}/accessories`,{cache:'no-store'})
      .then(async response=>{
        if(!response.ok) throw new Error(`HTTP ${response.status}`)
        const data:unknown=await response.json()
        if(!Array.isArray(data))throw new Error('Formato de accesorios inesperado')
        if(active)setChecklistAccessories(data as Array<{category:string;role?:string;quantity?:number}>)
      })
      .catch(error=>{if(active)setChecklistError(error instanceof Error?error.message:'No se pudieron consultar accesorios')})
      .finally(()=>{if(active)setChecklistLoading(false)})
    return()=>{active=false}
  },[checklistOpen,checklistPosition?.id,checklistRefresh])
  const refreshChecklist=()=>{
    setChecklistRefresh(v=>v+1)
    apiRequest('/positions',{cache:'no-store'}).then(async response=>{
      if(!response.ok)throw new Error(`HTTP ${response.status}`)
      const data:unknown=await response.json()
      if(Array.isArray(data))setPositions(data as LivePosition[])
    }).catch(()=>setChecklistError('No se pudo actualizar el detalle del puesto'))
  }
  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const response = await apiRequest('/positions')
        if (!response.ok) throw new Error(`No se pudieron consultar posiciones (HTTP ${response.status})`)
        const data: unknown = await response.json()
        if (!Array.isArray(data)) throw new Error('El servidor no devolvió una lista de posiciones')
        if (mounted) { setPositions(data as LivePosition[]); setPositionsState('ready'); setPositionsError('') }
      } catch (error) {
        if (mounted) { setPositionsState('error'); setPositionsError(error instanceof Error ? error.message : 'Error de conexión') }
      }
    }
    void load()
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load() }, 30000)
    return () => { mounted = false; window.clearInterval(timer) }
  }, [])


  useEffect(() => {
    const viewport=canvasRef.current
    if(!viewport)return
    const observer=new ResizeObserver(()=>{
      // Reencuadrar solamente si el plano todavía no fue desplazado manualmente.
      if(!panning)fitMap()
    })
    observer.observe(viewport)
    fitMap()
    return()=>observer.disconnect()
  // El reencuadre inicial ocurre únicamente al montar el editor.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  const selectedItem =
    items.find((item) => item.id === selectedId) ?? null
  const selectedPositions = useMemo(() => selectedItem ? positionsForArea(selectedItem, positions) : [], [selectedItem, positions])
  const activePosition = selectedPositions.find(p => p.id === selectedPositionId) ?? null
  // Busqueda unificada de puestos visibles, siempre vinculada al codigo real.
  const p1Matches = useMemo(() => {
    const query=clean(p1Search)
    if (!query) return [] as Array<{roomId:string;index:number;code:string;name:string;x:number;y:number}>
    const found:Array<{roomId:string;index:number;code:string;name:string;x:number;y:number}>=[]
    for (const room of items) {
      const total=/^training-[123]$/.test(room.id)?20:room.id==='finance'?4:room.id==='hr-office'?4:room.id==='lobby-recruitment'?8:room.id==='vp-finance'?2:['ceo-office','hr-manager','hr-director'].includes(room.id)?1:0
      for (let index=0;index<total;index++) {
        const p=positionAtDesk(room,index,positions)
        if (!p) continue
        const text=clean([p.code,p.name,p.inventoryPerson?.firstName,p.inventoryPerson?.lastName,p.equipment?.pcName,p.equipment?.serial,room.name].filter(Boolean).join(' '))
        if (!text.includes(query)) continue
        // Mismas anclas de los equipos dibujados; no se cambian las coordenadas.
        let x=0,y=0
        if (/^training-[123]$/.test(room.id)) {
          const table=Math.floor(index/4),row=index%4
          const tx=[133,232,89,180,271][table],ty=table<2?34:224
          x=room.x+8+((tx+17.5)/390)*(room.width-16)
          y=room.y+8+((ty+17+row*38)/500)*(room.height-16)
        } else if (room.id==='lobby-recruitment') {
          const c=[[.38,.075],[.38,.188],[.38,.302],[.38,.415],[.67,.082],[.825,.082],[.665,.778],[.665,.872]][index]
          x=room.x+8+c[0]*(room.width-16);y=room.y+8+c[1]*(room.height-16)
        } else if(room.id==='finance') {
          const c=[[.32,.43],[.69,.43],[.32,.72],[.69,.72]][index]
          x=room.x+room.width*c[0];y=room.y+room.height*c[1]
        } else if(room.id==='vp-finance') {
          x=room.x+room.width*(index===0?.36:.65);y=room.y+room.height*.52
        } else if(total===4) {
          x=room.x+room.width*(index%2===0?.32:.69);y=room.y+room.height*(index<2?.45:.72)
        } else {x=room.x+room.width*.5;y=room.y+room.height*.52}
        found.push({roomId:room.id,index,code:p.code,name:room.name,x,y})
      }
    }
    return found.slice(0,25)
  },[p1Search,items,positions])
  const focusP1Seat=(match:{roomId:string;index:number;x:number;y:number})=>{
    setPinnedComputer({roomId:match.roomId,index:match.index,x:match.x,y:match.y})
    setP1Spotlight(`${match.roomId}:${match.index}`)
    setSelectedId(null);setChecklistOpen(false);setHoverComputer(null);setP1ResultsOpen(false)
    // Mantener el zoom del usuario, centrar el puesto sin alterar el plano.
    const viewport=canvasRef.current
    if(viewport)setPan({x:viewport.clientWidth*.43-match.x*zoom,y:viewport.clientHeight*.52-match.y*zoom})
  }

  useEffect(()=>{
    const listener=(event:Event)=>{
      const code=(event as CustomEvent<{code?:string}>).detail?.code
      if(!code)return
      const p=positions.find(pos=>pos.code===code)
      if(!p)return
      // Derivar ancla de un resultado exacto, sin depender de búsqueda local anterior.
      const rooms=items.filter(room=>positionsForArea(room,positions).some(pos=>pos.code===code))
      for(const room of rooms){
        const total=room.id.startsWith('training')?20:room.id==='lobby-recruitment'?8:room.id==='vp-finance'?2:room.id==='finance'?4:room.id==='hr-office'?4:1
        for(let index=0;index<total;index++){
          if(positionAtDesk(room,index,positions)?.code!==code)continue
          const viewport=canvasRef.current
          if(!viewport)return
          // Usar la misma geometría del buscador local, sin alterar la distribución.
          let x=room.x+room.width*.5,y=room.y+room.height*.52
          if(room.id.startsWith('training')){
            const table=Math.floor(index/4),row=index%4,tx=[133,232,89,180,271][table],ty=table<2?34:224
            x=room.x+8+((tx+17.5)/390)*(room.width-16)
            y=room.y+8+((ty+17+row*38)/500)*(room.height-16)
          }else if(room.id==='lobby-recruitment'){
            const c=[[.38,.075],[.38,.188],[.38,.302],[.38,.415],[.67,.082],[.825,.082],[.665,.778],[.665,.872]][index]
            x=room.x+8+c[0]*(room.width-16);y=room.y+8+c[1]*(room.height-16)
          }else if(room.id==='finance'||room.id==='hr-office'){
            const c=[[.32,.43],[.69,.43],[.32,.72],[.69,.72]][index]
            x=room.x+room.width*c[0];y=room.y+room.height*c[1]
          }else if(room.id==='vp-finance'){
            x=room.x+room.width*(index===0?.36:.65)
          }
          setPinnedComputer({roomId:room.id,index,x,y});setP1Spotlight(`${room.id}:${index}`)
          setSelectedId(null);setChecklistOpen(false);setHoverComputer(null)
          setPan({x:viewport.clientWidth*.43-x*zoom,y:viewport.clientHeight*.52-y*zoom})
          return
        }
      }
    }
    window.addEventListener('it-hub:p1-global-focus',listener)
    return ()=>window.removeEventListener('it-hub:p1-global-focus',listener)
  },[positions,items,zoom])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedId(null)
        setSelectedPositionId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  function updateItem(updatedItem: MapItem) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === updatedItem.id ? updatedItem : item,
      ),
    )

    setSaved(false)
  }

  // Organizacion sugerida, no plano real: solo modifica la vista previa local.
  // Se aplica exclusivamente a las posiciones reales del area seleccionada.
  function arrangeSelectedArea() {
    if (!selectedItem || !markerMode || selectedPositions.length === 0) return
    const answer = window.confirm(
      `Organizar ${selectedPositions.length} puesto(s) de ${selectedItem.name} en filas?\n\nEsto reemplazara las ubicaciones locales de ESTA area, pero no las guardara hasta que pulses Guardar. No cambia Supabase.`,
    )
    if (!answer) return
    const total = Math.min(selectedPositions.length, 60)
    const columns = total <= 4 ? 2 : total <= 12 ? 3 : 5
    const rows = Math.ceil(total / columns)
    const arranged: Record<string, MarkerLocation> = {}
    selectedPositions.slice(0, 60).forEach((position, index) => {
      const row = Math.floor(index / columns)
      const col = index % columns
      const countInRow = Math.min(columns, total - row * columns)
      arranged[position.id] = {
        x: markerLimit(((col + 1) / (countInRow + 1)) * 100),
        y: markerLimit(((row + 1) / (rows + 1)) * 100),
      }
    })
    setMarkers(current => ({ ...current, ...arranged }))
    setMarkersSaved(false)
    setPendingPositionId(null)
  }

  function proposeFloorLayout() {
    if (!window.confirm('¿Aplicar la distribución ampliada de las oficinas?\n\nSe conservará una copia para deshacer. No se modificarán usuarios, equipos ni Supabase. Las áreas existentes cambiarán SOLO de coordenadas locales y las ubicaciones de puestos seguirán ligadas a sus IDs.')) return
    setLayoutUndo(items.map(item=>({...item})))
    setItems(current=>withNewZones(current).map(item=>({...item,...(PROPOSED_LAYOUT[item.id]||{})})))
    setSelectedId(null);setSaved(false)
    requestAnimationFrame(fitMap)
    setFloorPlanVisible(true);setOfficeVisual(true)
  }
  function undoProposedLayout() {
    if (!layoutUndo) return
    setItems(layoutUndo)
    setLayoutUndo(null)
    setSaved(false)
  }
  function toggleJoinSelection() {
    if (!selectedItem || !editMode) return
    setJoinedIds(current=>current.includes(selectedItem.id)?current.filter(id=>id!==selectedItem.id):[...current,selectedItem.id].slice(-2))
  }
  function joinVisualPreview() {
    if (joinedIds.length!==2 || !editMode) return
    const objects=joinedIds.map(id=>items.find(item=>item.id===id)).filter((item):item is MapItem=>Boolean(item))
    if(objects.length!==2)return
    // Sólo agrupación visual en pantalla: no elimina las dos áreas originales.
    setJoinedPreview(true)
  }

  function saveLayout() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(items),
    )

    localStorage.setItem(MARKERS_KEY,JSON.stringify(markers))
    setMarkersSaved(true)
    setSaved(true)
    setLayoutUndo(null)
  }

  function resetLayout() {
    const confirmed = window.confirm(
      '¿Quieres restaurar la distribución inicial del mapa?',
    )

    if (!confirmed) return

    setItems(DEFAULT_LAYOUT)
    setSelectedId(null)
    setMarkerMode(false)
    setPendingPositionId(null)
    setMarkers({})
    setLayoutUndo(null);setJoinedIds([]);setJoinedPreview(false)
    setMarkersSaved(true)
    localStorage.removeItem(MARKERS_KEY)

    localStorage.setItem(STORAGE_KEY,JSON.stringify(DEFAULT_LAYOUT))
    setFloorPlanVisible(true);setAccessVisible(true);setOfficeVisual(true)
    setSaved(true)
  }

  return (
    <div className={fullView ? "fixed inset-0 z-[90] flex flex-col gap-2 overflow-hidden bg-[#070b16] p-3" : "space-y-2"}>
      {/* Resumen operativo de P1: datos oficiales de la API, no puestos visuales. */}
      {!fullView && <section className="rounded-xl border border-slate-700/60 bg-[#080f22] p-3 text-slate-100" aria-label="Resumen operativo del Piso 1">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">Resumen operativo · Piso 1</div><p className="mt-0.5 text-[11px] text-slate-400">Datos oficiales y revisiones del checklist; sin estimar equipos a partir del dibujo.</p></div>
          <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs">{positionsState==='ready' ? positions.filter(p=>p.location?.floorNumber===1).length : '—'} posiciones registradas</div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          {([
            {key:'empty' as const, title:'Vacías / sin equipo', detail:'Sin equipamiento principal',tone:'rose'},
            {key:'incomplete' as const, title:'Incompletas', detail:'Checklist parcialmente revisado',tone:'amber'},
            {key:'complete' as const, title:'Completas / libres', detail:'Checklist completo y sin usuario',tone:'emerald'},
            {key:'occupied' as const, title:'Completas / en uso', detail:'Checklist completo y usuario asignado',tone:'sky'},
            {key:'unknown' as const, title:'Sin verificar', detail:'No hay revision suficiente para clasificar',tone:'slate'},
          ]).map(entry=>{
            const total=Object.values(p1Summary).reduce((a,n)=>a+n,0)
            const count=p1Summary[entry.key]
            const percent=total?Math.round(count*100/total):0
            const colors:Record<string,string>={rose:'#fb7185',amber:'#fbbf24',emerald:'#34d399',sky:'#7dd3fc',slate:'#cbd5e1'}
            return <div key={entry.key} className="rounded-xl border border-white/10 bg-[#111c30] p-3" title={entry.detail}>
              <div className="mb-2 text-[11px] font-semibold text-slate-200">{entry.title}</div>
              <div className="flex items-end justify-between"><strong className="text-[28px] font-extrabold leading-none tabular-nums" style={{color:colors[entry.tone]}}>{positionsState==='ready'&&reviewsLoaded?count:'—'}</strong><span className="text-xs text-slate-300">{positionsState==='ready'&&reviewsLoaded?`${percent}%`:'...'}</span></div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{background:colors[entry.tone],width:`${percent}%`}}/></div>
              <p className="mt-2 text-[10px] leading-4 text-slate-400">{entry.detail}</p>
            </div>
          })}
        </div>
        {!reviewsLoaded && <p className="mt-2 text-xs text-amber-200">Resumen pendiente: la API de revisiones no está disponible. No se mostrarán totales estimados.</p>}
      </section>}
      {/* Barra operativa discreta; controles de diseno solo bajo demanda. */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-700/50 bg-[#0c1527] px-3 py-1.5">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Piso 1 · Vista operativa <span className="text-slate-500">· {Math.round(zoom*100)}%</span></div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={fitMap} className="rounded-lg border border-slate-700/70 px-2 py-1.5 text-[11px] text-sky-200 hover:bg-slate-800" title="Ajustar mapa">Ajustar</button>
          <button type="button" className="rounded-lg border border-slate-700/70 px-2 py-1.5 text-[11px] text-sky-200 hover:bg-slate-800" onClick={() => {setFullView(v=>!v);window.requestAnimationFrame(()=>window.requestAnimationFrame(fitMap))}}>{fullView?'Salir de pantalla amplia':'Pantalla amplia'}</button>
          <button type="button" aria-expanded={adminToolsVisible} aria-controls="p1-admin-tools" className="rounded-lg border border-slate-700/70 px-2 py-1.5 text-[11px] text-slate-300 hover:bg-slate-800" onClick={() => adminToolsVisible ? closeAdminTools() : setAdminToolsVisible(true)}>{adminToolsVisible?'Ocultar herramientas':'Mostrar herramientas'}</button>
        </div>
      </div>
      {adminToolsVisible && <div id="p1-admin-tools" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-[#10111d] px-3 py-2">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm font-semibold text-white">
              Floor Editor
            </p>

            <p className="mt-0.5 text-[11px] text-slate-500">
              Piso 1 · Infraestructura editable
            </p>
          </div>

          <div
            className={`
              rounded-full px-3 py-1
              text-[10px] font-semibold uppercase tracking-wider
              ${
                saved
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-orange-500/10 text-orange-400'
              }
            `}
          >
            {saved && markersSaved ? 'Guardado' : 'Cambios sin guardar'}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">

          <button type="button" className="flex h-10 items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/20 active:scale-95" onClick={() => {setFullView(value => !value);window.requestAnimationFrame(() => window.requestAnimationFrame(fitMap))}} aria-pressed={fullView} title="Ampliar mapa">{fullView ? <Minimize2 size={15}/> : <Maximize2 size={15}/>} {fullView ? 'Salir' : 'Pantalla amplia'}</button>
          <button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 active:scale-95" onClick={() => setZoom(value => Math.max(.6, Math.round((value-.1)*10)/10))} aria-label="Alejar"><ZoomOut size={17}/></button>
          <span className="min-w-10 text-center text-xs font-bold text-sky-200">{Math.round(zoom*100)}%</span>
          <button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 active:scale-95" onClick={() => setZoom(value => Math.min(2, Math.round((value+.1)*10)/10))} aria-label="Acercar"><ZoomIn size={17}/></button>
          <button type="button" className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-slate-100 hover:bg-white/10 active:scale-95" onClick={fitMap} title="Ajustar plano a pantalla"><Move size={15}/> Ajustar</button>

          <button type="button" onClick={() => setFloorColorPanelOpen(open => !open)}
            aria-expanded={floorColorPanelOpen}
            className="flex h-10 items-center gap-2 rounded-xl border border-amber-300/40 bg-amber-200/10 px-3 text-xs font-bold text-amber-100 transition hover:bg-amber-200/20 active:scale-95"
            title="Cambiar los pisos del plano sin modificar sus oficinas">Pisos</button>
          {toolsOpen && <>
          <button
            type="button"
            onClick={() => setFloorPlanVisible(current => !current)}
            aria-pressed={floorPlanVisible}
            className={'flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition active:scale-95 '+(floorPlanVisible?'border-sky-300/70 bg-sky-500/20 text-sky-100':'border-sky-500/30 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20')}
            title="Mostrar u ocultar esquema conceptual de paredes y pasillos"
          ><Layers3 size={15} />{floorPlanVisible?'Ocultar plano':'Vista plano 2D'}</button>
          <button
            type="button"
            onClick={() => { setFloorPlanVisible(true); setAccessVisible(current => !current) }}
            aria-pressed={floorPlanVisible && accessVisible}
            title="Mostrar u ocultar accesos conceptuales de las oficinas"
            className={'flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition active:scale-95 '+(floorPlanVisible&&accessVisible?'border-emerald-400/70 bg-emerald-500/20 text-emerald-100':'border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20')}
          ><MapPinned size={15} />{floorPlanVisible&&accessVisible?'Ocultar accesos':'Ver accesos'}</button>
          <button
            type="button"
            onClick={() => {setOfficeVisual(v=>!v);setFloorPlanVisible(true)}}
            aria-pressed={officeVisual}
            title="Vista ilustrativa con mobiliario. No cambia posiciones ni inventario."
            className={'flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition hover:-translate-y-0.5 active:scale-95 '+(officeVisual?'border-fuchsia-300/80 bg-fuchsia-500/25 text-fuchsia-100':'border-fuchsia-500/35 bg-fuchsia-500/10 text-fuchsia-200')}
          ><Building2 size={15}/>{officeVisual?'Ocultar oficinas':'Vista oficinas'}</button>

          <button type="button" className="flex h-10 items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 text-xs font-semibold text-amber-200 hover:bg-amber-500/20" onClick={()=>{
            const previous=localStorage.getItem(PHASE9_PREVIOUS_KEY)
            if(!previous){window.alert('No hay una distribución anterior respaldada en este navegador.');return}
            if(!window.confirm('¿Cargar la distribución anterior como vista previa? No se modificará Supabase. Para conservarla debes pulsar Guardar.'))return
            try { const parsed:unknown=JSON.parse(previous);if(!Array.isArray(parsed)||!parsed.length)throw Error('invalid');setLayoutUndo(items.map(item=>({...item})));setItems(parsed as MapItem[]);setSelectedId(null);setSaved(false);requestAnimationFrame(fitMap) }
            catch{window.alert('La copia anterior no es válida.')}
          }}><RotateCcw size={15}/> Diseño anterior</button>
          {layoutUndo && <button type="button" onClick={undoProposedLayout} className="flex h-10 items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 text-xs text-amber-200"><Undo2 size={15}/> Deshacer distribución</button>}
          {editMode && <button type="button" onClick={toggleJoinSelection} disabled={!selectedItem} className="flex h-10 items-center gap-2 rounded-xl border border-violet-400/35 bg-violet-500/10 px-3 text-xs text-violet-100 disabled:opacity-40"><Plus size={15}/> Marcar área ({joinedIds.length}/2)</button>}
          {editMode && joinedIds.length===2 && <button type="button" onClick={joinVisualPreview} className="flex h-10 items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 text-xs text-emerald-200"><Combine size={15}/> Vista unión</button>}
          {joinedPreview && <button type="button" onClick={()=>{setJoinedPreview(false);setJoinedIds([])}} className="flex h-10 rounded-xl border border-slate-500/50 px-3 text-xs text-slate-200">Quitar unión</button>}
          <button
            onClick={resetLayout}
            className="
              flex h-10 items-center gap-2
              rounded-xl border border-white/[0.08]
              bg-white/[0.03] px-3
              text-xs font-medium text-slate-300
              transition
              hover:bg-white/[0.07]
              hover:text-white
            "
          >
            <RotateCcw size={15} />

            Restaurar
          </button>

          </>}
          <button type="button" onClick={() => setToolsOpen(open=>!open)} aria-expanded={toolsOpen} className="flex h-10 items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 text-xs font-bold text-sky-100 hover:bg-sky-500/20 active:scale-95"><Layers3 size={15}/> {toolsOpen?'Ocultar herramientas':'Herramientas'}</button>
          <button
            onClick={() => {setMarkerMode(false);setPendingPositionId(null);setEditMode(false)}}
            className={`
              flex h-10 items-center gap-2
              rounded-xl border px-4
              text-xs font-semibold
              transition
              ${
                editMode
                  ? `
                    border-orange-400/30
                    bg-orange-500/10
                    text-orange-300
                    hover:bg-orange-500/20
                  `
                  : `
                    border-violet-400/30
                    bg-violet-500/10
                    text-violet-300
                    hover:bg-violet-500/20
                  `
              }
            `}
          >
            {editMode ? (
              <Lock size={15} />
            ) : (
              <Unlock size={15} />
            )}

            {'Plano fijo'}
          </button>

          <button
            type="button"
            onClick={() => {setEditMode(false);setMarkerMode(current=>!current);setPendingPositionId(null)}}
            className={'flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition active:scale-95 '+(markerMode?'border-cyan-400 bg-cyan-500/20 text-cyan-200':'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20')}
            title="Elegir un escritorio y ubicarlo haciendo clic dentro del área"
          ><MapPinned size={15}/>{markerMode?'Terminar ubicación':'Ubicar puestos'}</button>
          {markerMode && selectedItem && selectedPositions.length > 0 && (
            <button
              type="button"
              onClick={arrangeSelectedArea}
              className="flex h-10 items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-200 transition hover:-translate-y-0.5 hover:border-emerald-300/60 hover:bg-emerald-500/20 active:translate-y-0 active:scale-95"
              title="Distribuir las posiciones reales del area seleccionada en filas, sin guardar automaticamente"
            >
              <LayoutGrid size={15} /> Organizar filas
            </button>
          )}
          <button
            onClick={saveLayout}
            disabled={saved && markersSaved}
            className="
              flex h-10 items-center gap-2
              rounded-xl
              bg-violet-600 px-4
              text-xs font-semibold text-white
              transition
              hover:bg-violet-500
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            <Save size={15} />

            Guardar
          </button>
        </div>
      </div>}

      {adminToolsVisible && floorColorPanelOpen && (
        <section aria-label="Acabados de pisos" className="rounded-xl border border-amber-300/25 bg-[#151a27] px-4 py-3 shadow-xl">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-sm font-bold text-amber-100">Acabados de pisos</p><p className="text-[11px] text-slate-400">Solo visual. Los cambios se guardan en este navegador.</p></div>
            <button type="button" onClick={() => {const next={...DEFAULT_FLOOR_COLORS};setFloorColors(next);try{localStorage.setItem(FLOOR_PALETTE_KEY,JSON.stringify(next))}catch{/* optional */}}} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white hover:bg-white/10">Colores originales</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {(Object.keys(FLOOR_COLORS) as FloorZone[]).map(zone => <label key={zone} className="flex min-w-0 flex-col gap-2 text-xs font-semibold text-slate-200">
              <span>{FLOOR_COLORS[zone].title}</span>
              <span className="flex items-center gap-2"><span className="h-7 w-9 shrink-0 rounded border border-white/20" style={{backgroundColor:floorColors[zone]}} aria-hidden="true"/><select aria-label={'Piso de '+FLOOR_COLORS[zone].title}
                className="w-full min-w-0 rounded-lg border border-white/15 bg-[#101827] px-2 py-2 text-[11px] text-white"
                value={floorColors[zone]} onChange={event => updateFloorColor(zone,event.target.value)}>
                {FLOOR_COLORS[zone].options.map(option => <option value={option.hex} key={option.hex}>{option.name}</option>)}
              </select></span>
            </label>)}
          </div>
        </section>
      )}

      {/* WORKSPACE */}

      <div className={fullView ? "flex min-h-0 flex-1 gap-2" : "flex min-h-[calc(100vh-160px)] gap-1"}>
        {/* MAPA */}

        <div
          ref={canvasRef}
          onMouseDown={event => { if (event.target === event.currentTarget) { setSelectedId(null); setSelectedPositionId(null) } }}
          onWheel={event => { if (event.ctrlKey) { event.preventDefault(); setZoom(value => Math.min(2, Math.max(.6, value + (event.deltaY < 0 ? .1 : -.1)))) } }}
          onPointerDown={event => { if ((event.shiftKey || event.button === 1) && !editMode && !markerMode) {event.preventDefault(); setPanning(true); event.currentTarget.setPointerCapture(event.pointerId)} }}
          onPointerMove={event => { if (panning) setPan(current => ({x:current.x+event.movementX,y:current.y+event.movementY})) }}
          onPointerUp={() => setPanning(false)}
          onPointerCancel={() => setPanning(false)}
          className="
            relative min-h-[calc(100vh-160px)] min-w-0 flex-1
            overflow-hidden rounded-2xl
            border border-white/[0.08]
            bg-[#090a13]
          "
          style={{
            backgroundImage: `
              linear-gradient(
                rgba(139,92,246,0.055) 1px,
                transparent 1px
              ),
              linear-gradient(
                90deg,
                rgba(139,92,246,0.055) 1px,
                transparent 1px
              ),
              linear-gradient(
                rgba(255,255,255,0.018) 1px,
                transparent 1px
              ),
              linear-gradient(
                90deg,
                rgba(255,255,255,0.018) 1px,
                transparent 1px
              )
            `,
            backgroundSize:
              '100px 100px, 100px 100px, 20px 20px, 20px 20px',
          }}
        >
          {/* HEADER DEL CANVAS */}

          <div className="pointer-events-none absolute left-5 top-5 z-20">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />

              <p className="text-xs font-semibold text-white">
                Piso 1
              </p>
            </div>

            <p className="mt-1 text-[10px] text-slate-600">
              IT Infrastructure Mapping Engine
            </p>
          </div>

          <div className="pointer-events-none absolute right-4 top-4 z-30 rounded-xl border border-sky-400/20 bg-[#101827]/90 px-3 py-2 text-[10px] text-slate-300">Ctrl + rueda: zoom · Shift + arrastrar: mover</div>
          <div className="absolute left-0 top-0" style={{ width:BASE_WIDTH,height:BASE_HEIGHT,transform:`translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin:'top left' }}>
          {/* Plano conceptual: capa decorativa opcional que no altera coordenadas,
              datos ni interacciones. Los muros exactos se definirán con mediciones reales. */}
          {floorPlanVisible && (
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
              <div className="absolute left-5 top-16 rounded-lg border border-sky-400/20 bg-[#0d2940]/80 px-3 py-2 text-[10px] font-semibold tracking-wide text-sky-200">PLANO CONCEPTUAL · NO A ESCALA</div>
              <div className="absolute left-[2%] right-[2%] top-[8%] bottom-[5%] rounded-2xl border-[5px] border-slate-500/35 shadow-[inset_0_0_22px_rgba(56,189,248,0.05)]" />
              {/* Fase 10C: pavimento continuo y circulación iluminada (solo vista). */}
              <div className="absolute left-[2.7%] right-[2.7%] top-[7.7%] bottom-[4.7%] rounded-2xl opacity-65" style={{backgroundImage:'repeating-linear-gradient(0deg, transparent 0px, transparent 34px, rgba(180,195,210,.055) 35px, transparent 36px), repeating-linear-gradient(90deg, transparent 0px, transparent 58px, rgba(180,195,210,.045) 59px, transparent 60px)',backgroundColor:'rgba(111,125,138,.055)'}} />
              <div style={{backgroundColor:floorColors.corridor}} className="absolute left-[17.52%] right-[1.84%] top-[32.47%] h-[17.01%] overflow-hidden rounded-lg border-y-[5px] border-slate-500/45 shadow-[inset_0_10px_20px_rgba(0,0,0,.20),0_0_18px_rgba(56,189,248,.09)]">
                <div className="absolute inset-0 opacity-35" style={{backgroundImage:'repeating-linear-gradient(90deg,transparent 0px, transparent 74px, rgba(165,191,209,.3) 75px, transparent 76px)'}} />
                <div className="absolute inset-x-3 top-2 h-px bg-cyan-100/25" />
                <div className="absolute inset-x-3 bottom-2 h-px bg-cyan-100/20" />
                <div className="relative flex h-full items-center justify-center text-[12px] font-bold uppercase tracking-[0.45em] text-slate-300/75">Pasillo principal</div>
              </div>
              {[[6,34],[25,34],[49,34],[72,34],[93,34],[9,48],[30,48],[62,48],[87,48]].map(([left,top],index)=><div key={'ambient-light-'+index} className="absolute h-2 w-2 rounded-full bg-amber-100/55 shadow-[0_0_17px_6px_rgba(254,225,169,.11)]" style={{left:left+'%',top:top+'%'}} />)}
              <div className="absolute left-[9%] bottom-[4%] -translate-x-1/2 rounded-t-lg border-x-[3px] border-t-[3px] border-emerald-400/40 bg-emerald-400/5 px-4 py-2 text-[10px] font-semibold tracking-wider text-emerald-200/80">Entrada · referencia</div>
            </div>
          )}

          {/* Unión visual opcional: solo contorno de selección, ambas áreas permanecen editables e independientes. */}
          {joinedPreview && joinedIds.length===2 && (()=>{
            const pair=joinedIds.map(id=>items.find(item=>item.id===id)).filter((item):item is MapItem=>Boolean(item))
            if(pair.length!==2)return null
            const left=Math.min(...pair.map(item=>item.x));const top=Math.min(...pair.map(item=>item.y))
            const right=Math.max(...pair.map(item=>item.x+item.width));const bottom=Math.max(...pair.map(item=>item.y+item.height))
            return <div className="pointer-events-none absolute z-30 rounded-xl border-[3px] border-dashed border-emerald-300/80 bg-emerald-500/5 shadow-[0_0_25px_rgba(52,211,153,0.18)]" style={{left:left-4,top:top-4,width:right-left+8,height:bottom-top+8}}><span className="absolute -top-8 left-0 rounded-lg bg-emerald-950 px-3 py-1 text-xs font-semibold text-emerald-200">Unión visual · sin fusionar datos</span></div>
          })()}
          {/* Fase 11B: offices are fixed clickable zones of a single plan.
              No independent MapObject cards, drag handles or side inspector. */}
          <div className="pointer-events-none absolute z-[21] rounded-xl border-[3px] border-slate-300/70" style={{left:25,top:85,width:2105,height:835}} aria-hidden="true" />
          {items.filter(item => item.id !== 'lobby-recruitment').map(item => (
            <button
              key={'zone-'+item.id}
              type="button"
              onClick={() => {setSelectedId(null);setSelectedPositionId(null);setPendingPositionId(null)}}
              aria-label={'Ver detalles de '+item.name}
              aria-pressed={selectedId===item.id}
              className={'absolute z-[22] rounded-md border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 '+(selectedId===item.id?'border-cyan-300/90 bg-cyan-400/10':'border-transparent hover:border-cyan-400/50 hover:bg-cyan-400/5')}
              style={{left:item.x+5,top:item.y+5,width:Math.max(30,item.width-10),height:Math.max(30,item.height-10)}}
            >
              <span className="pointer-events-none absolute left-2 top-2 max-w-[calc(100%-16px)] truncate rounded-md border border-slate-700/70 bg-[#071326]/90 px-2 py-1 text-[12px] font-semibold text-white shadow-md">{item.name}</span>
            </button>
          ))}
          {/* V2: Sin popups generales; solo ficha de posicion individual. */}

          {/* FASE 10I: matte floor for standard offices, behind the furniture. */}
          {officeVisual && <div className="pointer-events-none absolute inset-0 z-[11]" aria-hidden="true">
            {items.filter(item => item.id !== 'lobby-recruitment' && !item.id.startsWith('training')).map(item => <div key={'floor10i-'+item.id}
              className="absolute overflow-hidden rounded-sm"
              style={{left:item.x+7,top:item.y+7,width:Math.max(25,item.width-14),height:Math.max(25,item.height-14),backgroundColor:item.y < 350 ? floorColors.training : floorColors.common,
              backgroundImage:'repeating-linear-gradient(0deg,rgba(95,89,83,.08) 0,rgba(95,89,83,.08) 1px,transparent 1px,transparent 27px),repeating-linear-gradient(90deg,rgba(95,89,83,.07) 0,rgba(95,89,83,.07) 1px,transparent 1px,transparent 27px)'}} />)}
          </div>}
          {/* FASE 10E: un solo lienzo interno proporcional al area del lobby. */}
          {officeVisual && (
            <div className="pointer-events-none absolute inset-0 z-[14]" aria-hidden="true">
              {items.filter(item => item.id === 'lobby-recruitment').map(item => (
                <div key={'lobby-exact-'+item.id} className="absolute overflow-hidden rounded-lg" style={{left:item.x+8,top:item.y+8,width:Math.max(40,item.width-16),height:Math.max(40,item.height-16)}}>
                  <LobbyExactFit floorColor={floorColors.common} />
                </div>
              ))}
            </div>
          )}
          {/* FASE 10G: training rooms con la distribución aprobada.
              Cinco mesas largas de cuatro computadoras (20 posiciones),
              dos mesas superiores, tres inferiores, una mesa del trainer
              sin equipo y un proyector al frente mirando hacia el lobby. */}
          {officeVisual && (
            <div className="pointer-events-none absolute inset-0 z-[18]" aria-hidden="true">
              {items.filter(item => item.id.startsWith('training')).map(item => (
                <div key={'training-exact-'+item.id} className="absolute overflow-hidden rounded-lg" style={{left:item.x+8,top:item.y+8,width:Math.max(80,item.width-16),height:Math.max(80,item.height-16)}}>
                  <TrainingRoomExactFit name={item.name} floorColor={floorColors.common} />
                </div>
              ))}
            </div>
          )}
          {/* FASE 11C: oficina del CEO con layout ejecutivo fijo y coherente con la referencia aprobada. */}
          {officeVisual && (
            <div className="pointer-events-none absolute inset-0 z-[18]" aria-hidden="true">
              {items.filter(item => item.id === 'ceo-office').map(item => (
                <div key={'ceo-exact-'+item.id} className="absolute overflow-hidden rounded-lg" style={{left:item.x+8,top:item.y+8,width:Math.max(100,item.width-16),height:Math.max(100,item.height-16)}}>
                  <CEOOfficeExactFit floorColor={floorColors.common} />
                </div>
              ))}
            </div>
          )}

          {/* Dos equipos reales del VP, laptop y desktop; mobiliario del plano conservado. */}
          {officeVisual && items.filter(room => room.id === 'vp-finance').map(room => (
            <div key="vp-dual-equipment" className="pointer-events-none absolute z-[19]" style={{left:room.x+room.width*.32,top:room.y+room.height*.45}}>
              <span className="absolute -translate-x-1/2 rounded border border-slate-600 bg-[#0b192c]/90 px-1 text-[9px] font-bold text-white">Laptop</span>
              <span className="absolute translate-x-[34px] rounded border border-slate-600 bg-[#0b192c]/90 px-1 text-[9px] font-bold text-white">Desktop</span>
            </div>
          ))}
          {/* Indicador arquitectonico discreto: personal administrativo sin oficina.
              No genera posicion, codigo, popup ni escritura en PostgreSQL. */}
          {officeVisual && items.filter(room => room.id === 'hr-director').map(room => (
            <div key="temporary-admin-indicator" aria-label="Personal administrativo compartiendo oficina (referencia visual)"
              title="Personal administrativo sin oficina (solo referencia visual)"
              className="pointer-events-none absolute z-[20] flex items-center justify-center rounded-full border border-amber-200/40 bg-[#18283a]/75 shadow-sm"
              style={{left:room.x+room.width-23,top:room.y+48,width:15,height:15}}>
              <span className="h-[5px] w-[5px] rounded-full bg-amber-200/70" />
              <span className="ml-[1px] h-[5px] w-[5px] rounded-full bg-amber-200/70" />
            </div>
          ))}
          {/* Fase 11F: readable label over the director office; fixed zones are unchanged. */}
          {officeVisual && <div className="pointer-events-none absolute inset-0 z-[19]" aria-hidden="true">
            {items.filter(item=>item.id==='hr-director').map(item=><div key="hr-director-title" className="absolute rounded-md border border-slate-600/80 bg-[#0e192a]/95 px-2 py-1 text-center text-[13px] font-bold text-white shadow-md" style={{left:item.x+7,top:item.y+7,width:Math.max(88,item.width-14)}}>Director de RRHH</div>)}
          </div>}
          {/* FASE 10B: mobiliario 2D ilustrativo por tipo de habitación.
              No crea activos, usuarios, puestos ni vínculos en Supabase. */}
          {officeVisual && (
            <div className="pointer-events-none absolute inset-0 z-[12]" aria-hidden="true">
              {items.map(item => {
                const training = item.id.startsWith('training')
                const conference = item.id === 'conference-room'
                const kitchen = item.id === 'kitchen'
                const bathroom = item.id === 'bathroom'
                const lobby = item.id === 'lobby-recruitment'
                const executive = ['ceo','vp-finance','hr-director','hr-manager'].includes(item.id)
                const desks = lobby || conference || kitchen || bathroom || training || item.id === 'ceo-office' ? 0 : ['finance','hr-office'].includes(item.id) ? 4 : 1
                const cols = ['finance','hr-office'].includes(item.id) ? 2 : 1
                return <div key={'furniture-'+item.id} className="absolute overflow-hidden rounded-lg" style={{left:item.x+9,top:item.y+61,width:Math.max(60,item.width-18),height:Math.max(42,item.height-76)}}>
                  <div className="absolute inset-0 rounded-lg bg-[repeating-linear-gradient(90deg,rgba(209,170,117,0.06)_0px,rgba(209,170,117,0.06)_1px,transparent_1px,transparent_28px)]"/>
                  {lobby ? null : bathroom ? <div className="relative flex h-full items-center justify-center p-2">
                    <div className="relative h-14 w-11 rounded-lg border-2 border-slate-400 bg-gradient-to-b from-slate-100 to-slate-400 shadow-inner"><div className="absolute left-1/2 top-2 h-7 w-5 -translate-x-1/2 rounded-full border-2 border-slate-300 bg-slate-500"/></div>
                  </div> : kitchen ? <div className="relative h-full p-2">
                    <div className="absolute right-2 top-3 h-5 w-[42%] rounded border border-slate-400 bg-slate-500 shadow-md"/>
                    <div className="absolute left-[20%] top-[33%] h-12 w-12 rounded-full border-4 border-amber-200/40 bg-[#987149] shadow-lg"><span className="absolute inset-[25%] rounded-full bg-[#bb976b]"/></div>
                    <div className="absolute bottom-4 right-4 h-5 w-5 rounded-full bg-emerald-700 shadow-[0_0_12px_rgba(52,211,153,.5)]"/>
                  </div> : conference ? <div className="absolute left-[12%] top-[25%] h-[48%] w-[76%] rounded-2xl border border-amber-200/40 bg-gradient-to-br from-[#946b45] to-[#39291f] shadow-[0_8px_16px_rgba(0,0,0,.5)]"><div className="absolute left-1/2 top-1/2 h-5 w-10 -translate-x-1/2 -translate-y-1/2 rounded bg-slate-800 shadow-sm"/><div className="absolute -top-3 flex w-full justify-around">{Array.from({length:6},(_,n)=><span key={n} className="h-3 w-4 rounded-t-md bg-slate-600 shadow"/>)}</div><div className="absolute -bottom-3 flex w-full justify-around">{Array.from({length:6},(_,n)=><span key={n} className="h-3 w-4 rounded-b-md bg-slate-600 shadow"/>)}</div></div> :
                  <div className="relative grid h-full items-center justify-items-center gap-x-1 gap-y-2 p-2" style={{gridTemplateColumns:`repeat(${cols}, minmax(0,1fr))`}}>
                    {Array.from({length:desks},(_,n)=><div key={n} className={'relative rounded-md border border-amber-100/40 bg-gradient-to-b from-[#d5b48b] to-[#805d3c] shadow-[0_4px_10px_rgba(0,0,0,.5)] '+(training?'h-10 w-[75%] max-w-[54px]':executive?'h-14 w-[78%] max-w-28':'h-11 w-[75%] max-w-[65px]')}>
                      <div className="absolute left-1/2 top-1 h-3.5 w-5 -translate-x-1/2 rounded-sm border border-sky-100/60 bg-gradient-to-b from-sky-300 to-blue-700 shadow-[0_0_8px_rgba(56,189,248,.7)]"/>
                      <div className="absolute left-1/2 top-[18px] h-1 w-2 -translate-x-1/2 rounded bg-slate-700"/>
                      <div className="absolute bottom-[-9px] left-1/2 h-3 w-5 -translate-x-1/2 rounded-b-lg border border-slate-400 bg-gradient-to-b from-slate-600 to-slate-900 shadow-md"/>
                    </div>)}
                    {executive && <div className="absolute bottom-[14%] right-[12%] h-7 w-14 rounded-xl border border-slate-400/30 bg-gradient-to-r from-slate-700 to-slate-900 shadow-lg"/>}
                  </div>}
                </div>
              })}
              <div className="absolute bottom-16 left-6 rounded-lg border border-fuchsia-400/30 bg-[#160b26]/90 px-3 py-2 text-[10px] font-medium text-fuchsia-100">Mobiliario conceptual · No representa inventario verificado</div>
            </div>
          )}

          {/* FASE 11A: shared architectural shell. Rooms remain interactive
              through MapObject but all walls share a single master perimeter. */}
          {floorPlanVisible && (
            <div className="pointer-events-none absolute inset-0 z-[17]" aria-hidden="true">
              <div className="absolute" style={{left:25,top:85,width:2105,height:835,
                border:'7px solid #64748b',borderRadius:8,
                boxShadow:'inset 0 0 0 2px rgba(186,230,253,.20),0 12px 30px rgba(0,0,0,.50)'}} />
              {/* The full-height lobby partition */}
              <div className="absolute w-[7px] bg-gradient-to-r from-slate-600 to-slate-400" style={{left:376,top:85,height:835}} />
              {/* Upper offices and lower training rooms connect to the same hallway */}
              <div className="absolute h-[7px] bg-gradient-to-b from-slate-500 to-slate-700" style={{left:380,top:311,width:1750}} />
              <div className="absolute h-[7px] bg-gradient-to-b from-slate-500 to-slate-700" style={{left:380,top:476,width:1750}} />
              {items.filter(item => UPPER_ROOM_IDS.includes(item.id)).map(item => item.x).filter(x => x > 380).sort((a,b)=>a-b).map(x =>
                <div key={'upper-divider-'+x} className="absolute w-[6px] bg-gradient-to-r from-slate-600 to-slate-400" style={{left:x-3,top:85,height:230}} />
              )}
              {[790,1200,1610].map(x =>
                <div key={'lower-divider-'+x} className="absolute w-[6px] bg-gradient-to-r from-slate-600 to-slate-400" style={{left:x-3,top:480,height:440}} />
              )}
              {items.filter(item=>item.id!=='lobby-recruitment').map(item=>{
                const top=item.y<350
                const x=item.x+item.width/2
                return <div key={'master-door-'+item.id} className="absolute z-[1] rounded-sm border-x border-sky-300/30 bg-[#101827]"
                  style={{left:x-23,top:top?308:473,width:46,height:11}} />
              })}
            </div>
          )}

          {/* FASE 6: accesos de referencia del plano. Son solo marcadores visuales,
              no puertas medidas ni vinculaciones reales. No interceptan los clics. */}
          {floorPlanVisible && accessVisible && (
            <div className="pointer-events-none absolute inset-0 z-[19]" aria-hidden="true">
              {items.map(item => {
                const upper = item.y < 260
                const doorX = item.x + item.width / 2
                const doorY = upper ? item.y + item.height - 3 : item.y - 3
                return (
                  <div key={'access-'+item.id} className="absolute" style={{left:doorX,top:doorY,transform:'translate(-50%, -50%)'}}>
                    <div className="relative flex h-7 w-12 items-center justify-center rounded-b-xl border-x-2 border-b-2 border-emerald-300/70 bg-[#061927]/95 shadow-[0_0_18px_rgba(52,211,153,0.35)]">
                      <span className="text-[9px] font-bold tracking-wide text-emerald-200">ACCESO</span>
                    </div>
                  </div>
                )
              })}
              <div className="absolute left-[48%] top-[47%] flex -translate-x-1/2 items-center gap-2 rounded-full border border-sky-400/25 bg-[#07172b]/90 px-3 py-1 text-[10px] font-semibold tracking-wider text-sky-200/80">
                <span aria-hidden="true">←</span> CIRCULACIÓN CENTRAL <span aria-hidden="true">→</span>
              </div>
              <div className="absolute bottom-10 left-6 rounded-lg border border-amber-400/25 bg-[#261909]/85 px-3 py-2 text-[10px] font-medium text-amber-100/90">
                Accesos de referencia · pendientes de validar en el plano físico
              </div>
            </div>
          )}

          {/* Piso 1: busqueda de codigos y datos reales, sin duplicar el buscador global. */}
          <div className="absolute right-[38px] top-[90px] z-[58]" onPointerDown={e=>e.stopPropagation()}>
            <div className="flex items-center gap-1 rounded-lg border border-sky-400/50 bg-[#102038] shadow-xl">
              <input aria-label="Buscar posiciones del Piso 1" placeholder="Buscar puesto, usuario, PCNAME o serial..." value={p1Search}
                onFocus={()=>setP1ResultsOpen(true)}
                onChange={e=>{setP1Search(e.target.value);setP1ResultsOpen(true)}}
                onKeyDown={e=>{if(e.key==='Enter' && p1Matches[0])focusP1Seat(p1Matches[0]);if(e.key==='Escape')setP1ResultsOpen(false)}}
                className="w-[250px] bg-transparent px-3 py-2 text-xs text-white outline-none placeholder:text-slate-400" />
              {p1Search && <button type="button" aria-label="Limpiar búsqueda Piso 1" onClick={()=>{setP1Search('');setP1ResultsOpen(false)}} className="px-2 text-xs text-slate-200 hover:text-white">✕</button>}
            </div>
            {p1ResultsOpen && clean(p1Search) && <div className="mt-1 max-h-64 w-[310px] overflow-y-auto rounded-lg border border-cyan-400/35 bg-[#091529] p-1 text-xs text-white shadow-2xl">
              {p1Matches.length ? p1Matches.slice(0,12).map(match=><button type="button" key={match.code} onClick={()=>focusP1Seat(match)} className="flex w-full items-center justify-between gap-2 rounded px-2 py-2 text-left hover:bg-cyan-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"><strong>{match.code}</strong><span className="max-w-[150px] truncate text-[10px] text-slate-300">{match.name}</span></button>) : <p className="px-2 py-2 text-slate-400">No hay posiciones vinculadas que coincidan.</p>}
              {p1Matches.length>12&&<p className="px-2 py-1 text-[10px] text-slate-400">Mostrando 12 de {p1Matches.length} coincidencias</p>}
            </div>}
          </div>
          {/* Conciliacion solo lectura: el catalogo del Piso 1 es de 81 puestos.
              No crea posiciones ni deduce que los monitores ilustrados son vinculaciones fisicas. */}
          <details className="absolute right-[390px] top-[90px] z-[69] w-[270px] rounded-lg border border-amber-400/35 bg-[#0b172b]/95 text-slate-100 shadow-xl" onPointerDown={e=>e.stopPropagation()}>
            <summary className="cursor-pointer select-none px-3 py-2 text-[11px] font-semibold text-amber-200">Conciliacion de puestos P1</summary>
            <div className="space-y-2 border-t border-white/10 px-3 py-2 text-[11px] leading-relaxed">
              {positionsState !== 'ready' ? <p>Consultando posiciones reales. No se muestra un resultado sin datos completos.</p> : (() => {
                const expected = [
                  ...[1,2,3].flatMap(pod => Array.from({length:20},(_,index)=>`P1-T${pod}-${String(index+1).padStart(2,'0')}`)),
                  ...Array.from({length:4},(_,index)=>`P1-R0${index+1}`),
                  'P1-EX01','P1-EX02','P1-REC01','P1-REC02',
                  ...Array.from({length:4},(_,index)=>`P1-H0${index+1}`),
                  'P1-HRG','P1-HRD','P1-VP1','P1-VP2',
                  ...Array.from({length:4},(_,index)=>`P1-F0${index+1}`),'P1-CEO',
                ]
                const floor = positions.filter(p => p.location?.floorNumber === 1)
                const codes = new Set(floor.map(p=>p.code))
                const missing = expected.filter(code=>!codes.has(code))
                const extras = floor.filter(p=>!expected.includes(p.code)).map(p=>p.code)
                const finance = floor.filter(p=>/^P1-F0[1-4]$/.test(p.code)).length
                const duplicate = floor.filter((p,index)=>floor.findIndex(other=>other.code===p.code)!==index).map(p=>p.code)
                return <>
                  <p><strong>Registros del piso:</strong> {floor.length} / 81 esperados.</p>
                  <p><strong>Codigos del catalogo presentes:</strong> {expected.length-missing.length}/81.</p>
                  <p className="text-amber-200"><strong>Director RR. HH.:</strong> codigo esperado P1-HRD (1 posicion).</p>
                  <p className="text-amber-200"><strong>Finanzas:</strong> {finance} puestos P1-F01 a P1-F04. VP separado: P1-VP1 (laptop) y P1-VP2 (desktop).</p>
                  {missing.length>0 && <p className="text-rose-200"><strong>Faltantes:</strong> {missing.join(', ')}</p>}
                  {extras.length>0 && <p className="text-rose-200"><strong>Fuera del catalogo:</strong> {extras.join(', ')}</p>}
                  {duplicate.length>0 && <p className="text-rose-200"><strong>Codigos duplicados:</strong> {duplicate.join(', ')}</p>}
                  {!missing.length && !extras.length && !duplicate.length && floor.length===81 && <p className="text-emerald-300">Catalogo de 81 codigos conciliado. La ubicacion fisica sigue pendiente de validar.</p>}
                </>
              })()}
              <p className="border-t border-white/10 pt-2 text-slate-400">Solo lectura. Sin modificar PostgreSQL, usuarios, equipos ni coordenadas.</p>
            </div>
          </details>
          {/* Leyenda de estados basada en vínculos reales; no se infiere el checklist. */}
          <div className="pointer-events-none absolute bottom-10 right-5 z-[39] flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-slate-600/50 bg-[#071326]/85 px-2 py-1 text-[9px] text-slate-200" aria-label="Leyenda de estados del Piso 1">
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-sky-500"/>Equipo y usuario</span>
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400"/>Equipo sin usuario</span>
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-500"/>Sin equipo</span>
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-400"/>Sin vínculo</span>
          </div>
          {/* Puestos individuales: anclas estables al centro de cada monitor, sin pines sueltos. */}
          {officeVisual && !editMode && (
            <div className="pointer-events-none absolute inset-0 z-[36]">
              {items.flatMap(item => {
                const training = /^training-[123]$/.test(item.id)
                const desks = training ? 20 : item.id==='finance' ? 4 : item.id==='hr-office' ? 4 : item.id==='vp-finance' ? 2 : ['ceo-office','hr-manager','hr-director'].includes(item.id) ? 1 : item.id==='lobby-recruitment' ? 8 : 0
                return Array.from({length:desks}, (_,index) => {
                  const position = positionAtDesk(item,index,positions)
                  const code = position?.code ?? (training ? `P1-T${item.id.slice(-1)}-${String(index+1).padStart(2,'0')}` : item.id==='lobby-recruitment' ? (index<4 ? `P1-R0${index+1}` : index<6 ? `P1-EX0${index-3}` : `P1-REC0${index-5}`) : `${item.name}-${index+1}`)
                  let px=0,py=0
                  if(training){
                    // Coordenadas extraidas del SVG TrainingRoomExactFit (viewBox 390x500).
                    // Cinco mesas de cuatro: 2 superiores y 3 inferiores; orden 01..20.
                    const table = Math.floor(index / 4)
                    const row = index % 4
                    const tableX = [133,232,89,180,271][table]
                    const tableY = table < 2 ? 34 : 224
                    px = item.x + 8 + ((tableX + 17.5) / 390) * (item.width - 16)
                    py = item.y + 8 + ((tableY + 17 + row * 38) / 500) * (item.height - 16)
                  }else if(item.id==='lobby-recruitment'){
                    const coords:[[number,number],[number,number],[number,number],[number,number],[number,number],[number,number],[number,number],[number,number]] = [[.38,.075],[.38,.188],[.38,.302],[.38,.415],[.67,.082],[.825,.082],[.665,.778],[.665,.872]]
                    px=item.x+8+coords[index][0]*(item.width-16)
                    py=item.y+8+coords[index][1]*(item.height-16)
                  }else if(item.id==='finance'){
                    const coords=[[.32,.43],[.69,.43],[.32,.72],[.69,.72]]
                    px=item.x+item.width*coords[index][0];py=item.y+item.height*coords[index][1]
                  }else if(item.id==='vp-finance'){
                    px=item.x+item.width*(index===0?.36:.65);py=item.y+item.height*.52
                  }else if(desks===4){
                    px=item.x+item.width*(index%2===0?.32:.69);py=item.y+item.height*(index<2?.45:.72)
                  }else{px=item.x+item.width*.5;py=item.y+item.height*.52}
                  const search = clean(p1Search)
                  const searchable = clean([code,position?.inventoryPerson?.firstName,position?.inventoryPerson?.lastName,position?.equipment?.pcName,position?.equipment?.serial].filter(Boolean).join(' '))
                  const matches = !search || searchable.includes(search)
                  const hasEq=Boolean(position?.equipment)
                  const hasUser=Boolean(position?.inventoryPerson)
                  // Compact seat label positioned BELOW the monitor, not over furniture.
                  // Checklist completeness cannot be inferred from equipment alone.
                  const dotClass = !position ? 'bg-slate-400' : !hasEq ? 'bg-rose-500' : hasUser ? 'bg-sky-500' : 'bg-amber-400'
                  const current=pinnedComputer?.roomId===item.id&&pinnedComputer.index===index
                  const spotlight=p1Spotlight===`${item.id}:${index}`
                  return <button key={'p1-seat-'+item.id+'-'+index} type="button"
                    aria-label={'Consultar '+(position?.code ?? (item.id==='hr-director'?'Director de RRHH sin vínculo':code))}
                    title={(position?.code ?? code)+(position?' · Posición real':' · Sin vínculo validado')}
                    onClick={e=>{e.stopPropagation();setPinnedComputer(current?null:{roomId:item.id,index,x:px,y:py});setP1Spotlight(current?null:`${item.id}:${index}`);setSelectedId(null);setChecklistOpen(false);setHoverComputer(null)}}
                    className={'group pointer-events-auto absolute z-[37] h-[30px] w-[34px] -translate-x-1/2 -translate-y-[42%] rounded-lg border transition-[box-shadow,background-color] hover:border-cyan-200 hover:bg-cyan-400/25 hover:shadow-[0_0_18px_5px_rgba(34,211,238,.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 '+(matches?'':'opacity-35')+' '+(spotlight?'!z-[48] !border-cyan-100 bg-cyan-400/35 ring-[5px] ring-cyan-300 shadow-[0_0_0_10px_rgba(6,182,212,.30),0_0_26px_13px_rgba(34,211,238,.65)] animate-pulse':'')}
                    style={{left:px,top:py}}>
                    <span className={'pointer-events-none absolute right-[-2px] top-[-2px] h-[11px] w-[11px] rounded-full border-[2px] border-white/90 shadow-[0_0_7px_2px_rgba(255,255,255,.20)] '+dotClass}/>
                    <span className={'pointer-events-none absolute left-1/2 top-[17px] -translate-x-1/2 whitespace-nowrap rounded-[3px] border px-[2px] py-[1px] text-[6px] font-bold leading-[8px] shadow-sm '+(current?'border-cyan-300 bg-cyan-800 text-white':'border-slate-500/80 bg-[#0b192c]/95 text-white group-hover:border-cyan-300')}>
                      {item.id==='hr-director' && !position ? 'SIN VINCULO' : training ? `T${item.id.slice(-1)}-${String(index+1).padStart(2,'0')}` : item.id==='lobby-recruitment' ? (index<4?`R${String(index+1).padStart(2,'0')}`:index<6?`EX${String(index-3).padStart(2,'0')}`:`REC${String(index-5).padStart(2,'0')}`) : (position?.code ?? code).replace(/^P1-/,'')}
                    </span>
                  </button>
                })
              })}
            </div>
          )}


          {/* Marcadores vinculados a posiciones reales. Coordenadas editables, guardadas
              SOLO en este navegador; nunca modifica asignaciones de Supabase. */}
          {false && !editMode && selectedItem && positionsState==='ready' && selectedPositions.length>0 && (
            <div className={'absolute z-30 rounded-xl border p-1 shadow-xl '+(markerMode?'border-cyan-400/70 bg-[#0a182a]/90':'border-violet-400/25 bg-[#0a1629]/45')}
              style={{left:selectedItem!.x+8,top:selectedItem!.y+61,width:Math.max(95,selectedItem!.width-16),height:Math.max(60,selectedItem!.height-70)}}
              onMouseDown={e=>e.stopPropagation()}
              onClick={e=>{
                if(!markerMode || !pendingPositionId)return
                const rect=e.currentTarget.getBoundingClientRect()
                const x=markerLimit((e.clientX-rect.left)/rect.width*100)
                const y=markerLimit((e.clientY-rect.top)/rect.height*100)
                setMarkers(current=>({...current,[pendingPositionId]:{x,y}}))
                setMarkersSaved(false)
                setSelectedPositionId(pendingPositionId)
                setPendingPositionId(null)
              }}
              title={markerMode&&pendingPositionId?'Haz clic donde está físicamente el puesto':''}
            >
              {selectedPositions.slice(0,60).map((p,index)=>{
                const location=markers[p.id]??{x:12+(index%5)*19,y:22+Math.floor(index/5)*17}
                const active=selectedPositionId===p.id
                const placing=pendingPositionId===p.id
                return <button key={p.id} type="button" title={p.code+(placing?' · Pulsa en el punto donde irá':'')}
                  aria-label={'Escritorio '+p.code} aria-pressed={active}
                  onClick={e=>{e.stopPropagation();setSelectedPositionId(p.id);if(markerMode)setPendingPositionId(p.id)}}
                  className={'absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border text-xs font-bold shadow-lg transition-transform hover:scale-110 active:scale-95 '+(placing?'z-20 border-yellow-200 bg-amber-500 text-black ring-2 ring-amber-300/50':active?'z-10 border-violet-200 bg-violet-600 text-white ring-2 ring-violet-300/40':p.equipment?'border-cyan-400/70 bg-cyan-900/90 text-cyan-100':'border-white/25 bg-[#22304b] text-slate-200')}
                  style={{left:`${location.x}%`,top:`${location.y}%`}}
                >{index+1}</button>
              })}
              {markerMode&&<div className="pointer-events-none absolute bottom-0 left-0 right-0 rounded-b-xl bg-black/60 px-2 py-1 text-center text-[9px] font-semibold text-cyan-200">{pendingPositionId?'Haz clic en la ubicación del puesto':'Selecciona un número y luego su ubicación'}</div>}
              {selectedPositions.length>60&&<div className="pointer-events-none absolute right-1 top-1 rounded bg-amber-900/80 p-1 text-[9px] text-amber-100">Mostrando 60</div>}
            </div>
          )}

          {/* ESTADO DE EDICIÓN */}

          <div className="pointer-events-none absolute bottom-4 left-4 z-20">
            <div
              className={`
                rounded-lg border px-3 py-2
                text-[10px] font-semibold uppercase tracking-wider
                backdrop-blur
                ${
                  editMode
                    ? `
                      border-orange-400/20
                      bg-orange-500/10
                      text-orange-300
                    `
                    : `
                      border-white/[0.06]
                      bg-black/30
                      text-slate-500
                    `
                }
              `}
            >
              {editMode ? '● EDIT MODE · Arrastra y redimensiona' : markerMode ? '● UBICAR PUESTOS · Selecciona y marca' : '● VIEW MODE · Mapa bloqueado'}
            </div>
          </div>
          </div>
          {/* Ficha de puesto P1: fuera del lienzo escalado para mantener tamano legible. */}
          {!editMode && pinnedComputer && (() => {
            const room = items.find(item => item.id === pinnedComputer.roomId)
            if (!room) return null
            const position = positionAtDesk(room, pinnedComputer.index, positions)
            const review = position && reviewsLoaded ? reviewSummaries.find(item=>item.positionId===position.id) : null
            const equipment = position?.equipment
            const person = position?.inventoryPerson
            const status = equipment?.status || position?.status || null
            const broken = Boolean(status && /damage|dañad|broken|repair|averia/i.test(status))
            const caption = !position ? 'Sin vinculo registrado' : broken ? 'Equipo con incidencia' : !equipment ? 'Sin equipo vinculado' : person ? 'Equipo y usuario vinculados' : 'Equipo vinculado · sin usuario'
            const field = (label:string, value:string|null|undefined) => <div className="flex min-w-0 justify-between gap-3 border-b border-white/[0.07] py-1.5"><dt className="shrink-0 text-slate-400">{label}</dt><dd className="min-w-0 break-words text-right font-medium text-slate-100">{value || 'No registrado'}</dd></div>
            return <aside role="dialog" aria-label="Ficha de posicion del Piso 1" className="absolute right-3 top-[60px] z-[75] max-h-[calc(100%-75px)] w-[min(336px,calc(100%-24px))] overflow-y-auto rounded-xl border border-cyan-400/40 bg-[#091529]/95 p-4 text-slate-100 shadow-[0_18px_55px_rgba(0,0,0,.75)] backdrop-blur-xl" onPointerDown={e=>e.stopPropagation()}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Piso 1 · Posicion individual</p><h3 className="mt-1 break-words text-base font-bold">{position?.code || (room.id === 'hr-director' ? 'Director RR. HH. · sin vinculo' : room.name)}</h3><p className="mt-1 text-[11px] text-slate-400">{room.name}</p></div>
                <button type="button" aria-label="Cerrar ficha de posicion" className="shrink-0 rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-sm hover:bg-white/20" onClick={()=>{setPinnedComputer(null);setChecklistOpen(false)}}>✕</button>
              </div>
              <p className={'mt-3 rounded-lg border px-3 py-2 text-xs font-semibold '+(broken?'border-rose-400/30 bg-rose-500/15 text-rose-200':equipment?'border-sky-400/30 bg-sky-500/10 text-sky-100':'border-amber-400/20 bg-amber-500/10 text-amber-100')}>{caption}</p>
              <dl className="mt-3 text-xs">
                {field('Codigo',position?.code || 'Sin vinculo')}
                {field('PCNAME',equipment?.pcName)}
                {field('Serial',equipment?.serial)}
                {field('Equipo',equipment ? [equipment.brand,equipment.model].filter(Boolean).join(' ') : 'Sin equipo vinculado')}
                {field('Usuario',person ? `${person.firstName} ${person.lastName}` : 'Sin usuario asignado')}
                {field('Estado registrado',status || 'Sin estado detallado')}
              </dl>
              <div className="mt-3 rounded-lg border border-amber-400/20 bg-amber-500/[0.08] p-2 text-[10px] leading-relaxed text-amber-100">La posicion se obtiene del registro real. Su ubicacion sobre el dibujo sigue siendo ilustrativa hasta validar fisicamente la correspondencia.</div>
              <div className="mt-3 rounded-lg border border-white/10 bg-[#0d213a]/80 p-2.5 text-xs">
                <div className="flex items-center justify-between gap-2"><strong className="text-cyan-200">Checklist real</strong><span className="text-slate-300">{!position?'Sin vínculo':!reviewsLoaded?'No disponible':review ? `${review.completed}/${review.total} revisados` : 'Sin revisión registrada'}</span></div>
                {position && <button type="button" onClick={()=>setChecklistOpen(value=>!value)} className="mt-2 w-full rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-left text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20">{checklistOpen?'Ocultar checklist':'Abrir checklist de esta posición'}</button>}
                {!position && <p className="mt-2 text-amber-200">No se permite editar un puesto sin código oficial vinculado.</p>}
              </div>
              {position && <button type="button" onClick={()=>{setP1EditorOpen(true);setChecklistOpen(true)}} className="mt-3 w-full rounded-lg bg-gradient-to-r from-violet-700 to-fuchsia-700 px-3 py-2.5 text-xs font-bold text-white hover:brightness-110">Abrir editor de posición</button>}
              {checklistOpen && !p1EditorOpen && position && <div className="mt-3 min-w-0 rounded-lg border border-cyan-400/20 bg-[#071323] p-2">
                <p className="mb-2 text-[10px] leading-relaxed text-slate-300">Mismo checklist que Usuarios / Posiciones. Los cambios solo se guardan al confirmar dentro del componente.</p>
                {checklistLoading ? <p className="text-xs text-slate-300">Consultando accesorios...</p> : checklistError ? <p role="alert" className="text-xs text-rose-300">{checklistError}</p> : <PositionChecklist key={position.id} positionId={position.id} positionCode={position.code} main={position.equipment} accessories={checklistAccessories} onReviewSaved={refreshChecklist} />}
              </div>}
            </aside>
          })()}
        </div>

        {/* Editor ampliado coherente con otros pisos; sin asignacion automática. */}
        {p1EditorOpen && pinnedComputer && checklistPosition && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-3" onClick={()=>setP1EditorOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Editar posición Piso 1" className="flex max-h-[94vh] w-full max-w-[900px] flex-col rounded-2xl border border-cyan-500/40 bg-[#08162d] text-slate-100 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <header className="flex items-start justify-between border-b border-white/10 p-5">
              <div><p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Piso 1 · Principal</p><h2 className="mt-1 text-xl font-bold">Editar posición</h2><p className="mt-1 text-sm text-slate-300">{checklistPosition.code}</p></div>
              <button type="button" aria-label="Cerrar editor" onClick={()=>setP1EditorOpen(false)} className="rounded-lg border border-white/20 p-2">✕</button>
            </header>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              <div className="rounded-lg border border-cyan-500/30 bg-cyan-900/20 p-3 text-xs">Posición oficial: <strong>{checklistPosition.code}</strong> · Vinculada por código a PostgreSQL. No se reasignan usuarios ni equipos desde este editor.</div>
              <div className="rounded-lg border border-white/10 bg-[#10223d] p-3 text-sm"><p>Usuario: {checklistPosition.inventoryPerson ? `${checklistPosition.inventoryPerson.firstName} ${checklistPosition.inventoryPerson.lastName}`:'Sin usuario asignado'}</p><p className="mt-2">PCNAME: {checklistPosition.equipment?.pcName || 'No registrado'}</p><p className="mt-2">Serial: {checklistPosition.equipment?.serial || 'No registrado'}</p></div>
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-200">Checklist compartido con Usuarios / Posiciones. El inventario solo se mueve cuando se confirma en el propio checklist.</div>
              <section className="rounded-lg border border-cyan-500/30 p-3"><h3 className="mb-3 text-sm font-bold">Checklist de equipamiento · {checklistPosition.code}</h3>
                {checklistLoading ? <p>Consultando componentes...</p> : checklistError ? <p className="text-rose-300">{checklistError}</p> : <PositionChecklist key={checklistPosition.id} positionId={checklistPosition.id} positionCode={checklistPosition.code} main={checklistPosition.equipment} accessories={checklistAccessories} onReviewSaved={refreshChecklist}/>}
              </section>
            </div>
            <footer className="border-t border-white/10 p-4"><button type="button" onClick={()=>setP1EditorOpen(false)} className="w-full rounded-lg border border-slate-500/60 py-2.5 text-sm">Cerrar sin guardar</button></footer>
          </div>
        </div>}
        {/* INSPECTOR */}


      </div>
    </div>
  )
}


// Fase 13A: navigator separates floors and wings without changing floor-one data.
export default function MapCanvas() {
  const [section,setSection] = useState<string>(()=>{
    try { const stored=localStorage.getItem('it-hub-selected-floor-wing-v1'); return stored && /^(1|[234]-(Oeste|Este))$/.test(stored)?stored:'1' }
    catch {return '1'}
  })
  // Global live position inventory: grouped by true floor and wing, never by guessed names.
  const [globalTerm, setGlobalTerm] = useState('')
  const [globalResultsOpen, setGlobalResultsOpen] = useState(false)
  const [globalPositions, setGlobalPositions] = useState<LivePosition[]>([])
  const [globalPositionsError, setGlobalPositionsError] = useState('')
  const [globalLoading, setGlobalLoading] = useState(true)
  const [positionCounts, setPositionCounts] = useState<Record<string, number>>({})
  const [inventoryLoaded, setInventoryLoaded] = useState(false)
  useEffect(() => {
    let active = true
    const refresh = async () => {
      try {
        const response = await apiRequest('/positions', { cache: 'no-store' })
        if (!response.ok) throw new Error('No se pudieron consultar posiciones')
        const items: unknown = await response.json()
        if (!Array.isArray(items)) throw new Error('Respuesta incompatible')
        const counts: Record<string, number> = {}
        for (const item of items as LivePosition[]) {
          const floor = item.location?.floorNumber
          const wingRaw = clean(item.location?.wing || item.wing)
          const wing = ['west','oeste'].includes(wingRaw) ? 'Oeste' : ['east','este'].includes(wingRaw) ? 'Este' : null
          const key = floor === 1 ? '1' : ([2,3,4].includes(Number(floor)) && wing ? `${floor}-${wing}` : null)
          if (key) counts[key] = (counts[key] || 0) + 1
        }
        if (active) { setPositionCounts(counts); setInventoryLoaded(true);setGlobalPositions(items as LivePosition[]);setGlobalPositionsError('');setGlobalLoading(false) }
      } catch { if (active) {setInventoryLoaded(false);setGlobalLoading(false);setGlobalPositionsError('No se pudo consultar /positions.');} }
    }
    void refresh()
    window.addEventListener('focus', refresh)
    return () => { active = false; window.removeEventListener('focus', refresh) }
  }, [])
  // Receives cross-floor search requests already dispatched by FloorSectorView.
  useEffect(() => {
    const onNavigate = (event: Event) => {
      const detail = (event as CustomEvent<{floor?: number; wing?: string}>).detail
      const floor = Number(detail?.floor)
      const wing = detail?.wing
      if (![2,3,4].includes(floor) || !['Oeste','Este'].includes(String(wing))) return
      const key = `${floor}-${wing}`
      setSection(key)
      try { localStorage.setItem('it-hub-selected-floor-wing-v1', key) } catch {}
    }
    window.addEventListener('it-hub:navigate-position', onNavigate)
    return () => window.removeEventListener('it-hub:navigate-position', onNavigate)
  }, [])
  const globalResults = useMemo(() => {
    const term=clean(globalTerm)
    if(!term) return []
    return globalPositions.filter(p=> clean([p.code,p.name,p.inventoryPerson?.firstName,p.inventoryPerson?.lastName,p.equipment?.pcName,p.equipment?.serial].filter(Boolean).join(' ')).includes(term)).slice(0,30)
  },[globalTerm,globalPositions])
  const goToGlobalPosition = (p:LivePosition) => {
    const floor=Number(p.location?.floorNumber)
    const rawWing=clean(p.location?.wing || p.wing)
    const wing=['west','oeste'].includes(rawWing)?'Oeste':['east','este'].includes(rawWing)?'Este':null
    if(floor!==1 && (![2,3,4].includes(floor)||!wing)) {setGlobalPositionsError('El puesto no tiene sector identificable.');return}
    const key=floor===1?'1':`${floor}-${wing}`
    setSection(key)
    try {localStorage.setItem('it-hub-selected-floor-wing-v1',key)} catch {}
    setGlobalResultsOpen(false)
    if(floor===1) {
      // El Piso 1 permanece montado incluso si otro piso estaba seleccionado.
      window.dispatchEvent(new CustomEvent('it-hub:p1-global-focus',{detail:{code:p.code}}))
    } else {
      try {sessionStorage.setItem('it-hub-map-pending-focus',JSON.stringify({code:p.code,floor,wing}))}catch{}
    }
  }
  const options = [
    {value:'1',label:'Piso 1 · Principal'},
    ...([2,3,4] as const).flatMap(floor=>(['Oeste','Este'] as const).map(wing=>({value:`${floor}-${wing}`,label:`Piso ${floor} · Lado ${wing}`}))),
  ]
  function selectSection(value:string) {
    setSection(value)
    try {localStorage.setItem('it-hub-selected-floor-wing-v1',value)}catch{}
  }
  const parts=section.split('-')
  const floor=Number(parts[0]) as 2|3|4
  const wing=parts[1] as 'Oeste'|'Este'
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#101827] px-4 py-3">
      <div className="text-sm font-bold text-white">Mapa de infraestructura · Selección de piso</div>
      <label className="flex items-center gap-3 text-xs text-slate-300">Sector
        <select value={section} onChange={e=>selectSection(e.target.value)} className="min-w-56 rounded-lg border border-cyan-500/30 bg-[#182b44] p-2 text-white">
          {options.map(option=><option key={option.value} value={option.value}>{option.label}{inventoryLoaded ? ` · ${positionCounts[option.value] || 0} registrados` : ''}</option>)}
        </select>
      </label>
    </div>
    <div className="relative rounded-xl border border-cyan-500/25 bg-[#0c172b] px-3 py-3 text-slate-100">
      <div className="flex flex-wrap items-center gap-3">
        <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-cyan-300">Búsqueda global de posiciones</span>
        <div className="flex min-w-[220px] flex-1 gap-2">
          <input value={globalTerm} onChange={e=>{setGlobalTerm(e.target.value);setGlobalResultsOpen(true);setGlobalPositionsError('')}}
            onFocus={()=>setGlobalResultsOpen(true)} onKeyDown={e=>{if(e.key==='Escape')setGlobalResultsOpen(false);if(e.key==='Enter'&&globalResults.length===1)goToGlobalPosition(globalResults[0])}}
            placeholder="Buscar código, PCNAME, serial o usuario en todos los pisos..." aria-label="Buscar posiciones en todos los pisos"
            className="min-w-0 flex-1 rounded-lg border border-sky-500/25 bg-[#071124] px-3 py-2 text-xs text-white outline-none focus:border-cyan-400" />
          <button type="button" onClick={()=>setGlobalResultsOpen(true)} className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-200">Buscar</button>
        </div>
        {globalLoading&&<span className="text-[11px] text-slate-400">Cargando posiciones…</span>}
      </div>
      {globalPositionsError&&<p className="mt-2 text-xs text-amber-300">{globalPositionsError}</p>}
      {globalResultsOpen&&clean(globalTerm)&&<div className="mt-2 max-h-60 overflow-y-auto rounded-lg border border-cyan-500/30 bg-[#071124] p-1">
        {globalResults.map(p=><button type="button" key={p.id} onClick={()=>goToGlobalPosition(p)} className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-xs text-white hover:bg-cyan-500/15">
          <span><strong>{p.code}</strong><span className="ml-2 text-slate-400">{[p.inventoryPerson?.firstName,p.inventoryPerson?.lastName].filter(Boolean).join(' ')||p.equipment?.pcName||p.equipment?.serial||'Sin usuario ni equipo'}</span></span>
          <span className="shrink-0 text-cyan-300">Piso {p.location?.floorNumber??'?'}{p.location?.floorNumber===1?'':` · ${p.location?.wing||p.wing||'Sin sector'}`}</span>
        </button>)}
        {!globalLoading&&globalResults.length===0&&<p className="px-3 py-2 text-xs text-slate-400">No se encontraron posiciones coincidentes.</p>}
      </div>}
    </div>
    {/* Keep Floor 1 mounted to preserve its in-memory editing state on navigation. */}
    <div className={section==='1'?'block':'hidden'}><FloorOneMap/></div>
    {section!=='1'&&<FloorSectorView key={section} floor={floor} wing={wing}/>}
  </div>
}
