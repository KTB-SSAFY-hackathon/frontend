import { useEffect, useRef, useState } from 'react'
import { Player } from '@remotion/player'
import type { PlayerRef } from '@remotion/player'
import { Link } from 'react-router-dom'
import { fixedVideoAssets } from '../data/videoAssets'
import { VideoComposition } from '../remotion/VideoComposition'
import type { MusicTrack, TextOverlay, VideoAsset } from '../types/video'
import { clamp, formatTime } from '../utils/video'
import './VideoEditorPage.css'

type VideoPanel = 'cut' | 'music' | 'graphic' | 'text' | 'pip' | 'effect'

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
  const [videos, setVideos] = useState<VideoAsset[]>(fixedVideoAssets)
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([])
  const [editingVideos, setEditingVideos] = useState<VideoAsset[] | null>(null)

  useEffect(() => () => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url))
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

  function toggleVideoSelection(videoId: string) {
    setSelectedVideoIds((currentIds) => (
      currentIds.includes(videoId)
        ? currentIds.filter((currentId) => currentId !== videoId)
        : [...currentIds, videoId]
    ))
  }

  if (editingVideos) {
    return <VideoEditor assets={editingVideos} onBack={() => setEditingVideos(null)} />
  }

  return (
    <section className="video-page">
      <header className="video-picker-header">
        <Link to="/" className="video-close" aria-label="홈으로 이동">
          <span aria-hidden="true">×</span>
        </Link>
        <button className="video-title" type="button" onClick={() => videoInputRef.current?.click()}>
          비디오 <span aria-hidden="true">⌄</span>
        </button>
        <button
          className="video-action"
          type="button"
          onClick={() => {
            if (selectedVideos.length > 0) {
              setEditingVideos(selectedVideos)
            } else {
              videoInputRef.current?.click()
            }
          }}
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
        컷 편집할 동영상을 선택하세요.
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
              <span>{video.name} · {formatTime(video.duration)}</span>
              {isSelected ? <strong>{selectedIndex + 1}</strong> : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function VideoEditor({ assets, onBack }: { assets: VideoAsset[]; onBack: () => void }) {
  const playerRef = useRef<PlayerRef>(null)
  const musicInputRef = useRef<HTMLInputElement>(null)
  const timelineScrollRef = useRef<HTMLDivElement>(null)
  const syncingTimelineRef = useRef(false)
  const projectDuration = assets.reduce((totalDuration, asset) => totalDuration + asset.duration, 0)
  const projectName = assets.length > 1 ? `${assets[0].name} 외 ${assets.length - 1}개` : assets[0]?.name ?? 'video-project'
  const [activePanel, setActivePanel] = useState<VideoPanel>('cut')
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(projectDuration)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [mutedOriginal, setMutedOriginal] = useState(false)
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
  const bottomTabs = [
    { key: 'music', label: '오디오', icon: '♪' },
    { key: 'graphic', label: '그래픽', icon: '▧' },
    { key: 'text', label: '글자', icon: 'T' },
    { key: 'pip', label: 'PIP', icon: '▣' },
    { key: 'effect', label: '효과', icon: '☆' },
  ] satisfies Array<{ key: VideoPanel; label: string; icon: string }>

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

  function handleTrimStart(value: number) {
    const nextStart = clamp(value, 0, Math.max(0, trimEnd - 0.5))
    setTrimStart(nextStart)
    playerRef.current?.seekTo(Math.round(nextStart * fps))
    setCurrentTime(nextStart)
  }

  function handleTrimEnd(value: number) {
    setTrimEnd(clamp(value, trimStart + 0.5, projectDuration))
  }

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
    link.download = `${projectName || 'video-project'}-project.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="video-editor timeline-editor">
      <header className="video-edit-topbar">
        <button className="video-icon-button" type="button" onClick={onBack} aria-label="비디오 목록으로 돌아가기">‹</button>
        <button className="video-help-button" type="button" aria-label="도움말">?</button>
        <strong>제목 없음 (9:16) <span aria-hidden="true">⚙</span></strong>
        <button className="video-export-button" type="button" onClick={saveProject}>⇧ 추출하기</button>
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
        <button type="button" onClick={togglePlayback} aria-label="재생 또는 정지">▷</button>
        <button type="button" aria-label="전체 화면">⛶</button>
        <span>{formatTime(currentTime)} / {formatTime(trimEnd)}</span>
        <button type="button" aria-label="실행 취소">↶</button>
        <button type="button" aria-label="다시 실행">↷</button>
      </div>

      <div className="video-bottom-editor">
        <div className="video-timeline-shell">
          <aside className="timeline-track-rail" aria-label="트랙 목록">
            <button type="button" onClick={() => setActivePanel('cut')}><span>＋</span>미디어</button>
            <button type="button" onClick={() => setActivePanel('music')}><span>♫</span>배경음악</button>
            <button type="button"><span>⌁</span>효과음</button>
            <button type="button"><span>◉</span>음성 녹음</button>
            <button type="button"><span>AI</span>AI 보이스</button>
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
                      <div className="waveform" aria-hidden="true">
                        {Array.from({ length: 24 }, (_, barIndex) => <i key={barIndex} />)}
                      </div>
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

        <div className="timeline-inspector">
          {activePanel === 'cut' ? (
            <div className="video-cut-panel">
              <button
                className={`clip-audio-toggle ${mutedOriginal ? 'active' : ''}`}
                type="button"
                onClick={() => setMutedOriginal((currentValue) => !currentValue)}
              >
                클립 오디오 {mutedOriginal ? '켜기' : '음소거'}
              </button>
              <label className="video-range">
                <span>시작</span>
                <input type="range" min={0} max={projectDuration} step={0.1} value={trimStart} onChange={(event) => handleTrimStart(Number(event.target.value))} />
                <output>{formatTime(trimStart)}</output>
              </label>
              <label className="video-range">
                <span>끝</span>
                <input type="range" min={0} max={projectDuration} step={0.1} value={trimEnd} onChange={(event) => handleTrimEnd(Number(event.target.value))} />
                <output>{formatTime(trimEnd)}</output>
              </label>
              <label className="video-range">
                <span>속도</span>
                <input type="range" min={0.5} max={2} step={0.25} value={playbackRate} onChange={(event) => setPlaybackRate(Number(event.target.value))} />
                <output>{playbackRate}x</output>
              </label>
            </div>
          ) : null}

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

          {activePanel !== 'cut' && activePanel !== 'music' && activePanel !== 'text' ? (
            <div className="video-placeholder-panel">
              <strong>{bottomTabs.find((tab) => tab.key === activePanel)?.label}</strong>
              <span>선택한 트랙에 효과를 추가할 수 있습니다.</span>
            </div>
          ) : null}
        </div>

        <nav className="video-tabs" aria-label="영상 편집 도구">
          {bottomTabs.map((tab) => (
            <button
              key={tab.key}
              className={activePanel === tab.key ? 'active' : ''}
              type="button"
              onClick={() => setActivePanel(tab.key)}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </section>
  )
}
