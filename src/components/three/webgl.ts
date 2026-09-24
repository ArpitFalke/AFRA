'use client'

/**
 * WebGL capability detection + graceful fallbacks.
 * The studio requires WebGL; where it's unavailable (old devices, blocked
 * GPU, locked-down browsers) we show a clear state instead of crashing.
 */

let cached: boolean | null = null

export function isWebGLAvailable(): boolean {
  if (cached !== null) return cached
  if (typeof document === 'undefined') return false
  try {
    const test = document.createElement('canvas')
    const gl = test.getContext('webgl2') ?? test.getContext('webgl')
    cached = !!gl
  } catch {
    cached = false
  }
  return cached
}
