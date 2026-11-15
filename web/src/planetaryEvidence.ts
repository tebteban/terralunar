import type {SearchTarget} from './searchTarget.ts'

export type PlanetaryObservation = {
  body: SearchTarget['body']
  lat: number
  lon: number
  geologySource: string
  geologyScale: number
  units: {code: string; name: string; age?: string}[]
  thermal: {
    localHours: [number, number]
    count: number
    kelvin: [number, number, number]
    source: string
    sha256: string
  }[]
}

export async function withPlanetaryEvidence(target: SearchTarget, signal?: AbortSignal): Promise<SearchTarget> {
  try {
    const response = await fetch('/planetary/observations.json', {signal})
    if (!response.ok) return target
    const observations: PlanetaryObservation[] = await response.json()
    const observation = observations.find(site => {
      const longitudeDistance = Math.abs(((site.lon - target.lon + 540) % 360) - 180)
      return site.body === target.body && Math.abs(site.lat - target.lat) < 1e-5 && longitudeDistance < 1e-5
    })
    return observation ? {...target, observation} : target
  } catch (error) {
    if (signal?.aborted) throw error
    return target
  }
}
