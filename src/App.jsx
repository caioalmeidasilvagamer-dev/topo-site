import { Canvas } from '@react-three/fiber'
import Terrain from './scene/Terrain'
import CameraRig from './scene/CameraRig'
import './index.css'

/**
 * App – canvas principal do topo-site.
 *
 * A câmera ortográfica isométrica é configurada inteiramente dentro do
 * CameraRig. O movimento futuro (scroll → GSAP ScrollTrigger) será
 * injetado via useSceneStore/useScrollSync, sem controles de mouse.
 *
 * Próximas fases: LayerMarkers, seções HTML, TransitionZoom.
 */
export default function App() {
  return (
    <div id="canvas-root">
      {/*
        camera={false} → desabilita a câmera padrão do R3F para que
        o <OrthographicCamera makeDefault> dentro do CameraRig tome conta.
      */}
      <Canvas gl={{ antialias: true }} shadows camera={false}>
        {/* Luz ambiente – base paper-white não vai a preto */}
        <ambientLight intensity={0.85} />

        {/* Luz direcional suave para leitura da topografia */}
        <directionalLight
          position={[8, 16, 6]}
          intensity={0.6}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />

        {/* Câmera ortográfica isométrica – fixa, sem controles de usuário */}
        <CameraRig />

        {/* Terreno topográfico com shader de curvas de nível */}
        <Terrain
          segments={200}
          size={30}
          heightScale={6}
          contourInterval={0.4}
          majorEvery={5}
          lineWidth={0.035}
        />
      </Canvas>
    </div>
  )
}
