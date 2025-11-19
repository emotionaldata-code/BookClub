import { useEffect, useState } from 'react'
import './SecretAdmin.css'

function SecretAdmin() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const fetchBooks = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/books')
      if (!res.ok) {
        throw new Error('Failed to load books')
      }
      const data = await res.json()
      setBooks(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBooks()
  }, [])

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete book "${id}"? This cannot be undone.`)) return

    try {
      setDeletingId(id)
      const res = await fetch(`/api/books/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })

      if (!res.ok && res.status !== 204) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || 'Failed to delete book')
      }

      setBooks(prev => prev.filter(b => b.id !== id))
    } catch (e) {
      alert(e.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="container">
      <div className="secret-admin">
        <h2 className="page-title">Secret Admin · Database View</h2>
        <p className="secret-admin-note">
          This page is not protected. Do not expose it publicly.
        </p>

        {loading && <p>Loading books...</p>}
        {error && <p className="secret-admin-error">Error: {error}</p>}

        {!loading && !error && (
          <>
            <div className="secret-admin-summary">
              <span>Total books: {books.length}</span>
            </div>

            <div className="secret-admin-table-wrapper">
              <table className="secret-admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Genres</th>
                    <th>Description length</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {books.map((book) => (
                    <tr key={book.id}>
                      <td className="secret-admin-id">{book.id}</td>
                      <td>{book.title}</td>
                      <td>{(book.genres || []).join(', ')}</td>
                      <td>{book.description ? book.description.length : 0}</td>
                      <td>
                        <button
                          type="button"
                          className="secret-admin-delete"
                          onClick={() => handleDelete(book.id)}
                          disabled={deletingId === book.id}
                        >
                          {deletingId === book.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {books.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '1rem' }}>
                        No books in database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default SecretAdmin


