import { useState } from "react";

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

export default function BigPairsMatrix() {
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
    // r=c=15

    const circlePos = [[0,1],[1,0],[2,3],[3,2]];
    const squarePos = [[0,3],[1,2],[2,1],[3,0]];

    const xCell = [1,2];
    const yCell = [3,2];
    const zCell = [3,0];

    const s = steps[step];

    const isCircled = (r,c) => circlePos.some(([pr,pc])=>pr===r&&pc===c);
    const isSquared = (r,c) => squarePos.some(([pr,pc])=>pr===r&&pc===c);
    const isX = (r,c) => step>=6 && r===xCell[0] && c===xCell[1];
    const isY = (r,c) => step>=7 && r===yCell[0] && c===yCell[1];
    const isZ = (r,c) => step>=7 && r===zCell[0] && c===zCell[1];

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
        let color = "var(--text)";
        let fontWeight = "400";
        let shadow = "none";

        if (step >= 5 && c === 2) {
            bg = "rgba(100,180,255,0.18)";
        }
        if (showCircle && isCircled(r,c)) {
            color = "#f4a261";
            fontWeight = "700";
            shadow = "0 0 12px rgba(244,162,97,0.4)";
        }
        if (showSquare && isSquared(r,c)) {
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

        return { bg, color, fontWeight, shadow };
    };

    return (
        <div className="page">
            <div className="page-header">
                <div className="page-title">Big Pairs in a Matrix</div>
                <div className="page-desc">A mathematical proof illustration: in an n×n matrix where each row's two largest values sum to r and each column's two largest sum to c, we show r = c.</div>
            </div>

            {/* Matrix */}
            <div style={{ position: "relative", marginBottom: 32 }}>
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
                    background: "var(--surface2)",
                    borderRadius: 16,
                    border: "1px solid var(--border)",
                    boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
                }}>
                    {matrix.map((row, r) =>
                        row.map((val, c) => {
                            const st = getCellStyle(r, c);
                            return (
                                <div key={`${r}-${c}`} style={{
                                    width: 72, height: 72,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    position: "relative",
                                    background: st.bg,
                                    transition: "all 0.4s ease",
                                }}>
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
                                        fontFamily: "'Georgia', serif",
                                        textShadow: st.shadow,
                                    }}>{val}</span>
                                    {isX(r,c) && (
                                        <span style={{
                                            position: "absolute", top: 2, right: 6,
                                            fontSize: 11, color: "#ffe566", fontStyle: "italic",
                                        }}>x</span>
                                    )}
                                    {isY(r,c) && (
                                        <span style={{
                                            position: "absolute", top: 2, right: 6,
                                            fontSize: 11, color: "#ff8080", fontStyle: "italic",
                                        }}>y</span>
                                    )}
                                    {isZ(r,c) && (
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
                    flexWrap: "wrap", justifyContent: "center",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                            width: 22, height: 22, borderRadius: "50%",
                            border: "2px solid #f4a261",
                            boxShadow: "0 0 8px rgba(244,162,97,0.4)",
                        }}/>
                        <span style={{ fontSize: 12, color: "#f4a261", letterSpacing: "0.05em" }}>row max</span>
                    </div>
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
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "24px 28px",
                marginBottom: 24,
                minHeight: 110,
                boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                transition: "all 0.3s ease",
            }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
                    <span style={{
                        fontSize: 11,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: "var(--text-dim)",
                    }}>Step {step + 1} of {steps.length}</span>
                    <h2 style={{
                        margin: 0,
                        fontSize: 16,
                        fontStyle: "italic",
                        fontWeight: "normal",
                        color: "var(--text)",
                    }}>{s.title}</h2>
                </div>
                <p style={{
                    margin: 0,
                    fontSize: 14,
                    lineHeight: 1.75,
                    color: "var(--text-dim)",
                }}>{s.desc}</p>

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
                        <span style={{ color: "var(--text-dim)", fontSize: 12 }}>but y, x both in column j &nbsp;⟹&nbsp; y + x ≤ c</span><br/>
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
                            <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.1em", marginTop: 3 }}>each row's top-2 sum</div>
                        </div>
                        <div style={{ width: 1, background: "var(--border)" }}/>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 22, fontStyle: "italic", color: "#90e0a0" }}>c = 15</div>
                            <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.1em", marginTop: 3 }}>each column's top-2 sum</div>
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
                        border: "1px solid var(--border)",
                        background: step === 0 ? "transparent" : "var(--surface2)",
                        color: step === 0 ? "var(--border)" : "var(--text)",
                        fontSize: 18,
                        cursor: step === 0 ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                >‹</button>

                <div style={{ display: "flex", gap: 6 }}>
                    {steps.map((_,i) => (
                        <div
                            key={i}
                            onClick={() => setStep(i)}
                            style={{
                                width: i === step ? 20 : 6,
                                height: 6,
                                borderRadius: 3,
                                background: i === step ? "#f4a261" : "var(--border)",
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
                        border: "1px solid var(--border)",
                        background: step === steps.length-1 ? "transparent" : "var(--surface2)",
                        color: step === steps.length-1 ? "var(--border)" : "var(--text)",
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
