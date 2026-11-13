/* =========================================================
   nn.js —— MLP 的实现部分
   前向传播 · 交叉熵损失 · 反向传播 · 参数更新
   这个文件不碰任何 DOM，是纯数学。想在报告里贴代码就贴这里。
   ========================================================= */

/* 激活函数：f 是前向，df 是导数（用 z 和已算好的 a 求导，省一次计算） */
const ACTIVATIONS = {
  relu: {
    f: z => (z > 0 ? z : 0),
    df: (z, a) => (z > 0 ? 1 : 0)
  },
  tanh: {
    f: z => Math.tanh(z),
    df: (z, a) => 1 - a * a
  },
  sigmoid: {
    f: z => 1 / (1 + Math.exp(-z)),
    df: (z, a) => a * (1 - a)
  }
};

/* 标准正态随机数（Box–Muller），用于初始化权重 */
function gaussian() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

class MLP {
  /**
   * @param {number[]} sizes 每层的神经元数，例如 [2, 8, 8, 3]
   * @param {object}   opt   { act: 'relu'|'tanh'|'sigmoid', init: 'xavier'|'small'|'zero' }
   */
  constructor(sizes, opt = {}) {
    this.sizes = sizes.slice();
    this.actName = opt.act || "relu";
    this.act = ACTIVATIONS[this.actName];
    this.L = sizes.length - 1;              // 权重层数

    // W[l] 是 sizes[l+1] × sizes[l] 的矩阵，b[l] 是长度 sizes[l+1] 的向量
    this.W = [];
    this.b = [];
    for (let l = 0; l < this.L; l++) {
      const nIn = sizes[l], nOut = sizes[l + 1];
      const rows = [];
      for (let j = 0; j < nOut; j++) rows.push(new Float64Array(nIn));
      this.W.push(rows);
      this.b.push(new Float64Array(nOut));
    }
    this.init(opt.init || "xavier");
  }

  /* 参数初始化：Xavier 按扇入扇出缩放，能明显改善深层网络的收敛 */
  init(kind) {
    for (let l = 0; l < this.L; l++) {
      const nIn = this.sizes[l], nOut = this.sizes[l + 1];
      let scale;
      if (kind === "xavier") scale = Math.sqrt(2 / (nIn + nOut));
      else if (kind === "small") scale = 0.02;
      else scale = 0;

      for (let j = 0; j < nOut; j++) {
        for (let i = 0; i < nIn; i++) {
          this.W[l][j][i] = kind === "zero" ? 0 : gaussian() * scale;
        }
        this.b[l][j] = 0;
      }
    }
  }

  /* ---------- 前向传播 ----------
     a[0] = x
     z[l] = W[l] · a[l-1] + b[l]
     a[l] = f(z[l])          （最后一层不加激活，交给 softmax）
  */
  forward(x, keep) {
    const a = [x];
    const z = [null];

    for (let l = 0; l < this.L; l++) {
      const prev = a[l];
      const nOut = this.sizes[l + 1];
      const isLast = l === this.L - 1;
      const zl = new Float64Array(nOut);
      const al = new Float64Array(nOut);

      for (let j = 0; j < nOut; j++) {
        let s = this.b[l][j];
        const w = this.W[l][j];
        for (let i = 0; i < prev.length; i++) s += w[i] * prev[i];
        zl[j] = s;
        al[j] = isLast ? s : this.act.f(s);
      }

      z.push(zl);
      a.push(al);
    }

    return keep ? { a, z } : a[this.L];
  }

  /* 数值稳定的 softmax（先减最大值，防止 exp 溢出） */
  softmax(logits) {
    let m = -Infinity;
    for (let i = 0; i < logits.length; i++) if (logits[i] > m) m = logits[i];

    const e = new Float64Array(logits.length);
    let s = 0;
    for (let i = 0; i < e.length; i++) {
      e[i] = Math.exp(logits[i] - m);
      s += e[i];
    }
    for (let i = 0; i < e.length; i++) e[i] /= s;
    return e;
  }

  probs(x) {
    return this.softmax(this.forward(x));
  }

  predict(x) {
    const p = this.probs(x);
    let best = 0;
    for (let i = 1; i < p.length; i++) if (p[i] > p[best]) best = i;
    return best;
  }

  /* 单样本交叉熵损失 */
  loss(x, y) {
    const p = this.probs(x);
    return -Math.log(Math.max(p[y], 1e-12));
  }

