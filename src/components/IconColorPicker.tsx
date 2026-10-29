import { ICONS } from './Icon'
import { PALETTE } from '../data/defaults'

export function IconColorPicker({ icon, color, onChange }: { icon: string; color: string; onChange: (p: { icon?: string; color?: string }) => void }) {
  return (
    <>
      <div>
        <span className="label">Cor</span>
        <div className="flex flex-wrap gap-2">
          {PALETTE.map((c) => (
            <button key={c} type="button" onClick={() => onChange({ color: c })} className="h-7 w-7 rounded-full ring-offset-2 ring-offset-surface transition" style={{ background: c, boxShadow: c === color ? `0 0 0 2px rgb(var(--surface)), 0 0 0 4px ${c}` : undefined }} aria-label={c} />
          ))}
        </div>
      </div>
      <div>
        <span className="label">Ícone</span>
        <div className="grid grid-cols-9 gap-1">
          {Object.keys(ICONS).map((k) => (
            <button key={k} type="button" onClick={() => onChange({ icon: k })} className="flex aspect-square items-center justify-center rounded-lg border transition" style={k === icon ? { borderColor: color, background: color + '22', color } : { borderColor: 'transparent' }} title={k}>
              {(() => { const I = ICONS[k]; return <I size={16} /> })()}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
