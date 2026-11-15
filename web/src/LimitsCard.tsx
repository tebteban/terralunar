// Tarjeta obligatoria "Límites de la analogía" (DESIGN.md, nivel 3): superficie oscura, siempre visible.
export default function LimitsCard({ items, title = 'Límites de la analogía' }: { items: string[][]; title?: string }) {
  return (
    <section className="limits-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2">
        <h3 className="text-sm font-bold tracking-wider uppercase">{title}</h3>
        <span className="hud rounded-full border border-dashed border-mute/60 px-2 py-0.5 text-pressed uppercase">Régimen no análogo</span>
      </div>
      <ul className="flex flex-col gap-2 text-[13px] leading-[18px] text-mute">
        {items.map(([name, text], i) => (
          <li key={name} className="flex gap-2">
            <span className="hud shrink-0 leading-[18px] font-bold text-canvas">LIM-{String(i + 1).padStart(2, '0')}</span>
            <span><strong className="font-semibold text-canvas">{name}:</strong> {text}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
