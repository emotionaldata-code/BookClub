import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import './BookDetail.css'

function BookDetail() {
  const { bookId } = useParams()
  const [book, setBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchBook()
  }, [bookId])

  const fetchBook = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/books/${bookId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Book not found')
        } else {
          throw new Error('Failed to fetch book')
        }
        return
      }
      
      const data = await response.json()
      setBook(data)
    } catch (err) {
      console.error('Error fetching book:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="book-detail">
          <Link to="/" className="back-link">← Back to Home</Link>
          <p className="loading">Loading book...</p>
        </div>
      </div>
    )
  }

  if (error || !book) {
    return (
      <div className="container">
        <div className="book-detail">
          <Link to="/" className="back-link">← Back to Home</Link>
          <h2>{error || 'Book not found'}</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="book-detail">
        <Link to="/" className="back-link">← Back to Home</Link>
        
        <div className="book-detail-content">
          <div className="book-detail-cover">
            {book.cover ? (
              <img src={book.cover} alt={book.title} />
            ) : (
              <div className="book-detail-placeholder">📖</div>
            )}
          </div>
          
          <div className="book-detail-info">
            <h1 className="book-detail-title">{book.title}</h1>
            
            {book.genres && book.genres.length > 0 && (
              <div className="book-detail-genres">
                {book.genres.map((genre, index) => (
                  <span key={index} className="genre-tag">{genre}</span>
                ))}
              </div>
            )}
            
            <div className="book-detail-description">
              <h3>Description</h3>
              <p>{book.description}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookDetail

