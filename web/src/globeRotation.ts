import type { Map as MapLibre } from 'maplibre-gl'

// Decorative globe rotation only: never move the camera during local analysis.
export function startGlobeRotation(map: MapLibre): () => void {
  const container = map.getContainer()
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const pointers = new Set<number>()
  let frame = 0
  let last = performance.now()
  let pausedUntil = last
  let speed = 0
  const pause = () => { pausedUntil = performance.now() + 6000; speed = 0 }
  const down = (event: PointerEvent) => { pointers.add(event.pointerId); pause() }
  const up = (event: PointerEvent) => { if (pointers.delete(event.pointerId)) pause() }
  container.addEventListener('pointerdown', down, { passive: true })
  container.addEventListener('wheel', pause, { passive: true })
  container.addEventListener('keydown', pause)
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', up)
  const reset = () => { pointers.clear(); pause() }
  window.addEventListener('blur', reset)
  const tick = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    const zoom = map.getZoom()
    const enabled = !document.hidden && container.offsetWidth > 0 && container.offsetHeight > 0
      && !reducedMotion.matches && pointers.size === 0 && now >= pausedUntil
      && zoom < 2 && !map.isMoving()
    if (enabled) {
      const targetSpeed = 2 * Math.min(1, Math.max(0, (2 - zoom) / 0.75))
      speed += (targetSpeed - speed) * (1 - Math.exp(-dt / 0.8))
      const center = map.getCenter()
      map.jumpTo({ center: [((center.lng - speed * dt + 180) % 360 + 360) % 360 - 180, center.lat] })
    } else speed = 0
    frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
  return () => {
    cancelAnimationFrame(frame)
    container.removeEventListener('pointerdown', down)
    container.removeEventListener('wheel', pause)
    container.removeEventListener('keydown', pause)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', up)
    window.removeEventListener('blur', reset)
  }
}
