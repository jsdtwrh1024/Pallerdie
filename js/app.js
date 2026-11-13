/* =========================================================
   app.js —— 可视化与交互
   这里只负责「把 nn.js 算出来的东西画出来」，不含任何数学推导。
   ========================================================= */

const $ = id => document.getElementById(id);

const CLASS_COLORS = ["#D85A30", "#378ADD", "#BA7517"];
const CLASS_RGB = CLASS_COLORS.map(h => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16)
]);

const VIEW = 1.18;   // 世界坐标范围 [-VIEW, VIEW]
const RES = 56;      // 决策边界的计算分辨率

const state = {
  net: null,
  points: [],
  params: { lr: 0.1, h1: 8, h2: 8, act: "relu", init: "xavier", batch: 16, class: 0 },
  epoch: 0,
  lossHist: [],
  running: false,
  selected: null,
  frame: 0,
  diverged: false,
  heatLayer: 0
};

/* =========================================================
   1. 数据：三类螺旋
   螺旋是非线性可分的，单层线性模型画不出弯曲的边界，
   所以「隐藏层」这个参数才有肉眼可见的作用。
   ========================================================= */
function makeSpiral(nPerClass, noise) {
  const pts = [];
  for (let c = 0; c < 3; c++) {
    for (let i = 0; i < nPerClass; i++) {
      const t = i / nPerClass;
      const r = 0.15 + 0.85 * t;
      const ang = 1.15 * Math.PI * 2 * t + c * Math.PI * 2 / 3;
      pts.push({
        x: r * Math.sin(ang) + (Math.random() - 0.5) * 2 * noise,
        y: r * Math.cos(ang) + (Math.random() - 0.5) * 2 * noise,
        c
      });
    }
  }
  return pts;
}

/* =========================================================
   2. 坐标与画布工具
   ========================================================= */
const pxOf = (x, w) => (x + VIEW) / (2 * VIEW) * w;
const pyOf = (y, h) => (VIEW - y) / (2 * VIEW) * h;

function sizeCanvas(cv, ctx) {
  const r = cv.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.round(r.width));
  const h = Math.max(1, Math.round(r.height));

  if (cv._w !== w || cv._h !== h || cv._dpr !== dpr) {
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    cv._w = w; cv._h = h; cv._dpr = dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  return { w, h };
}

const fieldCv = $("field"), fctx = fieldCv.getContext("2d");
const lossCv = $("lossChart"), lctx = lossCv.getContext("2d");
const heatCv = $("heat"), hctx = heatCv.getContext("2d");

/* 决策边界先用小尺寸 ImageData 算，再放大绘制，边缘自然过渡 */
const offCv = document.createElement("canvas");
offCv.width = RES; offCv.height = RES;
const offCtx = offCv.getContext("2d");
const offImg = offCtx.createImageData(RES, RES);

/* =========================================================
   3. 决策边界 + 样本点
   ========================================================= */
