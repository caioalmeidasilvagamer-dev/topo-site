import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import MountainScene from './MountainScene'
import mountainIntroVideo from '../assets/mountain-intro.mp4'

export default function IntroSequence() {
  const videoRef = useRef(null)
  const [videoActive, setVideoActive] = useState(true)

  const handleVideoEnd = () => {
    // 3. Ao disparar o evento 'ended': anima a opacity do video de 1 para 0 em 0.3s
    gsap.to(videoRef.current, {
      opacity: 0,
      duration: 0.3,
      onComplete: () => {
        setVideoActive(false) // Remove o vídeo do DOM após o fade
      },
    })

    // Cria sequência de animação dos marcadores e linhas conectores
    const tl = gsap.timeline()
    const order = ['hero', 'sectionB', 'sectionC', 'contact', 'sectionA', 'about', 'footer']

    order.forEach((id, index) => {
      const positionDelay = index * 0.12

      // Linha conectora "desenha" crescendo até o círculo
      tl.to(`.line-${id}`, {
        strokeDashoffset: 0,
        opacity: 1,
        duration: 0.4,
        ease: 'power2.out',
      }, positionDelay)

      // Círculo + label faz fade-in e sobe
      tl.to(`.marker-${id}`, {
        opacity: 1,
        y: 0, // Anima o translateY de 8px para 0px
        duration: 0.4,
        ease: 'power2.out',
      }, positionDelay)
    })
  }

  const handleVideoError = (e) => {
    console.error('Erro ao carregar o vídeo de introdução:', e)
    // 4. Trata erro: esconde o vídeo e mostra a MountainScene com marcadores visíveis direto
    setVideoActive(false)
    const order = ['hero', 'sectionB', 'sectionC', 'contact', 'sectionA', 'about', 'footer']
    order.forEach((id) => {
      gsap.set(`.line-${id}`, {
        strokeDashoffset: 0,
        opacity: 1,
      })
      gsap.set(`.marker-${id}`, {
        opacity: 1,
        y: 0,
      })
    })
  }

  // Se o autoplay do vídeo falhar ou não iniciar por algum motivo (ex: restrições do navegador),
  // garantimos que o usuário não fique preso numa tela estática infinita.
  useEffect(() => {
    const video = videoRef.current
    if (video) {
      const playPromise = video.play()
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn('Autoplay bloqueado ou falhou. Iniciando cena diretamente.', error)
          handleVideoError(error)
        })
      }
    }
  }, [])

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#f0ede8',
        overflow: 'hidden',
      }}
    >
      {/* 2. Por baixo do vídeo, renderiza a MountainScene com marcadores invisíveis */}
      <MountainScene />

      {/* 1. Vídeo de introdução em primeiro plano (objectFit: cover) */}
      {videoActive && (
        <video
          ref={videoRef}
          src={mountainIntroVideo}
          autoPlay
          muted
          playsInline
          onEnded={handleVideoEnd}
          onCanPlayThrough={() => {
            // Garante o início imediato se o autoplay estiver habilitado
            videoRef.current?.play().catch(() => {})
          }}
          onError={handleVideoError}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover', // Preenche 100% da tela sem margens pretas
            backgroundColor: '#f0ede8',
            zIndex: 10,
          }}
        />
      )}
    </div>
  )
}
