import {lazy,Suspense,useMemo,useState,useEffect} from 'react'
import Landing,{type LandingChoice} from './Landing.tsx'
import MapView from './MapView.tsx'
import SurfacePanel from './SurfacePanel.tsx'
import ConsoleIcon from './ConsoleIcon.tsx'
import MethodDialog from './MethodDialog.tsx'
import ScientificSearch from './ScientificSearch.tsx'
import {comparisonFor,exportRun,type AnalysisRun} from './analysisRun.ts'
import {PROFILES} from './analogyScope.ts'
import {coord,num} from './fmt.ts'
import type {SearchTarget} from './searchTarget.ts'
const MoonMap=lazy(()=>import('./MoonMap.tsx'))
const MarsView=lazy(()=>import('./MarsView.tsx'))
const Compare3D=lazy(()=>import('./Compare3D.tsx'))
const EvidenceCard=lazy(()=>import('./EvidenceCard.tsx'))
type Body='tierra'|'luna'|'marte'
function route(){const h=location.hash;return {started:!!h,body:(h==='#marte'?'marte':h==='#luna'?'luna':'tierra') as Body}}
const Loading=()=> <p role="status" className="p-6 text-canvas">Cargando datos y visor…</p>
export default function App(){
 const [started,setStarted]=useState(route().started),[body,setBody]=useState<Body>(route().body)
 const [visited,setVisited]=useState<Body[]>([route().body])
 const [run,setRun]=useState<AnalysisRun|null>(null),[selectedId,setSelectedId]=useState<string|null>(null)
 const [draftTarget,setDraftTarget]=useState<SearchTarget|null>(null),[scientificOpen,setScientificOpen]=useState(location.hash==='#personalizado')
 const [comparing,setComparing]=useState(false),[example,setExample]=useState(false),[methodOpen,setMethodOpen]=useState(false)
 const [panel,setPanel]=useState<'ajustes'|'mapa'|'ranking'>('mapa'),[filter,setFilter]=useState('all')
 const [notice,setNotice]=useState('')
 const [personalized,setPersonalized]=useState(location.hash==='#personalizado')
 const [panelHidden,setPanelHidden]=useState(()=>{
  try{return localStorage.getItem('terralunar.panel-oculto')==='1'}catch{return false}
 })
 function togglePanel(hidden:boolean){
  setPanelHidden(hidden)
  try{localStorage.setItem('terralunar.panel-oculto',hidden?'1':'0')}catch{/* La sesión conserva el estado. */}
 }
 const collapsible=true // D-020: el panel izquierdo se puede ocultar en Tierra, Luna, Marte y búsqueda personalizada
 const collapsed=collapsible&&panelHidden
 const panelName={tierra:personalized?'Búsqueda personalizada':'Tierra',luna:'Luna',marte:'Marte'}[body]
 const row=run?.rows.find(r=>r.id===selectedId)
 // D-021: ficha terrestre como pestaña flotante; se despliega sola con un análisis nuevo o al elegir un candidato
 const [earthPanelOpen,setEarthPanelOpen]=useState(false)
 const earthSignal=`${run?.id??''}|${selectedId??''}`
 const [lastEarthSignal,setLastEarthSignal]=useState(earthSignal)
 if(earthSignal!==lastEarthSignal){setLastEarthSignal(earthSignal);if(run||selectedId)setEarthPanelOpen(true)}
 const comparison=useMemo(()=>run&&row?comparisonFor(run,row):null,[run,row])
 const mapped=useMemo(()=>run?.rows.map(r=>({zone:r.zone,score:r.score/100}))??[],[run])
 const visible=run?.rows.filter(r=>filter==='all'||r.origin===filter)??[]
 function visit(b:Body,custom=personalized){setBody(b);setVisited(v=>v.includes(b)?v:[...v,b]);setStarted(true);setPanel('mapa');setComparing(false);history.pushState(null,'',b==='tierra'?(custom?'#personalizado':'#explorar'):'#'+b)}
 useEffect(()=>{const pop=()=>{const r=route();setStarted(r.started);if(r.body==='tierra')setPersonalized(location.hash==='#personalizado');setBody(r.body);setVisited(v=>v.includes(r.body)?v:[...v,r.body]);setComparing(false)};addEventListener('popstate',pop);return()=>removeEventListener('popstate',pop)},[])
 function analyze(t:SearchTarget){setDraftTarget(t);setScientificOpen(true)}
 function configure(){setDraftTarget(null);setScientificOpen(true)}
 function accept(next:AnalysisRun){setRun(next);if(run?.id!==next.id){setSelectedId(null);setComparing(false);setFilter('all')}}
 function select(id:string){setSelectedId(id);visit('tierra')}
 function pick(c:LandingChoice){if(c==='ejemplo'){setExample(true);return}if(c==='personalizado'){setPersonalized(true);visit('tierra',true);configure();return}setPersonalized(false);visit(c,false)}
 const fullscreen=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{setNotice('Pantalla completa no disponible')}}
 const ranking=<section aria-label="Candidatos de la ejecución" className="flex flex-col gap-3">
  <h2 className="text-lg font-bold">Candidatos terrestres {run&&<span className="metric">· {visible.length}</span>}</h2>
  {!run?<p className="text-sm">Elegí un destino y ejecutá la comparación para obtener resultados medidos.</p>:<>
   <p className="text-xs">Semejanza topográfica con {run.resolvedTarget.name} ({coord(run.resolvedTarget.lat,run.resolvedTarget.lon)}). No es compatibilidad integral del ensayo.</p>
   <label className="text-sm">Mostrar<select aria-label="Filtrar candidatos" className="mt-1 min-h-11 w-full rounded-lg border border-pressed bg-canvas p-2 text-ink" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todos</option><option value="sampled">Ventanas exploratorias</option><option value="catalogue">Catálogo de referencia</option></select></label>
   {!visible.length&&<p role="status">No hay resultados con este filtro. No significa que no existan análogos.</p>}
   <ol className="flex flex-col gap-2">{visible.map(r=><li key={r.id}><button aria-pressed={selectedId===r.id} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-pressed p-3 text-left aria-pressed:bg-ink aria-pressed:text-canvas" onClick={()=>select(r.id)}><span className="min-w-0 text-sm font-semibold">{r.name}<small className="block font-normal">{r.origin==='sampled'?'Fuera del catálogo consultado':'Referencia del catálogo'}</small></span><strong className="metric">{num(r.score,1)}</strong></button></li>)}</ol>
  </>}
 </section>
 const exampleView=example&&<Suspense fallback={<Loading/>}><Compare3D zoneId="mcmurdo-dry-valleys" onClose={()=>setExample(false)}/></Suspense>
 if(!started)return <><Landing mock={false} onPick={pick}/>{exampleView}</>
 return <div className="flex h-full flex-col bg-space text-canvas">
  <DataBanner onMethod={()=>setMethodOpen(true)} onFullscreen={fullscreen}/>
  <nav aria-label="Paneles" className="flex shrink-0 border-b border-hairline bg-rail px-2 lg:hidden">{(['ajustes','mapa','ranking'] as const).map(p=><button key={p} aria-pressed={panel===p} onClick={()=>setPanel(p)} className="min-h-11 flex-1 capitalize aria-pressed:underline">{p}</button>)}</nav>
  <div className="relative flex min-h-0 flex-1 lg:flex-row">
   {collapsed&&<div className="hidden w-12 shrink-0 flex-col items-center gap-3 border-r border-hairline bg-rail py-4 lg:flex">
    <button type="button" onClick={()=>togglePanel(false)} aria-expanded={false} aria-controls="panel-lateral"
      aria-label={'Mostrar panel de '+panelName} title={'Mostrar panel de '+panelName}
      className="grid size-10 place-items-center rounded-full hover:bg-elevated">
     <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </button>
    <span className="label-mono rotate-180 text-mute [writing-mode:vertical-rl]">{panelName}</span>
   </div>}
   <aside id="panel-lateral" aria-label="Misión y análisis" className={`${panel==='ajustes'?'absolute inset-0 z-20 flex':'hidden'} flex-col gap-6 overflow-y-auto border-hairline bg-rail p-6 lg:static lg:w-[340px] lg:shrink-0 lg:border-r xl:w-[390px] ${collapsed?'lg:hidden':'panel-in lg:flex'}`}>
    {collapsible&&<button type="button" onClick={()=>togglePanel(true)} aria-expanded={true} aria-controls="panel-lateral"
      className="hidden min-h-10 self-end rounded-full px-3 text-xs text-mute hover:bg-elevated hover:text-canvas lg:inline-flex lg:items-center">
     Ocultar panel
    </button>}
    <header><h1 className="text-xl font-bold">TerraLunar</h1><p className="mt-1 text-sm text-mute">Destino → ensayo → candidatos → comparación.</p></header>
    <section className="flex flex-col gap-3 rounded-2xl border border-hairline bg-white/[0.04] p-4" aria-label="Objetivo de la comparación"><span className="label-mono text-mute">Destino del análisis</span>{run?<><h2 className="font-semibold">{run.resolvedTarget.body==='luna'?'Luna':'Marte'} · {run.resolvedTarget.name}</h2><p className="hud text-mute">{coord(run.resolvedTarget.lat,run.resolvedTarget.lon)}</p><span className="label-mono text-mute">Ensayo</span><p>{PROFILES.find(p=>p.id===run.experiment)?.name}</p>{run.experiment!=='regional'&&<p className="text-sm text-mute">Compatibilidad del ensayo pendiente · se muestra contexto topográfico.</p>}</>:<p className="text-sm">Elegí un punto del planeta o un destino de referencia en «Comparar regiones».</p>}<button className="btn-primary" onClick={configure}>{run?'Editar análisis':'Comparar regiones'}</button></section>
    <section className="flex flex-col gap-2"><h2 className="font-semibold">Qué se calcula hoy</h2><p className="text-sm text-mute">Semejanza del relieve en ventanas de 20 × 20 km, a 2 km por celda. Los demás objetivos de ensayo requieren datos adicionales.</p><p className="text-sm text-mute">El radar y los resultados usan mediciones. No se cargan puntajes del catálogo de demostración.</p></section>
    {run&&<><details><summary className="cursor-pointer text-sm">Cobertura y procedencia</summary><p className="my-2 text-xs">{run.counts.loaded} recortes cargados. Cobertura discontinua, no barrido mundial.</p>{run.reports.map(r=><p key={r.name} className="my-2 text-xs text-mute">{r.name}: {r.count}. {r.status}</p>)}</details><button className="btn-ghost" onClick={()=>exportRun(run)}>Exportar esta ejecución</button></>}
    <button className="btn-ghost" onClick={()=>setMethodOpen(true)}>Fuentes y método <ConsoleIcon name="external"/></button>
   </aside>
   {panel==='ranking'&&<div className="absolute inset-0 z-20 overflow-y-auto bg-canvas p-6 text-ink lg:hidden">{ranking}</div>}
   <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-space">
    <div className={body==='tierra'?'h-full':'hidden'}><MapView active={body==='tierra'} ranked={mapped} selectedId={selectedId} onSelect={select}/></div>
    {visited.includes('luna')&&<div className={body==='luna'?'h-full':'hidden'}><Suspense fallback={<Loading/>}><MoonMap integrated candidatesPanel={run?.resolvedTarget.body==='luna'?ranking:undefined} onAnalyze={analyze} onPickEarth={select}/></Suspense></div>}
    {visited.includes('marte')&&<div className={body==='marte'?'h-full':'hidden'}><Suspense fallback={<Loading/>}><MarsView active={body==='marte'} integrated candidatesPanel={run?.resolvedTarget.body==='marte'?ranking:undefined} onAnalyze={analyze} onPickEarth={select}/></Suspense></div>}
    <nav className="absolute left-2 right-2 top-16 z-10 flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-hairline bg-rail p-1 shadow-float sm:left-4 sm:right-auto" aria-label="Cuerpo visualizado"><button aria-label="Volver al inicio" onClick={()=>{setStarted(false);history.pushState(null,'',location.pathname)}} className="min-h-10 px-3"><ConsoleIcon name="back"/></button>{(['tierra','luna','marte'] as const).map(b=><button key={b} aria-pressed={body===b} onClick={()=>visit(b)} className="min-h-10 rounded-full px-4 text-sm capitalize text-mute aria-pressed:bg-canvas aria-pressed:text-ink">{{tierra:"Tierra",luna:"Luna",marte:"Marte"}[b]}</button>)}<button aria-label="Comparador 3D" disabled={!comparison} onClick={()=>setComparing(true)} className="min-h-10 rounded-full px-3 text-sm disabled:opacity-40">Comparador 3D</button></nav>
    {body==='tierra'&&<SurfacePanel label="Ficha y candidatos terrestres" collapsible open={earthPanelOpen} onOpenChange={setEarthPanelOpen}>{run&&row?<Suspense fallback={<p>Cargando ficha…</p>}><EvidenceCard run={run} row={row} onCompare={()=>setComparing(true)} onClose={()=>setSelectedId(null)}/></Suspense>:<><h2 className="font-bold">Límites de la analogía</h2><p className="text-sm">El relieve regional no determina composición, temperatura, recursos ni seguridad operativa.</p></>}{ranking}</SurfacePanel>}
   </main>
  </div>
  {scientificOpen&&<ScientificSearch initialRun={draftTarget?null:run} selectedTarget={draftTarget??run?.selectedTarget} onRun={accept} onClose={()=>{setScientificOpen(false);setDraftTarget(null)}} onSelect={select} onShowMap={()=>visit('tierra')}/>}
  {comparing&&comparison&&row&&run&&<Suspense fallback={<Loading/>}><Compare3D key={run.id+row.id} supplied={comparison} analysisScore={row.score} analysisId={run.id} zoneId={row.id} onClose={()=>setComparing(false)}/></Suspense>}
  {exampleView}<MethodDialog open={methodOpen} onClose={()=>setMethodOpen(false)}/>
  {notice&&<button onClick={()=>setNotice('')} className="chip-dark fixed bottom-4 left-4 z-50">{notice} · Cerrar</button>}
 </div>
}
function DataBanner({ onMethod, onFullscreen }: { onMethod: () => void; onFullscreen: () => void }) {
  return (
    <div className="flex h-9 shrink-0 items-center justify-between gap-4 border-b border-hairline bg-space px-3 text-xs text-mute sm:px-5" role="note">
      <span className="flex min-w-0 items-center gap-2"><span className="size-1.5 shrink-0 rounded-full bg-data" aria-hidden="true" /><span className="truncate">Relieve medido · cobertura discontinua · compatibilidad integral pendiente</span></span>
      <span className="flex shrink-0 items-center gap-1 text-mute sm:gap-3">
        <span className="hud hidden text-mute/80 xl:flex">LRO LOLA · MOLA · DEM terrestre</span>
        <button type="button" onClick={onMethod} className="min-h-9 cursor-pointer rounded-full px-2.5 font-medium text-canvas transition-colors hover:bg-elevated">Fuentes y método</button>
        <button type="button" onClick={onFullscreen} aria-label="Alternar pantalla completa" title="Pantalla completa" className="grid size-9 cursor-pointer place-items-center rounded-full text-canvas transition-colors hover:bg-elevated [&_svg]:size-4"><ConsoleIcon name="expand" /></button>
      </span>
    </div>
  )
}
