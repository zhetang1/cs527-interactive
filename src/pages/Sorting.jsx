import React, { useState, useRef } from 'react'

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

const SORT_STYLES = `
  .sort-pages { display: flex; flex-direction: column; gap: 6px; }
  .page-row { display: flex; gap: 4px; align-items: center; }
  .page-label { font-size: 0.75rem; color: var(--text-dim); min-width: 60px; font-family: var(--mono); }
  .page-block { background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; padding: 0.4rem 0.6rem; font-family: var(--mono); font-size: 0.82rem; display: flex; gap: 6px; align-items: center; transition: all 0.3s; }
  .page-block.active { border-color: var(--highlight); background: #2a2200; }
  .page-block.sorted { border-color: var(--success); background: #0d2a1a; }
  .page-block.merging { border-color: var(--accent); background: #1a1440; }
  .page-block.done { border-color: var(--accent3); background: #0d2a1a; }
  .num-chip { padding: 0.1rem 0.4rem; border-radius: 4px; background: var(--surface); border: 1px solid var(--border); font-size: 0.8rem; }
  .num-chip.hl { background: rgba(255,209,102,0.2); border-color: var(--highlight); color: var(--highlight); }
  .buffer-area { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
  .buffer-slot { width: 52px; height: 52px; background: var(--surface2); border: 2px solid var(--border); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-family: var(--mono); font-size: 0.9rem; font-weight: 700; transition: all 0.3s; }
  .buffer-slot.in { border-color: var(--accent); background: #1a1440; color: var(--accent); }
  .buffer-slot.out { border-color: var(--accent3); background: #0d2a1a; color: var(--accent3); }
  .buffer-slot.comparing { border-color: var(--highlight); background: #2a2200; color: var(--highlight); }
`

