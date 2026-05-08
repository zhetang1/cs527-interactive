import { useState, useEffect, useRef } from "react";
import { useTheme } from "../components/ThemeContext";

const R = 148, CX = 160, CY = 160;

const CUT_ANGLES = [
    [10,  180],
    [29,  227],
    [52,  241],
    [78,  339],
    [128, 341],
    [349, 168],
    [315,  71],
    [249,  69],
    [185,  27],
    [357, 170],
];

const TOPPINGS = [
    [CX-50, CY-50], [CX+50, CY-60], [CX-70, CY+30],
    [CX+60, CY+55], [CX, CY-80], [CX+30, CY+10],
    [CX-30, CY+70], [CX+90, CY-10], [CX-90, CY+10],
    [CX+10, CY+90], [CX-60, CY-80],
];

const EXPLAINS = [
    <>Start with <strong>1 piece</strong>: the whole pizza. Each new cut crosses all previous cuts, adding more pieces.</>,
    <>Cut 1 adds <strong>1 new piece</strong> (crosses 0 previous cuts → 0+1 = 1 new piece). Total: <strong>2</strong>.</>,
    <>Cut 2 crosses cut 1 once → <strong>2 new pieces</strong>. Total: <strong>4</strong>.</>,
    <>Cut 3 crosses cuts 1 &amp; 2 → <strong>3 new pieces</strong>. Total: <strong>7</strong>.</>,
    <>Cut 4 crosses 3 previous cuts → <strong>4 new pieces</strong>. Total: <strong>11</strong>.</>,
    <>Cut 5 crosses 4 previous cuts → <strong>5 new pieces</strong>. Total: <strong>16</strong>.</>,
    <>Cut 6 crosses 5 cuts → <strong>6 new pieces</strong>. Total: <strong>22</strong>.</>,
    <>Cut 7 crosses 6 cuts → <strong>7 new pieces</strong>. Total: <strong>29</strong>.</>,
    <>Cut 8 crosses 7 cuts → <strong>8 new pieces</strong>. Total: <strong>37</strong>.</>,
    <>Cut 9 crosses 8 cuts → <strong>9 new pieces</strong>. Total: <strong>46</strong>.</>,
    <>Cut 10 crosses 9 cuts → <strong>10 new pieces</strong>. Total: <strong>56</strong> — the answer!</>,
];

function degToRad(d) { return d * Math.PI / 180; }
function ptOnCircle(angleDeg) {
    const a = degToRad(angleDeg);
    return [CX + R * Math.cos(a), CY + R * Math.sin(a)];
}
function pieces(n) { return 1 + n * (n + 1) / 2; }
function intersect(i, j) {
    const [a1, a2] = CUT_ANGLES[i];
    const [b1, b2] = CUT_ANGLES[j];
    const [x1,y1] = ptOnCircle(a1), [x2,y2] = ptOnCircle(a2);
    const [x3,y3] = ptOnCircle(b1), [x4,y4] = ptOnCircle(b2);
    const denom = (x1-x2)*(y3-y4) - (y1-y2)*(x3-x4);
    if (Math.abs(denom) < 1e-9) return null;
    const t = ((x1-x3)*(y3-y4)-(y1-y3)*(x3-x4))/denom;
    return [x1+t*(x2-x1), y1+t*(y2-y1)];
}

