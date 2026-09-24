'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { getMaterial } from '@/lib/design/fonts'
import { useEditorStore } from '@/stores/editor-store'

/** Procedural T-shirt geometry — no external model files required. */
function buildTorsoGeometry(): THREE.ExtrudeGeometry {
  const s = new THREE.Shape()
  s.moveTo(-0.5, 0.66)
  s.quadraticCurveTo(-0.36, 0.75, -0.2, 0.77)
  s.quadraticCurveTo(0, 0.86, 0.2, 0.77)
  s.quadraticCurveTo(0.36, 0.75, 0.5, 0.66)
  s.lineTo(0.56, 0.5)
  s.lineTo(0.52, -0.62)
  s.quadraticCurveTo(0.52, -0.72, 0.42, -0.73)
  s.lineTo(-0.42, -0.73)
  s.quadraticCurveTo(-0.52, -0.72, -0.52, -0.62)
  s.lineTo(-0.56, 0.5)
  s.closePath()

  // neck opening
  const neck = new THREE.Path()
  neck.absellipse(0, 0.77, 0.155, 0.072, 0, Math.PI * 2, false, 0)
  s.holes.push(neck)

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.3,
    bevelEnabled: true,
    bevelThickness: 0.055,
    bevelSize: 0.05,
    bevelSegments: 4,
    curveSegments: 28,
  })
  geo.translate(0, 0, -0.15)
  geo.computeVertexNormals()
  return geo
}

function buildSleeveGeometry(): THREE.ExtrudeGeometry {
  const s = new THREE.Shape()
  s.moveTo(-0.125, 0.04)
  s.lineTo(0.125, 0.04)
  s.lineTo(0.175, -0.36)
  s.lineTo(-0.175, -0.31)
  s.closePath()
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.24,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.035,
    bevelSegments: 3,
    curveSegments: 12,
  })
  geo.translate(0, 0, -0.12)
  geo.computeVertexNormals()
  return geo
}

function darken(hex: string, factor: number): string {
  const c = new THREE.Color(hex)
  c.multiplyScalar(factor)
  return `#${c.getHexString()}`
}

export function TShirtModel() {
  const color = useEditorStore((s) => s.doc.garment.color)
  const materialId = useEditorStore((s) => s.doc.garment.material)

  const torso = useMemo(() => buildTorsoGeometry(), [])
  const sleeve = useMemo(() => buildSleeveGeometry(), [])

  const mat = getMaterial(materialId)

  return (
    <group position={[0, -0.02, 0]}>
      <mesh geometry={torso} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={mat.roughness} metalness={mat.metalness} />
      </mesh>

      {([1, -1] as const).map((side) => (
        <group key={side} position={[side * 0.46, 0.56, 0]} rotation={[0, 0, side * -0.62]}>
          <mesh geometry={sleeve} castShadow receiveShadow>
            <meshStandardMaterial color={color} roughness={mat.roughness} metalness={mat.metalness} />
          </mesh>
        </group>
      ))}

      {/* collar rib */}
      <mesh position={[0, 0.755, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.62]}>
        <torusGeometry args={[0.155, 0.032, 12, 48]} />
        <meshStandardMaterial color={darken(color, 0.78)} roughness={Math.max(0.5, mat.roughness - 0.1)} metalness={mat.metalness} />
      </mesh>
    </group>
  )
}
