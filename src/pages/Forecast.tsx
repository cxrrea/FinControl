import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { useData, useStore } from '../store/useStore'
import { avgVariableExpense, balanceHistory, forecast, totalBalance } from '../lib/finance'
import { addMonthsKey, currentMonth, monthRange } from '../lib/dates'
import { fmtMonth, fmtMonthShort, money } from '../lib/format'
import { CardHeader, Money, MoneyInput, PageHeader, Segmented } from '../components/ui'
import { BalanceChart } from '../components/charts/BalanceChart'

export default function Forecast() {
  const data = useData()
  const setSettings = useStore((s) => s.setSettings)
  const horizon = data.settings.forecastMonths
  const [cut, setCut] = useState(0)
  const [extraIncome, setExtraIncome] = useState(0)
  const [extraSaving, setExtraSaving] = useState(0)
  const simulating = cut > 0 || extraIncome > 0 || extraSaving > 0

  const base = useMemo(() => forecast(data, horizon), [data, horizon])
  const scen = useMemo(() => forecast(data, horizon, { variableCut: cut / 100, extraIncome, extraSaving }), [data, horizon, cut, extraIncome, extraSaving])
  const avgVar = avgVariableExpense(data.transactions)
  const balance = totalBalance(data.accounts, data.transactions)

  const series = useMemo(() => {
    const cur = currentMonth()
    const hist = balanceHistory(data, monthRange(addMonthsKey(cur, -6), addMonthsKey(cur, -1)))
    return [
      ...hist.map((h) => ({ month: h.month, real: h.balance })),
      { month: cur, real: balance, projected: balance, scenario: simulating ? balance : undefined },
      ...base.slice(1).map((f, i) => ({ month: f.month, projected: f.closing, scenario: simulating ? scen[i + 1].closing : undefined })),
    ]
  }, [data, base, scen, balance, simulating])

  const end = base[base.length - 1]
  const endScen = scen[scen.length - 1]
  const lowest = base.reduce((m, f) => (f.closing < m.closing ? f : m), base[0])
  const negative = base.find((f) => f.closing < 0)
  // economia acumulada no cenário + o que for poupado/investido
  const gain = endScen.closing + extraSaving * horizon - end.closing

  return (
    <div className="animate-in">
      <PageHeader
        title="Previsão"
        subtitle="Para onde seu saldo vai se nada mudar — e o que acontece se você mudar"
        actions={
          <Segmented
            value={String(horizon)}
            onChange={(v) => setSettings({ forecastMonths: Number(v) })}
            options={[{ value: '6', label: '6 meses' }, { value: '12', label: '12 meses' }, { value: '24', label: '24 meses' }]}
          />
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card p-4"><div className="text-xs text-muted">Saldo hoje</div><Money value={balance} className="text-xl font-semibold" /></div>
        <div className="card p-4">
          <div className="text-xs text-muted">Saldo em {fmtMonthShort(end.month)}</div>
          <Money value={end.closing} className={clsx('text-xl font-semibold', end.closing < 0 && 'text-bad')} />
          <div className="text-xs text-faint">no ritmo atual</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">Menor saldo previsto</div>
          <Money value={lowest.closing} className={clsx('text-xl font-semibold', lowest.closing < 0 && 'text-bad')} />
          <div className="text-xs text-faint">em {fmtMonth(lowest.month)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">Gasto variável médio</div>
          <Money value={avgVar} className="text-xl font-semibold" />
          <div className="text-xs text-faint">por mês (últimos 3 meses)</div>
        </div>
      </div>

      {negative && (
        <div className="mb-6 rounded-2xl border border-bad/30 bg-bad/10 p-4 text-sm">
          <strong className="text-bad">Atenção:</strong> mantendo o padrão atual, seu saldo fica negativo em <strong>{fmtMonth(negative.month)}</strong>. Use o simulador abaixo para encontrar quanto precisa cortar.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <CardHeader title="Saldo projetado" subtitle="Realizado nos últimos 6 meses + projeção" />
          <div className="pt-3"><BalanceChart data={series} height={320} showScenario={simulating} /></div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold">Simulador</h3>
          <p className="mb-5 text-xs text-muted">Teste mudanças de hábito e veja o impacto</p>
          <div className="space-y-5">
            <div>
              <div className="mb-1 flex justify-between text-sm"><span>Cortar gastos variáveis</span><span className="num font-semibold">{cut}%</span></div>
              <input type="range" min={0} max={60} step={5} value={cut} onChange={(e) => setCut(Number(e.target.value))} className="w-full accent-[rgb(var(--brand))]" />
              <p className="text-xs text-faint">≈ {money((avgVar * cut) / 100)} a menos por mês (mercado, delivery, lazer, compras…)</p>
            </div>
            <div>
              <span className="label">Renda extra mensal</span>
              <MoneyInput value={extraIncome} onChange={setExtraIncome} />
            </div>
            <div>
              <span className="label">Investir todo mês</span>
              <MoneyInput value={extraSaving} onChange={setExtraSaving} />
              <p className="mt-1 text-xs text-faint">Sai do saldo, mas vira patrimônio guardado.</p>
            </div>
            {simulating && (
              <div className="rounded-xl bg-good/10 p-3 text-sm">
                Em {horizon} meses você teria <strong className="num">{money(gain)}</strong> a mais
                {extraSaving > 0 && <> (incluindo <span className="num">{money(extraSaving * horizon)}</span> investidos)</>}.
              </div>
            )}
            {simulating && (
              <button className="btn-ghost w-full" onClick={() => { setCut(0); setExtraIncome(0); setExtraSaving(0) }}>Limpar simulação</button>
            )}
          </div>
        </div>
      </div>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="px-5 py-3 font-medium">Mês</th>
              <th className="px-3 py-3 text-right font-medium">Saldo inicial</th>
              <th className="px-3 py-3 text-right font-medium">Entradas</th>
              <th className="px-3 py-3 text-right font-medium">Contas e parcelas</th>
              <th className="px-3 py-3 text-right font-medium">Variáveis (estim.)</th>
              <th className="px-3 py-3 text-right font-medium">Resultado</th>
              <th className="px-5 py-3 text-right font-medium">Saldo final</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(simulating ? scen : base).map((f) => (
              <tr key={f.month} className="hover:bg-surface-2/60">
                <td className="px-5 py-2.5 font-medium">{fmtMonth(f.month)}</td>
                <td className="px-3 py-2.5 text-right"><Money value={f.opening} className="text-muted" /></td>
                <td className="px-3 py-2.5 text-right"><Money value={f.income} className="text-income" /></td>
                <td className="px-3 py-2.5 text-right"><Money value={-f.fixedExpense} /></td>
                <td className="px-3 py-2.5 text-right"><Money value={-f.variableExpense} /></td>
                <td className="px-3 py-2.5 text-right"><Money value={f.net} colored sign /></td>
                <td className="px-5 py-2.5 text-right font-semibold"><Money value={f.closing} className={clsx(f.closing < 0 && 'text-bad')} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-line px-5 py-3 text-xs text-faint">
          {simulating ? 'Mostrando o cenário simulado. ' : ''}A previsão considera contas pendentes, parcelas, recorrências ativas e a média dos seus gastos variáveis. Receitas avulsas não entram — a projeção é conservadora.
        </p>
      </div>
    </div>
  )
}
