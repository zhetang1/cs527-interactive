import React from 'react'
import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <>
      <div className="hero">
        <div className="hero-title">Database Systems<br />Interactive Visualizer</div>
        <p className="hero-sub">Step through core database algorithms with live, animated visualizations.</p>
      </div>

      <div className="page" style={{ paddingTop: 0 }}>
        <div className="app-grid">
          <Link className="app-card" to="/btree">
            <div className="app-card-icon">🌳</div>
            <div className="app-card-title">B+ Tree</div>
            <div className="app-card-desc">Insert, delete, and search in a B+ Tree. Watch nodes split and merge as the tree stays balanced.</div>
            <div className="app-card-tags">
              <span className="tag">Insert</span>
              <span className="tag">Delete</span>
              <span className="tag">Search</span>
              <span className="tag">Node Split</span>
              <span className="tag">Merge</span>
            </div>
          </Link>

          <Link className="app-card" to="/bloom">
            <div className="app-card-icon">🔮</div>
            <div className="app-card-title">Bloom Filter</div>
            <div className="app-card-desc">See how a probabilistic bit-array answers set membership queries. Insert elements and trigger false positives.</div>
            <div className="app-card-tags">
              <span className="tag">Bit Array</span>
              <span className="tag">Hash Functions</span>
              <span className="tag">False Positives</span>
            </div>
          </Link>

          <Link className="app-card" to="/hashtable">
            <div className="app-card-icon">🔑</div>
            <div className="app-card-title">Hash Tables</div>
            <div className="app-card-desc">Explore linear probing, chained hashing, cuckoo hashing, and extendible hashing with collision visualizations.</div>
            <div className="app-card-tags">
              <span className="tag">Linear Probe</span>
              <span className="tag">Chaining</span>
              <span className="tag">Cuckoo</span>
              <span className="tag">Extendible</span>
            </div>
          </Link>

          <Link className="app-card" to="/bufferpool">
            <div className="app-card-icon">💾</div>
            <div className="app-card-title">Buffer Pool</div>
            <div className="app-card-desc">Simulate page requests and watch replacement policies (LRU, Clock, LRU-K) decide which frames to evict.</div>
            <div className="app-card-tags">
              <span className="tag">LRU</span>
              <span className="tag">Clock</span>
              <span className="tag">LRU-K</span>
              <span className="tag">Eviction</span>
            </div>
          </Link>

          <Link className="app-card" to="/joins">
            <div className="app-card-icon">⨝</div>
            <div className="app-card-title">Join Algorithms</div>
            <div className="app-card-desc">Visualize Nested Loop Join, Sort-Merge Join, and Hash Join operating on two relations.</div>
            <div className="app-card-tags">
              <span className="tag">Nested Loop</span>
              <span className="tag">Sort-Merge</span>
              <span className="tag">Hash Join</span>
              <span className="tag">I/O Cost</span>
            </div>
          </Link>

          <Link className="app-card" to="/sorting">
            <div className="app-card-icon">↕️</div>
            <div className="app-card-title">External Sort</div>
            <div className="app-card-desc">Step through the two-pass external merge sort algorithm when data doesn't fit in memory.</div>
            <div className="app-card-tags">
              <span className="tag">Merge Sort</span>
              <span className="tag">Runs</span>
              <span className="tag">Buffer Pages</span>
            </div>
          </Link>

          <Link className="app-card" to="/locking">
            <div className="app-card-icon">🔒</div>
            <div className="app-card-title">2PL &amp; Locking</div>
            <div className="app-card-desc">Simulate transactions acquiring and releasing locks. See deadlocks form and how 2PL ensures serializability.</div>
            <div className="app-card-tags">
              <span className="tag">S-Lock</span>
              <span className="tag">X-Lock</span>
              <span className="tag">Deadlock</span>
              <span className="tag">Waits-For</span>
            </div>
          </Link>

          <Link className="app-card" to="/domino-puzzle">
            <div className="app-card-icon">🁣</div>
            <div className="app-card-title">Domino Puzzle</div>
            <div className="app-card-desc">Tile a 65-cell board with 32 dominoes, leaving exactly one cell uncovered. Watch a backtracking solver find the solution.</div>
            <div className="app-card-tags">
              <span className="tag">Backtracking</span>
              <span className="tag">Tiling</span>
              <span className="tag">Constraint Solving</span>
            </div>
          </Link>

          <Link className="app-card" to="/big-pairs-matrix">
            <div className="app-card-icon">🔢</div>
            <div className="app-card-title">Big Pairs in a Matrix</div>
            <div className="app-card-desc">Step through the proof that the sum of the top-2 values in every row equals the sum of the top-2 values in every column.</div>
            <div className="app-card-tags">
              <span className="tag">Proof</span>
              <span className="tag">Contradiction</span>
              <span className="tag">Matrix</span>
            </div>
          </Link>
        </div>
      </div>
    </>
  )
}
