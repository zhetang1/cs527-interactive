import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from './ThemeContext.jsx'

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/btree', label: 'B+ Tree' },
  { to: '/bloom', label: 'Bloom Filter' },
  { to: '/hashtable', label: 'Hash Tables' },
  { to: '/bufferpool', label: 'Buffer Pool' },
  { to: '/joins', label: 'Join Algorithms' },
  { to: '/sorting', label: 'External Sort' },
  { to: '/locking', label: '2PL & Locking' },
  { to: '/domino-puzzle', label: 'Domino Puzzle' },
  { to: '/big-pairs-matrix', label: 'Big Pairs Matrix' },
]

export default function Nav() {
  const location = useLocation()
  const { theme, setTheme } = useTheme()

  return (
    <nav>
      <Link className="nav-brand" to="/">DB Systems</Link>
      <div className="nav-links">
        {NAV_LINKS.map(({ to, label }) => (
          <Link
            key={to}
            className={`nav-link${location.pathname === to ? ' active' : ''}`}
            to={to}
          >
            {label}
          </Link>
        ))}
      </div>
      <div className="theme-toggle">
        <button
          className={`theme-btn${theme === 'light' ? ' active' : ''}`}
          onClick={() => setTheme('light')}
          title="Light"
        >☀</button>
        <button
          className={`theme-btn${theme === 'dark' ? ' active' : ''}`}
          onClick={() => setTheme('dark')}
          title="Dark"
        >☾</button>
        <button
          className={`theme-btn${theme === 'system' ? ' active' : ''}`}
          onClick={() => setTheme('system')}
          title="System"
        >⊙</button>
      </div>
    </nav>
  )
}
