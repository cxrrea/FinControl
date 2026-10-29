import { useMemo, useState } from 'react'
import { CalendarCheck, Plus } from 'lucide-react'
import clsx from 'clsx'
import { getDay, parseISO } from 'date-fns'
import { useData } from '../store/useStore'
import { useUI } from '../store/useUI'
import { addDaysISO, addMonthsKey, currentMonth, daysInMonth, monthEnd, todayISO } from '../lib/dates'
import { moneyCompact } from '../lib/format'
import { bills } from '../lib/finance'
import { CardHeader, Empty, Money, MonthPicker, PageHeader, Segmented } from '../components/ui'
import { TxRow } from '../components/TxRow'
import type { Transaction } from '../types'

const WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export default function Bills() {
  const data = useData()
  const openNewTx = useUI((s) => s.openNewTx)
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  const [calMonth, setCalMonth] = useState(currentMonth())
  const [day, setDay] = useState<string | null>(null)
  const today = todayISO()
  const in7 = addDaysISO(today, 7)
  const endCur = monthEnd(currentMonth())
  const endNext = monthEnd(addMonthsKey(currentMonth(), 1))

  const pending = useMemo(() => bills(data.transactions, kind), [data.transactions, kind])
  const sumOf = (l: Transaction[]) => l.reduce((a, t) => a + t.amount, 0)

  const groups = useMemo(() => {
    const list = day ? pending.filter((t) => t.date === day) : pending
    return [
      { key: 'overdue', title: 'Vencidas', tone: 'text-bad', items: list.filter((t) => t.date < today) },
      { key: 'today', title: 'Hoje', tone: 'text-warn', items: list.filter((t) => t.date === today) },
      { key: 'week', title: 'Próximos 7 dias', tone: '', items: list.filter((t) => t.date > today && t.date <= in7) },
      { key: 'month', title: 'Ainda este mês', tone: '', items: list.filter((t) => t.date > in7 && t.date <= endCur) },
      { key: 'next', title: 'Próximo mês', tone: '', items: list.filter((t) => t.date > endCur && t.date > in7 && t.date <= endNext) },
      { key: 'later', title: 'Mais adiante', tone: '', items: list.filter((t) => t.date > endNext && t.date > in7) },
    ].filter((g) => g.items.length)
  }, [pending, day, today, in7, endCur, endNext])

  const overdue = pending.filter((t) => t.date < today)
  const week = pending.filter((t) => t.date >= today && t.date <= in7)
  const restMonth = pending.filter((t) => t.date >= today && t.date <= endCur)
  const thirty = pending.filter((t) => t.date >= today && t.date <= addDaysISO(today, 30))

  // calendário
  const days = daysInMonth(calMonth)
  const offset = getDay(parseISO(calMonth + '-01'))
  const byDay = new Map<string, number>()
  for (const t of data.transactions) {
    if (t.type !== kind || !t.date.startsWith(calMonth)) continue
    byDay.set(t.date, (byDay.get(t.date) ?? 0) + (t.status === 'pending' ? t.amount : 0))
  }
  const paidDays = new Set(data.transactions.filter((t) => t.type === kind && t.status === 'paid' && t.date.startsWith(calMonth)).map((t) => t.date))

  const verb = kind === 'expense' ? 'a pagar' : 'a receber'

  return (
    <div className="animate-in">
      <PageHeader
        title="Contas a pagar e receber"
        subtitle="Acompanhe vencimentos e marque como pago com um clique"
        actions={
          <>
            <Segmented value={kind} onChange={(v) => { setKind(v); setDay(null) }} options={[{ value: 'expense', label: 'A pagar' }, { value: 'income', label: 'A receber' }]} />
            <button className="btn-primary" onClick={() => openNewTx({ type: kind, status: 'pending' })}><Plus size={16} /> Nova conta</button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Vencidas', value: sumOf(overdue), n: overdue.length, tone: overdue.length ? 'text-bad' : '' },
          { label: 'Próximos 7 dias', value: sumOf(week), n: week.length, tone: '' },
          { label: 'Até o fim do mês', value: sumOf(restMonth), n: restMonth.length, tone: '' },
          { label: 'Próximos 30 dias', value: sumOf(thirty), n: thirty.length, tone: '' },
        ].map((k) => (
          <div key={k.label} className="card p-4">
            <div className="text-xs text-muted">{k.label}</div>
            <Money value={k.value} className={clsx('mt-1 block text-xl font-semibold', k.tone)} />
            <div className="text-xs text-faint">{k.n} conta{k.n === 1 ? '' : 's'} {verb}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {day && (
            <div className="flex items-center justify-between rounded-xl bg-brand-soft px-4 py-2 text-sm text-brand">
              Filtrando pelo dia {day.split('-').reverse().join('/')}
              <button className="font-medium" onClick={() => setDay(null)}>Limpar</button>
            </div>
          )}
          {groups.length ? (
            groups.map((g) => (
              <div key={g.key} className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-line px-5 py-3">
                  <h3 className={clsx('text-sm font-semibold', g.tone)}>{g.title}</h3>
                  <Money value={sumOf(g.items)} className="text-sm font-medium text-muted" />
                </div>
                <div className="divide-y divide-line">
                  {g.items.map((t) => <TxRow key={t.id} t={t} />)}
                </div>
              </div>
            ))
          ) : (
            <div className="card">
              <Empty icon={<CalendarCheck size={28} />} title={`Nenhuma conta ${verb}`}>
                Cadastre despesas como <strong>Pendente</strong>, parcelas ou contas fixas para vê-las aqui.
              </Empty>
            </div>
          )}
        </div>

        <div className="card h-fit">
          <CardHeader title="Calendário" subtitle={`Valores ${verb} por dia`} />
          <div className="p-4">
            <div className="mb-3 flex justify-center"><MonthPicker value={calMonth} onChange={setCalMonth} /></div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-faint">
              {WEEK.map((w, i) => <div key={i} className="py-1">{w}</div>)}
              {Array.from({ length: offset }, (_, i) => <div key={'o' + i} />)}
              {Array.from({ length: days }, (_, i) => {
                const iso = `${calMonth}-${String(i + 1).padStart(2, '0')}`
                const v = byDay.get(iso) ?? 0
                const late = v > 0 && iso < today
                return (
                  <button
                    key={iso}
                    onClick={() => setDay(day === iso ? null : iso)}
                    className={clsx(
                      'flex aspect-square flex-col items-center justify-center rounded-lg border text-xs transition',
                      day === iso ? 'border-brand bg-brand-soft' : 'border-transparent hover:bg-surface-2',
                      iso === today && 'ring-1 ring-brand',
                    )}
                  >
                    <span className={clsx('font-medium', iso === today ? 'text-brand' : 'text-ink')}>{i + 1}</span>
                    {v > 0 ? (
                      <span className={clsx('num text-[9px] leading-tight', late ? 'font-semibold text-bad' : 'text-warn')}>{moneyCompact(v).replace('R$', '').trim()}</span>
                    ) : paidDays.has(iso) ? (
                      <span className="h-1 w-1 rounded-full bg-good" />
                    ) : null}
                  </button>
                )
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted">
              <span className="flex items-center gap-1"><span className="font-semibold text-bad">R$</span> vencido</span>
              <span className="flex items-center gap-1"><span className="text-warn">R$</span> pendente</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-good" /> quitado</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
