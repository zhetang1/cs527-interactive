import React, { useState, useRef } from 'react'

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

const BP_STYLES = `
  .frame-grid { display: grid; gap: 8px; padding: 1.5rem; }
  .frame { display: grid; grid-template-columns: 50px 1fr auto auto; align-items: center; gap: 8px; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 0.6rem 1rem; transition: all 0.3s; }
  .frame.active { border-color: var(--highlight); background: #2a2200; }
  .frame.evicting { border-color: var(--danger); background: #2a0a0a; }
  .frame.loading { border-color: var(--accent3); background: #0d2a1a; }
  .frame.pinned { border-color: var(--accent); background: #1a1440; }
  .frame-id { font-family: var(--mono); font-size: 0.8rem; color: var(--text-dim); }
  .frame-page { font-family: var(--mono); font-size: 1rem; font-weight: 700; }
  .frame-meta { font-size: 0.75rem; color: var(--text-dim); display: flex; flex-direction: column; gap: 2px; text-align: right; }
  .frame-badge { padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 700; white-space: nowrap; }
  .badge-pin { background: rgba(108,99,255,0.2); color: var(--accent); border: 1px solid var(--accent); }
  .badge-dirty { background: rgba(255,101,132,0.2); color: var(--danger); border: 1px solid var(--danger); }
  .badge-clean { background: rgba(67,217,173,0.15); color: var(--success); border: 1px solid var(--success); }
  .badge-ref { background: rgba(255,209,102,0.2); color: var(--accent4); border: 1px solid var(--accent4); }
  .badge-empty { background: var(--surface); color: var(--text-dim); border: 1px solid var(--border); }
  .lru-list { display: flex; align-items: center; gap: 6px; padding: 0.75rem 1.5rem; flex-wrap: wrap; border-top: 1px solid var(--border); }
  .lru-item { background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; padding: 0.3rem 0.6rem; font-family: var(--mono); font-size: 0.85rem; }
  .lru-item.mru { border-color: var(--accent3); color: var(--accent3); }
  .lru-item.lru-end { border-color: var(--danger); color: var(--danger); }
  .lru-arrow { color: var(--text-dim); font-size: 0.8rem; }
  .io-log { max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
  .io-entry { font-family: var(--mono); font-size: 0.8rem; padding: 0.3rem 0.6rem; border-radius: 5px; border-left: 3px solid var(--border); }
  .io-hit { border-left-color: var(--success); color: var(--success); background: rgba(67,217,173,0.08); }
  .io-miss { border-left-color: var(--accent4); color: var(--accent4); background: rgba(255,209,102,0.08); }
  .io-evict { border-left-color: var(--danger); color: var(--danger); background: rgba(255,101,132,0.08); }
`

