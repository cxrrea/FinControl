import type { Account, Budget, Category, CategoryGroup, Goal, RecurringRule, Settings, Transaction } from '../types'
import { addMonthsKey, currentMonth, daysInMonth, daysUntil, monthKey, monthRange, todayISO } from './dates'
import { occurrences } from './recurring'

export interface AppData {
  transactions: Transaction[]
  accounts: Account[]
  categories: Category[]
  budgets: Budget[]
  recurring: RecurringRule[]
  goals: Goal[]
  settings: Settings
}

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
export const round2 = (n: number) => Math.round(n * 100) / 100

/* ---------------------------------------------------------------- saldos */

export function accountBalance(account: Account, txs: Transaction[]): number {
  let b = account.initialBalance
  for (const t of txs) {
    if (t.status !== 'paid') continue
    if (t.type === 'income' && t.accountId === account.id) b += t.amount
    else if (t.type === 'expense' && t.accountId === account.id) b -= t.amount
    else if (t.type === 'transfer') {
      if (t.accountId === account.id) b -= t.amount
      if (t.toAccountId === account.id) b += t.amount
    }
  }
  return round2(b)
}

export function totalBalance(accounts: Account[], txs: Transaction[]): number {
  return round2(sum(accounts.filter((a) => !a.archived).map((a) => accountBalance(a, txs))))
}

/* --------------------------------------------------------------- mensais */

export const inMonth = (t: Transaction, key: string) => monthKey(t.date) === key
/** despesa "variável": não vem de recorrência nem de parcelamento */
export const isVariable = (t: Transaction) => !t.recurringId && !t.installment

export interface MonthSummary {
  month: string
  income: number
  expense: number
  incomePaid: number
  expensePaid: number
  incomePending: number
  expensePending: number
  net: number
}

export function monthSummary(txs: Transaction[], key: string): MonthSummary {
  let income = 0, expense = 0, incomePaid = 0, expensePaid = 0
  for (const t of txs) {
    if (t.type === 'transfer' || !inMonth(t, key)) continue
    if (t.type === 'income') {
      income += t.amount
      if (t.status === 'paid') incomePaid += t.amount
    } else {
      expense += t.amount
      if (t.status === 'paid') expensePaid += t.amount
    }
  }
  return {
    month: key,
    income: round2(income),
    expense: round2(expense),
    incomePaid: round2(incomePaid),
    expensePaid: round2(expensePaid),
    incomePending: round2(income - incomePaid),
    expensePending: round2(expense - expensePaid),
    net: round2(income - expense),
  }
}

export function cashflowSeries(txs: Transaction[], months: string[]) {
  return months.map((m) => monthSummary(txs, m))
}

export function expensesByCategory(txs: Transaction[], key: string | string[], categories: Category[]) {
  const keys = Array.isArray(key) ? new Set(key) : new Set([key])
  const map = new Map<string, number>()
  for (const t of txs) {
    if (t.type !== 'expense' || !keys.has(monthKey(t.date))) continue
    const c = t.categoryId ?? 'none'
    map.set(c, (map.get(c) ?? 0) + t.amount)
  }
  return [...map.entries()]
    .map(([id, value]) => {
      const cat = categories.find((c) => c.id === id)
      return { id, name: cat?.name ?? 'Sem categoria', color: cat?.color ?? '#888', icon: cat?.icon ?? 'tag', value: round2(value) }
    })
    .sort((a, b) => b.value - a.value)
}

/** média mensal de despesas variáveis nos últimos n meses completos */
export function avgVariableExpense(txs: Transaction[], n = 3, ref = currentMonth()) {
  const months = monthRange(addMonthsKey(ref, -n), addMonthsKey(ref, -1))
  const totals = months.map((m) => sum(txs.filter((t) => t.type === 'expense' && isVariable(t) && inMonth(t, m)).map((t) => t.amount)))
  const withData = totals.filter((v) => v > 0)
  return withData.length ? round2(sum(withData) / withData.length) : 0
}

export function avgCategoryExpense(txs: Transaction[], categoryId: string, n = 3, ref = currentMonth()) {
  const months = monthRange(addMonthsKey(ref, -n), addMonthsKey(ref, -1))
  const total = sum(txs.filter((t) => t.type === 'expense' && t.categoryId === categoryId && months.includes(monthKey(t.date))).map((t) => t.amount))
  return round2(total / n)
}

/* --------------------------------------------------------------- previsão */

export interface ForecastMonth {
  month: string
  opening: number
  income: number
  fixedExpense: number
  variableExpense: number
  expense: number
  net: number
  closing: number
}

/**
 * Projeta o saldo mês a mês: parte do saldo real de hoje, soma o que está pendente
 * (contas a pagar/receber, parcelas), recorrências futuras ainda não geradas e uma
 * estimativa de gastos variáveis baseada na média recente.
 */
export function forecast(data: AppData, months: number, opts: { variableCut?: number; extraIncome?: number; extraSaving?: number } = {}): ForecastMonth[] {
  const { transactions: txs, recurring, accounts } = data
  const cut = opts.variableCut ?? 0
  const cur = currentMonth()
  const avgVar = avgVariableExpense(txs) * (1 - cut)
  let balance = totalBalance(accounts, txs)
  const out: ForecastMonth[] = []

  for (let i = 0; i < months; i++) {
    const m = addMonthsKey(cur, i)
    const pending = txs.filter((t) => t.status === 'pending' && t.type !== 'transfer' && (i === 0 ? monthKey(t.date) <= m : inMonth(t, m)))
    let income = sum(pending.filter((t) => t.type === 'income').map((t) => t.amount))
    let fixed = sum(pending.filter((t) => t.type === 'expense').map((t) => t.amount))

    for (const r of recurring) {
      if (!r.active) continue
      const dates = occurrences(r, m + '-31', r.generatedUntil).filter((d) => monthKey(d) === m)
      if (r.type === 'income') income += r.amount * dates.length
      else fixed += r.amount * dates.length
    }

    let variable = avgVar
    if (i === 0) {
      const spent = sum(txs.filter((t) => t.type === 'expense' && isVariable(t) && inMonth(t, m)).map((t) => t.amount))
      variable = Math.max(0, avgVar - spent)
    }
    income += opts.extraIncome ?? 0
    const expense = fixed + variable + (opts.extraSaving ?? 0)
    const opening = balance
    balance = balance + income - expense
    out.push({
      month: m,
      opening: round2(opening),
      income: round2(income),
      fixedExpense: round2(fixed),
      variableExpense: round2(variable),
      expense: round2(expense),
      net: round2(income - expense),
      closing: round2(balance),
    })
  }
  return out
}

/* --------------------------------------------------- orçamento do mês */

export function budgetStatus(data: AppData, key = currentMonth()) {
  const byCat = expensesByCategory(data.transactions, key, data.categories)
  return data.budgets
    .map((b) => {
      const cat = data.categories.find((c) => c.id === b.categoryId)
      const spent = byCat.find((x) => x.id === b.categoryId)?.value ?? 0
      return { ...b, category: cat, spent, ratio: b.amount > 0 ? spent / b.amount : 0, remaining: round2(b.amount - spent) }
    })
    .filter((b) => b.category)
    .sort((a, b) => b.ratio - a.ratio)
}

/** recorrências desta mês ainda não materializadas (normalmente nenhuma, pois o horizonte cobre o mês seguinte) */
function virtualThisMonth(rules: RecurringRule[], key: string, type: 'income' | 'expense') {
  return sum(
    rules
      .filter((r) => r.active && r.type === type)
      .map((r) => occurrences(r, key + '-31', r.generatedUntil).filter((d) => monthKey(d) === key).length * r.amount),
  )
}

/** quanto ainda dá para gastar por dia até o fim do mês respeitando a meta de poupança */
export function dailyAllowance(data: AppData) {
  const key = currentMonth()
  const s = monthSummary(data.transactions, key)
  const income = s.income + virtualThisMonth(data.recurring, key, 'income')
  const committed = s.expense + virtualThisMonth(data.recurring, key, 'expense')
  const savings = income * (data.settings.savingsTarget / 100)
  const free = income - committed - savings
  const today = Number(todayISO().slice(8, 10))
  const daysLeft = daysInMonth(key) - today + 1
  return { income, committed, savings, free: round2(free), daysLeft, perDay: round2(free / daysLeft) }
}

/* --------------------------------------------------- 50/30/20 */

export const GROUP_LABEL: Record<CategoryGroup, string> = {
  essential: 'Essenciais',
  lifestyle: 'Estilo de vida',
  future: 'Futuro / Dívidas',
}
export const GROUP_TARGET: Record<CategoryGroup, number> = { essential: 0.5, lifestyle: 0.3, future: 0.2 }

export function groupSplit(data: AppData, key = currentMonth()) {
  const byCat = expensesByCategory(data.transactions, key, data.categories)
  const totals: Record<CategoryGroup, number> = { essential: 0, lifestyle: 0, future: 0 }
  for (const c of byCat) {
    const g = data.categories.find((x) => x.id === c.id)?.group ?? 'lifestyle'
    totals[g] += c.value
  }
  const income = monthSummary(data.transactions, key).income
  return (Object.keys(totals) as CategoryGroup[]).map((g) => ({
    group: g,
    label: GROUP_LABEL[g],
    value: round2(totals[g]),
    share: income > 0 ? totals[g] / income : 0,
    target: GROUP_TARGET[g],
  }))
}

/* --------------------------------------------------- contas a pagar */

export function bills(txs: Transaction[], type: 'income' | 'expense') {
  return txs.filter((t) => t.type === type && t.status === 'pending').sort((a, b) => a.date.localeCompare(b.date))
}

/* --------------------------------------------------- insights */

export interface Insight {
  level: 'good' | 'warn' | 'bad' | 'info'
  title: string
  detail: string
  to?: string
}

export function insights(data: AppData): Insight[] {
  const out: Insight[] = []
  const txs = data.transactions
  const today = todayISO()
  const cur = currentMonth()

  const overdue = txs.filter((t) => t.type === 'expense' && t.status === 'pending' && t.date < today)
  if (overdue.length) {
    out.push({
      level: 'bad',
      title: `${overdue.length} conta${overdue.length > 1 ? 's' : ''} vencida${overdue.length > 1 ? 's' : ''}`,
      detail: `Total de ${fmt(sum(overdue.map((t) => t.amount)))} em atraso. Pague o quanto antes para evitar juros e multa.`,
      to: '/contas',
    })
  }
  const soon = txs.filter((t) => t.type === 'expense' && t.status === 'pending' && t.date >= today && daysUntil(t.date) <= 7)
  if (soon.length) {
    out.push({
      level: 'warn',
      title: `${soon.length} conta${soon.length > 1 ? 's vencem' : ' vence'} nos próximos 7 dias`,
      detail: `Reserve ${fmt(sum(soon.map((t) => t.amount)))} para esses pagamentos.`,
      to: '/contas',
    })
  }

  const bs = budgetStatus(data)
  const over = bs.filter((b) => b.ratio >= 1)
  const near = bs.filter((b) => b.ratio >= 0.8 && b.ratio < 1)
  if (over.length === 1) {
    const b = over[0]
    out.push({ level: 'bad', title: `Orçamento estourado: ${b.category!.name}`, detail: `Gasto de ${fmt(b.spent)} para um limite de ${fmt(b.amount)} (${Math.round(b.ratio * 100)}%).`, to: '/orcamentos' })
  } else if (over.length > 1) {
    out.push({
      level: 'bad',
      title: `${over.length} orçamentos estourados`,
      detail: `${over.map((b) => b.category!.name).join(', ')} — ${fmt(sum(over.map((b) => b.spent - b.amount)))} acima dos limites somados.`,
      to: '/orcamentos',
    })
  }
  if (near.length) {
    out.push({
      level: 'warn',
      title: near.length === 1 ? `${near[0].category!.name} perto do limite` : `${near.length} orçamentos perto do limite`,
      detail: near.map((b) => `${b.category!.name}: ${Math.round(b.ratio * 100)}%`).join(' · '),
      to: '/orcamentos',
    })
  }

  // ritmo de gastos por categoria vs. média dos últimos 3 meses
  const day = Number(today.slice(8, 10))
  const pace = day / daysInMonth(cur)
  const byCat = expensesByCategory(txs.filter((t) => isVariable(t)), cur, data.categories)
  for (const c of byCat.slice(0, 6)) {
    const avg = avgCategoryExpense(txs.filter((t) => isVariable(t)), c.id)
    if (avg > 50 && c.value > avg * 1.2 && c.value > avg * pace * 1.3) {
      out.push({ level: 'warn', title: `Gastos com ${c.name} acima do normal`, detail: `${fmt(c.value)} este mês contra média de ${fmt(avg)}/mês nos últimos 3 meses.`, to: '/lancamentos' })
      break
    }
  }

  const fc = forecast(data, data.settings.forecastMonths)
  const neg = fc.find((m) => m.closing < 0)
  if (neg) {
    out.push({ level: 'bad', title: 'Saldo projetado negativo', detail: `No ritmo atual, seu saldo fica negativo em ${neg.month.slice(5)}/${neg.month.slice(0, 4)}. Veja o simulador em Previsão.`, to: '/previsao' })
  }

  const last = monthSummary(txs, addMonthsKey(cur, -1))
  if (last.income > 0) {
    const rate = (last.income - last.expense) / last.income
    if (rate >= data.settings.savingsTarget / 100) {
      out.push({ level: 'good', title: `Mês passado você poupou ${Math.round(rate * 100)}% da renda`, detail: `Meta de ${data.settings.savingsTarget}% atingida. Continue assim!` })
    } else if (rate < 0) {
      out.push({ level: 'bad', title: 'Mês passado você gastou mais do que ganhou', detail: `Déficit de ${fmt(-(last.income - last.expense))}. Revise as maiores categorias de gasto.`, to: '/relatorios' })
    } else {
      out.push({ level: 'info', title: `Mês passado você poupou ${Math.round(rate * 100)}% da renda`, detail: `Sua meta é ${data.settings.savingsTarget}%. Faltaram ${fmt(last.income * (data.settings.savingsTarget / 100) - (last.income - last.expense))}.` })
    }
  }

  if (!data.budgets.length) {
    out.push({ level: 'info', title: 'Defina orçamentos por categoria', detail: 'Limites mensais são a forma mais eficaz de conter gastos. Comece pelas 3 maiores categorias.', to: '/orcamentos' })
  }
  const rank = { bad: 0, warn: 1, info: 2, good: 3 }
  return out.sort((a, b) => rank[a.level] - rank[b.level])
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export { sum }

/* --------------------------------------------------- séries históricas */

/** saldo total ao fim de cada mês (considera apenas o que foi efetivamente pago) */
export function balanceHistory(data: AppData, months: string[]) {
  return months.map((m) => {
    const end = m + '-31'
    const txs = data.transactions.filter((t) => t.status === 'paid' && (t.paidDate ?? t.date) <= end)
    return { month: m, balance: totalBalance(data.accounts, txs) }
  })
}

/** gasto acumulado dia a dia no mês */
export function cumulativeSpending(txs: Transaction[], key: string) {
  const days = daysInMonth(key)
  const daily = new Array(days).fill(0)
  for (const t of txs) {
    if (t.type !== 'expense' || !inMonth(t, key)) continue
    daily[Number(t.date.slice(8, 10)) - 1] += t.amount
  }
  let acc = 0
  return daily.map((v) => round2((acc += v)))
}
