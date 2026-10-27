'use client'
import './inventory-f4.css'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, AlertTriangle, CalendarClock, ArrowLeftRight, ArrowRight, Boxes, CheckCircle2, Download, Package, Search, Settings2, Warehouse, X, PieChart, FileSpreadsheet, ShieldAlert, Laptop, Monitor, Keyboard, Mouse, Headphones, Cable, Plug, HardDrive, MemoryStick, Webcam, Printer, BatteryCharging, Server, Cpu, HelpCircle } from 'lucide-react'
import { useInventory } from '@/context/InventoryContext'
import { apiRequest } from '@/lib/api'
import type { EquipmentItem } from '@/context/InventoryContext'
import StockPlanning from './StockPlanning'
import InventoryControlCenter from './InventoryControlCenter'
import StockOverview from './StockOverview'
import WarehouseHome from './WarehouseHome'
import WarehouseMovements from './WarehouseMovements'
import WarehouseOperationsPanel from './WarehouseOperationsPanel'
import MovementOperationsHub from './MovementOperationsHub'
import EquipmentOperationForm from './EquipmentOperationForm'
import './inventory-i2.css'
import './inventory-table-premium.css'
import InventoryImportReview from './InventoryImportReview'
import InventoryNewAsset from './InventoryNewAsset'
import RecentEquipmentPremium from './RecentEquipmentPremium'
import InventoryStockIntake from './InventoryStockIntake'
import WarehouseMovementHistory from './WarehouseMovementHistory'
import EntregasDevoluciones from './EntregasDevoluciones'
import './inventory-i3.css'
import './inventory-master.css'

type Tab = 'dashboard' | 'stock' | 'movements' | 'planning' | 'new' | 'history' | 'deliveries'
// La API /equipment devuelve campos de ubicacion adicionales al tipo del contexto local.
type InventoryApiEquipment = EquipmentItem & { location?: string; rawStatus?: string; rawCondition?: string; assignedUser?: string; assetTag?: string; apiId?: string }
const fmt = (n: number) => new Intl.NumberFormat('es-DO').format(n)
const groupName = (type: string) => type.trim() || 'Sin clasificar'
const normalizeText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
const includesAny = (value: string, tokens: string[]) => tokens.some(token => value.includes(token))
const isWarehouseLocation = (value: string) => {
  const normalized = normalizeText(value || '')
  if (!normalized) return false
  return includesAny(normalized, ['almacen', 'warehouse', 'store', 'bodega', 'deposito', 'stock'])
}
const typeAliases: Record<string, string[]> = {
  'desktop':['desktop'],
  'laptop':['laptop','notebook'],
  'all in one':['all in one','all-in-one','aio'],
  'monitor':['monitor'],
  'teclado':['teclado','keyboard'],
  'mouse':['mouse'],
  'headset':['headset','headphones','audifono','audifonos'],
  'cable de red':['cable de red','network cable','ethernet'],
  'cables de video':['cables de video','cable de video','hdmi','displayport','vga'],
  'cables de poder':['cables de poder','cable de poder','power cable','corriente'],
  'docking station':['docking station','dock'],
  'regleta':['regleta','power strip'],
  'ssd':['ssd'],
  'hdd':['hdd','hard drive'],
  'memoria ram':['memoria ram','ram'],
  'ups':['ups','battery backup'],
  'webcam':['webcam','camera'],
  'impresoras':['impresora','impresoras','printer'],
  'otros componentes':['otros componentes','other component'],
  'sin clasificar':['sin clasificar','unclassified'],
}
const matchesInventoryType = (currentType: string, expectedType: string) => {
  const normalized = normalizeText(currentType || '')
  const aliases = typeAliases[normalizeText(expectedType)] || [normalizeText(expectedType)]
  return includesAny(normalized, aliases)
}

// Catalogo visible incluso con stock 0. Las cantidades proceden solo de /equipment.
const premiumCategories = [
  {name:'Desktop',label:'Desktops',icon:Server,tone:'sky'},
  {name:'Laptop',label:'Laptops',icon:Laptop,tone:'indigo'},
  {name:'All in One',label:'All in One',icon:Monitor,tone:'cyan'},
  {name:'Monitor',label:'Monitores',icon:Monitor,tone:'blue'},
  {name:'Teclado',label:'Teclados',icon:Keyboard,tone:'emerald'},
  {name:'Mouse',label:'Mouse',icon:Mouse,tone:'violet'},
  {name:'Headset',label:'Headsets',icon:Headphones,tone:'purple'},
  {name:'Cable de red',label:'Cables de red',icon:Cable,tone:'teal'},
  {name:'Cables de video',label:'Cables de video',icon:Cable,tone:'blue'},
  {name:'Cables de poder',label:'Cables de poder',icon:Plug,tone:'rose'},
  {name:'Docking Station',label:'Docking station',icon:HardDrive,tone:'sky'},
  {name:'Regleta',label:'Regletas',icon:Plug,tone:'amber'},
  {name:'SSD',label:'SSD',icon:HardDrive,tone:'cyan'},
  {name:'HDD',label:'HDD',icon:HardDrive,tone:'slate'},
  {name:'Memoria RAM',label:'Memoria RAM',icon:MemoryStick,tone:'emerald'},
  {name:'UPS',label:'UPS',icon:BatteryCharging,tone:'cyan'},
  {name:'Webcam',label:'Webcams',icon:Webcam,tone:'purple'},
  {name:'Impresoras',label:'Impresoras',icon:Printer,tone:'teal'},
  {name:'Otros componentes',label:'Otros componentes',icon:Cpu,tone:'violet'},
  {name:'Sin clasificar',label:'Sin clasificar',icon:HelpCircle,tone:'amber'},
] as const

