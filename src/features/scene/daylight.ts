import { useMemo } from 'react'
import * as THREE from 'three'
import { solarPosition, sunDirection, sunInstant, type SunSettings } from '../../lib/sun'
import { useAppStore, type LightsMode } from '../../store/useAppStore'

// Turns the sun settings into light colours and intensities for the scene.

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}

const BACKGROUND = { light: '#e9eaec', dark: '#121417' }
const NOON = new THREE.Color('#fff1dc')
const LOW_SUN = new THREE.Color('#ff9d5c')
const DUSK_SKY = new THREE.Color('#e9c7ae')
const NIGHT_SKY = new THREE.Color('#1c2431')

export interface Daylight {
  elevation: number
  azimuth: number
  direction: [number, number, number]
  sunColor: string
  sunIntensity: number
  hemisphere: number
  environment: number
  background: string
  /** Whether ceiling lights are on for this time and setting. */
  lightsOn: boolean
}

export function daylight(sun: SunSettings, lights: LightsMode, dayBackground: string): Daylight {
  const { elevation, azimuth } = solarPosition(sunInstant(sun))
  const day = smoothstep(-6, 18, elevation)
  const sunUp = smoothstep(-1, 12, elevation)
  const warm = 1 - smoothstep(2, 28, elevation)
  const background = new THREE.Color(dayBackground).lerp(DUSK_SKY, warm * sunUp * 0.6).lerp(NIGHT_SKY, 1 - day)
  return {
    elevation,
    azimuth,
    direction: sunDirection(elevation, azimuth, sun.north),
    sunColor: NOON.clone().lerp(LOW_SUN, warm).getStyle(),
    sunIntensity: 3 * sunUp,
    hemisphere: 0.1 + 0.45 * day,
    environment: 0.12 + 0.88 * day,
    background: background.getStyle(),
    lightsOn: lights === 'on' || (lights === 'auto' && elevation < 6),
  }
}

/** Sun, sky and ceiling-light state for the current time-of-day settings. */
export function useDaylight() {
  const theme = useAppStore((s) => s.theme)
  const sun = useAppStore((s) => s.sun)
  const lights = useAppStore((s) => s.lights)
  return useMemo(() => daylight(sun, lights, BACKGROUND[theme]), [sun, lights, theme])
}