function drawPizza(ctx, numCuts, isLight) {
    ctx.clearRect(0, 0, 320, 320);

    // Crust shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI*2);
    ctx.fillStyle = '#c8801a';
    ctx.fill();
    ctx.restore();

    // Crust
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI*2);
    ctx.fillStyle = '#d4922a';
    ctx.fill();

    // Sauce
    ctx.beginPath();
    ctx.arc(CX, CY, R - 18, 0, Math.PI*2);
    ctx.fillStyle = '#c0392b';
    ctx.fill();

    // Cheese
    ctx.beginPath();
    ctx.arc(CX, CY, R - 22, 0, Math.PI*2);
    ctx.fillStyle = '#f0c060';
    ctx.fill();

    // Cheese texture blobs
    ctx.fillStyle = '#e8b040';
    [[CX-40,CY-30,28],[CX+30,CY-50,22],[CX-20,CY+50,30],[CX+60,CY+20,18],[CX-60,CY+40,20],[CX+10,CY-10,35]].forEach(([x,y,r])=>{
        ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    });

    // Pepperoni
    TOPPINGS.forEach(([tx,ty]) => {
        const d = Math.sqrt((tx-CX)**2+(ty-CY)**2);
        if (d > R-26) return;
        ctx.beginPath();
        ctx.arc(tx, ty, 12, 0, Math.PI*2);
        ctx.fillStyle = '#922b21';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(tx-2, ty-2, 4, 0, Math.PI*2);
        ctx.fillStyle = '#7b241c';
        ctx.fill();
    });

    // Crust ring
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI*2);
    ctx.strokeStyle = '#b07020';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw cuts
    for (let i = 0; i < numCuts; i++) {
        const [a1, a2] = CUT_ANGLES[i];
        const [x1, y1] = ptOnCircle(a1);
        const [x2, y2] = ptOnCircle(a2);
        const hue = (i * 33) % 360;

        ctx.save();
        ctx.shadowColor = 'rgba(255,255,255,0.6)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `hsl(${hue},90%,75%)`;
        ctx.lineWidth = 2.2;
        ctx.setLineDash([]);
        ctx.stroke();
        ctx.restore();

        const mx = (x1 + CX) / 2;
        const my = (y1 + CY) / 2;
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = isLight ? `hsl(${hue},80%,22%)` : `hsl(${hue},90%,85%)`;
        ctx.fillText(i+1, mx - 5, my + 4);
    }

    // Intersection dots
    for (let i = 0; i < numCuts; i++) {
        for (let j = i+1; j < numCuts; j++) {
            const pt = intersect(i, j);
            if (!pt) continue;
            const [ix, iy] = pt;
            const d = Math.sqrt((ix-CX)**2+(iy-CY)**2);
            if (d > R-2) continue;
            ctx.beginPath();
            ctx.arc(ix, iy, 4, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.fill();
        }
    }
}

