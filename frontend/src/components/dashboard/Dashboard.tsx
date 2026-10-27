"use client";
import { apiRequest } from "@/lib/api";

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowRight,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Computer,
  Laptop,
  MapPin,
  Monitor,
  PackageCheck,
  PackageOpen,
  RefreshCw,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

/* =========================================================
   TIPOS
   ========================================================= */

interface DashboardData {
  equipment?: {
    total?: number
    assigned?: number
    available?: number
    damaged?: number
    inactive?: number

    byCategory?: {
      category: string
      total: number
    }[]

    byCondition?: {
      condition: string
      total: number
    }[]

    byStatus?: {
      status: string
      total: number
    }[]
  }

  inventory?: {
    componentTypes?: number
    totalUnits?: number

    lowStock?: unknown[]

    components?: {
      id: string
      type: string
      brand: string
      quantity: number
      minimumStock?: number
      createdAt?: string
      updatedAt?: string
    }[]
  }

  movements?: {
    total?: number

    byAction?: {
      action: string
      total: number
    }[]

    recent?: RecentMovement[]
  }

  users?: {
    total?: number
  }
}

interface DashboardResponse {
  message?: string
  data?: DashboardData
}

interface RecentMovement {
  id?: string
  action?: string
  fromLocation?: string | null
  toLocation?: string | null
  assignedUser?: string | null
  createdAt?: string | null

  equipment?: {
    id?: string
    category?: string
    brand?: string
    model?: string
    assetTag?: string
    serialNumber?: string
  }
}

interface StatCardProps {
  title: string
  value: number
  description: string
  icon: LucideIcon
  variant: 'purple' | 'blue' | 'green' | 'orange'
  href?: string
}

interface StatusItem {
  name: string
  value: number
  icon: LucideIcon
  variant: 'blue' | 'green' | 'red' | 'orange'
}

interface EquipmentItem {
  name: string
  value: number
  icon: LucideIcon
  variant: 'purple' | 'blue' | 'orange' | 'green'
}

/* =========================================================
   API
   ========================================================= */
/* =========================================================
   UTILIDADES
   ========================================================= */

function normalize(value?: string | null) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('es-DO').format(value)
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('es-DO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatAction(action?: string) {
  switch (normalize(action)) {
    case 'ENTRY':
      return 'ENTRADA'

    case 'ASSIGN':
    case 'ASSIGNMENT':
      return 'ASIGNACIÓN'

    case 'RETURN':
      return 'DEVOLUCIÓN'

    case 'TRANSFER':
      return 'TRASLADO'

    case 'DAMAGE':
      return 'DAÑO'

    case 'REPAIR':
      return 'REPARACIÓN'

    case 'EXIT':
      return 'SALIDA'

    default:
      return action || 'MOVIMIENTO'
  }
}

function getActionClasses(action?: string) {
  switch (normalize(action)) {
    case 'ENTRY':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'

    case 'ASSIGN':
    case 'ASSIGNMENT':
      return 'border-blue-500/20 bg-blue-500/10 text-blue-400'

    case 'RETURN':
      return 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400'

    case 'TRANSFER':
      return 'border-violet-500/20 bg-violet-500/10 text-violet-400'

    case 'DAMAGE':
      return 'border-red-500/20 bg-red-500/10 text-red-400'

    case 'REPAIR':
      return 'border-orange-500/20 bg-orange-500/10 text-orange-400'

    case 'EXIT':
      return 'border-slate-500/20 bg-slate-500/10 text-slate-400'

    default:
      return 'border-slate-500/20 bg-slate-500/10 text-slate-400'
  }
}

