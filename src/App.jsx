import { Canvas } from '@react-three/fiber'
import { EffectComposer, DepthOfField } from '@react-three/postprocessing'
import * as THREE from 'three'
import Terrain from './scene/Terrain'
import CameraRig from './scene/CameraRig'
import LayerMarkers from './scene/LayerMarkers'
import './index.css'

import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

// ─────────────────────────────────────────────────────────────────────────────
// Componente de DOF Dinâmico: Mantém a montanha central sempre nítida
// ─────────────────────────────────────────────────────────────────────────────
function DynamicDOF() {
  const { camera } = useThree()
  const dofRef = useRef()

  useFrame(() => {
    if (!dofRef.current) return
    // Foca na montanha central (0, -0.75, 0)
    const target = new THREE.Vector3(0, -0.75, 0)
    const dist = camera.position.distanceTo(target)
    
    // Normaliza a distância real para o intervalo [near, far] do buffer de depth
    const near = camera.near || 0.1
    const far = camera.far || 120
    const normalized = (dist - near) / (far - near)
    
    dofRef.current.focusDistance = normalized
  })

  return (
    <DepthOfField
      ref={dofRef}
      focalLength={0.14}  // Campo focal preciso ao redor do cume
      bokehScale={4.5}    // Desfoque visível/estético nos relevos distantes
      height={480}
    />
  )
}

export default function App() {
  return (
    <div id="canvas-root">
      <Canvas gl={{ antialias: true }} shadows camera={false}>
        {/* Fundo escuro — estética mapa topográfico noturno */}
        <color attach="background" args={['#0f0f0e']} />

        <ambientLight intensity={0.25} />
        <directionalLight
          position={[8, 16, 6]}
          intensity={0.45}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />

        <CameraRig />

        <Terrain
          segments={280}
          size={75}
          contourInterval={0.45}
          majorEvery={5}
          lineWidth={0.032}
        />

        {/* DOF: foco dinâmico na montanha central, desfoque crescente nas bordas */}
        <EffectComposer>
          <DynamicDOF />
        </EffectComposer>

        {/* Marcadores de seção com ângulo aberto + animação de desenho */}
        <LayerMarkers />
      </Canvas>
    </div>
  )
}