const EN: Record<string,string> = {
  'Inventario / Store':'Inventory / Store', 'Centro de control de activos, existencias y operaciones de Tecnología.':'Technology assets, stock and operations control center.',
  'Panel general':'Overview', 'Existencias':'Stock', 'Entradas y salidas':'Stock movements', 'Planificación de Stock':'Stock planning',
  'Total registrado':'Total registered', 'Disponibles':'Available', 'Asignados':'Assigned', 'Otros estados':'Other statuses', 'Categorías':'Categories',
  'Datos del inventario local':'Local inventory data', 'El resumen usa solamente registros cargados en InventoryContext. No representa el stock completo de la base de datos hasta unificar las fuentes.':'This summary uses only InventoryContext records. It is not the full database stock until data sources are unified.',
  'Distribución por tipo':'Distribution by type', 'Unidades registradas por tipo de activo':'Units registered by asset type',
  'Alertas de stock':'Stock alerts', 'Sin mínimos configurados':'No minimums configured', 'Los niveles mínimos aún no están configurados. No se pueden confirmar alertas de stock bajo.':'Minimum stock thresholds have not been configured. Low-stock alerts cannot be confirmed.',
  'Movimientos recientes':'Recent movements', 'Operaciones que figuran en el historial local':'Operations found in the local history',
  'No hay movimientos registrados en esta fuente.':'No movements recorded in this source.', 'Explorar movimientos':'Explore movements',
  'Catálogo por categorías':'Category catalog', 'Selecciona un tipo para consultar sus existencias.':'Select an asset type to inspect its stock.',
  'No hay categorías registradas en esta fuente.':'No categories recorded in this source.',
  'Inventario de activos':'Asset inventory', 'Búsqueda en los registros locales':'Search local records', 'Buscar tipo, marca, modelo o serial...':'Search type, brand, model or serial...',
  'Todos':'All', 'Tipo':'Type', 'Marca / modelo':'Brand / model', 'Serie':'Serial', 'Cantidad':'Quantity', 'Estado':'Status',
  'Sin activos en esta vista.':'No assets in this view.', 'Exportar CSV':'Export CSV', 'Inventario local':'Local inventory',
  'Importar Excel · próximo paso':'Import Excel · next step', 'Plantilla Excel':'Excel template', 'Stock bajo: sin mínimos':'Low stock: no thresholds', 'Sin datos de ubicación':'No location data', 'En almacén: no verificado':'In warehouse: not verified', 'En uso':'In use', 'Disponible':'Available', 'Reparación':'Repair', 'Dañado':'Damaged', 'Retirado':'Retired', 'Devuelto':'Returned',
  'Nuevo activo · siguiente fase':'New asset · next phase', 'Ver equipos en uso':'View deployed equipment', 'No se han cargado activos en el contexto local.':'No assets have been loaded into local context.',
  'La vista visual no crea activos ni modifica el almacén.':'This overview does not create assets or alter stock.'
}
function Tr({s}: {s:string}) { return <><span className="inv-es">{s}</span><span className="inv-en">{EN[s] || s}</span></> }
type RecentMovement = { key:string; date:string; item:string; action:string; source:string; origin:string; destination:string }
const asObj=(v:unknown):Record<string,unknown> => v!==null && typeof v==='object' && !Array.isArray(v) ? v as Record<string,unknown> : {}
const asString=(v:unknown):string => typeof v==='string'?v:typeof v==='number'?String(v):''
const parseRecentMovements=(data:unknown,source:string):RecentMovement[]=>{
  const o=asObj(data)
  const rows=Array.isArray(data)?data:Array.isArray(o.data)?o.data:Array.isArray(o.movements)?o.movements:[]
  return rows.map((entry:unknown,index:number)=>{
    const r=asObj(entry),equipment=asObj(r.equipment),component=asObj(r.component)
    return {key:`${source}-${asString(r.id)||index}`,date:asString(r.createdAt||r.date||r.timestamp),item:[asString(equipment.brand),asString(equipment.model)].filter(Boolean).join(' ')||asString(equipment.pcName||component.name||component.description||r.equipmentName||r.componentName)||'Activo sin nombre',action:asString(r.action||r.type||r.operation||r.reason)||'Movimiento',source,origin:asString(r.fromLocation||r.from||r.origin),destination:asString(r.toLocation||r.to||r.destination)}
  })
}
const displayMovementAction = (action:string):string => {
 const code=action.trim().toUpperCase()
 if(code==='ENTRY_NEW') return 'Nuevo equipo · Entrada'
 if(code==='ENTRY_DAMAGED') return 'Equipo dañado · Entrada'
 return action.replace(/_/g,' ')
}
const statusText: Record<string,string> = {available:'Disponible',assigned:'En uso',repair:'Reparación',damaged:'Dañado',retired:'Retirado',returned:'Devuelto'}

