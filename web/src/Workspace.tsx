import { useState, type ReactNode } from 'react'

export default function Workspace({ mission }: { mission: ReactNode }) {
  const [atlas, setAtlas] = useState(false)
  return (
    <div className="flex h-full min-h-0 flex-col">
      <nav aria-label="Vistas de TerraLunar" className="flex flex-wrap gap-2 border-b border-slate-800 bg-slate-950 px-4 py-2">
        {['Perfiles de misión', 'Explorar un punto'].map((label, index) => (
          <button key={label} type="button" aria-pressed={atlas === Boolean(index)}
            className="rounded-md px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800 aria-pressed:bg-amber-400/15 aria-pressed:text-amber-200"
            onClick={() => setAtlas(Boolean(index))}>{label}</button>
        ))}
      </nav>
      <div className={atlas ? 'hidden' : 'min-h-0 flex-1'}>{mission}</div>
      {atlas && <iframe title="Explorador global de Marte, Luna y Tierra"
        className="w-full min-h-0 flex-1 border-0" src={`${import.meta.env.BASE_URL}explorador/atlas.html`} />}
    </div>
  )
}
