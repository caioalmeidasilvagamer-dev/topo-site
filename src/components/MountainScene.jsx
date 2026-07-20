import { useState } from 'react'
import mountainBg from '../assets/mountain-bg.png'

// ─────────────────────────────────────────────────────────────────────────────
// Seções com coordenadas em % (espaço 0–100)
// "top"/"left" = centro do círculo, "anchorTop"/"anchorLeft" = ponto no relevo
// ─────────────────────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: 'hero',
    label: 'Hero',
    top: '8%',
    left: '50%',
    anchorTop: '36%',
    anchorLeft: '50%',
    imgSeed: 10,
    accentColor: '#c4a97d',
  },
  {
    id: 'about',
    label: 'Sobre Mim',
    top: '15%',
    left: '20%',
    anchorTop: '40%',
    anchorLeft: '45%',
    imgSeed: 25,
    accentColor: '#7db8a9',
  },
  {
    id: 'sectionB',
    label: 'Habilidades',
    top: '15%',
    left: '80%',
    anchorTop: '40%',
    anchorLeft: '55%',
    imgSeed: 57,
    accentColor: '#a87db8',
  },
  {
    id: 'sectionA',
    label: 'Projetos',
    top: '42%',
    left: '10%',
    anchorTop: '50%',
    anchorLeft: '41%',
    imgSeed: 42,
    accentColor: '#7d9ab8',
  },
  {
    id: 'sectionC',
    label: 'Experiência',
    top: '42%',
    left: '90%',
    anchorTop: '50%',
    anchorLeft: '59%',
    imgSeed: 33,
    accentColor: '#7d9aaa',
  },
  {
    id: 'contact',
    label: 'Contato',
    top: '75%',
    left: '12%',
    anchorTop: '68%',
    anchorLeft: '42%',
    imgSeed: 73,
    accentColor: '#e07a5f',
  },
  {
    id: 'footer',
    label: 'Footer',
    top: '88%',
    left: '50%',
    anchorTop: '76%',
    anchorLeft: '50%',
    imgSeed: 88,
    accentColor: '#f4a261',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Helper: gera o <path> com curva Q entre ancoragem e círculo.
// O ponto de controle é deslocado perpendicularmente ao segmento em ~30% do
// comprimento, criando uma curva suave com ~120° de mudança de direção visual.
// Coordenadas em espaço 0–100 (pois o SVG tem viewBox="0 0 100 100").
// ─────────────────────────────────────────────────────────────────────────────
function getCurvedPath(ax, ay, cx, cy) {
  // Vetor de A→C e seu comprimento
  const dx = cx - ax
  const dy = cy - ay
  const len = Math.hypot(dx, dy)
  if (len < 0.001) return `M ${ax} ${ay} L ${cx} ${cy}`

  // Vetor perpendicular normalizado (rotacionado 90°)
  const px = -dy / len
  const py = dx / len

  // Ponto de controle: ponto médio deslocado perpendicularmente
  // Offset de ~30% do comprimento para criar a curvatura
  const offsetFactor = 0.3
  const qx = (ax + cx) / 2 + px * len * offsetFactor
  const qy = (ay + cy) / 2 + py * len * offsetFactor

  return `M ${ax} ${ay} Q ${qx} ${qy} ${cx} ${cy}`
}

export default function MountainScene() {
  const [hoveredId, setHoveredId] = useState(null)

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        backgroundImage: `url(${mountainBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#f0ede8',
        overflow: 'hidden',
      }}
    >
      {/* ── SVG Overlay: curvas conectoras com gradiente ───────────────────── */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <defs>
          {SECTIONS.map((section) => {
            const cx = parseFloat(section.left)
            const cy = parseFloat(section.top)
            const ax = parseFloat(section.anchorLeft)
            const ay = parseFloat(section.anchorTop)
            return (
              <linearGradient
                key={`grad-${section.id}`}
                id={`grad-${section.id}`}
                gradientUnits="userSpaceOnUse"
                // Gradiente vai do CÍRCULO (opaco) até a ÂNCORA (transparente)
                x1={cx} y1={cy}
                x2={ax} y2={ay}
              >
                <stop offset="0%"   stopColor="#1c1c1a" stopOpacity="1" />
                <stop offset="100%" stopColor="#1c1c1a" stopOpacity="0" />
              </linearGradient>
            )
          })}
        </defs>

        {SECTIONS.map((section) => {
          const ax = parseFloat(section.anchorLeft)
          const ay = parseFloat(section.anchorTop)
          const cx = parseFloat(section.left)
          const cy = parseFloat(section.top)
          const pathD = getCurvedPath(ax, ay, cx, cy)

          return (
            <path
              key={`line-${section.id}`}
              className={`mountain-line line-${section.id}`}
              d={pathD}
              fill="none"
              stroke={`url(#grad-${section.id})`}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              pathLength="100"
              strokeDasharray="100"
              strokeDashoffset="100"
              style={{ opacity: 0 }}
            />
          )
        })}
      </svg>

      {/* ── Marcadores Interativos ─────────────────────────────────────────── */}
      {SECTIONS.map((section, index) => {
        const isHovered = hoveredId === section.id

        return (
          <div
            key={section.id}
            style={{
              position: 'absolute',
              top: section.top,
              left: section.left,
              // Mantém o centro do grupo no ponto de coordenada
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
              // Necessário para o anel de glow se posicionar corretamente atrás
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Wrapper alvo do GSAP: controla opacity + translateY de entrada */}
            <div
              className={`mountain-marker-inner marker-${section.id}`}
              style={{
                opacity: 0,
                transform: 'translateY(8px)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              {/* ── Glow ring: posicionado absolutamente atrás do círculo ── */}
              <div
                className="pulse-glow-ring"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  // Inclui o label height: o centro do círculo é ~42px do topo do wrapper
                  // translate(-50%, -50%) do círculo = o centro do círculo (42px from top = half of 84px)
                  marginTop: '-42px', // offset para centralizar no círculo (não no wrapper inteiro)
                  width: '108px',
                  height: '108px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(28,28,26,0.15) 0%, rgba(28,28,26,0) 70%)',
                  zIndex: 0,
                  pointerEvents: 'none',
                  animationDelay: `${index * 0.3}s`,
                }}
              />

              {/* ── Conteúdo clicável ── */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  position: 'relative',
                  zIndex: 1,
                }}
                onPointerEnter={() => setHoveredId(section.id)}
                onPointerLeave={() => setHoveredId(null)}
                onClick={() => console.log('clicked section:', section.id)}
              >
                {/* ── Anel externo fino (segundo anel) ── */}
                <div
                  style={{
                    width: '88px',
                    height: '88px',
                    borderRadius: '50%',
                    border: '1px solid rgba(28,28,26,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.25s ease',
                    transform: isHovered ? 'scale(1.10)' : 'scale(1)',
                  }}
                >
                  {/* ── Círculo principal 84px ── */}
                  <div
                    style={{
                      width: '84px',
                      height: '84px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '2px solid #ffffff',
                      boxShadow: [
                        '0 1px 2px rgba(0,0,0,0.12)',
                        '0 6px 16px rgba(0,0,0,0.18)',
                        'inset 0 2px 3px rgba(255,255,255,0.4)',
                      ].join(', '),
                    }}
                  >
                    <img
                      src={`https://picsum.photos/seed/${section.imgSeed}/168/168`}
                      alt={section.label}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </div>
                </div>

                {/* ── Label de texto simples ── */}
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#1c1c1a',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    transition: 'transform 0.25s ease',
                    transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  {section.label}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
