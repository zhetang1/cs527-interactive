import React, { useState, useRef, useCallback, useEffect } from 'react'

const SCHEDULES = [
  { name: 'Basic Read Conflict', ops: [
    {t:0,txn:0,type:'R',obj:'A'}, {t:1,txn:1,type:'R',obj:'A'},
    {t:2,txn:0,type:'W',obj:'A'}, {t:3,txn:1,type:'R',obj:'A'},
    {t:4,txn:0,type:'C',obj:null}, {t:5,txn:1,type:'C',obj:null}
  ]},
  { name: 'Write-Write Conflict', ops: [
    {t:0,txn:0,type:'W',obj:'A'}, {t:1,txn:1,type:'W',obj:'A'},
    {t:2,txn:0,type:'W',obj:'B'}, {t:3,txn:1,type:'W',obj:'B'},
    {t:4,txn:0,type:'C',obj:null}, {t:5,txn:1,type:'C',obj:null}
  ]},
  { name: '2PL Serializable', ops: [
    {t:0,txn:0,type:'R',obj:'A'}, {t:1,txn:0,type:'W',obj:'B'},
    {t:2,txn:0,type:'C',obj:null},
    {t:3,txn:1,type:'R',obj:'A'}, {t:4,txn:1,type:'R',obj:'B'},
    {t:5,txn:1,type:'C',obj:null}
  ]},
  { name: 'Deadlock Scenario', ops: [
    {t:0,txn:0,type:'W',obj:'A'}, {t:1,txn:1,type:'W',obj:'B'},
    {t:2,txn:0,type:'W',obj:'B'}, {t:3,txn:1,type:'W',obj:'A'},
    {t:4,txn:0,type:'C',obj:null}, {t:5,txn:1,type:'C',obj:null}
  ]}
]

const TXN_NAMES = ['T1', 'T2', 'T3']

function canGrantFn(locks, obj, txn, type) {
  if (!locks[obj]) return true
  const { holders } = locks[obj]
  if (holders.length === 0) return true
  if (type === 'S') return holders.every(h => h.type === 'S' || h.txn === txn)
  if (type === 'X') return holders.every(h => h.txn === txn)
  return false
}

