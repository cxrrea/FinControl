import { addDays, addMonths, addWeeks, addYears, differenceInCalendarDays, endOfMonth, format, getDaysInMonth, parseISO, startOfMonth } from 'date-fns'

export const toISO = (d: Date) => format(d, 'yyyy-MM-dd')
export const todayISO = () => toISO(new Date())
export const monthKey = (iso: string) => iso.slice(0, 7)
export const currentMonth = () => monthKey(todayISO())

export const addMonthsKey = (key: string, n: number) => format(addMonths(parseISO(key + '-01'), n), 'yyyy-MM')
export const monthStart = (key: string) => key + '-01'
export const monthEnd = (key: string) => toISO(endOfMonth(parseISO(key + '-01')))
export const daysInMonth = (key: string) => getDaysInMonth(parseISO(key + '-01'))

/** lista de meses [from..to] inclusive */
export function monthRange(from: string, to: string): string[] {
  const out: string[] = []
  let k = from
  while (k <= to && out.length < 600) {
    out.push(k)
    k = addMonthsKey(k, 1)
  }
  return out
}

export const daysUntil = (iso: string) => differenceInCalendarDays(parseISO(iso), new Date())

/** soma meses preservando o dia (ajusta para o último dia quando necessário) */
export function addMonthsISO(iso: string, n: number, day?: number): string {
  const base = parseISO(iso)
  const target = addMonths(startOfMonth(base), n)
  const d = Math.min(day ?? base.getDate(), getDaysInMonth(target))
  return toISO(new Date(target.getFullYear(), target.getMonth(), d))
}

export function nextOccurrence(iso: string, freq: 'monthly' | 'weekly' | 'yearly', anchorDay: number): string {
  const d = parseISO(iso)
  if (freq === 'weekly') return toISO(addWeeks(d, 1))
  if (freq === 'yearly') return toISO(addYears(d, 1))
  return addMonthsISO(iso, 1, anchorDay)
}

export const addDaysISO = (iso: string, n: number) => toISO(addDays(parseISO(iso), n))
