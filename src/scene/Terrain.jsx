import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createContourMaterial } from './contourShader'

// ---------------------------------------------------------------------------
// Simplex-like noise helpers (classic 3-D Perlin approximation, dependency-free)
// ---------------------------------------------------------------------------

// Permutation table
const P = new Uint8Array(512)
;(() => {
  const perm = new Uint8Array(256)
  for (let i = 0; i < 256; i++) perm[i] = i
  // Fisher–Yates shuffle with a fixed seed for deterministic terrain
  let seed = 42
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff
    return ((seed >>> 0) / 4294967296)
  }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]]
  }
  for (let i = 0; i < 512; i++) P[i] = perm[i & 255]
})()

function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10) }
function lerp(a, b, t) { return a + t * (b - a) }

function grad(hash, x, y, z) {
  const h = hash & 15
  const u = h < 8 ? x : y
  const v = h < 4 ? y : (h === 12 || h === 14 ? x : z)
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
}

function perlin3(x, y, z) {
  const X = Math.floor(x) & 255
  const Y = Math.floor(y) & 255
  const Z = Math.floor(z) & 255
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z)
  const u = fade(x), v = fade(y), w = fade(z)
  const A  = P[X] + Y,   AA = P[A] + Z, AB = P[A + 1] + Z
  const B  = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z

  return lerp(
    lerp(
      lerp(grad(P[AA], x, y, z),     grad(P[BA], x - 1, y, z),     u),
      lerp(grad(P[AB], x, y - 1, z), grad(P[BB], x - 1, y - 1, z), u), v),
    lerp(
      lerp(grad(P[AA + 1], x, y, z - 1),     grad(P[BA + 1], x - 1, y, z - 1),     u),
      lerp(grad(P[AB + 1], x, y - 1, z - 1), grad(P[BB + 1], x - 1, y - 1, z - 1), u), v), w)
}

/**
 * Fractal Brownian Motion – sums several octaves of Perlin noise
 * to produce a natural-looking terrain heightmap.
 */
function fbm(x, z, { octaves = 3, lacunarity = 2.0, gain = 0.45 } = {}) {
  let value = 0, amplitude = 0.5, frequency = 1.0
  for (let i = 0; i < octaves; i++) {
    value    += amplitude * perlin3(x * frequency, 0.5, z * frequency)
    amplitude *= gain
    frequency *= lacunarity
  }
  return value
}

// ---------------------------------------------------------------------------
// Height function – exposed so CameraRig can also query it if needed
// ---------------------------------------------------------------------------
export function getHeight(x, z, {
  scale       = 0.055,
  heightScale = 6,
  baseOffset  = -0.8,   // push the whole terrain slightly down
} = {}) {
  return fbm(x * scale, z * scale) * heightScale + baseOffset
}

// ---------------------------------------------------------------------------
// Terrain Component
// ---------------------------------------------------------------------------
/**
 * Props:
 *  - segments      {number}  PlaneGeometry subdivisions (default 200)
 *  - size          {number}  World-space width/depth of the plane (default 30)
 *  - heightScale   {number}  Vertical exaggeration (default 6)
 *  - contourInterval {number} Height step between contour lines (default 0.4)
 *  - majorEvery    {number}  Every N contours = major line (default 5)
 *  - lineWidth     {number}  Minor line half-width in height units (default 0.035)
 */
export default function Terrain({
  segments        = 200,
  size            = 30,
  heightScale     = 6,
  contourInterval = 0.4,
  majorEvery      = 5,
  lineWidth       = 0.035,
}) {
  const meshRef = useRef()

  // ---- Build displaced geometry (once) ------------------------------------
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, segments, segments)

    // PlaneGeometry is in XY plane – rotate it flat (XZ)
    geo.rotateX(-Math.PI / 2)

    const pos = geo.attributes.position
    const noiseScale  = 0.055
    const baseOffset  = -0.8

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const h = fbm(x * noiseScale, z * noiseScale) * heightScale + baseOffset
      pos.setY(i, h)
    }

    pos.needsUpdate = true
    geo.computeVertexNormals()   // important for the shading term in the shader
    return geo
  }, [segments, size, heightScale])

  // ---- Shader material (once) ----------------------------------------------
  const material = useMemo(() => createContourMaterial({
    contourInterval,
    majorEvery,
    lineWidth,
  }), [contourInterval, majorEvery, lineWidth])

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      receiveShadow
    />
  )
}
