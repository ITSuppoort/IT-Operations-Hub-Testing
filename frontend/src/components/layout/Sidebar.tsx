'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'

import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  FileBarChart,
  History,
  LayoutDashboard,
  MapPin,
  Monitor,
  Package,
  Settings,
  Users,
  Sun,
  Moon,
  LogOut,
  Laptop,
  Server,
  Activity,
} from 'lucide-react'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  theme: 'dark' | 'light'
  onThemeToggle: () => void
}

const menuSections = [
  {
    label: 'GENERAL',
    items: [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { name: 'Equipos en uso', icon: Monitor, path: '/equipment' },
      { name: 'Inventario y Almacén', icon: Package, path: '/inventory' },
      { name: 'Mapa / Posiciones', icon: MapPin, path: '/map' },
      { name: 'Usuarios y Posiciones', icon: Users, path: '/users' },
    ],
  },
  {
    label: 'GESTIÓN TÉCNICA',
    items: [
      { name: 'Dañados y reparaciones', icon: CircleAlert, path: '/maintenance' },
    ],
  },
  {
    label: 'CONTROL Y ANÁLISIS',
    items: [
      { name: 'Historial y Reportes', icon: FileBarChart, path: '/reports' },
    ],
  },
  {
    label: 'ADMINISTRACIÓN',
    items: [
      { name: 'Configuración', icon: Settings, path: '/settings' },
    ],
  },
]

