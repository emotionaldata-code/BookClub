import { Link } from 'react-router-dom'
import './BookCard.css'

function BookCard({ book }) {
  return (
    <Link to={`/books/${book.id}`} className="book-card">
      <div className="book-card-image">
        {book.cover ? (
          <img src={book.cover} alt={book.title} />
        ) : (
          <div className="book-card-placeholder">📖</div>
        )}
      </div>
      <div className="book-card-content">
        <h3 className="book-card-title">{book.title}</h3>
        {book.author && (
          <p className="book-card-author">by {book.author}</p>
        )}
        {book.writer && (
          <p className="book-card-writer-meta">Added by {book.writer}</p>
        )}
        {book.rating != null && book.rating > 0 && (
          <div className="book-card-rating">
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
          </div>
        )}
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

