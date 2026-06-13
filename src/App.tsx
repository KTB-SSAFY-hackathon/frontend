import './App.css'
import { HashRouter, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { tabs } from './data/navigation'
import { HomePage } from './pages/HomePage'
import { CameraPage } from './pages/CameraPage'
import { PageContent } from './pages/PageContent'
import { PhotoEditorPage } from './pages/PhotoEditorPage'
import { VideoEditorPage } from './pages/VideoEditorPage'
import { SplashScreen } from './components/SplashScreen'
import { useState } from 'react'
import { LoginPage } from './pages/LoginPage'
import catchcatchLogo from './assets/캐치캐치로고.png'

function AppScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const [showSplash, setShowSplash] = useState(true)
  const currentTab = tabs.find((tab) => tab.path === location.pathname) ?? tabs[0]
  const isImmersiveEditor =
    location.pathname === '/photo-editor' ||
    location.pathname === '/video-editor' ||
    location.pathname === '/camera' ||
    location.pathname === '/login'

  const handleSplashComplete = () => {
    setShowSplash(false)
    navigate('/login')
  }

  const handleLogin = () => {
    navigate('/')
  }
  const isHome = location.pathname === '/'
  const isImmersiveEditor = location.pathname === '/photo-editor' || location.pathname === '/video-editor' || location.pathname === '/camera'

  return (
    <div className="app-shell">
      <div className={`app-screen ${isImmersiveEditor ? 'immersive-screen' : ''}`}>
        {showSplash ? <SplashScreen onComplete={handleSplashComplete} /> : null}

        {isImmersiveEditor ? null : (
          <header className={`app-header ${isHome ? 'home-header' : ''}`}>
            {isHome ? (
              <div className="home-header-layout">
                <div className="home-header-copy">
                  <p className="home-header-subtitle">올리기 전에 한 번 더 안전하게</p>
                  <div className="home-header-brand-row">
                    <img className="home-header-logo" src={catchcatchLogo} alt="캐치캐치" />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p className="app-subtitle">앱 바닥글 및 헤더</p>
                <h1>{currentTab.headerLabel ?? currentTab.label}</h1>
              </div>
            )}
          </header>
        )}

        <main className={`app-main ${isHome ? 'home-main' : ''}`}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route path="/photo-editor" element={<PhotoEditorPage />} />
            <Route path="/video-editor" element={<VideoEditorPage />} />
            <Route
              path="/settings"
              element={<PageContent title="설정" description="앱 환경과 편집 옵션을 관리하는 공간입니다." />}
            />
            <Route
              path="/camera"
              element={<CameraPage />}
            />
            <Route
              path="/trash"
              element={<PageContent title="보관함" description="저장한 프로젝트와 편집한 항목을 확인하는 공간입니다." />}
            />
            <Route
              path="/profile"
              element={<PageContent title="Profile" description="사용자 프로필 및 설정 페이지입니다." />}
            />
          </Routes>
        </main>

        {isImmersiveEditor ? null : (
          <footer className="app-footer">
            <nav className="tab-bar">
              {tabs.map((tab) => (
                <NavLink
                  key={tab.key}
                  to={tab.path}
                  aria-label={tab.footerLabel ?? tab.label}
                  className={({ isActive }) => `tab-item tab-${tab.key} ${isActive ? 'active' : ''}`}
                >
                  <span className="tab-icon">{tab.icon}</span>
                  {tab.showFooterLabel === false ? null : (
                    <span className="tab-label">{tab.footerLabel ?? tab.label}</span>
                  )}
                </NavLink>
              ))}
            </nav>
          </footer>
        )}
      </div>
    </div>
  )
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="*" element={<AppScreen />} />
      </Routes>
    </HashRouter>
  )
}

export default App
