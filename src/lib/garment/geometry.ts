import * as THREE from 'three'
import type { GarmentDims } from './params'

/**
 * Parametric garment geometry. The torso is a loft of superellipse
 * cross-sections with vertical drape folds displaced into the mesh; sleeves
 * are lofted tubes set into the shoulder; the collar follows the scooped
 * neckline ring. UVs are cylindrical per part so baked fabric/print
 * textures wrap the cloth exactly.
 */

const TAU = Math.PI * 2

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

/** Half-width of the garment body at normalized height t (0 hem → 1 neck). */
export function halfWidthAt(dims: GarmentDims, t: number): number {
  const tWaist = 0.42
  const tChest = 0.74
  if (t <= 0) return dims.hemHalfWidth * dims.hemFlare
  if (t < tWaist) return lerp(dims.hemHalfWidth * dims.hemFlare, dims.waistHalfWidth, smoothstep(0, tWaist, t))
  if (t < tChest) return lerp(dims.waistHalfWidth, dims.chestHalfWidth, smoothstep(tWaist, tChest, t))
  // yoke: chest → shoulder shelf (held) → steep drop into the neck
  const tShelf = 0.91
  if (t < tShelf) return lerp(dims.chestHalfWidth, dims.shoulderHalfWidth, smoothstep(tChest, tShelf, t))
  return lerp(dims.shoulderHalfWidth, dims.neckRadius * 1.15, smoothstep(tShelf, 1, t))
}

/** Depth (front-back half-extent) at height t. */
export function depthAt(dims: GarmentDims, t: number): number {
  const w = halfWidthAt(dims, t)
  return Math.max(0.16, w * dims.depthRatio * (t > 0.85 ? 0.85 : 1))
}

/** Height of the center line at t — includes the front neckline scoop. */
export function centerYAt(dims: GarmentDims, t: number): number {
  const y = lerp(dims.hemY, dims.shoulderY, t)
  return y
}

function superellipsePoint(phi: number, halfW: number, halfD: number, n: number): { x: number; z: number } {
  const s = Math.sin(phi)
  const c = Math.cos(phi)
  return {
    x: halfW * Math.sign(s) * Math.pow(Math.abs(s), 2 / n),
    z: halfD * Math.sign(c) * Math.pow(Math.abs(c), 2 / n),
  }
}

/** Deterministic pseudo-random for fold phase variation. */
function hash(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

export interface TorsoBuild {
  geometry: THREE.BufferGeometry
  /** Ring of points at the neckline (with front scoop applied). */
  neckRing: THREE.Vector3[]
}

export function buildTorso(dims: GarmentDims, opts: { rows?: number; cols?: number } = {}): TorsoBuild {
  const rows = opts.rows ?? 64
  const cols = opts.cols ?? 72
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let i = 0; i <= rows; i++) {
    const t = i / rows
    let y = centerYAt(dims, t)
    const halfW = halfWidthAt(dims, t)
    // front neckline scoop, applied to the top rows so the collar sits flush
    const scoopT = smoothstep(0.93, 1, t)
    const halfD = depthAt(dims, t)
    // drape folds: strongest in the lower half, fade toward the chest
    const foldEnv = dims.drapeAmp * (0.25 + 0.75 * smoothstep(0.6, 0.18, t))
    for (let j = 0; j <= cols; j++) {
      const u = j / cols
      const phi = Math.PI + u * TAU // u=0 back center → front at u=0.5
      const p = superellipsePoint(phi, halfW, halfD, 2.5)
      // front slightly fuller than back (natural chest drape)
      const frontBias = p.z > 0 ? 1.05 : 0.96
      let x = p.x
      let z = p.z * frontBias
      // radial drape folds
      const radial = Math.hypot(x, z) || 1
      const foldPhase = hash(Math.floor((u * dims.drapeCount) % dims.drapeCount) + 1) * TAU
      const fold =
        Math.cos(u * TAU * dims.drapeCount + foldPhase + Math.sin(t * 2.6) * 0.9) *
        foldEnv *
        (0.75 + 0.25 * Math.sin(u * TAU * dims.drapeCount * 2.3))
      const nx = x / radial
      const nz = z / radial
      x += nx * fold
      z += nz * fold
      // fine cloth irregularity
      const ripple = Math.sin(u * TAU * 23 + t * 9) * 0.0022 + Math.sin(t * 31 + u * 40) * 0.0016
      x += nx * ripple
      z += nz * ripple
      const frontness = Math.pow(Math.max(0, Math.cos(phi)), 1.4)
      y -= dims.neckScoop * frontness * scoopT
      positions.push(x, y, z)
      uvs.push(u, t)
    }
  }

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j
      const b = a + 1
      const c = a + cols + 1
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  // Neckline ring — the exact top row of the torso, collar follows it.
  const neckRing: THREE.Vector3[] = []
  const nr = halfWidthAt(dims, 1)
  for (let j = 0; j <= cols; j++) {
    const u = j / cols
    const phi = Math.PI + u * TAU
    const p = superellipsePoint(phi, nr, Math.max(0.16, nr * dims.depthRatio), 2.5)
    const frontness = Math.pow(Math.max(0, Math.cos(phi)), 1.4)
    const y = dims.shoulderY - dims.neckScoop * frontness
    neckRing.push(new THREE.Vector3(p.x, y, p.z))
  }

  return { geometry, neckRing }
}

