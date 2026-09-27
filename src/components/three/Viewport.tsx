'use client'

import { useEffect, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { TShirtModel } from './TShirtModel'
import { SneakerModel } from './SneakerModel'
import { useEditorStore } from '@/stores/editor-store'
import { StudioEnvironment } from './StudioEnvironment'
import { CameraRig } from './CameraRig'
import { ExportBridge } from './ExportBridge'
import { isWebGLAvailable } from './webgl'
import { ViewportFallback } from './ViewportFallback'

/** Re-renders shadow maps when the design scene changes. */
function ShadowRefresher() {
  const gl = useThree((s) => s.gl)
  const doc = useEditorStore((s) => s.doc)
  const lighting = useEditorStore((s) => s.doc.lighting)
  useEffect(() => {
    queueMicrotask(() => {
      gl.shadowMap.needsUpdate = true
    })
  }, [gl, doc, lighting])
  return null
}

export function Viewport({ interactive = true }: { interactive?: boolean }) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const projectType = useEditorStore((s) => s.doc.projectType)

  if (typeof document !== 'undefined' && !isWebGLAvailable()) {
    return <ViewportFallback />
  }

  return (
    <Canvas
      shadows
      gl={{ antialias: true, preserveDrawingBuffer: true, alpha: false }}
      camera={{ position: [1.95, 0.4, 2.15], fov: 38, near: 0.1, far: 60 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 0.95
        gl.shadowMap.type = THREE.PCFShadowMap
        // garment and lights are static relative to each other — render
        // shadow maps only when the scene actually changes
        gl.shadowMap.autoUpdate = false
        gl.shadowMap.needsUpdate = true
      }}
      dpr={[1, 1.5]}
    >
      <ExportBridge />
      <ShadowRefresher />
      <StudioEnvironment />
      <CameraRig controlsRef={controlsRef} />
      {projectType === "sneaker" ? <SneakerModel /> : <TShirtModel />}
      <OrbitControls
        ref={controlsRef}
        enabled={interactive}
        enablePan={false}
        minDistance={0.9}
        maxDistance={6}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI - 0.2}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  )
}
