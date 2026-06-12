import { Link } from 'react-router-dom'
import { homeActions } from '../data/navigation'
import './HomePage.css'

export function HomePage() {
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
    </section>
  )
}