export default function Sorting() {
  const [N, setN] = useState(8)
  const [B, setB] = useState(3)
  const [speed, setSpeed] = useState(300)
  const [pages, setPages] = useState(() => Array.from({ length: 8 }, () => Array.from({ length: 2 }, () => Math.floor(Math.random() * 99) + 1)))
  const [activePages, setActivePages] = useState(new Set())
  const [bufSlots, setBufSlots] = useState([])
  const [runs, setRuns] = useState([])
  const [activeRun, setActiveRun] = useState(-1)
  const [finalOutput, setFinalOutput] = useState(null)
  const [runsLabel, setRunsLabel] = useState('Sorted Runs (Phase 1 output)')
  const [phase1Done, setPhase1Done] = useState(false)
  const [ios, setIos] = useState(0)
  const [phaseDisplay, setPhaseDisplay] = useState('—')
  const [explanation, setExplanation] = useState({ msg: `${8} pages, ${3} buffer frames. ⌈${8}/${3}⌉ = ${Math.ceil(8/3)} sorted runs expected.`, type: '' })
  const [phase1Btn, setPhase1Btn] = useState(false) // disabled
  const [phase2Btn, setPhase2Btn] = useState(true)  // disabled

  const busyRef = useRef(false)
  const iosRef = useRef(0)
  const runsRef = useRef([])
  const pagesRef = useRef(pages)

  function setExpl(msg, type) { setExplanation({ msg, type: type || '' }) }

  function getDelay() { return speed }

  function initSort(newN, newB) {
    const n = newN ?? N, b = newB ?? B
    const pg = Array.from({ length: n }, () => Array.from({ length: 2 }, () => Math.floor(Math.random() * 99) + 1))
    pagesRef.current = pg
    runsRef.current = []; iosRef.current = 0
    busyRef.current = false
    setPages(pg); setActivePages(new Set())
    setBufSlots([]); setRuns([]); setActiveRun(-1)
    setFinalOutput(null)
    setRunsLabel('Sorted Runs (Phase 1 output)')
    setPhase1Done(false); setPhase1Btn(false); setPhase2Btn(true)
    setIos(0); setPhaseDisplay('—')
    setExpl(`${n} pages, ${b} buffer frames. ⌈${n}/${b}⌉ = ${Math.ceil(n/b)} sorted runs expected.`, '')
  }

  async function phase1() {
    if (busyRef.current) return
    busyRef.current = true
    setPhase1Btn(true)
    iosRef.current = 0; runsRef.current = []
    const pg = pagesRef.current
    const n = pg.length

    let pi = 0
    while (pi < n) {
      const chunk = []
      const activeSet = new Set()
      for (let j = 0; j < B && pi < n; j++, pi++) {
        chunk.push(...pg[pi])
        activeSet.add(pi - 1)
      }
      // fix active set indices
      const startIdx = pi - Math.min(B, n - (pi - Math.min(B, n)))
      const newActiveSet = new Set()
      for (let k = Math.max(0, pi - B); k < pi; k++) newActiveSet.add(k)

      setActivePages(newActiveSet)
      setExpl(`Reading pages ${[...newActiveSet].join(', ')} into buffer...`, '')
      iosRef.current += newActiveSet.size
      setBufSlots(chunk.slice(0, B))
      setIos(iosRef.current)
      await sleep(getDelay())

      const sorted = [...chunk].sort((a, b) => a - b)
      setExpl(`Sorting ${chunk.length} values in buffer: [${sorted.join(', ')}]`, '')
      setBufSlots(sorted.slice(0, B))
      await sleep(getDelay())

      runsRef.current.push(sorted)
      iosRef.current++
      setRuns(runsRef.current.map(r => [...r]))
      setExpl(`Writing sorted run ${runsRef.current.length - 1} to disk: [${sorted.join(', ')}]`, 'success')
      setPhaseDisplay('Pass 0')
      setIos(iosRef.current)
      await sleep(getDelay())
    }

    setActivePages(new Set())
    setBufSlots([])
    setExpl(`Phase 1 done! Created ${runsRef.current.length} sorted runs. Total I/Os: ${iosRef.current}. Now run Phase 2 to merge.`, 'success')
    setPhase1Done(true)
    setPhase2Btn(false)
    busyRef.current = false
  }

  async function phase2() {
    if (busyRef.current || !phase1Done) return
    busyRef.current = true
    setPhase2Btn(true)
    setRunsLabel('Sorted Runs (Phase 2 merging)')

    const numRuns = runsRef.current.length
    if (numRuns > B - 1) {
      setExpl(`Too many runs (${numRuns}) for single-pass merge (need ≤ ${B - 1}). In practice, do another pass.`, 'warning')
      busyRef.current = false
      return
    }

    const ptrs = new Array(numRuns).fill(0)
    const result = []
    setExpl(`Phase 2: Merging ${numRuns} runs using ${B - 1} input buffers + 1 output buffer.`, '')
    await sleep(getDelay())

    while (true) {
      let minVal = Infinity, minRun = -1
      for (let i = 0; i < numRuns; i++) {
        if (ptrs[i] < runsRef.current[i].length && runsRef.current[i][ptrs[i]] < minVal) {
          minVal = runsRef.current[i][ptrs[i]]
          minRun = i
        }
      }
      if (minRun === -1) break

      setActiveRun(minRun)
      const bufDisplay = runsRef.current.map((r, i) => ptrs[i] < r.length ? r[ptrs[i]] : undefined)
      setBufSlots([...bufDisplay, result[result.length - 1]])
      setExpl(`Min value = ${minVal} from Run ${minRun}. Output to result buffer.`, '')
      iosRef.current++
      setIos(iosRef.current)
      await sleep(getDelay())

      result.push(minVal)
      ptrs[minRun]++

      if (ptrs[minRun] < runsRef.current[minRun].length) iosRef.current++
    }

    iosRef.current++
    setBufSlots([])
    setActiveRun(-1)
    setRunsLabel('Final Sorted Output')
    setFinalOutput(result)
    setPhaseDisplay('Pass 1')
    setIos(iosRef.current)
    setExpl(`Sort complete! Output: [${result.join(', ')}]. Total I/Os: ${iosRef.current} ≈ 4N = ${4 * N}.`, 'success')
    busyRef.current = false
  }

  return (
    <>
      <style>{SORT_STYLES}</style>
      <div className="page">
        <div className="page-header">
          <div className="page-title">External Merge Sort</div>
          <div className="page-desc">When data doesn't fit in memory, use a two-phase external merge sort. Phase 1 creates sorted runs; Phase 2 merges them using B buffer pages.</div>
        </div>

        <div className="two-col">
          <div>
            <div className="viz-area">
              <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="stats">
                  <div className="stat"><div className="stat-val">{phaseDisplay}</div><div className="stat-lbl">Phase</div></div>
                  <div className="stat"><div className="stat-val">{runs.length}</div><div className="stat-lbl">Runs</div></div>
                  <div className="stat"><div className="stat-val">{ios}</div><div className="stat-lbl">I/O Ops</div></div>
                </div>
              </div>

              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                <div className="card-title">Disk Pages (Input)</div>
                <div className="sort-pages">
                  {pages.map((page, i) => (
                    <div key={i} className="page-row">
                      <div className="page-label">Page {i}</div>
                      <div className={`page-block${activePages.has(i) ? ' active' : ''}`}>
                        {page.map((v, vi) => <span key={vi} className={`num-chip${activePages.has(i) ? ' hl' : ''}`}>{v}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div className="card-title" style={{ margin: 0 }}>Buffer Pool (B pages)</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>B-1 input + 1 output</div>
                </div>
                <div className="buffer-area">
                  {Array.from({ length: B }, (_, i) => {
                    const val = bufSlots[i]
                    const isOut = i === B - 1
                    const cls = val !== undefined ? (isOut ? 'out' : 'in') : ''
                    return (
                      <div key={i} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{isOut ? 'OUT' : `IN ${i}`}</div>
                        <div className={`buffer-slot ${cls}`}>{val !== undefined ? val : ''}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={{ padding: '1rem 1.5rem' }}>
                <div className="card-title">{runsLabel}</div>
                {finalOutput ? (
                  <div className="page-row">
                    <div className="page-label">Sorted</div>
                    <div className="page-block done">{finalOutput.map((v, i) => <span key={i} className="num-chip">{v}</span>)}</div>
                  </div>
                ) : runs.length === 0 ? (
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Phase 1 will generate sorted runs here</div>
                ) : (
                  <div className="sort-pages">
                    {runs.map((run, i) => (
                      <div key={i} className="page-row">
                        <div className="page-label">Run {i}</div>
                        <div className={`page-block${i === activeRun ? ' done' : ' sorted'}`}>
                          {run.map((v, vi) => <span key={vi} className="num-chip">{v}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                <label>Pages (N)</label>
                <select value={N} onChange={e => { const v = parseInt(e.target.value); setN(v); initSort(v, B) }}>
                  <option value="8">8</option><option value="12">12</option><option value="16">16</option>
                </select>
              </div>
              <div className="input-row" style={{ marginTop: '0.5rem' }}>
                <label>Buffer (B)</label>
                <select value={B} onChange={e => { const v = parseInt(e.target.value); setB(v); initSort(N, v) }}>
                  <option value="3">3</option><option value="4">4</option><option value="5">5</option>
                </select>
              </div>
              <button className="btn btn-ghost" style={{ width: '100%', marginTop: '0.75rem' }} onClick={() => { busyRef.current = false; initSort(N, B) }}>Reset</button>
            </div>

            <div className="card">
              <div className="card-title">Run Sort</div>
              <div className="btn-group">
                <button className="btn btn-primary" disabled={phase1Btn} onClick={phase1}>▶ Phase 1</button>
                <button className="btn btn-success" disabled={phase2Btn} onClick={phase2}>▶ Phase 2</button>
              </div>
              <div className="input-row" style={{ marginTop: '0.5rem' }}>
                <label>Speed</label>
                <select value={speed} onChange={e => setSpeed(parseInt(e.target.value))}>
                  <option value="600">Slow</option><option value="300">Normal</option><option value="100">Fast</option>
                </select>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Cost Formula</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: '2' }}>
                <div>N pages, B buffer frames</div>
                <div style={{ borderTop: '1px solid var(--border)', margin: '0.4rem 0', paddingTop: '0.4rem' }}>
                  <b style={{ color: 'var(--accent)' }}>Phase 1:</b><br />
                  ⌈N/B⌉ sorted runs<br />
                  Cost: 2N I/Os<br /><br />
                  <b style={{ color: 'var(--accent3)' }}>Phase 2:</b><br />
                  Merge ⌈N/B⌉ runs at once<br />
                  (if ⌈N/B⌉ ≤ B-1)<br />
                  Cost: 2N I/Os<br /><br />
                  <b style={{ color: 'var(--accent4)' }}>Total: 4N I/Os</b><br />
                  (two-pass sort)
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.4rem' }}>
                  N={N}, B={B}<br />Runs: ⌈{N}/{B}⌉ = {Math.ceil(N/B)}<br />Total I/O: 4×{N} = {4*N}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Algorithm</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '0.79rem', color: 'var(--text-dim)', lineHeight: '1.9' }}>
                <b style={{ color: 'var(--accent)' }}>Pass 0 (create runs):</b><br />
                while pages remain:<br />
                &nbsp;&nbsp;read B pages into buffer<br />
                &nbsp;&nbsp;sort in-memory<br />
                &nbsp;&nbsp;write sorted run to disk<br /><br />
                <b style={{ color: 'var(--accent3)' }}>Pass 1 (merge):</b><br />
                load 1 page from each run<br />
                into B-1 input buffers<br />
                repeatedly: output min,<br />
                fetch next from that run
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
