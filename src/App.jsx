import { Canvas } from '@react-three/fiber'
import { EffectComposer, DepthOfField } from '@react-three/postprocessing'
import Terrain from './scene/Terrain'
import CameraRig from './scene/CameraRig'
import LayerMarkers from './scene/LayerMarkers'
import './index.css'

// ─────────────────────────────────────────────────────────────────────────────
// Parâmetros ajustáveis para o efeito Depth of Field (Tilt-Shift)
// ─────────────────────────────────────────────────────────────────────────────
const DOF_FOCUS_DISTANCE = 0.20   // Foco no centro do terreno (com base no far=120 da câmera)
const DOF_FOCAL_LENGTH    = 0.12   // Plano de foco mais largo para manter marcadores nítidos
const DOF_BOKEH_SCALE     = 1.8    // Desfoque máximo mais fraco e suave nas bordas

/**
 * App – canvas principal do topo-site.
 *
 * A câmera ortográfica isométrica é configurada inteiramente dentro do
 * CameraRig. O movimento futuro (scroll → GSAP ScrollTrigger) será
 * injetado via useSceneStore/useScrollSync, sem controles de mouse.
 */
export default function App() {
  return (
    <div id="canvas-root">
      {/*
        camera={false} → desabilita a câmera padrão do R3F para que
        o <OrthographicCamera makeDefault> dentro do CameraRig tome conta.
      */}
      <Canvas gl={{ antialias: true }} shadows camera={false}>
        {/* Cor de fundo da cena – warm off-white papel topográfico */}
        <color attach="background" args={['#f0ede8']} />

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

        {/*
          Efeitos de Post-processing.
          O DepthOfField cria o efeito tilt-shift desejado na malha 3D do terreno.
        */}
        <EffectComposer>
          <DepthOfField
            focusDistance={DOF_FOCUS_DISTANCE}
            focalLength={DOF_FOCAL_LENGTH}
            bokehScale={DOF_BOKEH_SCALE}
            height={480} // Resolução interna de cálculo do buffer de depth/blur
          />
        </EffectComposer>

        {/*
          Marcadores de seção: setas + círculos Html por camada de altura.
          Nota: Como o R3F <Html> é renderizado fora do canvas WebGL (como elementos
          DOM reais sobrepostos), ele não é afetado pelo EffectComposer/DepthOfField.
          Isso garante que os avatares e textos dos marcadores permaneçam 100% nítidos
          e legíveis.
        */}
        <LayerMarkers />
      </Canvas>
    </div>
  )
}

