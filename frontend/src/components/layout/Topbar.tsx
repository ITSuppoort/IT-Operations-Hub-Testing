'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, ChevronDown, ChevronUp, LogOut, Search, Settings, X, Monitor, AlertTriangle, Wrench, UserRound, Sun, Moon, Languages, Palette, Check } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { getUserDisplayName, getUserInitials } from '@/lib/auth'
import { apiRequest } from '@/lib/api'

type Asset = { id?: string; pcName?: string | null; assetTag?: string | null; serial?: string | null; brand?: string | null; model?: string | null; type?: string | null; status?: string | null; condition?: string | null }
type TopbarProps = { hidden: boolean; onToggle: () => void; theme: 'dark' | 'light'; onThemeToggle: () => void; language: 'es' | 'en'; onLanguageChange: (next: 'es' | 'en') => void; accent: string; onAccentChange: (next: string) => void }
const accentOptions = ['#8257f5', '#2563eb', '#0d9488', '#db2777', '#d97706', '#475569']
const headings: Record<string, [string, string]> = {
  '/dashboard': ['Dashboard', 'Resumen de operaciones tecnológicas'],
  '/equipment': ['Equipos en uso', 'Consulta de activos tecnológicos y asignaciones'],
  '/inventory': ['Inventario / Store', 'Administración central de activos y existencias'],
  '/map': ['Mapa / Posiciones', 'Ubicaciones, posiciones y equipos'],
  '/maintenance': ['Dañados y reparaciones', 'Incidencias y seguimiento técnico'],
  '/users': ['Usuarios', 'Personas y asignaciones'],
  '/history': ['Historial', 'Registro de actividades y cambios'],
  '/reports': ['Reportes', 'Análisis e informes operativos'],
  '/settings': ['Configuración', 'Parámetros de la plataforma'],
  '/movements': ['Movimientos', 'Registros históricos de inventario'],
}

const searchableModules = [
  { label: 'Dashboard', path: '/dashboard', keywords: 'inicio resumen panel general' },
  { label: 'Equipos en uso', path: '/equipment', keywords: 'equipo equipos desktop laptop activo activos computadora pc' },
  { label: 'Inventario / Store', path: '/inventory', keywords: 'almacén almacen inventario store existencia stock' },
  { label: 'Mapa / Posiciones', path: '/map', keywords: 'mapa posicion posiciones ubicación ubicacion asiento puesto' },
  { label: 'Usuarios', path: '/users', keywords: 'usuario usuarios personas empleados' },
  { label: 'Dañados y reparaciones', path: '/maintenance', keywords: 'dañados danados reparación reparacion mantenimiento incidencias' },
  { label: 'Historial', path: '/history', keywords: 'historia historial auditoría auditoria registros' },
  { label: 'Reportes', path: '/reports', keywords: 'reporte reportes informe informes estadísticas' },
  { label: 'Configuración', path: '/settings', keywords: 'configuracion configuración ajustes parametros parámetros' },
]

