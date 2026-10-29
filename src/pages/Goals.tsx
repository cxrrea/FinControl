import { useState } from 'react'
import { Pencil, Plus, Trash2, Trophy } from 'lucide-react'
import { differenceInCalendarMonths, parseISO } from 'date-fns'
import { useData, useStore } from '../store/useStore'
import { Empty, Field, Modal, Money, MoneyInput, PageHeader, useConfirm } from '../components/ui'
import { IconBadge } from '../components/Icon'
import { IconColorPicker } from '../components/IconColorPicker'
import { fmtDate, money, uid } from '../lib/format'
import { PALETTE } from '../data/defaults'
import type { Goal } from '../types'

function Ring({ value, color }: { value: number; color: string }) {
  const r = 34
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value))
  return (
    <svg width="84" height="84" viewBox="0 0 84 84" className="shrink-0">
      <circle cx="42" cy="42" r={r} fill="none" stroke="rgb(var(--surface-2))" strokeWidth="8" />
      <circle cx="42" cy="42" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform="rotate(-90 42 42)" style={{ transition: 'stroke-dashoffset .6s' }} />
      <text x="42" y="47" textAnchor="middle" className="fill-ink text-sm font-semibold">{Math.round(v * 100)}%</text>
    </svg>
  )
}

export default function Goals() {
  const data = useData()
  const { upsertGoal, deleteGoal } = useStore()
  const [editing, setEditing] = useState<Goal | null>(null)
  const [deposit, setDeposit] = useState<Goal | null>(null)
  const [confirm, confirmEl] = useConfirm()

  const blank = (): Goal => ({ id: uid(), name: '', target: 0, current: 0, color: PALETTE[data.goals.length % PALETTE.length], icon: 'target' })

  return (
    <div className="animate-in">
      <PageHeader title="Metas" subtitle="Reserva de emergência, viagem, troca de carro… dê um destino ao seu dinheiro" actions={<button className="btn-primary" onClick={() => setEditing(blank())}><Plus size={16} /> Nova meta</button>} />

      {data.goals.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.goals.map((g) => {
            const ratio = g.target ? g.current / g.target : 0
            const left = Math.max(0, g.target - g.current)
            const months = g.deadline ? Math.max(1, differenceInCalendarMonths(parseISO(g.deadline), new Date())) : null
            return (
              <div key={g.id} className="card flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <IconBadge name={g.icon} color={g.color} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{g.name}</h3>
                    {g.deadline && <p className="text-xs text-muted">até {fmtDate(g.deadline, "MMM 'de' yyyy")}</p>}
                  </div>
                  <button className="btn-icon" onClick={() => setEditing(g)} title="Editar"><Pencil size={16} /></button>
                  <button
                    className="btn-icon hover:text-bad"
                    title="Excluir"
                    onClick={async () => (await confirm({ title: 'Excluir meta?', message: g.name, confirmLabel: 'Excluir', danger: true })) && deleteGoal(g.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="my-4 flex items-center gap-4">
                  <Ring value={ratio} color={g.color} />
                  <div className="text-sm">
                    <Money value={g.current} className="block text-lg font-semibold" />
                    <span className="text-muted">de <Money value={g.target} /></span>
                  </div>
                </div>
                <div className="mt-auto rounded-xl bg-surface-2 px-3 py-2 text-xs text-muted">
                  {left <= 0 ? (
                    <span className="font-medium text-good">Meta atingida! 🎉</span>
                  ) : months ? (
                    <>Guarde <strong className="num text-ink">{money(left / months)}</strong>/mês por {months} {months === 1 ? 'mês' : 'meses'} para chegar lá.</>
                  ) : (
                    <>Faltam <strong className="num text-ink">{money(left)}</strong>.</>
                  )}
                </div>
                <button className="btn-outline mt-3" onClick={() => setDeposit(g)}><Plus size={16} /> Registrar aporte</button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card">
          <Empty icon={<Trophy size={28} />} title="Nenhuma meta ainda" action={<button className="btn-primary" onClick={() => setEditing(blank())}><Plus size={16} /> Criar meta</button>}>
            Comece pela reserva de emergência: o ideal é ter de 3 a 6 meses do seu custo de vida guardados.
          </Empty>
        </div>
      )}

      {editing && <GoalForm goal={editing} onClose={() => setEditing(null)} onSave={(g) => { upsertGoal(g); setEditing(null) }} />}
      {deposit && <DepositForm goal={deposit} onClose={() => setDeposit(null)} onSave={(v) => { upsertGoal({ ...deposit, current: Math.max(0, deposit.current + v) }); setDeposit(null) }} />}
      {confirmEl}
    </div>
  )
}

function GoalForm({ goal, onClose, onSave }: { goal: Goal; onClose: () => void; onSave: (g: Goal) => void }) {
  const [g, setG] = useState(goal)
  const set = (p: Partial<Goal>) => setG((x) => ({ ...x, ...p }))
  const valid = g.name.trim() && g.target > 0
  return (
    <Modal open onClose={onClose} title={goal.name ? 'Editar meta' : 'Nova meta'} footer={<><button className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-primary" disabled={!valid} onClick={() => onSave({ ...g, name: g.name.trim(), deadline: g.deadline || undefined })}>Salvar</button></>}>
      <div className="space-y-4">
        <Field label="Nome"><input className="input" value={g.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ex.: Reserva de emergência" autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor da meta"><MoneyInput value={g.target} onChange={(target) => set({ target })} /></Field>
          <Field label="Já guardado"><MoneyInput value={g.current} onChange={(current) => set({ current })} /></Field>
        </div>
        <Field label="Prazo (opcional)"><input type="date" className="input" value={g.deadline ?? ''} onChange={(e) => set({ deadline: e.target.value })} /></Field>
        <IconColorPicker icon={g.icon} color={g.color} onChange={set} />
      </div>
    </Modal>
  )
}

function DepositForm({ goal, onClose, onSave }: { goal: Goal; onClose: () => void; onSave: (v: number) => void }) {
  const [v, setV] = useState(0)
  const [withdraw, setWithdraw] = useState(false)
  return (
    <Modal open onClose={onClose} title={`Aporte — ${goal.name}`} footer={<><button className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-primary" disabled={v <= 0} onClick={() => onSave(withdraw ? -v : v)}>Confirmar</button></>}>
      <div className="space-y-3">
        <MoneyInput value={v} onChange={setV} autoFocus />
        <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={withdraw} onChange={(e) => setWithdraw(e.target.checked)} className="accent-[rgb(var(--brand))]" /> É uma retirada</label>
        <p className="text-xs text-faint">Dica: registre também uma transferência para a conta de investimento/poupança em Lançamentos, para o saldo refletir a movimentação.</p>
      </div>
    </Modal>
  )
}
