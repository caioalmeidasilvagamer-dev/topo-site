import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Terrain from './scene/Terrain'
import CameraRig from './scene/CameraRig'
import './index.css'

/**
 * App – Phase 1 test canvas.
 *
 * Renders the topographic terrain with contour lines inside a full-screen
 * R3F Canvas.  OrbitControls is temporarily enabled so you can inspect the
 * terrain from any angle during development.
 *
 * Next phases will add: LayerMarkers, section overlays, scroll sync, etc.
 */
export default function App() {
  return (
    <div id="canvas-root">
      <Canvas
        gl={{ antialias: true }}
        camera={{
          position: [14, 12, 14],
          fov: 45,
          near: 0.1,
          far: 300,
        }}
        shadows
      >
        {/* Ambient light so the paper-white base doesn't go pitch black */}
        <ambientLight intensity={0.85} />

        {/* Soft directional light for subtle shading cues */}
        <directionalLight
          position={[8, 16, 6]}
          intensity={0.6}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />

        {/* Camera rig locks the view to the 3/4 isometric angle */}
        <CameraRig position={[14, 12, 14]} target={[0, -0.5, 0]} />

        {/* The topographic terrain mesh */}
        <Terrain
          segments={200}
          size={30}
          heightScale={6}
          contourInterval={0.4}
          majorEvery={5}
          lineWidth={0.035}
        />

        {/* TEMP: remover antes da versão final */}
        <OrbitControls
          target={[0, -0.5, 0]}
          enableZoom
          enablePan={false}
          minPolarAngle={Math.PI / 8}
          maxPolarAngle={Math.PI / 2.4}
        />
      </Canvas>
    </div>
  )
}
