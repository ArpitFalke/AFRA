'use client'

import { ContactShadows } from '@react-three/drei'
import { useEditorStore } from '@/stores/editor-store'

const PRESETS = {
  studio: { ambient: 0.32, key: 1.15, fill: 0.4, rim: 0.5 },
  dramatic: { ambient: 0.14, key: 1.55, fill: 0.18, rim: 0.85 },
  soft: { ambient: 0.5, key: 0.85, fill: 0.55, rim: 0.2 },
} as const

const BACKGROUNDS = {
  studio: '#17171a',
  dark: '#0d0d0e',
} as const

export function sceneBackgroundColor(scene: { background: string; customBackground: string }): string {
  if (scene.background === 'custom') return scene.customBackground
  return BACKGROUNDS[scene.background as keyof typeof BACKGROUNDS] ?? BACKGROUNDS.studio
}

export function StudioEnvironment() {
  const lighting = useEditorStore((s) => s.doc.lighting)
  const scene = useEditorStore((s) => s.doc.scene)
  const preset = PRESETS[lighting.preset] ?? PRESETS.studio
  const i = lighting.intensity
  const bg = sceneBackgroundColor(scene)

  return (
    <>
      <color attach="background" args={[bg]} />
      <ambientLight intensity={preset.ambient * i} />
      <directionalLight position={[2.4, 3, 2.6]} intensity={preset.key * i} color="#FFF6E8" />
      <directionalLight position={[-2.6, 1.4, 1.6]} intensity={preset.fill * i} color="#DCE4F2" />
      <directionalLight position={[0.5, 1.6, -3]} intensity={preset.rim * i} color="#FF5A1F" />
      {scene.floor && lighting.shadow && (
        <ContactShadows position={[0, -0.88, 0]} opacity={0.55} scale={5} blur={2.6} far={1.6} resolution={512} color="#000000" />
      )}
    </>
  )
}
