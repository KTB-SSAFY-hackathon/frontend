import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fixedGalleryPhotos } from '../data/photoAssets'
import type { GalleryPhoto } from '../types/editor'
import { ImageEditor } from './ImageEditor'
import './PhotoEditorPage.css'

export function PhotoEditorPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoUrlsRef = useRef<string[]>([])
  const [photos, setPhotos] = useState<GalleryPhoto[]>(fixedGalleryPhotos)
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null)

  useEffect(() => () => {
    photoUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
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

  if (selectedPhoto) {
    return (
      <ImageEditor
        photo={selectedPhoto}
        onBack={() => setSelectedPhoto(null)}
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
            <button key={photo.id} className="gallery-tile" type="button" onClick={() => setSelectedPhoto(photo)}>
              <img src={photo.src} alt={photo.name} />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
