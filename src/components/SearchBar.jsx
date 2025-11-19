import { useRef } from 'react'
import './SearchBar.css'

function SearchBar({ value, onChange, placeholder = "Search books..." }) {
  const inputRef = useRef(null)

  // Handle input change with proper null/undefined checks
  const handleChange = (e) => {
    const newValue = e.target.value || ''
    onChange(newValue)
  }

  // Handle clear with proper cleanup
  const handleClear = () => {
    onChange('')
    // Focus input after clearing for better UX
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  // Ensure value is always a string
  const safeValue = value ?? ''

  return (
    <div className="search-bar">
      <svg 
        className="search-icon" 
        width="20" 
        height="20" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.35-4.35"></path>
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={safeValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="search-input"
        aria-label="Search"
      />
      {safeValue && (
        <button 
          className="search-clear" 
          onClick={handleClear}
          aria-label="Clear search"
          type="button"
        >
          ×
        </button>
      )}
    </div>
  )
}

export default SearchBar

