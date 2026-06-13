import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fixedGalleryPhotos } from '../data/photoAssets'
import type { GalleryPhoto } from '../types/editor'
import {
  createDashboardRecentItem,
  getStoredAlbumPhotos,
  prependStoredDashboardRecentItem,
} from '../utils/mediaLibrary'
import { ImageEditor, type ImageEditorSavePayload } from './ImageEditor'
import './PhotoEditorPage.css'

const AI_SCAN_DELAY_MS = 3000

export function PhotoEditorPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoUrlsRef = useRef<string[]>([])
  const aiScanTimerRef = useRef<number | null>(null)
  const [photos, setPhotos] = useState<GalleryPhoto[]>(() => [...getStoredAlbumPhotos(), ...fixedGalleryPhotos])
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null)
  const [pendingPhoto, setPendingPhoto] = useState<GalleryPhoto | null>(null)

  useEffect(() => () => {
    photoUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    if (aiScanTimerRef.current) {
      window.clearTimeout(aiScanTimerRef.current)
    }
  }, [])

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith('image/'))
    const nextPhotos = files.map((file, index) => {
      const src = URL.createObjectURL(file)
      photoUrlsRef.current.push(src)

      return {
        id: `${file.name}-${file.lastModified}-${index}`,
        name: file.name.replace(/\.[^.]+$/, ''),
        src,
      }
    })

    if (nextPhotos.length > 0) {
      setPhotos((currentPhotos) => [...nextPhotos, ...currentPhotos])
    }

    event.target.value = ''
  }

  function handlePhotoSelect(photo: GalleryPhoto) {
    setPendingPhoto(photo)
    if (aiScanTimerRef.current) {
      window.clearTimeout(aiScanTimerRef.current)
    }

    aiScanTimerRef.current = window.setTimeout(() => {
      setSelectedPhoto(photo)
      setPendingPhoto(null)
      aiScanTimerRef.current = null
    }, AI_SCAN_DELAY_MS)
  }

  function handleEditorSave({ imageUrl, fileName, status, uncoveredCount }: ImageEditorSavePayload) {
    const badge = status === 'safe'
      ? '안전 처리됨'
      : status === 'warning'
        ? '일부 미가림'
        : '가림 필요'

    prependStoredDashboardRecentItem(createDashboardRecentItem({
      label: fileName,
      thumbnail: imageUrl,
      mediaType: 'photo',
      status,
      badge,
      count: uncoveredCount,
    }))
    navigate('/')
  }

  if (selectedPhoto) {
    return (
      <ImageEditor
        photo={selectedPhoto}
        onBack={() => setSelectedPhoto(null)}
        onSave={handleEditorSave}
      />
    )
  }

  return (
    <section className="gallery-page">
      <header className="gallery-header">
        <Link to="/" className="icon-button" aria-label="홈으로 이동">
          <svg data-slot="icon" fill="none" strokeWidth="1.5" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </Link>
        <button className="album-title" type="button" onClick={() => fileInputRef.current?.click()}>앨범</button>
        <button className="text-button" type="button" onClick={() => fileInputRef.current?.click()}>
          불러오기
        </button>
      </header>

      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
      />

      <button className="gallery-banner" type="button" onClick={() => fileInputRef.current?.click()}>
        캐치캐치할 이미지를 선택해 주세요
      </button>

      {photos.length === 0 ? (
        <div className="gallery-empty">
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            이미지 선택
          </button>
          <p>선택한 이미지가 여기에 표시됩니다.</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {photos.map((photo) => (
            <button key={photo.id} className="gallery-tile" type="button" onClick={() => handlePhotoSelect(photo)}>
              <img src={photo.src} alt={photo.name} />
            </button>
          ))}
        </div>
      )}

      {pendingPhoto ? (
        <div className="ai-scan-overlay" aria-live="polite" aria-label="AI가 이미지를 분석하는 중">
          <div className="ai-scan-preview">
            <img src={pendingPhoto.src} alt={pendingPhoto.name} />
            <div className="ai-scan-dim" />
            <div className="ai-scan-target">
              <span className="ai-scan-corner top-left" />
              <span className="ai-scan-corner top-right" />
              <span className="ai-scan-corner bottom-right" />
              <span className="ai-scan-corner bottom-left" />
              <span className="ai-scan-dot" />
            </div>
            <div className="ai-scan-grid" />
            <div className="ai-scan-line" />
          </div>
          <p className="ai-scan-copy">AI가 이미지를 탐색하고 있어요</p>
        </div>
      ) : null}
    </section>
  )
}
