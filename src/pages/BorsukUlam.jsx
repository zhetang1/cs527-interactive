import { useEffect, useRef } from 'react';
import './borsuk-ulam.css';

export default function BorsukUlam() {
  const heatRingRef = useRef(null);
  const ptARef = useRef(null);
  const ptBRef = useRef(null);
  const lblARef = useRef(null);
  const lblBRef = useRef(null);
  const antiLineRef = useRef(null);

  useEffect(() => {
    const ring = heatRingRef.current;
    if (!ring) return;

    const SEG = 96;
    const R = 135;
    const THICK = 18;
    const SVG_NS = 'http://www.w3.org/2000/svg';

    const phaseA = 0.3;
    const phaseB = 0.5;
    const f = (t) => Math.sin(t + phaseA) + 0.4 * Math.cos(2 * t + phaseB);

    let fmin = Infinity, fmax = -Infinity;
    for (let i = 0; i < 1000; i++) {
      const v = f((i / 1000) * Math.PI * 2);
      if (v < fmin) fmin = v;
      if (v > fmax) fmax = v;
    }

    function lerp(a, b, t) { return a + (b - a) * t; }
    function color(v) {
      const t = (v - fmin) / (fmax - fmin);
      let r, g, b;
      if (t < 0.5) {
        const k = t / 0.5;
        r = lerp(43, 232, k);
        g = lerp(93, 220, k);
        b = lerp(122, 181, k);
      } else {
        const k = (t - 0.5) / 0.5;
        r = lerp(232, 200, k);
        g = lerp(220, 85, k);
        b = lerp(181, 61, k);
      }
      return `rgb(${r | 0},${g | 0},${b | 0})`;
    }

    // Clear previous children (React strict mode may call twice)
    while (ring.firstChild) ring.removeChild(ring.firstChild);

    for (let i = 0; i < SEG; i++) {
      const a0 = (i / SEG) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((i + 1) / SEG) * Math.PI * 2 - Math.PI / 2;
      const tMid = ((i + 0.5) / SEG) * Math.PI * 2 - Math.PI / 2;
      const rOuter = R + THICK / 2;
      const rInner = R - THICK / 2;
      const x0o = Math.cos(a0) * rOuter, y0o = Math.sin(a0) * rOuter;
      const x1o = Math.cos(a1) * rOuter, y1o = Math.sin(a1) * rOuter;
      const x1i = Math.cos(a1) * rInner, y1i = Math.sin(a1) * rInner;
      const x0i = Math.cos(a0) * rInner, y0i = Math.sin(a0) * rInner;

      const path = document.createElementNS(SVG_NS, 'path');
      const d = `M ${x0o} ${y0o} A ${rOuter} ${rOuter} 0 0 1 ${x1o} ${y1o} L ${x1i} ${y1i} A ${rInner} ${rInner} 0 0 0 ${x0i} ${y0i} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', color(f(tMid + Math.PI / 2)));
      path.setAttribute('stroke', 'none');
      ring.appendChild(path);
    }

    function angleToXY(theta) {
      const a = theta - Math.PI / 2;
      return { x: Math.cos(a) * R + 200, y: Math.sin(a) * R + 190 };
    }
    const thetaA = -phaseA;
    const thetaB = Math.PI - phaseA;
    const ptA = angleToXY(thetaA);
    const ptB = angleToXY(thetaB);

    ptARef.current?.setAttribute('cx', ptA.x);
    ptARef.current?.setAttribute('cy', ptA.y);
    ptBRef.current?.setAttribute('cx', ptB.x);
    ptBRef.current?.setAttribute('cy', ptB.y);

    function labelPos(theta, off) {
      const a = theta - Math.PI / 2;
      return { x: Math.cos(a) * (R + off) + 200, y: Math.sin(a) * (R + off) + 190 + 5 };
    }
    const lblAp = labelPos(thetaA, 28);
    const lblBp = labelPos(thetaB, 28);
    lblARef.current?.setAttribute('x', lblAp.x);
    lblARef.current?.setAttribute('y', lblAp.y);
    lblARef.current?.setAttribute('text-anchor', 'middle');
    lblBRef.current?.setAttribute('x', lblBp.x);
    lblBRef.current?.setAttribute('y', lblBp.y);
    lblBRef.current?.setAttribute('text-anchor', 'middle');

    antiLineRef.current?.setAttribute('x1', ptA.x);
    antiLineRef.current?.setAttribute('y1', ptA.y);
    antiLineRef.current?.setAttribute('x2', ptB.x);
    antiLineRef.current?.setAttribute('y2', ptB.y);
  }, []);

  return (
    <div className="bu-page">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..900,30..100,0..1;1,9..144,300..900,30..100,0..1&family=Crimson+Pro:ital,wght@0,300..700;1,300..700&family=JetBrains+Mono:wght@400;500&display=swap"
      />
      <main className="bu-main">

        {/* HEADER */}
        <header className="bu-header">
          <div className="bu-eyebrow bu-reveal">Algebraic Topology · 1933</div>
          <h1 className="bu-h1 bu-reveal bu-reveal-2">
            The <em>Borsuk</em><span className="bu-amp">–</span><em>Ulam</em><br />Theorem
          </h1>
          <p className="bu-subtitle bu-reveal bu-reveal-3">
            Why, at this very moment, two antipodal points on Earth share <em>exactly</em> the same temperature <em>and</em> barometric pressure — and why this is a theorem of topology, not meteorology.
          </p>
        </header>

        <hr className="bu-fancy" />

        {/* § I */}
        <section className="bu-section">
          <div className="bu-section-num">§ I · The statement</div>
          <h2 className="bu-h2">A map of a sphere always folds <em>two opposites</em> onto one point.</h2>

          <p className="bu-p bu-drop">Imagine any continuous way of assigning, to each point on a sphere, a value in the plane. Maybe you give each point on Earth the pair <span className="bu-math">(temperature, humidity)</span>. Maybe you flatten a balloon onto a tabletop. Whatever the assignment, the Borsuk–Ulam theorem makes a startling guarantee.</p>

          <div className="bu-theorem">
            For every continuous function <span className="bu-math">f : S<sup>n</sup> → ℝ<sup>n</sup></span>, there exists a point <span className="bu-math">x ∈ S<sup>n</sup></span> such that <em>f(x) = f(−x)</em>.
          </div>

          <p className="bu-p">Here <span className="bu-math">S<sup>n</sup></span> is the <em>n</em>-sphere — the surface of an (n+1)-dimensional ball — and <span className="bu-math">−x</span> is the <em>antipode</em> of <span className="bu-math">x</span>, diametrically opposite through the center. Karol Borsuk proved it in 1933 from a conjecture of Stanisław Ulam.</p>
        </section>

        {/* § II */}
        <section className="bu-section">
          <div className="bu-section-num">§ II · The simplest case</div>
          <h2 className="bu-h2">On any loop, <em>two opposite points</em> always agree.</h2>

          <p className="bu-p">Take <span className="bu-math">n = 1</span>. Now <span className="bu-math">S<sup>1</sup></span> is a circle, and <span className="bu-math">f</span> sends each point to a single real number — say, a temperature. The theorem promises: <span className="bu-accent">somewhere on the circle, two diametrically opposite points have exactly the same temperature.</span></p>

          <p className="bu-p">Picture an iron ring heated unevenly by a flame: some points scorched, others cool. The theorem says no matter how clever or perverse the heating, you can <em>always</em> find a pair of antipodes at identical temperatures.</p>

          {/* Figure 1 */}
          <figure className="bu-figure">
            <svg viewBox="0 0 520 380" width="520" height="380" aria-label="A circle whose perimeter is colored by a varying temperature function, with two antipodal points highlighted where temperatures coincide.">
              <defs>
                <marker id="bu-arrow1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0,0 L10,5 L0,10 z" fill="#897f6a" />
                </marker>
              </defs>
              <circle cx="200" cy="190" r="135" className="bu-stroke-rule" strokeDasharray="2 4" />
              <g ref={heatRingRef} transform="translate(200,190)" />
              <circle cx="200" cy="190" r="2" className="bu-fill-ink" />
              <line ref={antiLineRef} className="bu-stroke-ink" strokeDasharray="3 5" opacity="0.55" />
              <circle ref={ptARef} className="bu-fill-accent bu-pulse" r="7" />
              <circle ref={ptBRef} className="bu-fill-accent bu-pulse-delay" r="7" />
              <text ref={lblARef} className="bu-text-math">x</text>
              <text ref={lblBRef} className="bu-text-math">−x</text>
              <g transform="translate(370,90)">
                <text className="bu-text-label" x="0" y="0">temperature</text>
                <defs>
                  <linearGradient id="bu-tempGrad" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#2b5d7a" />
                    <stop offset="50%" stopColor="#e8dcb5" />
                    <stop offset="100%" stopColor="#c8553d" />
                  </linearGradient>
                </defs>
                <rect x="20" y="14" width="14" height="160" fill="url(#bu-tempGrad)" rx="2" />
                <text className="bu-text-mono" x="42" y="22" fontSize="10">cold</text>
                <text className="bu-text-mono" x="42" y="100" fontSize="10">·</text>
                <text className="bu-text-mono" x="42" y="176" fontSize="10">hot</text>
                <g transform="translate(-40,210)">
                  <text className="bu-text-math" x="0" y="0" fontSize="15">f(x) = f(−x)</text>
                  <line x1="60" y1="-6" x2="-30" y2="-30" className="bu-stroke-rule" markerEnd="url(#bu-arrow1)" />
                </g>
              </g>
              <text className="bu-text-label" x="200" y="356" textAnchor="middle">S¹ — the 1-sphere</text>
            </svg>
            <figcaption className="bu-figcaption"><strong>Figure I</strong>An unevenly heated ring. No matter how temperature varies around it, some pair of antipodal points must register the same value.</figcaption>
          </figure>

          {/* Proof */}
          <h2 className="bu-h2" style={{ marginTop: '60px' }}>A one-line <em>proof</em>.</h2>
          <p className="bu-p">Define a helper function</p>
          <p className="bu-display-eq">g(x) = f(x) − f(−x)</p>
          <p className="bu-p">Swap <span className="bu-math">x</span> for its antipode and watch what happens:</p>
          <p className="bu-display-eq">g(−x) = f(−x) − f(x) = <span style={{ color: 'var(--bu-accent)' }}>−g(x)</span></p>
          <p className="bu-p">So <span className="bu-math">g</span> takes opposite signs at antipodal points. As <span className="bu-math">x</span> slides along the circle from one position to its opposite, <span className="bu-math">g</span> moves continuously between a positive value and its negative — by the Intermediate Value Theorem, it <em>must</em> pass through zero. And <span className="bu-math">g = 0</span> is exactly the equation <span className="bu-math">f(x) = f(−x)</span>. <em>□</em></p>

          {/* Figure 2 */}
          <figure className="bu-figure">
            <svg viewBox="0 0 560 280" width="560" height="280" aria-label="A graph of g of theta showing antisymmetric shape crossing the horizontal axis.">
              <line x1="60" y1="140" x2="510" y2="140" className="bu-stroke-ink" />
              <line x1="80" y1="30" x2="80" y2="250" className="bu-stroke-ink" />
              <g className="bu-text-math" fontSize="14">
                <text x="80" y="270" textAnchor="middle">0</text>
                <text x="260" y="270" textAnchor="middle">π</text>
                <text x="440" y="270" textAnchor="middle">2π</text>
                <text x="48" y="145" textAnchor="middle">0</text>
                <text x="40" y="38" textAnchor="middle" className="bu-text-mono" fontSize="12" fill="var(--bu-muted)">g(θ)</text>
                <text x="520" y="145" className="bu-text-mono" fontSize="12" fill="var(--bu-muted)">θ</text>
              </g>
              <line x1="260" y1="30" x2="260" y2="250" className="bu-stroke-rule" strokeDasharray="3 4" />
              <path d="M 80 140 C 110 105, 140 78, 175 75 S 240 110, 260 140 S 320 175, 350 202 S 410 195, 440 140"
                className="bu-stroke-accent" fill="none" strokeWidth="2.5" />
              <circle cx="80" cy="140" r="5" className="bu-fill-accent" />
              <circle cx="260" cy="140" r="5" className="bu-fill-accent" />
              <circle cx="440" cy="140" r="5" className="bu-fill-accent" />
              <g transform="translate(260, 75)">
                <text className="bu-text-math" x="0" y="0" textAnchor="middle" fontSize="14">g(θ₀) = 0</text>
                <line x1="0" y1="8" x2="0" y2="58" className="bu-stroke-rule" markerEnd="url(#bu-arrow1)" />
              </g>
              <text x="170" y="50" className="bu-text-mono" fontSize="10" fill="var(--bu-muted)">positive</text>
              <text x="370" y="245" className="bu-text-mono" fontSize="10" fill="var(--bu-muted)">negative</text>
              <text x="290" y="155" className="bu-text-math" fontSize="13" fill="var(--bu-teal)">⟲ point-symmetric</text>
            </svg>
            <figcaption className="bu-figcaption"><strong>Figure II</strong>The helper function <span className="bu-math">g(θ) = f(θ) − f(θ+π)</span> is point-symmetric through (π, 0). Any continuous curve with this property is forced to cross the horizontal axis — and that crossing is the antipodal match.</figcaption>
          </figure>
        </section>

        {/* § III */}
        <section className="bu-section">
          <div className="bu-section-num">§ III · The case of the Earth</div>
          <h2 className="bu-h2">Antipodes share <em>a climate</em>.</h2>

          <p className="bu-p">Now take <span className="bu-math">n = 2</span>. The sphere <span className="bu-math">S<sup>2</sup></span> is the surface of an ordinary ball — the skin of the Earth, say — and <span className="bu-math">f : S<sup>2</sup> → ℝ<sup>2</sup></span> assigns each point a pair of numbers. Let those numbers be <em>(temperature, atmospheric pressure)</em>, both continuous on physical grounds. Borsuk–Ulam declares:</p>

          <div className="bu-theorem">
            At every moment, there exist two diametrically opposite points on Earth's surface where the temperature and the pressure are <em>simultaneously, exactly</em> equal.
          </div>

          {/* Figure 3 */}
          <figure className="bu-figure">
            <svg viewBox="0 0 560 380" width="560" height="380" aria-label="A stylized two-sphere with latitude and longitude curves and two antipodal points marked.">
              <defs>
                <radialGradient id="bu-sphereShade" cx="38%" cy="32%" r="70%">
                  <stop offset="0%" stopColor="#f5eed9" />
                  <stop offset="55%" stopColor="#ece4d1" />
                  <stop offset="100%" stopColor="#d9cea8" />
                </radialGradient>
              </defs>
              <circle cx="280" cy="190" r="140" fill="url(#bu-sphereShade)" stroke="var(--bu-ink)" strokeWidth="1.5" />
              <g className="bu-stroke-rule" fill="none" strokeWidth="1">
                <ellipse cx="280" cy="190" rx="140" ry="22" />
                <ellipse cx="280" cy="155" rx="135" ry="18" />
                <ellipse cx="280" cy="225" rx="135" ry="18" />
                <ellipse cx="280" cy="120" rx="120" ry="14" />
                <ellipse cx="280" cy="260" rx="120" ry="14" />
              </g>
              <g className="bu-stroke-rule" fill="none" strokeWidth="1">
                <ellipse cx="280" cy="190" rx="22" ry="140" />
                <ellipse cx="280" cy="190" rx="60" ry="140" opacity="0.6" />
                <ellipse cx="280" cy="190" rx="100" ry="140" opacity="0.4" />
              </g>
              <circle cx="280" cy="190" r="140" fill="none" stroke="var(--bu-ink)" strokeWidth="1.5" />
              <line x1="200" y1="245" x2="360" y2="135" className="bu-stroke-accent" strokeDasharray="4 4" opacity="0.55" />
              <circle cx="360" cy="135" r="8" className="bu-fill-accent" />
              <circle cx="360" cy="135" r="14" fill="none" stroke="var(--bu-accent)" strokeWidth="1" opacity="0.5" />
              <circle cx="200" cy="245" r="8" fill="var(--bu-bg)" stroke="var(--bu-accent)" strokeWidth="2" />
              <circle cx="200" cy="245" r="14" fill="none" stroke="var(--bu-accent)" strokeWidth="1" opacity="0.5" strokeDasharray="2 3" />
              <g className="bu-text-math" fontSize="17">
                <text x="380" y="125">x</text>
                <text x="180" y="262">−x</text>
              </g>
              <g transform="translate(420, 70)">
                <rect x="0" y="0" width="120" height="78" fill="var(--bu-paper)" stroke="var(--bu-ink)" strokeWidth="1" rx="3" />
                <text x="10" y="18" className="bu-text-label">at x</text>
                <text x="10" y="40" className="bu-text-math" fontSize="14">T  =  14.2°</text>
                <text x="10" y="62" className="bu-text-math" fontSize="14">P  =  1013 hPa</text>
              </g>
              <g transform="translate(20, 250)">
                <rect x="0" y="0" width="120" height="78" fill="var(--bu-paper)" stroke="var(--bu-ink)" strokeWidth="1" rx="3" />
                <text x="10" y="18" className="bu-text-label">at −x</text>
                <text x="10" y="40" className="bu-text-math" fontSize="14">T  =  14.2°</text>
                <text x="10" y="62" className="bu-text-math" fontSize="14">P  =  1013 hPa</text>
              </g>
              <line x1="368" y1="130" x2="420" y2="100" className="bu-stroke-rule" />
              <line x1="192" y1="248" x2="140" y2="280" className="bu-stroke-rule" />
              <text className="bu-text-label" x="280" y="360" textAnchor="middle">S² — the 2-sphere</text>
            </svg>
            <figcaption className="bu-figcaption"><strong>Figure III</strong>For any two continuous quantities defined over the Earth's surface, antipodes exist where both quantities coincide simultaneously. Topology forces the agreement; the values themselves are arbitrary.</figcaption>
          </figure>

          <p className="bu-p">This is not a fact about weather. It is a fact about continuous maps and antipodal symmetry. The same theorem says: if you crumple two identical sheets of paper and place one on the other, some pair of antipodal points lies exactly above its partner.</p>
        </section>

        {/* § IV */}
        <section className="bu-section">
          <div className="bu-section-num">§ IV · Where it leads</div>
          <h2 className="bu-h2">Three <em>consequences</em> worth knowing.</h2>

          <div className="bu-corollary">
            <div className="bu-corollary-num">i</div>
            <div>
              <h3 className="bu-h3">The Ham Sandwich Theorem</h3>
              <p className="bu-p" style={{ marginBottom: 0 }}>Given any three solids in space — a slice of ham, a piece of bread, a piece of cheese, in <em>any</em> arrangement — there exists a single flat plane that bisects all three by volume at once. Borsuk–Ulam is the engine of the proof; the sandwich is just dressing.</p>
            </div>
          </div>

          <div className="bu-corollary">
            <div className="bu-corollary-num">ii</div>
            <div>
              <h3 className="bu-h3">The Brouwer Fixed-Point Theorem</h3>
              <p className="bu-p" style={{ marginBottom: 0 }}>Every continuous map of a closed disk to itself fixes at least one point. A short topological argument shows that any counterexample to Brouwer could be antipode-extended to a counterexample of Borsuk–Ulam — so Brouwer follows for free.</p>
            </div>
          </div>

          <div className="bu-corollary">
            <div className="bu-corollary-num">iii</div>
            <div>
              <h3 className="bu-h3">Necklace Splitting</h3>
              <p className="bu-p" style={{ marginBottom: 0 }}>If two thieves steal an open necklace strung with beads of <em>k</em> colours, they can split it fairly between themselves using at most <em>k</em> cuts. A discrete fairness puzzle — proved through a continuous theorem about spheres.</p>
            </div>
          </div>
        </section>

        <footer className="bu-footer">
          <span>Karol Borsuk · 1905–1982</span>
          <span>Drei Sätze über die n-dimensionale euklidische Sphäre</span>
        </footer>

      </main>
    </div>
  );
}
