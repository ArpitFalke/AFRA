'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { PerspectiveCamera } from 'three'

/**
 * Registers a client-side export function that renders the current scene at
 * an arbitrary resolution and returns a data URL. Runs entirely on the GPU
 * in the live scene — no server render needed.
 */

export interface ExportRequest {
  width: number
  height: number
  transparent: boolean
  format: 'png' | 'jpg' | 'webp'
}

type ExportFn = (req: ExportRequest) => string | null

const bridge: { fn: ExportFn | null } = { fn: null }

export function getExporter(): ExportFn | null {
  return bridge.fn
}

export function ExportBridge() {
  const { gl, scene, camera, size } = useThree()

  useEffect(() => {
    const cam = camera as PerspectiveCamera
    const run: ExportFn = (req) => {
      const prevAspect = cam.aspect
      const prevBg = scene.background
      try {
        if (req.transparent) scene.background = null

        gl.setSize(req.width, req.height, false)
        cam.aspect = req.width / req.height
        cam.updateProjectionMatrix()
        gl.render(scene, cam)
        return gl.domElement.toDataURL(
          req.format === 'png' ? 'image/png' : req.format === 'jpg' ? 'image/jpeg' : 'image/webp',
          0.94,
        )
      } catch (err) {
        console.error('[afra:export]', err)
        return null
      } finally {
        scene.background = prevBg
        cam.aspect = prevAspect
        cam.updateProjectionMatrix()
        gl.setSize(size.width, size.height, false)
        gl.render(scene, cam)
      }
    }
    bridge.fn = run
    return () => {
      if (bridge.fn === run) bridge.fn = null
    }
  }, [gl, scene, camera, size])

  return null
}
