'use client'

import { AfraMark } from '@/components/shared/AfraLogo'

/** Clear, honest state shown when the browser cannot provide WebGL. */
export function ViewportFallback() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <span className="text-afra-orange">
        <AfraMark size={40} />
      </span>
      <h2 className="text-base font-semibold">3D view needs WebGL</h2>
      <p className="max-w-sm text-sm leading-relaxed text-afra-muted">
        This browser can&apos;t create a 3D context, so the live product view is unavailable. Try a different browser or enable hardware
        acceleration — everything else in AFRA keeps working.
      </p>
    </div>
  )
}
