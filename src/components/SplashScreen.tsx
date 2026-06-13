import { type CSSProperties, useEffect, useState } from 'react'
import slogan from '../assets/슬로건.png'
import './SplashScreen.css'

const SPLASH_HOLD_MS = 3000
const SPLASH_EXIT_MS = 260
const SPLASH_COPY = ['사진 속 추억을 캐치,', '숨어있는 위험도 캐치!']

type SplashScreenProps = {
  onComplete: () => void
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isFinishing, setIsFinishing] = useState(false)

  useEffect(() => {
    const finishTimer = window.setTimeout(() => setIsFinishing(true), SPLASH_HOLD_MS)
    const completeTimer = window.setTimeout(onComplete, SPLASH_HOLD_MS + SPLASH_EXIT_MS)

    return () => {
      window.clearTimeout(finishTimer)
      window.clearTimeout(completeTimer)
    }
  }, [onComplete])

  return (
    <section className={`splash-screen ${isFinishing ? 'is-finishing' : ''}`} aria-label="앱 시작 화면">
      <p className="splash-copy" aria-label={SPLASH_COPY.join(' ')}>
        {SPLASH_COPY.map((line, lineIndex) => (
          <span className="splash-copy-line" key={line}>
            {Array.from(line).map((char, charIndex) => (
              <span
                aria-hidden="true"
                className="splash-copy-char"
                key={`${line}-${charIndex}`}
                style={{ '--char-index': String(lineIndex * 16 + charIndex) } as CSSProperties}
              >
                {char === ' ' ? '\u00a0' : char}
              </span>
            ))}
          </span>
        ))}
      </p>
      <img className="splash-logo-image" src={slogan} alt="앱 슬로건" draggable={false} />
    </section>
  )
}
