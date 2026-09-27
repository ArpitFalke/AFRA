import * as THREE from 'three'
import type { GarmentDims } from './params'

/**
 * Panel-based garment construction — the way real apparel is cut:
 *
 * - BODY: two curved cloth sheets (front + back) running hem → shoulder.
 *   Each panel's top edge IS the shoulder line, sloping down from the neck
 *   to the shoulder tip (front dips for the crew scoop, back is higher).
 *   Panels meet at the side seams (z → 0 at the edges) — a closed silhouette
 *   with no horizontal shelf and no visible top face.
 * - SLEEVES: set-in tubes whose first rings match the armhole oval (shoulder
 *   seam point above, underarm point below) then bend outward-down.
 * - COLLAR: ribbed rolled band following the neckline between the panels.
 *
 * Every panel carries clean per-panel UVs, so design zones are simple
 * rectangles on the panel texture (no wrap-around seams).
 */

const TAU = Math.PI * 2

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function hash(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** Body half-width at normalized body height t (0 hem → 1 shoulder line). */
export function halfWidthAt(dims: GarmentDims, t: number): number {
  const tWaist = 0.42
  const tChest = 0.74
  if (t <= 0) return dims.hemHalfWidth * dims.hemFlare
  if (t < tWaist) return lerp(dims.hemHalfWidth * dims.hemFlare, dims.waistHalfWidth, smoothstep(0, tWaist, t))
  if (t < tChest) return lerp(dims.waistHalfWidth, dims.chestHalfWidth, smoothstep(tWaist, tChest, t))
  return lerp(dims.chestHalfWidth, dims.shoulderHalfWidth, smoothstep(tChest, 1, t))
}

/** Body depth (front-back half-extent) at height t. */
export function depthAt(dims: GarmentDims, t: number): number {
  return Math.max(0.15, halfWidthAt(dims, t) * dims.depthRatio)
}

/** The sloped shoulder line: y of the panel top edge at normalized xj (-1..1). */
export function shoulderLineY(dims: GarmentDims, xj: number, isBack: boolean): number {
  const neckY = dims.shoulderY + dims.neckRadius * 0.35
  const tipY = dims.shoulderY - dims.shoulderDrop * 0.55
  const slope = Math.pow(Math.min(1, Math.abs(xj)), 1.25)
  let y = lerp(neckY, tipY, slope)
  if (!isBack) y -= dims.neckScoop * Math.pow(Math.max(0, 1 - Math.abs(xj) * 2.4), 2)
  return y
}

/** Default neckline half-width (normalized xj); jerseys override per sport. */
const DEFAULT_NECK_XJ = 0.3

/** Cloth curvature: z offset across the panel (0 at side seams, full at center). */
function panelCurve(xj: number, depth: number, bias: number): number {
  const c = Math.max(0, 1 - Math.pow(Math.abs(xj), 2.35))
  return depth * Math.pow(c, 0.62) * bias
}

export interface BodyPanels {
  front: THREE.BufferGeometry
  back: THREE.BufferGeometry
  /** Neck opening ring: front dip + back rise, for the collar. */
  neckRing: THREE.Vector3[]
}

export function buildBody(dims: GarmentDims, opts: { rows?: number; cols?: number } = {}): BodyPanels {
  const rows = opts.rows ?? 60
  const cols = opts.cols ?? 64

  const build = (isBack: boolean): THREE.BufferGeometry => {
    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []
    const bias = isBack ? 0.94 : 1.06

    for (let i = 0; i <= rows; i++) {
      const v = i / rows // 0 hem → 1 shoulder line
      const halfW = halfWidthAt(dims, v)
      const depth = depthAt(dims, v)
      for (let j = 0; j <= cols; j++) {
        const xj = (j / cols) * 2 - 1 // -1 .. 1 across the body
        const u = (xj + 1) / 2
        const x = xj * halfW
        const topY = shoulderLineY(dims, xj, isBack)
        const y = lerp(dims.hemY, topY, v)

        const curveSign = isBack ? -1 : 1
        let z = curveSign * panelCurve(xj, depth, bias)

        // drape folds — vertical soft waves, strongest in the lower half
        const foldEnv = dims.drapeAmp * (0.3 + 0.7 * smoothstep(0.62, 0.15, v))
        const foldPhase = hash(Math.floor(((xj + 1) * 0.5 * dims.drapeCount) % dims.drapeCount) + 1) * TAU
        const fold =
          Math.cos((xj + 1) * 0.5 * TAU * dims.drapeCount + foldPhase + Math.sin(v * 2.4) * 0.8) *
          foldEnv *
          (0.7 + 0.3 * Math.sin((xj + 1) * 0.5 * TAU * dims.drapeCount * 2.2))
        z += curveSign * Math.max(0, fold) * Math.max(0, panelCurve(xj, 1, 1))

        // fine cloth irregularity
        const ripple = Math.sin((xj + 1) * 23 + v * 9) * 0.0018 + Math.sin(v * 29 + (xj + 1) * 37) * 0.0014
        z += curveSign * ripple

        positions.push(x, y, z)
        uvs.push(u, v)
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
    return geometry
  }

  // Neckline ring: the exact top edges of the two panels between the neck
  // boundaries — front half (with scoop), then back half (higher).
  const neckXj = dims.neckWidthFrac ?? DEFAULT_NECK_XJ
  const neckRing: THREE.Vector3[] = []
  const neckCols = 48
  for (let j = 0; j <= neckCols; j++) {
    const tt = j / neckCols
    const front = tt <= 0.5
    const f = front ? tt / 0.5 : (tt - 0.5) / 0.5
    const xj = lerp(-neckXj, neckXj, front ? f : 1 - f)
    const halfW = halfWidthAt(dims, 1)
    const depth = depthAt(dims, 1)
    const y = shoulderLineY(dims, xj, !front)
    const z = front ? panelCurve(xj, depth, 1.06) : -panelCurve(xj, depth, 0.94)
    neckRing.push(new THREE.Vector3(xj * halfW, y, z))
  }

  return { front: build(false), back: build(true), neckRing }
}

export interface SleeveBuild {
  geometry: THREE.BufferGeometry
}

/**
 * Set-in sleeve. First rings form the vertical armhole oval (shoulder-seam
 * point at the top, underarm point at the bottom), then the tube bends
 * outward-down with bicep volume, underarm wrinkles and a cuff lip.
 */
export function buildSleeve(dims: GarmentDims, side: 1 | -1, opts: { rows?: number; cols?: number } = {}): SleeveBuild {
  const rows = opts.rows ?? 34
  const cols = opts.cols ?? 40
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  const anchorX = side * (dims.shoulderHalfWidth - 0.05)
  const seamY = dims.shoulderY - dims.shoulderDrop * 0.12
  const underY = dims.shoulderY - dims.shoulderDrop * 2.1
  const anchorY = (seamY + underY) / 2
  const dir = new THREE.Vector3(side * Math.sin(dims.sleeveAngle), -Math.cos(dims.sleeveAngle), 0).normalize()
  const N1Arm = new THREE.Vector3(side * Math.cos(dims.sleeveAngle), Math.sin(dims.sleeveAngle), 0).normalize()
  const N1Hole = new THREE.Vector3(side, 0, 0)
  const N2 = new THREE.Vector3(0, 0, 1)

  const seamTarget = new THREE.Vector3(side * (dims.shoulderHalfWidth - 0.14), dims.shoulderY - dims.shoulderDrop * 0.42, 0.02)
  const underTarget = new THREE.Vector3(side * (dims.chestHalfWidth - 0.02), underY, -0.01)

  for (let i = 0; i <= rows; i++) {
    const v = i / rows // 1 at shoulder, 0 at cuff
    const s = 1 - v
    const r =
      lerp(dims.sleeveStartRadius, dims.sleeveCuffRadius, Math.pow(s, 0.92)) *
      (1 + 0.1 * Math.sin(Math.min(1, s * 2.2) * Math.PI)) *
      (s > 0.965 ? 0.97 : 1)
    const center = new THREE.Vector3(anchorX, anchorY, 0).addScaledVector(dir, dims.sleeveLength * s)
    center.z += Math.sin(s * Math.PI) * 0.018

    const w = smoothstep(0.4, 0, s)
    const N1 = new THREE.Vector3().lerpVectors(N1Hole, N1Arm, smoothstep(0, 0.55, s)).normalize()

    for (let j = 0; j <= cols; j++) {
      const psi = (j / cols) * TAU
      const sn = Math.sin(psi)
      const cs = Math.cos(psi)

      const rr = r
      let px = center.x + N1.x * rr * sn + N2.x * rr * cs * 0.92
      let py = center.y + N1.y * rr * sn + N2.y * rr * cs * 0.92
      let pz = center.z + N1.z * rr * sn + N2.z * rr * cs * 0.92

      if (sn >= 0) {
        const pull = w * Math.pow(sn, 1.2) * 0.85
        px = lerp(px, seamTarget.x, pull)
        py = lerp(py, seamTarget.y, pull)
        pz = lerp(pz, seamTarget.z, pull)
      } else {
        const pull = w * Math.pow(-sn, 1.2) * 0.7
        px = lerp(px, underTarget.x, pull)
        py = lerp(py, underTarget.y, pull)
        pz = lerp(pz, underTarget.z, pull)
      }
      if (s < 0.55) {
        const under = Math.max(0, -sn)
        const wr = Math.sin(psi * 5 + s * 14) * 0.0045 * w * (0.4 + under)
        px += N1.x * wr
        py += N1.y * wr
      }

      positions.push(px, py, pz)
      const delta = Math.atan2(cs, sn)
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

/** Rolled rib collar following the neckline between the panels. */
export function buildCollar(neckRing: THREE.Vector3[], opts: { ribs?: number; height?: number } = {}): THREE.BufferGeometry {
  const ribs = opts.ribs ?? 46
  const height = opts.height ?? 0.055
  const cols = neckRing.length - 1
  const rows = 8
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let i = 0; i <= rows; i++) {
    const v = i / rows
    const lift = height * v - 0.012 * (1 - v)
    const flare = 1 + 0.06 * Math.sin(v * Math.PI * 0.85) - 0.025 * v
    for (let j = 0; j <= cols; j++) {
      const p = neckRing[j]
      const center = new THREE.Vector3(0, p.y, 0)
      const radial = new THREE.Vector3(p.x, 0, p.z)
      const rLen = radial.length() || 1
      const rib = 0.005 * Math.cos((j / cols) * TAU * ribs)
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
  return geometry
}

export interface GarmentBuild {
  bodyFront: THREE.BufferGeometry
  bodyBack: THREE.BufferGeometry
  sleeveL: SleeveBuild
  sleeveR: SleeveBuild
  collar: THREE.BufferGeometry
}

const cache = new Map<string, GarmentBuild>()

export function buildGarment(dims: GarmentDims, cacheKey: string): GarmentBuild {
  const hit = cache.get(cacheKey)
  if (hit) return hit
  const body = buildBody(dims)
  const build: GarmentBuild = {
    bodyFront: body.front,
    bodyBack: body.back,
    sleeveL: buildSleeve(dims, 1),
    sleeveR: buildSleeve(dims, -1),
    collar: buildCollar(body.neckRing),
  }
  if (cache.size > 12) {
    const first = cache.keys().next().value
    if (first) {
      const old = cache.get(first)
      old?.bodyFront.dispose()
      old?.bodyBack.dispose()
      old?.collar.dispose()
      cache.delete(first)
    }
  }
  cache.set(cacheKey, build)
  return build
}
