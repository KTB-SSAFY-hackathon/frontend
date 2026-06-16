import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Player } from '@remotion/player'
import type { PlayerRef } from '@remotion/player'
import { Link } from 'react-router-dom'
import warningIcon from '../assets/경고.png'
import { fixedVideoAssets } from '../data/videoAssets'
import { VideoComposition } from '../remotion/VideoComposition'
import type { MediaDetection, VideoAnalyzeFrame } from '../types/api'
import type { MusicTrack, TextOverlay, VideoAsset } from '../types/video'
import { analyzeVideoFile, fileFromAssetSource } from '../utils/backendApi'
import { clamp, formatTime } from '../utils/video'
import './VideoEditorPage.css'

type VideoPanel = 'music' | 'text' | 'catch'
type VideoCatchItem = {
  id: string
  assetId: string
  assetName: string
  label: string
  trackId?: number
  frameHits: number
}
type VideoPreviewCatchRegion = {
  id: string
  catchItemId: string
  label: string
  left: number
  top: number
  width: number
  height: number
  active: boolean
}

const AI_SCAN_DELAY_MS = 3000
const VIDEO_EDITOR_TIME_UPDATE_INTERVAL = 0.2
const VIDEO_CATCH_REGION_PADDING_PERCENT = 2.5
const VIDEO_EDITOR_FPS = 24
const videoRiskLevels = [
  { key: 'danger', label: '위험', description: '가려진 요소가 부족해요' },
  { key: 'good', label: '양호', description: '일부 요소가 보호됐어요' },
  { key: 'safe', label: '안전', description: '공유 가능한 수준이에요' },
] as const
const videoDetectionLabelMap: Record<string, string> = {
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

const defaultOverlay: Omit<TextOverlay, 'id' | 'text'> = {
  start: 0,
  end: 3,
  x: 50,
  y: 50,
  size: 28,
  color: '#ffffff',
}

function getProtectionProgress(protectedRegionCount: number, totalRiskRegionCount: number) {
  if (totalRiskRegionCount <= 0) return 100
  return Math.round((protectedRegionCount / totalRiskRegionCount) * 100)
}

function getVideoRiskLevel(protectionProgress: number) {
  if (protectionProgress >= 60) return videoRiskLevels[2]
  if (protectionProgress >= 30) return videoRiskLevels[1]
  return videoRiskLevels[0]
}

function getVideoDetectionLabel(label: string) {
  return videoDetectionLabelMap[label] ?? label
}

function getVideoCatchItemId(assetId: string, detection: MediaDetection) {
  return detection.trackId !== undefined
    ? `${assetId}:${detection.label}:${detection.trackId}`
    : `${assetId}:${detection.detectionId}`
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value))
}

function expandVideoCatchRegion(left: number, top: number, right: number, bottom: number) {
  const expandedLeft = clampPercent(left * 100 - VIDEO_CATCH_REGION_PADDING_PERCENT)
  const expandedTop = clampPercent(top * 100 - VIDEO_CATCH_REGION_PADDING_PERCENT)
  const expandedRight = clampPercent(right * 100 + VIDEO_CATCH_REGION_PADDING_PERCENT)
  const expandedBottom = clampPercent(bottom * 100 + VIDEO_CATCH_REGION_PADDING_PERCENT)

  return {
    left: expandedLeft,
    top: expandedTop,
    width: Math.max(0, expandedRight - expandedLeft),
    height: Math.max(0, expandedBottom - expandedTop),
  }
}

function buildVideoCatchItems(assets: VideoAsset[]) {
  const groupedItems = new Map<string, VideoCatchItem>()

  assets.forEach((asset) => {
    asset.analysis?.result?.frames.forEach((frame) => {
      frame.detections.forEach((detection) => {
        const itemId = getVideoCatchItemId(asset.id, detection)
        const currentItem = groupedItems.get(itemId)

        if (currentItem) {
          currentItem.frameHits += 1
          return
        }

        groupedItems.set(itemId, {
          id: itemId,
          assetId: asset.id,
          assetName: asset.name,
          label: getVideoDetectionLabel(detection.label),
          trackId: detection.trackId,
          frameHits: 1,
        })
      })
    })
  })

  return Array.from(groupedItems.values())
}

