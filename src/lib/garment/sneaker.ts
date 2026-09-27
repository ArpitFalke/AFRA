import * as THREE from 'three'

/**
 * Parametric low-top sneaker with clearly separated regions:
 * outsole, midsole, upper (toe/vamp/side/heel/logo as UV regions),
 * tongue, laces, collar. Region colors/materials are editable per part.
 */

const TAU = Math.PI * 2

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Foot outline: half-width at length t (0 heel → 1 toe). */
function footHalfWidth(t: number): number {
  // heel narrow-ish, midfoot waisted, forefoot wide, toe rounded
  return 0.32 * (0.78 + 0.34 * Math.sin(Math.PI * Math.min(1, 0.18 + t * 0.92))) * (1 - 0.22 * smoothstep(0.82, 1, t))
}

function footOutlinePoint(t: number, side: number): { x: number; z: number } {
  const halfW = footHalfWidth(t)
  const round = 1 - 0.35 * smoothstep(0.85, 1, t)
  return { x: side * halfW * round, z: lerp(-0.95, 0.95, t) }
}

/** Extruded flat ring mesh from the foot outline between two heights. */
function soleSlab(yBottom: number, yTop: number, flare: number, segments = 48): THREE.BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const hw = footHalfWidth(t) * flare
    for (const side of [-1, 1]) {
      const p = footOutlinePoint(t, side)
      positions.push(p.x * (flare === 1 ? 1 : flare), yBottom, p.z)
      uvs.push(t, 0)
      positions.push(p.x * (flare === 1 ? 1 : flare), yTop, p.z)
      uvs.push(t, 1)
    }
  }
  // build quads between consecutive segment pairs (side -1 ring then side 1 ring interleaved)
  for (let i = 0; i < segments; i++) {
    const a = i * 4
    const b = a + 1
    const c = a + 4
    const d = c + 1
    indices.push(a, c, b, b, c, d)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/** Top face of the sole (flat cap). */
function soleCap(y: number, segments = 48): THREE.BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const centerIndex = positions.push(0, y, 0) - 1
  uvs.push(0.5, 0.5)
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const p = footOutlinePoint(t, 1)
    const p2 = footOutlinePoint(t, -1)
    positions.push(p.x, y, p.z)
    uvs.push(t, 1)
    positions.push(p2.x, y, p2.z)
    uvs.push(t, 0)
  }
  for (let i = 0; i < segments; i++) {
    const a = centerIndex
    const b = 1 + i * 2
    const c = b + 1
    const d = b + 2
    indices.push(a, b, c, a, c, d)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/** The upper: a loft from the sole rim to the topline, per-angle height. */
function buildUpper(segments = 56, rows = 22): THREE.BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let i = 0; i <= rows; i++) {
    const v = i / rows // 0 at sole → 1 at topline
    for (let j = 0; j <= segments; j++) {
      const t = j / segments // 0 heel → 1 toe
      const side = t <= 0.5 ? -1 : 1
      const sweep = t <= 0.5 ? 0.25 + t * 1.5 : 1.75 - (t - 0.5) * 1.5
      void side
      // topline height around the foot: low toe, high collar/heel
      const topY =
        0.16 +
        0.1 * smoothstep(0.3, 0.95, 1 - Math.abs(t - 0.5) * 1.2) * smoothstep(0.02, 0.3, 1 - t) +
        0.42 * smoothstep(0.45, 0.02, t) // heel/ankle rise
      const wallH = lerp(0.02, topY, Math.pow(v, 0.85))
      const base = 0.1
      const p = footOutlinePoint(t, sweep > 1 ? -1 : 1)
      const flare = 1 + 0.06 * Math.sin(v * Math.PI)
      const x = p.x * flare * (1 - 0.12 * v)
      const z = p.z * (1 - 0.06 * v)
      const y = base + wallH
      positions.push(x, y, z)
      uvs.push(t, v)
    }
  }

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * (segments + 1) + j
      const b = a + 1
      const c = a + segments + 1
      const d = c + 1
      indices.push(a, b, c, b, d, c)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/** Tongue: curved wedge rising from the vamp throat. */
