import { useState, useMemo, useEffect } from 'react'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import { getHeight, getCentralMountainPoint } from './Terrain'
import { useSceneStore } from '../state/useSceneStore'

// ─────────────────────────────────────────────────────────────────────────────
// Configuração das seções
//
// Os marcadores agora são distribuídos em cascata (espiral descendente)
// ao redor da encosta da montanha central.
//
// fractionFromTop – 0.0 (topo/cume) a 1.0 (base da encosta).
// angle           – ângulo em radianos para rotacionar ao redor do centro,
//                   criando a trilha em espiral.
// ─────────────────────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: 'hero',
    label: 'Hero',
    fractionFromTop: 0.0,        // No cume
    angle: Math.PI * 1.2,        // Direção base (esquerda-trás)
    accentColor: '#c4a97d',
    imgSeed: 10,
  },
  {
    id: 'section-a',
    label: 'Sobre',
    fractionFromTop: 0.25,       // Início da encosta
    angle: Math.PI * 1.35,       // Deslocando em espiral
    accentColor: '#7db8a9',
    imgSeed: 25,
  },
  {
    id: 'section-b',
    label: 'Projetos',
    fractionFromTop: 0.50,       // Encosta média
    angle: Math.PI * 1.50,       // Direção voltada ao usuário (frente-esquerda)
    accentColor: '#7d9ab8',
    imgSeed: 42,
  },
  {
    id: 'section-c',
    label: 'Habilidades',
    fractionFromTop: 0.75,       // Encosta baixa
    angle: Math.PI * 1.65,       // Girando para a frente-direita
    accentColor: '#a87db8',
    imgSeed: 57,
  },
  {
    id: 'footer',
    label: 'Contato',
    fractionFromTop: 1.0,        // Base da montanha
    angle: Math.PI * 1.80,       // Direção inferior-direita
    accentColor: '#7d9aaa',
    imgSeed: 73,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Componente individual de marcador
// ─────────────────────────────────────────────────────────────────────────────
function Marker({ section, opacity }) {
  const [hovered, setHovered] = useState(false)

  // 1. Ponto de ancoragem na encosta real do terreno
  const anchorPos = useMemo(() => {
    const pt = getCentralMountainPoint(section.fractionFromTop, section.angle)
    return [pt.x, pt.y, pt.z]
  }, [section.fractionFromTop, section.angle])

  // 2. Ponto do círculo (avatar) - deslocado de forma curta e próxima da encosta
  const circlePos = useMemo(() => {
    const offsetDist = 2.2     // Deslocamento horizontal radial (curto para ficar próximo)
    const offsetHeight = 1.2   // Flutuação vertical acima do terreno
    
    // Para o cume (Hero), usamos o ângulo do Marker para deslocar o avatar
    const angle = section.angle
    
    const x = anchorPos[0] + Math.cos(angle) * offsetDist
    const y = anchorPos[1] + offsetHeight
    const z = anchorPos[2] + Math.sin(angle) * offsetDist
    return [x, y, z]
  }, [anchorPos, section.angle])

  // Geometria da seta: linha curta + ponta de cone pequena/discreta
  const arrow = useMemo(() => {
    const from = new THREE.Vector3(...anchorPos)
    const to   = new THREE.Vector3(...circlePos)
    const dir  = to.clone().sub(from).normalize()

    // Ponta do cone: calculada para tocar a borda do círculo (avatar 72px)
    const coneTip = to.clone().sub(dir.clone().multiplyScalar(0.45))

    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir
    )
    const euler = new THREE.Euler().setFromQuaternion(q)

    return {
      linePoints: [from.toArray(), coneTip.toArray()],
      conePos:    coneTip.toArray(),
      coneRot:    [euler.x, euler.y, euler.z],
    }
  }, [anchorPos, circlePos])

  return (
    <group name={`marker-${section.id}`}>
      {/* ── Esfera na superfície do relevo ── */}
      <mesh position={anchorPos}>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshBasicMaterial color="#111111" transparent opacity={opacity} />
      </mesh>

      {/* ── Guia / Linha conectora (mais grossa) ── */}
      <Line
        points={arrow.linePoints}
        color="#1a1a1a"
        lineWidth={2.2}
        transparent
        opacity={opacity}
      />

      {/* ── Ponta da seta (cone discreto) ── */}
      <mesh position={arrow.conePos} rotation={arrow.coneRot}>
        <coneGeometry args={[0.08, 0.24, 8]} />
        <meshBasicMaterial color="#1a1a1a" transparent opacity={opacity} />
      </mesh>

      {/* ── Avatar e Pill com design refinado ── */}
      <Html
        position={circlePos}
        center
        transform
        occlude="blending"
        zIndexRange={[100, 0]}
        style={{
          pointerEvents: opacity > 0.1 ? 'all' : 'none',
          opacity: opacity,
        }}
      >
        <div
          style={{
            display:       'flex',
            flexDirection: 'column',
            alignItems:    'center',
            gap:           '6px',
            cursor:        'pointer',
            userSelect:    'none',
            fontFamily:    'Inter, system-ui, sans-serif',
          }}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          onClick={() => {
            console.log('clicked section:', section.id)
          }}
        >
          {/* Avatar circular (aumentado para 72px) */}
          <div
            style={{
              width:        '72px',
              height:       '72px',
              borderRadius: '50%',
              overflow:     'hidden',
              border:       '3px solid #ffffff',
              boxShadow:    hovered
                ? '0 8px 24px rgba(0,0,0,0.35)'
                : '0 4px 12px rgba(0,0,0,0.25)',
              outline:      hovered ? `2px solid ${section.accentColor}` : '2px solid transparent',
              outlineOffset: '2px',
              transition:   'transform 0.25s ease, box-shadow 0.25s ease, outline-color 0.25s ease',
              transform:    hovered ? 'scale(1.12)' : 'scale(1)',
            }}
          >
            <img
              src={`https://picsum.photos/seed/${section.imgSeed}/128/128`}
              alt={section.label}
              width={72}
              height={72}
              style={{
                width:      '100%',
                height:     '100%',
                objectFit:  'cover',
                display:    'block',
              }}
            />
          </div>

          {/* Pill/Badge escuro semi-transparente */}
          <span
            style={{
              fontSize:        '11px',
              fontWeight:      500,
              color:           '#ffffff',
              letterSpacing:   '0.05em',
              textTransform:   'uppercase',
              background:      'rgba(17, 17, 17, 0.75)',
              padding:         '4px 12px',
              borderRadius:    '20px',
              backdropFilter:  'blur(4px)',
              whiteSpace:      'nowrap',
              boxShadow:       '0 2px 8px rgba(0,0,0,0.15)',
              transition:      'transform 0.25s ease',
              transform:       hovered ? 'scale(1.05)' : 'scale(1)',
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
// LayerMarkers – renderiza todos os marcadores de seção
// ─────────────────────────────────────────────────────────────────────────────
export default function LayerMarkers() {
  const introComplete = useSceneStore((state) => state.introComplete)
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    if (introComplete) {
      const obj = { val: 0 }
      gsap.to(obj, {
        val: 1,
        duration: 0.6,
        ease: 'power1.out',
        onUpdate: () => setOpacity(obj.val),
      })
    }
  }, [introComplete])

  return (
    <group name="layer-markers">
      {SECTIONS.map((section) => (
        <Marker key={section.id} section={section} opacity={opacity} />
      ))}
    </group>
  )
}
