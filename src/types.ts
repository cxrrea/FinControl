export type TxType = 'income' | 'expense' | 'transfer'
export type TxStatus = 'paid' | 'pending'

export interface Transaction {
  id: string
  type: TxType
  description: string
  /** valor sempre positivo */
  amount: number
  /** data de vencimento / competência (yyyy-MM-dd) */
  date: string
  status: TxStatus
  paidDate?: string
  categoryId?: string
  accountId: string
  /** conta de destino (somente transferências) */
  toAccountId?: string
  notes?: string
  recurringId?: string
  installment?: { groupId: string; number: number; total: number }
  createdAt: string
}

export type AccountType = 'checking' | 'savings' | 'wallet' | 'investment' | 'credit'

export interface Account {
  id: string
  name: string
  type: AccountType
  initialBalance: number
  color: string
  archived?: boolean
}

/** grupo para a análise 50/30/20 */
export type CategoryGroup = 'essential' | 'lifestyle' | 'future'

export interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  color: string
  icon: string
  group?: CategoryGroup
}

export interface Budget {
  categoryId: string
  /** limite mensal */
  amount: number
}

export type Frequency = 'monthly' | 'weekly' | 'yearly'

export interface RecurringRule {
  id: string
  type: 'income' | 'expense'
  description: string
  amount: number
  categoryId?: string
  accountId: string
  frequency: Frequency
  startDate: string
  endDate?: string
  /** débito automático: marca como pago quando a data chega */
  autoPay: boolean
  active: boolean
  /** última data já gerada como lançamento */
  generatedUntil?: string
}

export interface Goal {
  id: string
  name: string
  target: number
  current: number
  deadline?: string
  color: string
  icon: string
}

export type ThemePref = 'system' | 'light' | 'dark'

export interface Settings {
  theme: ThemePref
  userName: string
  hideValues: boolean
  /** meta de poupança (% da renda) */
  savingsTarget: number
  forecastMonths: number
  onboarded: boolean
}