function drawField() {
  const { w, h } = sizeCanvas(fieldCv, fctx);
  const net = state.net;

  for (let py = 0; py < RES; py++) {
    const y = VIEW - ((py + 0.5) / RES) * 2 * VIEW;
    for (let px = 0; px < RES; px++) {
      const x = ((px + 0.5) / RES) * 2 * VIEW - VIEW;
      const col = CLASS_RGB[net.fastPredict(x, y)];
      const i = (py * RES + px) * 4;
      offImg.data[i] = col[0];
      offImg.data[i + 1] = col[1];
      offImg.data[i + 2] = col[2];
      offImg.data[i + 3] = 84;
    }
  }
  offCtx.putImageData(offImg, 0, 0);

  fctx.clearRect(0, 0, w, h);
  fctx.fillStyle = "#ffffff";
  fctx.fillRect(0, 0, w, h);
  fctx.imageSmoothingEnabled = true;
  fctx.drawImage(offCv, 0, 0, w, h);

  fctx.strokeStyle = "rgba(29,28,26,0.055)";
  fctx.lineWidth = 1;
  for (let k = 1; k < 6; k++) {
    const gx = Math.round(w * k / 6) + 0.5;
    const gy = Math.round(h * k / 6) + 0.5;
    fctx.beginPath(); fctx.moveTo(gx, 0); fctx.lineTo(gx, h); fctx.stroke();
    fctx.beginPath(); fctx.moveTo(0, gy); fctx.lineTo(w, gy); fctx.stroke();
  }

  for (let i = 0; i < state.points.length; i++) {
    const p = state.points[i];
    fctx.beginPath();
    fctx.arc(pxOf(p.x, w), pyOf(p.y, h), 4, 0, Math.PI * 2);
    fctx.fillStyle = CLASS_COLORS[p.c];
    fctx.fill();
    fctx.lineWidth = 1.2;
    fctx.strokeStyle = "rgba(255,255,255,0.9)";
    fctx.stroke();
  }

  if (state.selected != null) {
    const p = state.points[state.selected];
    if (p) {
      fctx.beginPath();
      fctx.arc(pxOf(p.x, w), pyOf(p.y, h), 8.5, 0, Math.PI * 2);
      fctx.strokeStyle = "#1d1c1a";
      fctx.lineWidth = 2;
      fctx.stroke();
    }
  }
}

/* =========================================================
   4. 损失曲线
   ========================================================= */
function drawLoss() {
  const { w, h } = sizeCanvas(lossCv, lctx);
  lctx.clearRect(0, 0, w, h);

  const hist = state.lossHist;
  const pl = 8, pr = 8, pt = 14, pb = 8;

  lctx.beginPath();
  lctx.moveTo(pl, h - pb);
  lctx.lineTo(w - pr, h - pb);
  lctx.strokeStyle = "#efede7";
  lctx.lineWidth = 1;
  lctx.stroke();

  if (hist.length < 2) return;

  let mx = 0;
  for (let i = 0; i < hist.length; i++) if (hist[i] > mx) mx = hist[i];
  mx = Math.max(mx, 0.15) * 1.08;

  const xAt = i => pl + (w - pl - pr) * (i / (hist.length - 1));
  const yAt = v => h - pb - (h - pt - pb) * Math.min(1, v / mx);

  lctx.beginPath();
  lctx.moveTo(xAt(0), yAt(hist[0]));
  for (let i = 1; i < hist.length; i++) lctx.lineTo(xAt(i), yAt(hist[i]));
  lctx.strokeStyle = "#c2603a";
  lctx.lineWidth = 1.6;
  lctx.lineJoin = "round";
  lctx.stroke();

  lctx.fillStyle = "#8c877d";
  lctx.font = "11px ui-monospace, SFMono-Regular, Consolas, monospace";
  lctx.textAlign = "right";
  lctx.fillText(mx.toFixed(2), w - pr, pt - 3);
  lctx.textAlign = "left";
}

/* =========================================================
   5. 权重热力图
   ========================================================= */
function heatColor(t, positive) {
  const c = positive ? [216, 90, 48] : [55, 138, 221];
  const k = 0.1 + 0.9 * t;
  return `rgb(${Math.round(255 - (255 - c[0]) * k)},${Math.round(255 - (255 - c[1]) * k)},${Math.round(255 - (255 - c[2]) * k)})`;
}

function drawHeatmap() {
  const { w, h } = sizeCanvas(heatCv, hctx);
  hctx.clearRect(0, 0, w, h);

  const W = state.net.W[state.heatLayer];
  if (!W || !W.length) return;

  const nOut = W.length, nIn = W[0].length;
  let mx = 1e-9;
  for (let j = 0; j < nOut; j++) {
    for (let i = 0; i < nIn; i++) mx = Math.max(mx, Math.abs(W[j][i]));
  }

  const pad = 6;
  const cw = Math.min(20, (w - pad * 2) / nIn);
  const ch = Math.min(22, (h - pad * 2) / nOut);

  for (let j = 0; j < nOut; j++) {
    for (let i = 0; i < nIn; i++) {
      const v = W[j][i];
      hctx.fillStyle = heatColor(Math.abs(v) / mx, v >= 0);
      hctx.fillRect(pad + i * cw, pad + j * ch, Math.max(1, cw - 1), Math.max(1, ch - 1));
    }
  }
}

