import SpaceBackdrop from './SpaceBackdrop.tsx'

// Fondo de la portada (D-022): sobrio y orgánico, fijo detrás de todo el recorrido (sin costuras).
// Capas: cielo con estrellas → tres manchas de luz difusa que derivan muy lento (arena, pizarra,
// terracota) → grano fino tipo película → viñeta suave que deja el centro más oscuro y legible.
// Solo se anima transform/opacity; con "reducir movimiento" todo queda quieto.
export default function OrganicBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <SpaceBackdrop />
      <div className="organic-blob organic-blob-sand" />
      <div className="organic-blob organic-blob-slate" />
      <div className="organic-blob organic-blob-clay" />
      <div className="organic-grain" />
      <div className="organic-vignette" />
    </div>
  )
}
