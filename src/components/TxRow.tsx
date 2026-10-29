import { ArrowLeftRight, Check, Repeat } from 'lucide-react'
import clsx from 'clsx'
import type { Transaction } from '../types'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { IconBadge } from './Icon'
import { Money } from './ui'
import { daysUntil, todayISO } from '../lib/dates'
import { fmtDate } from '../lib/format'

export function dueLabel(t: Transaction) {
  if (t.status === 'paid') return fmtDate(t.date, "dd 'de' MMM")
  const d = daysUntil(t.date)
  if (d < 0) return `Venceu há ${-d} dia${d === -1 ? '' : 's'}`
  if (d === 0) return 'Vence hoje'
  if (d === 1) return 'Vence amanhã'
  if (d <= 7) return `Vence em ${d} dias`
  return `Vence ${fmtDate(t.date, "dd 'de' MMM")}`
}

export function TxRow({ t, showDate = true, compact }: { t: Transaction; showDate?: boolean; compact?: boolean }) {
  const categories = useStore((s) => s.categories)
  const accounts = useStore((s) => s.accounts)
  const togglePaid = useStore((s) => s.togglePaid)
  const openEditTx = useUI((s) => s.openEditTx)
  const cat = categories.find((c) => c.id === t.categoryId)
  const acc = accounts.find((a) => a.id === t.accountId)
  const toAcc = accounts.find((a) => a.id === t.toAccountId)
  const overdue = t.status === 'pending' && t.date < todayISO()
  const sign = t.type === 'income' ? 1 : t.type === 'expense' ? -1 : 0

  return (
    <div className={clsx('group flex items-center gap-3 px-5 transition hover:bg-surface-2/60', compact ? 'py-2.5' : 'py-3')}>
      {t.type === 'transfer' ? (
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <ArrowLeftRight size={16} />
        </span>
      ) : (
        <IconBadge name={cat?.icon} color={cat?.color ?? '#807f7a'} />
      )}
      <button className="min-w-0 flex-1 text-left" onClick={() => openEditTx(t)}>
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{t.description}</span>
          {t.installment && <span className="chip shrink-0 bg-surface-2 text-muted">{t.installment.number}/{t.installment.total}</span>}
          {t.recurringId && <Repeat size={12} className="shrink-0 text-faint" aria-label="Recorrente" />}
        </div>
        <div className="truncate text-xs text-muted">
          {t.type === 'transfer' ? `${acc?.name ?? '?'} → ${toAcc?.name ?? '?'}` : `${cat?.name ?? 'Sem categoria'} · ${acc?.name ?? '—'}`}
          {showDate && (
            <>
              {' · '}
              <span className={clsx(overdue && 'font-medium text-bad', t.status === 'pending' && !overdue && 'text-warn')}>{dueLabel(t)}</span>
            </>
          )}
        </div>
      </button>
      <div className="text-right">
        <Money value={sign * t.amount || t.amount} className={clsx('text-sm font-semibold', t.type === 'income' ? 'text-income' : t.type === 'expense' ? 'text-ink' : 'text-muted')} sign={t.type === 'income'} />
        {t.status === 'pending' && <div className="text-[11px] text-faint">{t.type === 'income' ? 'a receber' : 'a pagar'}</div>}
      </div>
      {t.type !== 'transfer' && (
        <button
          onClick={() => togglePaid(t.id)}
          className={clsx(
            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition',
            t.status === 'paid' ? 'border-good bg-good text-white' : 'border-line text-faint hover:border-good hover:text-good',
          )}
          title={t.status === 'paid' ? 'Marcar como pendente' : t.type === 'income' ? 'Marcar como recebido' : 'Marcar como pago'}
          aria-label={t.status === 'paid' ? 'Marcar como pendente' : 'Marcar como pago'}
        >
          <Check size={16} />
        </button>
      )}
    </div>
  )
}
