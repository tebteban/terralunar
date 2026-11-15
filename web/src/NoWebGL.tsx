// Aviso que reemplaza a un lienzo 3D cuando el navegador no tiene WebGL (VM, GPU bloqueada, modo seguro).
export default function NoWebGL({ what, href, label }: { what: string; href: string; label: string }) {
  return (
    <div role="status" className="flex h-full w-full items-center justify-center bg-space p-6">
      <div className="hud-frame flex max-w-sm flex-col gap-3 rounded-2xl border border-hairline bg-rail p-6 text-canvas">
        <span className="label-mono text-mute">Visor 3D no disponible</span>
        <p className="text-sm leading-5 text-mute">
          Este navegador no tiene <strong className="text-canvas">WebGL</strong>, que hace falta para dibujar {what}.
          Activá la aceleración por hardware o probá en otro navegador. El ranking, las fichas y el método siguen funcionando.
        </p>
        <a href={href} target="_blank" rel="noreferrer" className="btn-ghost h-10 self-start">{label}</a>
      </div>
    </div>
  )
}
