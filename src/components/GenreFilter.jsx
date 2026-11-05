import './GenreFilter.css'

function GenreFilter({ genres, selectedGenres, onChange }) {
  return (
    <div className="catalogue-field">
      <label htmlFor="genre-filter">Genere</label>
      <select
        id="genre-filter"
        value=""
        onChange={event => {
          if (event.target.value) onChange([...selectedGenres, event.target.value])
        }}
        aria-describedby={selectedGenres.length > 1 ? 'genre-filter-help' : undefined}
      >
        <option value="">{selectedGenres.length ? 'Aggiungi un altro genere' : 'Tutti i generi'}</option>
        {genres.filter(genre => !selectedGenres.includes(genre)).map(genre => (
          <option key={genre} value={genre}>{genre}</option>
        ))}
      </select>
      {selectedGenres.length > 1 && <p id="genre-filter-help" className="filter-help">Con tutti i generi scelti.</p>}
    </div>
  )
}

export default GenreFilter
