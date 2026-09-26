'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { TShirtModel } from '@/components/three/TShirtModel'
import { createNumberLayer, createShapeLayer, createTextLayer } from '@/lib/design/defaults'
import { useEditorStore } from '@/stores/editor-store'
import type { DesignDocument } from '@/lib/design/types'

/**
 * Lightweight interactive hero shirt — the same procedural geometry and
 * design pipeline as the editor. Drag to orbit; it also drifts slowly.
 * Rendered client-only via next/dynamic from the landing page.
 */

export function HeroInner() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0.5, 0.25, 3.3], fov: 35 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
      }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[2.5, 3, 2.5]} intensity={1.5} color="#FFF2E2" />
      <directionalLight position={[-2.5, 1, 1]} intensity={0.4} />
      <directionalLight position={[0, 2, -3]} intensity={0.8} color="#FF5A1F" />
      <HeroShirtWithDesign />
      <ContactShadows position={[0, -0.95, 0]} opacity={0.4} scale={5} blur={2.8} far={2} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 2.6}
        maxPolarAngle={Math.PI / 1.7}
        enableDamping
        dampingFactor={0.06}
      />
    </Canvas>
  )
}

function HeroShirtWithDesign() {
  const load = useEditorStore((s) => s.load)
  const group = useRef<THREE.Group>(null)

  useEffect(() => {
    const doc: DesignDocument = {
      id: 'hero',
      projectType: 'tshirt',
      version: 1,
      metadata: { title: 'AFRA Hero', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      garment: { color: '#1A1A1E', material: 'heavy-cotton', variant: 'mens-regular-half', opacity: 1 },
      layers: [
        createShapeLayer('front', 'double-stripe', { name: 'Chest stripes', y: 0.2, scale: 0.6, color: '#FF5A1F', secondaryColor: '#F7F5EF' }),
        createTextLayer('front', { name: 'AFRA', text: 'AFRA', y: 0.44, fontSize: 170, fontId: 'bebas', color: '#F7F5EF', letterSpacing: 0.18 }),
        createNumberLayer('back', '01', { color: '#F7F5EF', outline: { enabled: true, color: '#FF5A1F', width: 8 } }),
        createTextLayer('back', {
          name: 'Racing Division',
          text: 'Racing Division',
          y: 0.16,
          fontSize: 40,
          fontId: 'inter',
          weight: 700,
          uppercase: true,
          letterSpacing: 0.3,
          color: '#FF5A1F',
        }),
      ],
      scene: { background: 'dark', customBackground: '#0D0D0E', floor: false },
      lighting: { preset: 'dramatic', intensity: 1.05, shadow: false },
    }
    load('hero', 'AFRA', doc)
  }, [load])

  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.12
  })

  return (
    <group ref={group} position={[0, 0.05, 0]}>
      <TShirtModel />
    </group>
  )
}
