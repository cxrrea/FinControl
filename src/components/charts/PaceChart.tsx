import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartColors } from '../../lib/theme'
import { moneyCompact } from '../../lib/format'
import { ChartTooltip, Legend } from './ChartTooltip'

/** gasto acumulado no mês comparado ao mês anterior — mostra se o ritmo está acelerado */
export function PaceChart({ current, previous, today, budget, height = 240 }: { current: number[]; previous: number[]; today: number | null; budget?: number; height?: number }) {
  const c = useChartColors()
  const days = Math.max(current.length, previous.length)
  const data = Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    current: today == null || i + 1 <= today ? current[i] : undefined,
    previous: previous[i] ?? previous[previous.length - 1],
  }))
  return (
    <div>
      <div className="px-5 pb-2">
        <Legend items={[{ label: 'Este mês', color: c.expense }, { label: 'Mês anterior', color: c.neutral, dashed: true }, ...(budget ? [{ label: 'Orçamento total', color: c.axis, dashed: true }] : [])]} />
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={c.grid} />
          <XAxis dataKey="day" tick={{ fill: c.axis, fontSize: 12 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
          <YAxis tickFormatter={moneyCompact} tick={{ fill: c.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={64} />
          {budget ? <ReferenceLine y={budget} stroke={c.axis} strokeDasharray="4 4" /> : null}
          <Tooltip content={<ChartTooltip labelFormatter={(l) => `Dia ${l}`} />} cursor={{ stroke: c.axis, strokeDasharray: '3 3' }} />
          <Line type="monotone" dataKey="previous" name="Mês anterior" stroke={c.neutral} strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="current" name="Este mês" stroke={c.expense} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: c.surface, strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
