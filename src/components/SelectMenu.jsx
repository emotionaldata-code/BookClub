import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { normalizeSearch } from '../lib/bookFilters'
import './SelectMenu.css'

// One selection model for touch, pointer and keyboard; focus stays on the list.
export default function SelectMenu({ id, label, value, options, onChange, searchable = false, describedBy }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [placement, setPlacement] = useState({ side: 'bottom', height: 320 })
  const root = useRef(null)
  const trigger = useRef(null)
  const list = useRef(null)
  const typeahead = useRef({ text: '', time: 0 })
  const filtered = options.filter(option => normalizeSearch(option.label).includes(normalizeSearch(query)))
  const selected = options.find(option => option.value === value)
  const activeIndex = Math.min(active, filtered.length - 1)

  function close(restoreFocus = false) {
    setOpen(false)
    if (restoreFocus) trigger.current?.focus({ preventScroll: true })
  }

  function show(initial = 'selected') {
    setQuery('')
    typeahead.current = { text: '', time: 0 }
    setActive(initial === 'last' ? options.length - 1 : initial === 'first' ? 0 : Math.max(0, options.findIndex(option => option.value === value)))
    setOpen(true)
  }

  function choose(option) {
    onChange(option.value)
    close(true)
  }

  useLayoutEffect(() => {
    if (!open) return
    function position() {
      const rect = trigger.current.getBoundingClientRect()
      const viewport = window.visualViewport
      const top = viewport?.offsetTop ?? 0
      const bottom = top + (viewport?.height ?? window.innerHeight)
      const below = bottom - rect.bottom - 16
      const above = rect.top - top - 16
      const side = below < 240 && above > below ? 'top' : 'bottom'
      setPlacement({ side, height: Math.max(100, Math.min(360, side === 'top' ? above : below)) })
    }
    position()
    list.current?.focus({ preventScroll: true })
    window.addEventListener('resize', position)
    window.addEventListener('scroll', position, true)
    window.visualViewport?.addEventListener('resize', position)
    return () => {
      window.removeEventListener('resize', position)
      window.removeEventListener('scroll', position, true)
      window.visualViewport?.removeEventListener('resize', position)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const outside = event => {
      if (!root.current?.contains(event.target)) close()
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('focusin', outside)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('focusin', outside)
    }
  }, [open])

  useEffect(() => {
    if (open) document.getElementById(`${id}-option-${activeIndex}`)?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex, id, query])

  function handleKeys(event) {
    const searching = event.target.tagName === 'INPUT'
    if (event.key === 'Escape') {
      event.preventDefault()
      close(true)
    } else if (event.key === 'Tab') {
      // Put the browser back at the trigger, then allow normal forward/back tabbing.
      close(true)
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setActive(index => Math.max(0, Math.min(filtered.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))))
      list.current?.focus({ preventScroll: true })
    } else if (!searching && (event.key === 'Home' || event.key === 'End')) {
      event.preventDefault()
      setActive(event.key === 'Home' ? 0 : filtered.length - 1)
    } else if (event.key === 'Enter' || (!searching && event.key === ' ' && Date.now() - typeahead.current.time > 700)) {
      event.preventDefault()
      if (filtered[activeIndex]) choose(filtered[activeIndex])
    } else if (!searching && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault()
      const now = Date.now()
      const text = now - typeahead.current.time < 700 ? typeahead.current.text + event.key : event.key
      typeahead.current = { text, time: now }
      const index = filtered.findIndex(option => normalizeSearch(option.label).startsWith(normalizeSearch(text)))
      if (index >= 0) setActive(index)
    }
  }

  return (
    <div className={`select-menu${open ? ' is-open' : ''}`} ref={root}>
      <button ref={trigger} id={id} type="button" className="select-menu-trigger"
        role="combobox" aria-expanded={open} aria-controls={`${id}-list`}
        aria-haspopup="listbox" aria-labelledby={`${id}-label ${id}-value`}
        aria-describedby={describedBy}
        onClick={() => open ? close() : show()}
        onKeyDown={event => {
          if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault()
            show(event.key === 'End' ? 'last' : event.key === 'Home' ? 'first' : 'selected')
          }
        }}>
        <span id={`${id}-value`}>{selected?.label ?? options[0]?.label}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m8 10 4 4 4-4" /></svg>
      </button>
      {open && <div className="select-menu-popover" data-side={placement.side} style={{ maxHeight: placement.height }} onKeyDown={handleKeys}>
        {searchable && <div className="select-menu-search"><input type="search" value={query} autoComplete="off" aria-label={`Cerca: ${label}`} placeholder="Cerca nell’elenco…" onChange={event => { setQuery(event.target.value); setActive(0) }} /></div>}
        <div ref={list} id={`${id}-list`} className="select-menu-list" role="listbox" tabIndex={-1}
          aria-label={label} aria-activedescendant={filtered.length ? `${id}-option-${activeIndex}` : undefined}>
          {filtered.map((option, index) => <div key={option.value} id={`${id}-option-${index}`} role="option"
            aria-selected={option.value === value} className={`select-menu-option${index === activeIndex ? ' is-active' : ''}`}
            onPointerMove={event => { if (event.pointerType === 'mouse') setActive(index) }}
            onMouseDown={event => event.preventDefault()} onClick={() => choose(option)}>
            <span>{option.label}</span>
            {option.value === value && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>}
          </div>)}
        </div>
        {!filtered.length && <p className="select-menu-empty" role="status">Nessuna corrispondenza</p>}
      </div>}
    </div>
  )
}
