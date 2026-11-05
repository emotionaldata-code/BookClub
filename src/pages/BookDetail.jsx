import { useState, useEffect } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import './BookDetail.css'

function BookDetail() {
  const { bookId } = useParams()
  const location = useLocation()
  const libraryLink = { pathname: '/', search: location.state?.librarySearch ?? '' }
  const [book, setBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentsError, setCommentsError] = useState(null)
  const [commentAuthor, setCommentAuthor] = useState('')
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  useEffect(() => {
    fetchBook()
    fetchComments()
  }, [bookId])

  const fetchBook = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/books/${bookId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Libro non trovato')
        } else {
          throw new Error('Impossibile caricare il libro')
        }
        return
      }
      
      const data = await response.json()
      setBook(data)
    } catch (err) {
      console.error('Error fetching book:', err)
      setError(err instanceof TypeError ? 'Impossibile contattare il server. Riprova.' : err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async () => {
    try {
      setCommentsLoading(true)
      setCommentsError(null)
      const res = await fetch(`/api/books/${bookId}/comments`)
      if (!res.ok) {
        throw new Error('Impossibile caricare i commenti')
      }
      const data = await res.json()
      setComments(data)
    } catch (err) {
      console.error('Error fetching comments:', err)
      setCommentsError(err instanceof TypeError ? 'Impossibile contattare il server. Riprova.' : err.message)
    } finally {
      setCommentsLoading(false)
    }
  }

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) {
      return
    }

    try {
      setSubmittingComment(true)
      const res = await fetch(`/api/books/${bookId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          author: commentAuthor.trim() || null,
          text: commentText.trim(),
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Impossibile aggiungere il commento')
      }

      const newComment = await res.json()
      setComments(prev => [newComment, ...prev])
      setCommentText('')
      // Keep author filled so user doesn’t need to type every time
    } catch (err) {
      console.error('Error submitting comment:', err)
      setCommentsError(err instanceof TypeError ? 'Impossibile contattare il server. Riprova.' : err.message)
    } finally {
      setSubmittingComment(false)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="book-detail">
          <Link to={libraryLink} className="back-link">← Torna alla libreria</Link>
          <p className="loading">Caricamento del libro...</p>
        </div>
      </div>
    )
  }

  if (error || !book) {
    return (
      <div className="container">
        <div className="book-detail">
          <Link to={libraryLink} className="back-link">← Torna alla libreria</Link>
          <h2>{error || 'Libro non trovato'}</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="book-detail">
        <Link to={libraryLink} className="back-link">← Torna alla libreria</Link>
        
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
            
            {book.author && (
              <p className="book-detail-writer">
                di <span>{book.author}</span>
              </p>
            )}
            
            {book.writer && (
              <p className="book-detail-writer-meta">
                Aggiunto da <span>{book.writer}</span>
              </p>
            )}
            
            {book.rating != null && book.rating > 0 && (
              <div className="book-detail-rating">
                <span className="rating-stars-inline">
                  {[1, 2, 3, 4, 5].map((star) => {
                    let variant = 'empty'
                    if (book.rating >= star) {
                      variant = 'full'
                    } else if (book.rating >= star - 0.5) {
                      variant = 'half'
                    }
                    return (
                      <span
                        key={star}
                        className={`rating-star rating-star-${variant}`}
                      >
                        ★
                      </span>
                    )
                  })}
                </span>
                <span className="book-detail-rating-value">
                  {book.rating.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / 5
                </span>
              </div>
            )}
            
            {book.genres && book.genres.length > 0 && (
              <div className="book-detail-genres">
                {book.genres.map((genre, index) => (
                  <span key={index} className="genre-tag">{genre}</span>
                ))}
              </div>
            )}
            
            <div className="book-detail-description">
              <h3>Descrizione</h3>
              <p>{book.description}</p>
            </div>

            <div className="book-detail-comments">
              <h3>Commenti</h3>

              <form className="comment-form" onSubmit={handleSubmitComment}>
                <div className="comment-form-row">
                  <div className="comment-form-group">
                    <label htmlFor="commentAuthor">Il tuo nome</label>
                    <input
                      id="commentAuthor"
                      type="text"
                      placeholder="Facoltativo"
                      value={commentAuthor}
                      onChange={(e) => setCommentAuthor(e.target.value)}
                    />
                  </div>
                </div>
                <div className="comment-form-group">
                  <label htmlFor="commentText">Il tuo commento</label>
                  <textarea
                    id="commentText"
                    rows="3"
                    placeholder="Scrivi cosa pensi di questo libro..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                </div>
                <div className="comment-form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submittingComment || !commentText.trim()}
                  >
                    {submittingComment ? 'Invio in corso…' : 'Aggiungi commento'}
                  </button>
                </div>
              </form>

              {commentsLoading && (
                <p className="comments-status">Caricamento dei commenti...</p>
              )}
              {commentsError && !commentsLoading && (
                <p className="comments-error">Errore: {commentsError}</p>
              )}

              {!commentsLoading && !commentsError && (
                <div className="comments-list">
                  {comments.length === 0 ? (
                    <p className="comments-empty">
                      Non ci sono ancora commenti. Condividi per primo la tua opinione!
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="comment-card">
                        <div className="comment-header">
                          <span className="comment-author">
                            {comment.author || 'Anonimo'}
                          </span>
                          {comment.created_at && (
                            <span className="comment-date">
                              {new Date(comment.created_at).toLocaleString('it-IT')}
                            </span>
                          )}
                        </div>
                        <p className="comment-text">{comment.text}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookDetail

