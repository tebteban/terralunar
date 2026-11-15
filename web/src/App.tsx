import ScientificSearch from './ScientificSearch.tsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ResultsTarget } from './panelContext.ts'
import ConsoleIcon from './ConsoleIcon.tsx'
import Compare3D from './Compare3D.tsx'
import MapView from './MapView.tsx'
import MoonMap from './MoonMap.tsx'
import MarsView from './MarsView.tsx'
import ZoneCard from './ZoneCard.tsx'
import { presetWeights, rank, type Preset, type Profile, type Weights, type Zone } from './score.ts'

const PRESETS: { id: Preset; label: string }[] = [
  { id: 'movilidad', label: 'Movilidad de rover' },
  { id: 'excavacion', label: 'Excavación hielo/regolito' },
  { id: 'habitat', label: 'Cimientos de hábitat' },
]

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`${path}: ${res.status}`)
  return res.json()
}

export default function App() {
  const [scientificOpen, setScientificOpen] = useState(false)
  const [zones, setZones] = useState<Zone[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preset, setPreset] = useState<Preset>('movilidad')
  const [weights, setWeights] = useState<Weights>({})
  const [body, setBody] = useState<'tierra' | 'luna' | 'marte'>('tierra')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [comparing, setComparing] = useState(false)
  const [resultsTarget, setResultsTarget] = useState<HTMLDivElement | null>(null)
  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(() => window.innerWidth > 900)
  const [showTelemetry, setShowTelemetry] = useState(true)
  const [methodOpen, setMethodOpen] = useState(false)
  const [fullscreenError, setFullscreenError] = useState('')
  const methodDialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (methodOpen) methodDialog.current?.showModal()
    else methodDialog.current?.close()
  }, [methodOpen])
  const pickEarth = (id: string) => { setBody('tierra'); setSelectedId(id); setRightOpen(true) }
  const fullscreen = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen() }
    catch { setFullscreenError('La pantalla completa no está disponible en este navegador.') }
  }


  useEffect(() => {
    Promise.all([getJSON<Zone[]>('/zones.json'), getJSON<Record<string, Profile>>('/profiles.json')])
      .then(([z, p]) => {
        setZones(z)
        setProfiles(p)
        setWeights(presetWeights(p.luna, 'movilidad'))
      })
      .catch((e) => setError(String(e)))
  }, [])

  const profile = profiles?.luna
  const ranked = useMemo(() => rank(zones, weights), [zones, weights])
  const selectedIndex = ranked.findIndex((r) => r.zone.id === selectedId)

  const choosePreset = (p: Preset) => {
    setPreset(p)
    if (profile) setWeights(presetWeights(profile, p))
  }

  if (error) return <p className="p-6 text-ink">No se pudieron cargar los datos: {error}</p>
  if (!profile) return <p className="p-6 text-body">Cargando datos…</p>

  return (
    <ResultsTarget.Provider value={resultsTarget}>{scientificOpen && <ScientificSearch onClose={() => setScientificOpen(false)} onSelect={pickEarth}/>}
    <div className={`app-shell stitch-shell body-${body} ${showTelemetry ? '' : 'telemetry-hidden'} ${leftOpen ? 'config-open' : ''} ${rightOpen ? 'results-open' : ''}`}>
      <header className="topbar">
        <a className="brand" href="#workspace" aria-label="TerraLunar, visor"><strong>TERRALUNAR</strong><span>Análogos terrestres para misiones planetarias</span></a>
        <div className="pipeline-status"><span aria-hidden="true">△</span><span>{body === 'tierra' ? 'Datos preliminares de simulación' : 'Relieve planetario · análisis exploratorio'}<small>{body === 'tierra' ? 'Catálogo de demostración' : body === 'luna' ? 'NASA LRO / LOLA' : 'NASA MGS / MOLA'}</small></span></div>
        <nav className="planet-tabs" aria-label="Planeta visualizado">
          {(['tierra','luna','marte'] as const).map(b => <button key={b} aria-pressed={body === b && !comparing} onClick={() => {setBody(b);setComparing(false)}}>{b === 'tierra' ? 'Tierra' : b === 'luna' ? 'Luna' : 'Marte'}</button>)}
          <button disabled={!selectedId} aria-pressed={comparing} title={selectedId ? 'Comparar el candidato seleccionado' : 'Seleccioná un candidato terrestre para comparar'} onClick={() => setComparing(true)}>Comparador 3D</button>
        </nav>
        <div className="source-status"><i/>DATOS ABIERTOS<br/>NASA / PDS</div>
        <div className="top-actions"><button className="mobile-toggle" aria-label="Mostrar configuración" aria-expanded={leftOpen} onClick={() => {setLeftOpen(!leftOpen);setRightOpen(false)}}>Parámetros</button><button aria-label="Fuentes y método" onClick={() => setMethodOpen(true)}>ⓘ</button><button aria-label="Alternar pantalla completa" onClick={fullscreen}><ConsoleIcon name="expand"/></button><button className="mobile-toggle" aria-expanded={rightOpen} onClick={() => {setRightOpen(!rightOpen);setLeftOpen(false)}}>Resultados</button></div>
      </header>
      <nav className="console-rail" aria-label="Herramientas de análisis"><button onClick={() => setScientificOpen(true)}>Comparación científica</button>
        <div className="rail-caption">EXPLORACIÓN PLANETARIA <strong>04 VISTAS</strong></div>
        <button onClick={() => {setBody('tierra');setComparing(false);setLeftOpen(true)}}><ConsoleIcon name="catalog"/>Catálogo de Análogos</button>
        <button disabled={!selectedId} onClick={() => setComparing(true)}><ConsoleIcon name="terrain"/>Evaluación Geológica</button>
        <button onClick={() => setMethodOpen(true)}><ConsoleIcon name="limits"/>Límites de Analogía</button>
        <button aria-pressed={showTelemetry} onClick={() => setShowTelemetry(!showTelemetry)}><ConsoleIcon name="orbit"/>Información de cámara</button>
        <div className="operating-mode"><span>MODO OPERATIVO</span><p>{body === 'tierra' ? 'Catálogo de análogos' : body === 'luna' ? 'LRO LOLA · polo sur' : 'MOLA · relieve regional'}</p><small>{body === 'tierra' ? 'Puntajes de prueba' : body === 'luna' ? 'Cobertura analítica 80°–90° S' : 'Análisis a 2 km por celda'}</small></div>
      </nav>
      <aside className="configuration side-panel" aria-label="Configuración científica">
        {body === 'tierra' ? <>
        <div className="panel-heading"><h1>TerraLunar</h1><p>Buscador de análogos terrestres para misiones planetarias.</p></div>
        <label className="field"><span>Destino de misión</span><select aria-label="Perfil disponible del catálogo" value="luna" disabled><option value="luna">{profile.name}</option></select></label>
        <fieldset className="test-presets"><legend>Tipo de prueba evaluada</legend>{PRESETS.map(p => <button key={p.id} aria-pressed={preset === p.id} onClick={() => choosePreset(p.id)}>{p.label}</button>)}</fieldset>
        <section className="weight-controls"><div className="section-heading"><h2>Pesos de similitud</h2><button title="Restablecer pesos del tipo de prueba" onClick={() => choosePreset(preset)}>Restablecer</button></div><p className="muted">Arrastrá cada deslizador para recalcular el índice ponderado del catálogo.</p>
          {Object.entries(profile.dimensions).map(([k, d]) => (
            <label key={k} className="flex flex-col gap-1 text-sm">
              <span className="flex justify-between">
                <span>{d.name}</span>
                <span className="font-medium tabular-nums">{Math.round((weights[k] ?? 0) * 100)}</span>
              </span>
              <input
                type="range" min={0} max={1} step={0.05} value={weights[k] ?? 0}
                onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })}
              />
            </label>
          ))}
        </section>
        <section className="configuration-ranking"><div className="section-heading"><h2>Ranking de sitios terrestres</h2><span>{ranked.length} sitios</span></div><p className="muted">Elegí un análogo para desplegar la ficha del candidato.</p>
          <div className="ranking-labels"><span># / Sitio</span><span>Ajuste /100</span></div>
          <div className="candidate-list">
          <ol className="flex flex-col">
            {ranked.map(({ zone, score }, i) => (
              <li key={zone.id}>
                <button
                  type="button"
                  onClick={() => pickEarth(zone.id)}
                  aria-pressed={zone.id === selectedId}
                  className={`candidate-row flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                    zone.id === selectedId ? 'bg-elevated' : 'hover:bg-elevated/60'
                  }`}
                >
                  <span className="w-5 text-right text-sm tabular-nums text-mute">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{zone.name}</span>
                    <span className="mt-0.5 flex items-center gap-2 text-sm text-mute">
                      {zone.country}
                      {zone.known && <span className="rounded-full bg-elevated px-2 py-0.5 text-xs font-medium text-canvas">análogo conocido</span>}
                    </span>
                  </span>
                  <span className="text-lg font-bold tabular-nums">{(score * 100).toFixed(0)}</span>
                </button>
              </li>
            ))}
          </ol>
          </div>
        </section>
        <div className="data-notice"><strong>Catálogo en preparación</strong><p>Estos pesos modifican el ranking terrestre de demostración. Sus puntajes son datos de prueba.</p><p>La selección en Luna y Marte usa comparaciones topográficas independientes con datos de elevación.</p></div>
        <button className="secondary-action" onClick={() => setMethodOpen(true)}>Fuentes y método ↗</button>
        </> : <div className="planet-overview"><span className="eyebrow">CUERPO SELECCIONADO</span><div className="overview-title"><h1>{body === 'luna' ? 'Luna' : 'Marte'}</h1><span>{body === 'luna' ? 'LRO / LOLA' : 'MOLA / MGS'}</span></div><p>{body === 'luna' ? 'Polo sur · 80°S — 90°S. Seleccioná una región para comparar su topografía con lugares terrestres.' : 'Explorá cráteres, llanuras y valles. Seleccioná una región para extraer un recorte de terreno.'}</p><div className="overview-section"><span className="eyebrow">ANÁLISIS DISPONIBLE</span><strong>Analogía topográfica</strong><p>Pendiente · rugosidad · desnivel</p></div><div className="overview-metrics"><span>VENTANA DE COMPARACIÓN</span><strong>20 × 20 km</strong><span>ALCANCE</span><p>{body === 'luna' ? 'Métricas del polo sur lunar' : 'Comparación regional a 2 km por celda'}</p></div><button className="secondary-action" onClick={() => setMethodOpen(true)}>Fuentes y límites del análisis ↗</button></div>}
      </aside>
      <main id="workspace" className="viewer-workspace" aria-label="Visor geoespacial">
        <div className="viewer-heading"><span>{body === 'tierra' ? 'Tierra / Candidatos terrestres' : body === 'luna' ? 'Luna / Polo sur / LRO LOLA' : 'Marte / Exploración / MOLA'}</span><span className="status-badge">{body === 'tierra' ? 'Catálogo de prueba' : 'Análisis topográfico'}</span></div>
        <div className="viewer-canvas">
          <div className={body === 'tierra' ? 'h-full' : 'hidden'}><MapView ranked={ranked} selectedId={selectedId} onSelect={pickEarth} /></div>
          {body === 'luna' && <MoonMap onPickEarth={pickEarth} />}
          {body === 'marte' && <MarsView onPickEarth={pickEarth} />}
        </div>
        <footer className="viewer-footer"><span>{body === 'tierra' && selectedIndex >= 0 ? `${ranked[selectedIndex].zone.name} · ${ranked[selectedIndex].zone.centroid[1].toFixed(3)}°, ${ranked[selectedIndex].zone.centroid[0].toFixed(3)}°` : 'Arrastrar para explorar · rueda para acercar'}</span><span>Las imágenes no determinan la resolución del análisis</span></footer>
        {comparing && selectedId && <Compare3D zoneId={selectedId} onClose={() => setComparing(false)} />}
      </main>
      <aside className="results side-panel" aria-label="Resultados científicos">
        <div className="results-kicker">{body === 'tierra' ? 'FICHA DEL CANDIDATO' : body === 'luna' ? 'COORDENADAS DEL MODELO · LRO / LOLA' : 'SUPERFICIE MARCIANA · MOLA'}</div>
        <div ref={setResultsTarget} />
        {body === 'tierra' && <>
          {selectedIndex >= 0 ? <ZoneCard ranked={ranked[selectedIndex]} position={selectedIndex+1} profile={profile} weights={weights} onClose={() => setSelectedId(null)} onCompare={() => setComparing(true)} /> : <div className="empty-state"><span>◎</span><h3>Seleccioná un candidato</h3><p>Consultá sus indicadores, fuentes y comparación de relieve.</p></div>}
          <button className="secondary-action" onClick={() => {setLeftOpen(true);setRightOpen(false);document.querySelector<HTMLInputElement>('.weight-controls input')?.focus()}}>Ajustar pesos</button>
        </>}
      </aside>
      {fullscreenError && <button className="app-toast" onClick={() => setFullscreenError('')}>{fullscreenError} · Cerrar</button>}
      <dialog ref={methodDialog} className="method-dialog" aria-label="Fuentes y método" onCancel={() => setMethodOpen(false)} onClose={() => setMethodOpen(false)}><header><h2>Fuentes y método</h2><button autoFocus onClick={() => setMethodOpen(false)}>Cerrar</button></header><p>TerraLunar busca analogías parciales para preparar ensayos. Ningún lugar terrestre reproduce la gravedad, atmósfera o radiación de otro planeta.</p><h3>Catálogo terrestre</h3><p>Promedio ponderado normalizado de las variables. Los puntajes actuales de este catálogo son de prueba; no son resultados científicos definitivos.</p><h3>Luna y Marte</h3><p>Comparación de pendiente, rugosidad y desnivel con tolerancias provisionales. Luna: cobertura analítica del polo sur. Marte: comparación regional a 2 km por celda. La imagen y el relieve visual pueden tener otra resolución.</p><ul><li><a href="https://pds-geosciences.wustl.edu/missions/lro/lola.htm" target="_blank" rel="noreferrer">NASA LRO / LOLA ↗</a></li><li><a href="https://pds-geosciences.wustl.edu/missions/mgs/megdr.html" target="_blank" rel="noreferrer">NASA MGS / MOLA ↗</a></li><li><a href="https://trek.nasa.gov/mars/" target="_blank" rel="noreferrer">NASA Mars Trek · Viking / THEMIS ↗</a></li></ul><p>Las fichas y el comparador detallan las fuentes de cada recorte. Un puntaje expresa ajuste al método, no probabilidad de aptitud.</p></dialog>
    </div>
    </ResultsTarget.Provider>
  )
}