function getCurrentVideoPlaybackState(assets: VideoAsset[], currentTime: number, fps: number) {
  let elapsedDuration = 0

  for (const asset of assets) {
    const assetEnd = elapsedDuration + asset.duration
    if (currentTime < assetEnd || asset === assets[assets.length - 1]) {
      const assetTime = Math.max(0, currentTime - elapsedDuration)
      const analysisFps = asset.analysis?.result?.video.fps ?? fps
      return {
        asset,
        assetTime,
        frameNumber: Math.floor(assetTime * analysisFps),
      }
    }

    elapsedDuration = assetEnd
  }

  return null
}

function getCurrentVideoFrame(frames: VideoAnalyzeFrame[], frameNumber: number) {
  return frames.find((frame) => frameNumber >= frame.startFrame && frameNumber <= frame.endFrame) ?? null
}

function getPreviewCatchRegions(
  asset: VideoAsset,
  frameNumber: number,
  disabledItemsById: Record<string, boolean>,
) {
  const currentFrame = getCurrentVideoFrame(asset.analysis?.result?.frames ?? [], frameNumber)
  if (!currentFrame) return []

  return currentFrame.detections
    .map<VideoPreviewCatchRegion>((detection) => {
      const [left, top, right, bottom] = detection.bboxNorm
      const catchItemId = getVideoCatchItemId(asset.id, detection)
      const expandedRegion = expandVideoCatchRegion(left, top, right, bottom)

      return {
        id: detection.detectionId,
        catchItemId,
        label: getVideoDetectionLabel(detection.label),
        left: expandedRegion.left,
        top: expandedRegion.top,
        width: expandedRegion.width,
        height: expandedRegion.height,
        active: disabledItemsById[catchItemId] !== true,
      }
    })
}