function buildLayerTabs() {
  const tabs = $("layerTabs");
  const L = state.net.L;
  if (state.heatLayer >= L) state.heatLayer = 0;

  const names = [];
  for (let l = 0; l < L; l++) {
    const from = l === 0 ? "输入" : "隐" + l;
    const to = l === L - 1 ? "输出" : "隐" + (l + 1);
    names.push(from + "→" + to);
  }

  tabs.innerHTML = names.map((n, i) =>
    `<button data-l="${i}" class="${i === state.heatLayer ? "on" : ""}">${n}</button>`
  ).join("");
}

/* =========================================================
   6. 网络结构图（SVG）
   ========================================================= */
let netEdges = [];

function buildNetwork() {
  const svg = $("netSvg");
  const sizes = state.net.sizes;
  const nMax = Math.max.apply(null, sizes);
  const rowH = nMax > 10 ? 19 : 26;
  const H = Math.max(210, (nMax - 1) * rowH + 96);
  const X0 = 58, X1 = 622;
  const stepX = (X1 - X0) / (sizes.length - 1);

  const xs = sizes.map((_, k) => X0 + k * stepX);
  const ys = sizes.map(n => {
    const arr = [];
    for (let i = 0; i < n; i++) arr.push(H / 2 + (i - (n - 1) / 2) * rowH);
    return arr;
  });

  svg.setAttribute("viewBox", `0 0 680 ${H}`);
  svg.setAttribute("height", H);

  let s = "";
  for (let l = 0; l < sizes.length - 1; l++) {
    for (let j = 0; j < sizes[l + 1]; j++) {
      for (let i = 0; i < sizes[l]; i++) {
        s += `<line class="edge" x1="${xs[l].toFixed(1)}" y1="${ys[l][i].toFixed(1)}" `
           + `x2="${xs[l + 1].toFixed(1)}" y2="${ys[l + 1][j].toFixed(1)}" `
           + `stroke="#B4B2A9" stroke-width="1" stroke-opacity="0.25"><title>w</title></line>`;
      }
    }
  }

  for (let k = 0; k < sizes.length; k++) {
    for (let i = 0; i < sizes[k]; i++) {
      s += `<circle cx="${xs[k].toFixed(1)}" cy="${ys[k][i].toFixed(1)}" r="6.5" `
         + `fill="#ffffff" stroke="#B4B2A9" stroke-width="1.2"/>`;
    }
  }

  for (let k = 0; k < sizes.length; k++) {
    s += `<text x="${xs[k].toFixed(1)}" y="${H - 16}" text-anchor="middle" font-size="11" `
       + `fill="#8c877d" font-family="ui-monospace, monospace">${sizes[k]}</text>`;
  }

  svg.innerHTML = s;

  const lines = svg.querySelectorAll("line.edge");
  netEdges = [];
  let idx = 0;
  for (let l = 0; l < sizes.length - 1; l++) {
    for (let j = 0; j < sizes[l + 1]; j++) {
      for (let i = 0; i < sizes[l]; i++) {
        netEdges.push({ el: lines[idx++], l, j, i });
      }
    }
  }
  updateNetwork();
}

