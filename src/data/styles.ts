import type { CeilingSpec, FloorSpec } from '../types/design'

// One-click design styles. A style sets paint, floors by room type, a ceiling treatment for the
// living room, and the finishes/fabrics of furniture already placed. Feature walls are left
// alone, since they're personal choices tied to particular walls.

export interface DesignStyle {
  id: string
  name: string
  blurb: string
  wall: string
  floors: { living: FloorSpec; bedroom: FloorSpec; wet: FloorSpec }
  livingCeiling?: CeilingSpec
  bedroomCeiling?: CeilingSpec
  /** Furniture finish for tables, beds and shelving. */
  wood: string
  /** Furniture finish for cabinets and built-ins. */
  cabinet: string
  /** Main upholstery (sofas, beds, rugs). */
  fabric: string
  /** Accent upholstery (chairs, stools). */
  accent: string
}

export const STYLES: DesignStyle[] = [
  {
    id: 'japandi',
    name: 'Japandi',
    blurb: 'Warm oak, soft greige and linen. Calm, low and uncluttered.',
    wall: '#efe9df',
    floors: { living: { finish: 'oak', size: 0.18 }, bedroom: { finish: 'oak', size: 0.18 }, wet: { finish: 'tile-warm', size: 0.6 } },
    livingCeiling: { style: 'cove', warmth: 2700 },
    wood: 'oak',
    cabinet: 'greige',
    fabric: 'oat',
    accent: 'stone',
  },
  {
    id: 'scandi',
    name: 'Scandinavian',
    blurb: 'Pale ash, crisp white walls and cosy textiles with a hint of blush.',
    wall: '#f4f1ea',
    floors: { living: { finish: 'ash', size: 0.18 }, bedroom: { finish: 'ash', size: 0.18 }, wet: { finish: 'tile-warm', size: 0.6 } },
    wood: 'oak',
    cabinet: 'white',
    fabric: 'stone',
    accent: 'blush',
  },
  {
    id: 'muji',
    name: 'Muji',
    blurb: 'Light timber, white and natural cotton. Simple and practical.',
    wall: '#efece6',
    floors: { living: { finish: 'oak', size: 0.12 }, bedroom: { finish: 'oak', size: 0.12 }, wet: { finish: 'tile-grey', size: 0.3 } },
    wood: 'oak',
    cabinet: 'white',
    fabric: 'cream',
    accent: 'oat',
  },
  {
    id: 'minimal',
    name: 'Modern Minimalist',
    blurb: 'Large-format tiles, flush white cabinets and a tight neutral palette.',
    wall: '#f4f1ea',
    floors: { living: { finish: 'tile-warm', size: 0.8 }, bedroom: { finish: 'ash', size: 0.24 }, wet: { finish: 'tile-warm', size: 0.8 } },
    livingCeiling: { style: 'lbox' },
    wood: 'oak',
    cabinet: 'white',
    fabric: 'stone',
    accent: 'charcoal',
  },
  {
    id: 'industrial',
    name: 'Industrial',
    blurb: 'Cement screed, dark walnut and black frames with rust accents.',
    wall: '#c9c9c4',
    floors: { living: { finish: 'screed' }, bedroom: { finish: 'walnut', size: 0.18 }, wet: { finish: 'tile-charcoal', size: 0.6 } },
    wood: 'walnut',
    cabinet: 'black',
    fabric: 'charcoal',
    accent: 'terracotta',
  },
  {
    id: 'luxe',
    name: 'Modern Luxe',
    blurb: 'Marble-look floors, walnut and warm cove lighting.',
    wall: '#ece3d3',
    floors: { living: { finish: 'marble', size: 0.9 }, bedroom: { finish: 'walnut', size: 0.24 }, wet: { finish: 'marble', size: 0.6 } },
    livingCeiling: { style: 'cove', warmth: 3000 },
    bedroomCeiling: { style: 'cove', warmth: 2700 },
    wood: 'walnut',
    cabinet: 'greige',
    fabric: 'cream',
    accent: 'navy',
  },
  {
    id: 'wabi',
    name: 'Wabi-sabi',
    blurb: 'Earthy limewash tones, screed and terrazzo. Imperfect and handmade.',
    wall: '#d9cbb8',
    floors: { living: { finish: 'screed' }, bedroom: { finish: 'oak', size: 0.24 }, wet: { finish: 'terrazzo' } },
    wood: 'oak',
    cabinet: 'greige',
    fabric: 'oat',
    accent: 'olive',
  },
  {
    id: 'midcentury',
    name: 'Mid-century',
    blurb: 'Walnut herringbone, sage cabinets and terracotta upholstery.',
    wall: '#ece3d3',
    floors: { living: { finish: 'herringbone' }, bedroom: { finish: 'walnut', size: 0.18 }, wet: { finish: 'terrazzo' } },
    wood: 'walnut',
    cabinet: 'sage',
    fabric: 'terracotta',
    accent: 'olive',
  },
]

export const styleById = (id: string) => STYLES.find((s) => s.id === id)
