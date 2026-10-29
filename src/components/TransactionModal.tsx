import { useEffect, useMemo, useState } from 'react'
import { Repeat, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { Field, Modal, MoneyInput, Segmented, useConfirm } from './ui'
import { todayISO } from '../lib/dates'
import { money, uid } from '../lib/format'
import type { Frequency, Transaction, TxType } from '../types'

export function TransactionModal() {
  const { txModal, closeTx } = useUI()
  return txModal.open ? <TransactionForm key={txModal.editing?.id ?? 'new'} editing={txModal.editing} defaults={txModal.defaults} onClose={closeTx} /> : null
}

function TransactionForm({ editing, defaults, onClose }: { editing?: Transaction; defaults?: Partial<Transaction>; onClose: () => void }) {
  const s = useStore()
  const [confirm, confirmEl] = useConfirm()
  const today = todayISO()
  const init = editing ?? defaults ?? {}

  const [type, setType] = useState<TxType>(init.type ?? 'expense')
  const [amount, setAmount] = useState(init.amount ?? 0)
  const [description, setDescription] = useState(init.description ?? '')
  const [date, setDate] = useState(init.date ?? today)
  const [categoryId, setCategoryId] = useState(init.categoryId ?? '')
  const [accountId, setAccountId] = useState(init.accountId ?? s.accounts.find((a) => !a.archived)?.id ?? '')
  const [toAccountId, setToAccountId] = useState(init.toAccountId ?? '')
  const [paid, setPaid] = useState(init.status ? init.status === 'paid' : (init.date ?? today) <= today)
  const [notes, setNotes] = useState(init.notes ?? '')
  const [mode, setMode] = useState<'single' | 'installments' | 'recurring'>('single')
  const [installments, setInstallments] = useState(2)
  const [frequency, setFrequency] = useState<Frequency>('monthly')
  const [scope, setScope] = useState<'one' | 'future'>('one')
  const [error, setError] = useState('')

  const inSeries = !!(editing?.installment || editing?.recurringId)
  const cats = s.categories.filter((c) => c.type === (type === 'income' ? 'income' : 'expense'))
  const accounts = s.accounts.filter((a) => !a.archived || a.id === accountId)

  // sugestões de descrição a partir do histórico (com a última categoria usada)
  const suggestions = useMemo(() => {
    const map = new Map<string, Transaction>()
    for (const t of s.transactions) if (t.type === type) map.set(t.description, t)
    return map
  }, [s.transactions, type])

  useEffect(() => {
    if (categoryId && !cats.some((c) => c.id === categoryId)) setCategoryId('')
  }, [type]) // eslint-disable-line react-hooks/exhaustive-deps

  const onDescription = (v: string) => {
    setDescription(v)
    const prev = suggestions.get(v)
    if (prev && !editing) {
      if (prev.categoryId) setCategoryId(prev.categoryId)
      if (!amount) setAmount(prev.amount)
      setAccountId(prev.accountId)
    }
  }

  const save = () => {
    if (amount <= 0) return setError('Informe um valor maior que zero.')
    if (!description.trim()) return setError('Informe uma descrição.')
    if (!accountId) return setError('Selecione uma conta.')
    if (type === 'transfer' && (!toAccountId || toAccountId === accountId)) return setError('Escolha uma conta de destino diferente.')

    const base = {
      type,
      amount,
      description: description.trim(),
      date,
      status: paid ? ('paid' as const) : ('pending' as const),
      paidDate: paid ? (editing?.paidDate && editing.status === 'paid' ? editing.paidDate : date <= today ? date : today) : undefined,
      categoryId: type === 'transfer' ? undefined : categoryId || undefined,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      notes: notes.trim() || undefined,
    }

    if (editing) {
      s.updateTransaction(editing.id, base, scope)
    } else if (mode === 'recurring' && type !== 'transfer') {
      s.upsertRecurring({
        id: uid(), type, description: base.description, amount, categoryId: base.categoryId, accountId, frequency,
        startDate: date, autoPay: false, active: true,
      })
      // a primeira ocorrência herda o status escolhido
      if (paid) {
        const st = useStore.getState()
        const first = st.transactions.find((t) => t.description === base.description && t.date === date && t.recurringId)
        if (first && first.status !== 'paid') st.togglePaid(first.id)
      }
    } else {
      s.addTransaction(base, mode === 'installments' ? installments : 1)
    }
    onClose()
  }

  const remove = async () => {
    if (!editing) return
    const ok = await confirm({ title: 'Excluir lançamento?', message: inSeries && scope === 'future' ? 'Este e os próximos lançamentos pendentes da série serão excluídos.' : `"${editing.description}" será excluído.`, confirmLabel: 'Excluir', danger: true })
    if (!ok) return
    s.deleteTransaction(editing.id, scope)
    onClose()
  }

  const typeColor = type === 'income' ? 'text-income' : type === 'expense' ? 'text-expense' : 'text-brand'

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Editar lançamento' : 'Novo lançamento'}
      footer={
        <>
          {editing && (
            <button className="btn-ghost mr-auto text-bad hover:text-bad" onClick={remove}>
              <Trash2 size={16} /> Excluir
            </button>
          )}
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={save}>Salvar</button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save() }}>
        <div className="flex justify-center">
          <Segmented
            value={type}
            onChange={setType}
            options={[
              { value: 'expense', label: 'Despesa' },
              { value: 'income', label: 'Receita' },
              { value: 'transfer', label: 'Transferência' },
            ]}
          />
        </div>

        <div className={clsx('text-center', typeColor)}>
          <label className="label text-center" htmlFor="amount">Valor{mode === 'installments' ? ' total' : ''}</label>
          <div className="mx-auto max-w-[220px] [&_input]:h-12 [&_input]:text-center [&_input]:text-xl [&_input]:font-semibold">
            <MoneyInput id="amount" value={amount} onChange={setAmount} autoFocus={!editing} />
          </div>
        </div>

        <Field label="Descrição">
          <input className="input" list="desc-suggestions" value={description} onChange={(e) => onDescription(e.target.value)} placeholder={type === 'income' ? 'Ex.: Salário' : 'Ex.: Mercado'} />
          <datalist id="desc-suggestions">
            {[...suggestions.keys()].slice(-200).map((d) => <option key={d} value={d} />)}
          </datalist>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={paid ? 'Data' : 'Vencimento'}>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          {type !== 'transfer' ? (
            <Field label="Categoria">
              <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Sem categoria</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          ) : (
            <div />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={type === 'transfer' ? 'De' : 'Conta'}>
            <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          {type === 'transfer' ? (
            <Field label="Para">
              <select className="input" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
                <option value="">Selecione…</option>
                {accounts.filter((a) => a.id !== accountId).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
          ) : (
            <Field label="Situação">
              <Segmented
                value={paid ? 'paid' : 'pending'}
                onChange={(v) => setPaid(v === 'paid')}
                options={[
                  { value: 'paid', label: type === 'income' ? 'Recebido' : 'Pago' },
                  { value: 'pending', label: 'Pendente' },
                ]}
              />
            </Field>
          )}
        </div>

        {!editing && type !== 'transfer' && (
          <div className="rounded-xl border border-line p-3">
            <Segmented
              size="sm"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'single', label: 'Única' },
                ...(type === 'expense' ? [{ value: 'installments' as const, label: 'Parcelada' }] : []),
                { value: 'recurring', label: 'Fixa / recorrente' },
              ]}
            />
            {mode === 'installments' && (
              <div className="mt-3 flex items-center gap-3">
                <input type="number" min={2} max={72} className="input w-24" value={installments} onChange={(e) => setInstallments(Math.max(2, Math.min(72, Number(e.target.value) || 2)))} />
                <span className="text-sm text-muted">parcelas de <strong className="num text-ink">{money(amount / installments)}</strong> (uma por mês)</span>
              </div>
            )}
            {mode === 'recurring' && (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
                <Repeat size={16} />
                Repetir
                <select className="input w-auto" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
                  <option value="monthly">todo mês</option>
                  <option value="weekly">toda semana</option>
                  <option value="yearly">todo ano</option>
                </select>
                <span className="w-full text-xs text-faint">Os próximos lançamentos aparecem automaticamente em Contas a pagar/receber. Gerencie em Recorrentes.</span>
              </div>
            )}
          </div>
        )}

        {editing && inSeries && (
          <div className="rounded-xl border border-line p-3 text-sm">
            <p className="mb-2 text-muted">
              {editing.installment ? `Parcela ${editing.installment.number} de ${editing.installment.total}.` : 'Lançamento de uma recorrência.'} Aplicar alterações em:
            </p>
            <Segmented size="sm" value={scope} onChange={setScope} options={[{ value: 'one', label: 'Somente este' }, { value: 'future', label: 'Este e os próximos' }]} />
          </div>
        )}

        <Field label="Observações (opcional)">
          <textarea className="input h-auto min-h-[64px] py-2" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        {error && <p className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}
        <button type="submit" className="hidden" />
      </form>
      {confirmEl}
    </Modal>
  )
}
