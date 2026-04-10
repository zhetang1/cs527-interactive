import { useState, useEffect, useCallback, useRef } from "react";

const ROWS = 8;
// Valid cells: row 0 has cols 0-8 (9 cells), rows 1-7 have cols 0-7 (8 cells)
// Total: 9 + 7*8 = 9 + 56 = 65 cells
// 32 dominoes cover 64 cells, leaving exactly 1 hole

function isValidCell(row, col) {
    if (row < 0 || row >= ROWS || col < 0) return false;
    if (col >= 9) return false;
    if (col === 8 && row !== 0) return false;
    return true;
}

function cellKey(r, c) { return `${r},${c}`; }
function parseKey(k) { const [r,c] = k.split(",").map(Number); return [r,c]; }

function getAllCells() {
    const cells = [];
    for (let r = 0; r < ROWS; r++) {
        const maxC = r === 0 ? 9 : 8;
        for (let c = 0; c < maxC; c++) {
            cells.push(cellKey(r, c));
        }
    }
    return cells; // 65 cells
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Generate exactly 32 dominoes covering 64 of 65 cells
// Strategy: pick a random hole, then tile the rest with a guaranteed-complete algorithm
function generateTiling() {
    const allCells = getAllCells(); // 65 cells

    // Try random hole positions until we find one that allows a full tiling
    const holeOptions = shuffle(allCells);

    for (const hole of holeOptions) {
        const result = tryTileWithHole(hole, allCells);
        if (result) return result;
    }
    // Fallback: all horizontal (always valid if hole is cell (0,8))
    return makeAllHorizontal();
}

function tryTileWithHole(hole, allCells) {
    // Use a randomized greedy backtracking approach
    const uncovered = new Set(allCells.filter(c => c !== hole));
    const dominoes = [];
    let idCounter = 0;

    function backtrack() {
        if (uncovered.size === 0) return true;

        // Pick the first uncovered cell (deterministic order for backtracking)
        const key = [...uncovered][0];
        const [r, c] = parseKey(key);

        // Try neighbors in random order
        const neighbors = shuffle([
            [r, c+1], [r, c-1], [r+1, c], [r-1, c]
        ]).filter(([nr, nc]) => isValidCell(nr, nc) && uncovered.has(cellKey(nr, nc)));

        for (const [nr, nc] of neighbors) {
            const nkey = cellKey(nr, nc);
            const isHoriz = nr === r;
            const dom = {
                id: idCounter++,
                cells: [key, nkey],
                horizontal: isHoriz,
                row: Math.min(r, nr),
                col: Math.min(c, nc),
            };
            uncovered.delete(key);
            uncovered.delete(nkey);
            dominoes.push(dom);

            if (backtrack()) return true;

            dominoes.pop();
            uncovered.add(key);
            uncovered.add(nkey);
            idCounter--;
        }

        return false;
    }

    if (backtrack()) {
        return dominoes;
    }
    return null;
}

function makeAllHorizontal() {
    // Fallback: tile rows 1-7 with horizontal dominoes (8 cells each = 4 dominoes/row)
    // Row 0: cols 0-7 = 4 horizontal, col 8 = hole
    const dominoes = [];
    let id = 0;
    for (let c = 0; c < 8; c += 2) {
        dominoes.push({ id: id++, cells: [cellKey(0,c), cellKey(0,c+1)], horizontal: true, row: 0, col: c });
    }
    for (let r = 1; r < 8; r++) {
        for (let c = 0; c < 8; c += 2) {
            dominoes.push({ id: id++, cells: [cellKey(r,c), cellKey(r,c+1)], horizontal: true, row: r, col: c });
        }
    }
    return dominoes; // 4 + 7*4 = 32 dominoes, hole at (0,8)
}

function buildCellMap(dominoes) {
    const map = {};
    for (const d of dominoes) {
        for (const c of d.cells) map[c] = d.id;
    }
    return map;
}

function findHole(dominoes) {
    const covered = new Set();
    for (const d of dominoes) for (const c of d.cells) covered.add(c);
    for (const k of getAllCells()) {
        if (!covered.has(k)) return parseKey(k);
    }
    return null;
}

function allHorizontal(dominoes) {
    return dominoes.length === 32 && dominoes.every(d => d.horizontal);
}

const CELL_SIZE = 42;
const GAP = 2;

const PALETTE = [
    "#e63946","#457b9d","#2a9d8f","#e9c46a","#f4a261",
    "#a8dadc","#6a4c93","#52b788","#fb8500","#219ebc",
    "#8338ec","#3a86ff","#ff006e","#06d6a0","#ffbe0b",
    "#ef233c","#4cc9f0","#7209b7","#f72585","#4361ee",
    "#e76f51","#264653","#e9c46a","#2ec4b6","#cbf3f0",
    "#ff9f1c","#cbf3f0","#2d6a4f","#b7e4c7","#d62828",
    "#023e8a","#48cae4",
];

function domColor(id) { return PALETTE[id % PALETTE.length]; }

function Stat({ label, value }) {
    return (
        <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "#333", letterSpacing: "0.15em", marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#f0f0f0" }}>{value}</div>
        </div>
    );
}

function Btn({ label, color, onClick }) {
    const [hover, setHover] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                background: "transparent",
                border: `1px solid ${hover ? color : "#222"}`,
                color: hover ? color : "#555",
                padding: "7px 18px",
                borderRadius: 4, cursor: "pointer",
                fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase",
                transition: "all 0.15s",
            }}
        >{label}</button>
    );
}

