import { create } from 'zustand'
import type { Transaction } from '../types'

interface UIState {
  txModal: { open: boolean; editing?: Transaction; defaults?: Partial<Transaction> }
  openNewTx: (defaults?: Partial<Transaction>) => void
  openEditTx: (t: Transaction) => void
  closeTx: () => void
}

export const useUI = create<UIState>((set) => ({
  txModal: { open: false },
  openNewTx: (defaults) => set({ txModal: { open: true, defaults } }),
  openEditTx: (t) => set({ txModal: { open: true, editing: t } }),
  closeTx: () => set({ txModal: { open: false } }),
}))
