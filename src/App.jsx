import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import GraphView from './pages/GraphView'
import BookDetail from './pages/BookDetail'
import UploadBook from './pages/UploadBook'
import './App.css'

function Navigation() {
  const location = useLocation()
  const navigate = useNavigate()
  
  const currentTab = location.pathname === '/graph' ? 'graph' : 'list'
  
  const handleTabChange = (tab) => {
    if (tab === 'list') {
      navigate('/')
    } else {
      navigate('/graph')
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
            <Route path="/upload" element={<UploadBook />} />
            <Route path="/books/:bookId" element={<BookDetail />} />
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