  /* ---------- 用预分配缓冲做推理 ----------
     决策边界要在一帧里算几千次，普通 forward 会疯狂分配数组，
     这里复用同一块内存，只为可视化服务。
  */
  fastPredict(x0, x1) {
    if (!this._buf) this._buf = this.sizes.map(n => new Float64Array(n));

    let prev = this._buf[0];
    prev[0] = x0;
    prev[1] = x1;
    let prevLen = 2;

    for (let l = 0; l < this.L; l++) {
      const cur = this._buf[l + 1];
      const nOut = this.sizes[l + 1];
      const isLast = l === this.L - 1;

      for (let j = 0; j < nOut; j++) {
        let s = this.b[l][j];
        const w = this.W[l][j];
        for (let i = 0; i < prevLen; i++) s += w[i] * prev[i];
        cur[j] = isLast ? s : this.act.f(s);
      }

      prev = cur;
      prevLen = nOut;
    }

    let best = 0;
    for (let i = 1; i < prevLen; i++) if (prev[i] > prev[best]) best = i;
    return best;
  }

  /* ---------- 反向传播 ----------
     softmax + 交叉熵的梯度恰好是 (p - onehot)，
     所以输出层不用再乘一次激活导数。
  */
  backward(a, z, y) {
    const p = this.softmax(z[this.L]);

    let dz = new Float64Array(p.length);
    for (let i = 0; i < p.length; i++) dz[i] = p[i];
    dz[y] -= 1;

    const dW = this.W.map(rows => rows.map(r => new Float64Array(r.length)));
    const db = this.b.map(r => new Float64Array(r.length));

    for (let l = this.L - 1; l >= 0; l--) {
      const prevA = a[l];

      // dW[l][j][i] = δ[j] · a[l-1][i]
      for (let j = 0; j < this.sizes[l + 1]; j++) {
        const d = dz[j];
        if (d === 0) continue;
        const row = dW[l][j];
        for (let i = 0; i < prevA.length; i++) row[i] += d * prevA[i];
        db[l][j] += d;
      }

      // 误差往回传一层：δ[l-1] = (W[l]ᵀ · δ[l]) ⊙ f'(z[l-1])
      if (l > 0) {
        const dA = new Float64Array(this.sizes[l]);
        for (let j = 0; j < this.sizes[l + 1]; j++) {
          const d = dz[j], w = this.W[l][j];
          for (let i = 0; i < dA.length; i++) dA[i] += w[i] * d;
        }

        const zPrev = z[l], aPrev = a[l];
        const nz = new Float64Array(dA.length);
        for (let i = 0; i < dA.length; i++) {
          nz[i] = dA[i] * this.act.df(zPrev[i], aPrev[i]);
        }
        dz = nz;
      }
    }

    return { dW, db, p };
  }

  /* ---------- 一个 mini-batch 的参数更新 ----------
     W ← W - lr · (1/n) Σ dW
  */
  step(batch, lr) {
    const n = batch.xs.length;
    if (n === 0) return;

    const accW = this.W.map(rows => rows.map(r => new Float64Array(r.length)));
    const accB = this.b.map(r => new Float64Array(r.length));

    for (let s = 0; s < n; s++) {
      const { a, z } = this.forward(batch.xs[s], true);
      const { dW, db } = this.backward(a, z, batch.ys[s]);

      for (let l = 0; l < this.L; l++) {
        for (let j = 0; j < this.sizes[l + 1]; j++) {
          const src = dW[l][j], dst = accW[l][j];
          for (let i = 0; i < src.length; i++) dst[i] += src[i];
          accB[l][j] += db[l][j];
        }
      }
    }

    for (let l = 0; l < this.L; l++) {
      for (let j = 0; j < this.sizes[l + 1]; j++) {
        const w = this.W[l][j], g = accW[l][j];
        for (let i = 0; i < w.length; i++) w[i] -= lr * g[i] / n;
        this.b[l][j] -= lr * accB[l][j] / n;
      }
    }
  }

  /* ---------- 给「单步解剖」用 ----------
     返回某一层的激活值、各层 δ、以及一个具体的 Δw 乘法示例，
     这样能指着屏幕说明反向传播到底算出了什么。
  */
  gradients(x, y) {
    const { a, z } = this.forward(x, true);
    const p = this.softmax(z[this.L]);

    let dz = new Float64Array(p.length);
    for (let i = 0; i < p.length; i++) dz[i] = p[i];
    dz[y] -= 1;

    const deltas = new Array(this.L);
    for (let l = this.L - 1; l >= 0; l--) {
      deltas[l] = dz.slice();
      if (l > 0) {
        const dA = new Float64Array(this.sizes[l]);
        for (let j = 0; j < this.sizes[l + 1]; j++) {
          const d = dz[j], w = this.W[l][j];
          for (let i = 0; i < dA.length; i++) dA[i] += w[i] * d;
        }
        const zPrev = z[l], aPrev = a[l];
        const nz = new Float64Array(dA.length);
        for (let i = 0; i < dA.length; i++) {
          nz[i] = dA[i] * this.act.df(zPrev[i], aPrev[i]);
        }
        dz = nz;
      }
    }

    return { a, z, p, deltas };
  }
}