export interface SleeveBuild {
  geometry: THREE.BufferGeometry
}

/** Lofted sleeve tube. side: +1 = wearer's left (+x), -1 = wearer's right. */
export function buildSleeve(dims: GarmentDims, side: 1 | -1, opts: { rows?: number; cols?: number } = {}): SleeveBuild {
  const rows = opts.rows ?? 26
  const cols = opts.cols ?? 36
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  // shoulder anchor sits inside the torso so the junction is hidden
  const shoulderX = side * (dims.shoulderHalfWidth - 0.075)
  const shoulderY = dims.shoulderY - dims.shoulderDrop * 0.4
  const dir = new THREE.Vector3(side * Math.sin(dims.sleeveAngle), -Math.cos(dims.sleeveAngle), 0).normalize()
  const N1 = new THREE.Vector3(side * Math.cos(dims.sleeveAngle), Math.sin(dims.sleeveAngle), 0).normalize() // radial, outward-ish
  const N2 = new THREE.Vector3(0, 0, 1) // around the arm, front-back

  for (let i = 0; i <= rows; i++) {
    const v = i / rows // 1 at shoulder, 0 at cuff — but build from cuff up
    const s = 1 - v // 0 at shoulder → 1 at cuff
    const r = lerp(dims.sleeveStartRadius * 1.06, dims.sleeveCuffRadius, Math.pow(s, 1.08)) * (s > 0.96 ? 0.97 : 1)
    const center = new THREE.Vector3(shoulderX, shoulderY, 0).addScaledVector(dir, dims.sleeveLength * s)
    // slight forward drape of the arm
    center.z += Math.sin(s * Math.PI) * 0.015
    for (let j = 0; j <= cols; j++) {
      const psi = (j / cols) * TAU
      // outer face (wearer-left: +x-ish) at u=0.5 → psi=π/2 with N1 outward
      const px = center.x + N1.x * r * Math.sin(psi) + N2.x * r * Math.cos(psi) * 0.92
      const py = center.y + N1.y * r * Math.sin(psi) + N2.y * r * Math.cos(psi) * 0.92
      const pz = center.z + N1.z * r * Math.sin(psi) + N2.z * r * Math.cos(psi) * 0.92
      positions.push(px, py, pz)
      // u: measured from outer face; mirror winding per side so prints
      // read left→right correctly from outside both arms.
      const delta = Math.atan2(Math.cos(psi), Math.sin(psi)) // 0 at outer, ± toward N2
      const u = side === 1 ? 0.5 + delta / TAU : 0.5 - delta / TAU
      uvs.push(((u % 1) + 1) % 1, v)
    }
  }

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j
      const b = a + 1
      const c = a + cols + 1
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return { geometry }
}

/** Ribbed collar band following the neckline ring. */
export function buildCollar(neckRing: THREE.Vector3[], opts: { ribs?: number; height?: number } = {}): THREE.BufferGeometry {
  const ribs = opts.ribs ?? 64
  const height = opts.height ?? 0.035
  const cols = neckRing.length - 1
  const rows = 5
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  const up = new THREE.Vector3(0, 1, 0)
  for (let i = 0; i <= rows; i++) {
    const v = i / rows
    const lift = height * v
    const flare = 1 + 0.03 * v
    for (let j = 0; j <= cols; j++) {
      const p = neckRing[j]
      const center = new THREE.Vector3(0, p.y, 0)
      const radial = new THREE.Vector3(p.x, 0, p.z)
      const rLen = radial.length() || 1
      const rib = 0.0035 * Math.cos((j / cols) * TAU * ribs)
      const r = radial.clone().normalize().multiplyScalar(rLen * flare + rib)
      const pos = center.clone().add(r)
      pos.y += lift
      positions.push(pos.x, pos.y, pos.z)
      uvs.push(j / cols, v)
    }
  }

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j
      const b = a + 1
      const c = a + cols + 1
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  void up
  return geometry
}

export interface GarmentBuild {
  torso: TorsoBuild
  sleeveL: SleeveBuild
  sleeveR: SleeveBuild
  collar: THREE.BufferGeometry
}

const cache = new Map<string, GarmentBuild>()

export function buildGarment(dims: GarmentDims, cacheKey: string): GarmentBuild {
  const hit = cache.get(cacheKey)
  if (hit) return hit
  const torso = buildTorso(dims)
  const build: GarmentBuild = {
    torso,
    sleeveL: buildSleeve(dims, 1),
    sleeveR: buildSleeve(dims, -1),
    collar: buildCollar(torso.neckRing),
  }
  if (cache.size > 12) {
    const first = cache.keys().next().value
    if (first) {
      const old = cache.get(first)
      old?.torso.geometry.dispose()
      old?.collar.dispose()
      cache.delete(first)
    }
  }
  cache.set(cacheKey, build)
  return build
}
