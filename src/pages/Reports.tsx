import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '../store/useStore'
import { cashflowSeries, expensesByCategory } from '../lib/finance'
import { addMonthsKey, currentMonth, monthKey, monthRange } from '../lib/dates'
import { fmtDate, fmtMonth, fmtMonthShort, money, moneyCompact } from '../lib/format'
import { useChartColors, useIsDark } from '../lib/theme'
import { CardHeader, Money, PageHeader, Segmented } from '../components/ui'
import { IconBadge } from '../components/Icon'
import { ChartTooltip } from '../components/charts/ChartTooltip'
import { CashflowChart } from '../components/charts/CashflowChart'

export default function Reports() {
  const data = useData()
  const c = useChartColors()
  const dark = useIsDark()
  const [range, setRange] = useState<'6' | '12'>('6')
  const months = useMemo(() => monthRange(addMonthsKey(currentMonth(), -(Number(range) - 1)), currentMonth()), [range])
  const flow = useMemo(() => cashflowSeries(data.transactions, months), [data.transactions, months])
  const cats = useMemo(() => expensesByCategory(data.transactions, months, data.categories), [data, months])
  const [selCat, setSelCat] = useState<string>('')
  const activeCat = selCat || cats[0]?.id || ''

  const matrix = useMemo(() => {
    const rows = cats.map((cat) => {
      const values = months.map((m) => data.transactions.filter((t) => t.type === 'expense' && (t.categoryId ?? 'none') === cat.id && monthKey(t.date) === m).reduce((a, t) => a + t.amount, 0))
      return { ...cat, values, avg: values.reduce((a, v) => a + v, 0) / months.length }
    })
    const max = Math.max(1, ...rows.flatMap((r) => r.values))
    return { rows, max }
  }, [cats, months, data.transactions])

  const catSeries = months.map((m, i) => ({ month: m, value: matrix.rows.find((r) => r.id === activeCat)?.values[i] ?? 0 }))

  const totals = flow.reduce((a, f) => ({ inc: a.inc + f.income, exp: a.exp + f.expense }), { inc: 0, exp: 0 })
  const biggest = data.transactions
    .filter((t) => t.type === 'expense' && months.includes(monthKey(t.date)))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)

  const heat = (v: number) => {
    const r = v / matrix.max
    return { background: v ? `rgba(${dark ? '57,135,229' : '42,120,214'}, ${0.08 + r * 0.82})` : undefined, color: r > 0.55 ? '#fff' : undefined }
  }

  return (
    <div className="animate-in space-y-4">
      <PageHeader
        title="Relatórios"
        subtitle="Entenda seus padrões de gasto ao longo do tempo"
        actions={<Segmented value={range} onChange={setRange} options={[{ value: '6', label: '6 meses' }, { value: '12', label: '12 meses' }]} />}
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="card p-4"><div className="text-xs text-muted">Receitas no período</div><Money value={totals.inc} className="text-xl font-semibold text-income" /></div>
        <div className="card p-4"><div className="text-xs text-muted">Despesas no período</div><Money value={totals.exp} className="text-xl font-semibold text-expense" /></div>
        <div className="card p-4"><div className="text-xs text-muted">Resultado</div><Money value={totals.inc - totals.exp} className="text-xl font-semibold" colored /></div>
        <div className="card p-4"><div className="text-xs text-muted">Média de gastos / mês</div><Money value={totals.exp / months.length} className="text-xl font-semibold" /></div>
      </div>

      <div className="card">
        <CardHeader title="Receitas x despesas" />
        <div className="pt-3"><CashflowChart data={flow} height={280} /></div>
      </div>

      <div className="card overflow-hidden">
        <CardHeader title="Mapa de gastos por categoria" subtitle="Quanto mais escuro, maior o gasto · clique numa categoria para ver a evolução" />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="text-muted">
                <th className="sticky left-0 bg-surface px-5 py-2 text-left font-medium">Categoria</th>
                {months.map((m) => <th key={m} className="px-1 py-2 text-center font-medium">{fmtMonthShort(m)}</th>)}
                <th className="px-5 py-2 text-right font-medium">Média</th>
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((r) => (
                <tr key={r.id} className={r.id === activeCat ? 'bg-brand-soft/60' : ''}>
                  <td className="sticky left-0 bg-surface px-5 py-1">
                    <button className="flex items-center gap-2 text-left text-sm font-medium hover:underline" onClick={() => setSelCat(r.id)}>
                      <IconBadge name={r.icon} color={r.color} size="sm" /> {r.name}
                    </button>
                  </td>
                  {r.values.map((v, i) => (
                    <td key={i} className="p-0.5">
                      <div className="num rounded-md px-1 py-2 text-center" style={heat(v)} title={`${r.name} · ${fmtMonth(months[i])}: ${money(v)}`}>
                        {v ? moneyCompact(v).replace('R$', '').trim() : '–'}
                      </div>
                    </td>
                  ))}
                  <td className="px-5 text-right"><Money value={r.avg} className="font-medium" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <CardHeader
            title="Evolução da categoria"
            right={
              <select className="input h-8 w-auto text-xs" value={activeCat} onChange={(e) => setSelCat(e.target.value)}>
                {cats.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            }
          />
          <div className="pt-4">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={catSeries} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={c.grid} />
                <XAxis dataKey="month" tickFormatter={fmtMonthShort} tick={{ fill: c.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={moneyCompact} tick={{ fill: c.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={64} />
                <Tooltip content={<ChartTooltip labelFormatter={(l) => fmtMonth(l)} />} cursor={{ fill: c.grid, opacity: 0.5 }} />
                <Bar dataKey="value" name={cats.find((x) => x.id === activeCat)?.name ?? 'Gasto'} fill={c.balance} radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <CardHeader title="Maiores despesas do período" />
          <ul className="divide-y divide-line px-5 py-2">
            {biggest.map((t) => {
              const cat = data.categories.find((x) => x.id === t.categoryId)
              return (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <IconBadge name={cat?.icon} color={cat?.color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{t.description}</div>
                    <div className="text-xs text-muted">{cat?.name ?? 'Sem categoria'} · {fmtDate(t.date)}</div>
                  </div>
                  <Money value={t.amount} className="text-sm font-semibold" />
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
