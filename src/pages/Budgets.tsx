import { useMemo, useState } from 'react'
import { Wand2 } from 'lucide-react'
import clsx from 'clsx'
import { useData, useStore } from '../store/useStore'
import { avgCategoryExpense, expensesByCategory, monthSummary } from '../lib/finance'
import { currentMonth, daysInMonth, todayISO } from '../lib/dates'
import { money } from '../lib/format'
import { Money, MoneyInput, MonthPicker, PageHeader, Progress, useConfirm } from '../components/ui'
import { IconBadge } from '../components/Icon'

export default function Budgets() {
  const data = useData()
  const setBudget = useStore((s) => s.setBudget)
  const [month, setMonth] = useState(currentMonth())
  const [confirm, confirmEl] = useConfirm()
  const isCurrent = month === currentMonth()
  const pace = isCurrent ? Number(todayISO().slice(8, 10)) / daysInMonth(month) : 1

  const rows = useMemo(() => {
    const spent = expensesByCategory(data.transactions, month, data.categories)
    return data.categories
      .filter((c) => c.type === 'expense')
      .map((c) => {
        const budget = data.budgets.find((b) => b.categoryId === c.id)?.amount ?? 0
        const value = spent.find((s) => s.id === c.id)?.value ?? 0
        const avg = avgCategoryExpense(data.transactions, c.id, 3, month)
        return { cat: c, budget, spent: value, avg }
      })
      .sort((a, b) => b.spent - a.spent || b.avg - a.avg)
  }, [data, month])

  const totalBudget = rows.reduce((a, r) => a + r.budget, 0)
  const totalSpentBudgeted = rows.filter((r) => r.budget > 0).reduce((a, r) => a + r.spent, 0)
  const income = monthSummary(data.transactions, month).income

  const suggest = async () => {
    const ok = await confirm({
      title: 'Sugerir orçamentos?',
      message: 'Vamos definir limites com base na sua média dos últimos 3 meses, com 10% a menos nas categorias de estilo de vida — um corte gradual e realista. Os limites atuais serão substituídos.',
      confirmLabel: 'Aplicar sugestão',
    })
    if (!ok) return
    for (const r of rows) {
      if (r.avg < 20) continue
      const cut = r.cat.group === 'lifestyle' ? 0.9 : 1
      setBudget(r.cat.id, Math.ceil((r.avg * cut) / 10) * 10)
    }
  }

  return (
    <div className="animate-in">
      <PageHeader
        title="Orçamentos"
        subtitle="Defina limites mensais por categoria e acompanhe em tempo real"
        actions={
          <>
            <MonthPicker value={month} onChange={setMonth} />
            <button className="btn-outline" onClick={suggest}><Wand2 size={16} /> Sugerir</button>
          </>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <div className="text-xs text-muted">Orçamento total</div>
          <Money value={totalBudget} className="text-xl font-semibold" />
          <div className="text-xs text-faint">{income > 0 ? `${Math.round((totalBudget / income) * 100)}% da renda do mês` : 'defina sua renda para comparar'}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">Gasto nas categorias orçadas</div>
          <Money value={totalSpentBudgeted} className="text-xl font-semibold" />
          <Progress value={totalBudget ? totalSpentBudgeted / totalBudget : 0} className="mt-2" />
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">Disponível</div>
          <Money value={totalBudget - totalSpentBudgeted} className="text-xl font-semibold" colored />
          {isCurrent && <div className="text-xs text-faint">{Math.round(pace * 100)}% do mês já passou</div>}
        </div>
      </div>

      <div className="card divide-y divide-line">
        {rows.map(({ cat, budget, spent, avg }) => {
          const ratio = budget ? spent / budget : 0
          const ahead = isCurrent && budget > 0 && ratio > pace + 0.1 && ratio < 1
          return (
            <div key={cat.id} className="grid grid-cols-1 items-center gap-3 px-5 py-4 md:grid-cols-[1fr_180px]">
              <div className="flex items-center gap-3">
                <IconBadge name={cat.icon} color={cat.color} />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                    <span className="font-medium">{cat.name}</span>
                    <span className="text-muted">
                      <Money value={spent} className="font-medium text-ink" />
                      {budget > 0 && <> de <Money value={budget} /></>}
                    </span>
                  </div>
                  {budget > 0 ? (
                    <div className="relative">
                      <Progress value={ratio} />
                      {isCurrent && <div className="absolute -top-0.5 h-3 w-0.5 rounded bg-ink/50" style={{ left: `${pace * 100}%` }} title="Hoje" />}
                    </div>
                  ) : (
                    <div className="h-2" />
                  )}
                  <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-faint">
                    <span>Média 3 meses: {money(avg)}</span>
                    {budget > 0 && ratio >= 1 && <span className="font-medium text-bad">Estourou em {money(spent - budget)}</span>}
                    {budget > 0 && ratio < 1 && <span>Restam {money(budget - spent)}</span>}
                    {ahead && <span className="font-medium text-warn">Ritmo acima do esperado</span>}
                  </div>
                </div>
              </div>
              <div className={clsx('md:pl-4')}>
                <label className="sr-only" htmlFor={'b-' + cat.id}>Limite mensal de {cat.name}</label>
                <MoneyInput id={'b-' + cat.id} value={budget} onChange={(v) => setBudget(cat.id, v)} />
              </div>
            </div>
          )
        })}
      </div>
      {confirmEl}
    </div>
  )
}
