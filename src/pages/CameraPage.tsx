import { useEffect, useRef, useState } from 'react'
import './CameraPage.css'

type CameraMode = 'photo' | 'video'

export function CameraPage() {
  const previewRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [mode, setMode] = useState<CameraMode>('photo')
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [cameraError, setCameraError] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [captureUrl, setCaptureUrl] = useState('')
  const [captureType, setCaptureType] = useState<CameraMode>('photo')

  useEffect(() => {
    let mounted = true

    async function startCamera() {
      setCameraError('')
      streamRef.current?.getTracks().forEach((track) => track.stop())

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1080 },
            height: { ideal: 1920 },
          },
          audio: true,
        })

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        if (previewRef.current) {
          previewRef.current.srcObject = stream
          void previewRef.current.play()
        }
      } catch {
        if (mounted) {
          setCameraError('카메라 권한을 허용해야 촬영할 수 있습니다.')
        }
      }
    }

    void startCamera()

    return () => {
      mounted = false
      recorderRef.current?.stop()
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [facingMode])

  useEffect(() => () => {
    if (captureUrl) {
      URL.revokeObjectURL(captureUrl)
    }
  }, [captureUrl])

  function replaceCaptureUrl(nextUrl: string, nextType: CameraMode) {
    setCaptureUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl)
      return nextUrl
    })
    setCaptureType(nextType)
  }

  function capturePhoto() {
    const video = previewRef.current
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')

    if (!context) return

    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (!blob) return
      replaceCaptureUrl(URL.createObjectURL(blob), 'photo')
    }, 'image/png')
  }

  function startRecording() {
    const stream = streamRef.current
    if (!stream) return

    chunksRef.current = []
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : ''
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    recorderRef.current = recorder
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data)
      }
    }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      replaceCaptureUrl(URL.createObjectURL(blob), 'video')
      setIsRecording(false)
    }
    recorder.start()
    setIsRecording(true)
  }

  function stopRecording() {
    recorderRef.current?.stop()
  }

  function downloadCapture() {
    if (!captureUrl) return

    const link = document.createElement('a')
    link.href = captureUrl
    link.download = captureType === 'photo' ? 'catchcatch-photo.png' : 'catchcatch-video.webm'
    link.click()
  }

  return (
    <section className="camera-page">
      <header className="camera-topbar">
        <div className="camera-quality-tabs" aria-label="카메라 품질">
          <button className="active" type="button">기본</button>
          <button type="button">고화질</button>
          <button type="button">아이폰</button>
          <span>N</span>
        </div>
        <button
          className="camera-switch-icon"
          type="button"
          onClick={() => setFacingMode((currentMode) => currentMode === 'user' ? 'environment' : 'user')}
          aria-label="카메라 전환"
        >
          ⟳
        </button>
      </header>

      <div className="camera-preview">
        {cameraError ? (
          <div className="camera-error">
            <strong>카메라를 열 수 없습니다</strong>
            <span>{cameraError}</span>
          </div>
        ) : (
          <video ref={previewRef} muted playsInline autoPlay />
        )}
        {isRecording ? <span className="recording-badge">REC</span> : null}
        {captureUrl ? (
          <button className="camera-result" type="button" onClick={downloadCapture} aria-label="촬영 결과 저장">
            {captureType === 'photo' ? <img src={captureUrl} alt="촬영 결과" /> : <video src={captureUrl} muted playsInline />}
          </button>
        ) : null}
      </div>

      <div className="camera-controls">
        <div className="camera-mode-toggle" aria-label="촬영 모드">
          <button className={mode === 'photo' ? 'active' : ''} type="button" onClick={() => setMode('photo')}>
            촬영
          </button>
          <button className={mode === 'video' ? 'active' : ''} type="button" onClick={() => setMode('video')}>
            비디오
          </button>
        </div>

        <div className="camera-actions">
          <button className="camera-tool-button" type="button">
            <span>▥</span>
            보정
          </button>
          <button className="camera-tool-button" type="button">
            <span>☺</span>
            이벤트
          </button>
          <button
            className={`capture-button ${isRecording ? 'recording' : ''}`}
            type="button"
            onClick={() => {
              if (mode === 'photo') {
                capturePhoto()
                return
              }

              if (isRecording) {
                stopRecording()
              } else {
                startRecording()
              }
            }}
            aria-label={mode === 'photo' ? '사진 촬영' : isRecording ? '녹화 종료' : '동영상 녹화 시작'}
          />
          <button className="camera-tool-button" type="button">
            <span>▢</span>
            뷰티
          </button>
          <button className="camera-tool-button" type="button" onClick={downloadCapture} disabled={!captureUrl}>
            <span>○○○</span>
            필터
          </button>
        </div>
      </div>
    </section>
  )
}
