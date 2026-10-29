import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartColors } from '../../lib/theme'
import { fmtMonth, fmtMonthShort, moneyCompact } from '../../lib/format'
import { ChartTooltip, Legend } from './ChartTooltip'
import type { MonthSummary } from '../../lib/finance'

export function CashflowChart({ data, height = 260, onSelect }: { data: MonthSummary[]; height?: number; onSelect?: (month: string) => void }) {
  const c = useChartColors()
  return (
    <div>
      <div className="px-5 pb-2">
        <Legend items={[{ label: 'Receitas', color: c.income }, { label: 'Despesas', color: c.expense }, { label: 'Resultado', color: c.balance }]} />
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 4, bottom: 0 }} barGap={2} barCategoryGap="28%"
          onClick={(e) => { const m = (e as { activeLabel?: string } | null)?.activeLabel; if (m && onSelect) onSelect(String(m)) }}>
          <CartesianGrid vertical={false} stroke={c.grid} />
          <XAxis dataKey="month" tickFormatter={fmtMonthShort} tick={{ fill: c.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={moneyCompact} tick={{ fill: c.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={64} />
          <Tooltip content={<ChartTooltip labelFormatter={(l) => fmtMonth(l)} />} cursor={{ fill: c.grid, opacity: 0.5 }} />
          <Bar dataKey="income" name="Receitas" fill={c.income} radius={[4, 4, 0, 0]} maxBarSize={28} className={onSelect ? 'cursor-pointer' : ''} />
          <Bar dataKey="expense" name="Despesas" fill={c.expense} radius={[4, 4, 0, 0]} maxBarSize={28} className={onSelect ? 'cursor-pointer' : ''} />
          <Line dataKey="net" name="Resultado" stroke={c.balance} strokeWidth={2} dot={{ r: 3.5, fill: c.balance, stroke: c.surface, strokeWidth: 2 }} activeDot={{ r: 5, stroke: c.surface, strokeWidth: 2 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
