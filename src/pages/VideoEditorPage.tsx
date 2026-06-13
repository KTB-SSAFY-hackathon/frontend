import { useEffect, useRef, useState } from 'react'
import { Player } from '@remotion/player'
import type { PlayerRef } from '@remotion/player'
import { Link } from 'react-router-dom'
import warningIcon from '../assets/경고.png'
import { fixedVideoAssets } from '../data/videoAssets'
import { VideoComposition } from '../remotion/VideoComposition'
import type { MusicTrack, TextOverlay, VideoAsset } from '../types/video'
import { clamp, formatTime } from '../utils/video'
import './VideoEditorPage.css'

type VideoPanel = 'cut' | 'music' | 'graphic' | 'text' | 'pip' | 'effect'

const AI_SCAN_DELAY_MS = 3000

const defaultOverlay: Omit<TextOverlay, 'id' | 'text'> = {
  start: 0,
  end: 3,
  x: 50,
  y: 50,
  size: 28,
  color: '#ffffff',
}

export function VideoEditorPage() {
  const videoInputRef = useRef<HTMLInputElement>(null)
  const urlsRef = useRef<string[]>([])
  const aiScanTimerRef = useRef<number | null>(null)
  const [videos, setVideos] = useState<VideoAsset[]>(fixedVideoAssets)
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([])
  const [editingVideos, setEditingVideos] = useState<VideoAsset[] | null>(null)
  const [pendingVideos, setPendingVideos] = useState<VideoAsset[] | null>(null)

  useEffect(() => () => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    if (aiScanTimerRef.current) {
      window.clearTimeout(aiScanTimerRef.current)
    }
  }, [])

  useEffect(() => {
    fixedVideoAssets.forEach((videoAsset) => {
      const probe = document.createElement('video')
      probe.preload = 'metadata'
      probe.src = videoAsset.src
      probe.onloadedmetadata = () => {
        setVideos((currentVideos) => currentVideos.map((currentVideo) => (
          currentVideo.id === videoAsset.id ? { ...currentVideo, duration: probe.duration } : currentVideo
        )))
      }
    })
  }, [])

  function handleVideoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith('video/'))

    files.forEach((file, index) => {
      const src = URL.createObjectURL(file)
      urlsRef.current.push(src)
      const probe = document.createElement('video')
      probe.preload = 'metadata'
      probe.src = src
      probe.onloadedmetadata = () => {
        setVideos((currentVideos) => [
          {
            id: `${file.name}-${file.lastModified}-${index}`,
            name: file.name.replace(/\.[^.]+$/, ''),
            src,
            duration: probe.duration,
          },
          ...currentVideos,
        ])
      }
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

  function handleStartEditing() {
    if (selectedVideos.length === 0) {
      videoInputRef.current?.click()
      return
    }

    setPendingVideos(selectedVideos)
    if (aiScanTimerRef.current) {
      window.clearTimeout(aiScanTimerRef.current)
    }

    aiScanTimerRef.current = window.setTimeout(() => {
      setEditingVideos(selectedVideos)
      setPendingVideos(null)
      aiScanTimerRef.current = null
    }, AI_SCAN_DELAY_MS)
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
          onClick={handleStartEditing}
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
        캐치캐치할 이미지를 선택해 주세요
      </button>

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
  const timelineScrollRef = useRef<HTMLDivElement>(null)
  const syncingTimelineRef = useRef(false)
  const projectDuration = assets.reduce((totalDuration, asset) => totalDuration + asset.duration, 0)
  const [activePanel, setActivePanel] = useState<VideoPanel>('cut')
  const [trimStart] = useState(0)
  const [trimEnd] = useState(projectDuration)
  const [playbackRate] = useState(1)
  const [mutedOriginal] = useState(false)
  const [music, setMusic] = useState<MusicTrack | null>(null)
  const [textDraft, setTextDraft] = useState('New Text')
  const [overlays, setOverlays] = useState<TextOverlay[]>([])
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(trimStart)
  const selectedOverlay = overlays.find((overlay) => overlay.id === selectedOverlayId) ?? null
  const fps = 30
  const timelineDuration = Math.max(projectDuration, 1)
  const durationInFrames = Math.max(1, Math.ceil(timelineDuration * fps))
  const playheadPosition = `${clamp(currentTime / timelineDuration * 100, 0, 100)}%`
  const clipLeft = `${trimStart / timelineDuration * 100}%`
  const clipWidth = `${Math.max(2, (trimEnd - trimStart) / timelineDuration * 100)}%`

  useEffect(() => {
    const timeline = timelineScrollRef.current
    if (!timeline) return

    const maxScroll = timeline.scrollWidth - timeline.clientWidth
    if (maxScroll <= 0) return

    syncingTimelineRef.current = true
    timeline.scrollLeft = clamp(currentTime / timelineDuration, 0, 1) * maxScroll
    window.setTimeout(() => {
      syncingTimelineRef.current = false
    }, 0)
  }, [currentTime, timelineDuration])

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

      setCurrentTime(nextTime)
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

  function handleTimelineScroll() {
    const timeline = timelineScrollRef.current
    const player = playerRef.current

    if (!timeline || !player || syncingTimelineRef.current) return

    const maxScroll = timeline.scrollWidth - timeline.clientWidth
    if (maxScroll <= 0) return

    const nextTime = clamp(timeline.scrollLeft / maxScroll * timelineDuration, trimStart, trimEnd)
    player.seekTo(Math.round(nextTime * fps))
    setCurrentTime(nextTime)
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
            inputProps={{
              assets,
              mutedOriginal,
              music,
              overlays,
              fps,
            }}
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
        <div className="video-timeline-shell">
          <aside className="timeline-track-rail" aria-label="트랙 목록">
            <button type="button" onClick={() => setActivePanel('cut')}><span>＋</span>미디어</button>
            <button type="button" onClick={() => setActivePanel('music')}><span>♫</span>배경음악</button>
            <button type="button"><span>⌁</span>텍스트</button>
            <button type="button"><span>◉</span>음성 녹음</button>
            <button type="button">
              <img src={warningIcon} alt="" aria-hidden="true" />
              캐치
            </button>
          </aside>
          <div className="timeline-scroll-viewport" ref={timelineScrollRef} onScroll={handleTimelineScroll}>
            <div className="timeline-stage">
              <div className="timeline-ruler">
                <span>{formatTime(trimStart)}</span>
                <i />
                <span>{formatTime(projectDuration / 2)}</span>
                <i />
                <span>{formatTime(projectDuration)}</span>
              </div>
              <div className="timeline-playhead" style={{ left: playheadPosition }}>
                <span>{formatTime(currentTime)}</span>
              </div>

              <div className="timeline-track timeline-video-track">
                {assets.map((asset, index) => {
                  const clipStart = assets.slice(0, index).reduce((totalDuration, currentAsset) => totalDuration + currentAsset.duration, 0)
                  const width = Math.max(3, asset.duration / timelineDuration * 100)

                  return (
                    <div
                      key={asset.id}
                      className="timeline-clip"
                      style={{
                        left: `${clipStart / timelineDuration * 100}%`,
                        width: `${width}%`,
                      }}
                    >
                      <video src={asset.src} muted playsInline preload="metadata" />
                      <span>{formatTime(asset.duration)}</span>
                    </div>
                  )
                })}
              </div>

              <div className="timeline-track timeline-audio-row">
                {music ? (
                  <div className="timeline-audio-clip" style={{ left: clipLeft, width: clipWidth }}>
                    <span>{music.name}</span>
                    <div className="audio-bars" aria-hidden="true">
                      {Array.from({ length: 30 }, (_, index) => <i key={index} />)}
                    </div>
                  </div>
                ) : (
                  <button className="timeline-add-row" type="button" onClick={() => setActivePanel('music')}>＋ 오디오 추가</button>
                )}
              </div>

              <div className="timeline-track timeline-text-row">
                {overlays.map((overlay) => (
                  <button
                    key={overlay.id}
                    className={`timeline-text-clip ${overlay.id === selectedOverlayId ? 'active' : ''}`}
                    style={{
                      left: `${overlay.start / timelineDuration * 100}%`,
                      width: `${Math.max(6, (overlay.end - overlay.start) / timelineDuration * 100)}%`,
                    }}
                    type="button"
                    onClick={() => setSelectedOverlayId(overlay.id)}
                  >
                    {overlay.text}
                  </button>
                ))}
                {overlays.length === 0 ? (
                  <button className="timeline-add-row" type="button" onClick={() => setActivePanel('text')}>＋ 텍스트 추가</button>
                ) : null}
              </div>
              <div className="timeline-track timeline-empty-track" />
              <div className="timeline-track timeline-empty-track" />
            </div>
          </div>
        </div>

        {activePanel !== 'cut' ? (
          <div className="timeline-inspector">
          {activePanel === 'music' ? (
            <div className="video-music-panel">
              <input ref={musicInputRef} className="sr-only" type="file" accept="audio/*" onChange={handleMusicChange} />
              <div className="music-row">
                <span className="music-name">{music ? music.name : '삽입된 음악 없음'}</span>
                <button type="button" onClick={() => musicInputRef.current?.click()}>음악 선택</button>
              </div>
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
          </div>
        ) : null}
      </div>
    </section>
  )
}
