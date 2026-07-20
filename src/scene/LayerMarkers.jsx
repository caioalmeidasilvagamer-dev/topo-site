import { useState, useMemo, useEffect, useRef } from 'react'
import { Html, Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { getCentralMountainPoint } from './Terrain'
import { useSceneStore } from '../state/useSceneStore'

// ─────────────────────────────────────────────────────────────────────────────
// Configuração dos marcadores
//
// angle: ângulo em radianos ao redor do pico. A câmera isométrica vem de
//        [16,7,16] então "frente" da cena é direção ~NW no plano XZ.
//        Ângulos testados para leque visível na câmera:
//          • 1.5π ≈ frente-centro (Hero, topo da cena)
//          • 1.2π ≈ frente-esquerda
//          • 1.8π ≈ frente-direita
//
// elbowUp:   quanto a linha sobe na parte diagonal (segmento 1)
// elbowOut:  distância radial no segmento diagonal (segmento 1)
// extendOut: comprimento do segmento horizontal (segmento 2)
// extendUp:  ajuste vertical no segmento 2 (normalmente 0 ou leve)
// ─────────────────────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: 'hero',
    label: 'Hero',
    fractionFromTop: 0.05,
    angle: Math.PI * 1.50,
    isRight: false,
    elbowUp: 3.0,
    elbowOut: 0.2,
    extendOut: 3.2,
    extendUp: 0.0,
    imgSeed: 10,
  },
  {
    id: 'about',
    label: 'Sobre Mim',
    fractionFromTop: 0.30,
    angle: Math.PI * 1.30,
    isRight: false,
    elbowUp: 2.2,
    elbowOut: 1.0,
    extendOut: 4.0,
    extendUp: 0.0,
    imgSeed: 25,
  },
  {
    id: 'section-b',
    label: 'Habilidades',
    fractionFromTop: 0.28,
    angle: Math.PI * 1.70,
    isRight: true,
    elbowUp: 2.2,
    elbowOut: 1.0,
    extendOut: 4.0,
    extendUp: 0.0,
    imgSeed: 57,
  },
  {
    id: 'section-a',
    label: 'Projetos',
    fractionFromTop: 0.52,
    angle: Math.PI * 1.15,
    isRight: false,
    elbowUp: 1.6,
    elbowOut: 1.5,
    extendOut: 4.8,
    extendUp: 0.0,
    imgSeed: 42,
  },
  {
    id: 'section-c',
    label: 'Experiência',
    fractionFromTop: 0.50,
    angle: Math.PI * 1.85,
    isRight: true,
    elbowUp: 1.6,
    elbowOut: 1.5,
    extendOut: 4.8,
    extendUp: 0.0,
    imgSeed: 33,
  },
  {
    id: 'contact',
    label: 'Contato',
    fractionFromTop: 0.78,
    angle: Math.PI * 1.20,
    isRight: false,
    elbowUp: 1.0,
    elbowOut: 2.2,
    extendOut: 4.2,
    extendUp: 0.0,
    imgSeed: 73,
  },
  {
    id: 'footer',
    label: 'Footer',
    fractionFromTop: 0.84,
    angle: Math.PI * 1.80,
    isRight: true,
    elbowUp: -1.0,
    elbowOut: 2.2,
    extendOut: 3.5,
    extendUp: 0.0,
    imgSeed: 88,
  },
]

// Ordem de aparição dos marcadores (Hero primeiro)
const APPEAR_ORDER = ['hero', 'about', 'section-b', 'section-a', 'section-c', 'contact', 'footer']