export default function Inventory() {
  const router = useRouter()
  const { equipment, movements } = useInventory()
  const [tab,setTab] = useState<Tab>('dashboard')
  const [stockFilter,setStockFilter] = useState<''|'available'|'assigned'|'repair'|'damaged'|'retired'|'returned'>('')
  const openStock = (status: typeof stockFilter = '') => { setStockFilter(status); setTab('stock') }
  const [category,setCategory] = useState('')
  const [search,setSearch] = useState('')
  const [tableStatus,setTableStatus] = useState('')
  const [importOpen,setImportOpen] = useState(false)
  const [newAssetOpen,setNewAssetOpen] = useState(false)
  const [stockIntakeOpen,setStockIntakeOpen] = useState(false)
  const [refreshCounter,setRefreshCounter] = useState(0)
  // Reconsultar al regresar a la pestaña y periódicamente, sin tocar datos persistidos.
  useEffect(()=>{
    const onFocus=()=>{ if(document.visibilityState==='visible') setRefreshCounter(v=>v+1) }
    const onVisible=()=>{ if(document.visibilityState==='visible') setRefreshCounter(v=>v+1) }
    window.addEventListener('focus',onFocus)
    document.addEventListener('visibilitychange',onVisible)
    const interval=window.setInterval(()=>{
      if(document.visibilityState==='visible') setRefreshCounter(v=>v+1)
    },30000)
    return ()=>{
      window.removeEventListener('focus',onFocus)
      document.removeEventListener('visibilitychange',onVisible)
      window.clearInterval(interval)
    }
  },[])
  const [alertOpen,setAlertOpen] = useState(false)
  const [alertRules,setAlertRules] = useState<Record<string,{min:number,max:number}>>({})
  const [alertLoaded,setAlertLoaded] = useState(false)
  useEffect(()=>{try {const raw=localStorage.getItem('it-hub-stock-alerts-v1');if(raw){const parsed:unknown=JSON.parse(raw);if(parsed && typeof parsed==='object' && !Array.isArray(parsed))setAlertRules(parsed as Record<string,{min:number,max:number}>)} }catch{}setAlertLoaded(true)},[])
  const saveAlertRule = (type:string,field:'min'|'max',value:number) => {setAlertRules(prev=>{const next={...prev,[type]:{min:prev[type]?.min??0,max:prev[type]?.max??0,[field]:value}};try{localStorage.setItem('it-hub-stock-alerts-v1',JSON.stringify(next))}catch{}return next})}
  const [movementModalOpen,setMovementModalOpen]=useState(false)
  const [recentRemote,setRecentRemote]=useState<RecentMovement[]>([])
  const [movementLoading,setMovementLoading]=useState(true)
  const [movementWarning,setMovementWarning]=useState('')
  const [movementReload,setMovementReload]=useState(0)
  useEffect(()=>{let cancelled=false;const load=async()=>{setMovementLoading(true);const urls=['/movements','/inventory/movements'];const results=await Promise.allSettled(urls.map(url=>apiRequest(url)));const rows:RecentMovement[]=[];const errors:string[]=[];for(let i=0;i<urls.length;i++){const result=results[i];if(result.status==='rejected'){errors.push(urls[i]);continue}if(!result.value.ok){errors.push(`${urls[i]} (${result.value.status})`);continue}try{rows.push(...parseRecentMovements(await result.value.json(),urls[i]))}catch{errors.push(urls[i])}}rows.sort((a,b)=>(Date.parse(b.date)||0)-(Date.parse(a.date)||0));if(!cancelled){setRecentRemote(rows);setMovementWarning(errors.length?`Fuentes sin respuesta: ${errors.join(', ')}`:'');setMovementLoading(false)}};void load();return()=>{cancelled=true}},[movementReload])
  const [catalogDetail,setCatalogDetail] = useState<{ type:string; label:string; metric:'total'|'available'|'assigned'|'warehouse'|'damaged' } | null>(null)
  const [remoteEquipment,setRemoteEquipment] = useState<InventoryApiEquipment[]>([])
  const [remoteState,setRemoteState] = useState<'loading'|'connected'|'error'>('loading')
  const [remoteError,setRemoteError] = useState('')
  useEffect(()=>{
    let cancelled=false
    const load=async()=>{
      try {
        const response=await apiRequest('/equipment')
        if(!response.ok) throw new Error('HTTP '+response.status)
        const raw:unknown=await response.json()
        if(!Array.isArray(raw)) throw new Error('La API no devolvio un listado')
        const parsed:InventoryApiEquipment[]=raw.filter((v):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)).map((v)=>{
          const string=(key:string)=>typeof v[key]==='string'?String(v[key]):''
          const status=string('status').toUpperCase()
          const hasUser=!!(string('assignedUser')||string('user')).trim()
          const normalizedStatus:EquipmentItem['status']= status==='ASSIGNED'||status==='IN_USE'||(status==='ACTIVE'&&hasUser) ? 'assigned'
            : status==='REPAIR'||status==='IN_REPAIR'?'repair'
            : status==='DAMAGED'?'damaged'
            : status==='RETIRED'?'retired'
            : status==='RETURNED'?'returned':'available'
          return {
            id:Number(v.id)||0, apiId:typeof v.id==='string'?v.id.trim():'', assetTag:string('assetTag'), location:string('location'), rawStatus:string('status'), rawCondition:string('condition'), assignedUser:string('assignedUser'), category:['principal','peripheral','component'].includes(string('category'))?string('category') as EquipmentItem['category']:'principal',
            type:string('type').trim()||'Sin clasificar', brand:string('brand'),model:string('model'),
            serial:string('serial'),pcName:string('pcName'),user:string('assignedUser')||string('user'),
            quantity:Math.max(1,Number(v.quantity)||1),capacity:string('capacity'),
            entryDate:string('entryDate')||string('createdAt')||'',
            condition:string('condition').toUpperCase()==='DAMAGED'?'damaged':string('condition').toUpperCase()==='USED'?'used':'new',
            ramGB:typeof v.ramGB==='number'?v.ramGB:null, storageGB:typeof v.storageGB==='number'?v.storageGB:null,
            status:normalizedStatus
          }
        })
        // Comprobar los lotes antiguos en el endpoint individual antes de mostrarlos.
        // La lista puede estar desactualizada; solo un 404 confirmado retira una fila.
        // Otros errores de red/autenticacion NO ocultan inventario.
        // Baja ya confirmada en Prisma y en GET /equipment/:id (404) el 21/10/2026.
        // Exclusión puntual del listado legado: NO altera Supabase ni los demás activos.
        const deletedLegacyIds = new Set([
          '4e9cb2c2-6d38-4a79-97df-e85d696d041', // Lote antiguo: Mouse Dell, 10 uds.
        ])
        const activeParsed = parsed.filter(item => !deletedLegacyIds.has(String(item.apiId || '').toLowerCase()))
        const checked = await Promise.all(activeParsed.map(async (item) => {
          if (!item.apiId || item.quantity <= 1 || item.serial) return item
          try {
            const detail = await apiRequest(`/equipment/${encodeURIComponent(item.apiId)}`)
            if (detail.status === 404) return null
          } catch { /* Mantener el registro si no se pudo validar. */ }
          return item
        }))
        const verified = checked.filter((item): item is InventoryApiEquipment => item !== null)
        if(!cancelled){setRemoteEquipment(verified);setRemoteState('connected');setRemoteError('')}
      }catch(e){if(!cancelled){setRemoteState('error');setRemoteError(e instanceof Error?e.message:'Error de consulta')}}
    }
    void load()
    return()=>{cancelled=true}
  },[refreshCounter])
  // API persistent source for overview. Original context remains intact for legacy tabs.
  const overviewEquipment=remoteState==='connected'?remoteEquipment:[]
  const units = (predicate: (item: typeof overviewEquipment[number]) => boolean) => overviewEquipment.filter(predicate).reduce((n,item)=>n+Math.max(0,Number(item.quantity)||0),0)
  const total = units(()=>true)
  const available = units(item=>item.status==='available')
  const assigned = units(item=>item.status==='assigned')
  const warehouse = units(item=>isWarehouseLocation(item.location || ''))
  const damaged = units(item=>item.status==='damaged' || item.status==='repair')
  const unlocated = units(item=>!(item.location || '').trim())

  const assignedByType = (typeName: string) => units(item=>item.status==='assigned' && matchesInventoryType(item.type, typeName))
  const assignedDesktops = assignedByType('Desktop')
  const assignedLaptops = assignedByType('Laptop')
  const assignedAllInOne = assignedByType('All in One')
  const totalOperationalStations = assignedDesktops + assignedLaptops + assignedAllInOne
  const operationalDemandByType: Record<string, number | null> = {
    'Desktop': assignedDesktops,
    'Laptop': assignedLaptops,
    'All in One': assignedAllInOne,
    'Monitor': assignedDesktops * 2 + assignedLaptops,
    'Teclado': assignedDesktops + assignedAllInOne,
    'Mouse': assignedDesktops + assignedAllInOne,
    'Cable de red': totalOperationalStations,
    'Cables de video': assignedDesktops * 2 + assignedLaptops,
    'Cables de poder': assignedDesktops * 3 + assignedLaptops,
    'Regleta': totalOperationalStations,
    'SSD': totalOperationalStations,
    'Headset': 0,
    'Docking Station': null,
    'UPS': null,
    'Webcam': null,
    'Impresoras': null,
    'HDD': null,
    'Memoria RAM': null,
    'Otros componentes': null,
    'Sin clasificar': null,
  }
  const groups = useMemo(()=>{
    const m = new Map<string,{type:string,total:number,available:number,assigned:number,warehouse:number,unlocated:number,demand:number|null}>()
    for(const e of overviewEquipment){
      const name=groupName(e.type)
      const current=m.get(name)||{type:name,total:0,available:0,assigned:0,warehouse:0,unlocated:0,demand:operationalDemandByType[name] ?? null}
      const count=Math.max(0,Number(e.quantity)||0)
      current.total+=count
      if(e.status==='available') current.available+=count
      if(e.status==='assigned') current.assigned+=count
      if(isWarehouseLocation(e.location || '')) current.warehouse+=count
      if(!(e.location || '').trim()) current.unlocated+=count
      current.demand = operationalDemandByType[name] ?? current.demand ?? null
      m.set(name,current)
    }
    return [...m.values()].sort((a,b)=>b.total-a.total||a.type.localeCompare(b.type))
  },[overviewEquipment, assignedDesktops, assignedLaptops, assignedAllInOne, totalOperationalStations])
  const filtered=overviewEquipment.filter(item=>(!category||groupName(item.type)===category)&&(!tableStatus||item.status===tableStatus)&&[item.type,item.brand,item.model,item.serial,item.pcName].join(' ').toLowerCase().includes(search.trim().toLowerCase()))
  const stockAlertRows = premiumCategories.map(entry=>{
    const count=overviewEquipment.filter(e=>matchesInventoryType(e.type,entry.name)&&e.status==='available').reduce((v,e)=>v+Math.max(0,Number(e.quantity)||0),0)
    const rule=alertRules[entry.name]
    const configured=!!rule && Number.isFinite(rule.min) && Number.isFinite(rule.max) && rule.max>0 && rule.min>=0 && rule.max>=rule.min
    const status=!configured?'Sin configurar':count<rule.min?'Bajo stock':count>rule.max?'Exceso':'Normal'
    return {type:entry.name,label:entry.label,count,rule,status}
  })
  // Semaforo de cumplimiento con base en el minimo y existencias disponibles REALES.
  // Los umbrales son locales y pueden editarse sin cambiar inventario.
  const alertVisual = (row: typeof stockAlertRows[number]) => {
    const min = Number(row.rule?.min ?? 0)
    const max = Number(row.rule?.max ?? 0)
    const validMin = Number.isFinite(min) && min > 0
    const explicitMax = Number.isFinite(max) && max > 0 && max >= min
    const invalidMax = max > 0 && !explicitMax
    if (invalidMax) return { label:'Revisar límites', color:'#94a3b8', percent:0, missing:0, scale:0, provisional:false }
    // Si todavia no se establecio un maximo, usar SOLO para el grafico
    // una escala provisional (tres veces el minimo). No se guarda en datos.
    const provisional = !explicitMax && validMin
    const scale = explicitMax ? max : provisional ? Math.max(1,min*3) : 0
    if (scale <= 0) return { label:'Configurar mínimo', color:'#94a3b8', percent:0, missing:0, scale:0, provisional:false }
    const count = row.count
    const color = count < min / 2 ? '#fb7185' : count < min ? '#fbbf24' : '#34d399'
    const label = count < min / 2 ? 'Crítico' : count < min ? 'Atención' : explicitMax && count > max ? 'Sobre máximo' : 'Estable'
    return {
      label, color, percent:Math.min(100,Math.max(0,count / scale * 100)), missing:Math.max(0,min-count),scale,provisional
    }
  }
  const priorityAlertRows = ['Desktop','Laptop','Monitor','Teclado'].map(type=>stockAlertRows.find(row=>row.type===type)).filter((row):row is typeof stockAlertRows[number]=>!!row)
  const alertShortages = stockAlertRows.filter(row=>alertVisual(row).missing>0)
    .sort((a,b)=>alertVisual(b).missing-alertVisual(a).missing)
  const actionableAlerts=stockAlertRows.filter(x=>x.status==='Bajo stock'||x.status==='Exceso')
  const catalogRows = catalogDetail ? overviewEquipment.filter(item=>matchesInventoryType(item.type,catalogDetail.type)) : []
  const matchesDetailMetric = (item: InventoryApiEquipment, metric: 'total'|'available'|'assigned'|'warehouse'|'damaged') => {
    if(metric==='total') return true
    if(metric==='available') return item.status==='available'
    if(metric==='assigned') return item.status==='assigned'
    if(metric==='warehouse') return isWarehouseLocation(item.location || '')
    return item.status==='damaged'||item.status==='repair'
  }
  const catalogFiltered = catalogDetail ? catalogRows.filter(item=>matchesDetailMetric(item,catalogDetail.metric)) : []
  const catalogSelectedCount = catalogFiltered.reduce((sum,item)=>sum+Math.max(0,Number(item.quantity)||0),0)
  const catalogMetricLabels:Record<'total'|'available'|'assigned'|'warehouse'|'damaged',string> = {
    total:'Total registrados', available:'Disponibles', assigned:'En uso registrado', warehouse:'En almacén', damaged:'Dañados / En reparación'
  }
  const recent=[...movements].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).slice(0,5)
  const downloadTemplate=()=>{
    // No realiza importaciones ni modifica el inventario.
    const headers=['Tipo','Marca','Modelo','Serial','Cantidad','Estado','Generacion','Procesador','Capacidad','Ubicacion','Observaciones']
    const csv='\uFEFF'+headers.map(value=>'"'+value+'"').join(',')+'\r\n'
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}))
    const a=document.createElement('a');a.href=url;a.download='plantilla-inventario-importacion.csv';a.click();URL.revokeObjectURL(url)
  }
  const exportCsv=()=>{
    const rows=[['Tipo','Marca','Modelo','Serial','Cantidad','Estado'],...filtered.map(e=>[e.type,e.brand,e.model,e.serial,String(e.quantity),statusText[e.status]||e.status])]
    const csv='\uFEFF'+rows.map(row=>row.map(cell=>'"'+String(cell??'').replace(/"/g,'""')+'"').join(',')).join('\r\n')
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='inventario-api-equipment.csv';a.click();URL.revokeObjectURL(url)
  }
  const [operationIntent,setOperationIntent] = useState<'entry'|'exit'>('entry')
  const navigation = [
    {id:'dashboard' as Tab,name:'Panel general',icon:Activity},
    {id:'stock' as Tab,name:'Almacén',icon:Package},
    {id:'deliveries' as Tab,name:'Entregas y Devoluciones',icon:ArrowLeftRight},
    {id:'new' as Tab,name:'Nuevos equipos',icon:Boxes},
    {id:'history' as Tab,name:'Historial de movimientos',icon:CalendarClock},
  ]
  return <div className="it-inv-i2 min-h-full p-4 sm:p-6 lg:p-7">
    <div className="inv-header flex flex-wrap items-center justify-between gap-4">
      <div><p className="inv-kicker text-[11px] font-semibold tracking-[.17em]">IT ASSET MANAGEMENT / STORE</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl"><Tr s="Inventario / Store"/></h1><p className="inv-muted mt-1 text-sm"><Tr s="Centro de control de activos, existencias y operaciones de Tecnología."/></p></div>
      <div className="flex flex-wrap gap-2"><button type="button" className="inv-btn" onClick={()=>setImportOpen(true)}><FileSpreadsheet size={16}/> Importar</button><button type="button" className="inv-btn inv-primary" onClick={exportCsv} disabled={!overviewEquipment.length}><Download size={16}/> Exportar CSV</button></div>
    </div>
    <div className="inv-nav mt-5 flex flex-wrap gap-2">{navigation.map(x=>{const Icon=x.icon;return <button key={x.id} type="button" onClick={()=>{if(x.id==='history'){setMovementReload(v=>v+1);setMovementModalOpen(true)}else setTab(x.id)}} aria-pressed={tab===x.id} className={`inv-tab ${tab===x.id?'is-active':''}`}><Icon size={16}/><Tr s={x.name}/></button>})}</div>
    {tab==='dashboard' && <div className="mt-5 space-y-4">
      {remoteState==='error' && <div role="alert" className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">No se pudo consultar el inventario. {remoteError} · Los indicadores muestran — hasta reconectar.</div>}
      {remoteState==='loading' && <p className="inv-muted text-xs">Actualizando indicadores del inventario...</p>}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 2xl:grid-cols-6">
        {[
          {label:'Total registrado',value:total,icon:Boxes,tone:'blue',action:'total',hint:'Todos los activos'},
          {label:'Disponibles',value:available,icon:CheckCircle2,tone:'green',action:'available',hint:'Listos para asignar'},
          {label:'En uso',value:assigned,icon:Activity,tone:'violet',action:'assigned',hint:'Ir a Equipos en uso'},
          {label:'En almacén',value:warehouse,icon:Warehouse,tone:'amber',action:'warehouse',hint:'Ver existencias'},
          {label:'Dañados',value:damaged,icon:AlertTriangle,tone:'red',action:'damaged',hint:'Ir a Daños y Reparaciones'},
          {label:'Sin ubicación',value:unlocated,icon:ShieldAlert,tone:'red',action:'unlocated',hint:'Activos por localizar'},
        ].map(k=>{const I=k.icon;return <button type="button" key={k.label} onClick={()=>{
          if(k.action==='assigned'){router.push('/equipment');return}
          if(k.action==='damaged'){router.push('/maintenance');return}
          if(k.action==='total'){document.getElementById('inv-catalogo')?.scrollIntoView({behavior:'smooth'});return}
          openStock(k.action==='available'?'available':'')
        }} className={`inv-panel inv-kpi inv-${k.tone} relative flex min-h-[125px] flex-col overflow-hidden px-3 py-3 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400`} title={k.hint}>
          <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="inv-muted text-[11px] leading-tight">{k.label}</p><p className="mt-1 text-2xl font-extrabold tabular-nums">{remoteState==='connected'?fmt(k.value):'—'}</p></div><span className="inv-icon"><I size={19}/></span></div>
          <p className="inv-muted mt-auto mb-2 text-[10px] leading-tight">{k.hint}</p><div className="inv-kpi-line"/>
        </button>})}
      </div>
      <div className="grid gap-3 xl:grid-cols-3">
        <section className="inv-panel p-4 xl:col-span-1">
          <div className="flex items-center justify-between"><h2 className="font-bold"><Tr s="Distribución por tipo"/></h2><Boxes size={18} className="inv-accent"/></div>
          <p className="inv-muted mt-1 text-xs">Desktops, Laptops y All in One · otros componentes debajo</p>
          <div className="mt-4 flex items-center gap-4">
            <div className="inv-donut shrink-0" role="img" aria-label="Distribución de activos registrados" style={{width:136,height:136,background:`conic-gradient(${['Desktop','Laptop','All in One'].map((type,i)=>{const before=['Desktop','Laptop','All in One'].slice(0,i).reduce((n,t)=>n+units(item=>matchesInventoryType(item.type,t)),0);const count=units(item=>matchesInventoryType(item.type,type));return `${['#6778ff','#2dd4bf','#b58cff'][i]} ${before/Math.max(1,total)*100}% ${(before+count)/Math.max(1,total)*100}%`}).join(', ')}, #29384f ${(['Desktop','Laptop','All in One'].reduce((n,t)=>n+units(item=>matchesInventoryType(item.type,t)),0)/Math.max(1,total)*100)}% 100%)`}}><div className="inv-donut-core"><strong>{remoteState==='connected'?fmt(total):'—'}</strong><span>ACTIVOS</span></div></div>
            <div className="min-w-0 flex-1 space-y-3">{(['Desktop','Laptop','All in One'] as const).map((type,i)=>{const count=units(item=>matchesInventoryType(item.type,type));return <div key={type} className="space-y-1"><div className="flex justify-between text-[11px]"><span className="font-semibold">{type}</span><span className="inv-muted">{remoteState==='connected'?fmt(count):'—'} · {total?Math.round(count/total*100):0}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-700/70"><div className="h-full rounded-full transition-all duration-500" style={{width:`${total?count/total*100:0}%`,background:['#6778ff','#2dd4bf','#b58cff'][i]}}/></div></div>})}</div>
          </div>
          <div className="mt-4 border-t border-white/10 pt-3"><p className="mb-2 text-xs font-semibold text-slate-200">Periféricos y componentes</p><div className="max-h-44 space-y-2 overflow-y-auto pr-1">{premiumCategories.filter(item=>!['Desktop','Laptop','All in One'].includes(item.name)).map((item,i)=>{const count=units(e=>matchesInventoryType(e.type,item.name));const progress=total?Math.min(100,count/total*100):0;const color=['#22d3ee','#a78bfa','#34d399','#f59e0b','#60a5fa'][i%5];return <div key={item.name} className="flex items-center gap-2 text-[10px]"><span className="w-[98px] shrink-0 truncate" title={item.label}>{item.label}</span><div className="flex h-7 min-w-0 flex-1 items-end gap-[2px] rounded-md bg-white/[.035] px-1 py-1">{Array.from({length:12},(_,j)=><span key={j} className="min-w-0 flex-1 rounded-sm transition-all" style={{height:`${30+(j%3)*25}%`,background:remoteState==='connected'&&j<Math.ceil(progress/100*12)?color:'#334155'}}/>)}</div><strong className="w-7 text-right">{remoteState==='connected'?fmt(count):'—'}</strong></div>})}</div><p className="inv-muted mt-2 text-[10px]">Barras por unidades reales registradas; no representan variación temporal ni stock estimado.</p></div>
        </section>
        <section className="inv-panel p-4">
          <div className="flex items-center justify-between gap-2"><div><h2 className="font-bold">Salud del inventario</h2><p className="mt-1 text-[11px] text-slate-400">Principales · existencias disponibles reales</p></div><button type="button" onClick={()=>setAlertOpen(true)} className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/20">Ver todas / Configurar</button></div>
          <div className="mt-4 space-y-3">{priorityAlertRows.map(row=>{const visual=alertVisual(row);return <button type="button" key={row.type} onClick={()=>setAlertOpen(true)} className="block w-full rounded-lg border border-white/10 bg-white/[.025] p-2 text-left transition-colors hover:border-cyan-400/40 hover:bg-white/[.06]"><div className="mb-1.5 flex items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-100">{row.label}</span><span className="text-[10px]" style={{color:visual.color}}>{remoteState==='connected'?`${row.count} / ${visual.scale>0?`${visual.scale}${visual.provisional?'*':''}`:'—'} · ${visual.label}`:'Sin datos'}</span></div><div className="flex h-2 gap-[3px]">{Array.from({length:16},(_,i)=><div key={i} className="min-w-0 flex-1 rounded-[2px]" style={{background:remoteState==='connected' && i<Math.ceil(visual.percent/100*16)?visual.color:'#334155'}}/>)}</div><div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>Mín.: {row.rule?.min ?? '—'}{visual.provisional?' · escala provisional (mín. ×3)':''}</span><span>{remoteState==='connected' && visual.scale>0?`${Math.round(visual.percent)}%`:'—'}</span></div></button>})}</div>
          <button type="button" onClick={()=>setAlertOpen(true)} className="mt-4 w-full rounded-lg border border-cyan-400/25 bg-cyan-400/[.07] px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/[.13]">Ver todas las alertas y configurar →</button>
        </section>
        <section className="inv-panel flex min-h-[360px] flex-col p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold"><Tr s="Movimientos recientes"/></h2>
            <button type="button" className="inv-link text-xs" onClick={()=>{setMovementReload(v=>v+1);setMovementModalOpen(true)}}>Ver movimientos <ArrowRight size={14}/></button>
          </div>
          <p className="inv-muted mt-1 text-xs">Vista rápida de las últimas operaciones registradas</p>
          {movementWarning&&<p className="mt-2 rounded-md border border-amber-500/20 bg-amber-500/10 p-2 text-[10px] text-amber-300">{movementWarning}</p>}
          {movementLoading ? (
            <div className="mt-5 space-y-3" aria-label="Cargando últimos movimientos">
              {Array.from({length:3},(_,i)=><div key={i} className="flex animate-pulse items-center gap-3 rounded-xl border border-white/10 bg-white/[.025] p-3"><div className="h-9 w-9 rounded-lg bg-slate-700/60"/><div className="flex-1 space-y-2"><div className="h-2 w-2/3 rounded bg-slate-700/60"/><div className="h-2 w-1/2 rounded bg-slate-700/40"/></div></div>)}
            </div>
          ) : recentRemote.length ? (
            <div className="mt-4 space-y-2">
              {recentRemote.slice(0,4).map(m=>{
                const action=m.action.toLowerCase()
                const isEntry=action.includes('entrada')||action.includes('devol')||action.includes('return')
                const isExit=action.includes('salida')||action.includes('exit')||action.includes('entrega')
                const tone=isEntry?'text-emerald-300 border-emerald-400/25 bg-emerald-500/10':isExit?'text-amber-300 border-amber-400/25 bg-amber-500/10':'text-cyan-300 border-cyan-400/25 bg-cyan-500/10'
                return <div key={m.key} className="flex min-w-0 items-center gap-2.5 rounded-xl border border-white/10 bg-white/[.025] p-2.5 transition-colors hover:border-cyan-400/30 hover:bg-white/[.06]">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${tone}`}>{isEntry?<Package size={17}/>:isExit?<ArrowRight size={17}/>:<ArrowLeftRight size={17}/>}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><span className="truncate text-xs font-semibold text-slate-100">{m.item}</span></div>
                    <p className="mt-0.5 truncate text-[10px] text-slate-400">{displayMovementAction(m.action)} · {m.source==='/movements'?'Equipo':'Componente'}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-400">{m.date&&!Number.isNaN(Date.parse(m.date))?new Date(m.date).toLocaleDateString('es-DO'):'Sin fecha'}</span>
                </div>
              })}
              <p className="pt-1 text-right text-[10px] text-slate-400">Mostrando {Math.min(4,recentRemote.length)} de {recentRemote.length} movimientos consultados</p>
            </div>
          ) : (
            <div className="mt-5 flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-cyan-400/20 bg-cyan-400/[.025] px-4 py-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[.07] text-cyan-300"><ArrowLeftRight size={23}/></span>
              <div><p className="text-sm font-semibold text-slate-100">Aún no hay movimientos visibles</p><p className="mt-1 max-w-xs text-xs text-slate-400">Las próximas entradas, salidas y devoluciones aparecerán aquí en formato compacto.</p></div>
              <button type="button" onClick={()=>setMovementReload(v=>v+1)} className="rounded-lg border border-cyan-400/25 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/10">Actualizar movimientos</button>
            </div>
          )}
          <button type="button" className="mt-auto w-full rounded-lg border border-cyan-400/25 bg-cyan-400/[.06] px-3 py-2 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-400/[.13]" onClick={()=>{setMovementReload(v=>v+1);setMovementModalOpen(true)}}>Abrir historial completo →</button>
        </section>
      </div>
      <section id="inv-catalogo" className="inv-panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-extrabold"><Tr s="Catálogo por categorías"/></h2><p className="inv-muted mt-1 text-xs">{remoteState==='connected'?'Total, disponible y almacén son registros reales. Uso auto. es cálculo por equipos asignados y no confirma entrega física.':'Esperando confirmación de /equipment; sin cifras inventadas.'}</p></div><button className="inv-link text-xs" type="button" onClick={()=>{setCategory('');document.getElementById('inv-i2-list')?.scrollIntoView({behavior:'smooth'})}}><Tr s="Todos"/><ArrowRight size={14}/></button></div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {premiumCategories.map((entry)=>{
            const categoryRows=groups.filter(g=>matchesInventoryType(g.type, entry.name));
            const row=categoryRows.reduce((sum,g)=>({total:sum.total+g.total,available:sum.available+g.available,assigned:sum.assigned+g.assigned,warehouse:sum.warehouse+g.warehouse,unlocated:sum.unlocated+g.unlocated}), {total:0,available:0,assigned:0,warehouse:0,unlocated:0});
            const demand=operationalDemandByType[entry.name] ?? null;
            const progressDenominator=typeof demand==='number' && demand>0 ? demand : row.total;
            const progressNumerator=typeof demand==='number' && demand>0 ? demand : row.total;
            const percent=progressDenominator>0 ? Math.min(100,Math.round(100*progressNumerator/progressDenominator)) : 0;
            const Icon=entry.icon;
            const isSelected=category===entry.name;
            const number=(value:number)=>remoteState==='connected'?fmt(value):'—';
            const demandText = typeof demand === 'number' ? `Uso automático: ${number(demand)} · Registrados: ${number(row.assigned)}` : 'Uso automático sin regla definida';
            const subtitle = row.total===0&&remoteState==='connected' ? 'Sin activos registrados' : 'Inventario / Store';
            return <div key={entry.name} className={`group relative min-w-0 overflow-hidden rounded-xl border px-3 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/50 hover:shadow-lg ${isSelected?'border-cyan-400/70 ring-1 ring-cyan-400/30':'border-white/10'} bg-white/[.035]`}>
              <div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/[.09] shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_0_12px_rgba(34,211,238,.09)]"><Icon size={23} strokeWidth={1.65} className="inv-accent"/></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><strong className="break-words text-[13px] font-bold leading-5">{entry.label}</strong><button type="button" aria-label={`Ver todos los registros de ${entry.label}`} onClick={()=>setCatalogDetail({type:entry.name,label:entry.label,metric:'total'})} className="rounded-md p-1 hover:bg-white/10"><ArrowRight size={14} className="inv-muted shrink-0"/></button></div><div className="mt-1 flex items-center gap-2" title={typeof demand==='number'&&demand>0?'Referencia de uso automático, NO verificación física':'Actividad de registros de inventario'}><div className="h-[5px] min-w-0 flex-1 overflow-hidden rounded-full bg-slate-600/50"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-500" style={{width:`${remoteState==='connected'?percent:0}%`}}/></div><span className="w-8 text-right text-[10px] tabular-nums text-sky-300">{remoteState==='connected'?`${percent}%`:'—'}</span></div></div></div>
              <div className="mt-3 grid grid-cols-5 gap-1 border-t border-white/10 pt-2.5 text-center">
                {([
                  {metric:'total' as const,value:row.total,title:'Total',tone:'text-slate-100',bg:'bg-white/[.045]'},
                  {metric:'available' as const,value:row.available,title:'Disp.',tone:'text-emerald-400',bg:'bg-emerald-500/[.09]'},
                  {metric:'assigned' as const,value:row.assigned,title:'En uso',tone:'text-blue-400',bg:'bg-blue-500/[.09]'},
                  {metric:'warehouse' as const,value:row.warehouse,title:'Almacén',tone:'text-violet-300',bg:'bg-violet-500/[.08]'},
                  {metric:'damaged' as const,value:overviewEquipment.filter(e=>matchesInventoryType(e.type,entry.name)&&(e.status==='damaged'||e.status==='repair')).reduce((n,e)=>n+Math.max(0,Number(e.quantity)||0),0),title:'Dañados',tone:'text-rose-300',bg:'bg-rose-500/[.09]'},
                ]).map(x=><button key={x.metric} type="button" onClick={()=>setCatalogDetail({type:entry.name,label:entry.label,metric:x.metric})} title={`Ver ${x.title} de ${entry.label}`} className={`min-w-0 cursor-pointer rounded-md border border-transparent px-0.5 py-1.5 transition-all duration-200 ease-out hover:relative hover:z-10 hover:-translate-y-1 hover:scale-[1.07] hover:border-cyan-300/70 hover:brightness-125 hover:shadow-[0_8px_20px_rgba(0,215,255,.25)] active:translate-y-0 active:scale-[.98] focus-visible:-translate-y-1 focus-visible:border-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${x.bg}`}><strong className={`block text-sm tabular-nums ${x.tone}`}>{number(x.value)}</strong><span className={`text-[9px] ${x.tone}`}>{x.title}</span></button>)}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[10px]"><span className="text-cyan-300">{typeof demand === 'number' ? demandText : 'Demanda operativa por validar'}</span><span className="inv-muted">Sin ubicación: {number(row.unlocated)}</span></div>
            </div>
          })}
        </div>
      </section>
      
    </div>}
    {tab==='stock' && <WarehouseHome items={overviewEquipment} state={remoteState} error={remoteError} onRefresh={()=>setRefreshCounter(v=>v+1)} onNew={()=>setNewAssetOpen(true)} onEntry={()=>{setOperationIntent('entry');setTab('movements')}} onExit={()=>{setOperationIntent('exit');setTab('movements')}} onPlanning={()=>setTab('planning')}/>}
    {tab==='deliveries' && <EntregasDevoluciones/>}
    {tab==='new' && <RecentEquipmentPremium items={overviewEquipment} state={remoteState} onNew={()=>setNewAssetOpen(true)}/> }
    {(tab==='movements'||tab==='planning') && <div className="mt-4"><button className="inv-btn" onClick={()=>setTab('stock')}>← Volver a almacén</button></div>}
    {(tab==='movements'||tab==='planning') && <section className="inv-panel inv-legacy mt-5 p-4 sm:p-6">{tab==='movements'&&<WarehouseOperationsPanel key={operationIntent} initialMode={operationIntent}/>} {tab==='planning'&&<><InventoryControlCenter/></>}</section>}
    {alertOpen && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm" onMouseDown={e=>{if(e.target===e.currentTarget)setAlertOpen(false)}}>
      <section role="dialog" aria-modal="true" aria-label="Configuración de alertas de stock" className="w-full max-w-3xl rounded-2xl border border-amber-400/30 bg-[#111f35] p-5 text-slate-100 shadow-[0_0_55px_rgba(245,158,11,.12)]">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Configurar alertas de stock</h2><p className="text-xs text-slate-400">Disponible se lee del inventario. Las barras segmentadas muestran el nivel frente al máximo; los colores indican la salud del stock.</p></div><button type="button" aria-label="Cerrar" className="rounded-lg border border-white/15 p-2 hover:bg-white/10" onClick={()=>setAlertOpen(false)}><X size={18}/></button></div>
        <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/35 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-xs text-slate-100">Principales con faltantes</strong><span className="text-[11px] text-slate-400">{alertShortages.length} categorías por debajo del mínimo</span></div><div className="mt-2 flex flex-wrap gap-1.5">{alertShortages.length ? alertShortages.slice(0,8).map(x=><span key={x.type} className="rounded-md border border-rose-400/25 bg-rose-400/10 px-2 py-1 text-[11px] text-rose-200">{x.label}: faltan {alertVisual(x).missing}</span>) : <span className="text-xs text-slate-400">Sin faltantes configurados.</span>}</div></div>
        <div className="mt-3 max-h-[57vh] space-y-2 overflow-y-auto pr-1">{stockAlertRows.map(x=>{const visual=alertVisual(x);return <div key={x.type} className="rounded-xl border border-white/10 bg-white/[.035] px-3 py-2.5"><div className="grid grid-cols-[minmax(0,1fr)_45px_80px_80px] items-center gap-2"><div className="min-w-0"><strong className="block truncate text-xs">{x.label}</strong><span className="text-[10px] text-slate-400">Disponible: <strong className="text-cyan-300">{remoteState==='connected'?x.count:'—'}</strong></span></div><div className="text-right text-[11px] font-semibold" style={{color:visual.color}}>{remoteState==='connected' && visual.scale>0?`${Math.round(visual.percent)}%`:'—'}</div><label className="text-[10px] text-slate-300">Mín.<input type="number" min="0" step="1" value={x.rule?.min??0} onChange={e=>saveAlertRule(x.type,'min',Math.max(0,Math.trunc(Number(e.target.value)||0)))} className="mt-1 w-full rounded border border-white/20 bg-slate-900 p-1 text-xs text-white"/></label><label className="text-[10px] text-slate-300">Máx.<input type="number" min="0" step="1" value={x.rule?.max??0} onChange={e=>saveAlertRule(x.type,'max',Math.max(0,Math.trunc(Number(e.target.value)||0)))} className="mt-1 w-full rounded border border-white/20 bg-slate-900 p-1 text-xs text-white"/></label></div><div className="mt-2 flex items-center gap-2"><div role="progressbar" aria-label={`Nivel de stock de ${x.label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={remoteState==='connected'?Math.round(visual.percent):0} className="flex h-2.5 min-w-0 flex-1 gap-[3px]">{Array.from({length:18},(_,index)=><span key={index} className="min-w-0 flex-1 rounded-[2px] transition-colors duration-300" style={{backgroundColor:remoteState==='connected' && visual.scale>0 && index<Math.ceil(visual.percent/100*18)?visual.color:'rgba(100,116,139,.36)'}}/>)}</div><span className="w-[90px] shrink-0 text-right text-[10px] font-semibold" style={{color:visual.color}}>{remoteState==='connected'?visual.label:'Sin datos'}</span></div><div className="mt-1 flex items-center justify-between text-[10px] text-slate-400"><span>{visual.provisional?'Máximo sin configurar':'0'}</span><span>{remoteState==='connected'&&visual.scale>0?`${x.count} de ${visual.scale} disponibles · ${Math.round(visual.percent)}%${visual.provisional?' (escala provisional)':''}`:'Configura un mínimo positivo'}</span></div>{visual.missing>0 && remoteState==='connected' && <p className="mt-1 text-[10px] text-rose-300">Faltan {visual.missing} para alcanzar el mínimo</p>}</div>})}</div>
        <p className="mt-3 text-xs text-amber-200">Máximo = tope de referencia para llenar la barra; mínimo = umbral de alerta. Disponible se consulta automáticamente. El máximo debe ser positivo y no menor al mínimo. Las reglas se guardan en este navegador, no en PostgreSQL.</p>
        <div className="mt-4 flex justify-end"><button type="button" onClick={()=>setAlertOpen(false)} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold hover:bg-cyan-500">Cerrar</button></div>
      </section>
    </div>}
    {catalogDetail && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setCatalogDetail(null)}}>
      <section role="dialog" aria-modal="true" aria-label={`Detalle de ${catalogDetail.label}`} className="w-full max-w-2xl overflow-hidden rounded-2xl border border-cyan-400/30 bg-[#101d32] text-slate-100 shadow-[0_0_55px_rgba(34,211,238,.14)]">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4"><div><h2 className="font-bold text-lg">{catalogDetail.label} · {catalogMetricLabels[catalogDetail.metric]}</h2><p className="mt-1 text-xs text-slate-400">Registros reales de inventario; no incluye accesorios generados por cálculo automático.</p></div><button type="button" onClick={()=>setCatalogDetail(null)} aria-label="Cerrar detalle" className="rounded-lg border border-white/15 p-2 hover:bg-white/10"><X size={18}/></button></div>
        <div className="px-5 py-4"><div className="flex items-center justify-between rounded-xl border border-cyan-400/20 bg-cyan-400/[.06] px-4 py-3"><span className="text-sm text-slate-300">Unidades registradas en este estado</span><strong className="text-2xl text-cyan-300 tabular-nums">{remoteState==='connected'?fmt(catalogSelectedCount):'—'}</strong></div>
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">{catalogFiltered.length ? catalogFiltered.map((item,index)=><div key={`${item.apiId||item.id}-${index}`} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-white/10 bg-white/[.035] p-3 text-xs"><div><strong>{item.assetTag||item.serial||item.pcName||`${item.brand} ${item.model}`.trim()||item.type}</strong><p className="mt-1 text-slate-400">{item.type} · {item.location||'Sin ubicación'} · {statusText[item.status]||item.status}</p></div><strong className="tabular-nums">{fmt(item.quantity)} un.</strong></div>) : <p className="rounded-lg border border-white/10 px-3 py-6 text-center text-sm text-slate-400">No hay activos registrados para este estado.</p>}</div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 px-5 py-4"><button type="button" onClick={()=>setCatalogDetail(null)} className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10">Cerrar</button><button type="button" onClick={()=>{const metric=catalogDetail.metric;setCatalogDetail(null);if(metric==='damaged')router.push('/maintenance');else if(metric==='assigned')router.push('/equipment');else if(metric==='total'){setTab('stock');}else{setTab('stock');}}} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500">Ver más información <ArrowRight className="ml-1 inline" size={15}/></button></div>
      </section>
    </div>}
    {movementModalOpen&&<div role="presentation" className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-3 sm:p-6" onMouseDown={e=>{if(e.target===e.currentTarget)setMovementModalOpen(false)}}><div role="dialog" aria-modal="true" aria-label="Movimientos recientes" className="w-full max-w-5xl max-h-[88vh] overflow-y-auto rounded-2xl border border-cyan-400/30 bg-[#111e34] p-4 shadow-[0_20px_70px_rgba(0,0,0,.6)] sm:p-6"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Movimientos recientes</h2><button type="button" aria-label="Cerrar movimientos" onClick={()=>setMovementModalOpen(false)} className="rounded-lg border border-white/20 p-2 hover:bg-white/10"><X size={18}/></button></div><WarehouseMovementHistory/></div></div>}
    {importOpen && <InventoryImportReview existing={overviewEquipment} onClose={()=>setImportOpen(false)}/>}
    {stockIntakeOpen && <InventoryStockIntake assets={overviewEquipment.map(item=>({id:item.id,type:item.type,brand:item.brand,model:item.model,serial:item.serial,quantity:item.quantity}))} onClose={()=>setStockIntakeOpen(false)}/>}
    {newAssetOpen && <InventoryNewAsset existingSerials={overviewEquipment.map(item=>item.serial).filter(Boolean)} onClose={()=>setNewAssetOpen(false)} onSaved={()=>{setNewAssetOpen(false);setRefreshCounter(v=>v+1)}}/>}
  </div>
}
