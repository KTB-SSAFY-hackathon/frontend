import { useMemo, useRef, useState } from 'react'
import { EditorSlider } from '../components/EditorSlider'
import warningIcon from '../assets/경고.png'
import type { EditorPanel, EditorSettings, GalleryPhoto, MaskMode } from '../types/editor'
import {
  applyProAdjustments,
  aspectRatios,
  defaultSettings,
  filterPresets,
  getAspectValue,
  getCanvasFilter,
} from '../utils/editor'

type ImageEditorProps = {
  photo: GalleryPhoto
  onBack: () => void
}

const mockRiskRegions = [
  { id: 'risk-face', label: '얼굴', x: 49, y: 25, width: 22, height: 18 },
  { id: 'risk-name', label: '이름', x: 34, y: 57, width: 28, height: 11 },
  { id: 'risk-id', label: '식별정보', x: 62, y: 72, width: 26, height: 13 },
]

const maskModes = [
  { key: 'softBlur', label: '소프트 블러', preview: '', tone: 'blur' },
  { key: 'stickerCat', label: '고양이', preview: '😺', tone: 'emoji' },
  { key: 'stickerSmile', label: '스마일', preview: '😬', tone: 'emoji' },
  { key: 'stickerHeart', label: '하트', preview: '💜', tone: 'emoji' },
  { key: 'stickerStar', label: '별', preview: '⭐', tone: 'emoji' },
  { key: 'stickerHot', label: 'HOT', preview: 'HOT', tone: 'badge' },
  { key: 'stickerNew', label: 'NEW', preview: 'NEW', tone: 'label' },
  { key: 'stickerArrow', label: '화살표', preview: '↙', tone: 'arrow' },
  { key: 'stickerWhiteBar', label: '화이트 바', preview: '', tone: 'whiteBar' },
  { key: 'stickerBlackBar', label: '블랙 바', preview: '', tone: 'blackBar' },
  { key: 'stickerDaisy', label: '꽃', preview: '✿', tone: 'emoji' },
] satisfies Array<{ key: MaskMode; label: string; preview: string; tone: string }>

type MaskPlacement = {
  mode: MaskMode
  offsetX: number
  offsetY: number
  scale: number
}

const riskLevels = [
  { key: 'danger', label: '위험', description: '노출 위험 높음' },
  { key: 'good', label: '양호', description: '일부 보호됨' },
  { key: 'safe', label: '안전', description: '주요 영역 보호됨' },
] as const

function getMaskMode(mode: MaskMode) {
  return maskModes.find((maskMode) => maskMode.key === mode) ?? maskModes[0]
}

function createMaskPlacement(mode: MaskMode): MaskPlacement {
  return {
    mode,
    offsetX: 0,
    offsetY: 0,
    scale: mode === 'softBlur' ? 100 : 70,
  }
}

function getStickerOffsetLimit(scale: number) {
  return Math.max(0, Math.round((100 - scale) / 2))
}

function getRiskLevel(protectedRegionCount: number) {
  if (protectedRegionCount >= 2) return riskLevels[2]
  if (protectedRegionCount === 1) return riskLevels[1]
  return riskLevels[0]
}

function getImageRisk(settings: EditorSettings) {
  const blurProtection = settings.blur * 8
  const vignetteProtection = settings.vignette * 0.28
  const desaturationProtection = settings.saturation < 70 ? (70 - settings.saturation) * 0.18 : 0
  const exposureProtection = settings.exposure < -12 ? Math.abs(settings.exposure) * 0.18 : 0
  const totalProtection = blurProtection + vignetteProtection + desaturationProtection + exposureProtection

  return Math.max(8, Math.round(100 - Math.min(92, totalProtection)))
}

