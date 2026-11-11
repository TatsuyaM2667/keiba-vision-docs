// 対話型デモ。本文の <div class="demo" data-demo="名前"></div> に差し込まれる。
// 数式はアプリ本体 (src/main/resources/static/js/*.js と native/zig/montecarlo.zig) と同じものを使う。

const NS = "http://www.w3.org/2000/svg";
const fmt = (x, d = 2) => Number(x).toFixed(d);

// ---------------- 小さなグラフ描画 ----------------
function chart(el, { w = 640, h = 280, x: [x0, x1], y: [y0, y1], xTicks = [], yTicks = [], xLabel = "", yLabel = "", draw }) {
  const m = { l: 48, r: 14, t: 12, b: 36 };
  const X = v => m.l + ((v - x0) / (x1 - x0)) * (w - m.l - m.r);
  const Y = v => h - m.b - ((v - y0) / (y1 - y0)) * (h - m.t - m.b);
  const parts = [];
  for (const t of yTicks) parts.push(`<line class="axis" x1="${m.l}" x2="${w - m.r}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${m.l - 6}" y="${Y(t) + 4}" text-anchor="end">${t}</text>`);
  for (const t of xTicks) parts.push(`<text x="${X(t)}" y="${h - m.b + 16}" text-anchor="middle">${t}</text>`);
  parts.push(`<line class="axis" x1="${m.l}" x2="${w - m.r}" y1="${h - m.b}" y2="${h - m.b}" style="stroke:var(--ink-3)"/>`);
  if (xLabel) parts.push(`<text x="${(w + m.l) / 2}" y="${h - 4}" text-anchor="middle">${xLabel}</text>`);
  if (yLabel) parts.push(`<text x="12" y="${(h - m.b) / 2}" text-anchor="middle" transform="rotate(-90 12 ${(h - m.b) / 2})">${yLabel}</text>`);
  const path = (pts, cls) => `<path class="${cls}" d="${pts.map(([a, b], i) => `${i ? "L" : "M"}${X(a).toFixed(1)} ${Y(b).toFixed(1)}`).join(" ")}"/>`;
  parts.push(draw({ X, Y, path }));
  el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" role="img">${parts.join("")}</svg>`;
}

function frame(el, title, tag = "対話型デモ") {
  el.innerHTML = `<div class="demo-head"><span>${title}</span><span class="tag">${tag}</span></div><div class="demo-body"><div class="demo-controls"></div><div class="demo-plot"></div><p class="demo-note"></p></div>`;
  return { controls: el.querySelector(".demo-controls"), plot: el.querySelector(".demo-plot"), note: el.querySelector(".demo-note") };
}
function slider(parent, label, { min, max, step, value, show = v => v }) {
  const l = document.createElement("label");
  l.innerHTML = `${label}<input type="range" min="${min}" max="${max}" step="${step}" value="${value}"><output></output>`;
  parent.append(l);
  const input = l.querySelector("input"), out = l.querySelector("output");
  const sync = () => (out.textContent = show(+input.value));
  input.addEventListener("input", sync);
  sync();
  return input;
}
const legend = items => `<div class="demo-legend">${items.map(([c, t]) => `<span><i style="background:var(${c})"></i>${t}</span>`).join("")}</div>`;

