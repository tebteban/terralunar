import type { FullConfig } from '@playwright/test'

// Calienta el dev server de Vite: pide los módulos con carga diferida antes de que corran los workers.
// Si no, el primer test que abre la ficha o la Luna espera la transformación en frío (y a veces agota el tiempo).
export default async function globalSetup(config: FullConfig) {
  const base = config.projects[0].use.baseURL!
  await fetch(base).catch(() => {})
  for (const m of ['ZoneCard', 'MoonMap', 'MarsView', 'Compare3D', 'MoonGlobe']) await fetch(`${base}/src/${m}.tsx`).catch(() => {})
}
