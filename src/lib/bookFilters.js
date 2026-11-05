const collator = new Intl.Collator('it', { sensitivity: 'base', numeric: true })

export function normalizeSearch(value) {
  return (value ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('it').trim()
}

export function getFilterOptions(books, field) {
  return [...new Set(books.flatMap(book => book[field] ?? []).filter(Boolean))]
    .sort(collator.compare)
}

export function filterBooks(books, { query = '', genres = [], rating = '', author = '', writer = '', sort = 'title' } = {}) {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean)
  const filtered = books.filter(book => {
    const searchable = normalizeSearch([book.title, book.description, book.author, book.writer].filter(Boolean).join(' '))
    const hasRating = book.rating != null && Number(book.rating) > 0

    return terms.every(term => searchable.includes(term)) &&
      genres.every(genre => (book.genres ?? []).includes(genre)) &&
      (rating === '' || (rating === 'unrated' ? !hasRating : hasRating && Number(book.rating) >= Number(rating))) &&
      (!author || book.author === author) &&
      (!writer || book.writer === writer)
  })

  return filtered.sort((a, b) => {
    if (sort === 'rating-desc' || sort === 'rating-asc') {
      // Unrated books always follow rated books, in either direction.
      const aRated = a.rating != null && Number(a.rating) > 0
      const bRated = b.rating != null && Number(b.rating) > 0
      if (aRated !== bRated) return aRated ? -1 : 1
      const difference = Number(a.rating) - Number(b.rating)
      if (difference) return sort === 'rating-desc' ? -difference : difference
    }
    return sort === 'title-desc' ? collator.compare(b.title, a.title) : collator.compare(a.title, b.title)
  })
}
