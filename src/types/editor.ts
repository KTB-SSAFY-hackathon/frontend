export type GalleryPhoto = {
  id: string
  name: string
  src: string
}

export type EditorSettings = {
  brightness: number
  contrast: number
  saturation: number
  warmth: number
  blur: number
  zoom: number
  exposure: number
  highlights: number
  shadows: number
  sharpen: number
  grain: number
  vignette: number
  rotate: number
  flipX: boolean
  flipY: boolean
  aspectRatio: 'original' | '1:1' | '4:5' | '16:9'
}

export type EditorPanel = 'tools' | 'filters' | 'adjust' | 'pro' | 'mask'

export type MaskMode =
  | 'softBlur'
  | 'stickerCat'
  | 'stickerSmile'
  | 'stickerHeart'
  | 'stickerStar'
  | 'stickerHot'
  | 'stickerNew'
  | 'stickerArrow'
  | 'stickerWhiteBar'
  | 'stickerBlackBar'
  | 'stickerDaisy'
