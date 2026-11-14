// Share immutable local datasets across view mounts; failed requests can retry.
const buffers = new Map<string, Promise<ArrayBuffer>>()
export function localBuffer(url: string): Promise<ArrayBuffer> {
  let pending = buffers.get(url)
  if (!pending) {
    pending = fetch(url).then(r => {
      if (!r.ok) throw new Error(`No se pudo cargar ${url}: ${r.status}`)
      return r.arrayBuffer()
    }).catch(error => { buffers.delete(url); throw error })
    buffers.set(url, pending)
  }
  return pending
}
