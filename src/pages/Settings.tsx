import { useRef, useState } from 'react'
import { Database, Download, RotateCcw, Sparkles, Upload } from 'lucide-react'
import { useData, useStore } from '../store/useStore'
import { exportBackup, exportCSV, readBackup } from '../lib/io'
import { CardHeader, Field, PageHeader, Segmented, useConfirm } from '../components/ui'
import type { ThemePref } from '../types'

export default function SettingsPage() {
  const data = useData()
  const { setSettings, importData, loadDemo, reset } = useStore()
  const [confirm, confirmEl] = useConfirm()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const s = data.settings

  const onImport = async (f?: File) => {
    if (!f) return
    try {
      const d = await readBackup(f)
      const ok = await confirm({ title: 'Restaurar backup?', message: `${d.transactions?.length ?? 0} lançamentos serão carregados. Os dados atuais serão substituídos.`, confirmLabel: 'Restaurar' })
      if (ok) {
        importData(d)
        setMsg({ ok: true, text: 'Backup restaurado com sucesso.' })
      }
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message })
    } finally {
      if (file.current) file.current.value = ''
    }
  }

  return (
    <div className="animate-in space-y-6">
      <PageHeader title="Configurações" />

      <div className="card">
        <CardHeader title="Preferências" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Seu nome"><input className="input" value={s.userName} onChange={(e) => setSettings({ userName: e.target.value })} /></Field>
          <Field label="Tema">
            <div><Segmented value={s.theme} onChange={(theme: ThemePref) => setSettings({ theme })} options={[{ value: 'system', label: 'Sistema' }, { value: 'light', label: 'Claro' }, { value: 'dark', label: 'Escuro' }]} /></div>
          </Field>
          <Field label={`Meta de poupança: ${s.savingsTarget}% da renda`} hint="Usada no cálculo de “Quanto posso gastar” e nos alertas.">
            <input type="range" min={0} max={50} step={5} value={s.savingsTarget} onChange={(e) => setSettings({ savingsTarget: Number(e.target.value) })} className="w-full accent-[rgb(var(--brand))]" />
          </Field>
          <Field label="Privacidade">
            <label className="flex h-10 items-center gap-2 text-sm"><input type="checkbox" checked={s.hideValues} onChange={(e) => setSettings({ hideValues: e.target.checked })} className="accent-[rgb(var(--brand))]" /> Ocultar valores na tela</label>
          </Field>
        </div>
      </div>

      <div className="card">
        <CardHeader title="Backup e dados" subtitle="Os dados ficam no armazenamento local deste navegador. Exporte regularmente para não perder nada." />
        <div className="flex flex-wrap gap-2 p-5">
          <button className="btn-primary" onClick={() => exportBackup(data)}><Download size={16} /> Exportar backup (.json)</button>
          <button className="btn-outline" onClick={() => file.current?.click()}><Upload size={16} /> Restaurar backup</button>
          <button className="btn-outline" onClick={() => exportCSV([...data.transactions].sort((a, b) => a.date.localeCompare(b.date)), data)}><Database size={16} /> Exportar lançamentos (.csv)</button>
          <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onImport(e.target.files?.[0])} />
        </div>
        {msg && <p className={`mx-5 mb-5 rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-good/10 text-good' : 'bg-bad/10 text-bad'}`}>{msg.text}</p>}
      </div>

      <div className="card border-bad/30">
        <CardHeader title="Zona de risco" />
        <div className="flex flex-wrap gap-2 p-5">
          <button
            className="btn-outline"
            onClick={async () => (await confirm({ title: 'Carregar dados de exemplo?', message: 'Todos os seus dados atuais serão substituídos por dados fictícios. Exporte um backup antes se quiser guardá-los.', confirmLabel: 'Carregar exemplo', danger: true })) && loadDemo()}
          >
            <Sparkles size={16} /> Carregar dados de exemplo
          </button>
          <button
            className="btn-danger"
            onClick={async () => (await confirm({ title: 'Apagar tudo?', message: 'Todos os lançamentos, contas, metas e orçamentos serão apagados permanentemente.', confirmLabel: 'Apagar tudo', danger: true })) && reset()}
          >
            <RotateCcw size={16} /> Apagar todos os dados
          </button>
        </div>
      </div>
      {confirmEl}
    </div>
  )
}
