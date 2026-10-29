import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, Plus, Search, SearchX } from 'lucide-react'
import { useData } from '../store/useStore'
import { useUI } from '../store/useUI'
import { currentMonth, monthKey } from '../lib/dates'
import { fmtDate } from '../lib/format'
import { Empty, Money, MonthPicker, PageHeader, Segmented } from '../components/ui'
import { TxRow } from '../components/TxRow'
import { exportCSV } from '../lib/io'

export default function Transactions() {
  const data = useData()
  const openNewTx = useUI((s) => s.openNewTx)
  const [params] = useSearchParams()
  const [month, setMonth] = useState(params.get('mes') ?? currentMonth())
  const [allTime, setAllTime] = useState(false)
  const [type, setType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all')
  const [status, setStatus] = useState<'all' | 'paid' | 'pending'>('all')
  const [cat, setCat] = useState(params.get('cat') ?? '')
  const [acc, setAcc] = useState('')
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    const query = q.trim().toLowerCase()
    return data.transactions
      .filter((t) => (allTime || monthKey(t.date) === month) && (type === 'all' || t.type === type) && (status === 'all' || t.status === status))
      .filter((t) => (!cat || t.categoryId === cat) && (!acc || t.accountId === acc || t.toAccountId === acc))
      .filter((t) => !query || t.description.toLowerCase().includes(query) || t.notes?.toLowerCase().includes(query) || String(t.amount).includes(query))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  }, [data.transactions, month, allTime, type, status, cat, acc, q])

  const totals = useMemo(() => {
    let inc = 0, exp = 0
    for (const t of list) {
      if (t.type === 'income') inc += t.amount
      else if (t.type === 'expense') exp += t.amount
    }
    return { inc, exp, net: inc - exp }
  }, [list])

  const groups = useMemo(() => {
    const map = new Map<string, typeof list>()
    for (const t of list) map.set(t.date, [...(map.get(t.date) ?? []), t])
    return [...map.entries()]
  }, [list])

  const clear = () => { setType('all'); setStatus('all'); setCat(''); setAcc(''); setQ('') }
  const filtered = type !== 'all' || status !== 'all' || cat || acc || q

  return (
    <div className="animate-in">
      <PageHeader
        title="Lançamentos"
        subtitle="Todas as receitas, despesas e transferências"
        actions={
          <>
            <button className="btn-outline" onClick={() => exportCSV(list, data)}><Download size={16} /> CSV</button>
            <button className="btn-primary" onClick={() => openNewTx()}><Plus size={16} /> Novo</button>
          </>
        }
      />

      <div className="card mb-4 space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {!allTime && <MonthPicker value={month} onChange={setMonth} />}
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={allTime} onChange={(e) => setAllTime(e.target.checked)} className="accent-[rgb(var(--brand))]" />
            Todos os períodos
          </label>
          <div className="relative ml-auto w-full sm:w-64">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input className="input pl-9" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented size="sm" value={type} onChange={setType} options={[{ value: 'all', label: 'Tudo' }, { value: 'expense', label: 'Despesas' }, { value: 'income', label: 'Receitas' }, { value: 'transfer', label: 'Transf.' }]} />
          <Segmented size="sm" value={status} onChange={setStatus} options={[{ value: 'all', label: 'Todos' }, { value: 'paid', label: 'Pagos' }, { value: 'pending', label: 'Pendentes' }]} />
          <select className="input h-8 w-auto text-xs" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Todas as categorias</option>
            {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="input h-8 w-auto text-xs" value={acc} onChange={(e) => setAcc(e.target.value)}>
            <option value="">Todas as contas</option>
            {data.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {filtered && <button className="text-xs font-medium text-brand" onClick={clear}>Limpar filtros</button>}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="card px-4 py-3"><div className="text-xs text-muted">Receitas</div><Money value={totals.inc} className="font-semibold text-income" /></div>
        <div className="card px-4 py-3"><div className="text-xs text-muted">Despesas</div><Money value={totals.exp} className="font-semibold text-expense" /></div>
        <div className="card px-4 py-3"><div className="text-xs text-muted">Resultado</div><Money value={totals.net} className="font-semibold" colored /></div>
      </div>

      <div className="card overflow-hidden">
        {groups.length ? (
          groups.map(([date, items]) => (
            <div key={date}>
              <div className="sticky top-16 z-10 border-b border-line bg-surface-2/90 px-5 py-1.5 text-xs font-medium text-muted backdrop-blur">
                {fmtDate(date, "EEEE, dd 'de' MMMM 'de' yyyy")}
              </div>
              <div className="divide-y divide-line">
                {items.map((t) => <TxRow key={t.id} t={t} showDate={false} />)}
              </div>
            </div>
          ))
        ) : (
          <Empty icon={<SearchX size={28} />} title="Nenhum lançamento encontrado" action={<button className="btn-primary" onClick={() => openNewTx()}><Plus size={16} /> Novo lançamento</button>}>
            {filtered ? 'Tente ajustar os filtros.' : 'Registre receitas e despesas para acompanhar seu mês.'}
          </Empty>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-faint">{list.length} lançamento{list.length === 1 ? '' : 's'} · atalho <kbd className="rounded border border-line px-1">N</kbd> para novo</p>
    </div>
  )
}
