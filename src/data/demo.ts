import type { Account, Budget, Goal, RecurringRule, Transaction } from '../types'
import { addMonthsKey, currentMonth, daysInMonth, todayISO } from '../lib/dates'
import { uid } from '../lib/format'

/** gera ~6 meses de histórico realista para explorar o app */
export function buildDemo() {
  const cur = currentMonth()
  const today = todayISO()
  const start = addMonthsKey(cur, -5)

  const accounts: Account[] = [
    { id: 'principal', name: 'Nubank Conta', type: 'checking', initialBalance: 3200, color: '#6250d6' },
    { id: 'carteira', name: 'Carteira', type: 'wallet', initialBalance: 150, color: '#1baf7a' },
    { id: 'reserva', name: 'Reserva de emergência', type: 'savings', initialBalance: 5000, color: '#2a78d6' },
    { id: 'cartao', name: 'Cartão de crédito', type: 'credit', initialBalance: 0, color: '#eb6834' },
  ]

  const recurring: RecurringRule[] = [
    { id: 'r-sal', type: 'income', description: 'Salário', amount: 8600, categoryId: 'salario', accountId: 'principal', frequency: 'monthly', startDate: `${start}-05`, autoPay: true, active: true },
    { id: 'r-alug', type: 'expense', description: 'Aluguel + condomínio', amount: 2150, categoryId: 'moradia', accountId: 'principal', frequency: 'monthly', startDate: `${start}-10`, autoPay: false, active: true },
    { id: 'r-luz', type: 'expense', description: 'Energia elétrica', amount: 210, categoryId: 'contas-casa', accountId: 'principal', frequency: 'monthly', startDate: `${start}-15`, autoPay: false, active: true },
    { id: 'r-net', type: 'expense', description: 'Internet + celular', amount: 159.9, categoryId: 'contas-casa', accountId: 'principal', frequency: 'monthly', startDate: `${start}-12`, autoPay: true, active: true },
    { id: 'r-acad', type: 'expense', description: 'Academia', amount: 119.9, categoryId: 'saude', accountId: 'cartao', frequency: 'monthly', startDate: `${start}-03`, autoPay: true, active: true },
    { id: 'r-strm', type: 'expense', description: 'Streamings (Netflix, Spotify, Max)', amount: 89.7, categoryId: 'assinaturas', accountId: 'cartao', frequency: 'monthly', startDate: `${start}-08`, autoPay: true, active: true },
    { id: 'r-plano', type: 'expense', description: 'Plano de saúde', amount: 480, categoryId: 'saude', accountId: 'principal', frequency: 'monthly', startDate: `${start}-20`, autoPay: false, active: true },
    { id: 'r-inv', type: 'expense', description: 'Aporte mensal (Tesouro/CDB)', amount: 500, categoryId: 'investimentos', accountId: 'principal', frequency: 'monthly', startDate: `${start}-06`, autoPay: false, active: true },
  ]

  // pseudo-aleatório determinístico
  let seed = 42
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]

  const variable: { cat: string; desc: string[]; min: number; max: number; perMonth: number; account: string }[] = [
    { cat: 'mercado', desc: ['Supermercado', 'Feira', 'Hortifruti', 'Padaria'], min: 40, max: 300, perMonth: 6, account: 'cartao' },
    { cat: 'restaurantes', desc: ['iFood', 'Restaurante', 'Lanche', 'Café', 'Pizza'], min: 25, max: 120, perMonth: 9, account: 'cartao' },
    { cat: 'transporte', desc: ['Uber', '99', 'Combustível', 'Estacionamento'], min: 15, max: 160, perMonth: 7, account: 'cartao' },
    { cat: 'lazer', desc: ['Cinema', 'Bar com amigos', 'Show', 'Passeio'], min: 40, max: 220, perMonth: 2, account: 'cartao' },
    { cat: 'compras', desc: ['Amazon', 'Roupas', 'Shopee', 'Mercado Livre'], min: 50, max: 300, perMonth: 2, account: 'cartao' },
    { cat: 'cuidados', desc: ['Barbearia', 'Farmácia', 'Cosméticos'], min: 30, max: 140, perMonth: 2, account: 'principal' },
  ]

  const txs: Transaction[] = []
  const now = new Date().toISOString()
  for (let i = 0; i <= 5; i++) {
    const m = addMonthsKey(start, i)
    const days = daysInMonth(m)
    // últimos meses com gastos crescentes, para gerar alertas
    const inflation = 1 + i * 0.05
    for (const v of variable) {
      const n = Math.max(1, Math.round(v.perMonth * (0.8 + rnd() * 0.4)))
      for (let k = 0; k < n; k++) {
        const d = `${m}-${String(1 + Math.floor(rnd() * days)).padStart(2, '0')}`
        if (d > today) continue
        txs.push({
          id: uid(), type: 'expense', description: pick(v.desc), amount: Math.round((v.min + rnd() * (v.max - v.min)) * inflation * 100) / 100,
          date: d, status: 'paid', paidDate: d, categoryId: v.cat, accountId: v.account, createdAt: now,
        })
      }
    }
    if (i % 2 === 1) {
      const d = `${m}-18`
      if (d <= today) txs.push({ id: uid(), type: 'income', description: 'Projeto freelance', amount: Math.round(900 + rnd() * 1400), date: d, status: 'paid', paidDate: d, categoryId: 'freela', accountId: 'principal', createdAt: now })
    }
  }

  // compra parcelada em 10x
  const groupId = uid()
  for (let n = 0; n < 10; n++) {
    const m = addMonthsKey(start, 2 + n)
    const d = `${m}-14`
    txs.push({
      id: uid(), type: 'expense', description: 'Notebook', amount: 389.9, date: d, status: d <= today ? 'paid' : 'pending', paidDate: d <= today ? d : undefined,
      categoryId: 'compras', accountId: 'cartao', installment: { groupId, number: n + 1, total: 10 }, createdAt: now,
    })
  }
  // pagamento da fatura do cartão: transfere o gasto do cartão no mês anterior
  const cardFixed = recurring.filter((r) => r.accountId === 'cartao').reduce((a, r) => a + r.amount, 0)
  for (let i = 1; i <= 5; i++) {
    const prev = addMonthsKey(start, i - 1)
    const d = `${addMonthsKey(start, i)}-07`
    if (d > today) continue
    const spent = txs.filter((t) => t.accountId === 'cartao' && t.type === 'expense' && t.date.startsWith(prev)).reduce((a, t) => a + t.amount, 0) + cardFixed
    txs.push({ id: uid(), type: 'transfer', description: 'Pagamento fatura do cartão', amount: Math.round(spent * 100) / 100, date: d, status: 'paid', paidDate: d, accountId: 'principal', toAccountId: 'cartao', createdAt: now })
  }

  // receita a receber e conta avulsa
  txs.push({ id: uid(), type: 'income', description: 'Reembolso de viagem', amount: 640, date: `${addMonthsKey(cur, 1)}-02`, status: 'pending', categoryId: 'outras-receitas', accountId: 'principal', createdAt: now })
  txs.push({ id: uid(), type: 'expense', description: 'IPVA (cota única)', amount: 1380, date: `${addMonthsKey(cur, 2)}-20`, status: 'pending', categoryId: 'transporte', accountId: 'principal', createdAt: now })

  const budgets: Budget[] = [
    { categoryId: 'mercado', amount: 1300 },
    { categoryId: 'restaurantes', amount: 700 },
    { categoryId: 'transporte', amount: 650 },
    { categoryId: 'lazer', amount: 400 },
    { categoryId: 'compras', amount: 600 },
  ]

  const goals: Goal[] = [
    { id: uid(), name: 'Reserva de emergência (6 meses)', target: 30000, current: 5000, deadline: `${addMonthsKey(cur, 18)}-01`, color: '#2a78d6', icon: 'shield' },
    { id: uid(), name: 'Viagem de férias', target: 8000, current: 1800, deadline: `${addMonthsKey(cur, 8)}-01`, color: '#eb6834', icon: 'plane' },
  ]

  return { accounts, recurring, transactions: txs, budgets, goals }
}
