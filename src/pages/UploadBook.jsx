import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GenreTagInput from '../components/GenreTagInput'
import './UploadBook.css'

function UploadBook() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    genres: [],
    is_bookclub: false,
    writer: '',
    author: '',
    rating: 0,
  })
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleGenresChange = (newGenres) => {
    setFormData(prev => ({ ...prev, genres: newGenres }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB')
        return
      }
      
      setCoverFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoverPreview(reader.result)
      }
      reader.readAsDataURL(file)
      setError(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }

    setLoading(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('title', formData.title.trim())
      formDataToSend.append('description', formData.description.trim())
      formDataToSend.append('genres', JSON.stringify(formData.genres))
      formDataToSend.append('is_bookclub', formData.is_bookclub ? 'true' : 'false')
      formDataToSend.append('writer', formData.writer.trim())
      formDataToSend.append('author', formData.author.trim())
      // Send empty string for rating when 0 so backend treats it as null
      formDataToSend.append(
        'rating',
        formData.rating > 0 ? String(formData.rating) : ''
      )
      
      if (coverFile) {
        formDataToSend.append('cover', coverFile)
      }

      const response = await fetch('/api/books', {
        method: 'POST',
        body: formDataToSend
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create book')
      }

      const newBook = await response.json()
      setSuccess(true)
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        genres: [],
        is_bookclub: false,
        writer: '',
        author: '',
        rating: 0,
      })
      setCoverFile(null)
      setCoverPreview(null)
      
      // Redirect to book detail after 2 seconds
      setTimeout(() => {
        navigate(`/books/${newBook.id}`)
      }, 2000)
    } catch (err) {
      console.error('Error creating book:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="upload-book">
        <h2 className="page-title">Add New Book</h2>
        
        {success && (
          <div className="alert alert-success">
            ✓ Book added successfully! Redirecting...
          </div>
        )}
        
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="upload-form">
          <div className="form-group">
            <label htmlFor="cover" className="form-label">
              Book Cover
            </label>
            <div className="cover-upload">
              {coverPreview ? (
                <div className="cover-preview">
                  <img src={coverPreview} alt="Cover preview" />
                  <button
                    type="button"
                    onClick={() => {
                      setCoverFile(null)
                      setCoverPreview(null)
                    }}
                    className="cover-remove"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label htmlFor="cover" className="cover-upload-label">
                  <div className="cover-upload-placeholder">
                    <span className="cover-upload-icon">📷</span>
                    <span className="cover-upload-text">
                      Click to upload cover image
                    </span>
                    <span className="cover-upload-hint">
                      PNG, JPG, WEBP (max 5MB)
                    </span>
                  </div>
                </label>
              )}
              <input
                type="file"
                id="cover"
                accept="image/*"
                onChange={handleFileChange}
                className="cover-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="title" className="form-label">
              Title <span className="required">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter book title..."
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="author" className="form-label">
              Author (of the book)
            </label>
            <input
              type="text"
              id="author"
              name="author"
              value={formData.author}
              onChange={handleInputChange}
              placeholder="Enter book author..."
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="writer" className="form-label">
              Writer (who added this book / description)
            </label>
            <input
              type="text"
              id="writer"
              name="writer"
              value={formData.writer}
              onChange={handleInputChange}
              placeholder="Enter your name..."
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter book description..."
              className="form-textarea"
              rows="5"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Genres
            </label>
            <GenreTagInput
              genres={formData.genres}
              onChange={handleGenresChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Rating
            </label>
            <div className="rating-input">
              <div className="rating-stars">
                {[1, 2, 3, 4, 5].map((star) => {
                  let variant = 'empty'
                  if (formData.rating >= star) {
                    variant = 'full'
                  } else if (formData.rating >= star - 0.5) {
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
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={formData.rating}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    rating: parseFloat(e.target.value),
                  }))
                }
                className="rating-slider"
              />
              <div className="rating-value">
                {formData.rating > 0
                  ? `${formData.rating.toFixed(1)} / 5`
                  : 'No rating'}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="is_bookclub" className="form-label">
              BookClub Read
            </label>
            <div className="checkbox-row">
              <input
                type="checkbox"
                id="is_bookclub"
                name="is_bookclub"
                checked={formData.is_bookclub}
                onChange={handleInputChange}
              />
              <span className="checkbox-label">
                Mark this book as a BookClub read (it will appear on the BookClub Reads page)
              </span>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Adding Book...' : 'Add Book'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UploadBook

