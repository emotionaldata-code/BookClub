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

