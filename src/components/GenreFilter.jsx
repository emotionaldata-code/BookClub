import SelectMenu from './SelectMenu'
import './GenreFilter.css'

function GenreFilter({ genres, selectedGenres, onChange }) {
  return (
    <div className="catalogue-field">
      <label id="genre-filter-label" htmlFor="genre-filter">Genere</label>
      <SelectMenu id="genre-filter" label="Genere" value="" searchable
        onChange={value => { if (value) onChange([...selectedGenres, value]) }}
        describedBy={selectedGenres.length > 1 ? 'genre-filter-help' : undefined}
        options={[
          { value: '', label: selectedGenres.length ? 'Aggiungi un altro genere' : 'Tutti i generi' },
          ...genres.filter(genre => !selectedGenres.includes(genre)).map(value => ({ value, label: value })),
        ]} />
      {selectedGenres.length > 1 && <p id="genre-filter-help" className="filter-help">Con tutti i generi scelti.</p>}
    </div>
  )
}

export default GenreFilter
