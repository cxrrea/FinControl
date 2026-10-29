import type { RecurringRule, Transaction } from '../types'
import { nextOccurrence } from './dates'
import { uid } from './format'

/** datas de ocorrência de uma regra no intervalo (afterExclusive, untilInclusive] */
export function occurrences(rule: RecurringRule, untilInclusive: string, afterExclusive?: string): string[] {
  const out: string[] = []
  const anchorDay = Number(rule.startDate.slice(8, 10))
  const limit = rule.endDate && rule.endDate < untilInclusive ? rule.endDate : untilInclusive
  let d = rule.startDate
  let guard = 0
  while (d <= limit && guard++ < 2000) {
    if (!afterExclusive || d > afterExclusive) out.push(d)
    d = nextOccurrence(d, rule.frequency, anchorDay)
  }
  return out
}

export function txFromRule(rule: RecurringRule, date: string, today: string): Transaction {
  const paid = rule.autoPay && date <= today
  return {
    id: uid(),
    type: rule.type,
    description: rule.description,
    amount: rule.amount,
    date,
    status: paid ? 'paid' : 'pending',
    paidDate: paid ? date : undefined,
    categoryId: rule.categoryId,
    accountId: rule.accountId,
    recurringId: rule.id,
    createdAt: new Date().toISOString(),
  }
}

/** gera os lançamentos das regras até o horizonte; idempotente graças a generatedUntil */
export function materialize(rules: RecurringRule[], horizon: string, today: string) {
  const created: Transaction[] = []
  const updated = rules.map((r) => {
    if (!r.active) return r
    if (r.generatedUntil && r.generatedUntil >= horizon) return r
    const dates = occurrences(r, horizon, r.generatedUntil)
    dates.forEach((d) => created.push(txFromRule(r, d, today)))
    return { ...r, generatedUntil: horizon }
  })
  return { created, rules: updated }
}
