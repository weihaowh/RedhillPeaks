// Sun position for Singapore (low-precision solar ephemeris, good to well under a degree),
// and how it maps onto the plan once you say which way north points.

export const SINGAPORE = { lat: 1.3521, lon: 103.8198, utcOffset: 8 }

export type SunDate = 'today' | 'mar' | 'jun' | 'sep' | 'dec'

export interface SunSettings {
  /** Local Singapore time as decimal hours, e.g. 15.5 = 3:30 pm. */
  hour: number
  date: SunDate
  /** Bearing of north on the plan, degrees clockwise from the top of the drawing. */
  north: number
}

const RAD = Math.PI / 180

/** Elevation above the horizon and azimuth (clockwise from north), both in degrees. */
export function solarPosition(when: Date, lat = SINGAPORE.lat, lon = SINGAPORE.lon) {
  const n = when.getTime() / 86400000 + 2440587.5 - 2451545.0 // days since J2000
  const L = (280.46 + 0.9856474 * n) % 360
  const g = ((357.528 + 0.9856003 * n) % 360) * RAD
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD
  const eps = (23.439 - 0.0000004 * n) * RAD
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda))
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda))
  const gmst = (((18.697374558 + 24.06570982441908 * n) % 24) + 24) % 24
  const hourAngle = (gmst * 15 + lon) * RAD - ra
  const phi = lat * RAD
  const elevation = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(hourAngle))
  const azimuth = Math.atan2(-Math.sin(hourAngle), Math.tan(dec) * Math.cos(phi) - Math.sin(phi) * Math.cos(hourAngle))
  return { elevation: elevation / RAD, azimuth: ((azimuth / RAD) % 360 + 360) % 360 }
}

const DATES: Record<Exclude<SunDate, 'today'>, [number, number]> = { mar: [2, 20], jun: [5, 21], sep: [8, 22], dec: [11, 21] }

/** The instant for a Singapore local time on the chosen day. */
export function sunInstant({ hour, date }: Pick<SunSettings, 'hour' | 'date'>, now = new Date()): Date {
  const year = now.getUTCFullYear()
  const [month, day] = date === 'today' ? sgDate(now) : DATES[date]
  const minutes = Math.round(hour * 60)
  return new Date(Date.UTC(year, month, day, 0, minutes) - SINGAPORE.utcOffset * 3600000)
}

/** Today's month and day in Singapore. */
function sgDate(now: Date): [number, number] {
  const sg = new Date(now.getTime() + SINGAPORE.utcOffset * 3600000)
  return [sg.getUTCMonth(), sg.getUTCDate()]
}

/**
 * Unit vector pointing at the sun in world space (x = plan x, z = plan y, y up), given which
 * way north points on the plan.
 */
export function sunDirection(elevation: number, azimuth: number, north: number): [number, number, number] {
  const bearing = (north + azimuth) * RAD // clockwise from the top of the plan
  const h = Math.cos(elevation * RAD)
  return [Math.sin(bearing) * h, Math.sin(elevation * RAD), -Math.cos(bearing) * h]
}

const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']
export const compassName = (azimuth: number) => COMPASS[Math.round(azimuth / 45) % 8]

export function formatHour(hour: number) {
  const h = Math.floor(hour)
  const m = Math.round((hour - h) * 60)
  const suffix = h >= 12 ? 'pm' : 'am'
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`
}
