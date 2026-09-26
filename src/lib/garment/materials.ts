import * as THREE from 'three'

/**
 * Apparel material presets + procedural fabric texture maps.
 * Weave normal/roughness maps are generated once per type on the CPU and
 * cached — no image downloads, realistic cloth response via
 * MeshPhysicalMaterial sheen.
 */

export type WeaveType = 'jersey' | 'heavy' | 'knit' | 'fine' | 'micro' | 'soft' | 'washed'

export interface MaterialPreset {
  id: string
  name: string
  description: string
  roughness: number
  sheen: number
  sheenRoughness: number
  weave: WeaveType
  normalScale: number
  /** texture repeat per garment width */
  weaveScale: number
}

export const MATERIAL_PRESETS: MaterialPreset[] = [
  {
    id: 'cotton',
    name: 'Cotton',
    description: 'Classic combed cotton jersey.',
    roughness: 0.93,
    sheen: 0.22,
    sheenRoughness: 0.85,
    weave: 'jersey',
    normalScale: 0.26,
    weaveScale: 26,
  },
  {
    id: 'heavy-cotton',
    name: 'Heavy Cotton',
    description: 'Dense 240gsm knit with a structured hand.',
    roughness: 0.97,
    sheen: 0.15,
    sheenRoughness: 0.9,
    weave: 'heavy',
    normalScale: 0.34,
    weaveScale: 18,
  },
  {
    id: 'jersey-knit',
    name: 'Jersey Knit',
    description: 'Visible loop-knit texture, soft drape.',
    roughness: 0.9,
    sheen: 0.28,
    sheenRoughness: 0.8,
    weave: 'knit',
    normalScale: 0.38,
    weaveScale: 22,
  },
  {
    id: 'polyester',
    name: 'Polyester',
    description: 'Smooth technical weave, slight sheen.',
    roughness: 0.72,
    sheen: 0.26,
    sheenRoughness: 0.55,
    weave: 'fine',
    normalScale: 0.2,
    weaveScale: 34,
  },
  {
    id: 'performance',
    name: 'Performance Fabric',
    description: 'Micro-knit sport fabric, moisture-wicking look.',
    roughness: 0.62,
    sheen: 0.3,
    sheenRoughness: 0.45,
    weave: 'micro',
    normalScale: 0.16,
    weaveScale: 44,
  },
  {
    id: 'soft-cotton',
    name: 'Soft Cotton',
    description: 'Air-jet spun, brushed, very fine texture.',
    roughness: 0.95,
    sheen: 0.2,
    sheenRoughness: 0.88,
    weave: 'soft',
    normalScale: 0.18,
    weaveScale: 30,
  },
  {
    id: 'washed',
    name: 'Washed Cotton',
    description: 'Garment-dyed, irregular relaxed surface.',
    roughness: 0.98,
    sheen: 0.14,
    sheenRoughness: 0.95,
    weave: 'washed',
    normalScale: 0.3,
    weaveScale: 16,
  },
]

export function getMaterialPreset(id: string): MaterialPreset {
  return MATERIAL_PRESETS.find((m) => m.id === id) ?? MATERIAL_PRESETS[0]
}

interface WeaveMaps {
  normal: HTMLCanvasElement
  rough: HTMLCanvasElement
  shade: HTMLCanvasElement
}

const weaveCache = new Map<string, WeaveMaps>()

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Height-field → tangent-space normal map. */
function heightToNormal(height: Float32Array, size: number, strength: number): ImageData {
  const out = new ImageData(size, size)
  const d = out.data
  const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength
      const len = Math.hypot(dx, dy, 1)
      const i = (y * size + x) * 4
      d[i] = ((-dx / len) * 0.5 + 0.5) * 255
      d[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255
      d[i + 2] = (1 / len) * 0.5 * 255 + 127.5
      d[i + 3] = 255
    }
  }
  return out
}

