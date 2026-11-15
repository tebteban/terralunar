// Idioma de la interfaz (D-031). Inglés por defecto, con botón EN | ES en todas las pantallas.
// Los textos del código están escritos en español; esta capa traduce lo que se DIBUJA (nodos de texto y
// atributos accesibles) con el diccionario `i18n-en.json`. Así no hay que reescribir cada componente, y también
// se traducen los textos que vienen de los datos. Los números los formatea `fmt.ts` según el idioma.
import {useSyncExternalStore} from 'react'
import EN from './i18n-en.json' with { type: 'json' }

export type Lang = 'en' | 'es'
const KEY = 'terralunar-lang'
const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null
// En el navegador arranca en inglés salvo que el usuario haya elegido español; fuera del navegador (tests y
// scripts del pipeline) se usa español, el idioma en que está escrito el código.
let lang: Lang = typeof window === 'undefined' ? 'es' : stored === 'es' ? 'es' : 'en'
const listeners = new Set<() => void>()

export const getLang = () => lang
export function subscribe(f: () => void) { listeners.add(f); return () => { listeners.delete(f) } }
export const useLang = () => useSyncExternalStore(subscribe, getLang, () => 'en' as Lang)
export function setLang(next: Lang) {
  if (next === lang) return
  lang = next
  try { localStorage.setItem(KEY, next) } catch { /* modo privado */ }
  if (typeof document !== 'undefined') { document.documentElement.lang = next; applyAll() }
  listeners.forEach(f => f())
}

// ---------------------------------------------------------------- traducción de cadenas
const DICT = EN as Record<string, string>
// Números en cualquier formato (3.278,5 · 3,278.5 · −12): se reemplazan por # para buscar y se reponen después.
const NUM = /[−-]?\d+(?:[.,]\d+)*/g
// Claves con {} (plantillas con partes variables): se compilan a expresiones regulares.
const PATTERNS = Object.entries(DICT).filter(([k]) => k.includes('{}')).map(([k, v]) => {
  const re = new RegExp('^' + k.split('{}').map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(.+?)') + '$')
  return [re, v] as const
})
export const missing = new Set<string>()

function lookup(core: string): string | null {
  if (DICT[core] !== undefined) return DICT[core]
  const nums: string[] = []
  const key = core.replace(NUM, x => { nums.push(x); return '#' })
  let t = DICT[key]
  if (t === undefined) {
    for (const [re, tpl] of PATTERNS) {
      const m = key.match(re)
      if (m) { let i = 1; t = tpl.replace(/\{\}/g, () => translateString(m[i++] ?? '')); break }
    }
  }
  if (t === undefined) return null
  let i = 0
  // Decimales con coma escritos a mano en textos fijos (0,25 · 1,0) pasan a punto; los miles (1,213) no se tocan.
  const en = (x: string) => /^[−-]?\d+,(\d{1,2}|\d{4,})$/.test(x) ? x.replace(',', '.') : x
  return t.replace(/#/g, () => { const x = nums[i++]; return x === undefined ? '#' : en(x) })
}

/** Traduce una cadena al inglés; si no la conoce, la devuelve igual (y la anota en `missing`). */
export function translateString(s: string): string {
  const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/)!
  const core = m[2].replace(/\s+/g, ' ')
  if (!core || !/[A-Za-zÁÉÍÓÚáéíóúñÑ]/.test(core)) return s
  const direct = lookup(core)
  if (direct !== null) return m[1] + direct + m[3]
  // Frases compuestas con separadores de la interfaz: se traduce cada parte.
  for (const sep of [' · ', ' — ', ': ', '. ']) {
    if (core.includes(sep)) {
      const parts = core.split(sep), tr = parts.map(p => lookup(p.trim()))
      if (tr.some(x => x !== null)) return m[1] + parts.map((p, i) => tr[i] ?? translateString(p)).join(sep) + m[3]
    }
  }
  missing.add(core.replace(NUM, '#'))
  return s
}

// ---------------------------------------------------------------- aplicación al DOM
const ATTRS = ['aria-label', 'title', 'placeholder', 'alt'] as const
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE'])
type Seen = {orig: string; shown: string}
const textSeen = new WeakMap<Text, Seen>()
const attrSeen = new WeakMap<Element, Record<string, Seen>>()

function skipped(el: Element | null): boolean {
  for (let e = el; e; e = e.parentElement) if (SKIP.has(e.tagName) || e.hasAttribute('data-no-translate')) return true
  return false
}
function doText(n: Text) {
  if (skipped(n.parentElement)) return
  const cur = n.nodeValue ?? '', seen = textSeen.get(n)
  // Si el texto actual es el que pusimos nosotros, el original sigue siendo el guardado.
  const orig = seen && cur === seen.shown ? seen.orig : cur
  const shown = lang === 'en' ? translateString(orig) : orig
  textSeen.set(n, {orig, shown})
  if (cur !== shown) n.nodeValue = shown
}
function doAttrs(el: Element) {
  if (skipped(el)) return
  for (const a of ATTRS) {
    const cur = el.getAttribute(a)
    if (cur === null) continue
    const rec = attrSeen.get(el) ?? {}, seen = rec[a]
    const orig = seen && cur === seen.shown ? seen.orig : cur
    const shown = lang === 'en' ? translateString(orig) : orig
    rec[a] = {orig, shown}; attrSeen.set(el, rec)
    if (cur !== shown) el.setAttribute(a, shown)
  }
}
function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) { doText(root as Text); return }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return
  if (root.nodeType === Node.ELEMENT_NODE) doAttrs(root as Element)
  const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  for (let n = it.nextNode(); n; n = it.nextNode()) n.nodeType === Node.TEXT_NODE ? doText(n as Text) : doAttrs(n as Element)
}
let titleOrig = ''
function applyAll() {
  walk(document.body)
  titleOrig ||= document.title
  document.title = lang === 'en' ? translateString(titleOrig) : titleOrig
}

/** Arranca la capa: traduce lo que ya está y vigila todo lo que React agregue o cambie. */
export function startI18n() {
  document.documentElement.lang = lang
  applyAll()
  new MutationObserver(records => {
    for (const r of records) {
      if (r.type === 'characterData') doText(r.target as Text)
      else if (r.type === 'attributes') doAttrs(r.target as Element)
      else r.addedNodes.forEach(walk)
    }
  }).observe(document.body, {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS]})
  ;(window as unknown as {__i18nScan: () => string[]}).__i18nScan = scanMissing
}

/** Para mantener el diccionario: prueba traducir todo lo visible (en cualquier idioma) y devuelve lo que falta. */
export function scanMissing() {
  const it = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  for (let n = it.nextNode(); n; n = it.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) {
      if (skipped(n.parentElement)) continue
      const seen = textSeen.get(n as Text)
      translateString(seen ? seen.orig : n.nodeValue ?? '')
    } else if (!skipped(n as Element)) {
      for (const a of ATTRS) { const v = attrSeen.get(n as Element)?.[a]?.orig ?? (n as Element).getAttribute(a); if (v) translateString(v) }
    }
  }
  return [...missing]
}
