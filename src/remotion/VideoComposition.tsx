import { AbsoluteFill, Audio, Sequence, Video, useCurrentFrame } from 'remotion'
import type { MediaDetection, VideoAnalyzeFrame } from '../types/api'
import type { MusicTrack, TextOverlay, VideoAsset } from '../types/video'

export type VideoCompositionProps = {
  assets: VideoAsset[]
  disabledCatchItems: Record<string, boolean>
  mutedOriginal: boolean
  music: MusicTrack | null
  overlays: TextOverlay[]
  fps: number
}

type CompositionCatchRegion = {
  id: string
  label: string
  left: number
  top: number
  width: number
  height: number
  active: boolean
}

const detectionLabelMap: Record<string, string> = {
  school_logo: '학교명패',
  name_tag: '교복/명찰',
  address: '주소',
  gps: '위치정보',
  recording_date: '촬영일시',
  device: '기기정보',
  car_plate: '번호판',
  card_num: '카드번호',
  name: '이름',
  phone: '전화번호',
  resident_num: '주민번호',
  face: '얼굴',
  unknown: '위험 요소',
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value))
}

function getDetectionLabel(label: string) {
  return detectionLabelMap[label] ?? label
}

function getVideoCatchItemId(assetId: string, detection: MediaDetection) {
  return detection.trackId !== undefined
    ? `${assetId}:${detection.label}:${detection.trackId}`
    : `${assetId}:${detection.detectionId}`
}

function getCurrentVideoFrame(frames: VideoAnalyzeFrame[], frameNumber: number) {
  return frames.find((videoFrame) => frameNumber >= videoFrame.startFrame && frameNumber <= videoFrame.endFrame) ?? null
}

function getCurrentPlaybackAsset(assets: VideoAsset[], currentTime: number, fps: number) {
  let elapsedDuration = 0

  for (const asset of assets) {
    const assetEnd = elapsedDuration + asset.duration
    if (currentTime < assetEnd || asset === assets[assets.length - 1]) {
      const assetTime = Math.max(0, currentTime - elapsedDuration)
      const analysisFps = asset.analysis?.result?.video.fps ?? fps

      return {
        asset,
        frameNumber: Math.floor(assetTime * analysisFps),
      }
    }

    elapsedDuration = assetEnd
  }

  return null
}

function getCurrentCatchRegions(
  assets: VideoAsset[],
  currentTime: number,
  fps: number,
  disabledCatchItems: Record<string, boolean>,
) {
  const playbackAsset = getCurrentPlaybackAsset(assets, currentTime, fps)
  if (!playbackAsset) return []

  const currentFrame = getCurrentVideoFrame(playbackAsset.asset.analysis?.result?.frames ?? [], playbackAsset.frameNumber)
  if (!currentFrame) return []

  return currentFrame.detections.map<CompositionCatchRegion>((detection) => {
    const [left, top, right, bottom] = detection.bboxNorm

    return {
      id: detection.detectionId,
      label: getDetectionLabel(detection.label),
      left: clampPercent(left * 100),
      top: clampPercent(top * 100),
      width: clampPercent((right - left) * 100),
      height: clampPercent((bottom - top) * 100),
      active: disabledCatchItems[getVideoCatchItemId(playbackAsset.asset.id, detection)] !== true,
    }
  })
}

export function VideoComposition({
  assets,
  disabledCatchItems,
  mutedOriginal,
  music,
  overlays,
  fps,
}: VideoCompositionProps) {
  const frame = useCurrentFrame()
  const currentTime = frame / fps
  const visibleOverlays = overlays.filter((overlay) => currentTime >= overlay.start && currentTime <= overlay.end)
  const catchRegions = getCurrentCatchRegions(assets, currentTime, fps, disabledCatchItems)

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
      <div className="video-composition-risk-layer" aria-hidden="true">
        {catchRegions.map((region) => (
          <span
            key={region.id}
            className={`video-composition-risk-region ${region.active ? 'active' : 'inactive'}`}
            style={{
              left: `${region.left}%`,
              top: `${region.top}%`,
              width: `${region.width}%`,
              height: `${region.height}%`,
            }}
          >
            {region.active ? <span className="video-composition-blur-fill" /> : null}
            <span className="video-composition-risk-label">{region.label}</span>
          </span>
        ))}
      </div>
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
