import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brlCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})
const pct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 })

export const money = (v: number) => brl.format(v || 0)
export const moneyCompact = (v: number) => (Math.abs(v) < 10000 ? brl.format(Math.round(v)).replace(/,00$/, '') : brlCompact.format(v))
export const percent = (v: number) => pct.format(Number.isFinite(v) ? v : 0)

export const fmtDate = (iso: string, pattern = 'dd/MM/yyyy') => format(parseISO(iso), pattern, { locale: ptBR })
export const fmtMonth = (key: string, pattern = "MMMM 'de' yyyy") => {
  const s = format(parseISO(key + '-01'), pattern, { locale: ptBR })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
export const fmtMonthShort = (key: string) => {
  const s = format(parseISO(key + '-01'), 'MMM/yy', { locale: ptBR })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** converte "1.234,56" ou "1234.56" em número */
export function parseMoney(input: string): number {
  const s = input.trim().replace(/[R$\s]/g, '')
  if (!s) return 0
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
