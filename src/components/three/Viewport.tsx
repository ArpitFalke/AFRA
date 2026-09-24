'use client'

import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { TShirtModel } from './TShirtModel'
import { DesignSurface } from './DesignSurface'
import { StudioEnvironment } from './StudioEnvironment'
import { CameraRig } from './CameraRig'
import { ExportBridge } from './ExportBridge'
import { isWebGLAvailable } from './webgl'
import { ViewportFallback } from './ViewportFallback'

export function Viewport({ interactive = true }: { interactive?: boolean }) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)

  if (typeof document !== 'undefined' && !isWebGLAvailable()) {
    return <ViewportFallback />
  }

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true, alpha: false }}
      camera={{ position: [1.7, 0.55, 2.5], fov: 38, near: 0.1, far: 60 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
      }}
    >
      <ExportBridge />
      <StudioEnvironment />
      <CameraRig controlsRef={controlsRef} />
      <group>
        <TShirtModel />
        <DesignSurface side="front" position={[0, 0.26, 0.216]} />
        <DesignSurface side="back" position={[0, 0.26, -0.216]} rotation={[0, Math.PI, 0]} />
      </group>
      <OrbitControls
        ref={controlsRef}
        enabled={interactive}
        enablePan={false}
        minDistance={1.2}
        maxDistance={6}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI - 0.15}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  )
}
