import React, { useState, useRef, useEffect } from 'react'

function hash1(key, n) { return ((key * 2654435761) >>> 0) % n }
function hash2(key, n) { return ((key * 2246822519) >>> 0) % n }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

const HT_STYLES = `
  .slot-grid { display: grid; gap: 4px; padding: 1.5rem; }
  .slot { display: grid; grid-template-columns: 36px 1fr; align-items: center; gap: 6px; min-height: 38px; }
  .slot-idx { font-family: var(--mono); font-size: 0.75rem; color: var(--text-dim); text-align: right; }
  .slot-cell { background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; padding: 0.4rem 0.75rem; font-family: var(--mono); font-size: 0.85rem; min-height: 36px; display: flex; align-items: center; transition: all 0.3s; position: relative; }
  .slot-cell.occupied { background: #1a2440; border-color: var(--accent); color: var(--accent); }
  .slot-cell.tombstone { background: #2a1a1a; border-color: #555; color: #666; font-style: italic; }
  .slot-cell.active { border-color: var(--highlight); background: #2a2200; color: var(--highlight); box-shadow: 0 0 10px rgba(255,209,102,0.3); }
  .slot-cell.probing { border-color: var(--accent3); background: #0d2a1a; color: var(--accent3); }
  .slot-cell.found { border-color: var(--success); background: #0a2a1a; box-shadow: 0 0 10px rgba(67,217,173,0.3); }
  .slot-cell.error { border-color: var(--danger); background: #2a0a0a; }
  .chain-bucket { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .chain-node { background: #1a2440; border: 1px solid var(--accent); border-radius: 6px; padding: 0.3rem 0.6rem; font-family: var(--mono); font-size: 0.85rem; color: var(--accent); transition: all 0.3s; }
  .chain-node.active { border-color: var(--highlight); color: var(--highlight); background: #2a2200; }
  .chain-arrow { color: var(--text-dim); font-size: 0.8rem; }
  .ext-layout { display: grid; grid-template-columns: 120px 1fr; gap: 1rem; padding: 1.5rem; }
  .dir-entry { display: flex; align-items: center; gap: 8px; padding: 0.35rem 0.5rem; border-radius: 6px; background: var(--surface2); border: 1px solid var(--border); margin-bottom: 4px; font-family: var(--mono); font-size: 0.82rem; }
  .dir-entry .dir-bits { color: var(--accent4); min-width: 40px; }
  .bucket-box { background: #1a2440; border: 1px solid var(--accent); border-radius: 8px; padding: 0.6rem; margin-bottom: 6px; }
  .bucket-label { font-size: 0.7rem; color: var(--text-dim); margin-bottom: 0.3rem; }
  .bucket-keys { display: flex; gap: 4px; flex-wrap: wrap; }
  .bucket-key { background: var(--surface2); border: 1px solid var(--border); border-radius: 4px; padding: 0.2rem 0.5rem; font-family: var(--mono); font-size: 0.82rem; }
`