function applyMaskToCanvas(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  region: typeof mockRiskRegions[number],
  placement: MaskPlacement,
) {
  const x = Math.round(region.x / 100 * canvas.width)
  const y = Math.round(region.y / 100 * canvas.height)
  const width = Math.round(region.width / 100 * canvas.width)
  const height = Math.round(region.height / 100 * canvas.height)

  if (width <= 0 || height <= 0) return

  if (placement.mode === 'softBlur') {
    const blurCanvas = document.createElement('canvas')
    blurCanvas.width = width
    blurCanvas.height = height
    const blurContext = blurCanvas.getContext('2d')

    if (!blurContext) return

    blurContext.filter = 'blur(7px)'
    blurContext.drawImage(canvas, x, y, width, height, 0, 0, width, height)
    context.drawImage(blurCanvas, x, y)
    return
  }

  const modeInfo = getMaskMode(placement.mode)
  const stickerWidth = width * placement.scale / 100
  const stickerHeight = height * placement.scale / 100
  const stickerX = x + (width - stickerWidth) / 2 + (placement.offsetX / 100) * width
  const stickerY = y + (height - stickerHeight) / 2 + (placement.offsetY / 100) * height
  const radius = Math.min(18, Math.max(8, stickerWidth * 0.08))

  context.save()
  if (placement.mode === 'stickerWhiteBar' || placement.mode === 'stickerBlackBar') {
    context.fillStyle = placement.mode === 'stickerWhiteBar' ? '#f8f8f3' : '#050505'
    context.beginPath()
    context.roundRect(stickerX, stickerY + stickerHeight * 0.32, stickerWidth, stickerHeight * 0.36, radius)
    context.fill()
  } else if (placement.mode === 'stickerHot') {
    context.fillStyle = '#ffad36'
    context.beginPath()
    context.arc(stickerX + stickerWidth / 2, stickerY + stickerHeight / 2, Math.min(stickerWidth, stickerHeight) / 2, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = '#111'
    context.font = `900 ${Math.max(12, stickerHeight * 0.28)}px sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText('HOT', stickerX + stickerWidth / 2, stickerY + stickerHeight / 2)
  } else if (placement.mode === 'stickerNew') {
    context.fillStyle = '#ffffff'
    context.beginPath()
    context.roundRect(stickerX, stickerY + stickerHeight * 0.25, stickerWidth, stickerHeight * 0.5, radius)
    context.fill()
    context.strokeStyle = '#ef4444'
    context.lineWidth = Math.max(2, stickerHeight * 0.08)
    context.stroke()
    context.fillStyle = '#ef4444'
    context.font = `900 ${Math.max(12, stickerHeight * 0.3)}px sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText('NEW', stickerX + stickerWidth / 2, stickerY + stickerHeight / 2)
  } else if (placement.mode === 'stickerArrow') {
    context.strokeStyle = '#ff1d1d'
    context.lineWidth = Math.max(5, stickerHeight * 0.1)
    context.lineCap = 'round'
    context.beginPath()
    context.moveTo(stickerX + stickerWidth * 0.18, stickerY + stickerHeight * 0.18)
    context.lineTo(stickerX + stickerWidth * 0.62, stickerY + stickerHeight * 0.62)
    context.stroke()
    context.beginPath()
    context.moveTo(stickerX + stickerWidth * 0.62, stickerY + stickerHeight * 0.62)
    context.lineTo(stickerX + stickerWidth * 0.38, stickerY + stickerHeight * 0.58)
    context.moveTo(stickerX + stickerWidth * 0.62, stickerY + stickerHeight * 0.62)
    context.lineTo(stickerX + stickerWidth * 0.57, stickerY + stickerHeight * 0.38)
    context.stroke()
  } else {
    context.fillStyle = '#ffffff'
    context.font = `${Math.max(22, Math.min(stickerWidth, stickerHeight) * 0.68)}px sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(modeInfo.preview, stickerX + stickerWidth / 2, stickerY + stickerHeight / 2)
  }
  context.restore()
}

function getEditedImageFileName(photoName: string) {
  return `${photoName || 'edited-photo'}-edited.png`
}

export function ImageEditor({ photo, onBack }: ImageEditorProps) {
  const imageRef = useRef<HTMLImageElement>(null)
  const [history, setHistory] = useState<EditorSettings[]>([defaultSettings])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [activePanel, setActivePanel] = useState<EditorPanel>('tools')
  const [showOriginal, setShowOriginal] = useState(false)
  const [showRiskRegions, setShowRiskRegions] = useState(false)
  const [showSaveWarning, setShowSaveWarning] = useState(false)
  const [selectedRiskId, setSelectedRiskId] = useState(mockRiskRegions[0].id)
  const [maskPlacementsByRegion, setMaskPlacementsByRegion] = useState<Record<string, MaskPlacement>>({})
  const settings = history[historyIndex]
  const imageFilter = useMemo(() => getCanvasFilter(settings), [settings])
  const protectedRegionCount = Object.keys(maskPlacementsByRegion).length
  const riskScore = useMemo(
    () => Math.max(4, getImageRisk(settings) - protectedRegionCount * 22),
    [protectedRegionCount, settings],
  )
  const riskLevel = getRiskLevel(protectedRegionCount)
  const cropAspect = getAspectValue(settings.aspectRatio)
  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1
  const selectedRiskRegion = mockRiskRegions.find((region) => region.id === selectedRiskId) ?? mockRiskRegions[0]
  const selectedPlacement = maskPlacementsByRegion[selectedRiskRegion.id]
  const selectedOffsetLimit = selectedPlacement ? getStickerOffsetLimit(selectedPlacement.scale) : 0

  function commitSettings(nextSettings: EditorSettings) {
    setHistory((currentHistory) => [...currentHistory.slice(0, historyIndex + 1), nextSettings])
    setHistoryIndex((currentIndex) => currentIndex + 1)
  }

  function updateSetting<Key extends keyof EditorSettings>(key: Key, value: EditorSettings[Key]) {
    commitSettings({
      ...settings,
      [key]: value,
    })
  }

  function applyPreset(preset: typeof filterPresets[number]) {
    commitSettings({
      ...settings,
      brightness: preset.brightness,
      contrast: preset.contrast,
      saturation: preset.saturation,
      warmth: preset.warmth,
    })
  }

  function undoEdit() {
    if (canUndo) {
      setHistoryIndex((currentIndex) => currentIndex - 1)
    }
  }

  function redoEdit() {
    if (canRedo) {
      setHistoryIndex((currentIndex) => currentIndex + 1)
    }
  }

  function createEditedImageCanvas() {
    const sourceImage = imageRef.current

    if (!sourceImage) return null

    const naturalWidth = sourceImage.naturalWidth
    const naturalHeight = sourceImage.naturalHeight
    const selectedAspect = getAspectValue(settings.aspectRatio)
    let canvasWidth = naturalWidth
    let canvasHeight = naturalHeight

    if (selectedAspect) {
      const currentAspect = naturalWidth / naturalHeight
      if (currentAspect > selectedAspect) {
        canvasWidth = Math.round(naturalHeight * selectedAspect)
      } else {
        canvasHeight = Math.round(naturalWidth / selectedAspect)
      }
    }

    const canvas = document.createElement('canvas')
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    const context = canvas.getContext('2d')

    if (!context) return null

    context.fillStyle = '#111'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.save()
    context.filter = imageFilter
    context.translate(canvas.width / 2, canvas.height / 2)
    context.rotate((settings.rotate * Math.PI) / 180)
    context.scale(settings.flipX ? -1 : 1, settings.flipY ? -1 : 1)

    const zoom = settings.zoom / 100
    const drawWidth = naturalWidth * zoom
    const drawHeight = naturalHeight * zoom
    context.drawImage(sourceImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
    context.restore()
    applyProAdjustments(context, settings, canvas.width, canvas.height)
    context.filter = 'none'
    Object.entries(maskPlacementsByRegion).forEach(([regionId, placement]) => {
      const region = mockRiskRegions.find((riskRegion) => riskRegion.id === regionId)
      if (region) {
        applyMaskToCanvas(context, canvas, region, placement)
      }
    })

    return canvas
  }

  async function createEditedImageFile() {
    const canvas = createEditedImageCanvas()

    if (!canvas) return null

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png')
    })

    if (!blob) return null

    return new File([blob], getEditedImageFileName(photo.name), { type: 'image/png' })
  }

  async function saveEditedImage() {
    const canvas = createEditedImageCanvas()

    if (!canvas) return

    const imageUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = getEditedImageFileName(photo.name)
    link.click()
  }

  async function shareEditedImage() {
    const imageFile = await createEditedImageFile()

    if (!imageFile) return

    if (navigator.canShare?.({ files: [imageFile] })) {
      await navigator.share({
        files: [imageFile],
        title: '편집한 이미지',
      })
      return
    }

    await saveEditedImage()
  }

  function requestSave() {
    if (riskLevel.key !== 'safe') {
      setShowSaveWarning(true)
      return
    }

    void saveEditedImage()
  }

  function confirmRiskSave() {
    setShowSaveWarning(false)
    void saveEditedImage()
  }

  return (
    <section className="editor-page">
      <header className="editor-header">
        <button className="editor-back" type="button" onClick={onBack} aria-label="앨범으로 돌아가기">
          ←
        </button>
        <div className="editor-history" aria-label="편집 히스토리">
          <button type="button" onClick={undoEdit} disabled={!canUndo}>Undo</button>
          <button type="button" onClick={redoEdit} disabled={!canRedo}>Redo</button>
          <button
            type="button"
            className={showOriginal ? 'active' : ''}
            onPointerDown={() => setShowOriginal(true)}
            onPointerUp={() => setShowOriginal(false)}
            onPointerLeave={() => setShowOriginal(false)}
          >
            원본
          </button>
        </div>
        <div className="editor-actions">
          <button className="share-button" type="button" onClick={() => void shareEditedImage()} aria-label="편집한 이미지 공유">
            <svg fill="none" strokeWidth="1.5" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </button>
          <button className="save-button" type="button" onClick={requestSave}>
            저장
          </button>
        </div>
      </header>

      <div className="editor-risk-meter" aria-label={`이미지 노출 상태 ${riskLevel.label}, 위험도 ${riskScore}%`}>
        <div className="risk-copy">
          <span>노출 위험도</span>
          <strong>{riskLevel.label}</strong>
        </div>
        <div className={`risk-track segmented ${riskLevel.key}`}>
          {riskLevels.map((level) => (
            <span
              key={level.key}
              className={`risk-segment ${level.key} ${riskLevel.key === level.key ? 'active' : ''}`}
            >
              {level.label}
            </span>
          ))}
        </div>
        <p className="risk-description">{riskLevel.description} · {protectedRegionCount}/{mockRiskRegions.length}개 가림</p>
      </div>

      <div className="editor-stage">
        <div className="editor-canvas" style={{ aspectRatio: cropAspect ? `${cropAspect}` : undefined }}>
          <img
            ref={imageRef}
            src={photo.src}
            alt={photo.name}
            style={{
              filter: showOriginal ? 'none' : imageFilter,
              transform: showOriginal
                ? 'none'
                : `scale(${settings.zoom / 100}) rotate(${settings.rotate}deg) scaleX(${settings.flipX ? -1 : 1}) scaleY(${settings.flipY ? -1 : 1})`,
            }}
          />
          {!showOriginal ? (
            <>
              {showRiskRegions || activePanel === 'mask' ? mockRiskRegions.map((region) => {
                const placement = maskPlacementsByRegion[region.id]
                const modeInfo = placement ? getMaskMode(placement.mode) : null
                const previewSize = placement?.mode === 'softBlur' ? 100 : placement?.scale ?? 100
                const previewOffset = placement?.mode === 'softBlur'
                  ? { left: 0, top: 0 }
                  : {
                      left: (100 - previewSize) / 2 + (placement?.offsetX ?? 0),
                      top: (100 - previewSize) / 2 + (placement?.offsetY ?? 0),
                    }

                return (
                  <button
                    key={region.id}
                    className={`risk-region ${region.id === selectedRiskId ? 'selected' : ''} ${placement ? 'covered' : ''}`}
                    type="button"
                    onClick={() => {
                      setSelectedRiskId(region.id)
                      setActivePanel('mask')
                    }}
                    aria-label={`${region.label} 개인정보 위험 좌표`}
                    style={{
                      left: `${region.x}%`,
                      top: `${region.y}%`,
                      width: `${region.width}%`,
                      height: `${region.height}%`,
                    }}
                  >
                    <span className="risk-target-dot" />
                    <span className="risk-target-corner corner-tl" />
                    <span className="risk-target-corner corner-tr" />
                    <span className="risk-target-corner corner-br" />
                    <span className="risk-target-corner corner-bl" />
                    {placement ? (
                      <span
                        className={`mask-preview ${placement.mode}`}
                        style={{
                          left: `${previewOffset.left}%`,
                          top: `${previewOffset.top}%`,
                          width: `${previewSize}%`,
                          height: `${previewSize}%`,
                        }}
                      >
                        {modeInfo?.preview ? <span>{modeInfo.preview}</span> : null}
                      </span>
                    ) : null}
                  </button>
                )
              }) : null}
              <span className="vignette-preview" style={{ opacity: settings.vignette / 100 }} />
              <span className="grain-preview" style={{ opacity: settings.grain / 130 }} />
            </>
          ) : null}
          <button
            className={`risk-toggle-button ${showRiskRegions ? 'active' : ''}`}
            type="button"
            onClick={() => setShowRiskRegions((currentValue) => !currentValue)}
            aria-pressed={showRiskRegions}
            aria-label="개인정보 위험 좌표 표시"
          >
            <img src={warningIcon} alt="" />
          </button>
        </div>
      </div>

      <div className="editor-toolbar">
        <div className="editor-panel">
          {activePanel === 'tools' ? (
            <div className="tool-grid">
              {aspectRatios.map((ratio) => (
                <button
                  key={ratio.value}
                  className={`tool-item ${settings.aspectRatio === ratio.value ? 'active' : ''}`}
                  type="button"
                  onClick={() => updateSetting('aspectRatio', ratio.value)}
                >
                  <span>▣</span>
                  {ratio.label}
                </button>
              ))}
              <button className="tool-item" type="button" onClick={() => updateSetting('rotate', (settings.rotate + 90) % 360)}>
                <span>↻</span>
                회전
              </button>
              <button className={`tool-item ${settings.flipX ? 'active' : ''}`} type="button" onClick={() => updateSetting('flipX', !settings.flipX)}>
                <span>↔</span>
                좌우
              </button>
              <button className={`tool-item ${settings.flipY ? 'active' : ''}`} type="button" onClick={() => updateSetting('flipY', !settings.flipY)}>
                <span>↕</span>
                상하
              </button>
              <button className="tool-item" type="button" onClick={() => commitSettings(defaultSettings)}>
                <span>↺</span>
                초기화
              </button>
            </div>
          ) : null}

          {activePanel === 'filters' ? (
            <div className="preset-strip">
              {filterPresets.map((preset) => (
                <button key={preset.name} className="preset-card" type="button" onClick={() => applyPreset(preset)}>
                  <img src={photo.src} alt="" style={{ filter: getCanvasFilter({ ...settings, ...preset }) }} />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          ) : null}

          {activePanel === 'adjust' ? (
            <div className="adjust-list">
              <EditorSlider label="밝기" value={settings.brightness} min={50} max={160} onChange={(value) => updateSetting('brightness', value)} />
              <EditorSlider label="노출" value={settings.exposure} min={-45} max={45} onChange={(value) => updateSetting('exposure', value)} />
              <EditorSlider label="대비" value={settings.contrast} min={50} max={170} onChange={(value) => updateSetting('contrast', value)} />
              <EditorSlider label="채도" value={settings.saturation} min={0} max={200} onChange={(value) => updateSetting('saturation', value)} />
              <EditorSlider label="온도" value={settings.warmth} min={-40} max={40} onChange={(value) => updateSetting('warmth', value)} />
              <EditorSlider label="블러" value={settings.blur} min={0} max={8} onChange={(value) => updateSetting('blur', value)} />
              <EditorSlider label="확대" value={settings.zoom} min={70} max={180} onChange={(value) => updateSetting('zoom', value)} />
            </div>
          ) : null}

          {activePanel === 'pro' ? (
            <div className="adjust-list">
              <EditorSlider label="하이라이트" value={settings.highlights} min={-60} max={60} onChange={(value) => updateSetting('highlights', value)} />
              <EditorSlider label="섀도우" value={settings.shadows} min={-60} max={60} onChange={(value) => updateSetting('shadows', value)} />
              <EditorSlider label="선명도" value={settings.sharpen} min={0} max={80} onChange={(value) => updateSetting('sharpen', value)} />
              <EditorSlider label="입자" value={settings.grain} min={0} max={60} onChange={(value) => updateSetting('grain', value)} />
              <EditorSlider label="비네트" value={settings.vignette} min={0} max={80} onChange={(value) => updateSetting('vignette', value)} />
            </div>
          ) : null}

          {activePanel === 'mask' ? (
            <div className="mask-panel" aria-label="영역 가리기">
              <div className="mask-panel-title">
                <span>{selectedRiskRegion.label}</span>
                <strong>{selectedPlacement ? '가림 적용됨' : '가림 전'}</strong>
              </div>
              <div className="sticker-search" aria-hidden="true">
                <span>⌕</span>
                <span>스티커 검색</span>
              </div>
              <div className="mask-mode-grid">
                {maskModes.map((mode) => (
                  <button
                    key={mode.key}
                    className={selectedPlacement?.mode === mode.key ? 'active' : ''}
                    type="button"
                    onClick={() => {
                      setShowRiskRegions(true)
                      setMaskPlacementsByRegion((currentPlacements) => ({
                        ...currentPlacements,
                        [selectedRiskRegion.id]: createMaskPlacement(mode.key),
                      }))
                    }}
                  >
                    <span className={`mask-option-mark ${mode.key}`}>
                      {mode.preview}
                    </span>
                    <span>{mode.label}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setMaskPlacementsByRegion((currentPlacements) => {
                      const nextPlacements = { ...currentPlacements }
                      delete nextPlacements[selectedRiskRegion.id]
                      return nextPlacements
                    })
                  }}
                >
                  <span className="mask-option-mark remove">×</span>
                  <span>제거</span>
                </button>
              </div>
              {selectedPlacement ? (
                <div className="mask-transform-controls">
                  <EditorSlider
                    label="크기"
                    value={selectedPlacement.scale}
                    min={selectedPlacement.mode === 'softBlur' ? 100 : 40}
                    max={100}
                    onChange={(value) => {
                      const nextOffsetLimit = getStickerOffsetLimit(value)
                      setMaskPlacementsByRegion((currentPlacements) => ({
                        ...currentPlacements,
                        [selectedRiskRegion.id]: {
                          ...selectedPlacement,
                          scale: value,
                          offsetX: Math.max(-nextOffsetLimit, Math.min(nextOffsetLimit, selectedPlacement.offsetX)),
                          offsetY: Math.max(-nextOffsetLimit, Math.min(nextOffsetLimit, selectedPlacement.offsetY)),
                        },
                      }))
                    }}
                  />
                  {selectedPlacement.mode !== 'softBlur' ? (
                    <>
                      <EditorSlider
                        label="좌우"
                        value={selectedPlacement.offsetX}
                        min={-selectedOffsetLimit}
                        max={selectedOffsetLimit}
                        onChange={(value) => {
                          setMaskPlacementsByRegion((currentPlacements) => ({
                            ...currentPlacements,
                            [selectedRiskRegion.id]: {
                              ...selectedPlacement,
                              offsetX: value,
                            },
                          }))
                        }}
                      />
                      <EditorSlider
                        label="상하"
                        value={selectedPlacement.offsetY}
                        min={-selectedOffsetLimit}
                        max={selectedOffsetLimit}
                        onChange={(value) => {
                          setMaskPlacementsByRegion((currentPlacements) => ({
                            ...currentPlacements,
                            [selectedRiskRegion.id]: {
                              ...selectedPlacement,
                              offsetY: value,
                            },
                          }))
                        }}
                      />
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <nav className="editor-tabs" aria-label="편집 도구">
          <button className={activePanel === 'tools' ? 'active' : ''} type="button" onClick={() => setActivePanel('tools')}>
            도구
          </button>
          <button className={activePanel === 'filters' ? 'active' : ''} type="button" onClick={() => setActivePanel('filters')}>
            필터
          </button>
          <button className={activePanel === 'adjust' ? 'active' : ''} type="button" onClick={() => setActivePanel('adjust')}>
            조정
          </button>
          <button className={activePanel === 'pro' ? 'active' : ''} type="button" onClick={() => setActivePanel('pro')}>
            전문가
          </button>
          <button
            className={activePanel === 'mask' ? 'active' : ''}
            type="button"
            onClick={() => {
              setActivePanel('mask')
              setShowRiskRegions(true)
            }}
          >
            가리기
          </button>
        </nav>
      </div>
      {showSaveWarning ? (
        <div className="save-warning-backdrop" role="presentation">
          <div
            className="save-warning-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-warning-title"
          >
            <div className="save-warning-icon">
              <img src={warningIcon} alt="" />
            </div>
            <h2 id="save-warning-title">아직 {riskLevel.label} 상태입니다</h2>
            <p>
              블러나 스티커로 모든 주요 위험 좌표를 가리지 않았습니다.
              현재 편집과 적용된 가림 처리는 저장 이미지에 반영됩니다.
            </p>
            <div className="save-warning-actions">
              <button type="button" onClick={() => setShowSaveWarning(false)}>
                더 가리기
              </button>
              <button type="button" onClick={confirmRiskSave}>
                그대로 저장
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
