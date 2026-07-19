import { useEffect } from 'react'
import { OrthographicCamera } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

// ---------------------------------------------------------------------------
// Constantes de altura do terreno (baseadas nos parâmetros do Terrain.jsx)
// Exportadas para uso em LayerMarkers.jsx e nas seções futuras.
// ---------------------------------------------------------------------------

/**
 * Altura aproximada do pico mais alto do terreno (região da Hero).
 *
 * O fBm com noiseScale=0.055, octaves=3, gain=0.45 e heightScale=6
 * produz valores de fBm entre ~-0.5 e ~+0.5 (amplitude ~1 antes do scale).
 * Portanto:  max_fbm ≈ +0.475  →  +0.475 * 6 - 0.8 ≈ +2.05
 */
export const TERRAIN_TOP = 2.1     // Y da camada mais alta → seção Hero

/**
 * Altura aproximada do vale mais baixo do terreno (região do Footer).
 *
 * min_fbm ≈ -0.475  →  -0.475 * 6 - 0.8 ≈ -3.65
 */
export const TERRAIN_BASE = -3.6   // Y da camada mais baixa → seção Footer

/**
 * Altura do terreno no centro vertical da cena (ponto de lookAt da câmera).
 * Útil para posicionar UI sobreposta.
 */
export const TERRAIN_MID = (TERRAIN_TOP + TERRAIN_BASE) / 2   // ≈ -0.75

// ---------------------------------------------------------------------------
// Parâmetros da câmera ortográfica isométrica
// ---------------------------------------------------------------------------

/**
 * Direção de visão isométrica 3/4 normalizada (ângulo clássico 45°/35.26°).
 * A câmera fica "acima e à frente" do terreno, olhando para o centro.
 */
const ISO_POSITION = [14, 12, 14]   // [X, Y, Z] – vetor isométrico igual
const LOOK_AT      = new THREE.Vector3(0, TERRAIN_MID, 0)

/**
 * Zoom da câmera ortográfica.
 *
 * Para um PlaneGeometry de size=30 visto em ângulo isométrico, o "raio"
 * visível no plano é ~30√2/2 ≈ 21.2 unidades.  O zoom mapeia esse raio
 * para metade da menor dimensão do viewport.  Um valor de zoom=35 deixa
 * o terreno inteiro visível com ~10 % de margem em telas 16:9 típicas.
 *
 * Ajuste este valor se o terreno aparecer cortado ou muito pequeno.
 */
const ORTHO_ZOOM = 35

// ---------------------------------------------------------------------------
// CameraRig
// ---------------------------------------------------------------------------

/**
 * Configura e registra a câmera ortográfica isométrica como câmera padrão
 * da cena.  Sem controles de usuário — o movimento será feito via GSAP
 * ScrollTrigger nas próximas fases.
 *
 * Props:
 *  position  {[x,y,z]}  Posição da câmera  (default: ISO_POSITION)
 *  target    {Vector3}   Ponto de lookAt    (default: LOOK_AT)
 *  zoom      {number}    Zoom ortográfico   (default: ORTHO_ZOOM)
 */
export default function CameraRig({
  position = ISO_POSITION,
  target   = LOOK_AT,
  zoom     = ORTHO_ZOOM,
}) {
  const { camera, size } = useThree()

  // Recalcula o frustum sempre que o viewport muda de tamanho
  useEffect(() => {
    if (!camera.isOrthographicCamera) return

    const aspect = size.width / size.height
    const halfH  = size.height / 2 / zoom
    const halfW  = halfH * aspect

    camera.left   = -halfW
    camera.right  =  halfW
    camera.top    =  halfH
    camera.bottom = -halfH
    camera.near   = 0.1
    camera.far    = 400
    camera.zoom   = 1      // já usamos left/right/top/bottom diretamente

    camera.position.set(...position)
    camera.lookAt(target instanceof THREE.Vector3 ? target : new THREE.Vector3(...target))
    camera.updateProjectionMatrix()
  }, [camera, size, position, target, zoom])

  return (
    <OrthographicCamera
      makeDefault
      position={position}
      zoom={zoom}
      near={0.1}
      far={400}
      onUpdate={(cam) => {
        // lookAt não é uma prop nativa do OrthographicCamera do drei,
        // então aplicamos manualmente após o primeiro mount.
        const t = target instanceof THREE.Vector3 ? target : new THREE.Vector3(...target)
        cam.lookAt(t)
        cam.updateProjectionMatrix()
      }}
    />
  )
}