export function VideoEditorPage() {
  const videoInputRef = useRef<HTMLInputElement>(null)
  const urlsRef = useRef<string[]>([])
  const aiScanTimerRef = useRef<number | null>(null)
  const analysisTasksRef = useRef<Record<string, Promise<void>>>({})
  const metadataTasksRef = useRef<Record<string, Promise<void>>>({})
  const videosRef = useRef<VideoAsset[]>([])
  const [videos, setVideos] = useState<VideoAsset[]>(fixedVideoAssets)
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([])
  const [editingVideos, setEditingVideos] = useState<VideoAsset[] | null>(null)
  const [pendingVideos, setPendingVideos] = useState<VideoAsset[] | null>(null)
  const [analysisNotice, setAnalysisNotice] = useState('')

  useEffect(() => () => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    if (aiScanTimerRef.current) {
      window.clearTimeout(aiScanTimerRef.current)
    }
  }, [])

  useEffect(() => {
    videosRef.current = videos
  }, [videos])

  const ensureVideoMetadata = useCallback((videoId: string, src: string) => {
    const existingTask = metadataTasksRef.current[videoId]
    if (existingTask) return existingTask

    const probe = document.createElement('video')
    probe.preload = 'metadata'

    const metadataTask = new Promise<void>((resolve) => {
      const finalize = () => {
        delete metadataTasksRef.current[videoId]
        probe.removeAttribute('src')
        probe.load()
        resolve()
      }

      probe.onloadedmetadata = () => {
        const nextDuration = Number.isFinite(probe.duration) && probe.duration > 0 ? probe.duration : null
        if (nextDuration !== null) {
          setVideos((currentVideos) => currentVideos.map((currentVideo) => (
            currentVideo.id === videoId
              ? { ...currentVideo, duration: nextDuration }
              : currentVideo
          )))
        }

        finalize()
      }

      probe.onerror = () => {
        finalize()
      }
    })

    metadataTasksRef.current[videoId] = metadataTask
    probe.src = src
    return metadataTask
  }, [])

  useEffect(() => {
    fixedVideoAssets.forEach((videoAsset) => {
      void ensureVideoMetadata(videoAsset.id, videoAsset.src)
    })
  }, [ensureVideoMetadata])

  function updateVideoAnalysis(videoId: string, nextAnalysis: VideoAsset['analysis']) {
    setVideos((currentVideos) => currentVideos.map((video) => (
      video.id === videoId
        ? {
            ...video,
            analysis: nextAnalysis,
          }
        : video
    )))
  }

  function waitForScanOverlay() {
    return new Promise<void>((resolve) => {
      aiScanTimerRef.current = window.setTimeout(() => {
        aiScanTimerRef.current = null
        resolve()
      }, AI_SCAN_DELAY_MS)
    })
  }

  function startVideoAnalysis(videoId: string, selectedFile?: File, fallbackVideo?: VideoAsset) {
    const currentVideo = videosRef.current.find((video) => video.id === videoId) ?? fallbackVideo
    if (!currentVideo) return Promise.resolve()

    if (currentVideo.analysis?.status === 'success') {
      return Promise.resolve()
    }

    const existingTask = analysisTasksRef.current[videoId]
    if (existingTask) {
      return existingTask
    }

    updateVideoAnalysis(videoId, {
      status: 'loading',
      result: currentVideo.analysis?.result,
    })

    const analysisTask = (async () => {
      try {
        const fileToAnalyze = selectedFile ?? await fileFromAssetSource(currentVideo.src, currentVideo.name)
        const result = await analyzeVideoFile(fileToAnalyze)
        updateVideoAnalysis(videoId, {
          status: 'success',
          result,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : '영상 분석에 실패했습니다.'
        updateVideoAnalysis(videoId, {
          status: 'error',
          result: currentVideo.analysis?.result,
          errorMessage: message,
        })
        setAnalysisNotice(message)
      } finally {
        delete analysisTasksRef.current[videoId]
      }
    })()

    analysisTasksRef.current[videoId] = analysisTask
    return analysisTask
  }

  function handleVideoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith('video/'))

    files.forEach((file, index) => {
      const src = URL.createObjectURL(file)
      urlsRef.current.push(src)
      const nextVideo: VideoAsset = {
        id: `${file.name}-${file.lastModified}-${index}`,
        name: file.name.replace(/\.[^.]+$/, ''),
        src,
        duration: 0,
        analysis: {
          status: 'loading',
        },
      }

      setAnalysisNotice('')
      setVideos((currentVideos) => [nextVideo, ...currentVideos])
      void startVideoAnalysis(nextVideo.id, file, nextVideo)
      void ensureVideoMetadata(nextVideo.id, src)
    })

    event.target.value = ''
  }

  const selectedVideos = selectedVideoIds
    .map((selectedId) => videos.find((video) => video.id === selectedId))
    .filter((video): video is VideoAsset => Boolean(video))

  const pendingPreviewVideo = pendingVideos?.[0] ?? null

  function toggleVideoSelection(videoId: string) {
    setSelectedVideoIds((currentIds) => (
      currentIds.includes(videoId)
        ? currentIds.filter((currentId) => currentId !== videoId)
        : [...currentIds, videoId]
    ))
  }

  async function handleStartEditing() {
    if (selectedVideos.length === 0) {
      videoInputRef.current?.click()
      return
    }

    setPendingVideos(selectedVideos)
    setAnalysisNotice('')
    if (aiScanTimerRef.current) {
      window.clearTimeout(aiScanTimerRef.current)
    }

    await Promise.all([
      waitForScanOverlay(),
      Promise.all(selectedVideos.map((video) => startVideoAnalysis(video.id, undefined, video).catch(() => undefined))),
      Promise.all(selectedVideos.map((video) => ensureVideoMetadata(video.id, video.src))),
    ])

    const latestVideos = selectedVideoIds
      .map((selectedId) => videosRef.current.find((video) => video.id === selectedId))
      .filter((video): video is VideoAsset => Boolean(video))

    setEditingVideos(latestVideos)
    setPendingVideos(null)
  }

  if (editingVideos) {
    return <VideoEditor assets={editingVideos} onBack={() => setEditingVideos(null)} />
  }

  return (
    <section className="video-page">
      <header className="video-picker-header">
        <Link to="/" className="video-close" aria-label="홈으로 이동">
          <svg data-slot="icon" fill="none" strokeWidth="1.5" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </Link>
        <button className="video-title" type="button" onClick={() => videoInputRef.current?.click()}>
          앨범
        </button>
        <button
          className="video-action"
          type="button"
          onClick={() => void handleStartEditing()}
        >
          {selectedVideos.length > 0 ? '편집' : '불러오기'}
        </button>
      </header>

      <input
        ref={videoInputRef}
        className="sr-only"
        type="file"
        accept="video/*"
        multiple
        onChange={handleVideoChange}
      />

      <button className="video-picker-banner" type="button" onClick={() => videoInputRef.current?.click()}>
        캐치캐치할 영상을 선택해 주세요
      </button>

      {analysisNotice ? (
        <p className="video-analysis-notice" role="status">
          {analysisNotice}
        </p>
      ) : null}

      <div className="video-grid">
        {videos.map((video) => {
          const selectedIndex = selectedVideoIds.indexOf(video.id)
          const isSelected = selectedIndex >= 0

          return (
            <button
              key={video.id}
              className={`video-tile ${isSelected ? 'selected' : ''}`}
              type="button"
              onClick={() => toggleVideoSelection(video.id)}
            >
              <video src={video.src} muted playsInline preload="metadata" />
              {isSelected ? <strong>{selectedIndex + 1}</strong> : null}
              {video.analysis?.status === 'loading' ? (
                <i className="video-tile-badge video-tile-badge-loading">분석중</i>
              ) : null}
              {video.analysis?.status === 'error' ? (
                <i className="video-tile-badge video-tile-badge-error">재시도</i>
              ) : null}
            </button>
          )
        })}
      </div>

      {pendingPreviewVideo ? (
        <div className="video-scan-overlay" aria-live="polite" aria-label="AI가 영상을 분석하는 중">
          <div className="video-scan-preview">
            <video src={pendingPreviewVideo.src} autoPlay muted loop playsInline />
            <div className="video-scan-dim" />
            <div className="video-scan-target">
              <span className="video-scan-corner top-left" />
              <span className="video-scan-corner top-right" />
              <span className="video-scan-corner bottom-right" />
              <span className="video-scan-corner bottom-left" />
              <span className="video-scan-dot" />
            </div>
            <div className="video-scan-grid" />
            <div className="video-scan-line" />
          </div>
          <p className="video-scan-copy">AI가 영상을 탐색하고 있어요</p>
        </div>
      ) : null}
    </section>
  )
}