function updateNetwork() {
  const net = state.net;
  let mx = 1e-9;
  for (let l = 0; l < net.W.length; l++) {
    for (let j = 0; j < net.W[l].length; j++) {
      for (let i = 0; i < net.W[l][j].length; i++) {
        mx = Math.max(mx, Math.abs(net.W[l][j][i]));
      }
    }
  }

  for (let k = 0; k < netEdges.length; k++) {
    const e = netEdges[k];
    const w = net.W[e.l][e.j][e.i];
    const t = Math.abs(w) / mx;
    e.el.setAttribute("stroke", w >= 0 ? "#D85A30" : "#378ADD");
    e.el.setAttribute("stroke-opacity", (0.06 + Math.pow(t, 0.55) * 0.85).toFixed(3));
    e.el.setAttribute("stroke-width", (0.6 + 1.7 * t).toFixed(2));
    const title = e.el.firstChild;
    if (title && title.nodeName === "title") title.textContent = "w = " + w.toFixed(3);
  }
}

/* =========================================================
   7. 单步解剖
   ========================================================= */
function cellsHtml(vals, signed) {
  const arr = Array.from(vals);
  let mx = 1e-6;
  for (let i = 0; i < arr.length; i++) mx = Math.max(mx, Math.abs(arr[i]));

  return arr.map(v => {
    const r = Math.min(1, Math.abs(v) / mx);
    const color = signed ? (v >= 0 ? "#c2603a" : "#378add") : "#c2603a";
    return `<div class="cell">
      <div class="track"><div class="bar" style="height:${(r * 100).toFixed(1)}%;background:${color};opacity:${(0.3 + 0.7 * r).toFixed(2)}"></div></div>
      <span class="val">${v.toFixed(2)}</span>
    </div>`;
  }).join("");
}

function renderAnatomy() {
  const el = $("anatomy");

  if (state.selected == null || !state.points[state.selected]) {
    el.className = "anatomy-empty";
    el.textContent = "还没有选中的样本。点画布上的任意一个点。";
    return;
  }
  el.className = "";

  const p = state.points[state.selected];
  const net = state.net;
  const g = net.gradients([p.x, p.y], p.c);
  const a = g.a, probs = g.p, deltas = g.deltas;
  const L = net.L;

  let pred = 0;
  for (let i = 1; i < probs.length; i++) if (probs[i] > probs[pred]) pred = i;
  const ce = -Math.log(Math.max(probs[p.c], 1e-12));

  let html = `<div class="ana-top">
    <span>输入 x = <b>${p.x.toFixed(3)}</b> , <b>${p.y.toFixed(3)}</b></span>
    <span>真实类别 <span class="chip" style="background:${CLASS_COLORS[p.c]}">类 ${p.c}</span></span>
    <span>预测 <span class="chip" style="background:${CLASS_COLORS[pred]}">类 ${pred}</span></span>
    <span>交叉熵 <b>${ce.toFixed(3)}</b></span>
  </div>`;

  for (let l = 1; l < L; l++) {
    html += `<div class="ana-block">
      <div class="ana-label">隐藏层 ${l} · 激活值 a = f(z)</div>
      <div class="cells">${cellsHtml(a[l], false)}</div>
    </div>`;
  }

  html += `<div class="ana-block">
    <div class="ana-label">输出层 · softmax 概率</div>`;
  for (let c = 0; c < probs.length; c++) {
    html += `<div class="prob-row">
      <span class="name">类 ${c}</span>
      <span class="track"><span class="fill" style="width:${(probs[c] * 100).toFixed(1)}%;background:${CLASS_COLORS[c]}"></span></span>
      <span class="num">${probs[c].toFixed(4)}</span>
    </div>`;
  }
  html += `</div>`;

  html += `<div class="ana-block">
    <div class="ana-label">输出层 δ = p − onehot(y)</div>
    <div class="cells">${cellsHtml(deltas[L - 1], true)}</div>
  </div>`;

  const dOut = deltas[L - 1];
  let bi = 0;
  for (let i = 1; i < dOut.length; i++) if (Math.abs(dOut[i]) > Math.abs(dOut[bi])) bi = i;
  const aPrev = a[L - 1];
  const dw = dOut[bi] * aPrev[0];

  html += `<div class="ana-block">
    <div class="ana-label">举一个具体的乘法</div>
    <div class="workline">Δw[输出${bi}][隐${L - 1}-0] = δ × a = <em>${dOut[bi].toFixed(3)}</em> × <em>${aPrev[0].toFixed(3)}</em> = ${dw.toFixed(4)}　　W ← W − lr × Δw</div>
  </div>`;

  el.innerHTML = html;
}