function makeWeaveMaps(type: WeaveType, px: number): WeaveMaps {
  const key = `${type}-${px}`
  const hit = weaveCache.get(key)
  if (hit) return hit

  const size = 512
  const height = new Float32Array(size * size)
  const rough = document.createElement('canvas')
  rough.width = rough.height = size
  const rctx = rough.getContext('2d')!
  const rand = mulberry32(type.length * 977 + px)

  // base height: fine isotropic weave for everything
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let h = 0
      switch (type) {
        case 'jersey':
          // columns of stacked loops
          h = Math.sin((x * Math.PI * px) / size) * 0.5 + Math.sin((y * Math.PI * px * 1.4 + Math.sin(x * 0.6) * 2) / size) * 0.5
          break
        case 'knit': {
          // pronounced V-loop knit
          const lx = (x / size) * px
          const ly = (y / size) * px * 1.35
          const cx = (lx % 1) * 2 - 1
          const cy = (ly % 1) * 2 - 1
          h = Math.max(0, 1 - Math.hypot(cx * 0.9, cy)) - Math.max(0, 1 - Math.hypot(cx * 0.9 + 0.0, cy + 0.9)) * 0.7
          break
        }
        case 'heavy':
          h = Math.sin((x * Math.PI * px * 0.8) / size) * 0.6 + Math.sin((y * Math.PI * px * 0.9) / size) * 0.6
          break
        case 'fine':
          h = Math.sin((x * Math.PI * px * 1.6) / size) * 0.35 + Math.sin((y * Math.PI * px * 1.7) / size) * 0.35
          break
        case 'micro':
          h = Math.sin((x * Math.PI * px * 2.2) / size) * 0.25 + Math.sin((y * Math.PI * px * 2.3) / size) * 0.25
          break
        case 'soft':
          h = Math.sin((x * Math.PI * px) / size + Math.sin(y * 0.3) * 1.5) * 0.3 + Math.sin((y * Math.PI * px) / size) * 0.3
          break
        case 'washed':
          h = Math.sin((x * Math.PI * px * 0.9) / size) * 0.45 + Math.sin((y * Math.PI * px) / size) * 0.45
          break
      }
      height[y * size + x] = h
    }
  }

  // irregularity pass (slub / washed blotches)
  if (type === 'washed' || type === 'heavy' || type === 'soft') {
    const blobs = type === 'washed' ? 90 : 40
    for (let b = 0; b < blobs; b++) {
      const bx = rand() * size
      const by = rand() * size
      const br = 6 + rand() * 26
      const amp = (rand() - 0.5) * (type === 'washed' ? 0.9 : 0.4)
      for (let y = -br; y <= br; y++) {
        for (let x = -br; x <= br; x++) {
          const d = Math.hypot(x, y)
          if (d > br) continue
          const w = 1 - d / br
          const xi = Math.round((bx + x + size) % size)
          const yi = Math.round((by + y + size) % size)
          height[yi * size + xi] += amp * w * w
        }
      }
    }
  }

  const normalStrength = type === 'knit' ? 3.2 : type === 'heavy' ? 2.4 : 1.8
  const normalData = heightToNormal(height, size, normalStrength)
  const normal = document.createElement('canvas')
  normal.width = normal.height = size
  normal.getContext('2d')!.putImageData(normalData, 0, 0)

  // roughness map: mid-gray base with weave variation + specks
  const rimg = rctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const h = height[y * size + x]
      const v = Math.min(255, Math.max(0, 150 + h * 34 + (rand() - 0.5) * 26))
      const i = (y * size + x) * 4
      rimg.data[i] = v
      rimg.data[i + 1] = v
      rimg.data[i + 2] = v
      rimg.data[i + 3] = 255
    }
  }
  rctx.putImageData(rimg, 0, 0)

  // grayscale shade canvas — multiplied over the baked color so prints and
  // fabric share the same woven micro-contrast
  const shade = document.createElement('canvas')
  shade.width = shade.height = size
  const simg = shade.getContext('2d')!.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const h = height[y * size + x]
      const v = Math.min(255, Math.max(0, 242 + h * 22))
      const i = (y * size + x) * 4
      simg.data[i] = v
      simg.data[i + 1] = v
      simg.data[i + 2] = v
      simg.data[i + 3] = 255
    }
  }
  shade.getContext('2d')!.putImageData(simg, 0, 0)

  const maps = { normal, rough, shade }
  if (weaveCache.size > 16) weaveCache.clear()
  weaveCache.set(key, maps)
  return maps
}

export interface FabricMaps {
  normalMap: THREE.CanvasTexture
  roughnessMap: THREE.CanvasTexture
  /** Grayscale canvases for baking (not GPU textures). */
  shade: HTMLCanvasElement
  rough: HTMLCanvasElement
}

const textureCache = new Map<string, FabricMaps>()

export function getWeaveTextures(type: WeaveType, weaveScale: number): FabricMaps {
  const key = `${type}-${weaveScale}`
  const hit = textureCache.get(key)
  if (hit) return hit
  const maps = makeWeaveMaps(type, weaveScale)
  const normalMap = new THREE.CanvasTexture(maps.normal)
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping
  normalMap.colorSpace = THREE.NoColorSpace
  const roughnessMap = new THREE.CanvasTexture(maps.rough)
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping
  roughnessMap.colorSpace = THREE.NoColorSpace
  // tile the weave so threads stay fine-grain instead of stretching into bands
  const rep = Math.max(2, Math.round(90 / weaveScale))
  normalMap.repeat.set(rep, rep * 1.35)
  roughnessMap.repeat.set(rep, rep * 1.35)
  const out = { normalMap, roughnessMap, shade: maps.shade, rough: maps.rough }
  textureCache.set(key, out)
  return out
}

export function disposeWeaveTextures() {
  for (const t of textureCache.values()) {
    t.normalMap.dispose()
    t.roughnessMap.dispose()
  }
  textureCache.clear()
}
