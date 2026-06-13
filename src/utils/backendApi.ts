import type {
  DashboardAverageRiskScoreResponse,
  DashboardDetectedRisksCountResponse,
  DashboardSafeFilesCountResponse,
  ImageAnalyzeResponse,
  MediaDetection,
  VideoAnalyzeFrame,
  VideoAnalyzeResponse,
} from '../types/api'

const DEFAULT_API_BASE_URL = 'http://192.168.10.253:8080'
const DEFAULT_API_USER_ID = '20f420fd-a35e-4c8d-9d7e-8cc38870a6d9'
const USER_ID_STORAGE_KEY = 'catchcatch:api-user-id:v1'

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

function getApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL?.trim()
  return trimTrailingSlash(configuredUrl || DEFAULT_API_BASE_URL)
}

export function getConfiguredUserId() {
  const envUserId = import.meta.env.VITE_API_USER_ID?.trim()
  if (envUserId) return envUserId

  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    const storedUserId = window.localStorage.getItem(USER_ID_STORAGE_KEY)?.trim()
    if (storedUserId) return storedUserId
  }

  return DEFAULT_API_USER_ID
}

export function setConfiguredUserId(userId: string) {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return
  window.localStorage.setItem(USER_ID_STORAGE_KEY, userId.trim())
}

function requireConfiguredUserId() {
  const userId = getConfiguredUserId()
  if (!userId) {
    throw new Error('VITE_API_USER_ID가 필요합니다.')
  }

  return userId
}

async function readErrorMessage(response: Response) {
  try {
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await response.json() as Record<string, unknown>
      const message = typeof body.message === 'string'
        ? body.message
        : typeof body.error === 'string'
          ? body.error
          : JSON.stringify(body)
      return `${response.status} ${message}`
    }

    const text = await response.text()
    return `${response.status} ${text || response.statusText}`
  } catch {
    return `${response.status} ${response.statusText}`
  }
}

async function requestJson<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, init)
  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return await response.json() as T
}

function normalizeDetection(rawDetection: Record<string, unknown>): MediaDetection {
  const bboxNorm = Array.isArray(rawDetection.bboxNorm)
    ? rawDetection.bboxNorm.map((value) => Number(value)) as number[]
    : []

  return {
    detectionId: String(rawDetection.detectionId ?? crypto.randomUUID()),
    label: String(rawDetection.label ?? 'unknown'),
    bboxNorm: [
      Number(bboxNorm[0] ?? 0),
      Number(bboxNorm[1] ?? 0),
      Number(bboxNorm[2] ?? 0),
      Number(bboxNorm[3] ?? 0),
    ],
    trackId: typeof rawDetection.trackId === 'number' ? rawDetection.trackId : undefined,
    frameNumber: typeof rawDetection.frameNumber === 'number'
      ? rawDetection.frameNumber
      : typeof rawDetection.frameCount === 'number'
        ? rawDetection.frameCount
        : undefined,
  }
}

function normalizeVideoFrame(rawFrame: Record<string, unknown>): VideoAnalyzeFrame {
  const rawDetections = Array.isArray(rawFrame.detections) ? rawFrame.detections : []

  return {
    startFrame: Number(rawFrame.startFrame ?? 0),
    endFrame: Number(rawFrame.endFrame ?? 0),
    detections: rawDetections
      .filter((detection): detection is Record<string, unknown> => Boolean(detection) && typeof detection === 'object')
      .map(normalizeDetection),
  }
}

export async function fileFromAssetSource(src: string, fallbackName: string) {
  const response = await fetch(src)
  if (!response.ok) {
    throw new Error('분석할 파일을 불러오지 못했습니다.')
  }

  const blob = await response.blob()
  const extension = blob.type.split('/')[1] || 'bin'
  return new File([blob], `${fallbackName}.${extension}`, { type: blob.type || undefined })
}

export async function analyzeImageFile(file: File) {
  const userId = requireConfiguredUserId()
  const formData = new FormData()
  formData.append('file', file)

  const response = await requestJson<ImageAnalyzeResponse>(
    `/api/v1/media/images/analyze?userId=${encodeURIComponent(userId)}`,
    {
      method: 'POST',
      body: formData,
    },
  )

  return {
    ...response,
    detections: Array.isArray(response.detections)
      ? response.detections.map((detection) => normalizeDetection(detection as unknown as Record<string, unknown>))
      : [],
  } satisfies ImageAnalyzeResponse
}

export async function analyzeVideoFile(file: File) {
  const userId = requireConfiguredUserId()
  const formData = new FormData()
  formData.append('file', file)

  const response = await requestJson<VideoAnalyzeResponse>(
    `/api/v1/media/videos/analyze?userId=${encodeURIComponent(userId)}`,
    {
      method: 'POST',
      body: formData,
    },
  )

  return {
    ...response,
    frames: Array.isArray(response.frames)
      ? response.frames.map((frame) => normalizeVideoFrame(frame as unknown as Record<string, unknown>))
      : [],
  } satisfies VideoAnalyzeResponse
}

export async function fetchDetectedRisksCount() {
  const userId = requireConfiguredUserId()

  return await requestJson<DashboardDetectedRisksCountResponse>(
    '/api/v1/dashboard/detected-risks/count',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    },
  )
}

export async function fetchAverageRiskScore() {
  const userId = requireConfiguredUserId()

  return await requestJson<DashboardAverageRiskScoreResponse>(
    '/api/v1/dashboard/risk-score/average',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    },
  )
}

export async function fetchSafeFilesCount() {
  const userId = requireConfiguredUserId()

  return await requestJson<DashboardSafeFilesCountResponse>(
    '/api/v1/dashboard/safe-files/count',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    },
  )
}