function VideoEditor({ assets, onBack }: { assets: VideoAsset[]; onBack: () => void }) {
  const playerRef = useRef<PlayerRef>(null)
  const musicInputRef = useRef<HTMLInputElement>(null)
  const projectDuration = useMemo(
    () => assets.reduce((totalDuration, asset) => totalDuration + asset.duration, 0),
    [assets],
  )
  const [activePanel, setActivePanel] = useState<VideoPanel>('catch')
  const trimStart = 0
  const trimEnd = projectDuration
  const [playbackRate] = useState(1)
  const [mutedOriginal] = useState(false)
  const [music, setMusic] = useState<MusicTrack | null>(null)
  const [textDraft, setTextDraft] = useState('New Text')
  const [overlays, setOverlays] = useState<TextOverlay[]>([])
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(trimStart)
  const [disabledCatchItems, setDisabledCatchItems] = useState<Record<string, boolean>>({})
  const selectedOverlay = overlays.find((overlay) => overlay.id === selectedOverlayId) ?? null
  const catchItems = useMemo(() => buildVideoCatchItems(assets), [assets])
  const totalRiskRegionCount = catchItems.length
  const protectedRegionCount = catchItems.filter((item) => disabledCatchItems[item.id] !== true).length
  const protectionProgress = getProtectionProgress(protectedRegionCount, totalRiskRegionCount)
  const riskLevel = getVideoRiskLevel(protectionProgress)
  const fps = VIDEO_EDITOR_FPS
  const durationInFrames = Math.max(1, Math.ceil(projectDuration * fps))
  const currentPlaybackState = useMemo(
    () => getCurrentVideoPlaybackState(assets, currentTime, fps),
    [assets, currentTime, fps],
  )
  const previewCatchRegions = useMemo(
    () => currentPlaybackState
      ? getPreviewCatchRegions(currentPlaybackState.asset, currentPlaybackState.frameNumber, disabledCatchItems)
      : [],
    [currentPlaybackState, disabledCatchItems],
  )
  const currentFrameCatchItemIds = useMemo(
    () => new Set(previewCatchRegions.map((region) => region.catchItemId)),
    [previewCatchRegions],
  )
  const playerInputProps = useMemo(
    () => ({
      assets,
      disabledCatchItems,
      mutedOriginal,
      music,
      overlays,
      fps,
    }),
    [assets, disabledCatchItems, fps, music, mutedOriginal, overlays],
  )

  useEffect(() => {
    const player = playerRef.current
    if (!player) return

    const handleFrameUpdate = ({ detail }: { detail: { frame: number } }) => {
      const nextTime = detail.frame / fps

      if (nextTime < trimStart) {
        player.seekTo(Math.round(trimStart * fps))
        return
      }

      if (nextTime >= trimEnd) {
        player.pause()
        player.seekTo(Math.round(trimStart * fps))
        setCurrentTime(trimStart)
        return
      }

      setCurrentTime((currentValue) => (
        Math.abs(nextTime - currentValue) >= VIDEO_EDITOR_TIME_UPDATE_INTERVAL
          ? nextTime
          : currentValue
      ))
    }

    player.addEventListener('frameupdate', handleFrameUpdate)

    return () => {
      player.removeEventListener('frameupdate', handleFrameUpdate)
    }
  }, [fps, trimEnd, trimStart])

  function togglePlayback() {
    const player = playerRef.current
    if (!player) return

    if (!player.isPlaying()) {
      if (currentTime < trimStart || currentTime >= trimEnd) {
        player.seekTo(Math.round(trimStart * fps))
        setCurrentTime(trimStart)
      }
      player.play()
    } else {
      player.pause()
    }
  }

  function handleMusicChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const src = URL.createObjectURL(file)
    setMusic((currentMusic) => {
      if (currentMusic) URL.revokeObjectURL(currentMusic.src)

      return {
        name: file.name.replace(/\.[^.]+$/, ''),
        src,
        volume: 0.7,
      }
    })
    event.target.value = ''
  }

  function addTextOverlay() {
    const cleanText = textDraft.trim()
    if (!cleanText) return

    const start = clamp(currentTime, trimStart, trimEnd)
    const overlay = {
      ...defaultOverlay,
      id: crypto.randomUUID(),
      text: cleanText,
      start,
      end: clamp(start + 3, start + 0.5, trimEnd),
    }

    setOverlays((currentOverlays) => [...currentOverlays, overlay])
    setSelectedOverlayId(overlay.id)
  }

  function updateSelectedOverlay<Key extends keyof TextOverlay>(key: Key, value: TextOverlay[Key]) {
    if (!selectedOverlayId) return

    setOverlays((currentOverlays) => currentOverlays.map((overlay) => (
      overlay.id === selectedOverlayId ? { ...overlay, [key]: value } : overlay
    )))
  }

  function toggleCatchItem(itemId: string) {
    setDisabledCatchItems((currentItems) => {
      const nextItems = { ...currentItems }

      if (nextItems[itemId] === true) {
        delete nextItems[itemId]
      } else {
        nextItems[itemId] = true
      }

      return nextItems
    })
  }

  function saveProject() {
    const project = {
      assets,
      trimStart,
      trimEnd,
      playbackRate,
      mutedOriginal,
      music,
      overlays,
    }
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'video-project.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="video-editor timeline-editor">
      <header className="video-editor-header">
        <button className="video-editor-back" type="button" onClick={onBack} aria-label="비디오 목록으로 돌아가기">
          ←
        </button>
        <div className="video-project-title" aria-hidden="true" />
        <div className="video-editor-actions">
          <button className="video-editor-secondary" type="button" aria-label="영상 프로젝트 공유">
            <svg fill="none" strokeWidth="1.5" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </button>
          <button className="video-editor-save" type="button" onClick={saveProject} aria-label="편집한 영상 프로젝트 저장">
            <svg fill="none" strokeWidth="1.5" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </button>
        </div>
      </header>

      <div className="video-risk-meter" aria-label={`개인정보 보호 상태 ${riskLevel.label}, ${protectionProgress}% 가림`}>
        <div className="video-risk-copy">
          <span>개인정보 보호 진행률</span>
          <strong>{protectionProgress}%</strong>
        </div>
        <div className="video-risk-track" aria-hidden="true">
          <div className="video-risk-track-bar">
            <span className="video-risk-track-gradient" />
            <span className="video-risk-track-marker" style={{ left: `clamp(10px, ${protectionProgress}%, calc(100% - 10px))` }}>
              <span className="video-risk-track-marker-line" />
            </span>
          </div>
          <div className="video-risk-track-scale">
            {videoRiskLevels.map((level) => (
              <span key={level.key} className={riskLevel.key === level.key ? 'active' : ''}>
                {level.label}
              </span>
            ))}
          </div>
        </div>
        <p className="video-risk-description">
          {totalRiskRegionCount > 0
            ? `${riskLevel.description} · ${protectedRegionCount}/${totalRiskRegionCount}개 가림`
            : '탐지된 위험 요소가 없어요'}
        </p>
      </div>

      <div className="video-preview-stage">
        <div className="video-preview-frame">
          <Player
            ref={playerRef}
            component={VideoComposition}
            durationInFrames={durationInFrames}
            compositionWidth={1080}
            compositionHeight={1920}
            fps={fps}
            controls={false}
            clickToPlay={false}
            playbackRate={playbackRate}
            initiallyMuted={mutedOriginal}
            style={{ width: '100%', height: '100%' }}
            inputProps={playerInputProps}
          />
        </div>
      </div>

      <div className="video-transport">
        <button type="button" onClick={togglePlayback} aria-label="재생 또는 정지">
          <svg fill="none" strokeWidth="1.5" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
          </svg>
        </button>
        <button type="button" aria-label="전체 화면">⛶</button>
        <span>{formatTime(currentTime)} / {formatTime(trimEnd)}</span>
        <button type="button" aria-label="실행 취소">
          <svg fill="none" strokeWidth="1.5" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <button type="button" aria-label="다시 실행">
          <svg fill="none" strokeWidth="1.5" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      <div className="video-bottom-editor">
        <aside className="timeline-track-rail" aria-label="편집 메뉴">
          <button type="button" className={activePanel === 'music' ? 'active' : ''} onClick={() => setActivePanel('music')}><span>♫</span>배경음악</button>
          <button type="button" className={activePanel === 'text' ? 'active' : ''} onClick={() => setActivePanel('text')}><span>⌁</span>텍스트</button>
          <button type="button" className={activePanel === 'catch' ? 'active' : ''} onClick={() => setActivePanel('catch')}>
            <img src={warningIcon} alt="" aria-hidden="true" />
            캐치
          </button>
        </aside>

        <div className="timeline-inspector">
          {activePanel === 'music' ? (
            <div className="video-music-panel">
              <input ref={musicInputRef} className="sr-only" type="file" accept="audio/*" onChange={handleMusicChange} />
              <div className="music-row">
                <span className="music-name">{music ? music.name : '삽입된 음악 없음'}</span>
                <button type="button" onClick={() => musicInputRef.current?.click()}>음악 선택</button>
              </div>
              {music ? <p className="video-panel-description">선택한 음악이 영상 전체에 적용됩니다.</p> : null}
              <label className="video-range">
                <span>음량</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={music?.volume ?? 0.7}
                  disabled={!music}
                  onChange={(event) => setMusic((currentMusic) => currentMusic ? { ...currentMusic, volume: Number(event.target.value) } : currentMusic)}
                />
                <output>{Math.round((music?.volume ?? 0.7) * 100)}</output>
              </label>
            </div>
          ) : null}

          {activePanel === 'text' ? (
            <div className="video-text-panel">
              <div className="text-input-row">
                <input value={textDraft} onChange={(event) => setTextDraft(event.target.value)} aria-label="삽입할 텍스트" />
                <button type="button" onClick={addTextOverlay}>추가</button>
              </div>
              <p className="video-panel-description">현재 재생 구간 기준으로 텍스트가 추가됩니다.</p>
              {selectedOverlay ? (
                <>
                  <div className="text-position-row">
                    <input type="number" value={selectedOverlay.x} min={5} max={95} onChange={(event) => updateSelectedOverlay('x', Number(event.target.value))} aria-label="텍스트 X 위치" />
                    <input type="number" value={selectedOverlay.y} min={5} max={95} onChange={(event) => updateSelectedOverlay('y', Number(event.target.value))} aria-label="텍스트 Y 위치" />
                    <input type="number" value={selectedOverlay.size} min={14} max={54} onChange={(event) => updateSelectedOverlay('size', Number(event.target.value))} aria-label="텍스트 크기" />
                  </div>
                  <div className="text-position-row">
                    <input type="number" value={selectedOverlay.start} min={trimStart} max={trimEnd} step={0.1} onChange={(event) => updateSelectedOverlay('start', Number(event.target.value))} aria-label="텍스트 시작 시간" />
                    <input type="number" value={selectedOverlay.end} min={trimStart} max={trimEnd} step={0.1} onChange={(event) => updateSelectedOverlay('end', Number(event.target.value))} aria-label="텍스트 종료 시간" />
                    <input type="color" value={selectedOverlay.color} onChange={(event) => updateSelectedOverlay('color', event.target.value)} aria-label="텍스트 색상" />
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {activePanel === 'catch' ? (
            <div className="video-catch-panel">
              {catchItems.length > 0 ? (
                <div className="video-catch-list">
                  {catchItems.map((item) => (
                    <button
                      key={item.id}
                      className={`video-catch-item ${disabledCatchItems[item.id] !== true ? 'active' : 'inactive'} ${currentFrameCatchItemIds.has(item.id) ? 'current' : ''}`}
                      type="button"
                      onClick={() => toggleCatchItem(item.id)}
                      aria-pressed={disabledCatchItems[item.id] !== true}
                    >
                      <span className={`video-catch-icon ${disabledCatchItems[item.id] !== true ? 'active' : ''}`}>
                        <img src={warningIcon} alt="" aria-hidden="true" />
                      </span>
                      <div className="video-catch-copy">
                        <strong>{item.label}</strong>
                        <span>{item.assetName} · {item.frameHits}프레임</span>
                      </div>
                      <span className={`video-catch-state ${disabledCatchItems[item.id] !== true ? 'active' : ''}`}>
                        {disabledCatchItems[item.id] !== true ? '블러 ON' : '블러 OFF'}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="video-placeholder-panel">
                  <strong>탐지 결과 없음</strong>
                  <span>영상 분석이 끝나면 여기서 블러 적용을 토글할 수 있어요.</span>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
