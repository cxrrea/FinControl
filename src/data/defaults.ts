import type { Account, Category, Settings } from '../types'

export const PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948', '#0e9bb5', '#8a6d3b']

export const defaultCategories: Category[] = [
  { id: 'salario', name: 'Salário', type: 'income', color: '#1baf7a', icon: 'briefcase' },
  { id: 'freela', name: 'Freelance / Extra', type: 'income', color: '#2a78d6', icon: 'laptop' },
  { id: 'rendimentos', name: 'Rendimentos', type: 'income', color: '#6250d6', icon: 'trending-up' },
  { id: 'outras-receitas', name: 'Outras receitas', type: 'income', color: '#eda100', icon: 'plus-circle' },

  { id: 'moradia', name: 'Moradia', type: 'expense', color: '#2a78d6', icon: 'home', group: 'essential' },
  { id: 'contas-casa', name: 'Contas da casa', type: 'expense', color: '#0e9bb5', icon: 'zap', group: 'essential' },
  { id: 'mercado', name: 'Mercado', type: 'expense', color: '#1baf7a', icon: 'shopping-cart', group: 'essential' },
  { id: 'transporte', name: 'Transporte', type: 'expense', color: '#eda100', icon: 'car', group: 'essential' },
  { id: 'saude', name: 'Saúde', type: 'expense', color: '#e34948', icon: 'heart-pulse', group: 'essential' },
  { id: 'educacao', name: 'Educação', type: 'expense', color: '#6250d6', icon: 'graduation-cap', group: 'essential' },
  { id: 'restaurantes', name: 'Restaurantes / Delivery', type: 'expense', color: '#eb6834', icon: 'utensils', group: 'lifestyle' },
  { id: 'lazer', name: 'Lazer', type: 'expense', color: '#e87ba4', icon: 'party-popper', group: 'lifestyle' },
  { id: 'compras', name: 'Compras', type: 'expense', color: '#8a6d3b', icon: 'shopping-bag', group: 'lifestyle' },
  { id: 'assinaturas', name: 'Assinaturas', type: 'expense', color: '#6250d6', icon: 'tv', group: 'lifestyle' },
  { id: 'cuidados', name: 'Cuidados pessoais', type: 'expense', color: '#e87ba4', icon: 'sparkles', group: 'lifestyle' },
  { id: 'investimentos', name: 'Investimentos', type: 'expense', color: '#008300', icon: 'piggy-bank', group: 'future' },
  { id: 'dividas', name: 'Dívidas / Empréstimos', type: 'expense', color: '#e34948', icon: 'landmark', group: 'future' },
  { id: 'outros', name: 'Outros', type: 'expense', color: '#807f7a', icon: 'tag', group: 'lifestyle' },
]

export const defaultAccounts: Account[] = [
  { id: 'principal', name: 'Conta corrente', type: 'checking', initialBalance: 0, color: '#2a78d6' },
  { id: 'carteira', name: 'Carteira', type: 'wallet', initialBalance: 0, color: '#1baf7a' },
]

export const defaultSettings: Settings = {
  theme: 'system',
  userName: '',
  hideValues: false,
  savingsTarget: 20,
  forecastMonths: 12,
  onboarded: false,
}

export const ACCOUNT_TYPE_LABEL = {
  checking: 'Conta corrente',
  savings: 'Poupança',
  wallet: 'Carteira / Dinheiro',
  investment: 'Investimentos',
  credit: 'Cartão de crédito',
} as const
