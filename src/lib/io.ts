import type { Transaction } from '../types'
import type { AppData } from './finance'

function download(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const TYPE = { income: 'Receita', expense: 'Despesa', transfer: 'Transferência' }

export function exportCSV(list: Transaction[], data: AppData) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
  const rows = [
    ['Data', 'Tipo', 'Descrição', 'Categoria', 'Conta', 'Conta destino', 'Valor', 'Situação', 'Parcela', 'Observações'].join(';'),
    ...list.map((t) =>
      [
        t.date,
        TYPE[t.type],
        esc(t.description),
        esc(data.categories.find((c) => c.id === t.categoryId)?.name ?? ''),
        esc(data.accounts.find((a) => a.id === t.accountId)?.name ?? ''),
        esc(data.accounts.find((a) => a.id === t.toAccountId)?.name ?? ''),
        (t.type === 'expense' ? -t.amount : t.amount).toFixed(2).replace('.', ','),
        t.status === 'paid' ? 'Pago' : 'Pendente',
        t.installment ? `${t.installment.number}/${t.installment.total}` : '',
        esc(t.notes ?? ''),
      ].join(';'),
    ),
  ]
  download(`fincontrol-lancamentos-${new Date().toISOString().slice(0, 10)}.csv`, '﻿' + rows.join('\n'), 'text/csv;charset=utf-8')
}

export function exportBackup(data: AppData) {
  download(`fincontrol-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: 'fincontrol', version: 1, exportedAt: new Date().toISOString(), data }, null, 2), 'application/json')
}

export async function readBackup(file: File): Promise<Partial<AppData>> {
  const json = JSON.parse(await file.text())
  const d = json?.data ?? json
  if (!d || !Array.isArray(d.transactions) || !Array.isArray(d.accounts)) throw new Error('Arquivo inválido: não parece um backup do FinControl.')
  return d
}