// アプリと同じ乱数 (xorshift32 → [0,1))
function xorshift(seed) {
  let s = seed >>> 0 || 0x9e3779b9;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s >>> 8) / 16777216; };
}
// 標準正規分布の累積分布関数 Φ (Abramowitz–Stegun 26.2.17, 誤差 7.5e-8 以下)
function Phi(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804 * Math.exp(-x * x / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}

// 有馬記念 (アプリ内蔵のサンプル出馬表) の 16 頭: [名前, スピード指数, スタミナ, 脚質]
const ARIMA = [
  ["ドウデュース", 118.5, 1.0, 2], ["スターズオンアース", 114.2, 0.9, 1], ["ソールオリエンス", 110.8, 0.8, 3], ["タスティエーラ", 109.5, 0.8, 1],
  ["レガレイラ", 116.0, 1.0, 2], ["ブローザホーン", 113.4, 0.8, 2], ["ジャスティンパレス", 108.9, 0.8, 2], ["シンエンペラー", 107.5, 0.65, 1],
  ["ベラジオオペラ", 108.0, 0.65, 1], ["プラダリア", 103.2, 0.65, 1], ["シャフリヤール", 105.8, 0.8, 2], ["ディープボンド", 101.5, 0.65, 1],
  ["スタニングローズ", 104.2, 0.8, 1], ["ダノンデサイル", 109.8, 0.9, 1], ["タイトルホルダー", 107.0, 0.8, 0], ["アーバンシック", 115.2, 1.0, 3],
];

const demos = {
  // 一様乱数 n 個の和 (Irwin–Hall 分布) が正規分布に近づく様子
  "irwin-hall"(el) {
    const ui = frame(el, "一様乱数を n 個足すと、形はどう変わる？");
    const n = slider(ui.controls, "n =", { min: 1, max: 12, step: 1, value: 4 });
    const draw = () => {
      const k = +n.value, N = 40000, bins = 60, lo = -k / 2, hi = k / 2;
      const rnd = xorshift(7), counts = new Array(bins).fill(0);
      for (let i = 0; i < N; i++) { let s = 0; for (let j = 0; j < k; j++) s += rnd(); counts[Math.min(bins - 1, Math.floor(((s - k / 2 - lo) / (hi - lo)) * bins))]++; }
      const width = (hi - lo) / bins, sd = Math.sqrt(k / 12);
      const dens = counts.map(c => c / N / width);
      const yMax = Math.max(...dens, 1 / (sd * Math.sqrt(2 * Math.PI))) * 1.1;
      chart(ui.plot, {
        x: [lo, hi], y: [0, yMax], xTicks: [lo, 0, hi].map(v => +v.toFixed(1)), yTicks: [0, +(yMax / 2).toFixed(2)], xLabel: "和 − n/2", yLabel: "密度",
        draw: ({ X, Y, path }) => dens.map((d, i) => `<rect class="bar" x="${X(lo + i * width)}" y="${Y(d)}" width="${Math.max(1, X(lo + width) - X(lo) - 1)}" height="${Y(0) - Y(d)}"/>`).join("") +
          path(Array.from({ length: 121 }, (_, i) => { const x = lo + ((hi - lo) * i) / 120; return [x, Math.exp(-x * x / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI))]; }), "series-2"),
      });
      ui.note.innerHTML = `標準偏差 √(n/12) = <span class="val">${fmt(sd, 4)}</span>。アプリは n = 4 を使い、0.11 倍するので揺らぎの標準偏差は <span class="val">${fmt(0.11 * Math.sqrt(4 / 12), 4)}</span>。橙の線は同じ平均・分散の正規分布。${legend([["--link", "シミュレーション (4 万回)"], ["--pitfall", "正規分布"]])}`;
    };
    n.addEventListener("input", draw);
    draw();
  },

  // 本物の Zig (WebAssembly) で有馬記念を N 回走らせ、勝率と 95% 信頼区間を表示
  async mc(el) {
    const ui = frame(el, "有馬記念を N 回走らせる (アプリと同じ Zig の WebAssembly)", "Zig / Wasm");
    const z = (await WebAssembly.instantiate(await (await fetch("/wasm/montecarlo.wasm")).arrayBuffer())).instance.exports;
    const logN = slider(ui.controls, "回数 N =", { min: 1, max: 6, step: 0.5, value: 3, show: v => Math.round(10 ** v).toLocaleString() });
    const pace = slider(ui.controls, "ペース =", { min: 0.8, max: 1.2, step: 0.05, value: 1.0, show: v => fmt(v) });
    const btn = document.createElement("button");
    btn.textContent = "別の乱数で再実行";
    ui.controls.append(btn);
    let seed = 20261109;
    const draw = () => {
      const N = Math.round(10 ** +logN.value);
      ARIMA.forEach(([, sp, st, sty], i) => z.set_horse(i, sp, st, sty));
      const t0 = performance.now();
      z.simulate(ARIMA.length, N, +pace.value, seed);
      const ms = performance.now() - t0;
      const rows = ARIMA.map(([name], i) => ({ name, p: z.win_rate(i) / 100 })).sort((a, b) => b.p - a.p).slice(0, 6);
      const W = 640, rowH = 34, H = rows.length * rowH + 30, x0 = 150, x1 = W - 70, scale = v => x0 + (v / 0.6) * (x1 - x0);
      ui.plot.innerHTML = `<svg viewBox="0 0 ${W} ${H}">${[0, 0.2, 0.4, 0.6].map(v => `<line class="axis" x1="${scale(v)}" x2="${scale(v)}" y1="0" y2="${H - 20}"/><text x="${scale(v)}" y="${H - 6}" text-anchor="middle">${v * 100}%</text>`).join("")}${rows.map((r, i) => {
        const se = Math.sqrt((r.p * (1 - r.p)) / N), y = i * rowH + 8, lo = Math.max(0, r.p - 1.96 * se), hi = Math.min(1, r.p + 1.96 * se);
        return `<text x="${x0 - 8}" y="${y + 15}" text-anchor="end" style="fill:var(--ink)">${r.name}</text><rect class="bar" x="${x0}" y="${y}" width="${scale(r.p) - x0}" height="20" rx="4"/>
          <line class="err" x1="${scale(lo)}" x2="${scale(hi)}" y1="${y + 10}" y2="${y + 10}"/><line class="err" x1="${scale(lo)}" x2="${scale(lo)}" y1="${y + 4}" y2="${y + 16}"/><line class="err" x1="${scale(hi)}" x2="${scale(hi)}" y1="${y + 4}" y2="${y + 16}"/>
          <text x="${scale(hi) + 6}" y="${y + 15}" style="fill:var(--ink)">${fmt(r.p * 100, 1)}%</text>`;
      }).join("")}</svg>`;
      const p = rows[0].p;
      ui.note.innerHTML = `黒い線は 95% 信頼区間 (±1.96·√(p(1−p)/N))。1 位の馬の幅は ±<span class="val">${fmt(196 * Math.sqrt((p * (1 - p)) / N), 2)}</span> ポイント。N を 100 倍にすると幅は 1/10 になる。計算時間 <span class="val">${fmt(ms, 1)}</span> ms。`;
    };
    logN.addEventListener("input", draw);
    pace.addEventListener("input", draw);
    btn.addEventListener("click", () => { seed = (Math.random() * 2 ** 31) | 0; draw(); });
    draw();
  },

  // 2 頭だけのとき: 解析解 Φ(Δμ/(σ√2)) とシミュレーションを比べる
  pairwise(el) {
    const ui = frame(el, "2 頭の能力差 Δμ と「強い方が先着する確率」");
    const dmu = slider(ui.controls, "Δμ =", { min: 0, max: 0.2, step: 0.005, value: 0.025, show: v => fmt(v, 3) });
    const sigma = 0.11 * Math.sqrt(4 / 12);
    const draw = () => {
      const d = +dmu.value, exact = Phi(d / (sigma * Math.SQRT2));
      const rnd = xorshift(99);
      let win = 0;
      const N = 50000;
      for (let i = 0; i < N; i++) { const a = (rnd() + rnd() + rnd() + rnd() - 2) * 0.11, b = (rnd() + rnd() + rnd() + rnd() - 2) * 0.11; if (d + a > b) win++; }
      chart(ui.plot, {
        x: [0, 0.2], y: [0.5, 1], xTicks: [0, 0.05, 0.1, 0.15, 0.2], yTicks: [0.5, 0.75, 1], xLabel: "能力差 Δμ", yLabel: "先着する確率",
        draw: ({ X, Y, path }) => path(Array.from({ length: 101 }, (_, i) => { const x = (0.2 * i) / 100; return [x, Phi(x / (sigma * Math.SQRT2))]; }), "series-1") +
          `<circle cx="${X(d)}" cy="${Y(exact)}" r="5" style="fill:var(--pitfall)"/>`,
      });
      ui.note.innerHTML = `解析解 Φ(Δμ/(σ√2)) = <span class="val">${fmt(exact, 4)}</span>、シミュレーション (5 万回) = <span class="val">${fmt(win / N, 4)}</span>。σ = 0.11·√(1/3) ≈ ${fmt(sigma, 4)}。Δμ = 0.025 はドウデュースとレガレイラの差。`;
    };
    dmu.addEventListener("input", draw);
    draw();
  },

  // 3D の位置の式 x(t) = D·(u + s·u(1−u))
  progress(el) {
    const ui = frame(el, "逃げ馬 A と追込馬 B の位置と差");
    const sA = slider(ui.controls, "A の s =", { min: -0.3, max: 0.3, step: 0.01, value: 0.14, show: v => fmt(v) });
    const sB = slider(ui.controls, "B の s =", { min: -0.3, max: 0.3, step: 0.01, value: -0.12, show: v => fmt(v) });
    const lag = slider(ui.controls, "A の遅れ (秒)", { min: 0, max: 2, step: 0.05, value: 0.43, show: v => fmt(v) });
    const D = 2000, acc = 1.1, TB = D / 16.6;
    const pos = (T, s, t) => { const tw = t - acc * (1 - Math.exp(-t / acc)); const u = Math.min(1, tw / (T - acc)); return D * (u + s * u * (1 - u)); };
    const draw = () => {
      const TA = TB + +lag.value;
      const pts = Array.from({ length: 241 }, (_, i) => (TA * i) / 240);
      const gap = pts.map(t => [t, pos(TA, +sA.value, t) - pos(TB, +sB.value, t)]);
      const maxGap = Math.max(...gap.map(g => g[1]));
      chart(ui.plot, {
        x: [0, TA], y: [Math.min(-20, ...gap.map(g => g[1])), Math.max(20, maxGap) * 1.1], xTicks: [0, 30, 60, 90, 120], yTicks: [0, Math.round(maxGap / 2), Math.round(maxGap)], xLabel: "時刻 t (秒)", yLabel: "A − B (m)",
        draw: ({ path, X, Y }) => `<line class="axis" x1="${X(0)}" x2="${X(TA)}" y1="${Y(0)}" y2="${Y(0)}" style="stroke:var(--ink-3)"/>` + path(gap, "series-1"),
      });
      const cross = gap.find(([t, g], i) => i > 10 && g < 0);
      ui.note.innerHTML = `最大のリード <span class="val">${fmt(maxGap, 1)}</span> m (理論値 D·(s_A − s_B)/4 = ${fmt((D * (+sA.value - +sB.value)) / 4, 1)} m)。${cross ? `B が A を抜くのは t ≈ <span class="val">${fmt(cross[0], 1)}</span> 秒。` : "B は最後まで A を抜けない。"} ゴールでの差は ${fmt((+lag.value * D) / TB / 2.4, 2)} 馬身。`;
    };
    [sA, sB, lag].forEach(s => s.addEventListener("input", draw));
    draw();
  },

  // 能力値 = 45 + 54 p²
  percentile(el) {
    const ui = frame(el, "順位 (パーセンタイル p) → 能力値");
    const p = slider(ui.controls, "p =", { min: 0, max: 1, step: 0.001, value: 0.9, show: v => fmt(v, 3) });
    const draw = () => {
      const v = +p.value, r = 45 + 54 * v * v;
      chart(ui.plot, {
        x: [0, 1], y: [40, 100], xTicks: [0, 0.25, 0.5, 0.75, 1], yTicks: [45, 60, 75, 90, 99], xLabel: "下から数えた順位の割合 p", yLabel: "能力値",
        draw: ({ path, X, Y }) => path(Array.from({ length: 101 }, (_, i) => [i / 100, 45 + 54 * (i / 100) ** 2]), "series-1") + `<circle cx="${X(v)}" cy="${Y(r)}" r="5" style="fill:var(--pitfall)"/>`,
      });
      ui.note.innerHTML = `能力値 <span class="val">${Math.round(r)}</span> (上位 ${fmt((1 - v) * 100, 1)}%)。曲線の傾き 108p は上位ほど大きく、上の方ほど 1 点の差が「順位の差」として細かく効く。`;
    };
    p.addEventListener("input", draw);
    draw();
  },

  // カメラ追従: 固定係数 vs 指数関数の係数
  smoothing(el) {
    const ui = frame(el, "目標へ近づくカメラ (フレームレート 30 / 60 / 144)");
    const mode = document.createElement("label");
    mode.innerHTML = `<select><option value="exp">k = 1 − e^(−λΔt) (アプリの方式)</option><option value="naive">k = 0.08 固定 (よくある書き方)</option></select>`;
    mode.querySelector("select").style.cssText = "padding:4px 8px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font:inherit";
    ui.controls.append(mode);
    const sel = mode.querySelector("select");
    const draw = () => {
      const series = [30, 60, 144].map(fps => {
        let x = 0; const pts = [[0, 0]];
        for (let f = 1; f <= fps * 2; f++) { const k = sel.value === "exp" ? 1 - Math.exp(-2.5 / fps) : 0.08; x += (1 - x) * k; pts.push([f / fps, x]); }
        return pts;
      });
      chart(ui.plot, {
        x: [0, 2], y: [0, 1], xTicks: [0, 0.5, 1, 1.5, 2], yTicks: [0, 0.5, 1], xLabel: "時間 (秒)", yLabel: "目標への到達度",
        draw: ({ path }) => series.map((s, i) => path(s, `series-${i + 1}`)).join(""),
      });
      ui.note.innerHTML = (sel.value === "exp" ? "3 本の線がほぼ重なる = どの画面でも同じ速さで動く。" : "フレームレートが高いほど速く動いてしまう (144Hz のモニターではカメラがせかせか動く)。") +
        legend([["--link", "30fps"], ["--pitfall", "60fps"], ["--recap", "144fps"]]);
    };
    sel.addEventListener("change", draw);
    draw();
  },

  // 血量と近交係数 (アプリと同じ Odin の WebAssembly)
  async blood(el) {
    const ui = frame(el, "クロス g₁ × g₂ の血量と近交係数 (アプリと同じ Odin の WebAssembly)", "Odin / Wasm");
    const o = (await WebAssembly.instantiate(await (await fetch("/wasm/pedigree.wasm")).arrayBuffer())).instance.exports;
    const g1 = slider(ui.controls, "父方 g₁ =", { min: 1, max: 8, step: 1, value: 3 });
    const g2 = slider(ui.controls, "母方 g₂ =", { min: 1, max: 8, step: 1, value: 4 });
    const draw = () => {
      const a = +g1.value, b = +g2.value;
      ui.plot.innerHTML = `<div class="table-wrap"><table><thead><tr><th></th><th>式</th><th>値</th></tr></thead><tbody>
        <tr><td>血量</td><td>2<sup>−${a}</sup> + 2<sup>−${b}</sup></td><td class="val">${fmt(o.blood_percent(a, b), 4)} %</td></tr>
        <tr><td>近交係数 F</td><td>(1/2)<sup>${a}+${b}−1</sup></td><td class="val">${fmt(o.inbreeding_coefficient(a, b), 4)} %</td></tr>
        <tr><td>評価</td><td>血量 ≥ 25 → 濃い、≥ 12.5 → ほどよい</td><td>${["弱い", "ほどよい", "濃い"][o.cross_rating(a, b)]}</td></tr></tbody></table></div>`;
      ui.note.textContent = "値はブラウザ内で Odin の関数 blood_percent / inbreeding_coefficient / cross_rating を呼んで計算しています。";
    };
    [g1, g2].forEach(s => s.addEventListener("input", draw));
    draw();
  },

  // コースの幾何学: 位置 s と接線・法線
  track(el) {
    const ui = frame(el, "スタジアム型コース上の点 P(s) と接線 T・外向き法線 N");
    const S = slider(ui.controls, "直線 S =", { min: 200, max: 660, step: 10, value: 526, show: v => `${v}m` });
    const sv = slider(ui.controls, "位置 s =", { min: 0, max: 1, step: 0.002, value: 0.62, show: v => `${fmt(v * 100, 0)}%` });
    const turn = document.createElement("label");
    turn.innerHTML = `<select><option value="左">左回り</option><option value="右">右回り</option></select>`;
    turn.querySelector("select").style.cssText = "padding:4px 8px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font:inherit";
    ui.controls.append(turn);
    const sel = turn.querySelector("select");
    const draw = () => {
      const s0 = +S.value, R = 110 + 0.1 * s0, L = 2 * s0 + 2 * Math.PI * R, m = sel.value === "右" ? -1 : 1;
      const at = (s, off = 0) => {
        s = ((s % L) + L) % L; const r = R + off; let x, z, dx, dz;
        if (s < s0) { x = -s0 / 2 + s; z = r; dx = 1; dz = 0; }
        else if (s < s0 + Math.PI * R) { const p = Math.PI / 2 - (s - s0) / R; x = s0 / 2 + r * Math.cos(p); z = r * Math.sin(p); dx = Math.sin(p); dz = -Math.cos(p); }
        else if (s < 2 * s0 + Math.PI * R) { const u = s - (s0 + Math.PI * R); x = s0 / 2 - u; z = -r; dx = -1; dz = 0; }
        else { const p = -Math.PI / 2 - (s - (2 * s0 + Math.PI * R)) / R; x = -s0 / 2 + r * Math.cos(p); z = r * Math.sin(p); dx = Math.sin(p); dz = -Math.cos(p); }
        return { x: x * m, z, dx: dx * m, dz };
      };
      const W = 640, H = 300, sc = Math.min((W - 40) / (s0 + 2 * R + 60), (H - 40) / (2 * R + 60));
      const P = (x, z) => [W / 2 + x * sc, H / 2 + z * sc];
      const loop = Array.from({ length: 241 }, (_, i) => P(at((L * i) / 240).x, at((L * i) / 240).z));
      const s = +sv.value * L, p = at(s), [px, py] = P(p.x, p.z);
      const q = at(s, 1), nx = q.x - p.x, nz = q.z - p.z;
      const fin = at(s0 * 0.85), [fx, fy] = P(fin.x, fin.z);
      ui.plot.innerHTML = `<svg viewBox="0 0 ${W} ${H}"><path d="${loop.map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)} ${b.toFixed(1)}`).join(" ")}" style="fill:none;stroke:var(--recap);stroke-width:10;opacity:.35"/>
        <line x1="${fx}" y1="${fy - 12}" x2="${fx}" y2="${fy + 12}" style="stroke:var(--challenge);stroke-width:3"/><text x="${fx}" y="${fy + 28}" text-anchor="middle">ゴール</text>
        <line x1="${px}" y1="${py}" x2="${px + p.dx * 50}" y2="${py + p.dz * 50}" style="stroke:var(--link);stroke-width:3"/><text x="${px + p.dx * 58}" y="${py + p.dz * 58}">T</text>
        <line x1="${px}" y1="${py}" x2="${px + nx * 50}" y2="${py + nz * 50}" style="stroke:var(--pitfall);stroke-width:3"/><text x="${px + nx * 58}" y="${py + nz * 58}">N</text>
        <circle cx="${px}" cy="${py}" r="6" style="fill:var(--ink)"/></svg>`;
      ui.note.innerHTML = `R = 110 + 0.1·S = <span class="val">${fmt(R, 1)}</span> m、1 周 L = 2S + 2πR = <span class="val">${fmt(L, 1)}</span> m、s = ${fmt(s, 0)} m。青 = 進行方向 T、橙 = 外向き法線 N (スタンド側)。上が向こう正面、下がホームストレッチ (図は上から見た向き)。`;
    };
    [S, sv].forEach(s => s.addEventListener("input", draw));
    sel.addEventListener("change", draw);
    draw();
  },
};

for (const el of document.querySelectorAll(".demo[data-demo]")) {
  const f = demos[el.dataset.demo];
  if (f) Promise.resolve(f(el)).catch(e => { el.innerHTML = `<div class="demo-body">デモを読み込めませんでした: ${e.message}</div>`; });
}
