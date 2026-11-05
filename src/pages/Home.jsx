import { useState, useEffect } from 'react'
import BookCard from '../components/BookCard'
import SearchBar from '../components/SearchBar'
import GenreFilter from '../components/GenreFilter'
import './Home.css'

function Home() {
  const [books, setBooks] = useState([])
  const [filteredBooks, setFilteredBooks] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGenres, setSelectedGenres] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch all books on mount (optimized version)
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
        book.title.toLowerCase().includes(query) ||
        (book.author && book.author.toLowerCase().includes(query)) ||
        (book.writer && book.writer.toLowerCase().includes(query))
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
      const response = await fetch('/api/books?optimized=true')
      
      if (!response.ok) {
        throw new Error('Impossibile caricare i libri')
      }
      
      const data = await response.json()
      setBooks(data)
      setFilteredBooks(data)
    } catch (err) {
      console.error('Error fetching books:', err)
      setError(err instanceof TypeError ? 'Impossibile contattare il server. Riprova.' : err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="home">
          <p className="loading">Caricamento dei libri...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <div className="home">
          <p className="error">Errore: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="home">
        <h1 className="page-title">Scopri i libri</h1>
        
        <SearchBar 
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Cerca per titolo, autore o nome di chi ha aggiunto il libro..."
        />
        
        <GenreFilter 
          selectedGenres={selectedGenres}
          onChange={setSelectedGenres}
        />

        {selectedGenres.length > 0 && (
          <div className="active-filters">
            <span className="active-filters-text">
              Libri con i generi: {selectedGenres.join(' + ')}
            </span>
            <span className="active-filters-count">
              ({filteredBooks.length} {filteredBooks.length === 1 ? 'libro' : 'libri'})
            </span>
          </div>
        )}
        
        <div className="books-grid">
          {filteredBooks.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
        
        {books.length === 0 && (
          <p className="no-books">Nessun libro presente. Seleziona "+ Aggiungi libro" per aggiungere il primo!</p>
        )}
        {books.length > 0 && filteredBooks.length === 0 && (
          <p className="no-books">
            Nessun libro corrisponde ai filtri.
            {(searchQuery || selectedGenres.length > 0) && (
              <button 
                className="clear-filters-btn"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedGenres([])
                }}
              >
                Rimuovi tutti i filtri
              </button>
            )}
          </p>
        )}
      </div>
    </div>
  )
}

export default Home

