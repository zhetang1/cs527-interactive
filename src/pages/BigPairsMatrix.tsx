import { useState, useEffect } from "react";

const MATRIX = [
    [3, 7, 2, 5],
    [6, 1, 8, 4],
    [2, 9, 3, 6],
    [5, 4, 7, 1],
];

// r = sum of top 2 in each row = 12 (rows: 7+5, 8+6, 9+6, 7+5)
// But let's force r > c scenario for illustration
// We'll use a crafted matrix where r=c to show the proof works
// Actually let's show a step-by-step proof illustration with a general matrix

const steps = [
    {
        id: 0,
        title: "The Setup",
        desc: "We have an n×n matrix. In every row, the two largest numbers sum to r. In every column, the two largest sum to c. We want to show r = c.",
        highlight: "none",
    },
    {
        id: 1,
        title: "Assume r > c (for contradiction)",
        desc: "Suppose r ≠ c. By symmetry we can assume r > c. We'll derive a contradiction.",
        highlight: "none",
    },
    {
        id: 2,
        title: "Circle the row maximums",
        desc: "In each row, circle the greatest number. These are the row-maxima.",
        highlight: "circle",
    },
    {
        id: 3,
        title: "Square the 2nd-greatest in each row",
        desc: "Draw a square around the second-greatest in each row. Each circled + squared pair sums to r.",
        highlight: "square",
    },
    {
        id: 4,
        title: "Circled numbers ≥ r/2",
        desc: "Each circled number is ≥ r/2. Why? Its row-partner (squared) is at most as large — so the circled one carries at least half of r.",
        highlight: "rHalf",
    },
    {
        id: 5,
        title: "Circled numbers must be in different columns",
        desc: "If two circled numbers (both ≥ r/2) shared a column, their column-sum would be ≥ r > c — contradicting c being the column sum. So each column gets exactly one circled number.",
        highlight: "diffCols",
    },
    {
        id: 6,
        title: "Find x: the largest squared number",
        desc: "Among all squared numbers, pick the largest — call it x. Say it sits in column j.",
        highlight: "findX",
    },
    {
        id: 7,
        title: "Column j also has a circled number y",
        desc: "Since every column has exactly one circled number, column j has a circled number y. In y's row, the squared number is some z, so y + z = r.",
        highlight: "findY",
    },
    {
        id: 8,
        title: "The contradiction",
        desc: "x ≥ z (x is the largest squared number), so y + x ≥ y + z = r > c. But y and x are both in column j, so their column sum ≤ c. Contradiction! ∎",
        highlight: "contradiction",
    },
];

// A matrix where r=13, c=13 to illustrate the theorem is true
// Row maxima and 2nd maxima sum to 13 each row
// Col top-2 sum to 13 each col
const M = [
    [8, 3, 5, 7],
    [2, 9, 4, 6],
    [6, 7, 3, 5],  // wait let me think carefully
    [5, 2, 9, 4],
];
// Actually let me construct carefully:
// Row 0: sorted desc 8,7,5,3 → top2 = 15 ✗
// Let me just use a 4x4 where we can trace the argument clearly

// Use this matrix:
// Row sums of top-2: each = 13
// Col sums of top-2: each = 13
const MAT = [
    [8, 5, 3, 6],
    [4, 7, 9, 2],
    [6, 3, 5, 8],
    [2, 9, 4, 7],
];
// Row 0: 8,6 → 14 ✗ hmm
// Let me just use a simple crafted example and annotate manually

// Final matrix - chosen for clear illustration, r=c=13
const GRID = [
    [8, 5, 6, 3],
    [3, 9, 2, 7],
    [7, 2, 9, 3],
    [5, 6, 3, 8],
];
// Row 0: top2 = 8+6 = 14... still not clean
// I'll just annotate without enforcing exact r=c; the illustration is about the PROOF LOGIC

// Simple 4x4, rows r=10, cols c=10
const FINAL_GRID = [
    [6, 4, 1, 7],
    [3, 8, 5, 2],
    [7, 2, 6, 4],
    [1, 5, 8, 3],
];
// Row 0: 7+6=13, Row 1: 8+5=13, Row 2: 7+6=13, Row 3: 8+5=13 → r=13
// Col 0: 7+6=13, Col 1: 8+5=13, Col 2: 8+6=14 ✗

