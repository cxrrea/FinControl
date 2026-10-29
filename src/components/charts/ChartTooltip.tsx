import { money } from '../../lib/format'

interface Item {
  name?: string | number
  value?: number | string | (number | string)[]
  color?: string
  dataKey?: string | number | ((o: unknown) => unknown)
  payload?: Record<string, unknown>
}

/** tooltip padrão: título + linhas com marcador da série, valores em tinta de texto */
export function ChartTooltip({ active, payload, label, labelFormatter, hidden }: { active?: boolean; payload?: Item[]; label?: string | number; labelFormatter?: (l: string) => string; hidden?: string[] }) {
  if (!active || !payload?.length) return null
  const rows = payload.filter((p) => p.value != null && !hidden?.includes(String(p.dataKey)))
  return (
    <div className="min-w-[180px] rounded-xl border border-line bg-surface px-3 py-2.5 text-xs shadow-pop">
      <div className="mb-1.5 font-semibold text-ink">{labelFormatter ? labelFormatter(String(label)) : label}</div>
      <div className="space-y-1">
        {rows.map((p) => (
          <div key={String(p.dataKey)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
              {p.name}
            </span>
            <span className="num font-medium text-ink">{money(Number(p.value))}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          {i.dashed ? (
            <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: i.color }} />
          ) : (
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
          )}
          {i.label}
        </span>
      ))}
    </div>
  )
}
