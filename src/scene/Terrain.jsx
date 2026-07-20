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

// ─────────────────────────────────────────────────────────────────────────────
// Constantes de topologia do relevo (expostas para fácil ajuste)
// ─────────────────────────────────────────────────────────────────────────────
export const centerPeakHeight = 7.0    // Altura máxima do pico central
export const centerRadius     = 9.0    // Raio de influência da montanha central (em relação ao tamanho 30)
export const noiseAmplitude   = 3.8    // Amplitude do ruído fbm secundário (aumentado em 1.8x para mais irregularidade)

// ---------------------------------------------------------------------------
// Height function – exposed so CameraRig and LayerMarkers can query it
// ---------------------------------------------------------------------------
export function getHeight(x, z) {
  const scale = 0.055
  const baseOffset = -0.8
  const warpStrength = 2.5   // Força de distorção das coordenadas radialmente

  // 1. Domain warping: distorce as coordenadas (x, z) usando o próprio fbm em baixa frequência
  const warpedX = x + fbm(x * 0.05, z * 0.05) * warpStrength
  const warpedZ = z + fbm(x * 0.05 + 100.0, z * 0.05 + 100.0) * warpStrength

  // Distância do ponto distorcido até o centro (0,0)
  const dist = Math.sqrt(warpedX * warpedX + warpedZ * warpedZ)
  
  // Proporção de distância em relação ao raio do domo
  const ratio = Math.min(1.0, dist / centerRadius)
  
  // Curva de falloff parabólica suave (arredondada no topo)
  const falloff = (1.0 - ratio) * (1.0 - ratio)
  
  // 2. Dome radial com ruído na própria altura para quebrar anéis concêntricos perfeitos
  const radialHeight = centerPeakHeight * falloff * (1.0 + fbm(x * 0.15, z * 0.15) * 0.15)

  // 3. Ruído fbm secundário (colinas e vales)
  const fbmNoise = fbm(x * scale, z * scale)

  return radialHeight + fbmNoise * noiseAmplitude + baseOffset
}

/**
 * Retorna um ponto {x, y, z} na encosta da montanha central correspondente
 * a fractionFromTop (0 = pico/centro, 1 = base/limite do domo) sob determinado ângulo.
 *
 * @param {number} fractionFromTop - 0 (pico) a 1 (base do domo)
 * @param {number} angle - ângulo em radianos para espalhar os marcadores
 */
export function getCentralMountainPoint(fractionFromTop, angle = 0) {
  const distance = fractionFromTop * centerRadius
  const x = Math.cos(angle) * distance
  const z = Math.sin(angle) * distance
  const y = getHeight(x, z)
  return { x, y, z }
}

// ---------------------------------------------------------------------------
// Terrain Component
// ---------------------------------------------------------------------------
/**
 * Props:
 *  - segments      {number}  PlaneGeometry subdivisions (default 200)
 *  - size          {number}  World-space width/depth of the plane (default 30)
 *  - contourInterval {number} Height step between contour lines (default 0.4)
 *  - majorEvery    {number}  Every N contours = major line (default 5)
 *  - lineWidth     {number}  Minor line half-width in height units (default 0.035)
 */
export default function Terrain({
  segments        = 200,
  size            = 30,
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

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const h = getHeight(x, z)
      pos.setY(i, h)
    }

    pos.needsUpdate = true
    geo.computeVertexNormals()   // important for the shading term in the shader
    return geo
  }, [segments, size])

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
