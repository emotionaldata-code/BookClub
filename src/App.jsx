import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import GraphView from './pages/GraphView'
import BookDetail from './pages/BookDetail'
import UploadBook from './pages/UploadBook'
import SecretAdmin from './pages/SecretAdmin'
import BookClubReads from './pages/BookClubReads'
import './App.css'

function Navigation() {
  const location = useLocation()
  const navigate = useNavigate()
  
  let currentTab = 'list'
  if (location.pathname === '/graph') {
    currentTab = 'graph'
  } else if (location.pathname === '/bookclub') {
    currentTab = 'bookclub'
  }
  
  const handleTabChange = (tab) => {
    if (tab === 'list') {
      navigate('/')
    } else if (tab === 'graph') {
      navigate('/graph')
    } else if (tab === 'bookclub') {
      navigate('/bookclub')
    }
  }
  
  // Only show tabs on main pages, not on book detail or upload
  const isDetailPage = location.pathname.startsWith('/books/')
  const isUploadPage = location.pathname === '/upload'
  
  if (isDetailPage || isUploadPage) {
    return null
  }
  
  return (
    <nav className="nav-tabs">
      <button 
        className={`nav-tab ${currentTab === 'list' ? 'active' : ''}`}
        onClick={() => handleTabChange('list')}
      >
        List View
      </button>
      <button 
        className={`nav-tab ${currentTab === 'bookclub' ? 'active' : ''}`}
        onClick={() => handleTabChange('bookclub')}
      >
        BookClub Reads
      </button>
      <button 
        className={`nav-tab ${currentTab === 'graph' ? 'active' : ''}`}
        onClick={() => handleTabChange('graph')}
      >
        Graph View
      </button>
      <button 
        className="nav-tab nav-tab-upload"
        onClick={() => navigate('/upload')}
      >
        + Add Book
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
            <Route path="/graph" element={<GraphView />} />
            <Route path="/bookclub" element={<BookClubReads />} />
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
  const navigate = useNavigate()
  
  return (
    <h1 
      className="logo" 
      onClick={() => navigate('/')}
      style={{ cursor: 'pointer' }}
    >
      BookClub
    </h1>
  )
}

export default App