function LegendItem({ horiz, label }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{
                width: horiz ? 22 : 11, height: horiz ? 11 : 22,
                background: "#2a2a45", borderRadius: 2,
                display: "flex", alignItems: "center", justifyContent: "center",
            }}>
                <div style={{
                    width: horiz ? "55%" : "28%", height: horiz ? "28%" : "55%",
                    background: "rgba(255,255,255,0.2)", borderRadius: 1,
                }} />
            </div>
            <span>{label}</span>
        </div>
    );
}

export default function DominoPuzzle() {
    const [dominoes, setDominoes] = useState([]);
    const [cellMap, setCellMap] = useState({});
    const [selected, setSelected] = useState(null);
    const [moves, setMoves] = useState(0);
    const [won, setWon] = useState(false);
    const [hint, setHint] = useState(null);
    const [badClick, setBadClick] = useState(false);
    const [loading, setLoading] = useState(true);
    const initialized = useRef(false);

    const init = useCallback(() => {
        setLoading(true);
        setSelected(null);
        setMoves(0);
        setWon(false);
        setHint(null);
        // Use setTimeout to let the UI update before heavy computation
        setTimeout(() => {
            const doms = generateTiling();
            setDominoes(doms);
            setCellMap(buildCellMap(doms));
            setLoading(false);
        }, 50);
    }, []);

    useEffect(() => {
        if (!initialized.current) {
            initialized.current = true;
            init();
        }
    }, [init]);

    useEffect(() => {
        if (dominoes.length === 32 && allHorizontal(dominoes)) setWon(true);
    }, [dominoes]);

    function handleCellClick(r, c) {
        if (won || loading) return;
        const key = cellKey(r, c);
        const domId = cellMap[key];

        if (domId === undefined) {
            // Clicked the hole — try to move selected domino here
            if (selected !== null) {
                const moved = tryMove(selected, r, c);
                if (!moved) flash();
            }
            return;
        }

        if (selected === domId) { setSelected(null); return; }
        setSelected(domId);
        setHint(null);
    }

    function tryMove(domId, holeR, holeC) {
        const dom = dominoes.find(d => d.id === domId);
        if (!dom) return false;

        const cells = dom.cells.map(parseKey);
        // One cell of the domino must be directly adjacent to the hole
        const adjToHole = cells.findIndex(([r,c]) =>
            (Math.abs(r - holeR) + Math.abs(c - holeC)) === 1
        );
        if (adjToHole === -1) return false;

        const [adjR, adjC] = cells[adjToHole];
        const [otherR, otherC] = cells[1 - adjToHole];

        // New domino covers: [holeR,holeC] and [adjR,adjC]
        // New hole is at [otherR,otherC]
        if (!isValidCell(holeR, holeC) || !isValidCell(adjR, adjC)) return false;

        const newDom = {
            ...dom,
            cells: [cellKey(holeR, holeC), cellKey(adjR, adjC)],
            horizontal: holeR === adjR,
            row: Math.min(holeR, adjR),
            col: Math.min(holeC, adjC),
        };

        const newDominoes = dominoes.map(d => d.id === domId ? newDom : d);
        setDominoes(newDominoes);
        setCellMap(buildCellMap(newDominoes));
        setSelected(null);
        setMoves(m => m + 1);
        setHint(null);
        return true;
    }

    function flash() {
        setBadClick(true);
        setTimeout(() => setBadClick(false), 350);
    }

    function showHint() {
        const hole = findHole(dominoes);
        if (!hole) return;
        const [hr, hc] = hole;
        const adj = [[hr-1,hc],[hr+1,hc],[hr,hc-1],[hr,hc+1]];
        // Prefer vertical dominoes (they're the ones to move)
        for (const [r,c] of adj) {
            if (!isValidCell(r,c)) continue;
            const did = cellMap[cellKey(r,c)];
            if (did !== undefined) {
                const dom = dominoes.find(d => d.id === did);
                if (dom && !dom.horizontal) { setHint(did); setSelected(did); return; }
            }
        }
        for (const [r,c] of adj) {
            if (!isValidCell(r,c)) continue;
            const did = cellMap[cellKey(r,c)];
            if (did !== undefined) { setHint(did); setSelected(did); return; }
        }
    }

    function renderCell(r, c) {
        const key = cellKey(r, c);
        const hole = findHole(dominoes);
        const isHole = hole && hole[0] === r && hole[1] === c;
        const domId = cellMap[key];
        const dom = domId !== undefined ? dominoes.find(d => d.id === domId) : null;
        const isSel = dom && selected === dom.id;
        const isHint = dom && hint === dom.id;
        const color = dom ? domColor(dom.id) : null;

        return (
            <div
                key={c}
                onClick={() => handleCellClick(r, c)}
                style={{
                    width: CELL_SIZE, height: CELL_SIZE,
                    margin: GAP / 2,
                    borderRadius: 4,
                    cursor: isHole ? "default" : "pointer",
                    background: isHole ? "#0d0d18" : color || "#1a1a2e",
                    border: isHole
                        ? "1.5px dashed #1e1e30"
                        : isSel
                            ? `2.5px solid #fff`
                            : isHint
                                ? `2px solid #ffbe0b`
                                : "1.5px solid rgba(255,255,255,0.06)",
                    boxShadow: isSel ? `0 0 16px ${color}66` : isHint ? `0 0 12px #ffbe0b55` : "none",
                    transition: "border 0.1s, box-shadow 0.15s, background 0.2s",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    position: "relative",
                    flexShrink: 0,
                }}
            >
                {dom && (
                    <div style={{
                        width: dom.horizontal ? "55%" : "28%",
                        height: dom.horizontal ? "28%" : "55%",
                        background: "rgba(255,255,255,0.18)",
                        borderRadius: 2,
                    }} />
                )}
                {isHole && (
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#252535" }} />
                )}
            </div>
        );
    }

    const hole = findHole(dominoes);
    const hCount = dominoes.filter(d => d.horizontal).length;
    const progress = dominoes.length > 0 ? Math.round((hCount / 32) * 100) : 0;

    return (
        <div style={{
            minHeight: "100vh",
            background: "#080810",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Courier New', monospace",
            padding: "16px",
            userSelect: "none",
        }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
                <h1 style={{
                    fontSize: 26,
                    fontWeight: 900,
                    letterSpacing: "0.18em",
                    color: "#f0f0f0",
                    margin: 0,
                    textTransform: "uppercase",
                }}>DOMINO TASK</h1>
                <p style={{ color: "#444", fontSize: 10, margin: "5px 0 0", letterSpacing: "0.2em" }}>
                    MAKE ALL 32 DOMINOES HORIZONTAL · 8×8 + EXTRA SQUARE
                </p>
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", gap: 28, marginBottom: 16, alignItems: "center" }}>
                <Stat label="MOVES" value={moves} />
                <Stat label="HORIZONTAL" value={`${hCount} / 32`} />
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "#333", letterSpacing: "0.15em", marginBottom: 4 }}>PROGRESS</div>
                    <div style={{ width: 72, height: 5, background: "#15151f", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{
                            width: `${progress}%`, height: "100%",
                            background: progress === 100 ? "#06d6a0" : "#e63946",
                            transition: "width 0.3s ease", borderRadius: 3,
                        }} />
                    </div>
                    <div style={{ fontSize: 10, color: "#666", marginTop: 3 }}>{progress}%</div>
                </div>
            </div>

            {/* Board */}
            {loading ? (
                <div style={{
                    width: (CELL_SIZE + GAP) * 9 + 16,
                    height: (CELL_SIZE + GAP) * 8 + 16,
                    background: "#111118",
                    border: "1px solid #1e1e2e",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#333",
                    fontSize: 12,
                    letterSpacing: "0.2em",
                }}>
                    GENERATING...
                </div>
            ) : (
                <div style={{
                    position: "relative",
                    padding: 8,
                    background: "#111118",
                    border: `1px solid ${badClick ? "#e63946" : "#1e1e2e"}`,
                    borderRadius: 8,
                    transition: "border-color 0.15s",
                }}>
                    {/* Row 0 — 9 cells */}
                    <div style={{ display: "flex", alignItems: "center" }}>
                        {Array.from({ length: 9 }, (_, c) => renderCell(0, c))}
                        <div style={{ marginLeft: 4, fontSize: 9, color: "#2a2a3e", letterSpacing: "0.1em" }}>+1</div>
                    </div>
                    {/* Rows 1-7 — 8 cells each */}
                    {Array.from({ length: 7 }, (_, i) => i + 1).map(r => (
                        <div key={r} style={{ display: "flex" }}>
                            {Array.from({ length: 8 }, (_, c) => renderCell(r, c))}
                        </div>
                    ))}
                </div>
            )}

            {/* Instruction */}
            <div style={{ marginTop: 12, fontSize: 10, color: "#333", letterSpacing: "0.12em", minHeight: 16 }}>
                {!loading && (selected !== null
                    ? <span>Click the <span style={{ color: "#e63946" }}>hole ●</span> adjacent to move domino there</span>
                    : <span>Click a domino to select · then click the hole to slide it</span>
                )}
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <Btn label="Hint" color="#ffbe0b" onClick={showHint} />
                <Btn label="New Game" color="#e63946" onClick={init} />
            </div>

            {/* Legend */}
            <div style={{ marginTop: 16, display: "flex", gap: 18, fontSize: 9, color: "#2a2a3e", letterSpacing: "0.1em" }}>
                <LegendItem horiz={true} label="HORIZONTAL" />
                <LegendItem horiz={false} label="VERTICAL" />
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{
                        width: 16, height: 16, background: "#0d0d18",
                        border: "1.5px dashed #252535", borderRadius: 3,
                        display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#2a2a40" }} />
                    </div>
                    <span>HOLE</span>
                </div>
            </div>

            {/* Win overlay */}
            {won && (
                <div style={{
                    position: "fixed", inset: 0,
                    background: "rgba(0,0,0,0.88)",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    zIndex: 200, backdropFilter: "blur(8px)",
                }}>
                    <div style={{ textAlign: "center", animation: "popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                        <div style={{ fontSize: 60, marginBottom: 10 }}>🎉</div>
                        <h2 style={{
                            fontSize: 30, fontWeight: 900, color: "#06d6a0",
                            letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 8px",
                        }}>SOLVED!</h2>
                        <p style={{ color: "#888", fontSize: 13, margin: "0 0 4px" }}>All 32 dominoes are horizontal</p>
                        <p style={{ color: "#555", fontSize: 12, margin: "0 0 28px" }}>
                            Completed in <span style={{ color: "#f0f0f0", fontWeight: 700 }}>{moves}</span> moves
                        </p>
                        <button onClick={init} style={{
                            background: "#06d6a0", border: "none", color: "#080810",
                            padding: "12px 36px", borderRadius: 4, cursor: "pointer",
                            fontSize: 12, fontWeight: 900, letterSpacing: "0.2em", textTransform: "uppercase",
                        }}>PLAY AGAIN</button>
                    </div>
                </div>
            )}

            <style>{`@keyframes popIn { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
        </div>
    );
}
