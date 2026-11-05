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
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleGenresChange = (newGenres) => {
    setFormData(prev => ({ ...prev, genres: newGenres }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Seleziona un file immagine')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('L’immagine deve essere inferiore a 5 MB')
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
      setError('Il titolo è obbligatorio')
      return
    }

    setLoading(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('title', formData.title.trim())
      formDataToSend.append('description', formData.description.trim())
      formDataToSend.append('genres', JSON.stringify(formData.genres))
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
        throw new Error(errorData.error || 'Impossibile aggiungere il libro')
      }

      const newBook = await response.json()
      setSuccess(true)
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        genres: [],
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
      setError(err instanceof TypeError ? 'Impossibile contattare il server. Riprova.' : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="upload-book">
        <h1 className="page-title">Aggiungi un libro</h1>
        
        {success && (
          <div className="alert alert-success">
            Libro aggiunto! Apertura della scheda...
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
              Copertina
            </label>
            <div className="cover-upload">
              {coverPreview ? (
                <div className="cover-preview">
                  <img src={coverPreview} alt="Anteprima della copertina" />
                  <button
                    type="button"
                    onClick={() => {
                      setCoverFile(null)
                      setCoverPreview(null)
                    }}
                    className="cover-remove"
                  >
                    Rimuovi
                  </button>
                </div>
              ) : (
                <label htmlFor="cover" className="cover-upload-label">
                  <div className="cover-upload-placeholder">
                    <span className="cover-upload-icon">📷</span>
                    <span className="cover-upload-text">
                      Seleziona una copertina
                    </span>
                    <span className="cover-upload-hint">
                      PNG, JPG, WEBP (massimo 5 MB)
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
              Titolo <span className="required">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Inserisci il titolo..."
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="author" className="form-label">
              Autore del libro
            </label>
            <input
              type="text"
              id="author"
              name="author"
              value={formData.author}
              onChange={handleInputChange}
              placeholder="Inserisci l’autore..."
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="writer" className="form-label">
              Aggiunto da
            </label>
            <input
              type="text"
              id="writer"
              name="writer"
              value={formData.writer}
              onChange={handleInputChange}
              placeholder="Inserisci il tuo nome..."
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Descrizione
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Inserisci la descrizione..."
              className="form-textarea"
              rows="5"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Generi
            </label>
            <GenreTagInput
              genres={formData.genres}
              onChange={handleGenresChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Valutazione
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
                aria-label="Valutazione del libro"
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
                  ? `${formData.rating.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / 5`
                  : 'Nessuna valutazione'}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn btn-secondary"
              disabled={loading}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Aggiunta in corso...' : 'Aggiungi libro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UploadBook