export default function PizzaCuts() {
    const [n, setN] = useState(0);
    const canvasRef = useRef(null);
    const { theme } = useTheme();
    const [isLight, setIsLight] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: light)');
        const update = () => {
            if (theme === 'light') setIsLight(true);
            else if (theme === 'dark') setIsLight(false);
            else setIsLight(mq.matches);
        };
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, [theme]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        drawPizza(ctx, n, isLight);
    }, [n, isLight]);

    const gold     = isLight ? '#7a4500' : '#f5c842';
    const goldDim  = isLight ? '#8a5200' : '#c9a96e';
    const goldText = isLight ? '#3d2005' : '#f5e6c8';
    const cardBg   = isLight ? 'var(--surface)' : 'rgba(255,255,255,0.04)';
    const cardBorder = isLight ? 'rgba(122,69,0,0.3)' : 'rgba(245,200,66,0.18)';
    const dividerColor = isLight ? 'rgba(122,69,0,0.2)' : 'rgba(245,200,66,0.12)';
    const formulaBg = isLight ? 'rgba(122,69,0,0.08)' : 'rgba(245,200,66,0.07)';

    const p = pieces(n);
    const parts = Array.from({length: n}, (_, k) => k + 1);
    const formulaExpanded = n > 0
        ? `= 1 + (${parts.join('+')}) = 1 + ${n*(n+1)/2} = ${p}`
        : `= 1`;

    return (
        <div className="page">
            <div className="page-header">
                <div className="page-title">Efficient Pizza Cutting</div>
                <div className="page-desc">How many pieces can n straight cuts make? Each new cut crosses all previous cuts — watch the count grow step by step.</div>
            </div>

            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 36,
                justifyContent: 'center',
                alignItems: 'flex-start',
                width: '100%',
                maxWidth: 960,
            }}>
                {/* Canvas */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                    <canvas
                        ref={canvasRef}
                        width={320}
                        height={320}
                        style={{
                            borderRadius: '50%',
                            boxShadow: '0 0 0 6px #3d2005, 0 0 40px rgba(245,200,66,0.15)',
                            display: 'block',
                        }}
                    />
                </div>

                {/* Controls */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 18,
                    minWidth: 240,
                    maxWidth: 320,
                    background: cardBg,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 14,
                    padding: '28px 24px',
                }}>
                    {/* Stats */}
                    {[['Cuts (n)', n], ['Pieces', p]].map(([label, val]) => (
                        <div key={label} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            borderBottom: `1px solid ${dividerColor}`,
                            paddingBottom: 10,
                        }}>
                            <span style={{ fontSize: '0.82rem', color: goldDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
                            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: gold, lineHeight: 1 }}>{val}</span>
                        </div>
                    ))}

                    {/* Formula */}
                    <div style={{
                        background: formulaBg,
                        borderLeft: `3px solid ${gold}`,
                        borderRadius: 4,
                        padding: '10px 14px',
                        fontSize: '0.92rem',
                        color: goldText,
                        lineHeight: 1.7,
                    }}>
                        Pieces = 1 + <em style={{ fontFamily: "'Playfair Display', serif", color: gold }}>n</em>(<em style={{ fontFamily: "'Playfair Display', serif", color: gold }}>n</em>+1)/2
                        <br/>
                        <span style={{ fontSize: '0.85em', color: goldDim }}>{formulaExpanded}</span>
                    </div>

                    {/* Slider */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: '0.78rem', color: goldDim, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Jump to cut #</span>
                        <input
                            type="range"
                            min={0} max={10} value={n} step={1}
                            onChange={e => setN(+e.target.value)}
                            style={{ width: '100%', accentColor: '#f5c842', height: 4, cursor: 'pointer' }}
                        />
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button
                            onClick={() => setN(v => Math.min(10, v + 1))}
                            disabled={n >= 10}
                            style={{
                                flex: 1, padding: '10px 0', borderRadius: 8,
                                border: `1.5px solid ${gold}`,
                                background: gold, color: '#1a1008',
                                fontWeight: 600, fontSize: '0.88rem',
                                cursor: n >= 10 ? 'default' : 'pointer',
                                opacity: n >= 10 ? 0.35 : 1,
                                transition: 'all 0.18s',
                                fontFamily: "'Source Serif 4', serif",
                            }}
                        >+ Add Cut</button>
                        <button
                            onClick={() => setN(0)}
                            style={{
                                flex: 1, padding: '10px 0', borderRadius: 8,
                                border: `1.5px solid ${isLight ? 'rgba(122,69,0,0.5)' : 'rgba(245,200,66,0.4)'}`,
                                background: 'transparent', color: goldDim,
                                fontSize: '0.88rem', cursor: 'pointer',
                                transition: 'all 0.18s',
                                fontFamily: "'Source Serif 4', serif",
                            }}
                        >Reset</button>
                    </div>

                    {/* Explanation */}
                    <div style={{ fontSize: '0.88rem', color: goldDim, lineHeight: 1.65 }}>
                        {EXPLAINS[n]}
                    </div>

                    {/* Step chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                        {Array.from({length: 11}, (_, k) => (
                            <div
                                key={k}
                                onClick={() => setN(k)}
                                style={{
                                    fontSize: '0.72rem',
                                    background: k === n
                                        ? (isLight ? 'rgba(122,69,0,0.18)' : 'rgba(245,200,66,0.25)')
                                        : (isLight ? 'rgba(122,69,0,0.07)' : 'rgba(245,200,66,0.1)'),
                                    border: `1px solid ${k === n ? gold : (isLight ? 'rgba(122,69,0,0.2)' : 'rgba(245,200,66,0.2)')}`,
                                    borderRadius: 20,
                                    padding: '2px 9px',
                                    color: k === n ? goldText : goldDim,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                }}
                            >n={k}: {pieces(k)}</div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