// ============================================================
// LINEAR PROBE
// ============================================================
function LinearProbe() {
  const [size, setSize] = useState(11)
  const [table, setTable] = useState(() => new Array(11).fill(null))
  const [probes, setProbes] = useState(0)
  const [highlight, setHighlight] = useState({})
  const [explanation, setExplanation] = useState({ msg: 'Linear probing: hash(key) % N. On collision, scan forward.', type: '' })
  const [insertVal, setInsertVal] = useState('')
  const [deleteVal, setDeleteVal] = useState('')
  const [searchVal, setSearchVal] = useState('')

  const tableRef = useRef(new Array(11).fill(null))
  const sizeRef = useRef(11)
  const probesRef = useRef(0)

  function setExpl(msg, type) { setExplanation({ msg, type: type || '' }) }

  function doReset(newSize) {
    const s = newSize ?? sizeRef.current
    sizeRef.current = s
    tableRef.current = new Array(s).fill(null)
    probesRef.current = 0
    setTable([...tableRef.current])
    setHighlight({})
    setProbes(0)
    setExpl('Linear probing: hash(key) % N. On collision, scan forward.', '')
  }

  async function doInsert(key) {
    const s = sizeRef.current
    let i = key % s
    let probeCount = 0
    const visited = []

    while (tableRef.current[i] !== null && tableRef.current[i] !== 'tomb') {
      if (tableRef.current[i].key === key) {
        setExpl(`Key ${key} already exists at slot ${i}.`, 'warning')
        return
      }
      visited.push(i)
      const hl = {}
      visited.forEach(v => { hl[v] = 'probing' })
      hl[(i + 1) % s] = 'active'
      setHighlight(hl)
      setExpl(`Slot ${i} occupied. Probing next slot...`, '')
      await sleep(400)
      i = (i + 1) % s
      probeCount++
      if (probeCount >= s) { setExpl(`Table is full! Cannot insert ${key}.`, 'danger'); return }
    }
    probesRef.current += probeCount + 1
    tableRef.current[i] = { key, val: `v${key}` }
    setTable([...tableRef.current])
    setHighlight({ [i]: 'found' })
    setProbes(probesRef.current)
    setExpl(`Inserted ${key} at slot ${i} after ${probeCount} collision(s).`, 'success')
  }

  async function doDelete(key) {
    const s = sizeRef.current
    let i = key % s
    let probeCount = 0
    while (tableRef.current[i] !== null) {
      if (tableRef.current[i] !== 'tomb' && tableRef.current[i].key === key) {
        tableRef.current[i] = 'tomb'
        setTable([...tableRef.current])
        setHighlight({ [i]: 'error' })
        setExpl(`Deleted ${key} at slot ${i}. Tombstone placed to preserve probe chains.`, 'warning')
        return
      }
      i = (i + 1) % s
      probeCount++
      if (probeCount >= s) break
    }
    setExpl(`Key ${key} not found.`, 'danger')
  }

  async function doSearch(key) {
    const s = sizeRef.current
    let i = key % s
    const visited = []
    while (tableRef.current[i] !== null) {
      if (tableRef.current[i] !== 'tomb' && tableRef.current[i].key === key) {
        const hl = {}
        visited.forEach(v => { hl[v] = 'probing' })
        hl[i] = 'found'
        setHighlight(hl)
        setExpl(`Found ${key} at slot ${i}!`, 'success')
        return
      }
      visited.push(i)
      const hl = {}
      visited.forEach(v => { hl[v] = 'probing' })
      setHighlight(hl)
      await sleep(350)
      i = (i + 1) % s
      if (i === key % s) break
    }
    setExpl(`Key ${key} not found (hit empty slot or full scan).`, 'danger')
  }

  async function bulkInsert(keys) {
    for (const k of keys) { await doInsert(k); await sleep(100) }
  }

  const n = tableRef.current.filter(e => e && e !== 'tomb').length

  return (
    <div className="two-col">
      <div>
        <div className="viz-area">
          <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="legend">
              <div className="legend-item"><div className="legend-dot" style={{ background: '#1a2440', border: '2px solid var(--accent)' }}></div> Occupied</div>
              <div className="legend-item"><div className="legend-dot" style={{ background: '#2a1a1a', border: '2px solid #555' }}></div> Tombstone</div>
              <div className="legend-item"><div className="legend-dot" style={{ background: '#2a2200', border: '2px solid var(--highlight)' }}></div> Active/Probing</div>
            </div>
            <div className="stats">
              <div className="stat"><div className="stat-val">{n}</div><div className="stat-lbl">Entries</div></div>
              <div className="stat"><div className="stat-val">{Math.round(n / size * 100)}%</div><div className="stat-lbl">Load</div></div>
              <div className="stat"><div className="stat-val">{probes}</div><div className="stat-lbl">Probes</div></div>
            </div>
          </div>
          <div className="slot-grid" style={{ gridTemplateColumns: '1fr' }}>
            {table.map((entry, i) => {
              let cellCls = 'slot-cell'
              if (highlight[i]) cellCls += ' ' + highlight[i]
              else if (entry === 'tomb') cellCls += ' tombstone'
              else if (entry !== null) cellCls += ' occupied'
              const content = entry === 'tomb' ? '🪦 (deleted)' : entry ? `${entry.key} → ${entry.val}` : ''
              return (
                <div key={i} className="slot">
                  <div className="slot-idx">{i}</div>
                  <div className={cellCls}>{content}</div>
                </div>
              )
            })}
          </div>
          <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border)' }}>
            <div className={`explanation${explanation.type ? ' ' + explanation.type : ''}`}>{explanation.msg}</div>
          </div>
        </div>
      </div>
      <div className="controls">
        <div className="card">
          <div className="card-title">Configuration</div>
          <div className="input-row">
            <label>Slots</label>
            <select value={size} onChange={e => { const v = parseInt(e.target.value); setSize(v); doReset(v); }}>
              <option value="7">7</option>
              <option value="11">11</option>
              <option value="13">13</option>
            </select>
          </div>
          <button className="btn btn-ghost" style={{ width: '100%', marginTop: '0.75rem' }} onClick={() => doReset()}>Reset</button>
        </div>
        <div className="card">
          <div className="card-title">Insert</div>
          <div className="input-row">
            <input type="number" value={insertVal} onChange={e => setInsertVal(e.target.value)} placeholder="key (int)" min="1" max="999" />
            <button className="btn btn-primary" onClick={() => { const v = parseInt(insertVal); if (!isNaN(v)) { doInsert(v); setInsertVal('') } }}>Insert</button>
          </div>
          <div className="btn-group" style={{ marginTop: '0.5rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => bulkInsert([5, 10, 15, 22, 3, 17])}>Demo</button>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Delete</div>
          <div className="input-row">
            <input type="number" value={deleteVal} onChange={e => setDeleteVal(e.target.value)} placeholder="key" />
            <button className="btn btn-danger" onClick={() => { const v = parseInt(deleteVal); if (!isNaN(v)) doDelete(v) }}>Delete</button>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Lookup</div>
          <div className="input-row">
            <input type="number" value={searchVal} onChange={e => setSearchVal(e.target.value)} placeholder="key" />
            <button className="btn btn-success" onClick={() => { const v = parseInt(searchVal); if (!isNaN(v)) doSearch(v) }}>Search</button>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Algorithm</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: '1.9', fontFamily: 'var(--mono)' }}>
            hash(key) % N → slot i<br />
            <b style={{ color: 'var(--accent)' }}>Insert:</b> if slot[i] empty → put<br />
            &nbsp;&nbsp;else probe i+1, i+2, ...<br />
            <b style={{ color: 'var(--danger)' }}>Delete:</b> find key, mark 🪦<br />
            <b style={{ color: 'var(--success)' }}>Lookup:</b> probe until found<br />
            &nbsp;&nbsp;or empty (not tombstone)
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// CHAINED HASHING
// ============================================================
function ChainedHash() {
  const [size, setSize] = useState(7)
  const [buckets, setBuckets] = useState(() => Array.from({ length: 7 }, () => []))
  const [highlight, setHighlight] = useState({})
  const [explanation, setExplanation] = useState({ msg: 'Chained hashing: each bucket holds a linked list of entries.', type: '' })
  const [insertVal, setInsertVal] = useState('')
  const [deleteVal, setDeleteVal] = useState('')
  const [searchVal, setSearchVal] = useState('')

  const bucketsRef = useRef(Array.from({ length: 7 }, () => []))
  const sizeRef = useRef(7)

  function setExpl(msg, type) { setExplanation({ msg, type: type || '' }) }

  function doReset(newSize) {
    const s = newSize ?? sizeRef.current
    sizeRef.current = s
    bucketsRef.current = Array.from({ length: s }, () => [])
    setBuckets(bucketsRef.current.map(b => [...b]))
    setHighlight({})
    setExpl('Chained hashing: each bucket holds a linked list of entries.', '')
  }

  async function doInsert(key) {
    const s = sizeRef.current
    const bucket = key % s
    if (bucketsRef.current[bucket].includes(key)) { setExpl(`Key ${key} already in bucket ${bucket}.`, 'warning'); return }
    setHighlight({ [bucket]: 'active' })
    setExpl(`hash(${key}) = ${bucket}: appending to bucket ${bucket}'s list.`, '')
    await sleep(400)
    bucketsRef.current[bucket].push(key)
    setBuckets(bucketsRef.current.map(b => [...b]))
    setHighlight({ [bucket]: 'found' })
    setExpl(`Inserted ${key} into bucket ${bucket} (chain length: ${bucketsRef.current[bucket].length}).`, 'success')
  }

  async function doDelete(key) {
    const s = sizeRef.current
    const bucket = key % s
    const idx = bucketsRef.current[bucket].indexOf(key)
    if (idx === -1) { setExpl(`Key ${key} not found.`, 'danger'); return }
    setHighlight({ [bucket]: { cls: 'active', keyIdx: idx } })
    await sleep(400)
    bucketsRef.current[bucket].splice(idx, 1)
    setBuckets(bucketsRef.current.map(b => [...b]))
    setHighlight({ [bucket]: { cls: 'error' } })
    setExpl(`Deleted ${key} from bucket ${bucket}.`, 'warning')
  }

  async function doSearch(key) {
    const s = sizeRef.current
    const bucket = key % s
    for (let i = 0; i < bucketsRef.current[bucket].length; i++) {
      setHighlight({ [bucket]: { cls: 'probing', keyIdx: i } })
      setExpl(`Scanning bucket ${bucket}: checking position ${i}...`, '')
      await sleep(350)
      if (bucketsRef.current[bucket][i] === key) {
        setHighlight({ [bucket]: { cls: 'found', keyIdx: i } })
        setExpl(`Found ${key} in bucket ${bucket} at position ${i}!`, 'success')
        return
      }
    }
    setHighlight({ [bucket]: { cls: 'error' } })
    setExpl(`Key ${key} not found in bucket ${bucket}.`, 'danger')
  }

  async function bulkInsert(keys) { for (const k of keys) { await doInsert(k); await sleep(100) } }

  const n = bucketsRef.current.reduce((s, b) => s + b.length, 0)
  const maxChain = Math.max(...bucketsRef.current.map(b => b.length), 0)

  return (
    <div className="two-col">
      <div>
        <div className="viz-area">
          <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Each slot → linked list of entries</span>
            <div className="stats">
              <div className="stat"><div className="stat-val">{n}</div><div className="stat-lbl">Entries</div></div>
              <div className="stat"><div className="stat-val">{maxChain}</div><div className="stat-lbl">Max Chain</div></div>
            </div>
          </div>
          <div className="slot-grid" style={{ gridTemplateColumns: '1fr' }}>
            {buckets.map((bucket, i) => {
              const hl = highlight[i]
              const hlCls = typeof hl === 'object' ? hl.cls : hl
              const hlKeyIdx = typeof hl === 'object' ? hl.keyIdx : undefined
              return (
                <div key={i} className="slot">
                  <div className="slot-idx">{i}</div>
                  <div className={`slot-cell ${bucket.length ? 'occupied' : ''} ${hlCls || ''}`}>
                    <div className="chain-bucket">
                      {bucket.length === 0
                        ? <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>empty</span>
                        : bucket.map((k, ki) => (
                          <React.Fragment key={ki}>
                            <span className={`chain-node ${hlKeyIdx === ki ? 'active' : ''}`}>{k}</span>
                            {ki < bucket.length - 1 && <span className="chain-arrow">→</span>}
                          </React.Fragment>
                        ))
                      }
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border)' }}>
            <div className={`explanation${explanation.type ? ' ' + explanation.type : ''}`}>{explanation.msg}</div>
          </div>
        </div>
      </div>
      <div className="controls">
        <div className="card">
          <div className="card-title">Configuration</div>
          <div className="input-row">
            <label>Buckets</label>
            <select value={size} onChange={e => { const v = parseInt(e.target.value); setSize(v); doReset(v) }}>
              <option value="5">5</option>
              <option value="7">7</option>
              <option value="11">11</option>
            </select>
          </div>
          <button className="btn btn-ghost" style={{ width: '100%', marginTop: '0.75rem' }} onClick={() => doReset()}>Reset</button>
        </div>
        <div className="card">
          <div className="card-title">Insert</div>
          <div className="input-row">
            <input type="number" value={insertVal} onChange={e => setInsertVal(e.target.value)} placeholder="key" min="1" max="999" />
            <button className="btn btn-primary" onClick={() => { const v = parseInt(insertVal); if (!isNaN(v)) { doInsert(v); setInsertVal('') } }}>Insert</button>
          </div>
          <div className="btn-group" style={{ marginTop: '0.5rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => bulkInsert([1,8,15,22,3,10,17,24,5,12])}>Demo (10 keys)</button>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Delete / Lookup</div>
          <div className="input-row">
            <input type="number" value={deleteVal} onChange={e => setDeleteVal(e.target.value)} placeholder="key" />
            <button className="btn btn-danger" onClick={() => { const v = parseInt(deleteVal); if (!isNaN(v)) doDelete(v) }}>Delete</button>
          </div>
          <div className="input-row" style={{ marginTop: '0.5rem' }}>
            <input type="number" value={searchVal} onChange={e => setSearchVal(e.target.value)} placeholder="key" />
            <button className="btn btn-success" onClick={() => { const v = parseInt(searchVal); if (!isNaN(v)) doSearch(v) }}>Lookup</button>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Algorithm</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: '1.9', fontFamily: 'var(--mono)' }}>
            bucket = hash(key) % N<br />
            <b style={{ color: 'var(--accent)' }}>Insert:</b> append to bucket list<br />
            <b style={{ color: 'var(--danger)' }}>Delete:</b> unlink from list<br />
            <b style={{ color: 'var(--success)' }}>Lookup:</b> scan bucket list<br /><br />
            + No tombstones needed<br />
            + Can grow indefinitely<br />
            - Pointer overhead<br />
            - Cache unfriendly
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// CUCKOO HASHING
// ============================================================
function CuckooHash() {
  const [size, setSize] = useState(7)
  const [t1, setT1] = useState(() => new Array(7).fill(null))
  const [t2, setT2] = useState(() => new Array(7).fill(null))
  const [evictions, setEvictions] = useState(0)
  const [hl1, setHl1] = useState({})
  const [hl2, setHl2] = useState({})
  const [explanation, setExplanation] = useState({ msg: 'Cuckoo hashing: two tables, two hash functions. Lookup always checks exactly 2 slots.', type: '' })
  const [insertVal, setInsertVal] = useState('')
  const [searchVal, setSearchVal] = useState('')

  const t1Ref = useRef(new Array(7).fill(null))
  const t2Ref = useRef(new Array(7).fill(null))
  const sizeRef = useRef(7)
  const evictRef = useRef(0)

  function setExpl(msg, type) { setExplanation({ msg, type: type || '' }) }

  function doReset(newSize) {
    const s = newSize ?? sizeRef.current
    sizeRef.current = s
    t1Ref.current = new Array(s).fill(null)
    t2Ref.current = new Array(s).fill(null)
    evictRef.current = 0
    setT1([...t1Ref.current])
    setT2([...t2Ref.current])
    setEvictions(0)
    setHl1({}); setHl2({})
    setExpl('Cuckoo hashing: two tables, two hash functions. Lookup always checks exactly 2 slots.', '')
  }

  async function doInsert(key) {
    const MAX_EVICT = 10
    let cur = key, table = 1, iter = 0
    const s = sizeRef.current

    while (iter++ < MAX_EVICT) {
      if (table === 1) {
        const i = hash1(cur, s)
        setHl1({ [i]: 'active' }); setHl2({})
        setExpl(`Table1[hash1(${cur})=${i}]: ${t1Ref.current[i] === null ? 'empty → insert here' : 'occupied by ' + t1Ref.current[i] + ', evict it'}`, '')
        await sleep(500)
        if (t1Ref.current[i] === null) {
          t1Ref.current[i] = cur
          setT1([...t1Ref.current])
          setHl1({ [i]: 'found' }); setHl2({})
          setExpl(`Inserted ${key}. Done!`, 'success')
          setEvictions(evictRef.current)
          return
        }
        const evicted = t1Ref.current[i]; t1Ref.current[i] = cur; evictRef.current++
        setT1([...t1Ref.current])
        cur = evicted; table = 2
      } else {
        const i = hash2(cur, s)
        setHl1({}); setHl2({ [i]: 'active' })
        setExpl(`Table2[hash2(${cur})=${i}]: ${t2Ref.current[i] === null ? 'empty → insert here' : 'occupied by ' + t2Ref.current[i] + ', evict it'}`, '')
        await sleep(500)
        if (t2Ref.current[i] === null) {
          t2Ref.current[i] = cur
          setT2([...t2Ref.current])
          setHl1({}); setHl2({ [i]: 'found' })
          setExpl(`Inserted ${key}. Done!`, 'success')
          setEvictions(evictRef.current)
          return
        }
        const evicted = t2Ref.current[i]; t2Ref.current[i] = cur; evictRef.current++
        setT2([...t2Ref.current])
        cur = evicted; table = 1
      }
    }
    setExpl(`Cycle detected after ${MAX_EVICT} evictions! Would need to rehash.`, 'danger')
    setHl1({}); setHl2({})
  }

  async function doSearch(key) {
    const s = sizeRef.current
    const i1 = hash1(key, s), i2 = hash2(key, s)
    setHl1({ [i1]: 'probing' }); setHl2({ [i2]: 'probing' })
    setExpl(`Checking T1[${i1}] and T2[${i2}]...`, '')
    await sleep(400)
    if (t1Ref.current[i1] === key) { setHl1({ [i1]: 'found' }); setHl2({}); setExpl(`Found ${key} in Table 1 at slot ${i1}!`, 'success'); return }
    if (t2Ref.current[i2] === key) { setHl1({}); setHl2({ [i2]: 'found' }); setExpl(`Found ${key} in Table 2 at slot ${i2}!`, 'success'); return }
    setExpl(`Key ${key} not found (checked exactly 2 slots).`, 'danger')
    setHl1({}); setHl2({})
  }

  async function bulkInsert(keys) { for (const k of keys) { await doInsert(k); await sleep(100) } }

  const n = t1.filter(e => e !== null).length + t2.filter(e => e !== null).length

  return (
    <div className="two-col">
      <div>
        <div className="viz-area">
          <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Two tables, two hash functions — always O(1) lookup</span>
            <div className="stats">
              <div className="stat"><div className="stat-val">{n}</div><div className="stat-lbl">Entries</div></div>
              <div className="stat"><div className="stat-val">{evictions}</div><div className="stat-lbl">Evictions</div></div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '0.5rem', textAlign: 'center' }}>Table 1 (hash₁)</div>
              <div className="slot-grid" style={{ gap: '3px' }}>
                {t1.map((entry, i) => (
                  <div key={i} className="slot">
                    <div className="slot-idx">{i}</div>
                    <div className={`slot-cell${hl1[i] ? ' ' + hl1[i] : ''}${entry !== null && !hl1[i] ? ' occupied' : ''}`}>{entry !== null ? entry : ''}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '0.5rem', textAlign: 'center' }}>Table 2 (hash₂)</div>
              <div className="slot-grid" style={{ gap: '3px' }}>
                {t2.map((entry, i) => (
                  <div key={i} className="slot">
                    <div className="slot-idx">{i}</div>
                    <div className={`slot-cell${hl2[i] ? ' ' + hl2[i] : ''}${entry !== null && !hl2[i] ? ' occupied' : ''}`}>{entry !== null ? entry : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border)' }}>
            <div className={`explanation${explanation.type ? ' ' + explanation.type : ''}`}>{explanation.msg}</div>
          </div>
        </div>
      </div>
      <div className="controls">
        <div className="card">
          <div className="card-title">Configuration</div>
          <div className="input-row">
            <label>Slots/Table</label>
            <select value={size} onChange={e => { const v = parseInt(e.target.value); setSize(v); doReset(v) }}>
              <option value="5">5</option>
              <option value="7">7</option>
              <option value="11">11</option>
            </select>
          </div>
          <button className="btn btn-ghost" style={{ width: '100%', marginTop: '0.75rem' }} onClick={() => doReset()}>Reset</button>
        </div>
        <div className="card">
          <div className="card-title">Insert</div>
          <div className="input-row">
            <input type="number" value={insertVal} onChange={e => setInsertVal(e.target.value)} placeholder="key" min="1" max="999" />
            <button className="btn btn-primary" onClick={() => { const v = parseInt(insertVal); if (!isNaN(v)) { doInsert(v); setInsertVal('') } }}>Insert</button>
          </div>
          <div className="btn-group" style={{ marginTop: '0.5rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => bulkInsert([3,7,11,15,2,6,10,14])}>Demo</button>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Lookup</div>
          <div className="input-row">
            <input type="number" value={searchVal} onChange={e => setSearchVal(e.target.value)} placeholder="key" />
            <button className="btn btn-success" onClick={() => { const v = parseInt(searchVal); if (!isNaN(v)) doSearch(v) }}>Lookup</button>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Algorithm</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: '1.9', fontFamily: 'var(--mono)' }}>
            <b style={{ color: 'var(--accent)' }}>Insert(key):</b><br />
            1. h1 = hash1(key) % N<br />
            2. If T1[h1] empty → done<br />
            3. Evict T1[h1] → x<br />
            4. Try T2[hash2(x)]<br />
            5. Repeat until empty or cycle → rehash<br /><br />
            <b style={{ color: 'var(--success)' }}>Lookup:</b> Check T1[h1(k)] AND T2[h2(k)]<br />
            → Always exactly 2 probes!
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// EXTENDIBLE HASHING
// ============================================================
function ExtendibleHash() {
  const [globalDepth, setGlobalDepth] = useState(1)
  const [dir, setDir] = useState([0, 1])
  const [bucketList, setBucketList] = useState([{ id: 0, localDepth: 1, keys: [] }, { id: 1, localDepth: 1, keys: [] }])
  const [cap, setCap] = useState(3)
  const [hlBucket, setHlBucket] = useState(-1)
  const [explanation, setExplanation] = useState({ msg: 'Extendible hashing: directory entries = low g bits of hash. Multiple entries can share a bucket.', type: '' })
  const [insertVal, setInsertVal] = useState('')

  const gdRef = useRef(1)
  const dirRef = useRef([0, 1])
  const bucketRef = useRef([{ id: 0, localDepth: 1, keys: [] }, { id: 1, localDepth: 1, keys: [] }])
  const capRef = useRef(3)

  function setExpl(msg, type) { setExplanation({ msg, type: type || '' }) }

  function syncState() {
    setGlobalDepth(gdRef.current)
    setDir([...dirRef.current])
    setBucketList(bucketRef.current.map(b => ({ ...b, keys: [...b.keys] })))
  }

  function doReset(newCap) {
    const c = newCap ?? capRef.current
    capRef.current = c
    gdRef.current = 1
    bucketRef.current = [{ id: 0, localDepth: 1, keys: [] }, { id: 1, localDepth: 1, keys: [] }]
    dirRef.current = [0, 1]
    setHlBucket(-1)
    syncState()
    setExpl('Extendible hashing: directory entries = low g bits of hash. Multiple entries can share a bucket.', '')
  }

  async function doInsert(key) {
    const mask = (1 << gdRef.current) - 1
    const dirIdx = (key & 0xff) & mask
    const bIdx = dirRef.current[dirIdx]
    const bucket = bucketRef.current[bIdx]

    setHlBucket(bIdx)
    syncState()
    setExpl(`hash(${key}) & mask(${gdRef.current}bit) = ${dirIdx} → Bucket B${bIdx} (local depth ${bucket.localDepth}, ${bucket.keys.length}/${capRef.current} keys)`, '')
    await sleep(400)

    if (bucket.keys.includes(key)) { setExpl(`Key ${key} already in bucket.`, 'warning'); return }

    if (bucket.keys.length < capRef.current) {
      bucket.keys.push(key)
      syncState()
      setExpl(`Inserted ${key} into Bucket B${bIdx}. Done!`, 'success')
      return
    }

    setExpl(`Bucket B${bIdx} is full! Splitting...`, 'warning')
    await sleep(500)

    if (bucket.localDepth === gdRef.current) {
      gdRef.current++
      const newLen = 1 << gdRef.current
      const newDir = new Array(newLen)
      for (let i = 0; i < newLen; i++) { newDir[i] = dirRef.current[i >> 1] }
      dirRef.current = newDir
      setExpl(`Local depth = global depth. Doubling directory (global depth ${gdRef.current - 1}→${gdRef.current})...`, 'warning')
      await sleep(500)
    }

    const newBIdx = bucketRef.current.length
    const newBucket = { id: newBIdx, localDepth: bucket.localDepth + 1, keys: [] }
    bucket.localDepth++
    bucketRef.current.push(newBucket)

    const newMask = (1 << gdRef.current) - 1
    const oldPrefix = dirIdx & ((1 << (bucket.localDepth - 1)) - 1)
    for (let i = 0; i <= newMask; i++) {
      if ((i & ((1 << bucket.localDepth) - 1)) === (oldPrefix | (1 << (bucket.localDepth - 1)))) {
        dirRef.current[i] = newBIdx
      }
    }

    const toRehash = [...bucket.keys, key]
    bucket.keys = []
    toRehash.forEach(k => {
      const di = (k & 0xff) & newMask
      const tgt = bucketRef.current[dirRef.current[di]]
      tgt.keys.push(k)
    })

    syncState()
    setExpl(`Split done! Keys redistributed. New global depth: ${gdRef.current}.`, 'success')
  }

  async function bulkInsert(keys) { for (const k of keys) { await doInsert(k); await sleep(150) } }

  const n = bucketRef.current.reduce((s, b) => s + b.keys.length, 0)

  return (
    <div className="two-col">
      <div>
        <div className="viz-area">
          <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Dynamic: double directory on overflow, split only the full bucket</span>
            <div className="stats">
              <div className="stat"><div className="stat-val">{globalDepth}</div><div className="stat-lbl">Global Depth</div></div>
              <div className="stat"><div className="stat-val">{n}</div><div className="stat-lbl">Entries</div></div>
              <div className="stat"><div className="stat-val">{bucketList.length}</div><div className="stat-lbl">Buckets</div></div>
            </div>
          </div>
          <div className="ext-layout">
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '0.5rem' }}>Directory</div>
              {dir.map((bIdx, i) => (
                <div key={i} className={`dir-entry${bIdx === hlBucket ? ' active' : ''}`} style={bIdx === hlBucket ? { borderColor: 'var(--highlight)' } : {}}>
                  <span className="dir-bits">{i.toString(2).padStart(globalDepth, '0')}</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>→</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>B{bIdx}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '0.5rem' }}>Buckets</div>
              {bucketList.map((b, i) => (
                <div key={i} className="bucket-box" style={i === hlBucket ? { borderColor: 'var(--highlight)' } : {}}>
                  <div className="bucket-label">Bucket B{i} (local depth={b.localDepth})</div>
                  <div className="bucket-keys">
                    {b.keys.length === 0
                      ? <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>empty</span>
                      : b.keys.map((k, ki) => <span key={ki} className="bucket-key">{k}</span>)
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border)' }}>
            <div className={`explanation${explanation.type ? ' ' + explanation.type : ''}`}>{explanation.msg}</div>
          </div>
        </div>
      </div>
      <div className="controls">
        <div className="card">
          <div className="card-title">Configuration</div>
          <div className="input-row">
            <label>Bucket cap</label>
            <select value={cap} onChange={e => { const v = parseInt(e.target.value); setCap(v); doReset(v) }}>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>
          <button className="btn btn-ghost" style={{ width: '100%', marginTop: '0.75rem' }} onClick={() => doReset()}>Reset</button>
        </div>
        <div className="card">
          <div className="card-title">Insert</div>
          <div className="input-row">
            <input type="number" value={insertVal} onChange={e => setInsertVal(e.target.value)} placeholder="key" min="1" max="255" />
            <button className="btn btn-primary" onClick={() => { const v = parseInt(insertVal); if (!isNaN(v)) { doInsert(v); setInsertVal('') } }}>Insert</button>
          </div>
          <div className="btn-group" style={{ marginTop: '0.5rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => bulkInsert([20,30,10,40,50,60,70,15,25])}>Demo</button>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Algorithm</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: '1.9', fontFamily: 'var(--mono)' }}>
            Global depth = g<br />
            Dir entry = low g bits of hash<br /><br />
            <b style={{ color: 'var(--accent)' }}>Insert:</b><br />
            1. Find bucket via low g bits<br />
            2. If bucket not full → insert<br />
            3. Else split bucket:<br />
            &nbsp;&nbsp;a. If local=global: double dir<br />
            &nbsp;&nbsp;b. Increment local depth<br />
            &nbsp;&nbsp;c. Rehash bucket entries
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================
export default function HashTable() {
  const [activeTab, setActiveTab] = useState('linear')

  const tabs = ['linear', 'chained', 'cuckoo', 'extendible']
  const tabLabels = ['Linear Probe', 'Chained', 'Cuckoo', 'Extendible']

  return (
    <>
      <style>{HT_STYLES}</style>
      <div className="page">
        <div className="page-header">
          <div className="page-title">Hash Tables</div>
          <div className="page-desc">Compare four collision-handling strategies: linear probing, chained hashing, cuckoo hashing, and extendible hashing.</div>
        </div>

        <div className="tabs">
          {tabs.map((t, i) => (
            <div key={t} className={`tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>{tabLabels[i]}</div>
          ))}
        </div>

        {activeTab === 'linear' && <LinearProbe />}
        {activeTab === 'chained' && <ChainedHash />}
        {activeTab === 'cuckoo' && <CuckooHash />}
        {activeTab === 'extendible' && <ExtendibleHash />}
      </div>
    </>
  )
}
