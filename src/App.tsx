import './App.css'
import { HashRouter, Routes, Route } from 'react-router-dom'

function AppScreen() {
  return (
    <div className="app-shell">
      <div className="app-screen">
        <header className="app-header">
          <h1>웹 앱 뷰</h1>
          <p>가운데 정렬된 390px 앱 화면입니다.</p>
        </header>

        <main className="app-main">
          <section className="app-panel">
            <h2>앱 화면</h2>
            <p>이 페이지는 모든 라우트에서 동일한 앱 화면을 보여줍니다.</p>
          </section>
        </main>

        <footer className="app-footer">
          <span>모든 페이지 적용 라우트</span>
        </footer>
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
