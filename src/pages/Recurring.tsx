import { useState } from 'react'
import { Pause, Pencil, Play, Plus, Repeat, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useData, useStore } from '../store/useStore'
import { Empty, Field, Modal, Money, MoneyInput, PageHeader, Segmented, useConfirm } from '../components/ui'
import { IconBadge } from '../components/Icon'
import { todayISO } from '../lib/dates'
import { fmtDate, uid } from '../lib/format'
import { occurrences } from '../lib/recurring'
import type { Frequency, RecurringRule } from '../types'

const FREQ: Record<Frequency, string> = { monthly: 'Mensal', weekly: 'Semanal', yearly: 'Anual' }
const monthly = (r: RecurringRule) => (r.frequency === 'weekly' ? (r.amount * 52) / 12 : r.frequency === 'yearly' ? r.amount / 12 : r.amount)

function nextDate(r: RecurringRule) {
  const today = todayISO()
  const far = String(Number(today.slice(0, 4)) + 2) + today.slice(4)
  return occurrences(r, far).find((d) => d >= today)
}

export default function Recurring() {
  const data = useData()
  const { deleteRecurring, upsertRecurring } = useStore()
  const [editing, setEditing] = useState<RecurringRule | null>(null)
  const [confirm, confirmEl] = useConfirm()

  const inc = data.recurring.filter((r) => r.type === 'income')
  const exp = data.recurring.filter((r) => r.type === 'expense')
  const totalInc = inc.filter((r) => r.active).reduce((a, r) => a + monthly(r), 0)
  const totalExp = exp.filter((r) => r.active).reduce((a, r) => a + monthly(r), 0)

  const blank = (): RecurringRule => ({
    id: uid(), type: 'expense', description: '', amount: 0, accountId: data.accounts[0]?.id ?? '', frequency: 'monthly', startDate: todayISO(), autoPay: false, active: true,
  })

  const remove = async (r: RecurringRule) => {
    const ok = await confirm({ title: 'Excluir recorrência?', message: `"${r.description}" deixará de gerar lançamentos. Os lançamentos pendentes futuros também serão removidos; os já pagos ficam no histórico.`, confirmLabel: 'Excluir', danger: true })
    if (ok) deleteRecurring(r.id, true)
  }

  const Section = ({ title, rules }: { title: string; rules: RecurringRule[] }) => (
    <div className="card overflow-hidden">
      <div className="border-b border-line px-5 py-3 text-sm font-semibold">{title}</div>
      {rules.length ? (
        <div className="divide-y divide-line">
          {rules.map((r) => {
            const cat = data.categories.find((c) => c.id === r.categoryId)
            const acc = data.accounts.find((a) => a.id === r.accountId)
            const nd = r.active ? nextDate(r) : undefined
            return (
              <div key={r.id} className={clsx('flex items-center gap-3 px-5 py-3', !r.active && 'opacity-50')}>
                <IconBadge name={cat?.icon} color={cat?.color} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{r.description}</div>
                  <div className="truncate text-xs text-muted">
                    {FREQ[r.frequency]} · {acc?.name} {r.autoPay && '· débito automático'} · {r.active ? (nd ? `próxima em ${fmtDate(nd)}` : 'encerrada') : 'pausada'}
                  </div>
                </div>
                <Money value={r.amount} className={clsx('text-sm font-semibold', r.type === 'income' && 'text-income')} />
                <div className="flex">
                  <button className="btn-icon" title={r.active ? 'Pausar' : 'Reativar'} onClick={() => upsertRecurring({ ...r, active: !r.active })}>
                    {r.active ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button className="btn-icon" title="Editar" onClick={() => setEditing(r)}><Pencil size={16} /></button>
                  <button className="btn-icon hover:text-bad" title="Excluir" onClick={() => remove(r)}><Trash2 size={16} /></button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="px-5 py-6 text-sm text-muted">Nada cadastrado.</p>
      )}
    </div>
  )

  return (
    <div className="animate-in">
      <PageHeader
        title="Fixas e recorrentes"
        subtitle="Salário, aluguel, assinaturas… geram lançamentos automaticamente todo período"
        actions={<button className="btn-primary" onClick={() => setEditing(blank())}><Plus size={16} /> Nova recorrência</button>}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><div className="text-xs text-muted">Renda fixa / mês</div><Money value={totalInc} className="text-xl font-semibold text-income" /></div>
        <div className="card p-4"><div className="text-xs text-muted">Gastos fixos / mês</div><Money value={totalExp} className="text-xl font-semibold text-expense" /></div>
        <div className="card p-4">
          <div className="text-xs text-muted">Comprometimento da renda</div>
          <div className="text-xl font-semibold num">{totalInc > 0 ? Math.round((totalExp / totalInc) * 100) : 0}%</div>
          <div className="text-xs text-faint">Ideal: até 50–60% em gastos fixos</div>
        </div>
      </div>

      {data.recurring.length ? (
        <div className="space-y-4">
          <Section title="Despesas fixas" rules={exp} />
          <Section title="Receitas fixas" rules={inc} />
        </div>
      ) : (
        <div className="card">
          <Empty icon={<Repeat size={28} />} title="Nenhuma recorrência" action={<button className="btn-primary" onClick={() => setEditing(blank())}><Plus size={16} /> Cadastrar</button>}>
            Cadastre salário e contas fixas para o app prever seu saldo e lembrar dos vencimentos.
          </Empty>
        </div>
      )}

      {editing && <RuleForm rule={editing} isNew={!data.recurring.some((r) => r.id === editing.id)} onClose={() => setEditing(null)} />}
      {confirmEl}
    </div>
  )
}

function RuleForm({ rule, isNew, onClose }: { rule: RecurringRule; isNew: boolean; onClose: () => void }) {
  const { categories, accounts, upsertRecurring } = useStore()
  const [r, setR] = useState(rule)
  const [error, setError] = useState('')
  const set = (p: Partial<RecurringRule>) => setR((x) => ({ ...x, ...p }))
  const cats = categories.filter((c) => c.type === r.type)

  const save = () => {
    if (!r.description.trim()) return setError('Informe uma descrição.')
    if (r.amount <= 0) return setError('Informe um valor.')
    if (r.endDate && r.endDate < r.startDate) return setError('A data final deve ser depois do início.')
    upsertRecurring({ ...r, description: r.description.trim(), endDate: r.endDate || undefined })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={isNew ? 'Nova recorrência' : 'Editar recorrência'} footer={<><button className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save}>Salvar</button></>}>
      <div className="space-y-4">
        <Segmented value={r.type} onChange={(type) => set({ type, categoryId: undefined })} options={[{ value: 'expense', label: 'Despesa' }, { value: 'income', label: 'Receita' }]} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Descrição" className="col-span-2"><input className="input" value={r.description} onChange={(e) => set({ description: e.target.value })} placeholder="Ex.: Aluguel" autoFocus /></Field>
          <Field label="Valor"><MoneyInput value={r.amount} onChange={(amount) => set({ amount })} /></Field>
          <Field label="Frequência">
            <select className="input" value={r.frequency} onChange={(e) => set({ frequency: e.target.value as Frequency })}>
              {Object.entries(FREQ).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Categoria">
            <select className="input" value={r.categoryId ?? ''} onChange={(e) => set({ categoryId: e.target.value || undefined })}>
              <option value="">Sem categoria</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Conta">
            <select className="input" value={r.accountId} onChange={(e) => set({ accountId: e.target.value })}>
              {accounts.filter((a) => !a.archived).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="Primeiro vencimento" hint="O dia define o vencimento dos próximos"><input type="date" className="input" value={r.startDate} onChange={(e) => set({ startDate: e.target.value })} /></Field>
          <Field label="Termina em (opcional)"><input type="date" className="input" value={r.endDate ?? ''} onChange={(e) => set({ endDate: e.target.value })} /></Field>
        </div>
        <label className="flex items-start gap-3 rounded-xl border border-line p-3 text-sm">
          <input type="checkbox" className="mt-0.5 accent-[rgb(var(--brand))]" checked={r.autoPay} onChange={(e) => set({ autoPay: e.target.checked })} />
          <span>
            <span className="font-medium">Débito automático / cai sozinho</span>
            <span className="block text-xs text-muted">Marca como {r.type === 'income' ? 'recebido' : 'pago'} automaticamente na data. Desmarcado, aparece em Contas a pagar/receber até você confirmar.</span>
          </span>
        </label>
        {error && <p className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}
      </div>
    </Modal>
  )
}
