'use client'

import { useEffect, useState, type ReactNode, type CSSProperties } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import ProtectedRoute from '../auth/ProtectedRoute'

interface AppLayoutProps { children: ReactNode }
type Theme = 'dark' | 'light'
type Language = 'es' | 'en'
const defaultAccent = '#8257f5'
const validHex = (value: string | null): value is string => Boolean(value && /^#[0-9a-fA-F]{6}$/.test(value))
const publicRoutes = ['/', '/login', '/2fa']

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [topbarHidden, setTopbarHidden] = useState(false)
  const [theme, setTheme] = useState<Theme>('dark')
  const [loaded, setLoaded] = useState(false)
  const [language, setLanguage] = useState<Language>('es')
  const [accent, setAccent] = useState(defaultAccent)
  const isPublicRoute = publicRoutes.includes(pathname ?? '')

  useEffect(() => {
    setSidebarCollapsed(localStorage.getItem('sidebarCollapsed') === 'true')
    setTopbarHidden(localStorage.getItem('topbarHidden') === 'true')
    setTheme(localStorage.getItem('itSupportTheme') === 'light' ? 'light' : 'dark')
    setLanguage(localStorage.getItem('itSupportLanguage') === 'en' ? 'en' : 'es')
    const savedAccent = localStorage.getItem('itSupportAccent')
    if (validHex(savedAccent)) setAccent(savedAccent)
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed))
    localStorage.setItem('topbarHidden', String(topbarHidden))
    localStorage.setItem('itSupportTheme', theme)
    localStorage.setItem('itSupportLanguage', language)
    localStorage.setItem('itSupportAccent', accent)
  }, [sidebarCollapsed, topbarHidden, theme, language, accent, loaded])

  if (isPublicRoute) return <>{children}</>

  return (
    <ProtectedRoute>
      <div data-it-theme={theme} data-it-language={language} className="it-shell flex min-h-screen bg-[#0b0b12]" style={{ '--it-accent': accent } as CSSProperties}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(value => !value)} theme={theme} onThemeToggle={() => setTheme(value => value === 'dark' ? 'light' : 'dark')} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar hidden={topbarHidden} onToggle={() => setTopbarHidden(value => !value)} theme={theme} onThemeToggle={() => setTheme(value => value === 'dark' ? 'light' : 'dark')} language={language} onLanguageChange={setLanguage} accent={accent} onAccentChange={setAccent} />
          <main className="min-w-0 flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  )
}