/* =========================================================
   8. 训练
   ========================================================= */
function epochOnce() {
  if (state.diverged) return;

  const net = state.net;
  const pts = state.points;
  const idx = [];
  for (let i = 0; i < pts.length; i++) idx.push(i);

  for (let i = idx.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
  }

  const bs = state.params.batch;
  for (let s = 0; s < idx.length; s += bs) {
    const xs = [], ys = [];
    const end = Math.min(s + bs, idx.length);
    for (let k = s; k < end; k++) {
      const p = pts[idx[k]];
      xs.push([p.x, p.y]);
      ys.push(p.c);
    }
    net.step({ xs, ys }, state.params.lr);
  }

  state.epoch++;

  let sum = 0;
  for (let i = 0; i < pts.length; i++) sum += net.loss([pts[i].x, pts[i].y], pts[i].c);
  const L = sum / pts.length;

  if (!isFinite(L) || L > 1e6) {
    state.diverged = true;
    state.running = false;
    syncPlayBtn();
    showWarn("训练发散了，损失冲到 " + L.toFixed(1) + "。学习率 " + state.params.lr.toFixed(3)
      + " 太大，一步跨过了最低点。把它调小一个数量级再试。");
    return;
  }

  state.lossHist.push(L);
  if (state.lossHist.length > 1200) {
    state.lossHist = state.lossHist.filter((_, i) => i % 2 === 0);
  }
}

function tick() {
  if (!state.running) return;

  epochOnce();
  state.frame++;

  if (!state.running) { drawAll(); updateStats(); return; }

  drawField();
  if (state.frame % 3 === 0) drawLoss();
  if (state.frame % 6 === 0) { drawHeatmap(); updateNetwork(); }
  if (state.frame % 8 === 0) updateStats();
  if (state.frame % 12 === 0 && state.selected != null) renderAnatomy();

  requestAnimationFrame(tick);
}

function drawAll() {
  drawField();
  drawLoss();
  drawHeatmap();
  updateNetwork();
  updateStats();
  renderAnatomy();
}

function updateStats() {
  $("statEpoch").textContent = state.epoch;

  const last = state.lossHist.length ? state.lossHist[state.lossHist.length - 1] : null;
  $("statLoss").textContent = last == null ? "—" : last.toFixed(3);

  let ok = 0;
  for (let i = 0; i < state.points.length; i++) {
    if (state.net.fastPredict(state.points[i].x, state.points[i].y) === state.points[i].c) ok++;
  }
  $("statAcc").textContent = (ok / state.points.length * 100).toFixed(0) + "%";
}

function syncPlayBtn() {
  $("playBtn").textContent = state.running ? "暂停" : "播放";
}

function showWarn(text) {
  const el = $("warn");
  el.textContent = text;
  el.hidden = false;
}

function hideWarn() {
  $("warn").hidden = true;
}

/* =========================================================
   9. 重建网络
   ========================================================= */
function rebuild() {
  const sizes = [2, state.params.h1];
  if (state.params.h2 > 0) sizes.push(state.params.h2);
  sizes.push(3);

  state.net = new MLP(sizes, { act: state.params.act, init: state.params.init });
  state.epoch = 0;
  state.lossHist = [];
  state.diverged = false;
  state.frame = 0;
  state.heatLayer = 0;

  if (state.selected != null && state.selected >= state.points.length) state.selected = null;

  hideWarn();
  buildNetwork();
  buildLayerTabs();
  drawAll();
}

/* =========================================================
   10. 交互
   ========================================================= */
