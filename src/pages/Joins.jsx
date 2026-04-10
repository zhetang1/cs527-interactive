import React, { useState, useRef } from 'react'

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

const JOINS_STYLES = `
  .relation-table { display: flex; flex-direction: column; gap: 3px; }
  .tuple { display: grid; align-items: center; background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; padding: 0.35rem 0.6rem; font-family: var(--mono); font-size: 0.83rem; transition: all 0.25s; }
  .tuple.outer { border-left: 3px solid var(--accent); }
  .tuple.inner { border-left: 3px solid var(--accent3); }
  .tuple.active { background: #2a2200; border-color: var(--highlight); box-shadow: 0 0 8px rgba(255,209,102,0.3); }
  .tuple.matched { background: #0d2a1a; border-color: var(--success); }
  .tuple.scanning { background: #1a1440; border-color: var(--accent); }
  .tuple.build { background: #1a2440; border-color: var(--accent); }
  .tuple.probe { background: #0d3320; border-color: var(--success); }
  .join-layout { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; }
  .rel-header { font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 0.5rem; }
  .output-table { display: flex; flex-direction: column; gap: 3px; max-height: 300px; overflow-y: auto; }
  .output-tuple { background: rgba(67,217,173,0.1); border: 1px solid var(--success); border-radius: 6px; padding: 0.3rem 0.6rem; font-family: var(--mono); font-size: 0.82rem; animation: slideIn 0.3s ease-out; }
  .hash-buckets { display: flex; flex-direction: column; gap: 4px; }
  .hash-bucket { background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; padding: 0.4rem; }
  .bucket-head { font-size: 0.7rem; color: var(--accent); margin-bottom: 0.25rem; }
  .bucket-entries { display: flex; gap: 4px; flex-wrap: wrap; }
  .bucket-entry { background: #1a2440; border: 1px solid var(--accent); border-radius: 4px; padding: 0.2rem 0.5rem; font-family: var(--mono); font-size: 0.8rem; }
  .bucket-entry.probing { border-color: var(--highlight); background: #2a2200; color: var(--highlight); }
  .cost-box { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem; margin-top: 0.75rem; }
  .cost-row { display: flex; justify-content: space-between; font-size: 0.82rem; font-family: var(--mono); margin-bottom: 0.25rem; }
  .cost-val { color: var(--accent4); }
`

function genRelations(rSize, sSize) {
  const rKeys = Array.from({ length: rSize }, (_, i) => i + 1)
  const sKeys = Array.from({ length: sSize }, (_, i) => i + 2)
  const R = rKeys.map(k => ({ id: k, val: `r${k}` }))
  const S = sKeys.map(k => ({ id: k, val: `s${k}` }))
  return { R, S }
}

const HJ_BUCKETS = 4
function hjHash(key) { return key % HJ_BUCKETS }

