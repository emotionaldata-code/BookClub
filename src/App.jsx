import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import BookDetail from './pages/BookDetail'
import UploadBook from './pages/UploadBook'
import SecretAdmin from './pages/SecretAdmin'
import './App.css'

function Navigation() {
  const location = useLocation()
  const navigate = useNavigate()
  
  // Only show tabs on main pages, not on book detail or upload
  const isDetailPage = location.pathname.startsWith('/books/')
  const isUploadPage = location.pathname === '/upload'
  
  if (isDetailPage || isUploadPage) {
    return null
  }
  
  return (
    <nav className="nav-tabs" aria-label="Navigazione principale">
      <button
        className={`nav-tab ${location.pathname === '/' ? 'active' : ''}`}
        onClick={() => navigate('/')}
      >
        Libreria
      </button>
      <button 
        className="nav-tab nav-tab-upload"
        onClick={() => navigate('/upload')}
      >
        + Aggiungi libro
      </button>
    </nav>
  )
}

function App() {
  return (
    <Router>
      <div className="app">
        <header className="header">
          <div className="container">
            <div className="header-content">
              <Logo />
              <Navigation />
            </div>
          </div>
        </header>
        <main className="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/graph" element={<Navigate to="/" replace />} />
            <Route path="/bookclub" element={<Navigate to="/" replace />} />
            <Route path="/upload" element={<UploadBook />} />
            <Route path="/books/:bookId" element={<BookDetail />} />
            <Route path="/secret_admin" element={<SecretAdmin />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

function Logo() {
  return (
    <Link className="logo" to="/" aria-label="BookClub, torna alla libreria">
      BookClub
    </Link>
  )
}

export default App