export default function BufferPool() {
  const [policy, setPolicy] = useState('lru')
  const [numFrames, setNumFrames] = useState(4)
  const [kVal, setKVal] = useState(2)
  const [frames, setFrames] = useState(() => Array.from({ length: 4 }, (_, i) => ({ frameId: i, pageId: null, dirty: false, pinCount: 0, ref: false, history: [] })))
  const [highlight, setHighlight] = useState({})
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [evictions, setEvictions] = useState(0)
  const [logEntries, setLogEntries] = useState([])
  const [explanation, setExplanation] = useState({ msg: 'Request a page number to see the buffer pool in action.', type: '' })
  const [policyVizHtml, setPolicyVizHtml] = useState('')
  const [pageReq, setPageReq] = useState('')
  const [dirty, setDirty] = useState(false)
  const [workloadDesc, setWorkloadDesc] = useState('')

  const framesRef = useRef(Array.from({ length: 4 }, (_, i) => ({ frameId: i, pageId: null, dirty: false, pinCount: 0, ref: false, history: [] })))
  const hitsRef = useRef(0)
  const missesRef = useRef(0)
  const evictionsRef = useRef(0)
  const clockHandRef = useRef(0)
  const lruOrderRef = useRef([])
  const logRef = useRef([])
  const busyRef = useRef(false)
  const timeRef = useRef(0)
  const policyRef = useRef('lru')
  const kRef = useRef(2)
  const numFramesRef = useRef(4)

  function setExpl(msg, type) { setExplanation({ msg, type: type || '' }) }

  function syncFrames(hl) {
    setFrames(framesRef.current.map(f => ({ ...f, history: [...f.history] })))
    setHighlight(hl || {})
  }

  function buildPolicyViz() {
    const p = policyRef.current
    const f = framesRef.current
    if (p === 'lru') {
      const order = lruOrderRef.current.map(fi => f[fi])
      let html = '<span style="font-size:0.75rem;color:var(--text-dim)">MRU→LRU: </span>'
      if (order.length === 0) html += '<span style="color:var(--text-dim);font-size:0.8rem">empty</span>'
      order.forEach((fr, i) => {
        const cls = i === 0 ? 'lru-item mru' : i === order.length - 1 ? 'lru-item lru-end' : 'lru-item'
        html += `<span class="${cls}">${fr.pageId !== null ? 'P' + fr.pageId : '—'}</span>`
        if (i < order.length - 1) html += '<span class="lru-arrow">→</span>'
      })
      return `<div class="lru-list">${html}</div>`
    } else if (p === 'clock') {
      let html = '<div style="padding:0.75rem 1.5rem;display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="font-size:0.75rem;color:var(--text-dim)">Clock frames:</span>'
      f.forEach((fr, i) => {
        const isHand = i === clockHandRef.current
        html += `<span style="display:inline-flex;align-items:center;gap:4px;background:var(--surface2);border:1px solid ${isHand ? 'var(--highlight)' : 'var(--border)'};border-radius:6px;padding:0.3rem 0.6rem;font-family:var(--mono);font-size:0.82rem">
          ${isHand ? '<span style="color:var(--highlight)">▶</span>' : ''} ${fr.pageId !== null ? 'P' + fr.pageId : '—'} <span style="color:${fr.ref ? 'var(--accent4)' : 'var(--text-dim)'}">ref=${fr.ref ? 1 : 0}</span>
        </span>`
      })
      html += '</div>'
      return html
    } else {
      let html = '<div style="padding:0.75rem 1.5rem;display:flex;flex-direction:column;gap:4px">'
      html += '<span style="font-size:0.75rem;color:var(--text-dim);margin-bottom:0.25rem">K-th access time (evict smallest):</span>'
      f.forEach(fr => {
        const kthTime = fr.history.length >= kRef.current ? fr.history[fr.history.length - kRef.current] : null
        html += `<div style="display:flex;align-items:center;gap:8px;font-family:var(--mono);font-size:0.82rem">
          <span style="color:var(--text-dim);min-width:60px">Frame ${fr.frameId}:</span>
          <span>${fr.pageId !== null ? 'P' + fr.pageId : '—'}</span>
          <span style="color:var(--text-dim);margin-left:auto">${kthTime !== null ? 'k-th@t=' + kthTime : fr.history.length + '/' + kRef.current + ' accesses'}</span>
        </div>`
      })
      html += '</div>'
      return html
    }
  }

  function chooseEvict() {
    const p = policyRef.current
    const f = framesRef.current
    if (p === 'lru') {
      for (let i = lruOrderRef.current.length - 1; i >= 0; i--) {
        const fi = lruOrderRef.current[i]
        if (f[fi].pinCount === 0) return fi
      }
      return -1
    } else if (p === 'clock') {
      let scanned = 0
      while (scanned < numFramesRef.current * 2) {
        const fr = f[clockHandRef.current]
        if (fr.pinCount === 0) {
          if (!fr.ref) return clockHandRef.current
          fr.ref = false
        }
        clockHandRef.current = (clockHandRef.current + 1) % numFramesRef.current
        scanned++
      }
      return -1
    } else {
      let victim = -1, oldestKth = Infinity, fewestAccesses = Infinity
      f.forEach((fr, i) => {
        if (fr.pinCount > 0) return
        if (fr.history.length < kRef.current) {
          if (fr.history.length < fewestAccesses) { fewestAccesses = fr.history.length; victim = i }
        } else if (victim === -1 || fr.history[fr.history.length - kRef.current] < oldestKth) {
          oldestKth = fr.history[fr.history.length - kRef.current]
          victim = i
        }
      })
      return victim
    }
  }

  function addLog(type, msg) {
    logRef.current.push({ type, msg })
    setLogEntries([...logRef.current])
  }

  function doReset(p, nf, k) {
    const pol = p ?? policyRef.current
    const nfr = nf ?? numFramesRef.current
    const kv = k ?? kRef.current
    policyRef.current = pol
    numFramesRef.current = nfr
    kRef.current = kv
    framesRef.current = Array.from({ length: nfr }, (_, i) => ({ frameId: i, pageId: null, dirty: false, pinCount: 0, ref: false, history: [] }))
    hitsRef.current = 0; missesRef.current = 0; evictionsRef.current = 0
    clockHandRef.current = 0; lruOrderRef.current = []; logRef.current = []
    timeRef.current = 0
    setHits(0); setMisses(0); setEvictions(0)
    setLogEntries([])
    syncFrames({})
    setPolicyVizHtml(buildPolicyViz())
    setExpl('Request a page to see the buffer pool manager in action.', '')
    setWorkloadDesc('')
  }

  async function requestPage(pageId, markDirty) {
    if (busyRef.current) return
    busyRef.current = true
    timeRef.current++

    const existingFrame = framesRef.current.findIndex(f => f.pageId === pageId)
    if (existingFrame !== -1) {
      hitsRef.current++
      const f = framesRef.current[existingFrame]
      f.ref = true
      f.history.push(timeRef.current)
      if (markDirty) f.dirty = true
      if (policyRef.current === 'lru') {
        lruOrderRef.current = lruOrderRef.current.filter(i => i !== existingFrame)
        lruOrderRef.current.unshift(existingFrame)
      } else if (policyRef.current === 'clock') {
        clockHandRef.current = (clockHandRef.current + 1) % numFramesRef.current
      }
      syncFrames({ [existingFrame]: 'active' })
      setPolicyVizHtml(buildPolicyViz())
      setHits(hitsRef.current)
      addLog('hit', `t=${timeRef.current}: Page ${pageId} → HIT in Frame ${existingFrame}${markDirty ? ' (dirty)' : ''}`)
      setExpl(`HIT! Page ${pageId} already in Frame ${existingFrame}.${markDirty ? ' Marked dirty.' : ''}`, 'success')
      await sleep(500)
      syncFrames({})
      busyRef.current = false
      return
    }

    missesRef.current++
    addLog('miss', `t=${timeRef.current}: Page ${pageId} → MISS, need to load from disk`)
    setExpl(`MISS: Page ${pageId} not in buffer pool. Need to load from disk.`, 'warning')
    setMisses(missesRef.current)
    await sleep(400)

    let targetFrame = framesRef.current.findIndex(f => f.pageId === null)
    if (targetFrame === -1) {
      targetFrame = chooseEvict()
      if (targetFrame === -1) {
        setExpl('All frames are pinned! Cannot evict.', 'danger')
        busyRef.current = false
        return
      }
      const victim = framesRef.current[targetFrame]
      evictionsRef.current++
      const dirtyMsg = victim.dirty ? ' (writing dirty page to disk)' : ''
      addLog('evict', `t=${timeRef.current}: Evicting Page ${victim.pageId} from Frame ${targetFrame}${dirtyMsg}`)
      setExpl(`Evicting Page ${victim.pageId} from Frame ${targetFrame}${dirtyMsg}`, 'danger')
      setEvictions(evictionsRef.current)
      syncFrames({ [targetFrame]: 'evicting' })
      await sleep(500)

      if (policyRef.current === 'lru') {
        lruOrderRef.current = lruOrderRef.current.filter(i => i !== targetFrame)
      }
      victim.pageId = null; victim.dirty = false; victim.ref = false; victim.history = []
    }

    syncFrames({ [targetFrame]: 'loading' })
    setExpl(`Loading Page ${pageId} into Frame ${targetFrame} from disk...`, '')
    await sleep(400)

    const f = framesRef.current[targetFrame]
    f.pageId = pageId; f.dirty = markDirty; f.ref = true; f.history = [timeRef.current]

    if (policyRef.current === 'lru') {
      lruOrderRef.current.unshift(targetFrame)
    } else if (policyRef.current === 'clock') {
      clockHandRef.current = (targetFrame + 1) % numFramesRef.current
    }

    syncFrames({ [targetFrame]: 'loading' })
    setPolicyVizHtml(buildPolicyViz())
    addLog('miss', `t=${timeRef.current}: Page ${pageId} loaded into Frame ${targetFrame}`)
    setExpl(`Page ${pageId} loaded into Frame ${targetFrame}.${markDirty ? ' Marked dirty.' : ''}`, 'success')
    await sleep(300)
    syncFrames({})
    busyRef.current = false
  }

  async function runWorkload(type) {
    if (busyRef.current) return
    doReset()
    const workloads = {
      sequential: { pages: [1,2,3,4,5,6,7,8], desc: 'Sequential: pages 1-8. Watch how hot pages get evicted by later pages (sequential flooding).' },
      random: { pages: [3,7,1,5,3,8,2,7,1,4], desc: 'Random: 10 accesses to pages 1-8. Some pages will be re-requested (hits).' },
      hot: { pages: [1,2,3,1,2,3,1,4,1,2,3], desc: 'Hot set: pages 1-3 accessed repeatedly with occasional page 4. Good locality!' },
      scan: { pages: [1,2,3,4,5,6,7,8,9,10,1,2,3], desc: 'Full scan: pages 1-10 then re-access 1-3. LRU will have evicted them!' }
    }
    const wl = workloads[type]
    setWorkloadDesc(wl.desc)
    for (const p of wl.pages) { await requestPage(p, false); await sleep(200) }
  }

  const policyInfos = {
    lru: { title: 'LRU', desc: <><b style={{ color: 'var(--accent)' }}>Least Recently Used</b><br />Evicts the frame accessed longest ago. Tracks recency with a linked list.<br /><br /><b>Pros:</b> Good temporal locality<br /><b>Cons:</b> Sequential scans cause "cache pollution" (evicts hot pages)</> },
    clock: { title: 'Clock', desc: <><b style={{ color: 'var(--accent4)' }}>Clock (Second Chance)</b><br />Approximates LRU without exact timestamps. A clock hand sweeps frames. If ref bit=1, clear it and advance. If ref bit=0, evict.<br /><br /><b>Pros:</b> O(1) overhead, no timestamps<br /><b>Cons:</b> Less precise than LRU</> },
    lruk: { title: 'LRU-K', desc: <><b style={{ color: 'var(--accent3)' }}>LRU-K</b><br />Tracks K most recent access times per frame. Evicts frame with oldest K-th access. Pages accessed &lt; K times get lowest priority.<br /><br /><b>Pros:</b> Resistant to sequential flooding<br /><b>Cons:</b> More bookkeeping; K=2 is MySQL's approx implementation</> }
  }

  const total = hitsRef.current + missesRef.current
  const hitRate = total ? Math.round(hitsRef.current / total * 100) + '%' : '—'

  return (
    <>
      <style>{BP_STYLES}</style>
      <div className="page">
        <div className="page-header">
          <div className="page-title">Buffer Pool Manager</div>
          <div className="page-desc">The buffer pool caches disk pages in memory frames. When all frames are full and a new page is needed, a replacement policy chooses which frame to evict.</div>
        </div>

        <div className="tabs">
          {['lru', 'clock', 'lruk'].map((p, i) => (
            <div key={p} className={`tab${policy === p ? ' active' : ''}`} onClick={() => { setPolicy(p); policyRef.current = p; doReset(p) }}>{['LRU', 'Clock', 'LRU-K'][i]}</div>
          ))}
        </div>

        <div className="two-col">
          <div>
            <div className="viz-area">
              <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div className="legend">
                  <div className="legend-item"><div className="legend-dot" style={{ background: '#2a2200', border: '2px solid var(--highlight)' }}></div> Active</div>
                  <div className="legend-item"><div className="legend-dot" style={{ background: '#2a0a0a', border: '2px solid var(--danger)' }}></div> Evicting</div>
                  <div className="legend-item"><div className="legend-dot" style={{ background: '#0d2a1a', border: '2px solid var(--success)' }}></div> Loading</div>
                  <div className="legend-item"><div className="legend-dot" style={{ background: '#1a1440', border: '2px solid var(--accent)' }}></div> Pinned</div>
                </div>
                <div className="stats">
                  <div className="stat"><div className="stat-val">{hits}</div><div className="stat-lbl">Hits</div></div>
                  <div className="stat"><div className="stat-val">{misses}</div><div className="stat-lbl">Misses</div></div>
                  <div className="stat"><div className="stat-val">{evictions}</div><div className="stat-lbl">Evictions</div></div>
                  <div className="stat"><div className="stat-val">{hitRate}</div><div className="stat-lbl">Hit Rate</div></div>
                </div>
              </div>

              <div className="frame-grid">
                {frames.map(f => {
                  const cls = highlight[f.frameId] || ''
                  const badge = f.pageId === null ? <span className="frame-badge badge-empty">empty</span> :
                    (f.dirty ? <span className="frame-badge badge-dirty">dirty</span> : <span className="frame-badge badge-clean">clean</span>)
                  const refBadge = f.ref ? <span className="frame-badge badge-ref">ref=1</span> : null
                  const pinBadge = f.pinCount > 0 ? <span className="frame-badge badge-pin">pinned({f.pinCount})</span> : null
                  const histStr = policy === 'lruk' && f.history.length > 0
                    ? `hist: [${f.history.slice(-kVal).join(', ')}]` : ''
                  return (
                    <div key={f.frameId} className={`frame ${cls}`}>
                      <div className="frame-id">Frame {f.frameId}</div>
                      <div className="frame-page">{f.pageId !== null ? 'Page ' + f.pageId : '—'}</div>
                      <div className="frame-meta">{histStr}</div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>{badge}{refBadge}{pinBadge}</div>
                    </div>
                  )
                })}
              </div>

              <div dangerouslySetInnerHTML={{ __html: policyVizHtml }} />

              <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border)' }}>
                <div className={`explanation${explanation.type ? ' ' + explanation.type : ''}`}>{explanation.msg}</div>
              </div>
            </div>

            <div className="card" style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div className="card-title" style={{ margin: 0 }}>I/O Log</div>
                <button className="btn btn-ghost btn-sm" onClick={() => { logRef.current = []; setLogEntries([]) }}>Clear</button>
              </div>
              <div className="io-log">
                {logEntries.length === 0
                  ? <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textAlign: 'center', padding: '0.5rem' }}>No requests yet</div>
                  : [...logEntries].slice(-30).reverse().map((e, i) => (
                    <div key={i} className={`io-entry io-${e.type}`}>{e.msg}</div>
                  ))
                }
              </div>
            </div>
          </div>

          <div className="controls">
            <div className="card">
              <div className="card-title">Configuration</div>
              <div className="input-row">
                <label>Frames</label>
                <select value={numFrames} onChange={e => { const v = parseInt(e.target.value); setNumFrames(v); doReset(undefined, v) }}>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                </select>
              </div>
              {policy === 'lruk' && (
                <div className="input-row" style={{ marginTop: '0.5rem' }}>
                  <label>K value</label>
                  <select value={kVal} onChange={e => { const v = parseInt(e.target.value); setKVal(v); kRef.current = v; doReset(undefined, undefined, v) }}>
                    <option value="2">K = 2</option>
                    <option value="3">K = 3</option>
                  </select>
                </div>
              )}
              <button className="btn btn-ghost" style={{ width: '100%', marginTop: '0.75rem' }} onClick={() => doReset()}>Reset</button>
            </div>

            <div className="card">
              <div className="card-title">Request Page</div>
              <div className="input-row">
                <input type="number" value={pageReq} onChange={e => setPageReq(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { const v = parseInt(pageReq); if (!isNaN(v) && v > 0) requestPage(v, dirty) } }} placeholder="page #" min="1" max="20" />
                <button className="btn btn-primary" onClick={() => { const v = parseInt(pageReq); if (!isNaN(v) && v > 0) requestPage(v, dirty) }}>Request</button>
              </div>
              <div className="input-row" style={{ marginTop: '0.5rem' }}>
                <label>Dirty?</label>
                <input type="checkbox" checked={dirty} onChange={e => setDirty(e.target.checked)} style={{ width: 'auto', flex: 'none' }} />
                <label style={{ minWidth: 'auto', fontSize: '0.82rem', color: 'var(--text-dim)' }}>Mark frame dirty after access</label>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Workloads</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>Try these access patterns:</div>
              <div className="btn-group">
                {['sequential', 'random', 'hot', 'scan'].map(t => (
                  <button key={t} className="btn btn-ghost btn-sm" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }} onClick={() => runWorkload(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                ))}
              </div>
              {workloadDesc && <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>{workloadDesc}</div>}
            </div>

            <div className="card">
              <div className="card-title">Policy: {policyInfos[policy].title}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: '1.9' }}>{policyInfos[policy].desc}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
