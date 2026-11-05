import { Link, useLocation } from 'react-router-dom'
import './BookCard.css'

function BookCard({ book }) {
  const location = useLocation()
  return (
    <Link to={`/books/${book.id}`} state={{ librarySearch: location.search }} className="book-card">
      <div className="book-card-image">
        {book.cover ? (
          <img src={book.cover} alt={book.title} />
        ) : (
          <svg className="book-card-placeholder" viewBox="0 0 48 64" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="5" y="3" width="38" height="56" rx="4" /><path d="M12 3v56M19 18h16M19 26h12" /></svg>
        )}
      </div>
      <div className="book-card-content">
        <h3 className="book-card-title">{book.title}</h3>
        {book.author && (
          <p className="book-card-author">di {book.author}</p>
        )}
        {book.writer && (
          <p className="book-card-writer-meta">Aggiunto da {book.writer}</p>
        )}
        {book.rating != null && book.rating > 0 ? (
          <div className="book-card-rating" aria-label={`${Number(book.rating).toLocaleString('it-IT')} stelle su 5`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9Z" /></svg>
            <span>{Number(book.rating).toLocaleString('it-IT')}</span><span className="book-card-rating-max">/ 5</span>
          </div>
        ) : <p className="book-card-unrated">Da valutare</p>}
        {book.genres && book.genres.length > 0 && (
          <div className="book-card-genres">
            {book.genres.map((genre, index) => (
              <span key={index} className="genre-tag">{genre}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

export default BookCard

