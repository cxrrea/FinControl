import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Account, Category, Goal, RecurringRule, Settings, Transaction } from '../types'
import { defaultAccounts, defaultCategories, defaultSettings } from '../data/defaults'
import { buildDemo } from '../data/demo'
import { addDaysISO, addMonthsKey, addMonthsISO, currentMonth, monthEnd, todayISO } from '../lib/dates'
import { uid } from '../lib/format'
import { materialize } from '../lib/recurring'
import type { AppData } from '../lib/finance'

export type NewTx = Omit<Transaction, 'id' | 'createdAt'>

interface Actions {
  /** gera recorrências pendentes e aplica débitos automáticos — chamado ao abrir o app */
  sync: () => void
  addTransaction: (t: NewTx, installments?: number) => void
  updateTransaction: (id: string, patch: Partial<Transaction>, scope?: 'one' | 'future') => void
  deleteTransaction: (id: string, scope?: 'one' | 'future') => void
  togglePaid: (id: string) => void

  upsertAccount: (a: Account) => void
  deleteAccount: (id: string) => void
  upsertCategory: (c: Category) => void
  deleteCategory: (id: string) => void
  setBudget: (categoryId: string, amount: number) => void

  upsertRecurring: (r: RecurringRule) => void
  deleteRecurring: (id: string, removePending: boolean) => void

  upsertGoal: (g: Goal) => void
  deleteGoal: (id: string) => void

  setSettings: (s: Partial<Settings>) => void
  importData: (d: Partial<AppData>) => void
  loadDemo: () => void
  reset: () => void
}

const emptyData = (): AppData => ({
  transactions: [],
  accounts: defaultAccounts,
  categories: defaultCategories,
  budgets: [],
  recurring: [],
  goals: [],
  settings: defaultSettings,
})

const horizon = () => monthEnd(addMonthsKey(currentMonth(), 1))

function runSync(s: AppData): Pick<AppData, 'transactions' | 'recurring'> {
  const today = todayISO()
  const { created, rules } = materialize(s.recurring, horizon(), today)
  const autoIds = new Set(rules.filter((r) => r.autoPay).map((r) => r.id))
  const transactions = [...s.transactions, ...created].map((t) =>
    t.status === 'pending' && t.recurringId && autoIds.has(t.recurringId) && t.date <= today ? { ...t, status: 'paid' as const, paidDate: t.date } : t,
  )
  return { transactions, recurring: rules }
}

export const useStore = create<AppData & Actions>()(
  persist(
    (set, get) => ({
      ...emptyData(),

      sync: () => set((s) => runSync(s)),

      addTransaction: (t, installments = 1) =>
        set((s) => {
          const now = new Date().toISOString()
          if (installments <= 1) return { transactions: [...s.transactions, { ...t, id: uid(), createdAt: now }] }
          const groupId = uid()
          const per = Math.round((t.amount / installments) * 100) / 100
          const day = Number(t.date.slice(8, 10))
          const list: Transaction[] = Array.from({ length: installments }, (_, i) => {
            const date = addMonthsISO(t.date, i, day)
            // a última parcela absorve o arredondamento
            const amount = i === installments - 1 ? Math.round((t.amount - per * (installments - 1)) * 100) / 100 : per
            const paid = i === 0 ? t.status === 'paid' : false
            return { ...t, id: uid(), createdAt: now, date, amount, status: paid ? 'paid' : 'pending', paidDate: paid ? t.paidDate ?? date : undefined, installment: { groupId, number: i + 1, total: installments } }
          })
          return { transactions: [...s.transactions, ...list] }
        }),

      updateTransaction: (id, patch, scope = 'one') =>
        set((s) => {
          const base = s.transactions.find((t) => t.id === id)
          if (!base) return {}
          const sameSeries = (t: Transaction) =>
            scope === 'future' &&
            t.date >= base.date &&
            ((base.installment && t.installment?.groupId === base.installment.groupId) || (base.recurringId && t.recurringId === base.recurringId))
          // em séries, propaga apenas campos "de cadastro" (não a data nem o status)
          const { date: _d, status: _s, paidDate: _p, installment: _i, ...seriesPatch } = patch
          return {
            transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : sameSeries(t) && t.status === 'pending' ? { ...t, ...seriesPatch } : t)),
          }
        }),

      deleteTransaction: (id, scope = 'one') =>
        set((s) => {
          const base = s.transactions.find((t) => t.id === id)
          if (!base) return {}
          return {
            transactions: s.transactions.filter((t) => {
              if (t.id === id) return false
              if (scope !== 'future' || t.date < base.date) return true
              if (base.installment && t.installment?.groupId === base.installment.groupId) return false
              if (base.recurringId && t.recurringId === base.recurringId && t.status === 'pending') return false
              return true
            }),
          }
        }),

      togglePaid: (id) =>
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? (t.status === 'paid' ? { ...t, status: 'pending', paidDate: undefined } : { ...t, status: 'paid', paidDate: todayISO() }) : t,
          ),
        })),

      upsertAccount: (a) => set((s) => ({ accounts: s.accounts.some((x) => x.id === a.id) ? s.accounts.map((x) => (x.id === a.id ? a : x)) : [...s.accounts, a] })),
      deleteAccount: (id) => set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) })),
      upsertCategory: (c) => set((s) => ({ categories: s.categories.some((x) => x.id === c.id) ? s.categories.map((x) => (x.id === c.id ? c : x)) : [...s.categories, c] })),
      deleteCategory: (id) =>
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          budgets: s.budgets.filter((b) => b.categoryId !== id),
          transactions: s.transactions.map((t) => (t.categoryId === id ? { ...t, categoryId: undefined } : t)),
        })),
      setBudget: (categoryId, amount) =>
        set((s) => ({
          budgets: amount > 0 ? [...s.budgets.filter((b) => b.categoryId !== categoryId), { categoryId, amount }] : s.budgets.filter((b) => b.categoryId !== categoryId),
        })),

      upsertRecurring: (r) =>
        set((s) => {
          const exists = s.recurring.find((x) => x.id === r.id)
          let transactions = s.transactions
          let rule = r
          if (exists) {
            const today = todayISO()
            rule = { ...r, generatedUntil: r.generatedUntil ?? exists.generatedUntil }
            // atualiza os lançamentos pendentes já gerados por essa regra
            transactions = transactions.map((t) =>
              t.recurringId === r.id && t.status === 'pending'
                ? { ...t, description: r.description, amount: r.amount, categoryId: r.categoryId, accountId: r.accountId, type: r.type }
                : t,
            )
            const scheduleChanged = exists.startDate !== r.startDate || exists.frequency !== r.frequency
            const drop = (t: Transaction) =>
              t.recurringId === r.id &&
              t.status === 'pending' &&
              ((!r.active && t.date > today) || (scheduleChanged && t.date >= today) || (!!r.endDate && t.date > r.endDate))
            transactions = transactions.filter((t) => !drop(t))
            if (scheduleChanged) rule = { ...rule, generatedUntil: addDaysISO(today, -1) }
            // reativada: retoma a partir de hoje
            if (r.active && !exists.active) rule = { ...rule, generatedUntil: today }
          }
          const recurring = exists ? s.recurring.map((x) => (x.id === r.id ? rule : x)) : [...s.recurring, rule]
          return runSync({ ...get(), transactions, recurring })
        }),

      deleteRecurring: (id, removePending) =>
        set((s) => ({
          recurring: s.recurring.filter((r) => r.id !== id),
          transactions: s.transactions
            .filter((t) => !(removePending && t.recurringId === id && t.status === 'pending'))
            .map((t) => (t.recurringId === id ? { ...t, recurringId: undefined } : t)),
        })),

      upsertGoal: (g) => set((s) => ({ goals: s.goals.some((x) => x.id === g.id) ? s.goals.map((x) => (x.id === g.id ? g : x)) : [...s.goals, g] })),
      deleteGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

      setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),

      importData: (d) =>
        set((s) => {
          const next = { ...emptyData(), ...d, settings: { ...defaultSettings, ...(d.settings ?? {}), theme: s.settings.theme } }
          return { ...next, ...runSync(next) }
        }),

      loadDemo: () =>
        set((s) => {
          const demo = buildDemo()
          const base: AppData = { ...emptyData(), ...demo, categories: defaultCategories, settings: { ...s.settings, onboarded: true } }
          const synced = runSync(base)
          const today = todayISO()
          const cur = currentMonth()
          // no histórico, contas fixas já foram pagas — deixa só a luz do mês em aberto para ilustrar alertas
          synced.transactions = synced.transactions.map((t) =>
            t.status === 'pending' && t.date < today && !(t.date.startsWith(cur) && t.recurringId === 'r-luz') ? { ...t, status: 'paid', paidDate: t.date } : t,
          )
          return { ...base, ...synced }
        }),

      reset: () => set((s) => ({ ...emptyData(), settings: { ...defaultSettings, theme: s.settings.theme, onboarded: true } })),
    }),
    { name: 'fincontrol-v1', version: 1 },
  ),
)

/** seleciona apenas os dados (sem as ações) */
export const useData = (): AppData => {
  const transactions = useStore((s) => s.transactions)
  const accounts = useStore((s) => s.accounts)
  const categories = useStore((s) => s.categories)
  const budgets = useStore((s) => s.budgets)
  const recurring = useStore((s) => s.recurring)
  const goals = useStore((s) => s.goals)
  const settings = useStore((s) => s.settings)
  return { transactions, accounts, categories, budgets, recurring, goals, settings }
}
