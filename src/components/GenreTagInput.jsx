import { useState, useRef, useEffect } from 'react'
import './GenreTagInput.css'

function GenreTagInput({ genres, onChange }) {
  const [inputValue, setInputValue] = useState('')
  const [allGenres, setAllGenres] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
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
        const data = await response.json()
        setAllGenres(data)
      }
    } catch (error) {
      console.error('Error fetching genres:', error)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace' && !inputValue && genres.length > 0) {
      // Remove last genre on backspace if input is empty
      removeGenre(genres.length - 1)
    } else if (e.key === 'Enter' && filteredSuggestions.length > 0) {
      e.preventDefault()
      addGenre(filteredSuggestions[0])
    }
  }

  const addGenre = (genre) => {
    if (genre && !genres.includes(genre)) {
      onChange([...genres, genre])
      setInputValue('')
      setShowSuggestions(false)
    }
  }

  const removeGenre = (index) => {
    const newGenres = genres.filter((_, i) => i !== index)
    onChange(newGenres)
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text')
    const newGenres = pastedText
      .split(/[\s,;]+/)
      .map(g => g.trim())
      .filter(g => g && !genres.includes(g))
    
    if (newGenres.length > 0) {
      onChange([...genres, ...newGenres])
    }
  }

  const handleInputChange = (value) => {
    // Detect double-space style endings from value changes so it works on mobile too.
    // Many mobile keyboards convert double-space to ". " automatically, so we treat
    // both "  " and ". " at the end as a signal to add the genre.
    let newGenre = null

    if (value.endsWith('  ')) {
      newGenre = value.trim()
    } else if (value.endsWith('. ')) {
      newGenre = value.slice(0, -2).trim() // remove the auto-inserted ". "
    }

    if (newGenre) {
      if (newGenre) {
        addGenre(newGenre)
      }
      return
    }

    setInputValue(value)
    setShowSuggestions(value.trim().length > 0)
  }

  // Filter suggestions based on input
  const filteredSuggestions = allGenres.filter(
    genre =>
      genre.toLowerCase().includes(inputValue.toLowerCase().trim()) &&
      !genres.includes(genre) &&
      inputValue.trim().length > 0
  )

  return (
    <div className="genre-tag-input">
      <div className="genre-tags-container-wrapper">
        <div
          className="genre-tags-container"
          onClick={() => {
            if (inputRef.current) {
              inputRef.current.focus()
            }
          }}
        >
          {genres.map((genre, index) => (
            <span key={index} className="genre-tag-item">
              {genre}
              <button
                type="button"
                className="genre-tag-remove"
                onClick={() => removeGenre(index)}
                aria-label={`Remove ${genre}`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={() => inputValue.trim() && setShowSuggestions(true)}
            placeholder={genres.length === 0 ? "Type genre and press space twice..." : ""}
            className="genre-tag-input-field"
          />
        </div>

        {/* Autocomplete suggestions */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div ref={suggestionsRef} className="genre-tag-suggestions">
            {filteredSuggestions.slice(0, 5).map((genre) => (
              <button
                key={genre}
                type="button"
                className="genre-tag-suggestion-item"
                onClick={() => addGenre(genre)}
              >
                <span className="genre-tag-suggestion-icon">🏷️</span>
                {genre}
                <span className="genre-tag-suggestion-hint">existing</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="genre-tag-hint">
        Type a genre and press Space twice to add it • Suggestions show existing genres
      </p>
    </div>
  )
}

export default GenreTagInput