// ─────────────────────────────────────────────────────────────────────────────
// Geometria de cada marcador
// Calcula pontos A, B, C alinhados ao plano da tela (eixos XZ isométricos)
// para que as retas fiquem horizontais no viewport.
// ─────────────────────────────────────────────────────────────────────────────
function computeMarkerGeometry(section) {
  const pt = getCentralMountainPoint(section.fractionFromTop, section.angle)
  const A = new THREE.Vector3(pt.x, pt.y, pt.z)

  // Direção de extensão lateral (horizontal da tela)
  const H = section.isRight
    ? new THREE.Vector3(1, 0, -1).normalize()
    : new THREE.Vector3(-1, 0, 1).normalize()

  // B = cotovelo diagonal
  const B = new THREE.Vector3(
    A.x + H.x * section.elbowOut,
    A.y + section.elbowUp,
    A.z + H.z * section.elbowOut
  )

  // C = círculo com extensão horizontal perfeita na tela
  const C = new THREE.Vector3(
    B.x + H.x * section.extendOut,
    B.y + section.extendUp,
    B.z + H.z * section.extendOut
  )

  return { A, B, C }
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente Marker — animação de desenho sequencial do conector
// ─────────────────────────────────────────────────────────────────────────────
function Marker({ section, startDelay }) {
  const [hovered, setHovered] = useState(false)
  const [circleVisible, setCircleVisible] = useState(false)

  // Três pontos do conector
  const { A, B, C } = useMemo(() => computeMarkerGeometry(section), [section])

  // Ref da linha no Three.js (Line2 do drei)
  const lineRef = useRef()

  // Proxy de animação: t1 ∈ [0,1] = progresso do segmento A→B
  //                    t2 ∈ [0,1] = progresso do segmento B→C
  const anim = useRef({ t1: 0, t2: 0 })

  useEffect(() => {
    const tl = gsap.timeline({ delay: startDelay })

    // Fase 1 — Desenha segmento A → B
    tl.to(anim.current, {
      t1: 1,
      duration: 0.45,
      ease: 'power2.out',
    })

    // Fase 2 — Desenha segmento B → C (começa logo após fase 1)
    tl.to(anim.current, {
      t2: 1,
      duration: 0.35,
      ease: 'power2.out',
      onComplete: () => setCircleVisible(true),
    }, '+=0.0')

    return () => tl.kill()
  }, [startDelay])

  // Atualiza os pontos da linha a cada frame durante a animação
  useFrame(() => {
    if (!lineRef.current) return
    const { t1, t2 } = anim.current

    // Ponto intermediário do segmento 1 (A→B)
    const mid = new THREE.Vector3().lerpVectors(A, B, t1)

    // Se o segmento 1 ainda não terminou: linha vai de A até mid (dois pontos iguais evita degeneração)
    // Se terminou: desenha A→B→ponta do segmento 2
    let pts
    if (t1 < 1.0) {
      // Segmento 1 crescendo: duplicamos o mid para ter comprimento mínimo
      pts = [A.x, A.y, A.z, mid.x, mid.y, mid.z, mid.x, mid.y, mid.z]
    } else {
      const tip = new THREE.Vector3().lerpVectors(B, C, t2)
      pts = [A.x, A.y, A.z, B.x, B.y, B.z, tip.x, tip.y, tip.z]
    }

    lineRef.current.geometry.setPositions(pts)
    lineRef.current.computeLineDistances()
  })

  // Cria a geometria inicial (A, A, A) — invisível até a animação começar
  const initialPoints = useMemo(
    () => [A.toArray(), A.toArray(), A.toArray()],
    [A],
  )

  return (
    <group name={`marker-${section.id}`}>
      {/* ── Linha em dois segmentos ("ângulo aberto") ── */}
      <Line
        ref={lineRef}
        points={initialPoints}
        color="#e8e4df"
        lineWidth={3.2}
        transparent
        opacity={1}
        depthTest={false}
      />

      {/* ── Pequeno ponto de ancoragem no relevo ── */}
      <mesh position={A.toArray()}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color="#e8e4df" transparent opacity={circleVisible ? 0.9 : 0} />
      </mesh>

      {/* ── Círculo com foto da seção ── */}
      <Html
        position={C.toArray()}
        center
        zIndexRange={[100, 0]}
        style={{
          opacity: circleVisible ? 1 : 0,
          transition: 'opacity 0.5s ease',
          pointerEvents: circleVisible ? 'all' : 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '7px',
            cursor: 'pointer',
            userSelect: 'none',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          onClick={() => console.log('clicked section:', section.id)}
        >
          {/* ── Círculo principal com foto ── */}
          <div
            style={{
              width: '74px',
              height: '74px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid rgba(232,228,223,0.85)',
              boxShadow: hovered
                ? '0 0 0 3px rgba(232,228,223,0.25), 0 6px 20px rgba(0,0,0,0.5)'
                : '0 0 0 1px rgba(232,228,223,0.12), 0 4px 14px rgba(0,0,0,0.4)',
              transition: 'transform 0.25s ease, box-shadow 0.25s ease',
              transform: hovered ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            <img
              src={`https://picsum.photos/seed/${section.imgSeed}/148/148`}
              alt={section.label}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>

          {/* ── Label abaixo ── */}
          <span
            style={{
              fontSize: '10px',
              fontWeight: 500,
              color: 'rgba(232,228,223,0.9)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              transition: 'transform 0.25s ease',
              transform: hovered ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            {section.label}
          </span>
        </div>
      </Html>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LayerMarkers — aguarda fim da intro da câmera, depois dispara os marcadores
// ─────────────────────────────────────────────────────────────────────────────
export default function LayerMarkers() {
  const introComplete = useSceneStore((state) => state.introComplete)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (introComplete) {
      // Pequeno delay após a câmera chegar na posição final
      const t = setTimeout(() => setReady(true), 200)
      return () => clearTimeout(t)
    }
  }, [introComplete])

  if (!ready) return null

  return (
    <group name="layer-markers">
      {SECTIONS.map((section) => {
        const orderIndex = APPEAR_ORDER.indexOf(section.id)
        // Stagger de 0.18s por marcador, 0 para o Hero
        const startDelay = orderIndex >= 0 ? orderIndex * 0.18 : 0

        return (
          <Marker
            key={section.id}
            section={section}
            startDelay={startDelay}
          />
        )
      })}
    </group>
  )
}
