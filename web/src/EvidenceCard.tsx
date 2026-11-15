import PlanetaryEvidence from './PlanetaryEvidence.tsx'
import GeomechanicsCard from './GeomechanicsCard.tsx'
import {missionRequirements} from './missionCriteria.ts'
import {PolarAngleAxis,PolarGrid,PolarRadiusAxis,Radar,RadarChart,ResponsiveContainer} from 'recharts'
import type {AnalysisRun} from './analysisRun.ts'
import {comparisonFor} from './analysisRun.ts'
import type {SearchResult} from './globalSearch.ts'
import {DIMENSIONS,RELIEF_LABELS} from './analogyScope.ts'
import {coord,num} from './fmt.ts'
export default function EvidenceCard({run,row,onCompare,onClose}:{run:AnalysisRun;row:SearchResult;onCompare:()=>void;onClose:()=>void}){
 const dims=row.contributions.map(c=>({...c,name:RELIEF_LABELS[c.id],score:c.value}))
 return <section className="flex flex-col gap-4" aria-label="Evidencia del candidato">
  <header><p className="label-mono text-body">Tierra · {row.origin==='sampled'?'ventana exploratoria':'referencia del catálogo'}</p><h2 className="text-2xl font-bold">{row.name}</h2><p className="hud text-body">{coord(row.zone.centroid[1],row.zone.centroid[0])}</p></header>
  <p className="text-sm">Comparado con <strong>{run.resolvedTarget.name}</strong> · {run.resolvedTarget.body==='luna'?'Luna':'Marte'}</p>
  {run.experiment!=='regional'&&<section className="rounded-xl border border-pressed p-3 text-sm"><strong>Compatibilidad del ensayo: pendiente</strong><p>El índice inferior solo mide relieve.</p><ul>{missionRequirements(run.experiment).filter(c=>!c.available).map(c=><li key={c.id}>Falta: {c.name}.</li>)}</ul></section>}<p className="metric text-4xl font-bold" data-testid="candidate-score">{num(row.score,1)}<span className="text-sm font-normal"> /100 · semejanza topográfica</span></p>
  <button className="btn-primary" disabled={!comparisonFor(run,row)} onClick={onCompare}>Comparar relieve 3D</button>
  <section aria-label="Firma medida del candidato"><h3 className="font-semibold">Firma del terreno</h3><ResponsiveContainer width="100%" height={230}><RadarChart data={dims} outerRadius="55%"><PolarGrid stroke="#ddd9d1"/><PolarAngleAxis dataKey="name" tick={{fill:'#615e58',fontSize:10}}/><PolarRadiusAxis domain={[0,1]} tick={false} axisLine={false}/><Radar dataKey="score" stroke="#16161a" fill="#16161a" fillOpacity={.12} dot={{r:3}} isAnimationActive={false}/></RadarChart></ResponsiveContainer><p className="text-xs text-body">0–1: ajuste por variable al destino. No incluye dimensiones sin medir.</p></section>
  <h3 className="font-semibold">Puntos fuertes dentro del relieve</h3>{[...dims].filter(c=>(c.value??0)>0).sort((a,b)=>(b.value??0)-(a.value??0)).slice(0,2).map(c=><p className="text-sm" key={c.id}>{c.name}: {num((c.value??0)*100)} /100 de ajuste.</p>)}
  <details><summary className="cursor-pointer font-semibold">Mediciones, pesos y aportes</summary><p className="my-2 text-xs">Ventana 20 × 20 km · análisis a 2 km. Rugosidad regional, no tamaño de rocas.</p>{dims.map(c=><div className="my-3 text-sm" key={c.id}><strong>{c.name}</strong><p>Tierra: {num(row.features[c.id as keyof typeof row.features],2)} · objetivo: {num(run.reference[c.id as keyof typeof run.reference],2)}</p><p>Peso: {c.weight} · aporte: {num((c.contribution??0)*100,2)} puntos.</p></div>)}<p className="text-xs">Tierra: {row.source}</p><p className="text-xs">Objetivo: {run.resolvedTarget.source}</p></details>
  <GeomechanicsCard target={run.resolvedTarget} input={{features:row.features,heights:row.heights,thermal:row.thermal,cover:row.cover}}/>
  <PlanetaryEvidence observation={run.resolvedTarget.observation} earth={row.thermal} geology={row.geology}/>
  <details><summary className="cursor-pointer font-semibold">Cobertura terrestre</summary><p className="my-2 text-xs">{row.coverSource}. Filtro: {row.filterStatus}.</p>{row.cover&&<p className="text-sm">Agua: {row.cover.water===null?'sin dato':num(row.cover.water*100)+'%'} · vegetación: {row.cover.vegetation===null?'sin dato':num(row.cover.vegetation*100)+'%'} · muestras válidas: {num(row.cover.valid_fraction*100)}%. Fechas: {row.cover.dates?.join(', ')||'ver producto de cobertura'}</p>}</details>
  <details><summary className="cursor-pointer font-semibold">Temperatura superficial · evidencia NASA</summary>{row.thermal?<div className="my-2 text-sm">
   <p>{row.thermal.product} · {row.thermal.date} · píxel nominal {num(row.thermal.resolutionM)} m.</p>
   {(['day','night'] as const).map(phase=>{const p=row.thermal![phase];return <div className="my-3" key={phase}><strong>{phase==='day'?'Día':'Noche'}</strong><p>{p.kelvin?'P10 / mediana / P90: '+p.kelvin.map(v=>num(v,1)).join(' / ')+' K':'Sin píxeles que superen el control de calidad.'}</p><p>{p.count}/{p.total} píxeles válidos ({num(p.validFraction*100)}% del recorte cubierto). Hora solar local: {p.solarHours?p.solarHours.map(v=>num(v,1)).join('–')+' h':'sin dato'}.</p></div>})}
   <p>Percentiles espaciales de una fecha, bajo cielo despejado. No representan un ciclo térmico completo ni temperatura del aire. Falta una serie planetaria compatible; estos valores no aportan puntos al ranking.</p>
   <a className="underline" href={row.thermal.source} target="_blank" rel="noreferrer">Producto NASA y procedencia</a>
  </div>:<p className="my-2 text-sm">Este recorte no tiene observaciones térmicas integradas. No se interpreta como temperatura cero.</p>}</details>
  <h3 className="font-semibold">Límites de la analogía</h3><p className="text-sm">Este puntaje no certifica el ensayo. La malla 3D puede mostrar más detalle que el cálculo regional.</p><details><summary>Dimensiones pendientes</summary>{DIMENSIONS.filter(d=>!d.available).map(d=><p key={d.id} className="my-2 text-xs"><strong>{d.name}: pendiente.</strong> {d.missing}</p>)}</details>
  <button className="btn-secondary" onClick={onClose}>Cerrar candidato</button>
 </section>
}