function nearestIdx(mx, my, w, h, tolPx) {
  let best = -1;
  let bd = tolPx * tolPx;
  for (let i = 0; i < state.points.length; i++) {
    const p = state.points[i];
    const dx = pxOf(p.x, w) - mx;
    const dy = pyOf(p.y, h) - my;
    const d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

fieldCv.addEventListener("click", e => {
  const r = fieldCv.getBoundingClientRect();
  const mx = e.clientX - r.left;
  const my = e.clientY - r.top;

  const hit = nearestIdx(mx, my, r.width, r.height, 11);

  if (hit >= 0) {
    state.selected = hit;
  } else {
    const x = mx / r.width * 2 * VIEW - VIEW;
    const y = VIEW - my / r.height * 2 * VIEW;
    if (Math.abs(x) > VIEW || Math.abs(y) > VIEW) return;
    state.points.push({ x, y, c: state.params.class });
    state.selected = state.points.length - 1;
  }

  drawField();
  renderAnatomy();
  updateStats();
});

fieldCv.addEventListener("contextmenu", e => {
  e.preventDefault();
  const r = fieldCv.getBoundingClientRect();
  const hit = nearestIdx(e.clientX - r.left, e.clientY - r.top, r.width, r.height, 14);
  if (hit < 0) return;

  state.points[hit].c = (state.points[hit].c + 1) % 3;
  state.selected = hit;
  drawField();
  renderAnatomy();
  updateStats();
});

$("playBtn").addEventListener("click", () => {
  if (state.diverged) return;
  state.running = !state.running;
  syncPlayBtn();
  if (state.running) {
    state.frame = 0;
    requestAnimationFrame(tick);
  }
});

$("stepBtn").addEventListener("click", () => {
  if (state.diverged) return;
  epochOnce();
  drawAll();
});

$("resetBtn").addEventListener("click", () => {
  state.running = false;
  syncPlayBtn();
  rebuild();
});

$("layerTabs").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;
  state.heatLayer = +b.dataset.l;
  buildLayerTabs();
  drawHeatmap();
});

$("classPicker").addEventListener("click", e => {
  const b = e.target.closest(".pick");
  if (!b) return;
  state.params.class = +b.dataset.c;
  Array.prototype.forEach.call($("classPicker").children, c => c.classList.remove("is-active"));
  b.classList.add("is-active");
});

/* 参数：拖动时只更新数字，松手才重建网络 */
function intOf(el, fallback) {
  const n = parseInt(el.value, 10);
  return isFinite(n) ? n : fallback;
}

function readParams() {
  state.params.lr = Math.pow(10, +$("lr").value);
  state.params.h1 = intOf($("h1"), 8);
  state.params.h2 = intOf($("h2"), 8);
  state.params.act = $("act").value || "relu";
  state.params.init = $("init").value || "xavier";
  state.params.batch = intOf($("batch"), 16);
}

function syncParamLabels() {
  $("lrVal").textContent = state.params.lr < 0.01
    ? state.params.lr.toFixed(4)
    : state.params.lr.toFixed(3);
  $("h1Val").textContent = state.params.h1;
  $("h2Val").textContent = state.params.h2 === 0 ? "无" : state.params.h2;
  $("batchVal").textContent = state.params.batch;
}

["lr", "h1", "h2", "batch"].forEach(id => {
  $(id).addEventListener("input", () => {
    readParams();
    syncParamLabels();
  });
  $(id).addEventListener("change", () => {
    readParams();
    syncParamLabels();
    state.running = false;
    syncPlayBtn();
    rebuild();
  });
});

["act", "init"].forEach(id => {
  $(id).addEventListener("change", () => {
    readParams();
    syncParamLabels();
    state.running = false;
    syncPlayBtn();
    rebuild();
  });
});

window.addEventListener("resize", () => {
  drawAll();
});

/* =========================================================
   11. 启动
   ========================================================= */
function init() {
  state.points = makeSpiral(100, 0.055);
  readParams();
  syncParamLabels();
  syncPlayBtn();
  rebuild();
}

init();
