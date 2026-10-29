import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, ChevronRight, Info, PiggyBank, TrendingDown, TrendingUp, Wallet, XCircle } from 'lucide-react'
import clsx from 'clsx'
import { useData } from '../store/useStore'
import { useUI } from '../store/useUI'
import {
  accountBalance, balanceHistory, budgetStatus, cashflowSeries, cumulativeSpending, dailyAllowance, expensesByCategory, forecast, groupSplit, insights, monthSummary, totalBalance,
} from '../lib/finance'
import { addMonthsKey, currentMonth, monthRange, todayISO } from '../lib/dates'
import { percent } from '../lib/format'
import { CardHeader, Empty, Money, MonthPicker, Progress } from '../components/ui'
import { CashflowChart } from '../components/charts/CashflowChart'
import { CategoryList } from '../components/charts/CategoryList'
import { PaceChart } from '../components/charts/PaceChart'
import { BalanceChart } from '../components/charts/BalanceChart'
import { TxRow } from '../components/TxRow'
import { ACCOUNT_TYPE_LABEL } from '../data/defaults'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

function Delta({ value, inverse }: { value: number | null; inverse?: boolean }) {
  if (value == null || !Number.isFinite(value)) return null
  const up = value > 0
  const good = inverse ? !up : up
  return (
    <span className={clsx('inline-flex items-center gap-0.5 text-xs font-medium', good ? 'text-good' : 'text-bad')}>
      {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
      {percent(Math.abs(value))}
    </span>
  )
}

function Kpi({ label, value, icon, children, accent }: { label: string; value: number; icon: React.ReactNode; children?: React.ReactNode; accent?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        <span className={clsx('rounded-lg p-1.5', accent ?? 'bg-surface-2 text-muted')}>{icon}</span>
      </div>
      <Money value={value} className="mt-2 block text-2xl font-semibold tracking-tight" />
      <div className="mt-1 flex min-h-[20px] items-center gap-2 text-xs text-muted">{children}</div>
    </div>
  )
}

const LEVEL = {
  bad: { icon: XCircle, cls: 'text-bad bg-bad/10' },
  warn: { icon: AlertTriangle, cls: 'text-warn bg-warn/10' },
  good: { icon: CheckCircle2, cls: 'text-good bg-good/10' },
  info: { icon: Info, cls: 'text-brand bg-brand-soft' },
}

export default function Dashboard() {
  const data = useData()
  const nav = useNavigate()
  const openNewTx = useUI((s) => s.openNewTx)
  const [month, setMonth] = useState(currentMonth())
  const isCurrent = month === currentMonth()
  const today = todayISO()
  const txs = data.transactions

  const m = useMemo(() => {
    const summary = monthSummary(txs, month)
    const prev = monthSummary(txs, addMonthsKey(month, -1))
    const months = monthRange(addMonthsKey(month, -5), month)
    const flow = cashflowSeries(txs, months)
    const cats = expensesByCategory(txs, month, data.categories)
    const pace = {
      current: cumulativeSpending(txs, month),
      previous: cumulativeSpending(txs, addMonthsKey(month, -1)),
    }
    return { summary, prev, flow, cats, pace }
  }, [txs, month, data.categories])

  const balance = totalBalance(data.accounts, txs)
  const allowance = dailyAllowance(data)
  const tips = useMemo(() => insights(data), [data])
  const budgets = budgetStatus(data, month)
  const split = groupSplit(data, month)

  const balanceSeries = useMemo(() => {
    const cur = currentMonth()
    const hist = balanceHistory(data, monthRange(addMonthsKey(cur, -5), addMonthsKey(cur, -1)))
    const fc = forecast(data, 7)
    return [
      ...hist.map((h) => ({ month: h.month, real: h.balance })),
      { month: cur, real: balance, projected: balance },
      ...fc.slice(1).map((f) => ({ month: f.month, projected: f.closing })),
    ]
  }, [data, balance])

  const upcoming = txs
    .filter((t) => t.status === 'pending' && t.type !== 'transfer' && t.date <= addMonthsKey(currentMonth(), 1) + '-31')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6)

  const savingsRate = m.summary.income > 0 ? m.summary.net / m.summary.income : null
  const expDelta = m.prev.expense > 0 ? (m.summary.expense - m.prev.expense) / m.prev.expense : null
  const incDelta = m.prev.income > 0 ? (m.summary.income - m.prev.income) / m.prev.income : null

  if (!txs.length && !data.recurring.length) {
    return (
      <div className="card">
        <Empty
          icon={<Wallet size={28} />}
          title={`${greeting()}${data.settings.userName ? ', ' + data.settings.userName : ''}! Vamos registrar seu primeiro lançamento?`}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <button className="btn-primary" onClick={() => openNewTx({ type: 'income' })}>Cadastrar renda</button>
              <button className="btn-outline" onClick={() => openNewTx()}>Cadastrar despesa</button>
            </div>
          }
        >
          Comece pela sua renda mensal e pelas contas fixas (aluguel, luz, internet) marcando-as como <strong>Fixa / recorrente</strong>. Assim o FinControl já consegue prever seu mês.
        </Empty>
      </div>
    )
  }

  return (
    <div className="animate-in space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">{greeting()}{data.settings.userName ? `, ${data.settings.userName}` : ''} 👋</p>
          <h1 className="text-2xl font-semibold tracking-tight">Visão geral</h1>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Saldo atual" value={balance} icon={<Wallet size={16} />} accent="bg-brand-soft text-brand">
          em {data.accounts.filter((a) => !a.archived).length} contas
        </Kpi>
        <Kpi label="Receitas do mês" value={m.summary.income} icon={<TrendingUp size={16} />} accent="bg-income/10 text-income">
          <Delta value={incDelta} />
          {m.summary.incomePending > 0 ? <span>· <Money value={m.summary.incomePending} /> a receber</span> : <span>vs. mês anterior</span>}
        </Kpi>
        <Kpi label="Despesas do mês" value={m.summary.expense} icon={<TrendingDown size={16} />} accent="bg-expense/10 text-expense">
          <Delta value={expDelta} inverse />
          {m.summary.expensePending > 0 ? <span>· <Money value={m.summary.expensePending} /> a pagar</span> : <span>vs. mês anterior</span>}
        </Kpi>
        <Kpi label="Resultado do mês" value={m.summary.net} icon={<PiggyBank size={16} />} accent={m.summary.net >= 0 ? 'bg-good/10 text-good' : 'bg-bad/10 text-bad'}>
          {savingsRate != null && (
            <span className={clsx('font-medium', savingsRate >= data.settings.savingsTarget / 100 ? 'text-good' : savingsRate < 0 ? 'text-bad' : 'text-warn')}>
              {percent(savingsRate)} da renda poupada
            </span>
          )}
          <span>· meta {data.settings.savingsTarget}%</span>
        </Kpi>
      </div>

      {/* Disponível por dia + fluxo de caixa */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card relative overflow-hidden p-5">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand/10 blur-2xl" />
          <h3 className="text-sm font-semibold">Quanto posso gastar?</h3>
          <p className="text-xs text-muted">Até o fim do mês, já separando {data.settings.savingsTarget}% para poupar</p>
          <div className="mt-5">
            <div className="text-xs text-muted">Por dia ({allowance.daysLeft} dias restantes)</div>
            <Money value={Math.max(0, allowance.perDay)} className={clsx('block text-4xl font-semibold tracking-tight', allowance.perDay < 0 ? 'text-bad' : 'text-ink')} />
          </div>
          {allowance.free < 0 && (
            <p className="mt-2 rounded-lg bg-bad/10 px-3 py-2 text-xs text-bad">
              Seus compromissos do mês já passam do orçamento em <Money value={-allowance.free} className="font-semibold" />. Evite novos gastos.
            </p>
          )}
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Renda prevista</dt><dd><Money value={allowance.income} /></dd></div>
            <div className="flex justify-between"><dt className="text-muted">Gastos e contas do mês</dt><dd><Money value={-allowance.committed} /></dd></div>
            <div className="flex justify-between"><dt className="text-muted">Reserva para poupar</dt><dd><Money value={-allowance.savings} /></dd></div>
            <div className="flex justify-between border-t border-line pt-2 font-medium"><dt>Livre no mês</dt><dd><Money value={allowance.free} colored /></dd></div>
          </dl>
        </div>
        <div className="card lg:col-span-2">
          <CardHeader title="Fluxo de caixa" subtitle="Receitas, despesas e resultado dos últimos 6 meses · clique em um mês para detalhar" />
          <div className="pt-3">
            <CashflowChart data={m.flow} onSelect={setMonth} />
          </div>
        </div>
      </div>

      {/* Categorias + ritmo */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <CardHeader title="Para onde foi o dinheiro" subtitle={`Despesas por categoria · ${isCurrent ? 'este mês' : 'mês selecionado'}`} right={<Link to="/relatorios" className="text-xs font-medium text-brand">Relatórios</Link>} />
          <div className="p-5">
            {m.cats.length ? (
              <CategoryList rows={m.cats} onSelect={(id) => nav(`/lancamentos?cat=${id}&mes=${month}`)} />
            ) : (
              <Empty title="Sem despesas neste mês" />
            )}
          </div>
        </div>
        <div className="card">
          <CardHeader title="Ritmo de gastos" subtitle="Despesas acumuladas no mês comparadas ao mês anterior" />
          <div className="pt-3">
            <PaceChart current={m.pace.current} previous={m.pace.previous} today={isCurrent ? Number(today.slice(8, 10)) : null} />
          </div>
        </div>
      </div>

      {/* Próximas contas + alertas */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="card lg:col-span-3">
          <CardHeader title="Próximas contas" subtitle="Pendentes e vencidas" right={<Link to="/contas" className="inline-flex items-center text-xs font-medium text-brand">Ver todas <ChevronRight size={14} /></Link>} />
          <div className="mt-2 divide-y divide-line pb-2">
            {upcoming.length ? upcoming.map((t) => <TxRow key={t.id} t={t} compact />) : <Empty title="Nenhuma conta pendente 🎉" />}
          </div>
        </div>
        <div className="card lg:col-span-2">
          <CardHeader title="Alertas e dicas" subtitle="Gerados a partir dos seus dados" />
          <ul className="space-y-2 p-5">
            {tips.length ? (
              tips.slice(0, 6).map((tip, i) => {
                const L = LEVEL[tip.level]
                const content = (
                  <>
                    <span className={clsx('mt-0.5 rounded-lg p-1.5', L.cls)}><L.icon size={14} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{tip.title}</span>
                      <span className="block text-xs text-muted">{tip.detail}</span>
                    </span>
                  </>
                )
                return (
                  <li key={i}>
                    {tip.to ? (
                      <Link to={tip.to} className="flex gap-3 rounded-xl p-2 transition hover:bg-surface-2">{content}</Link>
                    ) : (
                      <div className="flex gap-3 p-2">{content}</div>
                    )}
                  </li>
                )
              })
            ) : (
              <li className="text-sm text-muted">Tudo em ordem por aqui.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Saldo + orçamentos + 50/30/20 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <CardHeader title="Evolução do saldo" subtitle="Últimos meses e projeção para os próximos 6" right={<Link to="/previsao" className="text-xs font-medium text-brand">Simular</Link>} />
          <div className="pt-3">
            <BalanceChart data={balanceSeries} />
          </div>
        </div>
        <div className="card">
          <CardHeader title="Contas" subtitle="Saldo por conta" right={<Link to="/cadastros" className="text-xs font-medium text-brand">Gerenciar</Link>} />
          <ul className="space-y-3 p-5">
            {data.accounts.filter((a) => !a.archived).map((a) => (
              <li key={a.id} className="flex items-center gap-3">
                <span className="h-8 w-1.5 rounded-full" style={{ background: a.color }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{a.name}</div>
                  <div className="text-xs text-muted">{ACCOUNT_TYPE_LABEL[a.type]}</div>
                </div>
                <Money value={accountBalance(a, txs)} className="text-sm font-semibold" colored={accountBalance(a, txs) < 0} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <CardHeader title="Orçamentos do mês" right={<Link to="/orcamentos" className="text-xs font-medium text-brand">Editar</Link>} />
          <div className="space-y-4 p-5">
            {budgets.length ? (
              budgets.slice(0, 5).map((b) => (
                <div key={b.categoryId}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-medium">{b.category!.name}</span>
                    <span className="text-muted"><Money value={b.spent} /> / <Money value={b.amount} /></span>
                  </div>
                  <Progress value={b.ratio} />
                </div>
              ))
            ) : (
              <Empty title="Nenhum orçamento definido" action={<Link to="/orcamentos" className="btn-outline">Definir orçamentos</Link>}>
                Limites por categoria ajudam a frear gastos antes que virem problema.
              </Empty>
            )}
          </div>
        </div>
        <div className="card">
          <CardHeader title="Regra 50 / 30 / 20" subtitle="Quanto da renda do mês foi para cada tipo de gasto" />
          <div className="space-y-4 p-5">
            {split.map((g) => (
              <div key={g.group}>
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <span className="font-medium">{g.label}</span>
                  <span className="text-muted">
                    <Money value={g.value} /> · <span className={clsx('font-medium', g.group !== 'future' && g.share > g.target ? 'text-bad' : 'text-ink')}>{percent(g.share)}</span> <span className="text-faint">(ideal {g.group === 'future' ? '≥' : '≤'} {percent(g.target)})</span>
                  </span>
                </div>
                <div className="relative h-2 w-full overflow-visible rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(1, g.share) * 100}%`,
                      background: g.group === 'future' ? (g.share >= g.target ? 'rgb(var(--good))' : 'rgb(var(--warn))') : g.share > g.target ? 'rgb(var(--bad))' : 'rgb(var(--good))',
                    }}
                  />
                  <div className="absolute -top-1 h-4 w-0.5 rounded bg-ink/60" style={{ left: `${g.target * 100}%` }} title="Ideal" />
                </div>
              </div>
            ))}
            <p className="text-xs text-faint">Essenciais: moradia, mercado, saúde… · Estilo de vida: lazer, restaurantes, compras… · Futuro: investimentos e quitação de dívidas. Ajuste o grupo de cada categoria em Carteiras e categorias.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
