import { AbsoluteFill, Audio, Sequence, Video, useCurrentFrame } from 'remotion'
import type { MusicTrack, TextOverlay, VideoAsset } from '../types/video'

export type VideoCompositionProps = {
  assets: VideoAsset[]
  mutedOriginal: boolean
  music: MusicTrack | null
  overlays: TextOverlay[]
  fps: number
}

export function VideoComposition({
  assets,
  mutedOriginal,
  music,
  overlays,
  fps,
}: VideoCompositionProps) {
  const frame = useCurrentFrame()
  const currentTime = frame / fps
  const visibleOverlays = overlays.filter((overlay) => currentTime >= overlay.start && currentTime <= overlay.end)

  return (
    <AbsoluteFill style={{ backgroundColor: '#050505' }}>
      {assets.map((asset, index) => {
        const from = assets.slice(0, index).reduce((total, currentAsset) => total + Math.ceil(currentAsset.duration * fps), 0)
        const durationInFrames = Math.max(1, Math.ceil(asset.duration * fps))

        return (
          <Sequence key={asset.id} from={from} durationInFrames={durationInFrames}>
            <Video
              src={asset.src}
              muted={mutedOriginal}
              volume={mutedOriginal ? 0 : 1}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </Sequence>
        )
      })}
      {music ? <Audio src={music.src} volume={music.volume} /> : null}
      <div className="video-social-chrome" aria-hidden="true">
        <span>♡<small>244</small></span>
        <span>○<small>1</small></span>
        <span>↗<small>3</small></span>
      </div>
      {visibleOverlays.map((overlay) => (
        <span
          key={overlay.id}
          className="video-overlay-text"
          style={{
            left: `${overlay.x}%`,
            top: `${overlay.y}%`,
            color: overlay.color,
            fontSize: `${overlay.size}px`,
          }}
        >
          {overlay.text}
        </span>
      ))}
    </AbsoluteFill>
  )
}