// Let me just use a nice symmetric Latin-square-ish one
// I'll pick values manually
const G = [
    [1, 8, 5, 3],
    [6, 2, 9, 4],
    [8, 5, 1, 7],
    [4, 7, 6, 2],
];
// Row 0: 8+5=13 ✓, Row 1: 9+6=15 ✗

// You know what, let me just use a small 3x3 and hand-pick it
// 3x3: r=c=9
const GRID3 = [
    [5, 4, 7],
    [6, 8, 3],
    [7, 5, 6],
];
// Row 0: 7+5=12, Row1: 8+6=14, Row2: 7+6=13 ✗

// I'll just build a pedagogically clear 4x4 where r=c=11
// and annotate which are circles/squares
const DATA = [
    [3, 8, 5, 2],
    [7, 1, 4, 9],
    [5, 6, 8, 3],
    [9, 4, 2, 7],
];
// Row 0: 8+5=13 ✓ circle=8(col1), sq=5(col2)
// Row 1: 9+7=16 ✗

// Let me just hardcode a pretty example and mark it manually
// I'll use a 4x4 where r=c=13, constructed carefully:
//   a b c d
// 0 [4 9 6 3]  → top2: 9+6=15 ✗

// FORGET trying to be mathematically perfect with exact values.
// The illustration is about PROOF LOGIC. I'll use a clear 4x4 with
// explicit markings and just label r and c as "r" and "c" symbolically.

const DEMO = [
    [3, 7, 2, 6],
    [8, 1, 5, 4],
    [4, 6, 9, 2],
    [7, 3, 5, 8],
];
// Row maxima: 7(c1), 8(c0), 9(c2), 8(c3)
// Row 2nds: 6(c3), 5(c2), 6(c1), 7(c0)
// r per row: 13, 13, 15, 15 — not constant

// I'll stop trying to find a perfect matrix and just pick one with consistent r
// Use doubly stochastic structure idea:
//
// Simple: 4x4 with values 1-4 in each row and column (like a Latin square scaled)
// Latin square scaled by distinct values per cell won't give same row/col sums easily.
//
// FINAL ANSWER: Use this matrix which I verify by hand:
const VERIFIED = [
    [2, 7, 4, 5],  // top2: 7+5=12
    [6, 3, 8, 1],  // top2: 8+6=14  ✗
];

// I give up on perfectly balanced and will just use a visually clean 4x4
// and annotate the proof structure — it's an ILLUSTRATION not a verification.
// The labels will say "r" for row-pair sums.

const MATRIX_FINAL = [
    [3, 8, 5, 1],
    [7, 2, 4, 9],
    [5, 6, 8, 3],
    [9, 4, 1, 6],
];
// Row circles (max): 8, 9, 8, 9
// Row squares (2nd): 5, 7, 6, 6
// Row sums: 13, 16, 14, 15 — not equal but that's ok, proof is general

// For the illustration I'll just pick a SPECIFIC matrix and annotate it
// with the proof steps, noting which cell is x, y, z

// Decided: use this clean matrix
const MX = [
    [2, 9, 4, 6],
    [8, 3, 7, 5],
    [5, 6, 3, 8],
    [7, 4, 9, 1],
];
// Row 0: circle=9(c1), sq=6(c3), sum=15
// Row 1: circle=8(c0), sq=7(c2), sum=15
// Row 2: circle=8(c3), sq=6(c1), sum=14 ✗

// FINAL FINAL: I'll just hardcode a nice one with r=15 for rows 0&1, annotate those 2 rows,
// and show the contradiction. Focus on the story.

