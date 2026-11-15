import { useState, type ReactNode } from 'react'

/**
 * Shared instrument sheet for Earth, Moon and Mars.
 * collapsible: arranca plegada como pestaña flotante y se despliega al tocarla (D-021).
 * openSignal: cuando cambia a un valor no vacío (p. ej. el usuario eligió un punto) la ficha se despliega sola.
 */
export default function SurfacePanel({ children, label, collapsible = false, openSignal, open: openProp, onOpenChange }: {
  children: ReactNode
  label: string
  collapsible?: boolean
  openSignal?: string
  /** Modo controlado: el padre decide si está abierta (p. ej. para recentrar el globo) */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [openState, setOpenState] = useState(!collapsible)
  const open = openProp ?? openState
  const setOpen = (v: boolean) => { setOpenState(v); onOpenChange?.(v) }
  // Si cambia la señal (nuevo punto elegido), desplegar: se ajusta durante el render, sin efecto
  const [lastSignal, setLastSignal] = useState(openSignal)
  if (openSignal !== lastSignal) {
    setLastSignal(openSignal)
    if (openSignal) setOpenState(true) // en modo controlado el padre maneja su propia señal
  }

  if (collapsible && !open) {
    return (
      <button type="button" onClick={() => setOpen(true)} aria-expanded={false}
        className="surface-tab rise-in absolute right-4 bottom-4 z-10 flex cursor-pointer items-center gap-3 rounded-full border border-pressed bg-canvas py-2.5 pr-3 pl-5 text-ink shadow-card transition-transform hover:-translate-y-0.5 lg:right-6 lg:bottom-auto lg:top-[7.5rem]">
        <span className="flex flex-col items-start leading-tight">
          <span className="text-sm font-semibold">{label}</span>
          <span className="text-xs text-body">Tocá para desplegar</span>
        </span>
        <span className="grid size-8 place-items-center rounded-full bg-ink text-canvas" aria-hidden="true">
          <svg viewBox="0 0 16 16" className="size-4"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </button>
    )
  }

  return (
    <aside aria-label={label} className="surface-panel rise-in absolute inset-x-2 bottom-2 z-10 flex max-h-[56%] min-w-0 flex-col gap-5 overflow-y-auto rounded-2xl border border-pressed bg-canvas p-4 text-ink shadow-card sm:p-6 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:top-[7.5rem] lg:max-h-none lg:w-[400px] xl:top-[7.5rem] xl:w-[420px] [&>*]:shrink-0">
      {collapsible && (
        <div className="sticky -top-4 z-10 -mx-4 -mt-4 -mb-2 flex items-center justify-between gap-2 bg-canvas/95 px-4 pt-3 pb-2 backdrop-blur-sm sm:-top-6 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-4">
          <span className="label-mono text-body">{label}</span>
          <button type="button" onClick={() => setOpen(false)} aria-expanded={true}
            className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-body transition-colors hover:bg-canvas-soft hover:text-ink">
            Minimizar
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true"><path d="M4 10l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      )}
      {children}
    </aside>
  )
}
