import type { GalleryPhoto } from '../types/editor'

export type DashboardRecentStatus = 'danger' | 'warning' | 'safe'
export type DashboardRecentMediaType = 'photo' | 'video'

export type DashboardRecentItem = {
  id: string
  label: string
  thumbnail: string
  mediaType: DashboardRecentMediaType
  status: DashboardRecentStatus
  badge: string
  count: number
  createdAt: number
}

const STORAGE_KEYS = {
  albumPhotos: 'catchcatch:album-photos:v1',
  dashboardRecent: 'catchcatch:dashboard-recent:v1',
} as const

const ALBUM_PHOTO_LIMIT = 24
const DASHBOARD_RECENT_LIMIT = 12

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readArrayStorage(key: string) {
  if (!canUseStorage()) return []

  try {
    const storedValue = window.localStorage.getItem(key)
    if (!storedValue) return []

    const parsedValue = JSON.parse(storedValue)
    return Array.isArray(parsedValue) ? parsedValue : []
  } catch {
    return []
  }
}

function writeArrayStorage<T>(key: string, items: T[]) {
  if (!canUseStorage()) return
  window.localStorage.setItem(key, JSON.stringify(items))
}

function isGalleryPhoto(value: unknown): value is GalleryPhoto {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.src === 'string'
  )
}

function isDashboardRecentItem(value: unknown): value is DashboardRecentItem {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.thumbnail === 'string' &&
    (candidate.mediaType === 'photo' || candidate.mediaType === 'video') &&
    (candidate.status === 'danger' || candidate.status === 'warning' || candidate.status === 'safe') &&
    typeof candidate.badge === 'string' &&
    typeof candidate.count === 'number' &&
    typeof candidate.createdAt === 'number'
  )
}

function createStorageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('blob을 data URL로 변환하지 못했습니다.'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('blob 읽기에 실패했습니다.'))
    reader.readAsDataURL(blob)
  })
}

export function createStoredGalleryPhoto(name: string, src: string): GalleryPhoto {
  return {
    id: createStorageId('album-photo'),
    name,
    src,
  }
}

export function getStoredAlbumPhotos() {
  return readArrayStorage(STORAGE_KEYS.albumPhotos).filter(isGalleryPhoto)
}

export function prependStoredAlbumPhoto(photo: GalleryPhoto) {
  const currentPhotos = getStoredAlbumPhotos().filter((currentPhoto) => currentPhoto.id !== photo.id)
  writeArrayStorage(STORAGE_KEYS.albumPhotos, [photo, ...currentPhotos].slice(0, ALBUM_PHOTO_LIMIT))
}

export function getStoredDashboardRecentItems() {
  return readArrayStorage(STORAGE_KEYS.dashboardRecent)
    .filter(isDashboardRecentItem)
    .sort((left, right) => right.createdAt - left.createdAt)
}

export function prependStoredDashboardRecentItem(item: DashboardRecentItem) {
  const currentItems = getStoredDashboardRecentItems().filter((currentItem) => currentItem.id !== item.id)
  writeArrayStorage(STORAGE_KEYS.dashboardRecent, [item, ...currentItems].slice(0, DASHBOARD_RECENT_LIMIT))
}

export function createDashboardRecentItem(input: Omit<DashboardRecentItem, 'id' | 'createdAt'>): DashboardRecentItem {
  return {
    ...input,
    id: createStorageId('dashboard-recent'),
    createdAt: Date.now(),
  }
}
