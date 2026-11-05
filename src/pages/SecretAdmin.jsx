import { useEffect, useState } from 'react'
import './SecretAdmin.css'

const errorMessage = error => error instanceof TypeError
  ? 'Impossibile contattare il server. Riprova.'
  : error.message

function SecretAdmin() {
  const [authenticated, setAuthenticated] = useState(null)
  const [username, setUsername] = useState('')
  const [loginName, setLoginName] = useState('')
  const [password, setPassword] = useState('')
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [sessionCheck, setSessionCheck] = useState(0)
  const [refresh, setRefresh] = useState(0)

  const clearSession = (message = '') => {
    setAuthenticated(false)
    setUsername('')
    setPassword('')
    setBooks([])
    setError(message)
    setNotice('')
  }

  useEffect(() => {
    const controller = new AbortController()
    setAuthenticated(null)
    setError('')

    const checkSession = async () => {
      try {
        const res = await fetch('/api/admin/session', {
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Impossibile verificare la sessione. Riprova.')
        const session = await res.json()
        setAuthenticated(session.authenticated === true)
        setUsername(session.username || '')
      } catch (e) {
        if (e.name !== 'AbortError') {
          setAuthenticated(false)
          setError(errorMessage(e))
        }
      }
    }

    checkSession()
    return () => controller.abort()
  }, [sessionCheck])

  useEffect(() => {
    if (!authenticated) return
    const controller = new AbortController()

    const fetchBooks = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/api/books', {
          credentials: 'same-origin',
          signal: controller.signal,
        })
        if (res.status === 401) {
          clearSession('La sessione è scaduta. Accedi di nuovo.')
          return
        }
        if (!res.ok) throw new Error('Impossibile caricare i libri. Riprova.')
        const data = await res.json()
        setBooks(data)
      } catch (e) {
        if (e.name !== 'AbortError') setError(errorMessage(e))
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    fetchBooks()
    return () => controller.abort()
  }, [authenticated, refresh])

  const handleLogin = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginName.trim(), password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.authenticated !== true) {
        throw new Error(data.error || 'Accesso non riuscito. Controlla le credenziali e riprova.')
      }
      setPassword('')
      setUsername(data.username || loginName.trim())
      setAuthenticated(true)
    } catch (e) {
      setPassword('')
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const handleLogout = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'same-origin',
      })
      if (!res.ok && res.status !== 401) throw new Error('Impossibile uscire. Riprova.')
      clearSession()
      setNotice('Hai effettuato la disconnessione.')
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (book) => {
    if (!authenticated || deletingId !== null || busy) return
    if (!window.confirm(`Eliminare il libro «${book.title}»? Verranno eliminati anche i relativi commenti. Questa operazione è irreversibile.`)) return

    setDeletingId(book.id)
    setError('')
    setNotice('')
    try {
      const res = await fetch(`/api/books/${encodeURIComponent(book.id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      if (res.status === 401) {
        clearSession('La sessione è scaduta. Accedi di nuovo.')
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Impossibile eliminare il libro. Riprova.')
      }
      setBooks(prev => prev.filter(b => b.id !== book.id))
      setNotice(`Il libro «${book.title}» è stato eliminato.`)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="container">
      <section className="secret-admin" aria-labelledby="admin-title">
        <div className="secret-admin-heading">
          <h1 id="admin-title" className="page-title">Amministrazione</h1>
          {authenticated && (
            <div className="secret-admin-account">
              <span>Accesso come <strong>{username}</strong></span>
              <button
                type="button"
                className="secret-admin-button secret-admin-secondary"
                onClick={handleLogout}
                disabled={busy || deletingId !== null}
              >
                {busy ? 'Uscita in corso…' : 'Esci'}
              </button>
            </div>
          )}
        </div>

        {error && <p className="secret-admin-error" role="alert">{error}</p>}
        <div role="status" aria-live="polite">
          {notice && <p className="secret-admin-notice">{notice}</p>}
          {authenticated === null && <p>Verifica della sessione…</p>}
          {authenticated && loading && <p>Caricamento dei libri…</p>}
        </div>

        {authenticated === false && (
          <form className="secret-admin-login" onSubmit={handleLogin} aria-labelledby="admin-login-title">
            <h2 id="admin-login-title">Accesso amministratore</h2>
            <p className="secret-admin-note">Accedi per gestire ed eliminare i libri.</p>
            <label htmlFor="admin-username">Nome utente</label>
            <input
              id="admin-username"
              name="username"
              type="text"
              autoComplete="username"
              value={loginName}
              onChange={event => setLoginName(event.target.value)}
              required
              maxLength={100}
              disabled={busy}
            />
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
              disabled={busy}
            />
            <button type="submit" className="secret-admin-button secret-admin-primary" disabled={busy}>
              {busy ? 'Accesso in corso…' : 'Accedi'}
            </button>
            {error && (
              <button type="button" className="secret-admin-retry" onClick={() => setSessionCheck(value => value + 1)} disabled={busy}>
                Verifica di nuovo la sessione
              </button>
            )}
          </form>
        )}

        {authenticated && !loading && (
          <>
            <div className="secret-admin-summary">
              <span>Libri totali: {books.length}</span>
              <button
                type="button"
                className="secret-admin-retry"
                onClick={() => setRefresh(value => value + 1)}
                disabled={busy || deletingId !== null}
              >
                Aggiorna elenco
              </button>
            </div>
            <div className="secret-admin-table-wrapper">
              <table className="secret-admin-table">
                <caption className="secret-admin-visually-hidden">Libri presenti nel catalogo e azioni di amministrazione</caption>
                <thead>
                  <tr>
                    <th scope="col">ID</th>
                    <th scope="col">Titolo</th>
                    <th scope="col">Generi</th>
                    <th scope="col" className="secret-admin-number">Caratteri descrizione</th>
                    <th scope="col">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {books.map(book => (
                    <tr key={book.id}>
                      <td className="secret-admin-id" data-label="ID">{book.id}</td>
                      <td data-label="Titolo">{book.title}</td>
                      <td data-label="Generi">{(book.genres || []).join(', ') || 'Nessun genere'}</td>
                      <td className="secret-admin-number" data-label="Caratteri descrizione">{book.description?.length || 0}</td>
                      <td data-label="Azioni">
                        <button
                          type="button"
                          className="secret-admin-delete"
                          onClick={() => handleDelete(book)}
                          disabled={deletingId !== null || busy}
                          aria-label={`Elimina ${book.title}`}
                        >
                          {deletingId === book.id ? 'Eliminazione…' : 'Elimina'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {books.length === 0 && (
                    <tr>
                      <td colSpan={5} className="secret-admin-empty">Nessun libro nel catalogo.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default SecretAdmin