// ============================================================
// NESTED LOOP JOIN
// ============================================================
function NLJ() {
  const [rSize, setRSize] = useState(4)
  const [sSize, setSSize] = useState(5)
  const [speed, setSpeed] = useState(300)
  const [rTuples, setRTuples] = useState(() => genRelations(4, 5).R)
  const [sTuples, setSTuples] = useState(() => genRelations(4, 5).S)
  const [rActive, setRActive] = useState(-1)
  const [sActive, setSActive] = useState(-1)
  const [output, setOutput] = useState([])
  const [comps, setComps] = useState(0)
  const [explanation, setExplanation] = useState({ msg: 'Naïve nested loop: for each tuple in R, scan all of S. Cost = |R| × |S| comparisons.', type: '' })
  const runningRef = useRef(false)

  function setExpl(msg, type) { setExplanation({ msg, type: type || '' }) }

  function doInit(rs, ss) {
    const r = rs ?? rSize, s = ss ?? sSize
    const { R, S } = genRelations(r, s)
    setRTuples(R); setSTuples(S)
    setRActive(-1); setSActive(-1); setOutput([]); setComps(0)
    setExpl('Naïve nested loop: for each tuple in R, scan all of S. Cost = |R| × |S| comparisons.', '')
    runningRef.current = false
  }

  async function doRun() {
    if (runningRef.current) return
    runningRef.current = true
    const { R, S } = genRelations(rSize, sSize)
    setRTuples(R); setSTuples(S)
    let c = 0
    const out = []
    setOutput([])

    for (let i = 0; i < R.length; i++) {
      setRActive(i)
      setExpl(`Outer: scanning R[${i}] (id=${R[i].id}). Now scan all of S...`, '')
      for (let j = 0; j < S.length; j++) {
        setSActive(j)
        c++; setComps(c)
        await sleep(speed)
        if (R[i].id === S[j].id) {
          out.push(`(${R[i].id}, ${R[i].val}, ${S[j].val})`)
          setOutput([...out])
          setExpl(`Match! R[${i}].id = S[${j}].id = ${R[i].id} → emit tuple.`, 'success')
          await sleep(speed)
        }
      }
    }
    setRActive(-1); setSActive(-1)
    setExpl(`Done! ${c} comparisons, ${out.length} output tuples.`, 'success')
    runningRef.current = false
  }

  const pr = Math.ceil(rTuples.length / 2), ps = Math.ceil(sTuples.length / 2)

  return (
    <div className="two-col">
      <div>
        <div className="viz-area">
          <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <div className="join-layout">
              <div>
                <div className="rel-header">R (Outer) — <span style={{ color: 'var(--accent)' }}>●</span></div>
                <div className="relation-table">
                  {rTuples.map((t, i) => (
                    <div key={i} className={`tuple outer${i === rActive ? ' active' : ''}`} style={{ gridTemplateColumns: '40px 1fr' }}>
                      {t.id}<span style={{ color: 'var(--text-dim)', marginLeft: '0.5rem' }}>{t.val}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="rel-header">S (Inner) — <span style={{ color: 'var(--accent3)' }}>●</span></div>
                <div className="relation-table">
                  {sTuples.map((t, i) => (
                    <div key={i} className={`tuple inner${i === sActive ? ' active' : ''}`} style={{ gridTemplateColumns: '40px 1fr' }}>
                      {t.id}<span style={{ color: 'var(--text-dim)', marginLeft: '0.5rem' }}>{t.val}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="rel-header">Output</div>
                <div className="output-table">
                  {output.length === 0
                    ? <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Run join to see output</div>
                    : output.map((o, i) => <div key={i} className="output-tuple">{o}</div>)
                  }
                </div>
              </div>
            </div>
          </div>
          <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border)' }}>
            <div className={`explanation${explanation.type ? ' ' + explanation.type : ''}`}>{explanation.msg}</div>
          </div>
        </div>
        <div className="cost-box">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '0.5rem' }}>Cost Analysis (I/O pages)</div>
          <div className="cost-row"><span>|R| pages</span><span className="cost-val">{pr}</span></div>
          <div className="cost-row"><span>|S| pages</span><span className="cost-val">{ps}</span></div>
          <div className="cost-row"><span>Comparisons</span><span className="cost-val">{comps}</span></div>
          <div className="cost-row" style={{ borderTop: '1px solid var(--border)', marginTop: '0.25rem', paddingTop: '0.25rem' }}>
            <span><b>Total I/O</b></span><span className="cost-val">{pr} + {rTuples.length} × {ps} = {pr + rTuples.length * ps}</span>
          </div>
        </div>
      </div>
      <div className="controls">
        <div className="card">
          <div className="card-title">Relations (R ⋈ S on id)</div>
          <div className="input-row">
            <label>R tuples</label>
            <select value={rSize} onChange={e => { const v = parseInt(e.target.value); setRSize(v); doInit(v, sSize) }}>
              <option value="4">4</option><option value="5">5</option><option value="6">6</option>
            </select>
          </div>
          <div className="input-row">
            <label>S tuples</label>
            <select value={sSize} onChange={e => { const v = parseInt(e.target.value); setSSize(v); doInit(rSize, v) }}>
              <option value="4">4</option><option value="5">5</option><option value="6">6</option>
            </select>
          </div>
          <div className="btn-group" style={{ marginTop: '0.75rem' }}>
            <button className="btn btn-primary" onClick={doRun}>▶ Run Join</button>
            <button className="btn btn-ghost" onClick={() => doInit()}>Reset</button>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Speed</div>
          <div className="input-row">
            <label>Delay</label>
            <select value={speed} onChange={e => setSpeed(parseInt(e.target.value))}>
              <option value="600">Slow</option><option value="300">Normal</option><option value="100">Fast</option>
            </select>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Algorithm</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: '1.9' }}>
            <b style={{ color: 'var(--accent)' }}>for</b> each r in R:<br />
            &nbsp;&nbsp;<b style={{ color: 'var(--accent)' }}>for</b> each s in S:<br />
            &nbsp;&nbsp;&nbsp;&nbsp;<b style={{ color: 'var(--accent)' }}>if</b> r.id == s.id:<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;emit(r, s)<br /><br />
            Cost = P_R + |R| × P_S<br />(naïve: tuple-level)
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SORT-MERGE JOIN
// ============================================================
function SMJ() {
  const [speed, setSpeed] = useState(300)
  const [rTuples, setRTuples] = useState(() => genRelations(5, 5).R.sort(() => Math.random() - 0.5))
  const [sTuples, setSTuples] = useState(() => genRelations(5, 5).S.sort(() => Math.random() - 0.5))
  const [rActive, setRActive] = useState(-1)
  const [sActive, setSActive] = useState(-1)
  const [output, setOutput] = useState([])
  const [comps, setComps] = useState(0)
  const [explanation, setExplanation] = useState({ msg: 'Sort-Merge: Phase 1 sorts both relations. Phase 2 merges with two pointers.', type: '' })
  const runningRef = useRef(false)
  const rRef = useRef(rTuples)
  const sRef = useRef(sTuples)

  function setExpl(msg, type) { setExplanation({ msg, type: type || '' }) }

  function doInit() {
    const { R, S } = genRelations(5, 5)
    const r = [...R].sort(() => Math.random() - 0.5)
    const s = [...S].sort(() => Math.random() - 0.5)
    rRef.current = r; sRef.current = s
    setRTuples(r); setSTuples(s)
    setRActive(-1); setSActive(-1); setOutput([]); setComps(0)
    setExpl('Sort-Merge: Phase 1 sorts both relations. Phase 2 merges with two pointers.', '')
    runningRef.current = false
  }

  async function doRun() {
    if (runningRef.current) return
    runningRef.current = true
    let r = [...rRef.current], s = [...sRef.current]
    let c = 0
    const out = []
    setOutput([])

    setExpl('Phase 1: Sorting R by id...', '')
    await sleep(speed * 1.5)
    r = [...r].sort((a, b) => a.id - b.id)
    rRef.current = r; setRTuples(r)

    setExpl('Phase 1: Sorting S by id...', '')
    await sleep(speed * 1.5)
    s = [...s].sort((a, b) => a.id - b.id)
    sRef.current = s; setSTuples(s)

    setExpl('Phase 2: Merging sorted relations...', '')
    await sleep(speed)

    let i = 0, j = 0
    while (i < r.length && j < s.length) {
      setRActive(i); setSActive(j)
      c++; setComps(c)
      await sleep(speed)

      if (r[i].id === s[j].id) {
        out.push(`(${r[i].id}, ${r[i].val}, ${s[j].val})`)
        setOutput([...out])
        setExpl(`Match: R[${i}].id = S[${j}].id = ${r[i].id}. Advance both pointers.`, 'success')
        i++; j++
      } else if (r[i].id < s[j].id) {
        setExpl(`R[${i}].id=${r[i].id} < S[${j}].id=${s[j].id}: advance R pointer.`, '')
        i++
      } else {
        setExpl(`R[${i}].id=${r[i].id} > S[${j}].id=${s[j].id}: advance S pointer.`, '')
        j++
      }
    }

    setRActive(-1); setSActive(-1)
    setExpl(`Done! ${c} comparisons, ${out.length} output tuples.`, 'success')
    runningRef.current = false
  }

  return (
    <div className="two-col">
      <div>
        <div className="viz-area">
          <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <div className="join-layout">
              <div>
                <div className="rel-header">R (sorted) — <span style={{ color: 'var(--accent)' }}>●</span></div>
                <div className="relation-table">
                  {rTuples.map((t, i) => (
                    <div key={i} className={`tuple outer${i === rActive ? ' active' : ''}`} style={{ gridTemplateColumns: '40px 1fr' }}>
                      {t.id}<span style={{ color: 'var(--text-dim)', marginLeft: '0.5rem' }}>{t.val}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="rel-header">S (sorted) — <span style={{ color: 'var(--accent3)' }}>●</span></div>
                <div className="relation-table">
                  {sTuples.map((t, i) => (
                    <div key={i} className={`tuple inner${i === sActive ? ' active' : ''}`} style={{ gridTemplateColumns: '40px 1fr' }}>
                      {t.id}<span style={{ color: 'var(--text-dim)', marginLeft: '0.5rem' }}>{t.val}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="rel-header">Output</div>
                <div className="output-table">
                  {output.length === 0
                    ? <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Run join to see output</div>
                    : output.map((o, i) => <div key={i} className="output-tuple">{o}</div>)
                  }
                </div>
              </div>
            </div>
          </div>
          <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border)' }}>
            <div className={`explanation${explanation.type ? ' ' + explanation.type : ''}`}>{explanation.msg}</div>
          </div>
        </div>
        <div className="cost-box">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '0.5rem' }}>Cost Analysis</div>
          <div className="cost-row"><span>Sort R</span><span className="cost-val">2 × P_R × (1 + ⌈log&#x2093;⌈P_R/B⌉⌉)</span></div>
          <div className="cost-row"><span>Merge pass</span><span className="cost-val">P_R + P_S</span></div>
          <div className="cost-row"><span>Comparisons</span><span className="cost-val">{comps}</span></div>
          <div className="cost-row" style={{ borderTop: '1px solid var(--border)', marginTop: '0.25rem', paddingTop: '0.25rem' }}>
            <span><b>Best when</b></span><span className="cost-val">already sorted or B large</span>
          </div>
        </div>
      </div>
      <div className="controls">
        <div className="card">
          <div className="card-title">Relations</div>
          <div className="btn-group">
            <button className="btn btn-primary" onClick={doRun}>▶ Run Join</button>
            <button className="btn btn-ghost" onClick={doInit}>Reset</button>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Speed</div>
          <div className="input-row">
            <label>Delay</label>
            <select value={speed} onChange={e => setSpeed(parseInt(e.target.value))}>
              <option value="600">Slow</option><option value="300">Normal</option><option value="100">Fast</option>
            </select>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Algorithm</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: '1.9' }}>
            <b>Phase 1:</b> Sort R, Sort S<br /><br />
            <b>Phase 2 (Merge):</b><br />
            i=0, j=0<br />
            <b style={{ color: 'var(--accent)' }}>while</b> i&lt;|R| and j&lt;|S|:<br />
            &nbsp;&nbsp;<b style={{ color: 'var(--accent)' }}>if</b> R[i].id == S[j].id:<br />
            &nbsp;&nbsp;&nbsp;&nbsp;emit; advance both<br />
            &nbsp;&nbsp;<b style={{ color: 'var(--accent)' }}>elif</b> R[i].id &lt; S[j].id: i++<br />
            &nbsp;&nbsp;<b style={{ color: 'var(--accent)' }}>else</b>: j++<br /><br />
            Best case: P_R + P_S
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// HASH JOIN
// ============================================================
function HJ() {
  const [speed, setSpeed] = useState(300)
  const [rTuples, setRTuples] = useState(() => genRelations(5, 5).R)
  const [sTuples, setSTuples] = useState(() => genRelations(5, 5).S)
  const [rActive, setRActive] = useState(-1)
  const [sActive, setSActive] = useState(-1)
  const [htState, setHtState] = useState(null)
  const [probingBucket, setProbingBucket] = useState(-1)
  const [probingKey, setProbingKey] = useState(-1)
  const [output, setOutput] = useState([])
  const [probes, setProbes] = useState(0)
  const [explanation, setExplanation] = useState({ msg: 'Hash Join: Build phase hashes R into a hash table, then probe with each S tuple.', type: '' })
  const runningRef = useRef(false)

  function setExpl(msg, type) { setExplanation({ msg, type: type || '' }) }

  function doInit() {
    const { R, S } = genRelations(5, 5)
    setRTuples(R); setSTuples(S)
    setRActive(-1); setSActive(-1); setHtState(null)
    setProbingBucket(-1); setProbingKey(-1); setOutput([]); setProbes(0)
    setExpl('Hash Join: Build phase hashes R into a hash table, then probe with each S tuple.', '')
    runningRef.current = false
  }

  async function doRun() {
    if (runningRef.current) return
    runningRef.current = true
    const { R, S } = genRelations(5, 5)
    setRTuples(R); setSTuples(S)
    setOutput([])
    let p = 0
    const out = []

    setExpl('Phase 1 (Build): Hashing all R tuples into the hash table...', '')
    const ht = Array.from({ length: HJ_BUCKETS }, () => [])

    for (let i = 0; i < R.length; i++) {
      setRActive(i)
      const r = R[i]
      const b = hjHash(r.id)
      setExpl(`Build: hash(${r.id}) = ${b} → insert into bucket ${b}.`, '')
      await sleep(speed)
      ht[b].push(r)
      setHtState(ht.map(bucket => [...bucket]))
    }

    setRActive(-1)
    setExpl('Hash table built! Phase 2 (Probe): scan S and probe the hash table.', 'success')
    await sleep(speed)

    for (let j = 0; j < S.length; j++) {
      const s = S[j]
      const b = hjHash(s.id)
      setSActive(j); setProbingBucket(b); setProbingKey(-1)
      setExpl(`Probe: hash(${s.id}) = ${b} → scan bucket ${b} for id=${s.id}.`, '')
      await sleep(speed)

      p++; setProbes(p)
      setProbingKey(s.id)
      await sleep(speed)

      for (const r of ht[b]) {
        if (r.id === s.id) {
          out.push(`(${r.id}, ${r.val}, ${s.val})`)
          setOutput([...out])
          setExpl(`Match in bucket ${b}: R.id = S.id = ${r.id} → emit!`, 'success')
          await sleep(speed)
        }
      }
    }

    setSActive(-1); setProbingBucket(-1); setProbingKey(-1)
    setExpl(`Done! Probed ${p} buckets, ${out.length} output tuples. Total I/O = P_R + P_S.`, 'success')
    runningRef.current = false
  }

  return (
    <div className="two-col">
      <div>
        <div className="viz-area">
          <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <div className="rel-header">R (Build) — <span style={{ color: 'var(--accent)' }}>●</span></div>
                <div className="relation-table">
                  {rTuples.map((t, i) => (
                    <div key={i} className={`tuple outer${i === rActive ? ' active' : (htState ? ' build' : '')}`} style={{ gridTemplateColumns: '40px 1fr' }}>
                      {t.id}<span style={{ color: 'var(--text-dim)', marginLeft: '0.5rem' }}>{t.val}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="rel-header">S (Probe) — <span style={{ color: 'var(--accent3)' }}>●</span></div>
                <div className="relation-table">
                  {sTuples.map((t, i) => (
                    <div key={i} className={`tuple inner${i === sActive ? ' active' : (htState ? ' probe' : '')}`} style={{ gridTemplateColumns: '40px 1fr' }}>
                      {t.id}<span style={{ color: 'var(--text-dim)', marginLeft: '0.5rem' }}>{t.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div className="rel-header">Hash Table (built from R)</div>
                <div className="hash-buckets">
                  {htState === null
                    ? <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Not built yet</div>
                    : htState.map((bucket, b) => (
                      <div key={b} className={`hash-bucket${b === probingBucket ? ' active' : ''}`} style={b === probingBucket ? { borderColor: 'var(--highlight)' } : {}}>
                        <div className="bucket-head">Bucket {b} (id % {HJ_BUCKETS} = {b})</div>
                        <div className="bucket-entries">
                          {bucket.length === 0
                            ? <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>empty</span>
                            : bucket.map((r, ri) => (
                              <span key={ri} className={`bucket-entry${b === probingBucket && r.id === probingKey ? ' probing' : ''}`}>{r.id}:{r.val}</span>
                            ))
                          }
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
              <div>
                <div className="rel-header">Output</div>
                <div className="output-table">
                  {output.length === 0
                    ? <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Run join to see output</div>
                    : output.map((o, i) => <div key={i} className="output-tuple">{o}</div>)
                  }
                </div>
              </div>
            </div>
          </div>
          <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border)' }}>
            <div className={`explanation${explanation.type ? ' ' + explanation.type : ''}`}>{explanation.msg}</div>
          </div>
        </div>
        <div className="cost-box">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '0.5rem' }}>Cost Analysis</div>
          <div className="cost-row"><span>Build (read R)</span><span className="cost-val">P_R</span></div>
          <div className="cost-row"><span>Probe (read S)</span><span className="cost-val">P_S</span></div>
          <div className="cost-row"><span>Total I/O</span><span className="cost-val">P_R + P_S</span></div>
          <div className="cost-row"><span>Probes done</span><span className="cost-val">{probes}</span></div>
          <div className="cost-row" style={{ borderTop: '1px solid var(--border)', marginTop: '0.25rem', paddingTop: '0.25rem' }}>
            <span><b>Requires</b></span><span className="cost-val">B &gt; √P_R buffer pages</span>
          </div>
        </div>
      </div>
      <div className="controls">
        <div className="card">
          <div className="card-title">Relations</div>
          <div className="btn-group">
            <button className="btn btn-primary" onClick={doRun}>▶ Run Join</button>
            <button className="btn btn-ghost" onClick={doInit}>Reset</button>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Speed</div>
          <div className="input-row">
            <label>Delay</label>
            <select value={speed} onChange={e => setSpeed(parseInt(e.target.value))}>
              <option value="600">Slow</option><option value="300">Normal</option><option value="100">Fast</option>
            </select>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Algorithm</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: '1.9' }}>
            <b style={{ color: 'var(--accent)' }}>Phase 1: Build</b><br />
            <b>for</b> each r in R:<br />
            &nbsp;&nbsp;HT[h(r.id)].add(r)<br /><br />
            <b style={{ color: 'var(--accent3)' }}>Phase 2: Probe</b><br />
            <b>for</b> each s in S:<br />
            &nbsp;&nbsp;<b>for</b> r in HT[h(s.id)]:<br />
            &nbsp;&nbsp;&nbsp;&nbsp;<b>if</b> r.id == s.id:<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;emit(r, s)<br /><br />
            Total I/O = P_R + P_S
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Joins() {
  const [activeTab, setActiveTab] = useState('nlj')
  const tabs = ['nlj', 'smj', 'hj']
  const tabLabels = ['Nested Loop Join', 'Sort-Merge Join', 'Hash Join']

  return (
    <>
      <style>{JOINS_STYLES}</style>
      <div className="page">
        <div className="page-header">
          <div className="page-title">Join Algorithms</div>
          <div className="page-desc">Three strategies to compute R ⋈ S on a join attribute. Compare their I/O costs and access patterns.</div>
        </div>

        <div className="tabs">
          {tabs.map((t, i) => (
            <div key={t} className={`tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>{tabLabels[i]}</div>
          ))}
        </div>

        {activeTab === 'nlj' && <NLJ />}
        {activeTab === 'smj' && <SMJ />}
        {activeTab === 'hj' && <HJ />}
      </div>
    </>
  )
}
