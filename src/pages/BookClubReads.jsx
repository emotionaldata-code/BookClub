import { useState, useEffect } from 'react'
import BookCard from '../components/BookCard'
import SearchBar from '../components/SearchBar'
import GenreFilter from '../components/GenreFilter'
import './Home.css'

function BookClubReads() {
  const [books, setBooks] = useState([])
  const [filteredBooks, setFilteredBooks] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGenres, setSelectedGenres] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch all BookClub books on mount (optimized version)
  useEffect(() => {
    fetchBooks()
  }, [])

  // Filter books when search query or selected genres change
  useEffect(() => {
    let filtered = books

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(query)
      )
    }

    // Filter by selected genres (book must have ALL selected genres)
    if (selectedGenres.length > 0) {
      filtered = filtered.filter(book =>
        selectedGenres.every(selectedGenre =>
          book.genres.includes(selectedGenre)
        )
      )
    }

    setFilteredBooks(filtered)
  }, [searchQuery, selectedGenres, books])

  const fetchBooks = async () => {
    try {
      setLoading(true)
      setError(null)
      // Use optimized endpoint (excludes description, includes cover)
      // and restrict to BookClub picks only
      const response = await fetch('/api/books?optimized=true&is_bookclub=true')

      if (!response.ok) {
        throw new Error('Failed to fetch BookClub reads')
      }

      const data = await response.json()
      setBooks(data)
      setFilteredBooks(data)
    } catch (err) {
      console.error('Error fetching BookClub books:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="home">
          <p className="loading">Loading BookClub reads...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <div className="home">
          <p className="error">Error: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="home">
        <h2 className="page-title">BookClub Reads</h2>

        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search BookClub reads by title..."
        />

        <GenreFilter
          selectedGenres={selectedGenres}
          onChange={setSelectedGenres}
        />

        {selectedGenres.length > 0 && (
          <div className="active-filters">
            <span className="active-filters-text">
              Showing BookClub reads with: {selectedGenres.join(' + ')}
            </span>
            <span className="active-filters-count">
              ({filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'})
            </span>
          </div>
        )}

        <div className="books-grid">
          {filteredBooks.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>

        {books.length === 0 && (
          <p className="no-books">
            No BookClub reads found yet. Mark a book as a BookClub read when adding it!
          </p>
        )}
        {books.length > 0 && filteredBooks.length === 0 && (
          <p className="no-books">
            No BookClub reads match your filters.
            {(searchQuery || selectedGenres.length > 0) && (
              <button
                className="clear-filters-btn"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedGenres([])
                }}
              >
                Clear all filters
              </button>
            )}
          </p>
        )}
      </div>
    </div>
  )
}

export default BookClubReads


