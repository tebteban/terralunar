// Detección única de WebGL. Sin WebGL, MapLibre y three.js lanzan al crear el contexto y la vista queda negra:
// cada lienzo muestra en su lugar un aviso (NoWebGL) y el resto de la app (ranking, fichas, método) sigue usable.
let cached: boolean | null = null
export function hasWebGL(): boolean {
  if (cached !== null) return cached
  try {
    const c = document.createElement('canvas')
    cached = !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch { cached = false }
  return cached
}
