import { IconBadge } from '../Icon'
import { Money } from '../ui'

export interface CategoryRow {
  id: string
  name: string
  color: string
  icon: string
  value: number
}

/** barras horizontais por categoria — comparam magnitude sem depender de cor */
export function CategoryList({ rows, limit = 6, onSelect }: { rows: CategoryRow[]; limit?: number; onSelect?: (id: string) => void }) {
  const total = rows.reduce((a, r) => a + r.value, 0)
  let shown = rows.slice(0, limit)
  const rest = rows.slice(limit)
  if (rest.length) shown = [...shown, { id: '__other', name: `Outras (${rest.length})`, color: '#807f7a', icon: 'tag', value: rest.reduce((a, r) => a + r.value, 0) }]
  const max = Math.max(...shown.map((r) => r.value), 1)
  return (
    <ul className="space-y-3">
      {shown.map((r) => (
        <li key={r.id}>
          <button
            type="button"
            disabled={!onSelect || r.id === '__other'}
            onClick={() => onSelect?.(r.id)}
            className="group flex w-full items-center gap-3 text-left disabled:cursor-default"
            title={`${r.name}: ${Math.round((r.value / total) * 100)}% do total`}
          >
            <IconBadge name={r.icon} color={r.color} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium group-enabled:group-hover:underline">{r.name}</span>
                <span className="flex shrink-0 items-baseline gap-2">
                  <span className="text-xs text-faint num">{Math.round((r.value / total) * 100)}%</span>
                  <Money value={r.value} className="font-medium" />
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(r.value / max) * 100}%`, background: r.color }} />
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}
