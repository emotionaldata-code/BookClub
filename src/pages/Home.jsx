import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import BookCard from '../components/BookCard'
import SearchBar from '../components/SearchBar'
import GenreFilter from '../components/GenreFilter'
import { filterBooks, getFilterOptions } from '../lib/bookFilters'
import './Home.css'

function Home() {
  const [books, setBooks] = useState([])
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(() => window.matchMedia('(min-width: 769px)').matches)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retry, setRetry] = useState(0)

  const query = params.get('q') ?? ''
  const selectedGenres = [...new Set(params.getAll('genre'))]
  const ratingValue = params.get('rating') ?? ''
  const rating = ['unrated', ...Array.from({ length: 10 }, (_, i) => String((i + 1) / 2))].includes(ratingValue) ? ratingValue : ''
  const author = params.get('author') ?? ''
  const writer = params.get('writer') ?? ''
  const sortValue = params.get('sort') ?? 'title'
  const sort = ['title', 'title-desc', 'rating-desc', 'rating-asc'].includes(sortValue) ? sortValue : 'title'
  const specificFilterCount = selectedGenres.length + Number(Boolean(rating)) + Number(Boolean(author)) + Number(Boolean(writer))
  const hasFilters = Boolean(query.trim()) || specificFilterCount > 0

  useEffect(() => {
    const controller = new AbortController()
    async function fetchBooks() {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch('/api/books?optimized=true', { signal: controller.signal })
        if (!response.ok) throw new Error('Impossibile caricare i libri.')
        setBooks(await response.json())
      } catch (err) {
        if (err.name !== 'AbortError') setError('Impossibile caricare i libri. Riprova tra poco.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    fetchBooks()
    return () => controller.abort()
  }, [retry])

  const options = useMemo(() => ({
    genres: getFilterOptions(books, 'genres'),
    authors: getFilterOptions(books, 'author'),
    writers: getFilterOptions(books, 'writer'),
  }), [books])
  const filteredBooks = useMemo(() => filterBooks(books, {
    query, genres: selectedGenres, rating, author, writer, sort,
  }), [books, params])

  function updateFilter(key, value) {
    setParams(previous => {
      const next = new URLSearchParams(previous)
      next.delete(key)
      for (const item of Array.isArray(value) ? value : [value]) {
        if (item) next.append(key, item)
      }
      return next
    }, { replace: true })
  }

  function clearFilters() {
    setParams(previous => {
      const next = new URLSearchParams(previous)
      for (const key of ['q', 'genre', 'rating', 'author', 'writer']) next.delete(key)
      return next
    }, { replace: true })
  }

  const activeFilters = [
    ...(query.trim() ? [{ key: 'q', label: `Ricerca: ${query}`, remove: () => updateFilter('q', '') }] : []),
    ...selectedGenres.map(genre => ({ key: `genre-${genre}`, label: genre, remove: () => updateFilter('genre', selectedGenres.filter(value => value !== genre)) })),
    ...(rating ? [{ key: 'rating', label: rating === 'unrated' ? 'Senza valutazione' : `Da ${Number(rating).toLocaleString('it-IT')} ${Number(rating) === 1 ? 'stella' : 'stelle'}`, remove: () => updateFilter('rating', '') }] : []),
    ...(author ? [{ key: 'author', label: `Autore: ${author}`, remove: () => updateFilter('author', '') }] : []),
    ...(writer ? [{ key: 'writer', label: `Aggiunto da: ${writer}`, remove: () => updateFilter('writer', '') }] : []),
  ]

  return (
    <div className="container">
      <div className="home">
        <h1 className="page-title">Scopri i libri</h1>
        <section className="catalogue-filters" aria-label="Ricerca e filtri">
          <div className="catalogue-search-row">
            <div className="catalogue-search-field">
              <label htmlFor="book-search">Cerca nella libreria</label>
              <SearchBar id="book-search" value={query} onChange={value => updateFilter('q', value)} placeholder="Titolo, descrizione o autore…" />
            </div>
            <button className="filters-toggle" type="button" aria-expanded={filtersOpen} aria-controls="catalogue-filter-fields" onClick={() => setFiltersOpen(open => !open)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 7h16M4 17h16M8 4v6M16 14v6" /></svg>
              Filtri{specificFilterCount > 0 ? ` (${specificFilterCount})` : ''}
              <span aria-hidden="true">{filtersOpen ? '−' : '+'}</span>
            </button>
          </div>

          <div id="catalogue-filter-fields" className="catalogue-filter-fields" hidden={!filtersOpen}>
            <GenreFilter genres={options.genres} selectedGenres={selectedGenres} onChange={value => updateFilter('genre', value)} />
            <div className="catalogue-field">
              <label htmlFor="rating-filter">Valutazione</label>
              <select id="rating-filter" value={rating} onChange={event => updateFilter('rating', event.target.value)}>
                <option value="">Tutte le valutazioni</option>
                {[5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5].map(value => <option key={value} value={value}>{value === 5 ? '5 stelle' : `Da ${value.toLocaleString('it-IT')} ${value === 1 ? 'stella' : 'stelle'} in su`}</option>)}
                <option value="unrated">Senza valutazione</option>
              </select>
            </div>
            <div className="catalogue-field">
              <label htmlFor="author-filter">Autore</label>
              <select id="author-filter" value={author} onChange={event => updateFilter('author', event.target.value)}>
                <option value="">Tutti gli autori</option>
                {options.authors.map(value => <option key={value} value={value}>{value}</option>)}
                {author && !options.authors.includes(author) && <option value={author}>{author}</option>}
              </select>
            </div>
            <div className="catalogue-field">
              <label htmlFor="writer-filter">Aggiunto da</label>
              <select id="writer-filter" value={writer} onChange={event => updateFilter('writer', event.target.value)}>
                <option value="">Tutte le persone</option>
                {options.writers.map(value => <option key={value} value={value}>{value}</option>)}
                {writer && !options.writers.includes(writer) && <option value={writer}>{writer}</option>}
              </select>
            </div>
            {!loading && !error && <button className="mobile-show-results" type="button" onClick={() => setFiltersOpen(false)}>Mostra {filteredBooks.length} {filteredBooks.length === 1 ? 'libro' : 'libri'}</button>}
          </div>

          {hasFilters && (
            <div className="active-filters" aria-label="Filtri attivi">
              {activeFilters.map(filter => <button key={filter.key} className="active-filter" type="button" onClick={filter.remove} aria-label={`Rimuovi filtro ${filter.label}`}><span>{filter.label}</span><span aria-hidden="true">×</span></button>)}
              <button className="clear-filters-btn" type="button" onClick={clearFilters}>Azzera filtri</button>
            </div>
          )}
        </section>

        <div className="catalogue-results-toolbar">
          <p className="results-count" role="status" aria-atomic="true">
            {loading ? 'Caricamento dei libri…' : error ? 'Libreria non disponibile' : <><strong>{filteredBooks.length}</strong> {filteredBooks.length === 1 ? 'libro' : 'libri'}{hasFilters ? ` su ${books.length}` : ' nella libreria'}</>}
          </p>
          <div className="catalogue-sort catalogue-field">
            <label htmlFor="sort-books">Ordina per</label>
            <select id="sort-books" value={sort} onChange={event => updateFilter('sort', event.target.value)}>
              <option value="title">Titolo: A–Z</option>
              <option value="title-desc">Titolo: Z–A</option>
              <option value="rating-desc">Stelle: più alte</option>
              <option value="rating-asc">Stelle: più basse</option>
            </select>
          </div>
        </div>

        {error ? <div className="catalogue-empty" role="alert"><h2>La libreria non è disponibile</h2><p>{error}</p><button className="catalogue-retry" type="button" onClick={() => setRetry(value => value + 1)}>Riprova</button></div> : !loading && (
          filteredBooks.length ? <div className="books-grid">{filteredBooks.map(book => <BookCard key={book.id} book={book} />)}</div> :
          <div className="catalogue-empty"><h2>{books.length ? 'Nessun libro trovato' : 'La libreria è ancora vuota'}</h2><p>{books.length ? 'Prova un’altra ricerca o rimuovi qualche filtro.' : 'Seleziona “+ Aggiungi libro” per aggiungere il primo.'}</p>{hasFilters && <button className="clear-filters-btn" type="button" onClick={clearFilters}>Rimuovi tutti i filtri</button>}</div>
        )}
      </div>
    </div>
  )
}

export default Home