// ── Schedule Simulator ──────────────────────────────────────────
function ScheduleSimulator() {
  const [schedIdx, setSchedIdx] = useState(0)
  const [step, setStep] = useState(0)
  const [locks, setLocks] = useState({})
  const [explanation, setExplanation] = useState({ msg: 'Step through the schedule. 2PL automatically acquires locks before reads/writes.', type: '' })
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef(null)

  const ops = SCHEDULES[schedIdx].ops

  function buildReset(idx) {
    clearInterval(timerRef.current)
    setPlaying(false)
    setStep(0)
    setLocks({})
    setSchedIdx(idx)
    setExplanation({ msg: 'Step through the schedule. 2PL automatically acquires locks before reads/writes.', type: '' })
  }

  function applyStep(currentStep, currentLocks) {
    if (currentStep >= ops.length) return { newStep: currentStep, newLocks: currentLocks, expl: null }
    const op = ops[currentStep]
    const newLocks = JSON.parse(JSON.stringify(currentLocks))
    let expl = null

    if (op.type === 'R' || op.type === 'W') {
      const lockType = op.type === 'R' ? 'S' : 'X'
      if (!newLocks[op.obj]) newLocks[op.obj] = { holders: [], waiters: [] }
      const lk = newLocks[op.obj]
      const alreadyHolds = lk.holders.some(h => h.txn === op.txn && (h.type === lockType || h.type === 'X'))
      if (!alreadyHolds) {
        if (canGrantFn(newLocks, op.obj, op.txn, lockType)) {
          const existing = lk.holders.findIndex(h => h.txn === op.txn)
          if (existing !== -1) lk.holders.splice(existing, 1)
          lk.holders.push({ txn: op.txn, type: lockType })
          expl = { msg: `${TXN_NAMES[op.txn]}: Granted ${lockType}-Lock(${op.obj}). ${op.type}(${op.obj}) executed.`, type: 'success' }
        } else {
          lk.waiters.push({ txn: op.txn, type: lockType })
          expl = { msg: `${TXN_NAMES[op.txn]}: ${lockType}-Lock(${op.obj}) DENIED — conflict with ${lk.holders.map(h => TXN_NAMES[h.txn]).join(',')} holding ${lk.holders[0].type}-lock. Blocks.`, type: 'danger' }
        }
      } else {
        expl = { msg: `${TXN_NAMES[op.txn]}: Already holds ${lockType}-Lock(${op.obj}). ${op.type}(${op.obj}) executed.`, type: '' }
      }
    } else if (op.type === 'C') {
      for (const obj in newLocks) {
        newLocks[obj].holders = newLocks[obj].holders.filter(h => h.txn !== op.txn)
        while (newLocks[obj].waiters.length > 0) {
          const next = newLocks[obj].waiters[0]
          if (canGrantFn(newLocks, obj, next.txn, next.type)) {
            newLocks[obj].holders.push(newLocks[obj].waiters.shift())
          } else break
        }
      }
      expl = { msg: `${TXN_NAMES[op.txn]}: COMMIT. All locks released (Strict 2PL).`, type: 'success' }
    }

    return { newStep: currentStep + 1, newLocks, expl }
  }

  function stepForward() {
    setStep(prev => {
      const { newStep, newLocks, expl } = applyStep(prev, locks)
      setLocks(newLocks)
      if (expl) setExplanation(expl)
      return newStep
    })
  }

  // Because stepForward closes over locks, use a ref for auto-play
  const stateRef = useRef({ step: 0, locks: {} })
  stateRef.current = { step, locks }

  function doStepRef() {
    const { step: s, locks: l } = stateRef.current
    if (s >= ops.length) {
      clearInterval(timerRef.current)
      setPlaying(false)
      return
    }
    const { newStep, newLocks, expl } = applyStep(s, l)
    setStep(newStep)
    setLocks(newLocks)
    if (expl) setExplanation(expl)
  }

  function togglePlay() {
    if (playing) {
      clearInterval(timerRef.current)
      setPlaying(false)
    } else {
      setPlaying(true)
      timerRef.current = setInterval(doStepRef, 800)
    }
  }

  useEffect(() => () => clearInterval(timerRef.current), [])

  // Step back: re-apply from 0
  function stepBack() {
    if (step <= 1) { buildReset(schedIdx); return }
    const target = step - 2
    let s = 0, l = {}
    for (let i = 0; i <= target; i++) {
      const r = applyStep(s, l)
      s = r.newStep; l = r.newLocks
    }
    setStep(s)
    setLocks(l)
  }

  // Render schedule columns
  const numTxns = Math.max(...ops.map(o => o.txn)) + 1
  const cols = Array.from({ length: numTxns }, () => [])
  ops.forEach((op, i) => cols[op.txn].push({ ...op, opIdx: i }))

  const lockEntries = Object.entries(locks).filter(([, v]) => v.holders.length > 0 || v.waiters.length > 0)

  return (
    <div className="two-col">
      <div>
        <div className="viz-area">
          <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="legend">
              <div className="legend-item"><span className="op-lock s-lock">S</span> Shared (read)</div>
              <div className="legend-item"><span className="op-lock x-lock">X</span> Exclusive (write)</div>
              <div className="legend-item"><span className="op-lock denied">⊗</span> Denied</div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>t = {step}</div>
          </div>

          <div style={{ padding: '1rem 1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: cols.map(() => '1fr').join(' '), gap: '1rem' }}>
              {cols.map((col, ti) => (
                <div key={ti}>
                  <div className={`txn-header txn-t${ti + 1}`}>{TXN_NAMES[ti]}</div>
                  {col.map(op => {
                    const past = op.t < step
                    const current = op.t === step - 1
                    const typeCls = op.type === 'C' ? 'committed' : past ? 'done' : current ? 'executing' : ''
                    return (
                      <div key={op.t} className={`op-row ${typeCls}`}>
                        <span className="op-keyword">
                          {op.type === 'R' ? `R(${op.obj})` : op.type === 'W' ? `W(${op.obj})` : 'COMMIT'}
                        </span>
                        {op.type === 'R' && <span className="op-lock s-lock">S</span>}
                        {op.type === 'W' && <span className="op-lock x-lock">X</span>}
                        <span style={{ color: 'var(--text-dim)', marginLeft: 'auto', fontSize: '0.7rem' }}>t={op.t}</span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border)' }}>
            <div className={`explanation ${explanation.type}`}>{explanation.msg}</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div className="card-title" style={{ margin: 0 }}>Lock Manager Table</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Granted / Waiting</div>
          </div>
          <div className="lock-table">
            {lockEntries.length === 0
              ? <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textAlign: 'center', padding: '0.5rem' }}>No locks held</div>
              : lockEntries.map(([obj, { holders, waiters }]) => (
                <div key={obj} className="lock-entry">
                  <div className="lock-obj">{obj}</div>
                  <div className="lock-holder">
                    {holders.length === 0
                      ? <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>free</span>
                      : holders.map((h, i) => <span key={i} className={`lock-badge t${h.txn + 1}-badge`}>{TXN_NAMES[h.txn]}:{h.type}</span>)
                    }
                  </div>
                  <div className="lock-waiter">
                    {waiters.map((h, i) => (
                      <span key={i} className="lock-badge" style={{ background: 'rgba(255,101,132,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
                        {TXN_NAMES[h.txn]}:{h.type} waiting
                      </span>
                    ))}
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      <div className="controls">
        <div className="card">
          <div className="card-title">Schedule</div>
          <select style={{ width: '100%' }} value={schedIdx} onChange={e => buildReset(parseInt(e.target.value))}>
            {SCHEDULES.map((s, i) => <option key={i} value={i}>{s.name}</option>)}
          </select>
          <div className="btn-group" style={{ marginTop: '0.75rem' }}>
            <button className="btn btn-ghost" onClick={() => buildReset(schedIdx)}>Reset</button>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Step Controls</div>
          <div className="step-controls">
            <button className="btn btn-ghost btn-sm" onClick={stepBack} disabled={step === 0}>← Prev</button>
            <div className="step-info">t = {step} / {ops.length}</div>
            <button className="btn btn-ghost btn-sm" onClick={stepForward} disabled={step >= ops.length}>Next →</button>
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={togglePlay}>
              {playing ? '⏸ Pause' : '▶ Auto Play'}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-title">2PL Rules</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: 2 }}>
            <b style={{ color: 'var(--accent)' }}>Growing Phase:</b><br />
            • Acquire any lock<br />
            • Cannot release yet<br /><br />
            <b style={{ color: 'var(--accent3)' }}>Shrinking Phase:</b><br />
            • Release locks<br />
            • Cannot acquire new locks<br /><br />
            <b style={{ color: 'var(--success)' }}>Strict 2PL:</b><br />
            • Hold ALL locks until<br />
            &nbsp;&nbsp;commit/abort<br />
            • Prevents cascading aborts
          </div>
        </div>

        <div className="card">
          <div className="card-title">Compatibility Matrix</div>
          <table className="compat-matrix">
            <tbody>
              <tr><th>Req\Held</th><th>S-LOCK</th><th>X-LOCK</th><th>none</th></tr>
              <tr><td>S-LOCK</td><td className="yes">✓</td><td className="no">✗</td><td className="yes">✓</td></tr>
              <tr><td>X-LOCK</td><td className="no">✗</td><td className="no">✗</td><td className="yes">✓</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Lock Compatibility ───────────────────────────────────────────
function LockCompatibility() {
  const [locks, setLocks] = useState({})
  const [explanation, setExplanation] = useState({ msg: 'Click buttons to request/release locks on objects A and B.', type: '' })

  function request(txn, obj, type) {
    setLocks(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      if (!next[obj]) next[obj] = { holders: [], waiters: [] }
      const lk = next[obj]
      const existing = lk.holders.find(h => h.txn === txn)
      if (existing) {
        if (existing.type === type || (type === 'S' && existing.type === 'X')) {
          setExplanation({ msg: `${txn} already holds ${existing.type}-Lock(${obj}).`, type: '' })
          return prev
        }
        if (type === 'X' && existing.type === 'S') {
          if (lk.holders.length === 1) {
            existing.type = 'X'
            setExplanation({ msg: `${txn}: Upgraded S→X on ${obj} (sole holder). Granted!`, type: 'success' })
          } else {
            setExplanation({ msg: `${txn}: Cannot upgrade S→X on ${obj} — other holders exist.`, type: 'danger' })
            return prev
          }
          return next
        }
      }
      const canGet = type === 'S'
        ? lk.holders.every(h => h.type === 'S' || h.txn === txn)
        : lk.holders.every(h => h.txn === txn)
      if (canGet) {
        lk.holders.push({ txn, type })
        setExplanation({ msg: `${txn}: Granted ${type}-Lock(${obj}). ✓`, type: 'success' })
      } else {
        setExplanation({ msg: `${txn}: DENIED ${type}-Lock(${obj}) — conflicts with ${lk.holders.map(h => h.txn + ':' + h.type).join(', ')}. Would block.`, type: 'danger' })
        return prev
      }
      return next
    })
  }

  function release(txn, obj) {
    setLocks(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      if (!next[obj]) { setExplanation({ msg: `${txn}: Had no lock on ${obj}.`, type: '' }); return prev }
      const before = next[obj].holders.length
      next[obj].holders = next[obj].holders.filter(h => h.txn !== txn)
      setExplanation({ msg: before > next[obj].holders.length ? `${txn}: Released lock on ${obj}.` : `${txn}: Had no lock on ${obj}.`, type: '' })
      return next
    })
  }

  const lockEntries = Object.entries(locks).filter(([, v]) => v.holders.length > 0)

  return (
    <div className="two-col">
      <div>
        <div className="viz-area" style={{ padding: '1.5rem' }}>
          <div className="card-title">Lock Compatibility Demonstrator</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1.5rem' }}>
            Multiple transactions can hold S-locks simultaneously. An X-lock requires exclusive access.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            {['T1', 'T2'].map(txn => (
              <div key={txn} className="card">
                <div className="card-title">Transaction {txn}</div>
                {['A', 'B'].map(obj => (
                  <div key={obj} className="btn-group" style={{ marginBottom: '0.5rem' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => request(txn, obj, 'S')}>S-Lock({obj})</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => request(txn, obj, 'X')}>X-Lock({obj})</button>
                    <button className="btn btn-danger btn-sm" onClick={() => release(txn, obj)}>Release({obj})</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-title">Lock State</div>
            <div className="lock-table">
              {lockEntries.length === 0
                ? <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textAlign: 'center', padding: '0.5rem' }}>No locks held</div>
                : lockEntries.map(([obj, { holders }]) => (
                  <div key={obj} className="lock-entry">
                    <div className="lock-obj">{obj}</div>
                    <div className="lock-holder">
                      {holders.map((h, i) => (
                        <span key={i} className="lock-badge" style={{ background: 'rgba(108,99,255,0.15)', border: '1px solid var(--accent)', color: 'var(--accent)' }}>
                          {h.txn}:{h.type}
                        </span>
                      ))}
                    </div>
                    <div />
                  </div>
                ))
              }
            </div>
          </div>
          <div className={`explanation ${explanation.type}`}>{explanation.msg}</div>
        </div>
      </div>
      <div className="controls">
        <div className="card">
          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => { setLocks({}); setExplanation({ msg: 'Click buttons to request/release locks on objects A and B.', type: '' }) }}>
            Reset All Locks
          </button>
        </div>
        <div className="card">
          <div className="card-title">Rules</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: 1.9 }}>
            <b style={{ color: 'var(--success)' }}>S + S:</b> Both granted ✓<br />
            <b style={{ color: 'var(--danger)' }}>S + X:</b> X must wait ✗<br />
            <b style={{ color: 'var(--danger)' }}>X + S:</b> S must wait ✗<br />
            <b style={{ color: 'var(--danger)' }}>X + X:</b> Second must wait ✗<br /><br />
            Shared = read-only<br />
            Exclusive = read + write<br /><br />
            Upgrade: S → X only if<br />
            you are the sole S-holder
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Deadlock Detection ───────────────────────────────────────────
function DeadlockDetection() {
  const [dlLocks, setDlLocks] = useState({})
  const [waitsFor, setWaitsFor] = useState([])
  const [explanation, setExplanation] = useState({ msg: 'Run a scenario to see how deadlocks form and how they are detected.', type: '' })
  const svgRef = useRef(null)

  function dlReset() {
    setDlLocks({})
    setWaitsFor([])
    setExplanation({ msg: 'Run a scenario to see how deadlocks form and how they are detected.', type: '' })
  }

  function buildScenario(scenario) {
    const locks = {}
    const wf = []
    function acquire(txn, obj, type) {
      if (!locks[obj]) locks[obj] = { holders: [], waiters: [] }
      const lk = locks[obj]
      const canGet = type === 'S' ? lk.holders.every(h => h.type === 'S' || h.txn === txn)
                                  : lk.holders.every(h => h.txn === txn)
      if (lk.holders.length === 0 || canGet) {
        if (!lk.holders.some(h => h.txn === txn)) lk.holders.push({ txn, type })
      } else {
        lk.waiters.push({ txn, type })
        lk.holders.forEach(h => {
          if (h.txn !== txn && !wf.some(e => e.from === txn && e.to === h.txn)) {
            wf.push({ from: txn, to: h.txn, obj })
          }
        })
      }
    }
    if (scenario === 't2') {
      acquire('T1','A','X'); acquire('T2','B','X')
      acquire('T1','B','X'); acquire('T2','A','X')
      setExplanation({ msg: 'T1 holds A, waits for B. T2 holds B, waits for A. → DEADLOCK!', type: 'danger' })
    } else {
      acquire('T1','A','X'); acquire('T2','B','X'); acquire('T3','C','X')
      acquire('T1','B','X'); acquire('T2','C','X'); acquire('T3','A','X')
      setExplanation({ msg: 'T1→B→T2→C→T3→A→T1. Cycle of length 3 → DEADLOCK!', type: 'danger' })
    }
    setDlLocks(locks)
    setWaitsFor(wf)
  }

  function detectDeadlock() {
    const txns = [...new Set(waitsFor.flatMap(e => [e.from, e.to]))]
    const adj = {}
    txns.forEach(t => { adj[t] = [] })
    waitsFor.forEach(e => adj[e.from].push(e.to))

    const visited = new Set(), inStack = new Set()
    let cycle = null
    function dfs(node, path) {
      if (inStack.has(node)) { cycle = path; return true }
      if (visited.has(node)) return false
      visited.add(node); inStack.add(node); path.push(node)
      for (const nb of (adj[node] || [])) { if (dfs(nb, [...path])) return true }
      inStack.delete(node); return false
    }
    for (const t of txns) { if (!visited.has(t) && dfs(t, [])) break }

    if (cycle) {
      const victim = cycle[cycle.length - 1]
      setDlLocks(prev => {
        const next = JSON.parse(JSON.stringify(prev))
        for (const obj in next) {
          next[obj].holders = next[obj].holders.filter(h => h.txn !== victim)
          next[obj].waiters = next[obj].waiters.filter(h => h.txn !== victim)
        }
        return next
      })
      setWaitsFor(prev => prev.filter(e => e.from !== victim && e.to !== victim))
      setExplanation({ msg: `Deadlock detected! Cycle: ${cycle.join(' → ')}. Aborted victim: ${victim}.`, type: 'warning' })
    } else {
      setExplanation({ msg: 'No deadlock detected.', type: 'success' })
    }
  }

  // Render SVG waits-for graph
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const W = svg.clientWidth || 300, H = 300
    const txns = [...new Set(waitsFor.flatMap(e => [e.from, e.to]))]
    if (txns.length === 0) {
      svg.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="#555" font-size="14">No transactions</text>'
      return
    }
    const cx = W / 2, cy = H / 2, R = Math.min(cx, cy) * 0.65
    const positions = {}
    txns.forEach((t, i) => {
      const angle = (i / txns.length) * 2 * Math.PI - Math.PI / 2
      positions[t] = { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) }
    })
    const colors = { T1: '#6c63ff', T2: '#43d9ad', T3: '#ffd166' }
    let html = '<defs><marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#ff6584"/></marker></defs>'
    waitsFor.forEach(e => {
      const from = positions[e.from], to = positions[e.to]
      if (!from || !to) return
      const dx = to.x - from.x, dy = to.y - from.y, len = Math.sqrt(dx * dx + dy * dy)
      const nx = dx / len, ny = dy / len, r = 22
      html += `<line x1="${from.x + nx * r}" y1="${from.y + ny * r}" x2="${to.x - nx * r}" y2="${to.y - ny * r}" stroke="#ff6584" stroke-width="2" marker-end="url(#arr)"/>`
    })
    txns.forEach(t => {
      const p = positions[t], col = colors[t] || '#888'
      html += `<circle cx="${p.x}" cy="${p.y}" r="22" fill="${col}22" stroke="${col}" stroke-width="2"/>`
      html += `<text x="${p.x}" y="${p.y + 5}" text-anchor="middle" fill="${col}" font-size="13" font-weight="700" font-family="monospace">${t}</text>`
    })
    svg.innerHTML = html
  }, [waitsFor])

  const lockEntries = Object.entries(dlLocks).filter(([, v]) => v.holders.length > 0 || v.waiters.length > 0)

  // Cycle detection for highlight
  const adj = {}
  waitsFor.forEach(e => { if (!adj[e.from]) adj[e.from] = []; adj[e.from].push(e.to) })
  const inCycle = new Set()
  waitsFor.forEach(e => {
    const visited2 = new Set(), stack = [e.to]
    while (stack.length) {
      const n = stack.pop()
      if (n === e.from) { inCycle.add(e.from); inCycle.add(e.to); break }
      if (!visited2.has(n)) { visited2.add(n); (adj[n] || []).forEach(nb => stack.push(nb)) }
    }
  })

  return (
    <div className="two-col">
      <div>
        <div className="viz-area">
          <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Build a waits-for graph. A cycle = deadlock.</div>
          </div>
          <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <div className="card-title">Lock State</div>
              <div className="lock-table">
                {lockEntries.length === 0
                  ? <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textAlign: 'center', padding: '0.5rem' }}>No locks</div>
                  : lockEntries.map(([obj, { holders, waiters }]) => (
                    <div key={obj} className="lock-entry">
                      <div className="lock-obj">{obj}</div>
                      <div className="lock-holder">{holders.map((h, i) => <span key={i} className="lock-badge" style={{ background: 'rgba(108,99,255,0.15)', border: '1px solid var(--accent)', color: 'var(--accent)' }}>{h.txn}:{h.type}</span>)}</div>
                      <div className="lock-waiter">{waiters.map((h, i) => <span key={i} className="lock-badge" style={{ background: 'rgba(255,101,132,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>{h.txn} waiting</span>)}</div>
                    </div>
                  ))
                }
              </div>
              <div style={{ marginTop: '1rem' }}>
                <div className="card-title">Waits-For Graph</div>
                <div className="waits-for">
                  {waitsFor.length === 0
                    ? <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>No waits</div>
                    : waitsFor.map((e, i) => (
                      <div key={i} className={`wf-edge ${inCycle.has(e.from) && inCycle.has(e.to) ? 'cycle' : ''}`}>
                        {e.from} <span style={{ color: 'var(--danger)' }}>→</span> {e.to}
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginLeft: 'auto' }}>waiting for {e.obj}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
            <div>
              <svg ref={svgRef} width="100%" height="300" style={{ background: 'var(--surface2)', borderRadius: '8px', border: '1px solid var(--border)' }} />
            </div>
          </div>
          <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border)' }}>
            <div className={`explanation ${explanation.type}`}>{explanation.msg}</div>
          </div>
        </div>
      </div>
      <div className="controls">
        <div className="card">
          <div className="card-title">Deadlock Scenarios</div>
          <div className="btn-group">
            <button className="btn btn-primary" onClick={() => buildScenario('t2')}>2-Transaction</button>
            <button className="btn btn-primary" onClick={() => buildScenario('t3')}>3-Transaction</button>
          </div>
          <button className="btn btn-danger" style={{ width: '100%', marginTop: '0.75rem' }} onClick={detectDeadlock}>Detect &amp; Abort Victim</button>
          <button className="btn btn-ghost" style={{ width: '100%', marginTop: '0.5rem' }} onClick={dlReset}>Reset</button>
        </div>
        <div className="card">
          <div className="card-title">Detection Methods</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: 1.9 }}>
            <b style={{ color: 'var(--accent)' }}>Waits-For Graph:</b><br />
            Build directed graph: Ti→Tj if Ti waits for Tj to release a lock.<br />
            Deadlock ↔ cycle in graph.<br /><br />
            <b style={{ color: 'var(--accent3)' }}>Resolution:</b><br />
            • Abort youngest txn (victim)<br />
            • Or use timeouts<br /><br />
            <b style={{ color: 'var(--accent4)' }}>Prevention:</b><br />
            • Wait-Die: older waits, younger dies<br />
            • Wound-Wait: older wounds younger
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Locking Page ────────────────────────────────────────────
const pageStyle = `
  .txn-grid { display: grid; gap: 1rem; }
  .txn-col { display: flex; flex-direction: column; }
  .txn-header { text-align: center; font-size: 0.8rem; font-weight: 700; padding: 0.5rem; border-radius: 6px 6px 0 0; margin-bottom: 2px; }
  .txn-t1 { background: rgba(108,99,255,0.2); color: var(--accent); }
  .txn-t2 { background: rgba(67,217,173,0.2); color: var(--accent3); }
  .txn-t3 { background: rgba(255,209,102,0.2); color: var(--accent4); }
  .op-row { display: flex; gap: 6px; align-items: center; padding: 0.4rem 0.6rem; border-radius: 6px; font-family: var(--mono); font-size: 0.82rem; border: 1px solid var(--border); background: var(--surface2); margin-bottom: 3px; transition: all 0.3s; }
  .op-row.executing { border-color: var(--highlight); background: #2a2200; }
  .op-row.done { border-color: var(--border); background: var(--surface2); opacity: 0.6; }
  .op-row.blocked { border-color: var(--danger); background: #2a0a0a; }
  .op-row.committed { border-color: var(--success); background: #0d2a1a; }
  .op-row.aborted { border-color: var(--danger); background: #2a0a0a; opacity: 0.7; }
  .op-keyword { color: var(--accent4); font-weight: 700; }
  .op-obj { color: var(--accent3); }
  .op-lock { font-size: 0.7rem; padding: 0.1rem 0.3rem; border-radius: 3px; }
  .s-lock { background: rgba(108,99,255,0.2); color: var(--accent); border: 1px solid var(--accent); }
  .x-lock { background: rgba(255,101,132,0.2); color: var(--danger); border: 1px solid var(--danger); }
  .denied { background: rgba(255,101,132,0.15); color: var(--danger); border: 1px solid var(--danger); }
  .lock-table { display: flex; flex-direction: column; gap: 4px; }
  .lock-entry { display: grid; grid-template-columns: 60px 1fr 1fr; gap: 8px; align-items: center; background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; padding: 0.4rem 0.75rem; font-family: var(--mono); font-size: 0.82rem; }
  .lock-obj { color: var(--accent4); font-weight: 700; }
  .lock-holder { display: flex; gap: 4px; flex-wrap: wrap; }
  .lock-waiter { display: flex; gap: 4px; flex-wrap: wrap; }
  .lock-badge { padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.75rem; }
  .t1-badge { background: rgba(108,99,255,0.2); color: var(--accent); }
  .t2-badge { background: rgba(67,217,173,0.2); color: var(--accent3); }
  .t3-badge { background: rgba(255,209,102,0.2); color: var(--accent4); }
  .compat-matrix { border-collapse: collapse; }
  .compat-matrix td, .compat-matrix th { padding: 0.4rem 0.75rem; text-align: center; font-family: var(--mono); font-size: 0.85rem; border: 1px solid var(--border); }
  .compat-matrix th { background: var(--surface2); color: var(--text-dim); }
  .yes { color: var(--success); font-weight: 700; }
  .no { color: var(--danger); font-weight: 700; }
  .waits-for { display: flex; flex-direction: column; gap: 6px; font-family: var(--mono); font-size: 0.85rem; }
  .wf-edge { display: flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0.6rem; background: var(--surface2); border-radius: 6px; border: 1px solid var(--border); }
  .wf-edge.cycle { border-color: var(--danger); background: #2a0a0a; animation: pulse 1s infinite; }
`

export default function Locking() {
  const [activeTab, setActiveTab] = useState('simulator')

  return (
    <div className="page">
      <style>{pageStyle}</style>
      <div className="page-header">
        <div className="page-title">Two-Phase Locking &amp; Concurrency</div>
        <div className="page-desc">2PL guarantees conflict-serializable schedules. Growing phase: acquire locks. Shrinking phase: release locks. No lock acquisition after first release.</div>
      </div>

      <div className="tabs">
        {['simulator', 'compat', 'deadlock'].map(tab => (
          <div key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab === 'simulator' ? 'Schedule Simulator' : tab === 'compat' ? 'Lock Compatibility' : 'Deadlock Detection'}
          </div>
        ))}
      </div>

      {activeTab === 'simulator' && <ScheduleSimulator />}
      {activeTab === 'compat' && <LockCompatibility />}
      {activeTab === 'deadlock' && <DeadlockDetection />}
    </div>
  )
}
