'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { ContactShadows } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEditorStore } from '@/stores/editor-store'

const PRESETS = {
  studio: { ambient: 0.22, key: 1.05, fill: 0.32, rim: 0.5, env: 0.85 },
  dramatic: { ambient: 0.08, key: 1.5, fill: 0.12, rim: 0.9, env: 0.5 },
  soft: { ambient: 0.4, key: 0.75, fill: 0.5, rim: 0.2, env: 1.1 },
} as const

const BACKGROUNDS = {
  studio: '#17171a',
  dark: '#0d0d0e',
} as const

export function sceneBackgroundColor(scene: { background: string; customBackground: string }): string {
  if (scene.background === 'custom') return scene.customBackground
  return BACKGROUNDS[scene.background as keyof typeof BACKGROUNDS] ?? BACKGROUNDS.studio
}

/**
 * A dark product-studio environment: black shell with a few dim softboxes.
 * RoomEnvironment's default light boxes are far too bright for dark fabric —
 * this gives controlled, realistic highlights without washing the garment out.
 */
function buildDarkStudioScene(): THREE.Scene {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)
  const panel = (w: number, h: number, intensity: number, color: number, pos: [number, number, number]) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }),
    )
    mesh.position.set(...pos)
    mesh.lookAt(0, 0, 0)
    scene.add(mesh)
  }
  panel(3.2, 2.2, 5.5, 0xfff2e0, [3.2, 2.6, 2.4]) // key softbox
  panel(2.2, 3, 1.1, 0xdce4f2, [-3.2, 1.4, 1.6]) // cool fill
  panel(1.6, 3, 3.2, 0xffd9c4, [0.4, 2.2, -3.4]) // warm rim
  panel(4.5, 1.4, 4.2, 0xffffff, [0, 4, 1.2]) // top strip — lights the yoke/shoulders
  return scene
}

/** Image-based studio lighting (custom dark studio → PMREM), no downloads. */
function StudioIBL() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const cleanupRef = useRef<{ run: () => void } | null>(null)

  useEffect(() => {
    let disposed = false
    const setup = async () => {
      try {
        const envScene = buildDarkStudioScene()
        const pmrem = new THREE.PMREMGenerator(gl)
        const tex = pmrem.fromScene(envScene, 0.04).texture
        pmrem.dispose()
        if (disposed) {
          tex.dispose()
          return
        }
        scene.environment = tex
        cleanupRef.current = { run: () => tex.dispose() }
      } catch (err) {
        console.warn('[afra:ibl] environment lighting unavailable', err)
      }
    }
    // deferred — never mutate the scene during the effect itself
    queueMicrotask(() => void setup())
    return () => {
      disposed = true
      cleanupRef.current?.run()
      cleanupRef.current = null
      scene.environment = null
    }
  }, [gl, scene])

  return null
}

/** Soft studio floor with a faint reflective sheen. */
function StudioFloor() {
  const bg = useEditorStore((s) => s.doc.scene.background)
  const custom = useEditorStore((s) => s.doc.scene.customBackground)
  const base = sceneBackgroundColor({ background: bg, customBackground: custom })
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.92, 0]} receiveShadow={false}>
      <circleGeometry args={[2.4, 48]} />
      <meshStandardMaterial color={base} roughness={0.38} metalness={0.05} envMapIntensity={0.55} transparent opacity={0.65} />
    </mesh>
  )
}

export function StudioEnvironment() {
  const doc = useEditorStore((s) => s.doc)
  const lighting = useEditorStore((s) => s.doc.lighting)
  const scene = useEditorStore((s) => s.doc.scene)
  const preset = PRESETS[lighting.preset] ?? PRESETS.studio
  const i = lighting.intensity
  const bg = sceneBackgroundColor(scene)

  return (
    <>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 6, 14]} />
      <StudioIBL />
      <ambientLight intensity={preset.ambient * i} />
      <directionalLight
        position={[2.4, 3, 2.6]}
        intensity={preset.key * i}
        color="#FFF6E8"
        castShadow={lighting.shadow}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={12}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-2.6, 1.4, 1.6]} intensity={preset.fill * i} color="#DCE4F2" />
      <directionalLight position={[0.5, 1.6, -3]} intensity={preset.rim * i} color="#FF5A1F" />
      {scene.floor && lighting.shadow && (
        <ContactShadows
          key={`${doc.garment.variant}-${doc.layers.length}`}
          frames={1}
          position={[0, -0.9, 0]}
          opacity={0.55}
          scale={5.5}
          blur={2.8}
          far={1.8}
          resolution={384}
          color="#000000"
        />
      )}
      {scene.floor && <StudioFloor />}
    </>
  )
}
