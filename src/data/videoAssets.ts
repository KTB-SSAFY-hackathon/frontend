import video1 from '../assets/동영상1.mp4'
import video2 from '../assets/동영상2.mp4'
import video3 from '../assets/동영상3.mp4'
import video4 from '../assets/동영상4.mp4'
import type { VideoAsset } from '../types/video'

export const fixedVideoAssets: VideoAsset[] = [
  { id: 'fixed-video-1', name: '동영상 1', src: video1, duration: 24 },
  { id: 'fixed-video-2', name: '동영상 2', src: video2, duration: 24 },
  { id: 'fixed-video-3', name: '동영상 3', src: video3, duration: 24 },
  { id: 'fixed-video-4', name: '동영상 4', src: video4, duration: 24 },
]
