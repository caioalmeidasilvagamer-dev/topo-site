import { useEffect, useRef } from 'react'
import { OrthographicCamera } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { useSceneStore } from '../state/useSceneStore'

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
 * Posição isométrica 3/4 com Y reduzido para mostrar melhor a elevação
 * e a profundidade do relevo (câmera mais "de lado" do que "de cima").
 * X e Z iguais mantêm o eixo de simetria isométrico.
 */
const ISO_POSITION = [17, 8, 17]    // Melhor ângulo de visualização
const LOOK_AT      = new THREE.Vector3(0, TERRAIN_MID, 0)

/**
 * Zoom da câmera ortográfica.
 * Reduzido para 25 para que o terreno maior (size=75) preencha toda a tela.
 */
const ORTHO_ZOOM = 25

/**
 * Posição inicial da câmera na intro (ângulo quase vertical, evitando gimbal lock).
 */
const START_POSITION = [0.1, 25, 6]

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
  const setIntroComplete = useSceneStore((state) => state.setIntroComplete)
  const introComplete = useSceneStore((state) => state.introComplete)
  const cameraRef = useRef()

  // Animação de intro (só roda uma vez ao montar o componente)
  useEffect(() => {
    const cam = cameraRef.current
    if (!cam) return

    // Posiciona no top-down inicial
    cam.position.set(...START_POSITION)
    cam.lookAt(target instanceof THREE.Vector3 ? target : new THREE.Vector3(...target))
    cam.updateProjectionMatrix()

    // Anima até a posição isométrica final
    gsap.to(cam.position, {
      x: position[0],
      y: position[1],
      z: position[2],
      duration: 2.5,
      ease: 'power2.inOut',
      onUpdate: () => {
        cam.lookAt(target instanceof THREE.Vector3 ? target : new THREE.Vector3(...target))
        cam.updateProjectionMatrix()
      },
      onComplete: () => {
        setIntroComplete(true)
      },
    })
  }, [position, target, setIntroComplete])

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
    camera.far    = 70
    camera.zoom   = 1      // já usamos left/right/top/bottom diretamente

    // Apenas define a posição final no resize se a intro já tiver terminado
    if (introComplete) {
      camera.position.set(...position)
      camera.lookAt(target instanceof THREE.Vector3 ? target : new THREE.Vector3(...target))
    }
    camera.updateProjectionMatrix()

    // TODO: remover antes da versão final
    console.log(
      '[CameraRig] posição:', camera.position.toArray().map(v => +v.toFixed(2)),
      '| zoom (frustum half-height):', +(size.height / 2 / zoom).toFixed(2),
      '| ORTHO_ZOOM const:', zoom
    )
  }, [camera, size, position, target, zoom, introComplete])

  return (
    <OrthographicCamera
      ref={cameraRef}
      makeDefault
      position={START_POSITION}
      zoom={zoom}
      near={0.1}
      far={120}
    />
  )
}
