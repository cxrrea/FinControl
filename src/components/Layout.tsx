import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  ArrowLeftRight, BarChart3, CalendarClock, Eye, EyeOff, LayoutDashboard, LineChart, Menu, Moon, PieChart, Plus, Repeat, Settings, Sun, Trophy, Wallet, X,
} from 'lucide-react'
import clsx from 'clsx'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { todayISO } from '../lib/dates'
import { useIsDark } from '../lib/theme'
import { TransactionModal } from './TransactionModal'

const NAV = [
  { to: '/', label: 'Visão geral', icon: LayoutDashboard },
  { to: '/lancamentos', label: 'Lançamentos', icon: ArrowLeftRight },
  { to: '/contas', label: 'Contas a pagar/receber', icon: CalendarClock, badge: true },
  { to: '/recorrentes', label: 'Fixas e recorrentes', icon: Repeat },
  { to: '/orcamentos', label: 'Orçamentos', icon: PieChart },
  { to: '/previsao', label: 'Previsão', icon: LineChart },
  { to: '/metas', label: 'Metas', icon: Trophy },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/cadastros', label: 'Carteiras e categorias', icon: Wallet },
  { to: '/config', label: 'Configurações', icon: Settings },
]

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const today = todayISO()
  const due = useStore((s) => s.transactions.filter((t) => t.type === 'expense' && t.status === 'pending' && t.date <= today).length)
  return (
    <nav className="flex h-full flex-col gap-1 p-3">
      <div className="mb-4 flex items-center gap-2.5 px-3 pt-2">
        <img src="./favicon.svg" alt="" className="h-8 w-8" />
        <span className="text-lg font-semibold tracking-tight">FinControl</span>
      </div>
      {NAV.map(({ to, label, icon: I, badge }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
              isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-surface-2 hover:text-ink',
            )
          }
        >
          <I size={18} />
          <span className="flex-1">{label}</span>
          {badge && due > 0 && <span className="chip bg-bad text-white">{due}</span>}
        </NavLink>
      ))}
      <div className="mt-auto rounded-xl bg-surface-2 p-3 text-xs text-muted">
        Seus dados ficam salvos apenas neste navegador. Faça backup em <NavLink to="/config" onClick={onNavigate} className="font-medium text-brand">Configurações</NavLink>.
      </div>
    </nav>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const openNewTx = useUI((s) => s.openNewTx)
  const hide = useStore((s) => s.settings.hideValues)
  const setSettings = useStore((s) => s.setSettings)
  const dark = useIsDark()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [loc.pathname])

  // atalho: "n" abre novo lançamento
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
        e.preventDefault()
        openNewTx()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openNewTx])

  return (
    <div className="min-h-full">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-surface lg:block">
        <Sidebar />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="animate-in absolute inset-y-0 left-0 w-72 border-r border-line bg-surface">
            <button className="btn-icon absolute right-3 top-4" onClick={() => setOpen(false)} aria-label="Fechar menu">
              <X size={18} />
            </button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-line bg-bg/80 px-4 backdrop-blur sm:px-6">
          <button className="btn-icon lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu">
            <Menu size={20} />
          </button>
          <span className="font-semibold lg:hidden">FinControl</span>
          <div className="ml-auto flex items-center gap-1">
            <button className="btn-icon" onClick={() => setSettings({ hideValues: !hide })} title={hide ? 'Mostrar valores' : 'Ocultar valores'}>
              {hide ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <button className="btn-icon" onClick={() => setSettings({ theme: dark ? 'light' : 'dark' })} title="Alternar tema">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="btn-primary ml-2 hidden sm:inline-flex" onClick={() => openNewTx()} title="Atalho: N">
              <Plus size={18} /> Novo lançamento
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>

      <button
        className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-pop sm:hidden"
        onClick={() => openNewTx()}
        aria-label="Novo lançamento"
      >
        <Plus size={24} />
      </button>
      <TransactionModal />
    </div>
  )
}
