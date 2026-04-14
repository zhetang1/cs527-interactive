import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './components/ThemeContext.jsx'
import Nav from './components/Nav.jsx'
import Home from './pages/Home.jsx'
import BTree from './pages/BTree.jsx'
import Bloom from './pages/Bloom.jsx'
import HashTable from './pages/HashTable.jsx'
import BufferPool from './pages/BufferPool.jsx'
import Joins from './pages/Joins.jsx'
import Sorting from './pages/Sorting.jsx'
import Locking from './pages/Locking.jsx'
import DominoPuzzle from './pages/DominoPuzzle.jsx'
import BigPairsMatrix from './pages/BigPairsMatrix.tsx'

export default function App() {
  return (
    <ThemeProvider>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/btree" element={<BTree />} />
        <Route path="/bloom" element={<Bloom />} />
        <Route path="/hashtable" element={<HashTable />} />
        <Route path="/bufferpool" element={<BufferPool />} />
        <Route path="/joins" element={<Joins />} />
        <Route path="/sorting" element={<Sorting />} />
        <Route path="/locking" element={<Locking />} />
        <Route path="/domino-puzzle" element={<DominoPuzzle />} />
        <Route path="/big-pairs-matrix" element={<BigPairsMatrix />} />
      </Routes>
    </ThemeProvider>
  )
}
