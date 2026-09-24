import type { SVGProps } from 'react'

/**
 * AFRA mark — a forward-leaning geometric "A" whose left stroke is cut into
 * two arms, forming a hidden "F". Built from pure geometry, not typography.
 *
 * Works at favicon size and landing-page scale, in any currentColor.
 */
export function AfraMark({ size = 28, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="currentColor"
      role="img"
      aria-label="AFRA"
      {...props}
    >
      {/* Left stroke: vertical stem with two right arms — the hidden F */}
      <path d="M15 6 H45 V18 H27 V27 H39 V38 H27 V58 H15 Z" />
      {/* Right stroke: forward-leaning leg completing the A */}
      <path d="M45 6 L51.5 6 L65 58 L52 58 L36.5 15.5 L45 15.5 Z" />
    </svg>
  )
}

export function AfraLogo({
  size = 26,
  showWordmark = true,
  className = '',
}: {
  size?: number
  showWordmark?: boolean
  className?: string
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <AfraMark size={size} />
      {showWordmark && (
        <span
          className="font-black tracking-[0.34em] text-current leading-none"
          style={{ fontSize: size * 0.62, letterSpacing: '0.34em', marginRight: '-0.34em' }}
        >
          AFRA
        </span>
      )}
    </span>
  )
}
