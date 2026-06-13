import type { VideoAnalyzeResponse } from './api'
import type { AnalysisStatus } from './editor'

export type VideoAnalysis = {
  status: AnalysisStatus
  result?: VideoAnalyzeResponse
  errorMessage?: string
}

export type VideoAsset = {
  id: string
  name: string
  src: string
  duration: number
  analysis?: VideoAnalysis
}

export type TextOverlay = {
  id: string
  text: string
  start: number
  end: number
  x: number
  y: number
  size: number
  color: string
}

export type MusicTrack = {
  name: string
  src: string
  volume: number
}

export type VideoProject = {
  assets: VideoAsset[]
  trimStart: number
  trimEnd: number
  playbackRate: number
  mutedOriginal: boolean
  music: MusicTrack | null
  overlays: TextOverlay[]
}
