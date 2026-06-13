import type { CSSProperties } from 'react'
import { fixedGalleryPhotos } from '../data/photoAssets'
import './LoginPage.css'

type LoginPageProps = {
  onLogin: () => void
}

const LOGIN_SEGMENTS = 34

const loginTiles = Array.from({ length: LOGIN_SEGMENTS }, (_, column) => -37 + column * 2).flatMap((x, column) => {
  const ys = column % 2 === 0 ? [-8, -6, -4, -2, 0, 2, 4, 6, 8] : [-7, -5, -3, -1, 1, 3, 5, 7, 9]
  const staggerY = column % 2 === 0 ? -22 : 22

  return ys.map((y, row) => {
    const photo = fixedGalleryPhotos[(column * ys.length + row) % fixedGalleryPhotos.length]

    return {
      id: `${photo.id}-login-${column}-${row}`,
      src: photo.src,
      x,
      y,
      sizeX: 2,
      sizeY: 2,
      staggerY,
    }
  })
})

export function LoginPage({ onLogin }: LoginPageProps) {
  return (
    <section className="login-page" aria-label="로그인 화면">
      <div className="login-gallery" aria-hidden="true">
        <div
          className="login-sphere"
          style={
            {
              '--segments-x': LOGIN_SEGMENTS,
              '--segments-y': LOGIN_SEGMENTS,
            } as CSSProperties
          }
        >
          <div className="login-rotor">
            {loginTiles.map((tile) => (
              <div
                key={tile.id}
                className="login-tile"
                style={
                  {
                    '--offset-x': tile.x,
                    '--offset-y': tile.y,
                    '--item-size-x': tile.sizeX,
                    '--item-size-y': tile.sizeY,
                    '--stagger-y': `${tile.staggerY}px`,
                  } as CSSProperties
                }
              >
                <img src={tile.src} alt="" draggable={false} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="login-content">
        <p className="login-copy">
          사진 속 추억을 <span>캐치</span>,
          <br />
          숨어있는 위험도 <span>캐치</span>!
        </p>
        <button type="button" className="login-button" onClick={onLogin}>
          로그인
        </button>
      </div>
    </section>
  )
}