export default function App() {
    const [step, setStep] = useState(0);
    const [animating, setAnimating] = useState(false);

    const matrix = [
        [2, 9, 4, 6],
        [8, 3, 7, 5],
        [5, 6, 2, 9],
        [7, 4, 8, 1],
    ];
    // Row maxima positions: (0,1), (1,0), (2,3), (3,2)
    // Row 2nd maxima: (0,3)=6, (1,2)=7, (2,1)=6, (3,0)=7
    // r per row: 9+6=15, 8+7=15, 9+6=15, 8+7=15 ✓ r=15
    // Col 0: 2,8,5,7 → top2: 8+7=15 ✓
    // Col 1: 9,3,6,4 → top2: 9+6=15 ✓
    // Col 2: 4,7,2,8 → top2: 8+7=15 ✓
    // Col 3: 6,5,9,1 → top2: 9+6=15 ✓
    // PERFECT! r=c=15

    const circlePos = [[0,1],[1,0],[2,3],[3,2]]; // row maxima
    const squarePos = [[0,3],[1,2],[2,1],[3,0]]; // row 2nd maxima

    // For the "x is largest squared number" step: x=7 at (1,2), or x=7 at (3,0)
    // Let's say x=7 at (1,2) (column 2)
    // Column 2 circled number y: (3,2)=8
    // y's row (row 3): circle=8(c2), square=7(c0) so z=7
    // y+z = 8+7 = 15 = r ✓
    // y+x = 8+7 = 15 = r > c? But r=c here so no contradiction — that's correct!
    // The proof: if r>c, we'd have y+x >= y+z = r > c, but y+x <= c. Contradiction.

    const xCell = [1,2]; // x=7, largest squared (tied with (3,0)=7, pick this one)
    const yCell = [3,2]; // y=8, circled number in column 2
    const zCell = [3,0]; // z=7, squared number in y's row

    const s = steps[step];

    const isCircled = (r,c) => circlePos.some(([pr,pc])=>pr===r&&pc===c);
    const isSquared = (r,c) => squarePos.some(([pr,pc])=>pr===r&&pc===c);
    const isX = (r,c) => step>=6 && r===xCell[0] && c===xCell[1];
    const isY = (r,c) => step>=7 && r===yCell[0] && c===yCell[1];
    const isZ = (r,c) => step>=7 && r===zCell[0] && c===zCell[1];
    const isColJ = (r,c) => step>=5 && c===2;

    const showCircle = step >= 2;
    const showSquare = step >= 3;

    const handleStep = (dir) => {
        if (animating) return;
        setAnimating(true);
        setStep(s => Math.max(0, Math.min(steps.length-1, s+dir)));
        setTimeout(()=>setAnimating(false), 300);
    };

    const getCellStyle = (r,c) => {
        let bg = "transparent";
        let border = "2px solid transparent";
        let color = "#e2d9c5";
        let fontWeight = "400";
        let shadow = "none";
        let outline = "none";

        if (step >= 5 && c === 2) {
            bg = "rgba(100,180,255,0.08)";
        }

        if (showCircle && isCircled(r,c)) {
            outline = "2.5px solid #f4a261";
            color = "#f4a261";
            fontWeight = "700";
            shadow = "0 0 12px rgba(244,162,97,0.4)";
        }
        if (showSquare && isSquared(r,c)) {
            border = "2.5px solid #90e0a0";
            color = "#90e0a0";
            fontWeight = "700";
            shadow = "0 0 12px rgba(144,224,160,0.4)";
        }
        if (isX(r,c)) {
            bg = "rgba(255,220,50,0.18)";
            shadow = "0 0 18px rgba(255,220,50,0.7)";
            color = "#ffe566";
        }
        if (isY(r,c)) {
            bg = "rgba(255,100,100,0.18)";
            shadow = "0 0 18px rgba(255,100,100,0.6)";
            color = "#ff8080";
        }
        if (isZ(r,c)) {
            bg = "rgba(180,120,255,0.18)";
            shadow = "0 0 18px rgba(180,120,255,0.6)";
            color = "#c890ff";
        }

        return { bg, border, color, fontWeight, shadow, outline };
    };

    return (
        <div style={{
            minHeight: "100vh",
            background: "#0f0e0b",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Georgia', 'Times New Roman', serif",
            padding: "24px 16px",
            color: "#e2d9c5",
        }}>
            {/* Title */}
            <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div style={{
                    fontSize: 11,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    color: "#7a7060",
                    marginBottom: 8,
                }}>Mathematical Proof Illustration</div>
                <h1 style={{
                    fontSize: "clamp(22px, 5vw, 38px)",
                    fontWeight: "normal",
                    fontStyle: "italic",
                    margin: 0,
                    color: "#e8dcc8",
                    letterSpacing: "0.02em",
                }}>Big Pairs in a Matrix</h1>
                <div style={{
                    width: 60, height: 1,
                    background: "linear-gradient(90deg, transparent, #7a7060, transparent)",
                    margin: "14px auto 0",
                }}/>
            </div>

            {/* Matrix */}
            <div style={{ position: "relative", marginBottom: 32 }}>
                {/* Column label */}
                {step >= 6 && (
                    <div style={{
                        position: "absolute",
                        top: -24,
                        left: "calc(50% + 28px)",
                        color: "#ffe566",
                        fontSize: 12,
                        letterSpacing: "0.1em",
                        fontStyle: "italic",
                    }}>column j</div>
                )}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 72px)",
                    gridTemplateRows: "repeat(4, 72px)",
                    gap: 6,
                    padding: 18,
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.07)",
                    boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
                }}>
                    {matrix.map((row, r) =>
                        row.map((val, c) => {
                            const st = getCellStyle(r, c);
                            const isXcell = isX(r,c);
                            const isYcell = isY(r,c);
                            const isZcell = isZ(r,c);
                            return (
                                <div key={`${r}-${c}`} style={{
                                    width: 72, height: 72,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    position: "relative",
                                    borderRadius: showSquare && isSquared(r,c) ? 4 : "50%",
                                    background: st.bg,
                                    transition: "all 0.4s ease",
                                }}>
                                    {/* Circle ring */}
                                    {showCircle && isCircled(r,c) && (
                                        <div style={{
                                            position: "absolute",
                                            inset: 6,
                                            borderRadius: "50%",
                                            border: "2.5px solid #f4a261",
                                            boxShadow: "0 0 12px rgba(244,162,97,0.4)",
                                            transition: "all 0.4s",
                                        }}/>
                                    )}
                                    {/* Square ring */}
                                    {showSquare && isSquared(r,c) && (
                                        <div style={{
                                            position: "absolute",
                                            inset: 6,
                                            borderRadius: 3,
                                            border: "2.5px solid #90e0a0",
                                            boxShadow: "0 0 12px rgba(144,224,160,0.35)",
                                            transition: "all 0.4s",
                                        }}/>
                                    )}
                                    <span style={{
                                        fontSize: 26,
                                        fontWeight: st.fontWeight,
                                        color: st.color,
                                        transition: "color 0.4s",
                                        zIndex: 1,
                                        fontStyle: "normal",
                                        fontFamily: "'Georgia', serif",
                                    }}>{val}</span>
                                    {/* Labels */}
                                    {isXcell && (
                                        <span style={{
                                            position: "absolute", top: 2, right: 6,
                                            fontSize: 11, color: "#ffe566", fontStyle: "italic",
                                        }}>x</span>
                                    )}
                                    {isYcell && (
                                        <span style={{
                                            position: "absolute", top: 2, right: 6,
                                            fontSize: 11, color: "#ff8080", fontStyle: "italic",
                                        }}>y</span>
                                    )}
                                    {isZcell && (
                                        <span style={{
                                            position: "absolute", top: 2, right: 6,
                                            fontSize: 11, color: "#c890ff", fontStyle: "italic",
                                        }}>z</span>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Legend */}
            {step >= 2 && (
                <div style={{
                    display: "flex", gap: 20, marginBottom: 24,
                    opacity: step >= 2 ? 1 : 0,
                    transition: "opacity 0.4s",
                }}>
                    {step >= 2 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{
                                width: 22, height: 22, borderRadius: "50%",
                                border: "2px solid #f4a261",
                                boxShadow: "0 0 8px rgba(244,162,97,0.4)",
                            }}/>
                            <span style={{ fontSize: 12, color: "#f4a261", letterSpacing: "0.05em" }}>row max</span>
                        </div>
                    )}
                    {step >= 3 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{
                                width: 22, height: 22, borderRadius: 3,
                                border: "2px solid #90e0a0",
                                boxShadow: "0 0 8px rgba(144,224,160,0.35)",
                            }}/>
                            <span style={{ fontSize: 12, color: "#90e0a0", letterSpacing: "0.05em" }}>row 2nd</span>
                        </div>
                    )}
                    {step >= 6 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 16, height: 16, background: "rgba(255,220,50,0.3)", borderRadius: 2 }}/>
                            <span style={{ fontSize: 12, color: "#ffe566", letterSpacing: "0.05em" }}>x (max square)</span>
                        </div>
                    )}
                    {step >= 7 && <>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 16, height: 16, background: "rgba(255,100,100,0.3)", borderRadius: 2 }}/>
                            <span style={{ fontSize: 12, color: "#ff8080", letterSpacing: "0.05em" }}>y (col j circle)</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 16, height: 16, background: "rgba(180,120,255,0.3)", borderRadius: 2 }}/>
                            <span style={{ fontSize: 12, color: "#c890ff", letterSpacing: "0.05em" }}>z (y's row square)</span>
                        </div>
                    </>}
                </div>
            )}

            {/* Step card */}
            <div style={{
                maxWidth: 520,
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 14,
                padding: "24px 28px",
                marginBottom: 24,
                minHeight: 110,
                boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                transition: "all 0.3s ease",
            }}>
                <div style={{
                    display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10,
                }}>
          <span style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#7a7060",
          }}>Step {step + 1} of {steps.length}</span>
                    <h2 style={{
                        margin: 0,
                        fontSize: 16,
                        fontStyle: "italic",
                        fontWeight: "normal",
                        color: "#e8dcc8",
                    }}>{s.title}</h2>
                </div>
                <p style={{
                    margin: 0,
                    fontSize: 14,
                    lineHeight: 1.75,
                    color: "#b0a898",
                }}>{s.desc}</p>

                {/* Special formula display for contradiction step */}
                {step === 8 && (
                    <div style={{
                        marginTop: 16,
                        padding: "12px 16px",
                        background: "rgba(255,80,80,0.07)",
                        border: "1px solid rgba(255,80,80,0.2)",
                        borderRadius: 8,
                        fontStyle: "italic",
                        fontSize: 15,
                        color: "#ff9090",
                        textAlign: "center",
                        lineHeight: 2,
                    }}>
                        x ≥ z &nbsp;⟹&nbsp; y + x ≥ y + z = r &gt; c<br/>
                        <span style={{ color: "#7a7060", fontSize: 12 }}>but y, x both in column j &nbsp;⟹&nbsp; y + x ≤ c</span><br/>
                        <span style={{ color: "#ff6060", fontSize: 13 }}>Contradiction! ∎</span>
                    </div>
                )}
                {step === 4 && (
                    <div style={{
                        marginTop: 14,
                        padding: "10px 16px",
                        background: "rgba(244,162,97,0.07)",
                        border: "1px solid rgba(244,162,97,0.2)",
                        borderRadius: 8,
                        fontStyle: "italic",
                        fontSize: 14,
                        color: "#f4a261",
                        textAlign: "center",
                    }}>
                        circled ≥ r/2 &nbsp;·&nbsp; this matrix: r = 15, so circled ≥ 7.5
                    </div>
                )}
                {step === 0 && (
                    <div style={{
                        marginTop: 14, display: "flex", gap: 20, justifyContent: "center",
                        padding: "10px 0",
                    }}>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 22, fontStyle: "italic", color: "#f4a261" }}>r = 15</div>
                            <div style={{ fontSize: 11, color: "#7a7060", letterSpacing: "0.1em", marginTop: 3 }}>each row's top-2 sum</div>
                        </div>
                        <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }}/>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 22, fontStyle: "italic", color: "#90e0a0" }}>c = 15</div>
                            <div style={{ fontSize: 11, color: "#7a7060", letterSpacing: "0.1em", marginTop: 3 }}>each column's top-2 sum</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <button
                    onClick={() => handleStep(-1)}
                    disabled={step === 0}
                    style={{
                        width: 44, height: 44,
                        borderRadius: "50%",
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: step === 0 ? "transparent" : "rgba(255,255,255,0.06)",
                        color: step === 0 ? "#3a3830" : "#e2d9c5",
                        fontSize: 18,
                        cursor: step === 0 ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                >‹</button>

                {/* Dots */}
                <div style={{ display: "flex", gap: 6 }}>
                    {steps.map((_,i) => (
                        <div
                            key={i}
                            onClick={() => setStep(i)}
                            style={{
                                width: i === step ? 20 : 6,
                                height: 6,
                                borderRadius: 3,
                                background: i === step ? "#f4a261" : "rgba(255,255,255,0.15)",
                                cursor: "pointer",
                                transition: "all 0.3s",
                            }}
                        />
                    ))}
                </div>

                <button
                    onClick={() => handleStep(1)}
                    disabled={step === steps.length - 1}
                    style={{
                        width: 44, height: 44,
                        borderRadius: "50%",
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: step === steps.length-1 ? "transparent" : "rgba(255,255,255,0.06)",
                        color: step === steps.length-1 ? "#3a3830" : "#e2d9c5",
                        fontSize: 18,
                        cursor: step === steps.length-1 ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                >›</button>
            </div>
        </div>
    );
}
