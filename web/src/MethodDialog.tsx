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
        <h3 className="label-mono mt-2 text-ink">Análisis activo</h3>
        <p>La búsqueda compara relieve medido en ventanas de 20 × 20 km, con celdas de 2 km. Cada variable recibe un ajuste máximo de 1 que disminuye con la diferencia respecto del destino, usando tolerancias provisorias. El índice es la suma ponderada normalizada de esos ajustes.</p>
        <p>La ejecución conserva destino, ensayo, pesos, filtros, fuentes y resultados al pasar al mapa y al comparador. Los ensayos distintos de topografía solo tienen preselección del entorno; todavía no se calcula su compatibilidad integral.</p>
        <p>La imagen y la malla pueden tener una resolución distinta de la usada para calcular. La cobertura es discontinua: catálogo de referencia y ventanas procesadas. La cobertura terrestre es un filtro opcional y la geología es contexto, no puntajes mineralógicos.</p>
        <ul className="flex flex-col gap-1 font-mono text-xs">
          <li><a className="underline" href="https://pds-geosciences.wustl.edu/missions/lro/lola.htm" target="_blank" rel="noreferrer">NASA PDS · LRO LOLA</a></li>
          <li><a className="underline" href="https://pds-geosciences.wustl.edu/missions/mgs/megdr.html" target="_blank" rel="noreferrer">NASA PDS · MGS MOLA</a></li>
          <li><a className="underline" href="https://trek.nasa.gov/mars/" target="_blank" rel="noreferrer">NASA Mars Trek · Viking / THEMIS</a></li>
          <li><a className="underline" href="https://worldview.earthdata.nasa.gov/" target="_blank" rel="noreferrer">NASA Worldview</a></li>
        </ul>
        <p>Las fichas y el comparador detallan las fuentes de cada recorte. Un puntaje expresa ajuste al método, no probabilidad de aptitud.</p>
      </div>
    </dialog>
  )
}
