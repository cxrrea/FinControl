import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import clsx from 'clsx'
import { useStore } from '../store/useStore'
import { fmtMonth, money, parseMoney } from '../lib/format'
import { addMonthsKey } from '../lib/dates'

/* ------------------------------------------------------------ Money */
export function Money({ value, className, sign, colored }: { value: number; className?: string; sign?: boolean; colored?: boolean }) {
  const hide = useStore((s) => s.settings.hideValues)
  const txt = hide ? 'R$ •••••' : (sign && value > 0 ? '+' : '') + money(value)
  return <span className={clsx('num', colored && (value < 0 ? 'text-expense' : value > 0 ? 'text-income' : ''), className)}>{txt}</span>
}

/* ------------------------------------------------------------ Modal */
export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={clsx('animate-in relative flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-line bg-surface shadow-pop sm:rounded-2xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ Confirm */
type ConfirmOpts = { title: string; message?: ReactNode; confirmLabel?: string; danger?: boolean }
export function useConfirm() {
  const [state, setState] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null)
  const confirm = (o: ConfirmOpts) => new Promise<boolean>((resolve) => setState({ ...o, resolve }))
  const close = (v: boolean) => {
    state?.resolve(v)
    setState(null)
  }
  const element = (
    <Modal
      open={!!state}
      onClose={() => close(false)}
      title={state?.title}
      footer={
        <>
          <button className="btn-ghost" onClick={() => close(false)}>Cancelar</button>
          <button className={state?.danger ? 'btn-danger' : 'btn-primary'} onClick={() => close(true)}>{state?.confirmLabel ?? 'Confirmar'}</button>
        </>
      }
    >
      <div className="text-sm text-muted">{state?.message}</div>
    </Modal>
  )
  return [confirm, element] as const
}

/* ------------------------------------------------------------ MoneyInput */
export function MoneyInput({ value, onChange, autoFocus, id }: { value: number; onChange: (v: number) => void; autoFocus?: boolean; id?: string }) {
  const [text, setText] = useState(value ? value.toFixed(2).replace('.', ',') : '')
  const last = useRef(value)
  useEffect(() => {
    if (value !== last.current) {
      setText(value ? value.toFixed(2).replace('.', ',') : '')
      last.current = value
    }
  }, [value])
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-faint">R$</span>
      <input
        id={id}
        className="input num pl-9"
        inputMode="decimal"
        placeholder="0,00"
        autoFocus={autoFocus}
        value={text}
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d.,]/g, '')
          setText(t)
          const v = parseMoney(t)
          last.current = v
          onChange(v)
        }}
        onBlur={() => text && setText(parseMoney(text).toFixed(2).replace('.', ','))}
      />
    </div>
  )
}

/* ------------------------------------------------------------ Field */
export function Field({ label, children, className, hint }: { label: string; children: ReactNode; className?: string; hint?: string }) {
  return (
    <label className={clsx('block', className)}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </label>
  )
}

/* ------------------------------------------------------------ Segmented */
export function Segmented<T extends string>({ value, onChange, options, size = 'md' }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; size?: 'sm' | 'md' }) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={clsx(
            'rounded-lg font-medium transition',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            value === o.value ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------ Progress */
export function Progress({ value, color, className }: { value: number; color?: string; className?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  const auto = value >= 1 ? 'rgb(var(--bad))' : value >= 0.8 ? 'rgb(var(--warn))' : 'rgb(var(--good))'
  return (
    <div className={clsx('h-2 w-full overflow-hidden rounded-full bg-surface-2', className)}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color ?? auto }} />
    </div>
  )
}

/* ------------------------------------------------------------ PageHeader */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/* ------------------------------------------------------------ Empty */
export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon && <div className="mb-3 rounded-2xl bg-surface-2 p-3 text-faint">{icon}</div>}
      <p className="font-medium">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ------------------------------------------------------------ Card header */
export function CardHeader({ title, subtitle, right }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

/* ------------------------------------------------------------ Month picker */
export function MonthPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex items-center rounded-xl border border-line bg-surface">
      <button className="btn-icon" onClick={() => onChange(addMonthsKey(value, -1))} aria-label="Mês anterior">
        <ChevronLeft size={18} />
      </button>
      <span className="min-w-[150px] text-center text-sm font-medium">{fmtMonth(value)}</span>
      <button className="btn-icon" onClick={() => onChange(addMonthsKey(value, 1))} aria-label="Próximo mês">
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
