import { useEffect, useState } from 'react'
import type { ThemePref } from '../types'

export function applyTheme(pref: ThemePref) {
  const dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0e0e0d' : '#f6f6f3')
}

export function useThemeSync(pref: ThemePref) {
  useEffect(() => {
    applyTheme(pref)
    if (pref !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = () => applyTheme('system')
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [pref])
}

export function useIsDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

/** cores dos gráficos — passos validados para cada superfície (claro/escuro) */
export function useChartColors() {
  const dark = useIsDark()
  return dark
    ? { income: '#199e70', expense: '#e66767', balance: '#3987e5', projected: '#9085e9', neutral: '#6b6a64', grid: '#30302d', axis: '#8c8b84', surface: '#1a1a19', ink: '#f0efec' }
    : { income: '#1baf7a', expense: '#e34948', balance: '#2a78d6', projected: '#6250d6', neutral: '#b5b4ad', grid: '#e9e8e3', axis: '#807f7a', surface: '#ffffff', ink: '#111110' }
}
