import type { EditorSettings } from '../types/editor'

export const defaultSettings: EditorSettings = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  warmth: 0,
  blur: 0,
  zoom: 100,
  exposure: 0,
  highlights: 0,
  shadows: 0,
  sharpen: 0,
  grain: 0,
  vignette: 0,
  rotate: 0,
  flipX: false,
  flipY: false,
  aspectRatio: 'original',
}

export const filterPresets = [
  { name: '원본', brightness: 100, contrast: 100, saturation: 100, warmth: 0 },
  { name: '선명', brightness: 106, contrast: 116, saturation: 112, warmth: 2 },
  { name: '필름', brightness: 104, contrast: 92, saturation: 82, warmth: 10 },
  { name: '쿨톤', brightness: 100, contrast: 106, saturation: 108, warmth: -12 },
  { name: '모노', brightness: 102, contrast: 118, saturation: 0, warmth: 0 },
]

export const aspectRatios = [
  { label: '원본', value: 'original' },
  { label: '1:1', value: '1:1' },
  { label: '4:5', value: '4:5' },
  { label: '16:9', value: '16:9' },
] satisfies Array<{ label: string; value: EditorSettings['aspectRatio'] }>

export function getCanvasFilter(settings: EditorSettings) {
  const sepia = Math.max(settings.warmth, 0) / 80
  const hue = settings.warmth < 0 ? settings.warmth * 1.8 : 0
  const exposureBrightness = 100 + settings.exposure

  return [
    `brightness(${settings.brightness * exposureBrightness / 100}%)`,
    `contrast(${settings.contrast}%)`,
    `saturate(${settings.saturation}%)`,
    `sepia(${sepia})`,
    `hue-rotate(${hue}deg)`,
    `blur(${settings.blur}px)`,
  ].join(' ')
}

export function getAspectValue(aspectRatio: EditorSettings['aspectRatio']) {
  if (aspectRatio === '1:1') return 1
  if (aspectRatio === '4:5') return 4 / 5
  if (aspectRatio === '16:9') return 16 / 9
  return null
}

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, value))
}

export function applyProAdjustments(
  context: CanvasRenderingContext2D,
  settings: EditorSettings,
  width: number,
  height: number,
) {
  if (
    settings.highlights === 0 &&
    settings.shadows === 0 &&
    settings.sharpen === 0 &&
    settings.grain === 0 &&
    settings.vignette === 0
  ) {
    return
  }

  const imageData = context.getImageData(0, 0, width, height)
  const source = new Uint8ClampedArray(imageData.data)
  const data = imageData.data
  const centerX = width / 2
  const centerY = height / 2
  const maxDistance = Math.hypot(centerX, centerY)

  for (let index = 0; index < data.length; index += 4) {
    let red = source[index]
    let green = source[index + 1]
    let blue = source[index + 2]
    const pixel = index / 4
    const x = pixel % width
    const y = Math.floor(pixel / width)
    const luminance = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255
    const shadowMask = 1 - luminance
    const highlightMask = luminance
    const tonalLift = settings.shadows * shadowMask * 1.45 - settings.highlights * highlightMask * 1.2
    const grain = settings.grain === 0 ? 0 : ((Math.sin(pixel * 12.9898) * 43758.5453) % 1) * settings.grain * 1.8
    const distance = Math.hypot(x - centerX, y - centerY) / maxDistance
    const vignette = 1 - Math.max(0, distance - 0.34) * settings.vignette / 70

    if (settings.sharpen !== 0 && x > 0 && x < width - 1 && y > 0 && y < height - 1) {
      const topIndex = index - width * 4
      const bottomIndex = index + width * 4
      const leftIndex = index - 4
      const rightIndex = index + 4
      const amount = settings.sharpen / 100

      red += (red * 4 - source[topIndex] - source[bottomIndex] - source[leftIndex] - source[rightIndex]) * amount
      green += (green * 4 - source[topIndex + 1] - source[bottomIndex + 1] - source[leftIndex + 1] - source[rightIndex + 1]) * amount
      blue += (blue * 4 - source[topIndex + 2] - source[bottomIndex + 2] - source[leftIndex + 2] - source[rightIndex + 2]) * amount
    }

    data[index] = clampChannel((red + tonalLift + grain) * vignette)
    data[index + 1] = clampChannel((green + tonalLift + grain) * vignette)
    data[index + 2] = clampChannel((blue + tonalLift + grain) * vignette)
  }

  context.putImageData(imageData, 0, 0)
}