/* =========================================================
   DASHBOARD
   ========================================================= */

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* =======================================================
     CARGAR DATOS
     ======================================================= */

  const loadDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError(null)

      const response = await apiRequest(`/dashboard`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(
          `Backend respondió con HTTP ${response.status}`,
        )
      }

      const result: DashboardResponse = await response.json()

      if (!result.data) throw new Error('La API no devolvió datos del Dashboard.')
      setDashboard(result.data)

      console.log(
        'Dashboard data loaded successfully:',
        result.data,
      )
    } catch (err) {
      console.error('Error loading dashboard:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar los datos del dashboard.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  /* =======================================================
     DATOS
     ======================================================= */

  const equipmentData = dashboard?.equipment ?? {}
  const inventoryData = dashboard?.inventory ?? {}
  const usersData = dashboard?.users ?? {}
  const movementsData = dashboard?.movements ?? {}

  const summary = {
    totalAssets: equipmentData.total ?? 0,
    assigned: equipmentData.assigned ?? 0,
    available: equipmentData.available ?? 0,
    damaged: equipmentData.damaged ?? 0,

    repairs:
      equipmentData.byCondition?.find((item) =>
        ['REPAIR', 'REPAIRING', 'IN_REPAIR'].includes(
          normalize(item.condition),
        ),
      )?.total ?? 0,

    users: usersData.total ?? 0,
  }

  const recentMovements = movementsData.recent ?? []

  /* =======================================================
     EQUIPOS POR CATEGORÍA
     ======================================================= */

  const categoryTotals = equipmentData.byCategory ?? []

  const getCategoryTotal = (names: string[]) => {
    return (
      categoryTotals.find((item) =>
        names.includes(normalize(item.category)),
      )?.total ?? 0
    )
  }

  const equipment: EquipmentItem[] = [
    {
      name: 'Laptops',
      value: getCategoryTotal(['LAPTOP', 'LAPTOPS']),
      icon: Laptop,
      variant: 'purple',
    },
    {
      name: 'Desktops',
      value: getCategoryTotal(['DESKTOP', 'DESKTOPS']),
      icon: Computer,
      variant: 'blue',
    },
    {
      name: 'Monitores',
      value: getCategoryTotal(['MONITOR', 'MONITORES']),
      icon: Monitor,
      variant: 'orange',
    },
  ]

  /* =======================================================
     ESTADOS
     ======================================================= */

  const status: StatusItem[] = [
    {
      name: 'En uso',
      value: summary.assigned,
      icon: Users,
      variant: 'blue',
    },
    {
      name: 'Disponibles',
      value: summary.available,
      icon: CheckCircle2,
      variant: 'green',
    },
    {
      name: 'Dañados',
      value: summary.damaged,
      icon: CircleAlert,
      variant: 'red',
    },
    {
      name: 'En reparación',
      value: summary.repairs,
      icon: Wrench,
      variant: 'orange',
    },
  ]

  /* =======================================================
     PORCENTAJES
     ======================================================= */

  const statusTotal = Math.max(
    summary.totalAssets,
    status.reduce((total, item) => total + item.value, 0),
  )

  const equipmentTotal = equipment.reduce(
    (total, item) => total + item.value,
    0,
  )

  const donutGradient = useMemo(() => {
    if (equipmentTotal <= 0) {
      return 'conic-gradient(#272735 0deg 360deg)'
    }

    let current = 0

    const colors = [
      '#8b5cf6',
      '#3b82f6',
      '#f97316',
    ]

    const segments = equipment.map((item, index) => {
      const start = current
      const degrees = (item.value / equipmentTotal) * 360
      current += degrees

      return `${colors[index]} ${start}deg ${current}deg`
    })

    return `conic-gradient(${segments.join(', ')})`
  }, [equipment, equipmentTotal])

  /* =======================================================
     FECHA
     ======================================================= */

  const currentDate = new Intl.DateTimeFormat('es-DO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  const [period, setPeriod] = useState<7 | 30 | 90>(30)
  const recentMovementsSorted = [...recentMovements].sort((a,b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
  const startPeriod = Date.now() - period * 86400000
  const periodMovements = recentMovementsSorted.filter(m => {
    const t = new Date(m.createdAt ?? '').getTime()
    return Number.isFinite(t) && t >= startPeriod
  })
  const trendPoints = Array.from({length:7},(_,i) => {
    const now = Date.now()
    const end = now - ((6-i) * period/7) * 86400000
    const start = now - ((7-i) * period/7) * 86400000
    const moves = periodMovements.filter(m=>{const t=new Date(m.createdAt ?? '').getTime();return t>=start && t<end})
    return {entries:moves.filter(m=>normalize(m.action)==='ENTRY').length, assignments:moves.filter(m=>['ASSIGN','ASSIGNMENT'].includes(normalize(m.action))).length, movements:moves.length}
  })
  const maxTrend = Math.max(1,...trendPoints.flatMap(p=>[p.entries,p.assignments,p.movements]))
  const trendLine = (key:'entries'|'assignments'|'movements')=> trendPoints.map((p,i)=>`${i===0?'M':'L'} ${22+i*86} ${155-p[key]/maxTrend*123}`).join(' ')
  const hasTrend = trendPoints.some(p=>p.movements>0)
  const recentEquipment = Array.from(new Map(recentMovementsSorted.filter(m=>m.equipment?.id).map(m=>[m.equipment?.id,m])).values()).slice(0,5)
  const locationsMap = new Map<string,number>()
  periodMovements.forEach(m=>{const place=m.toLocation || m.fromLocation;if(place) locationsMap.set(place,(locationsMap.get(place)??0)+1)})
  const locationRows = [...locationsMap.entries()].sort((x,y)=>y[1]-x[1]).slice(0,5)
  const locationMax = Math.max(1,...locationRows.map(([,n])=>n))
  const statRows = [
    {name:'Total de activos',value:summary.totalAssets,icon:Boxes,tone:'blue',href:'/equipment'},
    {name:'Equipos asignados',value:summary.assigned,icon:Monitor,tone:'purple',href:'/equipment'},
    {name:'Disponibles',value:summary.available,icon:CheckCircle2,tone:'green',href:'/equipment'},
    {name:'Dañados',value:summary.damaged,icon:CircleAlert,tone:'red',href:'/maintenance'},
    {name:'En reparación',value:summary.repairs,icon:Wrench,tone:'amber',href:'/maintenance'},
  ] as const

  return (
    <div className="it-dashboard it-exec-v3 min-h-full">
      <div className="it-exec-content">
        <header className="it-exec-heading">
          <div className="it-exec-heading-copy">
            <div className="it-exec-crumb">IT Asset Management <span>•</span> Dashboard</div>
            <h1>Dashboard</h1>
            <h2>Resumen general</h2>
            <p>Estado actual de los equipos, inventario y actividad del sistema.</p>
          </div>
          <div className="it-exec-heading-actions">
            <div className="it-exec-date"><CalendarDays size={18}/><div><span className="capitalize">{currentDate}</span><small>Información actual del sistema</small></div></div>
            <button className="it-exec-btn" onClick={()=>loadDashboard(true)} disabled={refreshing} type="button"><RefreshCw size={17} className={refreshing?'animate-spin':''}/>Actualizar</button>
          </div>
        </header>
        {error && <div role="alert" className="it-exec-error"><CircleAlert size={19}/>No se pudieron actualizar los datos: {error}</div>}
        {(!error || dashboard) && <>
          <section className="it-exec-stats" aria-label="Indicadores de activos">
            {statRows.map((card)=><Link href={card.href} key={card.name} className={`it-exec-stat it-tone-${card.tone}`}>
              <div className="it-exec-stat-top"><span className="it-exec-stat-icon">{(()=>{const Icon=card.icon;return <Icon size={21}/>})()}</span><ArrowRight size={15} className="it-exec-chevron"/></div>
              <div className="it-exec-stat-name">{card.name}</div>
              <div className="it-exec-stat-value">{loading&&!dashboard?'—':formatNumber(card.value)}</div>
              <div className="it-exec-stat-caption">{card.name==='Total de activos'?'Registrados en el sistema':card.name==='Equipos asignados'?'Actualmente en uso':card.name==='Disponibles'?'Listos para asignar':'Requieren seguimiento'}</div>
            </Link>)}
          </section>
          <section className="it-exec-middle">
            <article className="it-exec-panel it-exec-trend">
              <div className="it-exec-panel-head"><div><h3><Activity size={19}/>Tendencia de activos</h3><p>Movimientos con fecha disponibles en la API</p></div><div className="it-exec-period" aria-label="Período de la gráfica">{([7,30,90] as const).map(n=><button key={n} type="button" aria-pressed={period===n} onClick={()=>setPeriod(n)} className={period===n?'selected':''}>{n}D</button>)}</div></div>
              {hasTrend ? <div className="it-exec-chart-wrap"><svg viewBox="0 0 570 187" preserveAspectRatio="none" role="img" aria-label="Movimientos reales agrupados en siete intervalos"><g className="it-exec-chart-grid">{[32,63,94,125,155].map(y=><line key={y} x1="22" y1={y} x2="557" y2={y}/>)}</g><path d={trendLine('movements')} className="it-exec-line-total"/><path d={trendLine('entries')} className="it-exec-line-entries"/><path d={trendLine('assignments')} className="it-exec-line-assign"/></svg><div className="it-exec-chart-legend"><span>● Movimientos</span><span>● Entradas</span><span>● Asignaciones</span></div></div> : <div className="it-exec-empty">No hay movimientos fechados en los últimos {period} días. La gráfica se completará con actividad real.</div>}
              <div className="it-exec-panel-footer"><Link href="/history">Consultar historial <ArrowRight size={15}/></Link></div>
            </article>
            <article className="it-exec-panel it-exec-distribution"><div className="it-exec-panel-head"><div><h3><Boxes size={19}/>Distribución de equipos</h3><p>Activos registrados por categoría</p></div></div><div className="it-exec-distribution-inner"><div className="it-exec-donut" style={{background:donutGradient}}><div><strong>{loading&&!dashboard?'—':formatNumber(equipmentTotal)}</strong><small>Equipos</small></div></div><div className="it-exec-legend">{equipment.map((e,i)=><div key={e.name}><span className={`it-dot it-dot-${i}`}/><span>{e.name}</span><strong>{formatNumber(e.value)}</strong></div>)}</div></div><div className="it-exec-panel-footer"><Link href="/equipment">Ver equipos <ArrowRight size={15}/></Link></div></article>
            <article className="it-exec-panel it-exec-recent"><div className="it-exec-panel-head"><div><h3><Clock3 size={19}/>Actividad reciente</h3><p>Movimientos registrados</p></div><Link className="it-exec-plain-link" href="/history">Ver todo <ArrowRight size={14}/></Link></div><div className="it-exec-activity-list">{recentMovementsSorted.length ? recentMovementsSorted.slice(0,5).map((m,i)=><div key={m.id??i} className="it-exec-activity-row"><span className="it-exec-list-icon"><Activity size={17}/></span><div><strong>{formatAction(m.action)}</strong><small>{m.equipment?.assetTag || m.equipment?.serialNumber || m.equipment?.model || 'Movimiento registrado'}</small></div><time>{formatDateTime(m.createdAt)}</time></div>):<div className="it-exec-empty">No hay actividad reciente registrada.</div>}</div></article>
          </section>
          <section className="it-exec-bottom">
            <article className="it-exec-panel"><div className="it-exec-panel-head"><div><h3><Monitor size={19}/>Equipos con actividad reciente</h3><p>Registros incluidos en los últimos movimientos</p></div><Link className="it-exec-plain-link" href="/equipment">Ver todos <ArrowRight size={14}/></Link></div>{recentEquipment.length?<div className="it-exec-table-wrap"><table className="it-exec-table"><thead><tr><th>Equipo</th><th>Tipo</th><th>Último movimiento</th><th>Fecha</th></tr></thead><tbody>{recentEquipment.map((m,i)=><tr key={m.equipment?.id??i}><td>{m.equipment?.assetTag||m.equipment?.serialNumber||m.equipment?.model||'Equipo'}</td><td>{m.equipment?.category||'—'}</td><td>{formatAction(m.action)}</td><td>{formatDateTime(m.createdAt)}</td></tr>)}</tbody></table></div>:<div className="it-exec-empty">Todavía no hay equipos vinculados a movimientos recientes.</div>}</article>
            <article className="it-exec-panel"><div className="it-exec-panel-head"><div><h3><MapPin size={19}/>Ubicaciones en movimientos</h3><p>Destinos registrados en los últimos {period} días</p></div><Link className="it-exec-plain-link" href="/map">Ver mapa <ArrowRight size={14}/></Link></div><div className="it-exec-locations">{locationRows.length?locationRows.map(([name,value])=><div className="it-exec-location" key={name}><span>{name}</span><b>{value}</b><div className="it-exec-location-track"><div style={{width:`${value/locationMax*100}%`}}/></div></div>):<div className="it-exec-empty">Sin ubicaciones registradas en los movimientos del período.</div>}</div></article>
          </section>
        </>}
      </div>
    </div>
  )
}

/* =========================================================
   STAT CARD
   ========================================================= */

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  variant,
  href,
}: StatCardProps) {

  const styles = {
    purple: {
      icon: 'bg-violet-500/10 text-violet-400',
      glow: 'bg-violet-500/20',
      border: 'hover:border-violet-500/30',
      value: 'text-white',
    },

    blue: {
      icon: 'bg-blue-500/10 text-blue-400',
      glow: 'bg-blue-500/20',
      border: 'hover:border-blue-500/30',
      value: 'text-white',
    },

    green: {
      icon: 'bg-emerald-500/10 text-emerald-400',
      glow: 'bg-emerald-500/20',
      border: 'hover:border-emerald-500/30',
      value: 'text-white',
    },

    orange: {
      icon: 'bg-orange-500/10 text-orange-400',
      glow: 'bg-orange-500/20',
      border: 'hover:border-orange-500/30',
      value: 'text-white',
    },
  }

  const style = styles[variant]

  const content = (
    <div
      className={`
        it-dashboard-stat group relative min-h-[138px]
        overflow-hidden rounded-2xl
        border border-white/[0.07]
        bg-[#11141f]
        p-4
        transition-all duration-300
        hover:-translate-y-0.5
        hover:shadow-2xl
        ${style.border}
      `}
    >

      {/* GLOW */}

      <div
        className={`
          pointer-events-none
          absolute -right-10 -top-10
          h-32 w-32
          rounded-full
          blur-3xl
          opacity-70
          transition-opacity
          group-hover:opacity-100
          ${style.glow}
        `}
      />

      {/* ICON */}

      <div className="relative flex items-start justify-between">

        <div
          className={`
            flex h-11 w-11
            items-center justify-center
            rounded-xl
            ${style.icon}
          `}
        >
          <Icon size={21} />
        </div>

        <ArrowRight
          size={17}
          className="
            text-slate-700
            transition
            group-hover:translate-x-1
            group-hover:text-slate-400
          "
        />

      </div>

      {/* CONTENT */}

      <div className="relative mt-3">

        <p className="text-sm text-slate-400">
          {title}
        </p>

        <p className={`mt-1 text-[28px] leading-tight font-bold ${style.value}`}>
          {formatNumber(value)}
        </p>

        <p className="mt-1 text-xs text-slate-600">
          {description}
        </p>

      </div>

    </div>
  )

  if (!href) {
    return content
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  )
}

/* =========================================================
   DASHBOARD PANEL
   ========================================================= */

function DashboardPanel({
  title,
  description,
  children,
  action,
}: {
  title: string
  description: string
  children: React.ReactNode
  action?: React.ReactNode
}) {

  return (
    <div
      className="
        it-dashboard-panel overflow-hidden
        rounded-2xl
        border border-white/[0.07]
        bg-[#11141f]
        shadow-xl shadow-black/10
      "
    >

      <div className="flex items-start justify-between gap-4 border-b border-white/[0.05] px-5 py-5 md:px-6">

        <div>
          <h2 className="text-sm font-semibold text-white md:text-base">
            {title}
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {description}
          </p>
        </div>

        {action}

      </div>

      <div className="p-5 md:p-6">
        {children}
      </div>

    </div>
  )
}

/* =========================================================
   EQUIPMENT LEGEND
   ========================================================= */

function EquipmentLegend({
  item,
  percentage,
  loading,
}: {
  item: EquipmentItem
  percentage: number
  loading: boolean
}) {

  const variants = {
    purple: 'bg-violet-500',
    blue: 'bg-blue-500',
    orange: 'bg-orange-500',
    green: 'bg-emerald-500',
  }

  const iconVariants = {
    purple: 'bg-violet-500/10 text-violet-400',
    blue: 'bg-blue-500/10 text-blue-400',
    orange: 'bg-orange-500/10 text-orange-400',
    green: 'bg-emerald-500/10 text-emerald-400',
  }

  const Icon = item.icon

  return (
    <div
      className="
        rounded-xl
        border border-white/[0.05]
        bg-white/[0.015]
        p-3
      "
    >

      <div className="flex items-center gap-3">

        <div
          className={`
            flex h-9 w-9 shrink-0
            items-center justify-center
            rounded-lg
            ${iconVariants[item.variant]}
          `}
        >
          <Icon size={17} />
        </div>

        <div className="min-w-0 flex-1">

          <div className="flex items-center justify-between gap-3">

            <span className="text-sm font-medium text-slate-300">
              {item.name}
            </span>

            <div className="flex items-center gap-3">

              <span className="text-sm font-bold text-white">
                {loading ? 0 : item.value}
              </span>

              <span className="w-10 text-right text-xs text-slate-500">
                {loading ? 0 : percentage}%
              </span>

            </div>

          </div>

          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">

            <div
              className={`
                h-full rounded-full transition-all duration-700
                ${variants[item.variant]}
              `}
              style={{
                width: loading ? '0%' : `${percentage}%`,
              }}
            />

          </div>

        </div>

      </div>

    </div>
  )
}

/* =========================================================
   STATUS ROW
   ========================================================= */

function StatusRow({
  item,
  percentage,
  loading,
}: {
  item: StatusItem
  percentage: number
  loading: boolean
}) {

  const styles = {
    blue: {
      icon: 'bg-blue-500/10 text-blue-400',
      bar: 'bg-blue-500',
    },

    green: {
      icon: 'bg-emerald-500/10 text-emerald-400',
      bar: 'bg-emerald-500',
    },

    red: {
      icon: 'bg-red-500/10 text-red-400',
      bar: 'bg-red-500',
    },

    orange: {
      icon: 'bg-orange-500/10 text-orange-400',
      bar: 'bg-orange-500',
    },
  }

  const style = styles[item.variant]
  const Icon = item.icon

  return (
    <div>

      <div className="mb-2 flex items-center gap-3">

        <div
          className={`
            flex h-8 w-8
            items-center justify-center
            rounded-lg
            ${style.icon}
          `}
        >
          <Icon size={15} />
        </div>

        <div className="flex flex-1 items-center justify-between">

          <span className="text-sm text-slate-400">
            {item.name}
          </span>

          <div className="flex items-center gap-3">

            <span className="text-sm font-semibold text-white">
              {loading ? 0 : item.value}
            </span>

            <span className="w-9 text-right text-xs text-slate-600">
              {loading ? 0 : `${percentage}%`}
            </span>

          </div>

        </div>

      </div>

      <div className="ml-11 h-2 overflow-hidden rounded-full bg-white/[0.05]">

        <div
          className={`
            h-full rounded-full
            transition-all duration-700
            ${style.bar}
          `}
          style={{
            width: loading ? '0%' : `${percentage}%`,
          }}
        />

      </div>

    </div>
  )
}

/* =========================================================
   QUICK METRIC
   ========================================================= */

function QuickMetric({
  icon: Icon,
  title,
  value,
  description,
  variant,
  href,
}: {
  icon: LucideIcon
  title: string
  value: number
  description: string
  variant: 'purple' | 'blue' | 'orange' | 'green'
  href: string
}) {

  const styles = {
    purple: {
      icon: 'bg-violet-500/10 text-violet-400',
      glow: 'bg-violet-500/10',
    },

    blue: {
      icon: 'bg-blue-500/10 text-blue-400',
      glow: 'bg-blue-500/10',
    },

    orange: {
      icon: 'bg-orange-500/10 text-orange-400',
      glow: 'bg-orange-500/10',
    },

    green: {
      icon: 'bg-emerald-500/10 text-emerald-400',
      glow: 'bg-emerald-500/10',
    },
  }

  const style = styles[variant]

  return (
    <Link
      href={href}
      className="
        it-dashboard-quick group relative
        overflow-hidden
        rounded-2xl
        border border-white/[0.07]
        bg-[#11141f]
        p-5
        transition-all duration-300
        hover:-translate-y-0.5
        hover:border-white/[0.13]
      "
    >

      <div
        className={`
          pointer-events-none
          absolute -right-8 -bottom-8
          h-24 w-24
          rounded-full
          blur-3xl
          ${style.glow}
        `}
      />

      <div className="relative flex items-center gap-4">

        <div
          className={`
            flex h-11 w-11
            shrink-0 items-center justify-center
            rounded-xl
            ${style.icon}
          `}
        >
          <Icon size={20} />
        </div>

        <div className="min-w-0 flex-1">

          <p className="truncate text-xs text-slate-500">
            {title}
          </p>

          <p className="mt-1 text-2xl font-bold">
            {formatNumber(value)}
          </p>

          <p className="mt-1 text-xs text-slate-600">
            {description}
          </p>

        </div>

        <ArrowRight
          size={17}
          className="
            text-slate-700
            transition
            group-hover:translate-x-1
            group-hover:text-slate-400
          "
        />

      </div>

    </Link>
  )
}

/* =========================================================
   ACTIVIDAD
   ========================================================= */

function ActivityTable({
  movements,
}: {
  movements: RecentMovement[]
}) {

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06]">

      {/* DESKTOP */}

      <div className="hidden overflow-x-auto md:block">

        <table className="w-full min-w-[900px] border-collapse">

          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.025]">

              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                Fecha
              </th>

              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                Equipo
              </th>

              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                Acción
              </th>

              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                Usuario
              </th>

              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                Ubicación
              </th>

            </tr>
          </thead>

          <tbody>

            {movements.slice(0, 8).map((movement, index) => {

              const equipmentName =
                movement.equipment?.model ||
                movement.equipment?.assetTag ||
                movement.equipment?.serialNumber ||
                'Equipo'

              const equipmentType =
                movement.equipment?.category ||
                'Activo'

              const location =
                movement.toLocation ||
                movement.fromLocation ||
                '—'

              return (
                <tr
                  key={movement.id || `${equipmentName}-${index}`}
                  className="
                    border-b border-white/[0.04]
                    last:border-b-0
                    transition
                    hover:bg-white/[0.02]
                  "
                >

                  <td className="whitespace-nowrap px-4 py-4">

                    <div className="flex items-center gap-2 text-xs text-slate-400">

                      <Clock3
                        size={14}
                        className="text-slate-600"
                      />

                      {formatDateTime(movement.createdAt)}

                    </div>

                  </td>

                  <td className="px-4 py-4">

                    <div className="flex items-center gap-3">

                      <div
                        className="
                          flex h-9 w-9 shrink-0
                          items-center justify-center
                          rounded-lg
                          bg-violet-500/10
                          text-violet-400
                        "
                      >
                        <Laptop size={17} />
                      </div>

                      <div className="min-w-0">

                        <p className="truncate text-sm font-medium text-white">
                          {equipmentName}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-600">
                          {equipmentType}
                          {movement.equipment?.brand
                            ? ` Â· ${movement.equipment.brand}`
                            : ''}
                        </p>

                      </div>

                    </div>

                  </td>

                  <td className="px-4 py-4">

                    <span
                      className={`
                        inline-flex
                        rounded-full
                        border
                        px-2.5 py-1
                        text-[10px]
                        font-bold
                        tracking-wide
                        ${getActionClasses(movement.action)}
                      `}
                    >
                      {formatAction(movement.action)}
                    </span>

                  </td>

                  <td className="px-4 py-4">

                    <span className="text-sm text-slate-400">
                      {movement.assignedUser || '—'}
                    </span>

                  </td>

                  <td className="px-4 py-4">

                    <div className="flex items-center gap-2 text-sm text-slate-400">

                      <MapPin
                        size={15}
                        className="shrink-0 text-blue-400"
                      />

                      <span className="max-w-[220px] truncate">
                        {location}
                      </span>

                    </div>

                  </td>

                </tr>
              )
            })}

          </tbody>

        </table>

      </div>

      {/* MOBILE */}

      <div className="divide-y divide-white/[0.05] md:hidden">

        {movements.slice(0, 8).map((movement, index) => {

          const equipmentName =
            movement.equipment?.model ||
            movement.equipment?.assetTag ||
            'Equipo'

          const location =
            movement.toLocation ||
            movement.fromLocation ||
            '—'

          return (
            <div
              key={movement.id || `${equipmentName}-${index}`}
              className="p-4"
            >

              <div className="flex items-start justify-between gap-3">

                <div className="flex min-w-0 items-center gap-3">

                  <div
                    className="
                      flex h-10 w-10 shrink-0
                      items-center justify-center
                      rounded-xl
                      bg-violet-500/10
                      text-violet-400
                    "
                  >
                    <Laptop size={18} />
                  </div>

                  <div className="min-w-0">

                    <p className="truncate text-sm font-semibold">
                      {equipmentName}
                    </p>

                    <p className="mt-1 truncate text-xs text-slate-600">
                      {movement.equipment?.category || 'Activo'}
                    </p>

                  </div>

                </div>

                <span
                  className={`
                    shrink-0
                    rounded-full
                    border
                    px-2 py-1
                    text-[9px]
                    font-bold
                    ${getActionClasses(movement.action)}
                  `}
                >
                  {formatAction(movement.action)}
                </span>

              </div>

              <div className="mt-4 space-y-2 text-xs">

                <div className="flex items-center gap-2 text-slate-500">

                  <Clock3 size={13} />

                  {formatDateTime(movement.createdAt)}

                </div>

                <div className="flex items-center gap-2 text-slate-500">

                  <MapPin size={13} />

                  <span className="truncate">
                    {location}
                  </span>

                </div>

                {movement.assignedUser && (
                  <div className="flex items-center gap-2 text-slate-500">

                    <Users size={13} />

                    {movement.assignedUser}

                  </div>
                )}

              </div>

            </div>
          )
        })}

      </div>

    </div>
  )
}

/* =========================================================
   ACTIVIDAD VACÃA
   ========================================================= */

function EmptyActivity() {

  return (
    <div
      className="
        flex min-h-[230px]
        flex-col items-center justify-center
        rounded-xl
        border border-dashed
        border-white/[0.08]
        bg-white/[0.015]
        px-6 text-center
      "
    >

      <div
        className="
          flex h-14 w-14
          items-center justify-center
          rounded-2xl
          bg-violet-500/10
          text-violet-400
        "
      >
        <Activity size={25} />
      </div>

      <p className="mt-4 text-sm font-medium text-slate-300">
        No hay movimientos recientes
      </p>

      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-600">
        Cuando se registre una entrada, asignación, devolución,
        traslado o reparación, aparecerá aquí.
      </p>

      <Link
        href="/movements"
        className="
          mt-5 flex items-center gap-2
          rounded-xl
          border border-white/[0.07]
          bg-white/[0.03]
          px-4 py-2
          text-xs font-semibold
          text-slate-300
          transition
          hover:bg-white/[0.06]
          hover:text-white
        "
      >
        Ir a movimientos
        <ArrowRight size={14} />
      </Link>

    </div>
  )
}

/* =========================================================
   LOADING
   ========================================================= */

function ActivitySkeleton() {

  return (
    <div className="space-y-3">

      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="
            h-16
            animate-pulse
            rounded-xl
            bg-white/[0.03]
          "
        />
      ))}

    </div>
  )
}


