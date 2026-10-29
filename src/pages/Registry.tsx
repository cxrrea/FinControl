import { useState } from 'react'
import { Archive, Pencil, Plus, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useData, useStore } from '../store/useStore'
import { accountBalance, GROUP_LABEL } from '../lib/finance'
import { uid } from '../lib/format'
import { ACCOUNT_TYPE_LABEL, PALETTE } from '../data/defaults'
import { CardHeader, Field, Modal, Money, MoneyInput, PageHeader, Segmented, useConfirm } from '../components/ui'
import { IconBadge } from '../components/Icon'
import { IconColorPicker } from '../components/IconColorPicker'
import type { Account, AccountType, Category, CategoryGroup } from '../types'

export default function Registry() {
  const data = useData()
  const { deleteAccount, deleteCategory } = useStore()
  const [acc, setAcc] = useState<Account | null>(null)
  const [cat, setCat] = useState<Category | null>(null)
  const [catType, setCatType] = useState<'expense' | 'income'>('expense')
  const [confirm, confirmEl] = useConfirm()

  const removeAccount = async (a: Account) => {
    const used = data.transactions.some((t) => t.accountId === a.id || t.toAccountId === a.id) || data.recurring.some((r) => r.accountId === a.id)
    if (used) {
      const ok = await confirm({ title: 'Arquivar conta?', message: 'Esta conta tem lançamentos, então será arquivada (some das listas, mas o histórico é mantido).', confirmLabel: 'Arquivar' })
      if (ok) useStore.getState().upsertAccount({ ...a, archived: true })
      return
    }
    if (await confirm({ title: 'Excluir conta?', message: a.name, confirmLabel: 'Excluir', danger: true })) deleteAccount(a.id)
  }

  const removeCategory = async (c: Category) => {
    const n = data.transactions.filter((t) => t.categoryId === c.id).length
    const ok = await confirm({ title: 'Excluir categoria?', message: n ? `${n} lançamento(s) ficarão sem categoria.` : c.name, confirmLabel: 'Excluir', danger: true })
    if (ok) deleteCategory(c.id)
  }

  return (
    <div className="animate-in space-y-6">
      <PageHeader title="Carteiras e categorias" subtitle="Contas bancárias, cartões, dinheiro e como você classifica seus gastos" />

      <div className="card">
        <CardHeader
          title="Contas e carteiras"
          right={<button className="btn-outline h-8 text-xs" onClick={() => setAcc({ id: uid(), name: '', type: 'checking', initialBalance: 0, color: PALETTE[data.accounts.length % PALETTE.length] })}><Plus size={14} /> Nova conta</button>}
        />
        <div className="mt-3 divide-y divide-line">
          {data.accounts.map((a) => (
            <div key={a.id} className={clsx('flex items-center gap-3 px-5 py-3', a.archived && 'opacity-50')}>
              <span className="h-9 w-1.5 rounded-full" style={{ background: a.color }} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{a.name} {a.archived && <span className="chip bg-surface-2 text-muted"><Archive size={10} /> arquivada</span>}</div>
                <div className="text-xs text-muted">{ACCOUNT_TYPE_LABEL[a.type]}</div>
              </div>
              <Money value={accountBalance(a, data.transactions)} className="text-sm font-semibold" colored={accountBalance(a, data.transactions) < 0} />
              <button className="btn-icon" onClick={() => setAcc(a)} title="Editar"><Pencil size={16} /></button>
              <button className="btn-icon hover:text-bad" onClick={() => removeAccount(a)} title="Excluir"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <CardHeader
          title="Categorias"
          right={
            <div className="flex items-center gap-2">
              <Segmented size="sm" value={catType} onChange={setCatType} options={[{ value: 'expense', label: 'Despesas' }, { value: 'income', label: 'Receitas' }]} />
              <button className="btn-outline h-8 text-xs" onClick={() => setCat({ id: uid(), name: '', type: catType, color: PALETTE[0], icon: 'tag', group: catType === 'expense' ? 'lifestyle' : undefined })}><Plus size={14} /> Nova</button>
            </div>
          }
        />
        <div className="mt-3 grid gap-px bg-line sm:grid-cols-2">
          {data.categories.filter((c) => c.type === catType).map((c) => (
            <div key={c.id} className="flex items-center gap-3 bg-surface px-5 py-3">
              <IconBadge name={c.icon} color={c.color} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{c.name}</div>
                {c.group && <div className="text-xs text-muted">{GROUP_LABEL[c.group]}</div>}
              </div>
              <button className="btn-icon" onClick={() => setCat(c)} title="Editar"><Pencil size={16} /></button>
              <button className="btn-icon hover:text-bad" onClick={() => removeCategory(c)} title="Excluir"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>

      {acc && <AccountForm account={acc} onClose={() => setAcc(null)} />}
      {cat && <CategoryForm category={cat} onClose={() => setCat(null)} />}
      {confirmEl}
    </div>
  )
}

function AccountForm({ account, onClose }: { account: Account; onClose: () => void }) {
  const upsert = useStore((s) => s.upsertAccount)
  const [a, setA] = useState(account)
  const set = (p: Partial<Account>) => setA((x) => ({ ...x, ...p }))
  return (
    <Modal open onClose={onClose} title={account.name ? 'Editar conta' : 'Nova conta'} footer={<><button className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-primary" disabled={!a.name.trim()} onClick={() => { upsert({ ...a, name: a.name.trim() }); onClose() }}>Salvar</button></>}>
      <div className="space-y-4">
        <Field label="Nome"><input className="input" value={a.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ex.: Itaú, Nubank, Carteira" autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <select className="input" value={a.type} onChange={(e) => set({ type: e.target.value as AccountType })}>
              {Object.entries(ACCOUNT_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Saldo inicial" hint={a.type === 'credit' ? 'Fatura em aberto: use valor negativo' : undefined}>
            <MoneyInput value={a.initialBalance} onChange={(initialBalance) => set({ initialBalance })} />
          </Field>
        </div>
        {a.type === 'credit' && (
          <p className="rounded-xl bg-surface-2 p-3 text-xs text-muted">
            Lance as compras do cartão como despesas nesta conta. Ao pagar a fatura, registre uma <strong>transferência</strong> da conta corrente para o cartão — assim os gastos não são contados duas vezes.
          </p>
        )}
        <div>
          <span className="label">Cor</span>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((c) => (
              <button key={c} type="button" onClick={() => set({ color: c })} className="h-7 w-7 rounded-full" style={{ background: c, boxShadow: c === a.color ? `0 0 0 2px rgb(var(--surface)), 0 0 0 4px ${c}` : undefined }} aria-label={c} />
            ))}
          </div>
        </div>
        {account.archived && (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!a.archived} onChange={(e) => set({ archived: e.target.checked })} className="accent-[rgb(var(--brand))]" /> Arquivada</label>
        )}
      </div>
    </Modal>
  )
}

function CategoryForm({ category, onClose }: { category: Category; onClose: () => void }) {
  const upsert = useStore((s) => s.upsertCategory)
  const [c, setC] = useState(category)
  const set = (p: Partial<Category>) => setC((x) => ({ ...x, ...p }))
  return (
    <Modal open onClose={onClose} title={category.name ? 'Editar categoria' : 'Nova categoria'} footer={<><button className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-primary" disabled={!c.name.trim()} onClick={() => { upsert({ ...c, name: c.name.trim() }); onClose() }}>Salvar</button></>}>
      <div className="space-y-4">
        <Field label="Nome"><input className="input" value={c.name} onChange={(e) => set({ name: e.target.value })} autoFocus /></Field>
        {c.type === 'expense' && (
          <Field label="Grupo (regra 50/30/20)">
            <select className="input" value={c.group ?? 'lifestyle'} onChange={(e) => set({ group: e.target.value as CategoryGroup })}>
              {Object.entries(GROUP_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        )}
        <IconColorPicker icon={c.icon} color={c.color} onChange={set} />
      </div>
    </Modal>
  )
}
