'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Vector3 } from 'three'
import { useEditorStore } from '@/stores/editor-store'

export type CameraView = 'front' | 'back' | 'left' | 'right' | 'top' | 'product' | 'closeup' | 'orbit'

/** Camera presets: Front, Back, Left, Right, Top, Product (3/4), Close-up, 360°. */
export const VIEW_POSITIONS: Record<CameraView, [number, number, number]> = {
  front: [0, 0.14, 2.75],
  back: [0, 0.14, -2.75],
  left: [2.75, 0.14, 0],
  right: [-2.75, 0.14, 0],
  top: [0, 3.0, 0.01],
  product: [1.95, 0.4, 2.15],
  closeup: [0.32, 0.45, 1.5],
  orbit: [1.7, 0.55, 2.5],
}

const TARGET = new Vector3(0, 0.05, 0)

/**
 * Drives the camera to the active preset with a smooth ease, applies zoom
 * pulses, and hands the OrbitControls instance to the rest of the app.
 */
export function CameraRig({ controlsRef }: { controlsRef: React.RefObject<OrbitControlsImpl | null> }) {
  const camera = useThree((s) => s.camera)
  const view = useEditorStore((s) => s.view)
  const zoomPulse = useEditorStore((s) => s.zoomPulse)
  const anim = useRef<{ from: Vector3; to: Vector3; t: number } | null>(null)
  const lastPulse = useRef(0)

  useEffect(() => {
    const to = new Vector3(...VIEW_POSITIONS[view])
    anim.current = { from: camera.position.clone(), to, t: 0 }
  }, [view, camera])

  useEffect(() => {
    if (!zoomPulse || zoomPulse.n === lastPulse.current) return
    lastPulse.current = zoomPulse.n
    const offset = camera.position.clone().sub(TARGET)
    const factor = zoomPulse.dir === 1 ? 0.82 : 1.22
    const nextLen = Math.min(8, Math.max(1.05, offset.length() * factor))
    camera.position.copy(TARGET.clone().add(offset.setLength(nextLen)))
  }, [zoomPulse, camera])

  useFrame((_, dt) => {
    const a = anim.current
    if (a) {
      a.t = Math.min(1, a.t + dt * 2.4)
      const e = 1 - Math.pow(1 - a.t, 3)
      camera.position.lerpVectors(a.from, a.to, e)
      if (a.t >= 1) anim.current = null
    }
    if (controlsRef.current) {
      controlsRef.current.target.lerp(TARGET, 0.12)
      controlsRef.current.update()
    }
  })

  return null
}
