import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartColors } from '../../lib/theme'
import { fmtMonth, fmtMonthShort, moneyCompact } from '../../lib/format'
import { ChartTooltip, Legend } from './ChartTooltip'

export interface BalancePoint {
  month: string
  real?: number
  projected?: number
  scenario?: number
}

/** saldo realizado (linha cheia) emendado com a projeção (tracejada) */
export function BalanceChart({ data, height = 260, showScenario }: { data: BalancePoint[]; height?: number; showScenario?: boolean }) {
  const c = useChartColors()
  const min = Math.min(0, ...data.flatMap((d) => [d.real ?? 0, d.projected ?? 0, d.scenario ?? 0]))
  return (
    <div>
      <div className="px-5 pb-2">
        <Legend
          items={[
            { label: 'Saldo realizado', color: c.balance },
            { label: 'Projeção', color: c.balance, dashed: true },
            ...(showScenario ? [{ label: 'Cenário simulado', color: c.income, dashed: true }] : []),
          ]}
        />
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="gReal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.balance} stopOpacity={0.28} />
              <stop offset="100%" stopColor={c.balance} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gProj" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.balance} stopOpacity={0.12} />
              <stop offset="100%" stopColor={c.balance} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={c.grid} />
          <XAxis dataKey="month" tickFormatter={fmtMonthShort} tick={{ fill: c.axis, fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={12} />
          <YAxis tickFormatter={moneyCompact} tick={{ fill: c.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={64} domain={[min < 0 ? 'auto' : 0, 'auto']} />
          {min < 0 && <ReferenceLine y={0} stroke={c.expense} strokeDasharray="4 4" />}
          <Tooltip content={<ChartTooltip labelFormatter={(l) => fmtMonth(l)} />} cursor={{ stroke: c.axis, strokeDasharray: '3 3' }} />
          <Area type="monotone" dataKey="real" name="Saldo realizado" stroke={c.balance} strokeWidth={2} fill="url(#gReal)" connectNulls={false}
            dot={false} activeDot={{ r: 5, stroke: c.surface, strokeWidth: 2 }} />
          <Area type="monotone" dataKey="projected" name="Projeção" stroke={c.balance} strokeWidth={2} strokeDasharray="6 4" fill="url(#gProj)"
            dot={false} activeDot={{ r: 5, stroke: c.surface, strokeWidth: 2 }} />
          {showScenario && (
            <Area type="monotone" dataKey="scenario" name="Cenário simulado" stroke={c.income} strokeWidth={2} strokeDasharray="2 3" fill="none"
              dot={false} activeDot={{ r: 5, stroke: c.surface, strokeWidth: 2 }} />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
