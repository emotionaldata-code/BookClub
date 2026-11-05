import { useState, useEffect, useRef } from 'react'
import './GenreFilter.css'

function GenreFilter({ selectedGenres, onChange }) {
  const [allGenres, setAllGenres] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(true)
  const inputRef = useRef(null)
  const suggestionsRef = useRef(null)

  useEffect(() => {
    fetchGenres()
  }, [])

  useEffect(() => {
    // Close suggestions when clicking outside
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchGenres = async () => {
    try {
      const response = await fetch('/api/genres')
      if (response.ok) {
        const genres = await response.json()
        setAllGenres(genres)
      }
    } catch (error) {
      console.error('Error fetching genres:', error)
    } finally {
      setLoading(false)
    }
  }

  const addGenre = (genre) => {
    if (!selectedGenres.includes(genre)) {
      onChange([...selectedGenres, genre])
    }
    setSearchQuery('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const removeGenre = (genre) => {
    onChange(selectedGenres.filter(g => g !== genre))
  }

  const clearAll = () => {
    onChange([])
  }

  const handleInputChange = (value) => {
    setSearchQuery(value)
    setShowSuggestions(value.trim().length > 0)
  }

  const handleInputFocus = () => {
    if (searchQuery.trim().length > 0) {
      setShowSuggestions(true)
    }
  }

  // Filter genres based on search query
  const filteredGenres = allGenres.filter(
    genre =>
      genre.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !selectedGenres.includes(genre)
  )

  if (loading) {
    return <div className="genre-filter-loading">Caricamento dei generi...</div>
  }

  if (allGenres.length === 0) {
    return null
  }

  return (
    <div className="genre-filter">
      <div className="genre-filter-header">
        <h3 className="genre-filter-title">Filtra per genere</h3>
        {selectedGenres.length > 0 && (
          <button
            className="genre-filter-clear"
            onClick={clearAll}
          >
            Rimuovi tutti ({selectedGenres.length})
          </button>
        )}
      </div>

      {/* Selected genres */}
      {selectedGenres.length > 0 && (
        <div className="genre-filter-selected">
          {selectedGenres.map((genre) => (
            <span key={genre} className="genre-filter-selected-tag">
              {genre}
              <button
                type="button"
                className="genre-filter-remove"
                onClick={() => removeGenre(genre)}
                aria-label={`Rimuovi ${genre}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="genre-filter-search-container">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleInputFocus}
          aria-label="Filtra i libri per genere"
          placeholder="Cerca un genere da aggiungere..."
          className="genre-filter-search-input"
        />

        {/* Suggestions dropdown */}
        {showSuggestions && filteredGenres.length > 0 && (
          <div ref={suggestionsRef} className="genre-filter-suggestions">
            {filteredGenres.slice(0, 10).map((genre) => (
              <button
                key={genre}
                type="button"
                className="genre-filter-suggestion-item"
                onClick={() => addGenre(genre)}
              >
                {genre}
              </button>
            ))}
            {filteredGenres.length > 10 && (
              <div className="genre-filter-suggestion-more">
                +{filteredGenres.length - 10} altri...
              </div>
            )}
          </div>
        )}

        {showSuggestions && searchQuery.trim() && filteredGenres.length === 0 && (
          <div ref={suggestionsRef} className="genre-filter-suggestions">
            <div className="genre-filter-suggestion-empty">
              Nessun genere trovato per "{searchQuery}"
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default GenreFilter