function buildTongue(): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(0.24, 0.34, 8, 10)
  const pos = geometry.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    pos.setZ(i, Math.sin((y + 0.25) * 2.4) * 0.1 - Math.abs(x) * 0.22)
    pos.setY(i, y + 0.18)
  }
  geometry.translate(0, 0.24, 0.02)
  geometry.rotateX(-0.55)
  geometry.translate(0, 0.22, 0.26)
  geometry.computeVertexNormals()
  return geometry
}

/** Laces: 5 curved bars across the throat. */
function buildLaces(): THREE.BufferGeometry {
  const geos: THREE.BufferGeometry[] = []
  for (let i = 0; i < 5; i++) {
    const g = new THREE.TorusGeometry(0.155 - i * 0.008, 0.016, 8, 24, Math.PI)
    g.rotateX(Math.PI / 2 + 0.3)
    g.scale(1, 1, 1.35)
    g.translate(0, 0.38 + i * 0.062, 0.32 - i * 0.05)
    geos.push(g)
  }
  const merged = mergeGeometries(geos)
  geos.forEach((g) => g.dispose())
  return merged
}

function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let vCount = 0
  let iCount = 0
  for (const g of geos) {
    vCount += g.attributes.position.count
    iCount += g.index ? g.index.count : 0
  }
  const positions = new Float32Array(vCount * 3)
  const uvs = new Float32Array(vCount * 2)
  const indices = new Uint32Array(iCount)
  let vOff = 0
  let uOff = 0
  let iOff = 0
  for (const g of geos) {
    const pa = g.attributes.position as THREE.BufferAttribute
    positions.set(pa.array as Float32Array, vOff * 3)
    if (g.attributes.uv) uvs.set((g.attributes.uv as THREE.BufferAttribute).array as Float32Array, uOff * 2)
    if (g.index) {
      const idx = g.index.array as ArrayLike<number>
      for (let i = 0; i < g.index.count; i++) indices[iOff + i] = idx[i] + vOff
      iOff += g.index.count
    }
    vOff += pa.count
    uOff += pa.count
    g.dispose()
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geometry.setIndex(new THREE.BufferAttribute(indices, 1))
  geometry.computeVertexNormals()
  return geometry
}

/** Padded ankle collar ring. */
function buildAnkleCollar(): THREE.BufferGeometry {
  const g = new THREE.TorusGeometry(0.21, 0.045, 10, 32, Math.PI * 1.15)
  g.rotateY(Math.PI / 2)
  g.rotateZ(-0.15)
  g.scale(1, 1.25, 1.15)
  g.translate(0.0, 0.56, -0.16)
  return g
}

export interface SneakerBuild {
  outsole: THREE.BufferGeometry
  midsole: THREE.BufferGeometry
  upper: THREE.BufferGeometry
  tongue: THREE.BufferGeometry
  laces: THREE.BufferGeometry
  ankleCollar: THREE.BufferGeometry
  soleCap: THREE.BufferGeometry
}

const cache = new Map<string, SneakerBuild>()

export function buildSneaker(cacheKey = 'sneaker-low'): SneakerBuild {
  const hit = cache.get(cacheKey)
  if (hit) return hit
  const build: SneakerBuild = {
    outsole: soleSlab(0.0, 0.055, 1.02),
    midsole: soleSlab(0.055, 0.115, 1.0),
    upper: buildUpper(),
    tongue: buildTongue(),
    laces: buildLaces(),
    ankleCollar: buildAnkleCollar(),
    soleCap: soleCap(0.115),
  }
  cache.set(cacheKey, build)
  return build
}

/** Sneaker part registry — every part is independently colorable. */
export const SNEAKER_PARTS = ['outsole', 'midsole', 'upper', 'tongue', 'laces', 'ankleCollar'] as const
export type SneakerPart = (typeof SNEAKER_PARTS)[number]

export const SNEAKER_PART_LABELS: Record<SneakerPart, string> = {
  outsole: 'Outsole',
  midsole: 'Midsole',
  upper: 'Upper',
  tongue: 'Tongue',
  laces: 'Laces',
  ankleCollar: 'Collar',
}

export const SNEAKER_DEFAULT_COLORS: Record<SneakerPart, string> = {
  outsole: '#18181B',
  midsole: '#E8E4DA',
  upper: '#F0EDE4',
  tongue: '#F0EDE4',
  laces: '#F0EDE4',
  ankleCollar: '#3A3A40',
}
