import * as THREE from 'three'
import { STLExporter } from 'three/addons/exporters/STLExporter.js'
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js'

// Misma malla para la vista 3D y para la exportación: lado `size` en metros, centrada en su altura media.
export function terrainGeometry(h: ArrayLike<number>, inputN: number, size: number, exaggeration: number) {
  if (h.length !== inputN * inputN) throw new Error('Tamaño de recorte inválido')
  // Smooth rendering only: bilinear interpolation cannot add observed terrain detail.
  const n = inputN < 32 ? 100 : inputN
  const geo = new THREE.PlaneGeometry(size, size, n - 1, n - 1)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position
  let sum = 0
  for (let i = 0; i < h.length; i++) sum += h[i]
  const mean = sum / h.length
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const gx = x / (n - 1) * (inputN - 1), gy = y / (n - 1) * (inputN - 1)
    const x0 = Math.floor(gx), y0 = Math.floor(gy), x1 = Math.min(inputN - 1, x0 + 1), y1 = Math.min(inputN - 1, y0 + 1)
    const fx = gx - x0, fy = gy - y0
    const value = h[y0 * inputN + x0] * (1 - fx) * (1 - fy) + h[y0 * inputN + x1] * fx * (1 - fy) + h[y1 * inputN + x0] * (1 - fx) * fy + h[y1 * inputN + x1] * fx * fy
    pos.setY(y * n + x, (value - mean) * exaggeration)
  }
  geo.computeVertexNormals()
  return geo
}

// Cierra la superficie (Z arriba) con cuatro paredes y una base plana: sólido estanco que un laminador puede imprimir.
// La base queda debajo del punto más bajo, con un espesor del 2 % del lado (400 m en 20 km).
export function withBase(top: THREE.BufferGeometry, size: number) {
  const pos = top.attributes.position, count = pos.count, n = Math.round(Math.sqrt(count))
  const z0 = (top.computeBoundingBox(), top.boundingBox!.min.z) - size * 0.02
  // Borde recorrido en sentido horario visto desde arriba: norte (oeste→este), este, sur, oeste.
  const ring: number[] = []
  for (let x = 0; x < n - 1; x++) ring.push(x)
  for (let y = 0; y < n - 1; y++) ring.push(y * n + n - 1)
  for (let x = n - 1; x > 0; x--) ring.push((n - 1) * n + x)
  for (let y = n - 1; y > 0; y--) ring.push(y * n)
  const xyz = Array.from(pos.array as ArrayLike<number>)
  for (const i of ring) xyz.push(pos.getX(i), pos.getY(i), z0)
  const center = count + ring.length
  xyz.push(0, 0, z0)
  const index = Array.from(top.index!.array as ArrayLike<number>)
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length], a2 = count + i, b2 = count + (i + 1) % ring.length
    index.push(a, b, a2, b, b2, a2, center, a2, b2)
  })
  const solid = new THREE.BufferGeometry()
  solid.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3))
  solid.setIndex(index)
  return solid
}

// STL binario con base (para imprimir) u OBJ como superficie (para Blender), en metros, Z arriba y norte en +Y.
export function terrainFile(h: ArrayLike<number>, inputN: number, size: number, exaggeration: number, format: 'stl' | 'obj', name: string) {
  const surface = terrainGeometry(h, inputN, size, exaggeration).rotateX(Math.PI / 2)
  const geo = format === 'stl' ? withBase(surface, size) : surface
  if (geo !== surface) surface.dispose()
  const mesh = new THREE.Mesh(geo)
  mesh.name = name
  try { return format === 'stl' ? new STLExporter().parse(mesh, { binary: true }) : new OBJExporter().parse(mesh) }
  finally { geo.dispose() }
}