export default function Sidebar({
  collapsed,
  onToggle,
  theme,
  onThemeToggle,
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const light = theme === 'light'

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)

    try {
      await logout()
    } finally {
      router.replace('/login')
      setLoggingOut(false)
    }
  }

  return (
    <aside
      className={`
        it-sidebar
        sticky top-3 relative isolate
        my-3 ml-3 mr-1
        flex h-[calc(100vh-24px)] shrink-0 flex-col overflow-hidden
        rounded-[23px] border backdrop-blur-xl
        transition-all duration-300 ease-in-out
        ${light
          ? 'border-indigo-200/90 bg-gradient-to-b from-white/95 via-[#f4f7ff]/95 to-[#eaf0ff]/95 text-slate-900 shadow-[0_18px_46px_rgba(56,75,122,.17),0_0_0_1px_rgba(130,145,211,.1)]'
          : 'border-indigo-400/40 bg-gradient-to-b from-[#0d1734]/95 via-[#080f25]/95 to-[#10143a]/95 text-white shadow-[0_20px_52px_rgba(2,5,18,.62),0_0_24px_rgba(91,84,247,.16),inset_0_1px_0_rgba(191,204,255,.13)]'}
        ${collapsed ? 'w-[72px]' : 'w-[258px]'}
      `}
    >
      {/* Ambientación inferior: parte del fondo, no tarjeta ni enlace */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[23px]">
        <div className={`absolute inset-0 ${light ? 'opacity-[0.035]' : 'opacity-[0.055]'}`} style={{ backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="absolute -left-24 bottom-[-95px] h-72 w-72 rounded-full bg-violet-500/20 blur-[70px]" />
        <div className="absolute -right-28 top-[-75px] h-56 w-56 rounded-full bg-blue-500/15 blur-[75px]" />
        {!collapsed && (
          <div className={`absolute inset-x-0 bottom-0 h-[230px] ${light ? 'opacity-[.16]' : 'opacity-[.27]'}`}>
            <div className="absolute inset-0 bg-gradient-to-t from-violet-700/30 via-indigo-500/5 to-transparent" />
            <Server size={100} strokeWidth={0.8} className="absolute -right-4 bottom-5 rotate-[-13deg] text-blue-400" />
            <Laptop size={142} strokeWidth={0.8} className="absolute -left-9 bottom-1 rotate-[-10deg] text-violet-400" />
            <Activity size={55} strokeWidth={0.8} className="absolute right-[33%] bottom-20 text-cyan-400" />
          </div>
        )}
      </div>
      {/* BRAND */}
      <div
        className={`
          it-brand
          shrink-0
          ${collapsed ? 'px-3 py-4' : 'px-3 py-4'}
        `}
      >
        <Link
          href="/dashboard"
          aria-label="IT Support - Inicio"
          className={`
            it-brand-shell
            flex items-center rounded-2xl border px-2.5 py-2.5 shadow-[0_12px_28px_rgba(4,10,28,0.12)]
            ${light ? 'border-indigo-200/80 bg-white/95 shadow-[0_12px_28px_rgba(59,76,133,0.10)]' : 'border-indigo-400/25 bg-gradient-to-r from-[#17254f]/95 to-[#20143f]/95 shadow-[0_8px_25px_rgba(39,35,95,.24)]'}
            ${collapsed ? 'justify-center' : 'gap-3'}
          `}
        >
          <div className="it-brand-mark relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
            <div className="it-brand-mark-inner flex h-10 w-10 items-center justify-center rounded-xl">
              <Monitor size={22} strokeWidth={1.8} />
            </div>
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="it-brand-title truncate text-[17px] font-extrabold tracking-tight">
                IT Support
              </div>
              <div className="it-brand-subtitle truncate text-[10px] font-medium tracking-[0.18em]">
                INVENTORY SYSTEM
              </div>
            </div>
          )}
        </Link>
      </div>

      {/* NAV + ACTIONS */}
      <div className="flex min-h-0 flex-1 flex-col">
        <nav
          className="
            it-sidebar-scroll
            min-h-0 flex-1 space-y-1 overflow-y-auto
            px-3 pt-3 pb-3
            [scrollbar-width:none]
            [&::-webkit-scrollbar]:hidden
          "
        >
          {menuSections.map((section, sectionIndex) => (
            <div key={section.label} className={sectionIndex ? `border-t pt-3 mt-3 ${light ? 'border-slate-300/65' : 'border-indigo-300/[0.10]'}` : ''}>
              {!collapsed && (
                <p className={`px-3 pb-2 text-[10px] font-bold tracking-[0.16em] ${light ? 'text-indigo-600/80' : 'text-blue-300/80'}`}>
                  {section.label}
                </p>
              )}
              {collapsed && sectionIndex > 0 && <div aria-hidden="true" className={`mx-3 mb-2 border-t ${light ? 'border-slate-300' : 'border-white/10'}`} />}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.path || pathname?.startsWith(item.path + '/') || (item.path === '/reports' && (pathname === '/history' || pathname?.startsWith('/history/')))
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      title={collapsed ? item.name : undefined}
                      aria-current={isActive ? 'page' : undefined}
                      className={`
                        group it-nav-item relative flex h-[43px] w-full items-center rounded-xl border
                        text-sm font-medium transition-all duration-200 hover:-translate-y-[1px]
                        ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'}
                        ${isActive
                          ? light
                            ? 'border-violet-300 bg-gradient-to-r from-violet-100 via-white to-indigo-50 text-violet-950 shadow-[0_5px_15px_rgba(109,78,194,.17)]'
                            : 'it-nav-active border-violet-400/60 bg-gradient-to-r from-violet-700/65 to-indigo-600/35 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.12),0_0_18px_rgba(111,60,220,.20)]'
                          : light
                            ? 'border-slate-200/90 bg-white/72 text-slate-700 shadow-[0_1px_3px_rgba(30,47,94,.04)] hover:border-indigo-300 hover:bg-white hover:shadow-[0_5px_12px_rgba(83,80,160,.09)]'
                            : 'border-indigo-200/[0.13] bg-white/[0.025] text-slate-300 hover:border-violet-400/35 hover:bg-indigo-300/[0.075] hover:text-white hover:shadow-[0_6px_16px_rgba(4,6,26,.18)]'}
                      `}
                    >
                      {isActive && (
                        <span className="absolute -left-[1px] h-6 w-[3px] rounded-r-full bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.6)]" />
                      )}
                      <Icon size={19} strokeWidth={1.9} className={isActive ? (light ? 'shrink-0 text-violet-700' : 'shrink-0 text-violet-100') : (light ? 'shrink-0 text-slate-500 group-hover:text-violet-600' : 'shrink-0 text-slate-400 group-hover:text-violet-300')} />
                      {!collapsed && <span className="truncate">{item.name}</span>}
                    </Link>
                  )
                })}
              </div>
              {section.label === 'ADMINISTRACIÓN' && (
                <button
                  type="button"
                  onClick={onThemeToggle}
                  title="Alternar apariencia Dark / Light"
                  aria-label={`Apariencia actual: ${theme === 'dark' ? 'Dark' : 'Light'}. Cambiar tema`}
                  className={`it-nav-item mt-1 flex h-[43px] w-full items-center rounded-xl border text-sm transition-all hover:-translate-y-[1px] ${light ? 'border-slate-200 bg-white/80 text-slate-700 hover:border-violet-300' : 'border-indigo-200/[.13] bg-white/[.025] text-slate-300 hover:border-violet-400/35 hover:bg-white/[.06]'} ${collapsed ? 'justify-center' : 'gap-3 px-3'}`}
                >
                  {theme === 'dark' ? <Moon size={19} /> : <Sun size={19} />}
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">Apariencia</span>
                      <span className={`inline-flex rounded-lg border p-0.5 text-[10px] font-semibold ${light ? 'border-violet-200 bg-slate-100' : 'border-violet-400/30 bg-[#111b38]'}`} aria-hidden="true">
                        <span className={theme === 'dark' ? 'rounded-md bg-violet-600 px-2 py-1 text-white' : 'px-2 py-1 text-slate-400'}>Dark</span>
                        <span className={theme === 'light' ? 'rounded-md bg-violet-600 px-2 py-1 text-white' : 'px-2 py-1 text-slate-400'}>Light</span>
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          ))}
        </nav>

        {/* ACCIONES INFERIORES */}
        <div className="shrink-0 px-3 pb-3">
          <div className={`border-t pt-2 space-y-1 ${light ? 'border-slate-300/65' : 'border-indigo-300/[0.10]'}`}>
            <button
              onClick={onToggle}
              type="button"
              title={collapsed ? 'Expandir menú' : 'Contraer menú'}
              aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
              className={`
                it-nav-item it-collapse-row flex h-[41px] w-full items-center rounded-xl
                border text-[13px] transition-all ${light ? 'border-slate-200 bg-white/80 text-slate-700 hover:border-indigo-300' : 'border-violet-300/15 bg-violet-400/[.06] text-slate-300 hover:border-violet-300/35 hover:text-white'}
                ${collapsed ? 'justify-center' : 'gap-3 px-3'}
              `}
            >
              {collapsed ? (
                <ChevronRight size={18} />
              ) : (
                <ChevronLeft size={18} />
              )}

              {!collapsed && (
                <span className="flex-1 text-left">
                  {collapsed ? 'Expandir menú' : 'Contraer menú'}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label="Cerrar sesión"
              className={`
                it-nav-item flex h-[41px] w-full items-center rounded-xl text-[13px]
                border text-rose-400 transition-all disabled:opacity-60 ${light ? 'border-rose-200/90 bg-rose-50 hover:bg-rose-100' : 'border-rose-400/[.14] bg-rose-500/[.035] hover:border-rose-400/30 hover:bg-rose-500/[.10]'}
                ${collapsed ? 'justify-center' : 'gap-3 px-3'}
              `}
            >
              <LogOut size={18} />
              {!collapsed && (
                <span>
                  {loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>


    </aside>
  )
}