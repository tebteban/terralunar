// Set único de íconos de trazo (1,6 px) para toda la consola: reemplaza a los símbolos de texto (↗ ✕ ⟲ ←).
export default function ConsoleIcon({ name, className = '' }: { name: 'catalog' | 'terrain' | 'limits' | 'orbit' | 'expand' | 'external' | 'close' | 'back' | 'rotate' | 'target'; className?: string }) {
  const paths = {
    catalog: <><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5M7 10h6m-3-3v6" /></>,
    terrain: <path d="m2 19 7-11 4 6 3-5 6 10H2Zm5-8 2 2 2-2" />,
    limits: <><path d="m12 3 10 18H2L12 3Z" /><path d="M12 9v5m0 3v1" /></>,
    orbit: <><circle cx="12" cy="12" r="4" /><ellipse cx="12" cy="12" rx="11" ry="5" transform="rotate(-45 12 12)" /></>,
    expand: <path d="M3 9V3h6m6 0h6v6m0 6v6h-6m-6 0H3v-6" />,
    external: <path d="M7 17 17 7M9 7h8v8" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    back: <path d="M15 5l-7 7 7 7" />,
    rotate: <><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v5h-5" /></>,
    target: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="1.5" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3" /></>,
  }
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`size-[1em] shrink-0 ${className}`}>{paths[name]}</svg>
}
