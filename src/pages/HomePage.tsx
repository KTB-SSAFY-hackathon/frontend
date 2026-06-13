import { useEffect, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  Image as ImageIcon,
  TrendingUp,
  Video as VideoIcon,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import markerImage from '../assets/마커.png'
import warningIcon from '../assets/경고.png'
import dummyParkingImage from '../assets/더미주차장이미지.jpg'
import dummyVlogImage from '../assets/더미브이로그이미지.webp'
import dummySchoolImage from '../assets/더미학교앞이미지.png'
import editor10Image from '../assets/에디터10.png'
import { homeActions } from '../data/navigation'
import {
  fetchDetectedRisksCount,
} from '../utils/backendApi'
import { getStoredDashboardRecentItems, type DashboardRecentItem } from '../utils/mediaLibrary'
import './HomePage.css'

const C = {
  primary: '#00A37C',
  primaryDark: '#007A63',
  primaryLight: '#DFF8F1',
  lightBG: '#F8FAFC',
  textMain: '#111827',
  textSub: '#6B7280',
  warning: '#FFB000',
  warningLight: '#FFF8E6',
  danger: '#FF4D6D',
  dangerLight: '#FFE9EE',
  white: '#FFFFFF',
} as const

type StatusKey = 'danger' | 'warning' | 'safe'
type HomeRecentMediaItem = DashboardRecentItem & {
  bg?: string
  emoji?: string
}

type DashboardSnapshot = {
  totalDetections: number
  averageRiskScore: number
  safeSharedPhotos: number
  unmaskedRatio: number
  topMissedItems: Array<{ label: string; value: number; color: string }>
  typeDistribution: Array<{ label: string; value: number; color: string }>
  sources: readonly ['OBJ', 'OCR', 'SCN']
}

const fallbackDashboardSnapshot: DashboardSnapshot = {
  totalDetections: 248,
  averageRiskScore: 72,
  safeSharedPhotos: 3,
  unmaskedRatio: 18,
  topMissedItems: [
    { label: '교복/명찰', value: 38, color: '#FF5C84' },
    { label: '번호판', value: 26, color: '#7C3AED' },
    { label: 'GPS', value: 19, color: '#00A37C' },
  ],
  typeDistribution: [
    { label: '교복/명찰', value: 32, color: '#FF5C84' },
    { label: '번호판', value: 28, color: '#7C3AED' },
    { label: 'GPS', value: 22, color: '#00A37C' },
    { label: '학교명패', value: 18, color: '#FF8B1F' },
  ],
  sources: ['OBJ', 'OCR', 'SCN'] as const,
}

const RECENT_MEDIA: HomeRecentMediaItem[] = [
  { id: 'recent-selfie', emoji: '🤳', thumbnail: editor10Image, label: '셀카.jpg', mediaType: 'photo', bg: 'linear-gradient(145deg,#FF9A8B,#FF6A88)', status: 'danger', badge: '얼굴 감지됨', count: 2, createdAt: 0 },
  { id: 'recent-school', emoji: '🏫', thumbnail: dummySchoolImage, label: '학교앞.jpg', mediaType: 'photo', bg: 'linear-gradient(145deg,#43E97B,#38F9D7)', status: 'safe', badge: '안전 처리됨', count: 0, createdAt: 0 },
  { id: 'recent-parking', emoji: '🚘', thumbnail: dummyParkingImage, label: '주차장.mp4', mediaType: 'video', bg: 'linear-gradient(145deg,#A18CD1,#FBC2EB)', status: 'warning', badge: '번호판 감지', count: 1, createdAt: 0 },
  { id: 'recent-vlog', emoji: '📍', thumbnail: dummyVlogImage, label: '일상vlog.mp4', mediaType: 'video', bg: 'linear-gradient(145deg,#F093FB,#F5576C)', status: 'danger', badge: '위치정보 노출', count: 3, createdAt: 0 },
]

function Badge({ status, label }: { status: StatusKey; label: string }) {
  const cfg: Record<StatusKey, { bg: string; color: string }> = {
    danger: { bg: C.dangerLight, color: C.danger },
    warning: { bg: C.warningLight, color: C.warning },
    safe: { bg: C.primaryLight, color: C.primaryDark },
  }
  const { bg, color } = cfg[status]
  const DotIcon = status === 'safe' ? CheckCircle2 : AlertTriangle

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: bg,
        borderRadius: 20,
        padding: '3px 8px',
      }}
    >
      <DotIcon size={10} color={color} strokeWidth={2.5} />
      <span style={{ fontSize: 10, fontWeight: 700, color }}>{label}</span>
    </span>
  )
}

function SectionTitle({ children, sub, marginBottom = 14 }: { children: ReactNode; sub?: string; marginBottom?: number }) {
  return (
    <div style={{ marginBottom }}>
      <h3
        style={{
          margin: 0,
          fontSize: 17,
          fontWeight: 800,
          color: C.textMain,
          lineHeight: 1.3,
          fontFamily: "'Plus Jakarta Sans','Nunito',sans-serif",
        }}
      >
        {children}
      </h3>
      {sub ? <p style={{ margin: '2px 0 0', fontSize: 12, color: C.textSub }}>{sub}</p> : null}
    </div>
  )
}

function DashboardTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number | string; name?: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="dashboard-tooltip">
      {label ? <p>{label}</p> : null}
      <strong>{payload[0]?.value}</strong>
    </div>
  )
}

export function HomePage() {
  const [filter, setFilter] = useState<'all' | 'photo' | 'video'>('all')
  const [dashboardSnapshot, setDashboardSnapshot] = useState<DashboardSnapshot>(fallbackDashboardSnapshot)
  const recentMedia: HomeRecentMediaItem[] = [...getStoredDashboardRecentItems(), ...RECENT_MEDIA]

  useEffect(() => {
    let cancelled = false

    async function loadDashboardSnapshot() {
      try {
        const [detectedRiskCount] = await Promise.all([
          fetchDetectedRisksCount(),
        ])

        if (cancelled) return

        setDashboardSnapshot((currentSnapshot) => ({
          ...currentSnapshot,
          totalDetections: detectedRiskCount.totalDetectedRiskCount,
          averageRiskScore: 72,
          safeSharedPhotos: 3,
        }))
      } catch {
        if (cancelled) return
        setDashboardSnapshot(fallbackDashboardSnapshot)
      }
    }

    void loadDashboardSnapshot()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredRecentMedia = recentMedia.filter((item) => {
    if (filter === 'photo') return item.mediaType === 'photo'
    if (filter === 'video') return item.mediaType === 'video'
    return true
  })

  const safeHandledRatio = 100 - dashboardSnapshot.unmaskedRatio

  return (
    <section className="home-page">
      <div className="home-actions" aria-label="주요 편집 메뉴">
        {homeActions.map((action) => (
          <Link key={action.path} to={action.path} className="home-action-card">
            <span className="home-action-icon">{action.icon}</span>
            <span>{action.title}</span>
          </Link>
        ))}
      </div>

      <section className="home-recent-section">
        <div className="home-recent-header">
          <h3 className="home-recent-heading">
            <span className="home-recent-title">
              <img className="home-recent-title-marker" src={markerImage} alt="" aria-hidden="true" />
              <span className="home-recent-title-text">오늘 캐치한 콘텐츠</span>
            </span>
          </h3>

          <div className="home-recent-filters">
            {(['all', 'photo', 'video'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 20,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Nunito',sans-serif",
                  background: filter === value ? C.primary : '#F0F2F5',
                  color: filter === value ? C.white : C.textSub,
                }}
              >
                {value === 'all' ? '전체' : value === 'photo' ? '사진' : '영상'}
              </button>
            ))}
          </div>
        </div>

        <div className="home-recent-scroller">
          {filteredRecentMedia.map((item) => (
            <div
              key={item.id}
              style={{
                flexShrink: 0,
                width: 136,
                borderRadius: 20,
                overflow: 'hidden',
                background: C.white,
                boxShadow: '0 2px 16px rgba(0,0,0,0.09)',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: 122,
                  background: item.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 40,
                  position: 'relative',
                }}
              >
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt=""
                    aria-hidden="true"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span role="img" aria-label="">
                    {item.emoji}
                  </span>
                )}

                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    background: 'rgba(0,0,0,0.38)',
                    borderRadius: 8,
                    padding: '3px 7px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  {item.mediaType === 'video' ? (
                    <VideoIcon size={10} color={C.white} strokeWidth={2} />
                  ) : (
                    <ImageIcon size={10} color={C.white} strokeWidth={2} />
                  )}
                  <span style={{ fontSize: 9, color: C.white, fontWeight: 700 }}>
                    {item.mediaType === 'video' ? '영상' : '사진'}
                  </span>
                </div>

                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: item.status === 'safe' ? C.primary : item.status === 'warning' ? C.warning : C.danger,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  }}
                >
                  {item.status === 'safe' ? (
                    <CheckCircle2 size={12} color={C.white} strokeWidth={2.5} />
                  ) : (
                    <span style={{ fontSize: 10, color: C.white, fontWeight: 800 }}>{item.count}</span>
                  )}
                </div>
              </div>

              <div style={{ padding: '10px 12px 13px' }}>
                <p
                  style={{
                    margin: '0 0 6px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.textMain,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                </p>
                <Badge status={item.status} label={item.badge} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="home-dashboard" aria-labelledby="home-dashboard-title">
        <div className="home-dashboard-header">
          <SectionTitle marginBottom={0}>
            <span id="home-dashboard-title" className="home-dashboard-title">
              <img className="home-dashboard-title-icon" src={warningIcon} alt="" aria-hidden="true" />
              <span>개인정보 캐치 현황</span>
            </span>
          </SectionTitle>
        </div>

        <div className="dashboard-grid">
          <article className="dashboard-card dashboard-card-hero dashboard-card-wide">
            <div className="dashboard-hero-layout">
              <div className="dashboard-hero-copy">
                <span className="dashboard-card-kicker dashboard-card-kicker-inverse">
                  <TrendingUp size={12} strokeWidth={2.6} />
                  평균 위험도 점수
                </span>
                <strong className="dashboard-card-number dashboard-card-number-inverse">
                  {dashboardSnapshot.averageRiskScore}점
                </strong>
                <p className="dashboard-card-copy dashboard-card-copy-inverse">
                  업로드된 사진 평균 위험도
                </p>
              </div>

              <div className="dashboard-score-visual">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <RadialBarChart
                    data={[{ name: '평균 위험도', value: dashboardSnapshot.averageRiskScore, fill: '#FFB000' }]}
                    startAngle={90}
                    endAngle={-270}
                    innerRadius="70%"
                    outerRadius="100%"
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar background dataKey="value" cornerRadius={999} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="dashboard-score-center">
                  <strong>{dashboardSnapshot.averageRiskScore}</strong>
                  <span>점</span>
                </div>
              </div>
            </div>
          </article>

          <article className="dashboard-card dashboard-card-wide dashboard-card-total">
            <div>
              <div>
                <span className="dashboard-card-kicker">
                  <AlertTriangle size={12} strokeWidth={2.6} />
                  누적 탐지된 위험 요소 수
                </span>
                <strong className="dashboard-card-number">{dashboardSnapshot.totalDetections}개</strong>
                <p className="dashboard-card-copy">
                  지금까지 {dashboardSnapshot.totalDetections}개의 개인정보를 캐치했어요
                </p>
              </div>
            </div>
          </article>

          <article className="dashboard-card dashboard-card-safe">
            <span className="dashboard-card-kicker">
              <CheckCircle2 size={12} strokeWidth={2.6} />
              안전 처리 완료
            </span>
            <strong className="dashboard-card-number dashboard-card-number-emerald">
              {dashboardSnapshot.safeSharedPhotos}장
            </strong>
            <p className="dashboard-card-copy">{dashboardSnapshot.safeSharedPhotos}장이 안전하게 공유됐어요</p>
          </article>

          <article className="dashboard-card dashboard-card-ratio">
            <span className="dashboard-card-kicker">
              <EyeOff size={12} strokeWidth={2.6} />
              미가림 비율
            </span>
            <div className="dashboard-ratio-chart">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={[
                      { name: '미가림', value: dashboardSnapshot.unmaskedRatio, color: '#FF5C84' },
                      { name: '안전 처리', value: safeHandledRatio, color: '#FFDFA7' },
                    ]}
                    dataKey="value"
                    innerRadius={44}
                    outerRadius={58}
                    paddingAngle={3}
                    stroke="none"
                  >
                    <Cell fill="#FF5C84" />
                    <Cell fill="#FFDFA7" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="dashboard-ratio-center">
                <strong>{dashboardSnapshot.unmaskedRatio}%</strong>
                <span>미가림</span>
              </div>
            </div>
          </article>

          <article className="dashboard-card dashboard-card-wide">
            <div className="dashboard-card-header">
              <div>
                <h4>사람들이 가장 자주 흘리는 정보 TOP 3</h4>
              </div>
            </div>

            <div className="dashboard-chart dashboard-chart-top">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  data={dashboardSnapshot.topMissedItems}
                  layout="vertical"
                  margin={{ top: 4, right: 28, left: 4, bottom: 4 }}
                  barCategoryGap={12}
                >
                  <CartesianGrid horizontal={false} stroke="rgba(17,24,39,0.06)" />
                  <XAxis type="number" hide domain={[0, 45]} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    width={62}
                    tick={{ fill: '#111827', fontSize: 12, fontWeight: 700 }}
                  />
                  <Tooltip content={<DashboardTooltip />} />
                  <Bar dataKey="value" radius={[999, 999, 999, 999]} barSize={15}>
                    <LabelList
                      dataKey="value"
                      position="right"
                      formatter={(value) => `${value}%`}
                      fill="#111827"
                      fontSize={12}
                      fontWeight={800}
                    />
                    {dashboardSnapshot.topMissedItems.map((item) => (
                      <Cell key={item.label} fill={item.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="dashboard-card dashboard-card-wide">
            <div className="dashboard-card-header">
              <div>
                <h4>유형별 분포</h4>
              </div>
            </div>

            <div className="dashboard-chart dashboard-chart-distribution">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  data={dashboardSnapshot.typeDistribution}
                  layout="vertical"
                  margin={{ top: 4, right: 28, left: 4, bottom: 4 }}
                  barCategoryGap={10}
                >
                  <CartesianGrid horizontal={false} stroke="rgba(17,24,39,0.06)" />
                  <XAxis type="number" hide domain={[0, 40]} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    width={68}
                    tick={{ fill: '#111827', fontSize: 12, fontWeight: 700 }}
                  />
                  <Tooltip content={<DashboardTooltip />} />
                  <Bar dataKey="value" radius={[999, 999, 999, 999]}>
                    <LabelList
                      dataKey="value"
                      position="right"
                      formatter={(value) => `${value}%`}
                      fill="#111827"
                      fontSize={12}
                      fontWeight={800}
                    />
                    {dashboardSnapshot.typeDistribution.map((item) => (
                      <Cell key={item.label} fill={item.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </div>
      </section>
    </section>
  )
}
