import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, GraduationCap, Home, Settings } from 'lucide-react'

export function Navbar() {
  const location = useLocation()

  const links = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/exam', label: 'Exam Client', icon: GraduationCap },
    { to: '/setup', label: 'Exam Setup', icon: Settings },
  ]

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy">
            <span className="text-sm font-bold text-white">PA</span>
          </div>
          <div>
            <span className="text-lg font-bold text-navy">ProctorAI</span>
            <span className="hidden sm:inline text-xs text-slate-400 ml-2">Far Away 2026</span>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-navy text-white'
                    : 'text-slate-600 hover:bg-surface hover:text-navy'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
