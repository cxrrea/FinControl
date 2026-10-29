import { useState } from 'react'
import { Sparkles, Wallet } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Field, MoneyInput } from '../components/ui'

export default function Welcome() {
  const { loadDemo, setSettings, upsertAccount, accounts } = useStore()
  const [name, setName] = useState('')
  const [balance, setBalance] = useState(0)
  const [savings, setSavings] = useState(20)

  const start = () => {
    const main = accounts[0]
    if (main) upsertAccount({ ...main, initialBalance: balance })
    setSettings({ userName: name.trim(), savingsTarget: savings, onboarded: true })
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="animate-in w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <img src="./favicon.svg" alt="" className="h-10 w-10" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">FinControl</h1>
            <p className="text-sm text-muted">Seu controle financeiro pessoal</p>
          </div>
        </div>
        <div className="card space-y-4 p-6">
          <p className="text-sm text-muted">
            Vamos começar. Tudo fica salvo apenas no seu navegador — nada é enviado para servidores.
          </p>
          <Field label="Como quer ser chamado(a)?">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" autoFocus />
          </Field>
          <Field label="Saldo atual da sua conta principal" hint="Você pode cadastrar outras contas e cartões depois.">
            <MoneyInput value={balance} onChange={setBalance} />
          </Field>
          <Field label={`Meta de poupança: ${savings}% da renda`} hint="Usada para calcular quanto você pode gastar por dia.">
            <input type="range" min={0} max={50} step={5} value={savings} onChange={(e) => setSavings(Number(e.target.value))} className="w-full accent-[rgb(var(--brand))]" />
          </Field>
          <button className="btn-primary w-full" onClick={start}>
            <Wallet size={18} /> Começar do zero
          </button>
          <div className="relative py-1 text-center text-xs text-faint">
            <span className="bg-surface px-2">ou</span>
            <div className="absolute inset-x-0 top-1/2 -z-0 border-t border-line" style={{ zIndex: -1 }} />
          </div>
          <button className="btn-outline w-full" onClick={loadDemo}>
            <Sparkles size={18} /> Explorar com dados de exemplo
          </button>
        </div>
      </div>
    </div>
  )
}
