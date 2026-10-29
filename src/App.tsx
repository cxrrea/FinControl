import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useStore } from './store/useStore'
import { useThemeSync } from './lib/theme'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Bills from './pages/Bills'
import Recurring from './pages/Recurring'
import Budgets from './pages/Budgets'
import Forecast from './pages/Forecast'
import Goals from './pages/Goals'
import Reports from './pages/Reports'
import Registry from './pages/Registry'
import SettingsPage from './pages/Settings'
import Welcome from './pages/Welcome'

export default function App() {
  const theme = useStore((s) => s.settings.theme)
  const onboarded = useStore((s) => s.settings.onboarded)
  const sync = useStore((s) => s.sync)
  useThemeSync(theme)

  // gera lançamentos de recorrências ao abrir e a cada hora (caso o app fique aberto na virada do mês)
  useEffect(() => {
    sync()
    const id = setInterval(sync, 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [sync])

  if (!onboarded) return <Welcome />

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/lancamentos" element={<Transactions />} />
          <Route path="/contas" element={<Bills />} />
          <Route path="/recorrentes" element={<Recurring />} />
          <Route path="/orcamentos" element={<Budgets />} />
          <Route path="/previsao" element={<Forecast />} />
          <Route path="/metas" element={<Goals />} />
          <Route path="/relatorios" element={<Reports />} />
          <Route path="/cadastros" element={<Registry />} />
          <Route path="/config" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  )
}
