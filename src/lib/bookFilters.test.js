import test from 'node:test'
import assert from 'node:assert/strict'
import { filterBooks, getFilterOptions } from './bookFilters.js'

const books = [
  { id: 'a', title: 'Città invisibili', description: 'Un viaggio nella memoria', author: 'Italo Calvino', writer: 'Aurora', rating: 4.5, genres: ['Narrativa', 'Viaggio'] },
  { id: 'b', title: 'La memoria', description: 'Una città sul mare', author: 'Anna', writer: 'Francesco', rating: 3, genres: ['Narrativa'] },
  { id: 'c', title: 'Zoologia', description: null, author: null, writer: null, rating: null, genres: [] },
  { id: 'd', title: 'Alberi', description: '', rating: 0, genres: ['Saggio'] },
  { id: 'e', title: 'Borgo', description: 'Una storia', rating: 0.5, genres: ['Narrativa'] },
]
const ids = filters => filterBooks(books, filters).map(book => book.id)

test('search finds description-only matches and terms split between title and description', () => {
  assert.deepEqual(ids({ query: 'viaggio' }), ['a'])
  assert.deepEqual(ids({ query: 'invisibili memoria' }), ['a'])
  assert.deepEqual(ids({ query: 'invisibili assente' }), [])
})

test('search ignores accents, case and excess whitespace, and preserves author/contributor search', () => {
  assert.deepEqual(ids({ query: '  CITTA   INVISIBILI ' }), ['a'])
  assert.deepEqual(ids({ query: 'CALVINO' }), ['a'])
  assert.deepEqual(ids({ query: 'francesco' }), ['b'])
})

test('specific filters combine with search and all selected genres', () => {
  assert.deepEqual(ids({ query: 'memoria', genres: ['Narrativa', 'Viaggio'], rating: '4.5', author: 'Italo Calvino', writer: 'Aurora' }), ['a'])
  assert.deepEqual(ids({ genres: ['Narrativa', 'Viaggio'], writer: 'Francesco' }), [])
  assert.deepEqual(ids({ genres: ['Narrativa'], rating: '3' }), ['a', 'b'])
})

test('minimum ratings include half stars, exclude missing ratings, and support unrated books', () => {
  assert.deepEqual(ids({ rating: '4.5' }), ['a'])
  assert.deepEqual(ids({ rating: '5' }), [])
  assert.deepEqual(ids({ rating: '0.5' }), ['e', 'a', 'b'])
  assert.deepEqual(ids({ rating: 'unrated' }), ['d', 'c'])
})

test('sorting keeps unrated books last in both directions without mutating the catalogue', () => {
  const before = structuredClone(books)
  assert.deepEqual(ids({ sort: 'rating-desc' }), ['a', 'b', 'e', 'd', 'c'])
  assert.deepEqual(ids({ sort: 'rating-asc' }), ['e', 'b', 'a', 'd', 'c'])
  assert.deepEqual(ids({ sort: 'title-desc' }), ['c', 'b', 'a', 'e', 'd'])
  assert.deepEqual(books, before)
})

test('options use actual data, deduplicate and handle empty/missing fields', () => {
  assert.deepEqual(getFilterOptions(books, 'genres'), ['Narrativa', 'Saggio', 'Viaggio'])
  assert.deepEqual(getFilterOptions(books, 'author'), ['Anna', 'Italo Calvino'])
  assert.deepEqual(filterBooks([]), [])
  assert.equal(filterBooks(books).length, books.length)
})
