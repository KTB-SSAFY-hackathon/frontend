import './App.css'
import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { tabs } from './data/navigation'
import { HomePage } from './pages/HomePage'
import { CameraPage } from './pages/CameraPage'
import { PageContent } from './pages/PageContent'
import { PhotoEditorPage } from './pages/PhotoEditorPage'
import { VideoEditorPage } from './pages/VideoEditorPage'

function AppScreen() {
  const location = useLocation()
  const currentTab = tabs.find((tab) => tab.path === location.pathname) ?? tabs[0]
  const isImmersiveEditor = location.pathname === '/photo-editor' || location.pathname === '/video-editor' || location.pathname === '/camera'

  return (
    <div className="app-shell">
      <div className={`app-screen ${isImmersiveEditor ? 'immersive-screen' : ''}`}>
        {isImmersiveEditor ? null : (
          <header className="app-header">
            <div>
              <p className="app-subtitle">앱 바닥글 및 헤더</p>
              <h1>{currentTab.label}</h1>
            </div>
          </header>
        )}

        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
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
                  className={({ isActive }) => `tab-item tab-${tab.key} ${isActive ? 'active' : ''}`}
                >
                  <span className="tab-icon">{tab.icon}</span>
                  <span className="tab-label">{tab.label}</span>
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
