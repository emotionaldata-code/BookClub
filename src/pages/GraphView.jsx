import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import './GraphView.css'

function GraphView() {
  const navigate = useNavigate()
  const svgRef = useRef(null)
  const [books, setBooks] = useState([])
  const [selectedGenre, setSelectedGenre] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch books on mount
  useEffect(() => {
    fetchBooks()
  }, [])

  const fetchBooks = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/books')
      
      if (!response.ok) {
        throw new Error('Failed to fetch books')
      }
      
      const data = await response.json()
      setBooks(data)
    } catch (err) {
      console.error('Error fetching books:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  // Filter books based on search query
  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) {
      return books
    }
    
    const query = searchQuery.toLowerCase().trim()
    return books.filter(book => 
      book.title.toLowerCase().includes(query)
    )
  }, [searchQuery, books])
  
  // Extract all unique genres and create genre data
  const genreData = {}
  const genreConnections = {}
  
  filteredBooks.forEach(book => {
    if (book.genres && book.genres.length > 0) {
      book.genres.forEach(genre => {
        if (!genreData[genre]) {
          genreData[genre] = []
        }
        genreData[genre].push(book)
      })
      
      // Create connections between genres for books with multiple genres
      // Store each book that creates a connection
      if (book.genres.length > 1) {
        for (let i = 0; i < book.genres.length; i++) {
          for (let j = i + 1; j < book.genres.length; j++) {
            const pair = [book.genres[i], book.genres[j]].sort().join('|')
            if (!genreConnections[pair]) {
              genreConnections[pair] = []
            }
            genreConnections[pair].push(book.id)
          }
        }
      }
    }
  })
  
  const genres = Object.keys(genreData)
  
  // Calculate circle positions in a circular layout
  const centerX = 500
  const centerY = 400
  const radius = 250
  
  const genrePositions = {}
  genres.forEach((genre, index) => {
    const angle = (index / genres.length) * 2 * Math.PI - Math.PI / 2
    genrePositions[genre] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      count: genreData[genre].length
    }
  })
  
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 3))
  }
  
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5))
  }
  
  const handleCircleClick = (genre) => {
    setSelectedGenre(genre)
  }
  
  const handleBackToGraph = () => {
    setSelectedGenre(null)
  }
  
  const handleBookClick = (bookId) => {
    navigate(`/books/${bookId}`)
  }
  
  const handleMouseDown = (e) => {
    if (e.target.tagName === 'svg' || e.target.classList.contains('graph-canvas')) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }
  
  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }
  
  const handleMouseUp = () => {
    setIsDragging(false)
  }
  
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragStart])
  
  if (loading) {
    return (
      <div className="container">
        <div className="graph-view">
          <p className="loading">Loading books...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <div className="graph-view">
          <p className="error">Error: {error}</p>
        </div>
      </div>
    )
  }

  if (selectedGenre) {
    // Filter books in the selected genre based on search
    const genreBooks = genreData[selectedGenre] || []
    
    return (
      <div className="container">
        <div className="graph-view">
          <div className="genre-detail">
            <button className="back-button" onClick={handleBackToGraph}>
              ← Back to Graph
            </button>
            <h2 className="genre-title">{selectedGenre}</h2>
            <p className="genre-count">{genreBooks.length} book(s)</p>
            <SearchBar 
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search books by title..."
            />
            <div className="genre-books">
              {genreBooks.map(book => (
                <div 
                  key={book.id} 
                  className="genre-book-item"
                  onClick={() => handleBookClick(book.id)}
                >
                  <div className="genre-book-cover">
                    {book.cover ? (
                      <img src={book.cover} alt={book.title} />
                    ) : (
                      <div className="genre-book-placeholder">📖</div>
                    )}
                  </div>
                  <div className="genre-book-info">
                    <h3>{book.title}</h3>
                    <div className="genre-book-tags">
                      {book.genres.map((g, i) => (
                        <span key={i} className="genre-tag">{g}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="container">
      <div className="graph-view">
        <SearchBar 
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search books by title..."
        />
        <div className="graph-controls">
          <button className="zoom-button" onClick={handleZoomOut}>−</button>
          <span className="zoom-level">{Math.round(zoom * 100)}%</span>
          <button className="zoom-button" onClick={handleZoomIn}>+</button>
        </div>
        
        <div 
          className="graph-canvas"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <svg 
            ref={svgRef}
            width="1000" 
            height="800"
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              transformOrigin: 'center'
            }}
          >
            <defs>
              <filter id="shadow">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15"/>
              </filter>
            </defs>
            
            {/* Draw connections */}
            <g className="connections">
              {Object.entries(genreConnections).map(([connection, bookIds]) => {
                const [genre1, genre2] = connection.split('|')
                const pos1 = genrePositions[genre1]
                const pos2 = genrePositions[genre2]
                
                // Calculate angle for offsetting parallel lines
                const dx = pos2.x - pos1.x
                const dy = pos2.y - pos1.y
                const angle = Math.atan2(dy, dx)
                const perpAngle = angle + Math.PI / 2
                
                // Draw multiple lines if multiple books connect these genres
                return bookIds.map((bookId, index) => {
                  // Offset lines perpendicular to the connection
                  const numLines = bookIds.length
                  const offset = numLines > 1 
                    ? ((index - (numLines - 1) / 2) * 3) 
                    : 0
                  
                  const offsetX = Math.cos(perpAngle) * offset
                  const offsetY = Math.sin(perpAngle) * offset
                  
                  return (
                    <line
                      key={`${connection}-${bookId}`}
                      x1={pos1.x + offsetX}
                      y1={pos1.y + offsetY}
                      x2={pos2.x + offsetX}
                      y2={pos2.y + offsetY}
                      stroke="#000000"
                      strokeWidth="2"
                      opacity="0.6"
                    />
                  )
                })
              })}
            </g>
            
            {/* Draw genre circles */}
            <g className="genres">
              {genres.map(genre => {
                const pos = genrePositions[genre]
                const circleRadius = 40 + Math.min(pos.count * 8, 40)
                
                return (
                  <g 
                    key={genre}
                    className="genre-circle-group"
                    onClick={() => handleCircleClick(genre)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={circleRadius}
                      fill="#ffffff"
                      stroke="#2c3e50"
                      strokeWidth="2"
                      filter="url(#shadow)"
                      className="genre-circle"
                    />
                    <text
                      x={pos.x}
                      y={pos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#2c3e50"
                      fontSize="14"
                      fontWeight="600"
                      className="genre-label"
                    >
                      {genre}
                    </text>
                    <text
                      x={pos.x}
                      y={pos.y + 18}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#7f8c8d"
                      fontSize="12"
                      className="genre-count-label"
                    >
                      {pos.count} book{pos.count !== 1 ? 's' : ''}
                    </text>
                  </g>
                )
              })}
            </g>
          </svg>
        </div>
        
        {books.length > 0 && genres.length === 0 && (
          <div className="no-genres">
            <p>
              {searchQuery 
                ? "No books match your search. Try a different query." 
                : "No genres found in your books."}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default GraphView

