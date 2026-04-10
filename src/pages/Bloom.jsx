import React, { useState, useRef, useEffect } from 'react'

function hashStr(s, seed, m) {
  let h = seed ^ 0xdeadbeef
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 0x9e3779b9)
    h = ((h << 13) | (h >>> 19))
  }
  h ^= (h >>> 16)
  h = Math.imul(h, 0x85ebca6b)
  h ^= (h >>> 13)
  return Math.abs(h) % m
}

function getHashes(key, k, m) {
  const seeds = [0x12345678, 0x87654321, 0xabcdef01, 0xfedcba98]
  return seeds.slice(0, k).map((seed, i) => hashStr(key, seed + i * 0x1234, m))
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

export default function Bloom() {
  const [mVal, setMVal] = useState(16)
  const [kVal, setKVal] = useState(3)
  const [bits, setBits] = useState(() => new Array(16).fill(0))
  const [insertedKeys, setInsertedKeys] = useState([])
  const [highlight, setHighlight] = useState([]) // [{idx, cls}]
  const [explanation, setExplanation] = useState({ msg: 'A Bloom filter uses k hash functions to map keys to bit positions. Insert sets those bits; lookup checks if all are set.', type: '' })
  const [insertVal, setInsertVal] = useState('')
  const [lookupVal, setLookupVal] = useState('')
  const [hashDisplay, setHashDisplay] = useState(null)
  const [lookupResult, setLookupResult] = useState(null)
  const [stats, setStats] = useState({ bitsSet: 0, fillRate: '0%', fpRate: '0%' })

  const bitsRef = useRef(new Array(16).fill(0))
  const insertedKeysRef = useRef([])
  const mRef = useRef(16)
  const kRef = useRef(3)
  const inserting = useRef(false)

  function computeStats(bArr, iKeys, m, k) {
    const bitsSet = bArr.filter(b => b).length
    const fillRate = (bitsSet / m * 100).toFixed(0) + '%'
    const n = iKeys.length
    const fpRate = n === 0 ? '0%' : (Math.pow(1 - Math.exp(-k * n / m), k) * 100).toFixed(1) + '%'
    return { bitsSet, fillRate, fpRate }
  }

  function showHashDisplayFor(key, k, m) {
    const hashes = getHashes(key, k, m)
    const colors = ['h1', 'h2', 'h3', 'h4']
    const labels = ['Hash₁', 'Hash₂', 'Hash₃', 'Hash₄']
    setHashDisplay({ key, hashes, colors, labels })
  }

  function doReset(newM, newK) {
    const m = newM ?? mRef.current
    const k = newK ?? kRef.current
    mRef.current = m
    kRef.current = k
    const newBits = new Array(m).fill(0)
    bitsRef.current = newBits
    insertedKeysRef.current = []
    setBits([...newBits])
    setInsertedKeys([])
    setHighlight([])
    setLookupResult(null)
    setHashDisplay(null)
    setExplanation({ msg: 'Bloom filter reset. Insert keys to begin.', type: '' })
    setStats({ bitsSet: 0, fillRate: '0%', fpRate: '0%' })
  }

  async function animateInsert(key) {
    if (inserting.current) return
    inserting.current = true
    const m = mRef.current, k = kRef.current
    const hashes = getHashes(key, k, m)
    showHashDisplayFor(key, k, m)
    const hlCls = ['active-h1', 'active-h2', 'active-h3', 'active-h4']

    for (let i = 0; i < hashes.length; i++) {
      const hl = hashes.slice(0, i + 1).map((h, j) => ({ idx: h, cls: hlCls[j] }))
      setHighlight(hl)
      setExplanation({ msg: `Hash ${i + 1}("${key}") = ${hashes[i]} → set bit[${hashes[i]}] = 1`, type: '' })
      await sleep(400)
    }

    hashes.forEach(h => { bitsRef.current[h] = 1 })
    insertedKeysRef.current = [...insertedKeysRef.current, { key, hashes }]
    await sleep(300)
    setHighlight([])
    setBits([...bitsRef.current])
    setInsertedKeys([...insertedKeysRef.current])
    setStats(computeStats(bitsRef.current, insertedKeysRef.current, m, k))
    setExplanation({ msg: `Inserted "${key}": set bits [${hashes.join(', ')}]. All k=${k} bits now = 1.`, type: 'success' })
    inserting.current = false
  }

  async function animateLookup(key) {
    const m = mRef.current, k = kRef.current
    const hashes = getHashes(key, k, m)
    showHashDisplayFor(key, k, m)
    const isActuallyPresent = insertedKeysRef.current.some(e => e.key === key)
    const hlCls = ['active-h1', 'active-h2', 'active-h3', 'active-h4']

    let allSet = true
    for (let i = 0; i < hashes.length; i++) {
      const hl = hashes.slice(0, i + 1).map((h, j) => ({
        idx: h,
        cls: bitsRef.current[h] ? hlCls[j] : 'miss'
      }))
      setHighlight(hl)
      if (!bitsRef.current[hashes[i]]) {
        setExplanation({ msg: `bit[${hashes[i]}] = 0 → key "${key}" is DEFINITELY NOT in set.`, type: 'danger' })
        allSet = false
        await sleep(500)
        break
      }
      setExplanation({ msg: `bit[${hashes[i]}] = 1 ✓ (checking remaining bits...)`, type: '' })
      await sleep(400)
    }

    let result
    if (!allSet) {
      result = { type: 'not-in-set', key }
    } else if (isActuallyPresent) {
      result = { type: 'true-positive', key, k }
      setExplanation({ msg: `All bits set → "${key}" PROBABLY in set. (True positive — it was inserted.)`, type: 'success' })
    } else {
      const fpRate = (Math.pow(1 - Math.exp(-k * insertedKeysRef.current.length / m), k) * 100).toFixed(1)
      result = { type: 'false-positive', key, k, fpRate }
      setExplanation({ msg: `FALSE POSITIVE: "${key}" was not inserted but all bits are 1 due to collisions with other keys.`, type: 'warning' })
    }
    setLookupResult(result)

    await sleep(200)
    setHighlight([])
    setStats(computeStats(bitsRef.current, insertedKeysRef.current, m, k))
  }

  async function bulkInsert(keys) {
    const m = mRef.current, k = kRef.current
    const newBits = [...bitsRef.current]
    const newKeys = [...insertedKeysRef.current]
    for (const key of keys) {
      const hashes = getHashes(key, k, m)
      hashes.forEach(h => { newBits[h] = 1 })
      newKeys.push({ key, hashes })
    }
    bitsRef.current = newBits
    insertedKeysRef.current = newKeys
    setBits([...newBits])
    setInsertedKeys([...newKeys])
    setStats(computeStats(newBits, newKeys, m, k))
    setExplanation({ msg: `Inserted ${keys.length} keys. Check fill rate and false positive probability.`, type: 'success' })
  }

  const hlMap = {}
  highlight.forEach(h => { hlMap[h.idx] = h.cls })

  return (
    <>
      <style>{`
        .bit-grid { display: flex; flex-wrap: wrap; gap: 4px; padding: 1.5rem; justify-content: center; }
        .bit {
          width: 40px; height: 40px;
          background: var(--surface2); border: 2px solid var(--border);
          border-radius: 8px; display: flex; align-items: center; justify-content: center;
          font-family: var(--mono); font-size: 1rem; font-weight: 700;
          transition: all 0.4s; position: relative; cursor: default;
        }
        .bit.set { background: #1a2a40; border-color: var(--accent3); color: var(--accent3); }
        .bit.active-h1 { background: #2a1530; border-color: #ff6584; color: #ff6584; box-shadow: 0 0 12px rgba(255,101,132,0.4); }
        .bit.active-h2 { background: #1a2a10; border-color: #43d9ad; color: #43d9ad; box-shadow: 0 0 12px rgba(67,217,173,0.4); }
        .bit.active-h3 { background: #2a2800; border-color: #ffd166; color: #ffd166; box-shadow: 0 0 12px rgba(255,209,102,0.4); }
        .bit.miss { background: #300a0a; border-color: #ff6584; }
        .bit-idx { position: absolute; top: 2px; left: 4px; font-size: 9px; color: var(--text-dim); font-weight: 400; }
        .key-list { display: flex; flex-direction: column; gap: 0.4rem; max-height: 250px; overflow-y: auto; }
        .key-item { display: flex; align-items: center; justify-content: space-between; background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; padding: 0.4rem 0.75rem; font-family: var(--mono); font-size: 0.85rem; }
        .key-item .hash-info { font-size: 0.7rem; color: var(--text-dim); }
        .result-badge { padding: 0.3rem 0.75rem; border-radius: 20px; font-weight: 700; font-size: 0.85rem; }
        .result-true { background: rgba(67,217,173,0.2); color: var(--success); border: 1px solid var(--success); }
        .result-false { background: rgba(255,101,132,0.2); color: var(--danger); border: 1px solid var(--danger); }
        .result-fp { background: rgba(255,209,102,0.2); color: var(--accent4); border: 1px solid var(--accent4); }
        .hash-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; border-radius: 8px; }
        .hash-row.h1 { background: rgba(255,101,132,0.1); }
        .hash-row.h2 { background: rgba(67,217,173,0.1); }
        .hash-row.h3 { background: rgba(255,209,102,0.1); }
        .hash-dot { width: 10px; height: 10px; border-radius: 50%; }
        .h1-dot { background: #ff6584; }
        .h2-dot { background: #43d9ad; }
        .h3-dot { background: #ffd166; }
      `}</style>

      <div className="page">
        <div className="page-header">
          <div className="page-title">Bloom Filter</div>
          <div className="page-desc">A probabilistic data structure using a bit array and k hash functions. Answers "is this key in the set?" with zero false negatives but possible false positives.</div>
        </div>

        <div className="two-col">
          <div>
            <div className="viz-area">
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div className="legend">
                  <div className="legend-item"><div className="legend-dot" style={{ background: '#1a2a40', border: '2px solid #43d9ad' }}></div> Bit = 1</div>
                  <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--surface2)', border: '2px solid var(--border)' }}></div> Bit = 0</div>
                  <div className="legend-item"><div className="legend-dot" style={{ background: '#2a1530', border: '2px solid #ff6584' }}></div> Hash 1</div>
                  <div className="legend-item"><div className="legend-dot" style={{ background: '#1a2a10', border: '2px solid #43d9ad' }}></div> Hash 2</div>
                  <div className="legend-item"><div className="legend-dot" style={{ background: '#2a2800', border: '2px solid #ffd166' }}></div> Hash 3</div>
                </div>
                <div className="stats">
                  <div className="stat"><div className="stat-val">{stats.bitsSet}</div><div className="stat-lbl">Bits Set</div></div>
                  <div className="stat"><div className="stat-val">{stats.fillRate}</div><div className="stat-lbl">Fill Rate</div></div>
                  <div className="stat"><div className="stat-val">{stats.fpRate}</div><div className="stat-lbl">FP Rate</div></div>
                </div>
              </div>

              <div className="bit-grid">
                {bits.map((b, i) => {
                  let cls = 'bit'
                  if (hlMap[i]) cls += ' ' + hlMap[i]
                  else if (b) cls += ' set'
                  return (
                    <div key={i} className={cls} title={`bit ${i}`}>
                      <span className="bit-idx">{i}</span>
                      {b}
                    </div>
                  )
                })}
              </div>

              <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border)' }}>
                <div className={`explanation${explanation.type ? ' ' + explanation.type : ''}`}>{explanation.msg}</div>
              </div>
            </div>

            {lookupResult && (
              <div style={{ marginTop: '1rem' }}>
                <div className="card">
                  <div className="card-title">Lookup Result</div>
                  {lookupResult.type === 'not-in-set' && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '1.1rem' }}>"{lookupResult.key}"</span>
                        <span className="result-badge result-false">NOT IN SET</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>At least one bit was 0 → guaranteed not present. <b style={{ color: 'var(--success)' }}>No false negatives possible.</b></div>
                    </>
                  )}
                  {lookupResult.type === 'true-positive' && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '1.1rem' }}>"{lookupResult.key}"</span>
                        <span className="result-badge result-true">PROBABLY IN SET ✓</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>All {lookupResult.k} bits are 1. Key was actually inserted → True Positive.</div>
                    </>
                  )}
                  {lookupResult.type === 'false-positive' && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '1.1rem' }}>"{lookupResult.key}"</span>
                        <span className="result-badge result-fp">FALSE POSITIVE ⚠</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--accent4)' }}>"{lookupResult.key}" was never inserted but all {lookupResult.k} bits happen to be set by other keys! This is a <b>false positive</b>. Current FP rate ≈ {lookupResult.fpRate}%.</div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="card" style={{ marginTop: '1rem' }}>
              <div className="card-title">Inserted Keys</div>
              <div className="key-list">
                {insertedKeys.length === 0
                  ? <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No keys inserted yet</div>
                  : insertedKeys.map(({ key, hashes }, i) => (
                    <div key={i} className="key-item">
                      <span>{key}</span>
                      <span className="hash-info">bits: {hashes.join(', ')}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>

          <div className="controls">
            <div className="card">
              <div className="card-title">Configuration</div>
              <div className="input-row">
                <label>Size (m)</label>
                <select value={mVal} onChange={e => { const v = parseInt(e.target.value); setMVal(v); mRef.current = v; doReset(v, kRef.current); }}>
                  <option value="8">8 bits</option>
                  <option value="16">16 bits</option>
                  <option value="24">24 bits</option>
                  <option value="32">32 bits</option>
                </select>
              </div>
              <div className="input-row" style={{ marginTop: '0.5rem' }}>
                <label>Hash fns (k)</label>
                <select value={kVal} onChange={e => { const v = parseInt(e.target.value); setKVal(v); kRef.current = v; doReset(mRef.current, v); }}>
                  <option value="2">k = 2</option>
                  <option value="3">k = 3</option>
                  <option value="4">k = 4</option>
                </select>
              </div>
              <button className="btn btn-ghost" style={{ width: '100%', marginTop: '0.75rem' }} onClick={() => doReset()}>Reset Filter</button>
            </div>

            <div className="card">
              <div className="card-title">Insert Key</div>
              <div className="input-row">
                <input type="text" value={insertVal} onChange={e => setInsertVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && insertVal.trim()) { animateInsert(insertVal.trim()); setInsertVal('') } }} placeholder="e.g. alice, RZA" />
                <button className="btn btn-primary" onClick={() => { if (insertVal.trim()) { animateInsert(insertVal.trim()); setInsertVal('') } }}>Insert</button>
              </div>
              <div className="btn-group" style={{ marginTop: '0.75rem' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => bulkInsert(['RZA', 'GZA', 'ODB'])}>Wu-Tang Demo</button>
                <button className="btn btn-ghost btn-sm" onClick={() => bulkInsert(['alice', 'bob', 'charlie', 'dave'])}>Names</button>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Lookup Key</div>
              <div className="input-row">
                <input type="text" value={lookupVal} onChange={e => setLookupVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && lookupVal.trim()) animateLookup(lookupVal.trim()) }} placeholder="key to check" />
                <button className="btn btn-success" onClick={() => { if (lookupVal.trim()) animateLookup(lookupVal.trim()) }}>Lookup</button>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>Try looking up a key you haven't inserted to see a false negative guarantee, or a never-inserted key that happens to collide for a false positive.</div>
            </div>

            <div className="card">
              <div className="card-title">How Hash Functions Work</div>
              {hashDisplay ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {hashDisplay.hashes.map((h, i) => (
                    <div key={i} className={`hash-row ${hashDisplay.colors[i]}`}>
                      <div className={`hash-dot ${hashDisplay.colors[i]}-dot`}></div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', minWidth: '55px' }}>{hashDisplay.labels[i]}("{hashDisplay.key}")</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '0.9rem' }}> = {h}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginLeft: 'auto' }}>bit[{h}]</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Enter a key above to see hash values</div>
              )}
            </div>

            <div className="card">
              <div className="card-title">Key Properties</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: '1.9' }}>
                <b style={{ color: 'var(--success)' }}>False Negatives:</b> Never occur<br />
                <b style={{ color: 'var(--danger)' }}>False Positives:</b> Can occur<br />
                <b style={{ color: 'var(--accent)' }}>Space:</b> O(m) bits (very compact)<br />
                <b style={{ color: 'var(--accent)' }}>Insert:</b> O(k) hash computations<br />
                <b style={{ color: 'var(--accent)' }}>Lookup:</b> O(k) hash computations<br />
                <b style={{ color: 'var(--accent4)' }}>Delete:</b> Not supported<br /><br />
                <b style={{ color: 'var(--text)' }}>Optimal k</b> = (m/n) × ln(2)<br />
                <b style={{ color: 'var(--text)' }}>FP rate</b> ≈ (1 - e<sup>-kn/m</sup>)<sup>k</sup>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
