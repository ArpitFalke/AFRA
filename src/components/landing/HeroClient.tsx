'use client'

import dynamic from 'next/dynamic'
import { useSyncExternalStore } from 'react'
import { isWebGLAvailable } from '@/components/three/webgl'
import { HeroFallback } from './HeroFallback'

/** Client-only bridge so the hero 3D canvas never renders on the server. */
const HeroInner = dynamic(() => import('@/components/landing/HeroShirt').then((m) => m.HeroInner), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
})

const emptySubscribe = () => () => {}

export function HeroClient() {
  // Hydration-safe capability check: server and first client render agree,
  // then the real WebGL decision applies once mounted.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )

  if (!mounted) return <div className="h-full w-full" />
  if (!isWebGLAvailable()) return <HeroFallback />
  return <HeroInner />
}
