export type BackendDetectionLabel =
  | 'school_logo'
  | 'name_tag'
  | 'address'
  | 'gps'
  | 'recording_date'
  | 'device'
  | 'car_plate'
  | 'card_num'
  | 'name'
  | 'phone'
  | 'resident_num'
  | 'face'
  | 'unknown'
  | string

export type NormalizedBbox = [number, number, number, number]

export type MediaDetection = {
  detectionId: string
  label: BackendDetectionLabel
  bboxNorm: NormalizedBbox
  trackId?: number
  frameNumber?: number
}

export type ImageAnalyzeResponse = {
  fileId: string
  userId: string
  mediaType: 'IMAGE'
  image: {
    width: number
    height: number
  }
  detections: MediaDetection[]
}

export type VideoAnalyzeFrame = {
  startFrame: number
  endFrame: number
  detections: MediaDetection[]
}

export type VideoAnalyzeResponse = {
  fileId: string
  userId: string
  mediaType: 'VIDEO'
  video: {
    width: number
    height: number
    origWidth: number
    origHeight: number
    fps?: number
    totalFrames?: number
    frameInterval: number
  }
  frames: VideoAnalyzeFrame[]
}

export type DashboardDetectedRisksCountResponse = {
  userId: string
  totalDetectedRiskCount: number
}

export type DashboardAverageRiskScoreResponse = {
  userId: string
  averageRiskScore: number
}

export type DashboardSafeFilesCountResponse = {
  userId: string
  safeFileCount: number
}
