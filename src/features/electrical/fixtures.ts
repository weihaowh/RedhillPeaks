// Electrical, lighting, aircon and data points. Heights are typical Singapore practice and only
// defaults: confirm final positions with your licensed electrical worker (LEW).

export type FixtureGroup = 'Power' | 'Appliance points' | 'Switches' | 'Lighting' | 'Aircon' | 'Data'
export type Mount = 'wall' | 'ceiling' | 'floor'

export interface FixtureDef {
  id: string
  name: string
  group: FixtureGroup
  mount: Mount
  /** Centre height above the floor (m). Ceiling points use the ceiling height. */
  height: number
  /** Indicative supply-and-install price (SGD). */
  cost: number
  /** Short code printed next to the symbol on the contractor plan. */
  code: string
  /** Size of the 3D body: width, height, depth (m). */
  body: [number, number, number]
  hint?: string
}

export const FIXTURES: FixtureDef[] = [
  { id: 'socket', name: '13A socket', group: 'Power', mount: 'wall', height: 0.3, cost: 90, code: 'P1', body: [0.086, 0.086, 0.012] },
  { id: 'socket-twin', name: '13A twin socket', group: 'Power', mount: 'wall', height: 0.3, cost: 110, code: 'P2', body: [0.146, 0.086, 0.012] },
  { id: 'socket-usb', name: 'Twin socket with USB', group: 'Power', mount: 'wall', height: 0.3, cost: 150, code: 'PU', body: [0.146, 0.086, 0.012] },

  { id: 'point-hob', name: 'Hob point (cooker unit)', group: 'Appliance points', mount: 'wall', height: 1.2, cost: 250, code: 'HB', body: [0.146, 0.146, 0.015], hint: 'Induction hobs usually need a dedicated 20 A or 32 A circuit.' },
  { id: 'point-oven', name: 'Oven point', group: 'Appliance points', mount: 'wall', height: 0.3, cost: 180, code: 'OV', body: [0.086, 0.086, 0.012] },
  { id: 'point-hood', name: 'Cooker hood point', group: 'Appliance points', mount: 'wall', height: 2.1, cost: 120, code: 'CH', body: [0.086, 0.086, 0.012] },
  { id: 'point-fridge', name: 'Fridge point', group: 'Appliance points', mount: 'wall', height: 0.3, cost: 110, code: 'FR', body: [0.086, 0.086, 0.012] },
  { id: 'point-washer', name: 'Washer / dryer point', group: 'Appliance points', mount: 'wall', height: 1.2, cost: 130, code: 'WM', body: [0.146, 0.086, 0.012] },
  { id: 'point-heater', name: 'Water heater point + isolator', group: 'Appliance points', mount: 'wall', height: 2.0, cost: 180, code: 'WH', body: [0.086, 0.146, 0.015], hint: 'The isolator switch usually sits outside the bathroom.' },

  { id: 'switch-1', name: '1-gang switch', group: 'Switches', mount: 'wall', height: 1.2, cost: 60, code: 'S1', body: [0.086, 0.086, 0.01] },
  { id: 'switch-2', name: '2-gang switch', group: 'Switches', mount: 'wall', height: 1.2, cost: 70, code: 'S2', body: [0.086, 0.086, 0.01] },
  { id: 'switch-3', name: '3-gang switch', group: 'Switches', mount: 'wall', height: 1.2, cost: 80, code: 'S3', body: [0.146, 0.086, 0.01] },
  { id: 'switch-2way', name: '2-way switch', group: 'Switches', mount: 'wall', height: 1.2, cost: 95, code: '2W', body: [0.086, 0.086, 0.01], hint: 'Pair it with a second 2-way switch, e.g. at the bedroom door and the bedside.' },

  { id: 'light-down', name: 'Downlight', group: 'Lighting', mount: 'ceiling', height: 0, cost: 85, code: 'DL', body: [0.12, 0.02, 0.12] },
  { id: 'light-pendant', name: 'Pendant light', group: 'Lighting', mount: 'ceiling', height: 0, cost: 220, code: 'PL', body: [0.4, 0.3, 0.4], hint: 'Hang it about 750 mm above a dining table.' },
  { id: 'light-fan', name: 'Ceiling fan with light', group: 'Lighting', mount: 'ceiling', height: 0, cost: 420, code: 'CF', body: [1.3, 0.3, 1.3], hint: 'Keep blades at least 2.1 m above the floor.' },
  { id: 'light-strip', name: 'LED strip point', group: 'Lighting', mount: 'ceiling', height: 0, cost: 120, code: 'LS', body: [0.3, 0.02, 0.03] },

  { id: 'ac-indoor', name: 'Aircon fan coil', group: 'Aircon', mount: 'wall', height: 2.25, cost: 1100, code: 'AC', body: [0.9, 0.29, 0.22], hint: 'Keep it clear of wardrobes and aim the airflow along the room, not straight at the bed.' },
  { id: 'ac-condenser', name: 'Aircon condenser', group: 'Aircon', mount: 'floor', height: 0, cost: 1800, code: 'CU', body: [0.85, 0.6, 0.33], hint: 'Goes on the A/C ledge. One multi-split condenser can run up to 4 fan coils.' },

  { id: 'data-lan', name: 'LAN point', group: 'Data', mount: 'wall', height: 0.3, cost: 120, code: 'LAN', body: [0.086, 0.086, 0.012] },
  { id: 'data-tv', name: 'TV point', group: 'Data', mount: 'wall', height: 0.3, cost: 100, code: 'TV', body: [0.086, 0.086, 0.012] },
  { id: 'data-router', name: 'Wi-Fi router spot', group: 'Data', mount: 'wall', height: 0.3, cost: 0, code: 'WF', body: [0.2, 0.04, 0.15], hint: 'Best near the fibre termination point, as central as possible.' },
]

export const FIXTURE_GROUPS: FixtureGroup[] = ['Power', 'Appliance points', 'Switches', 'Lighting', 'Aircon', 'Data']

const byId = new Map(FIXTURES.map((f) => [f.id, f]))
export const fixtureDef = (id: string) => byId.get(id)

export const isLight = (type: string) => fixtureDef(type)?.group === 'Lighting'
export const isSwitch = (type: string) => fixtureDef(type)?.group === 'Switches'

/** Light output used for the 3D preview, roughly by fitting type. */
export const LIGHT_POWER: Record<string, number> = { 'light-down': 1.3, 'light-pendant': 2.2, 'light-fan': 2.6, 'light-strip': 0.8 }

export const GROUP_COLOR: Record<FixtureGroup, string> = {
  Power: '#d9480f',
  'Appliance points': '#c2255c',
  Switches: '#1971c2',
  Lighting: '#e8a10c',
  Aircon: '#0c8599',
  Data: '#6741d9',
}
