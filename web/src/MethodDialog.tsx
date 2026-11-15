import { useEffect, useRef } from 'react'

// Diálogo "Fuentes y método" (idea y textos de Eze, c891b87). <dialog> nativo: Escape cierra y el foco queda adentro.
export default function MethodDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (open) ref.current?.showModal()
    else ref.current?.close()
  }, [open])

  return (
    <dialog ref={ref} onCancel={onClose} onClose={onClose} aria-labelledby="method-title"
      className="m-auto max-h-[85vh] w-[min(640px,92vw)] overflow-y-auto rounded-2xl border border-pressed bg-canvas p-6 text-ink shadow-card backdrop:bg-black/60">
      <header className="mb-4 flex items-center justify-between gap-4">
        <h2 id="method-title" className="text-xl leading-7 font-bold tracking-tight">Fuentes y método</h2>
        <button type="button" autoFocus onClick={onClose} className="btn-secondary h-9">Cerrar</button>
      </header>
      <div className="flex flex-col gap-3 text-sm leading-5 text-body">
        <p>TerraLunar busca analogías parciales para preparar ensayos. Ningún lugar terrestre reproduce la gravedad, la atmósfera o la radiación de otro cuerpo.</p>
        <h3 className="label-mono mt-2 text-ink">Catálogo terrestre</h3>
        <p>Cada variable se convierte en una nota de 0 a 1 con una función difusa (trapecio) según lo que pide el sitio lunar. El puntaje es el promedio ponderado <span className="metric">S = Σ wᵢ · notaᵢ / Σ wᵢ</span>. Los puntajes actuales del catálogo son de prueba: no son resultados científicos definitivos.</p>
        <h3 className="label-mono mt-2 text-ink">Luna y Marte</h3>
        <p>Comparación de pendiente, rugosidad y desnivel en ventanas de 20 × 20 km con tolerancias provisorias. Luna: cobertura del polo sur (LRO LOLA). Marte: comparación regional a 2 km por celda (MOLA). Los pesos del catálogo terrestre no se aplican a estas comparaciones. La imagen de fondo puede tener otra resolución que la del análisis.</p>
        <ul className="flex flex-col gap-1 font-mono text-xs">
          <li><a className="underline" href="https://pds-geosciences.wustl.edu/missions/lro/lola.htm" target="_blank" rel="noreferrer">NASA PDS · LRO LOLA ↗</a></li>
          <li><a className="underline" href="https://pds-geosciences.wustl.edu/missions/mgs/megdr.html" target="_blank" rel="noreferrer">NASA PDS · MGS MOLA ↗</a></li>
          <li><a className="underline" href="https://trek.nasa.gov/mars/" target="_blank" rel="noreferrer">NASA Mars Trek · Viking / THEMIS ↗</a></li>
          <li><a className="underline" href="https://worldview.earthdata.nasa.gov/" target="_blank" rel="noreferrer">NASA Worldview ↗</a></li>
        </ul>
        <p>Las fichas y el comparador detallan las fuentes de cada recorte. Un puntaje expresa ajuste al método, no probabilidad de aptitud.</p>
      </div>
    </dialog>
  )
}