export default function Topbar({ hidden, onToggle, theme, onThemeToggle, language, onLanguageChange, accent, onAccentChange }: TopbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const [languageOpen, setLanguageOpen] = useState(false)
  const [colorsOpen, setColorsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<Asset[]>([])
  const [alerts, setAlerts] = useState<Asset[]>([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [loadingAlerts, setLoadingAlerts] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [alertsError, setAlertsError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [title, description] = headings[pathname ?? ''] || ['IT Operations Hub', 'Gestión tecnológica empresarial']

  const fetchAssets = useCallback(async (): Promise<Asset[]> => {
    const response = await apiRequest('/equipment')
    if (!response.ok) throw new Error(`API de equipos: HTTP ${response.status}`)
    const data: unknown = await response.json()
    if (!Array.isArray(data)) throw new Error('La API no devolvió una lista válida.')
    return data as Asset[]
  }, [])

  useEffect(() => {
    function handleKeys(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
        setAlertsOpen(false)
        setProfileOpen(false)
        setLanguageOpen(false); setColorsOpen(false)
        setTimeout(() => inputRef.current?.focus(), 0)
      }
      if (event.key === 'Escape') { setSearchOpen(false); setAlertsOpen(false); setProfileOpen(false); setLanguageOpen(false); setColorsOpen(false); setLanguageOpen(false); setColorsOpen(false) }
    }
    function outside(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setSearchOpen(false); setAlertsOpen(false); setProfileOpen(false); setLanguageOpen(false); setColorsOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeys)
    document.addEventListener('mousedown', outside)
    return () => { document.removeEventListener('keydown', handleKeys); document.removeEventListener('mousedown', outside) }
  }, [])

  useEffect(() => {
    if (!searchOpen || !term.trim()) { setResults([]); setSearchError(''); return }
    let alive = true
    const timer = window.setTimeout(async () => {
      setLoadingSearch(true)
      try {
        const assets = await fetchAssets()
        const q = term.toLocaleLowerCase().trim()
        if (alive) {
          setResults(assets.filter(a => [a.pcName, a.assetTag, a.serial, a.brand, a.model, a.type].some(v => String(v ?? '').toLocaleLowerCase().includes(q))).slice(0, 12))
          setSearchError('')
        }
      } catch (err) { if (alive) { setResults([]); setSearchError(err instanceof Error ? err.message : 'No se pudo buscar.') } }
      finally { if (alive) setLoadingSearch(false) }
    }, 250)
    return () => { alive = false; window.clearTimeout(timer) }
  }, [term, searchOpen, fetchAssets])

  const normalizedTerm = term.trim().toLocaleLowerCase()
  const moduleResults = normalizedTerm
    ? searchableModules.filter(item => `${item.label} ${item.keywords}`.toLocaleLowerCase().includes(normalizedTerm)).slice(0, 6)
    : []

  const navigateResult = (path: string) => {
    setSearchOpen(false)
    setTerm('')
    router.push(path)
  }

  const submitSearch = () => {
    const q = term.trim()
    if (!q) { inputRef.current?.focus(); return }
    // Las coincidencias se presentan aquí; no se inventa una ruta de detalle.
    // Enter abre la coincidencia cuando solo existe una opción verificable.
    if (!loadingSearch && !searchError && moduleResults.length + results.length === 1) {
      if (moduleResults.length === 1) navigateResult(moduleResults[0].path)
      else navigateResult('/equipment')
    }
  }

  const openAlerts = async () => {
    const open = !alertsOpen
    setAlertsOpen(open); setSearchOpen(false); setProfileOpen(false)
    if (!open) return
    setLoadingAlerts(true); setAlertsError('')
    try {
      const assets = await fetchAssets()
      setAlerts(assets.filter(a => ['DAMAGED','REPAIR','IN_REPAIR','UNDER_REPAIR'].includes(String(a.status ?? '').toUpperCase()) || String(a.condition ?? '').toUpperCase() === 'DAMAGED').slice(0, 30))
    } catch (err) { setAlerts([]); setAlertsError(err instanceof Error ? err.message : 'No se pudieron consultar las alertas.') }
    finally { setLoadingAlerts(false) }
  }

  const signOut = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try { await logout() } finally { router.replace('/login'); setLoggingOut(false) }
  }

  if (hidden) return <button type="button" onClick={onToggle} title="Mostrar barra superior" className="fixed right-5 top-0 z-50 rounded-b-xl border border-white/15 bg-[#111a2c] px-4 py-1.5 text-white"><ChevronDown size={17}/></button>

  return <header ref={wrapRef} className="it-topbar it-topbar-premium sticky top-0 z-40 flex min-h-[82px] shrink-0 flex-wrap items-center gap-2 px-3 py-2.5 text-white md:gap-3 md:px-5 xl:px-7">
    <div className="it-topbar-page-label hidden min-w-0 shrink-0 2xl:block" title={`${title} · ${description}`}>
      <span className="block max-w-[115px] truncate text-xs font-semibold tracking-wide">{title}</span>
    </div>
    <div className="relative min-w-[200px] flex-1" role="search">
      <div className={`it-topbar-searchbar flex h-11 w-full items-center gap-2 rounded-xl border px-3 ${searchOpen ? 'it-topbar-search-focused' : ''}`}>
        <Search size={18} className="shrink-0 opacity-75" aria-hidden="true"/>
        <input ref={inputRef} value={term} onFocus={() => { setSearchOpen(true);setAlertsOpen(false);setProfileOpen(false);setLanguageOpen(false);setColorsOpen(false) }} onChange={e => { setTerm(e.target.value);setSearchOpen(true) }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitSearch() } if (e.key === 'Escape') setSearchOpen(false) }} placeholder={language === 'es' ? 'Buscar equipos, módulos, seriales, usuarios...' : 'Search equipment, modules, serials, users...'} aria-label={language === 'es' ? 'Buscar en IT Operations Hub' : 'Search IT Operations Hub'} aria-autocomplete="list" aria-expanded={searchOpen && !!term.trim()} aria-controls="it-global-suggestions" className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:opacity-65" />
        {term && <button type="button" onClick={() => {setTerm('');inputRef.current?.focus()}} aria-label="Limpiar búsqueda" className="rounded-md p-1 opacity-70 hover:opacity-100"><X size={15}/></button>}
        <button type="button" onClick={() => {setSearchOpen(true);submitSearch()}} className="it-topbar-primary inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"><Search size={14}/>{language === 'es' ? 'Buscar' : 'Search'}</button>
      </div>
      {searchOpen && !!term.trim() && <div id="it-global-suggestions" className="it-topbar-suggestions absolute left-0 right-0 top-[48px] z-[70] max-h-[300px] overflow-y-auto rounded-xl border py-1 shadow-2xl" role="listbox" aria-label="Sugerencias de búsqueda">
        {moduleResults.map(item => <button type="button" role="option" aria-selected="false" key={item.path} onClick={() => navigateResult(item.path)} className="it-topbar-suggestion flex w-full items-center gap-3 px-3 py-2 text-left text-sm"><Settings size={16} className="shrink-0 opacity-65"/><span className="min-w-0 flex-1 truncate">{item.label}</span><span className="text-[11px] opacity-50">Módulo</span></button>)}
        {!searchError && results.map((asset, i) => <button type="button" role="option" aria-selected="false" key={String(asset.id ?? i)} onClick={() => navigateResult('/equipment')} className="it-topbar-suggestion flex w-full items-center gap-3 px-3 py-2 text-left text-sm"><Monitor size={16} className="shrink-0 opacity-65"/><span className="min-w-0 flex-1"><span className="block truncate font-medium">{asset.pcName || asset.assetTag || asset.serial || 'Activo sin nombre'}</span><span className="block truncate text-[11px] opacity-60">{[asset.type,asset.brand,asset.model].filter(Boolean).join(' · ')}</span></span></button>)}
        {loadingSearch && <div className="px-3 py-2 text-xs opacity-70">Buscando equipos...</div>}
        {searchError && <div role="alert" className="px-3 py-2 text-xs text-rose-400">{searchError}</div>}
        {!loadingSearch && !searchError && moduleResults.length === 0 && results.length === 0 && <div className="px-3 py-2 text-xs opacity-70">Sin coincidencias</div>}
      </div>}
    </div>
    <div className="relative shrink-0">
      <button type="button" className="it-topbar-control inline-flex h-11 items-center gap-1.5 rounded-xl px-3" onClick={() => { setLanguageOpen(!languageOpen); setColorsOpen(false); setProfileOpen(false); setAlertsOpen(false); setSearchOpen(false) }} aria-label="Seleccionar idioma" aria-expanded={languageOpen} title="Idioma / Language"><Languages size={18}/><span className="text-xs font-semibold">{language.toUpperCase()}</span></button>
      {languageOpen && <div className="it-topbar-popover absolute right-0 top-12 z-[70] w-44 rounded-xl p-2 shadow-2xl">{(['es','en'] as const).map(lang => <button key={lang} type="button" className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-violet-500/15" onClick={() => {onLanguageChange(lang);setLanguageOpen(false)}}>{lang === 'es' ? 'Español' : 'English'}{language === lang && <Check size={15}/>}</button>)}<p className="px-2 pt-2 text-[10px] opacity-60">{language === 'es' ? 'Traducción completa de módulos: pendiente.' : 'Full module translations: pending.'}</p></div>}
    </div>
    <button type="button" className="it-topbar-control flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" onClick={onThemeToggle} aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'} title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>{theme === 'dark' ? <Sun size={19}/> : <Moon size={19}/>}</button>
    <div className="relative shrink-0">
      <button type="button" className="it-topbar-control flex h-11 w-11 items-center justify-center rounded-xl" onClick={() => {setColorsOpen(!colorsOpen);setLanguageOpen(false);setProfileOpen(false);setAlertsOpen(false);setSearchOpen(false)}} aria-label="Personalizar color" aria-expanded={colorsOpen} title="Personalizar color"><Palette size={19}/></button>
      {colorsOpen && <div className="it-topbar-popover absolute right-0 top-12 z-[70] w-56 rounded-xl p-3 shadow-2xl"><p className="mb-3 text-xs font-semibold">{language === 'es' ? 'Color de acento' : 'Accent color'}</p><div className="grid grid-cols-6 gap-1.5">{accentOptions.map(color=><button key={color} type="button" onClick={()=>onAccentChange(color)} style={{backgroundColor:color}} aria-label={`Color ${color}`} aria-pressed={accent.toLowerCase()===color} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white/25">{accent.toLowerCase()===color && <Check size={14} className="text-white"/>}</button>)}</div><label className="mt-3 flex items-center justify-between gap-3 text-xs"><span>{language === 'es' ? 'Personalizado' : 'Custom'}</span><input type="color" value={accent} onChange={e=>onAccentChange(e.target.value)} aria-label="Color personalizado" className="h-9 w-12 cursor-pointer rounded-lg border-0 bg-transparent" /></label><p className="mt-2 text-[10px] opacity-60">{language === 'es' ? 'La preferencia se guarda. La cobertura completa llegará desde Configuración.' : 'Preference is saved. Full support will be added in Settings.'}</p></div>}
    </div>
    <div className="relative shrink-0">
      <button type="button" onClick={()=>void openAlerts()} className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10" aria-label="Ver alertas" aria-expanded={alertsOpen}><Bell size={20}/></button>
      {alertsOpen && <div className="absolute right-0 top-12 z-[60] w-[min(340px,calc(100vw-24px))] rounded-xl border border-violet-500/25 bg-[#101827] p-3 shadow-2xl"><div className="mb-2 flex items-center justify-between"><strong className="text-sm">Alertas de equipos</strong><button onClick={()=>setAlertsOpen(false)} aria-label="Cerrar alertas"><X size={16}/></button></div>
        {loadingAlerts ? <p className="py-4 text-xs text-slate-400">Consultando...</p> : alertsError ? <p role="alert" className="py-4 text-xs text-rose-300">{alertsError}</p> : alerts.length === 0 ? <p className="py-4 text-xs text-slate-400">No hay equipos dañados o en reparación en la consulta actual.</p> : <div className="max-h-72 space-y-1 overflow-y-auto">{alerts.map((a,i)=><button key={String(a.id??i)} type="button" onClick={()=>{setAlertsOpen(false);router.push('/maintenance')}} className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-xs hover:bg-white/10">{String(a.status).toUpperCase().includes('REPAIR') ? <Wrench size={16} className="text-amber-300"/> : <AlertTriangle size={16} className="text-rose-300"/>}<span className="truncate">{a.pcName||a.assetTag||a.serial||'Activo'} — {a.status}</span></button>)}</div>}
        <p className="mt-2 border-t border-white/10 pt-2 text-[11px] text-slate-500">Alertas basadas en el estado real de equipos; otras fuentes pendientes de integración.</p></div>}
    </div>
    <div className="relative shrink-0">
      <button type="button" onClick={()=>{setProfileOpen(!profileOpen);setAlertsOpen(false);setSearchOpen(false)}} aria-expanded={profileOpen} className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-white/10"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-700 text-sm font-bold">{getUserInitials(user)}</span><span className="hidden max-w-[130px] text-left md:block"><span className="block truncate text-sm font-semibold">{getUserDisplayName(user)}</span><span className="block truncate text-xs text-slate-400">{user?.role ?? 'Usuario'}</span></span><ChevronDown size={15} className="hidden text-slate-400 md:block"/></button>
      {profileOpen && <div className="absolute right-0 top-14 z-[60] w-64 overflow-hidden rounded-xl border border-white/10 bg-[#101827] p-2 shadow-2xl"><div className="border-b border-white/10 px-3 py-3"><p className="truncate text-sm font-semibold">{getUserDisplayName(user)}</p><p className="truncate text-xs text-slate-400">{user?.email}</p></div><button type="button" onClick={()=>{setProfileOpen(false);router.push('/users')}} className="flex w-full items-center gap-2 rounded-lg p-3 text-left text-sm hover:bg-white/10"><UserRound size={17}/> Usuarios</button><button type="button" onClick={()=>{setProfileOpen(false);router.push('/settings')}} className="flex w-full items-center gap-2 rounded-lg p-3 text-left text-sm hover:bg-white/10"><Settings size={17}/> Configuración</button><button type="button" disabled={loggingOut} onClick={()=>void signOut()} className="flex w-full items-center gap-2 rounded-lg border-t border-white/10 p-3 text-left text-sm text-rose-300 hover:bg-rose-500/10"><LogOut size={17}/> {loggingOut?'Cerrando...':'Cerrar sesión'}</button></div>}
    </div>
    <button type="button" onClick={onToggle} title="Ocultar barra superior" aria-label="Ocultar barra superior" className="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 md:flex"><ChevronUp size={17}/></button>
  </header>
}
