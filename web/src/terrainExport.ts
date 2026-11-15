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

// STL (binario) u OBJ en metros, con Z hacia arriba y el norte en +Y (convención de Blender y de los laminadores 3D).
export function terrainFile(h: ArrayLike<number>, inputN: number, size: number, exaggeration: number, format: 'stl' | 'obj', name: string) {
  const geo = terrainGeometry(h, inputN, size, exaggeration).rotateX(Math.PI / 2)
  const mesh = new THREE.Mesh(geo)
  mesh.name = name
  try { return format === 'stl' ? new STLExporter().parse(mesh, { binary: true }) : new OBJExporter().parse(mesh) }
  finally { geo.dispose() }
}
