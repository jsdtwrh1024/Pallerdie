/* =========================================================
   theme.js —— 主题设置（所有页面共用）
   负责：主题色、深浅色（含跟随系统）、字体、背景纹理（含飘落羽毛）、设置面板
   ========================================================= */
(function () {
  "use strict";

  var KEY = "site:settings";
  var DEFAULTS = { hue: 345, sat: 72, light: 58, mode: "light", font: "xingkai", texture: "feather", layout: "list" };
  var root = document.documentElement;
  var state = read();

  var ICON = {
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1Z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6"/></svg>',
    palette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.9 1.8-1.9 0-1.4 1-2.1 2.2-2.1H18a3 3 0 0 0 3-3 9 9 0 0 0-9-11Z"/><circle cx="8" cy="9" r="1.1" fill="currentColor"/><circle cx="12.5" cy="7.4" r="1.1" fill="currentColor"/><circle cx="7.6" cy="13.6" r="1.1" fill="currentColor"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>'
  };

    var HUES = [
    { h: 345, s: 72, l: 58, name: "玫红" }, { h: 14, s: 72, l: 58, name: "橙红" },
    { h: 38, s: 72, l: 58, name: "琥珀" },  { h: 150, s: 72, l: 58, name: "青绿" },
    { h: 190, s: 72, l: 58, name: "湖蓝" }, { h: 220, s: 72, l: 58, name: "靛蓝" },
    { h: 265, s: 72, l: 58, name: "紫罗兰" }, { h: 300, s: 72, l: 58, name: "品红" },
    { h: 0, s: 0, l: 20, name: "墨黑" },    { h: 0, s: 0, l: 42, name: "石墨" },
    { h: 0, s: 0, l: 62, name: "雅灰" }
  ];


  var FONTS = [
    { id: "xingkai", name: "行楷" },
    { id: "kaiti", name: "楷体" },
    { id: "songti", name: "宋体" },
    { id: "round", name: "圆体" }
  ];

  var TEXTURES = [
    { id: "none", name: "无纹理" },
    { id: "dots", name: "极客点阵" },
    { id: "feather", name: "飘落羽毛" }
  ];

  /* ---------- 读写设置 ---------- */
  function read() {
    var out = {};
    for (var k in DEFAULTS) out[k] = DEFAULTS[k];
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || "null");
      if (raw && typeof raw === "object") {
        for (var j in out) if (raw[j] !== undefined) out[j] = raw[j];
      } else if (!raw && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        out.mode = "system";
      }
      if (out.texture === "sakura") out.texture = "feather";   // 旧设置迁移
      if (typeof out.sat !== "number") out.sat = DEFAULTS.sat;
      if (typeof out.light !== "number") out.light = DEFAULTS.light;

    } catch (e) { /* 隐私模式下用默认值 */ }
    return out;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* ---------- 应用 ---------- */
  function effectiveTheme() {
    if (state.mode !== "system") return state.mode;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function apply() {
    root.style.setProperty("--h", String(state.hue));
    root.style.setProperty("--s", state.sat + "%");
    root.style.setProperty("--l", state.light + "%");
    root.setAttribute("data-theme", effectiveTheme());
    root.setAttribute("data-font", state.font);
    root.setAttribute("data-texture", state.texture);
    root.setAttribute("data-mode", state.mode);

    var list = document.getElementById("posts");
    if (list) list.setAttribute("data-layout", state.layout);

    // 同步面板控件
    var hueInput = document.getElementById("hue");
    var hueVal = document.getElementById("hueVal");
    if (hueInput) hueInput.value = String(state.hue);
    if (hueVal) hueVal.textContent = String(state.hue);
    each("[data-hue]", function (b) {
      b.classList.toggle("is-on", Number(b.getAttribute("data-hue")) === Number(state.hue));
    });
    each("[data-set-mode]", function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-set-mode") === state.mode);
    });
    each("[data-set-font]", function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-set-font") === state.font);
    });
    each("[data-set-layout]", function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-set-layout") === state.layout);
    });
    each("[data-set-texture]", function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-set-texture") === state.texture);
    });

    var btn = document.getElementById("themeBtn");
    if (btn) btn.innerHTML = effectiveTheme() === "dark" ? ICON.sun : ICON.moon;

    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", effectiveTheme() === "dark" ? "#131211" : "#f7f5f2");
  }

  function each(sel, fn) {
    var arr = document.querySelectorAll(sel);
    for (var i = 0; i < arr.length; i++) fn(arr[i]);
  }

  function set(key, value) {
    state[key] = value;
    apply();
    save();
  }

  /* ---------- 飘落羽毛 ---------- */
  var FEATHER_SVG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cg fill='black'%3E%3Cpath d='M20.5 2.5c-5.6.4-10.9 3.2-14.4 7.8C3.7 13.4 2.8 17.2 2.8 21c0 .4.3.8.8.8 3.8 0 7.6-1 10.7-3.3 4.6-3.5 7.4-8.8 7.8-14.4a1.4 1.4 0 0 0-1.6-1.6Z'/%3E%3Cpath d='M4.2 19.8 19.2 4.8' stroke='black' stroke-width='1.4' stroke-linecap='round' fill='none'/%3E%3C/g%3E%3C/svg%3E\")";

  function initFeathers() {
    if (document.getElementById("fx")) return;
    var fx = document.createElement("div");
    fx.className = "fx";
    fx.id = "fx";
    for (var i = 0; i < 12; i++) {
      var wrap = document.createElement("div");
      wrap.className = "f";
      wrap.style.setProperty("--x", (Math.random() * 100).toFixed(1) + "vw");
      wrap.style.setProperty("--dur", (11 + Math.random() * 12).toFixed(1) + "s");
      wrap.style.setProperty("--delay", (-Math.random() * 22).toFixed(1) + "s");
      wrap.style.setProperty("--dx", ((Math.random() * 24 - 12).toFixed(0)) + "vw");
      var inner = document.createElement("i");
      var s = 12 + Math.random() * 14;
      inner.style.setProperty("--s", s.toFixed(0) + "px");
      inner.style.setProperty("--o", (0.08 + Math.random() * 0.1).toFixed(2));
      inner.style.setProperty("--sway", (2.4 + Math.random() * 2.6).toFixed(1) + "s");
      inner.style.setProperty("--sway-delay", (-Math.random() * 4).toFixed(1) + "s");
      inner.style.webkitMaskImage = FEATHER_SVG;
      inner.style.maskImage = FEATHER_SVG;
      wrap.appendChild(inner);
      fx.appendChild(wrap);
    }
    document.body.appendChild(fx);
  }

  /* ---------- 设置面板 ---------- */
  function buildPanel() {
    var swatches = HUES.map(function (x) {
      return '<button type="button" class="swatch" data-hue="' + x.h +
        '" data-sat="' + x.s + '" data-light="' + x.l + '" title="' + x.name +
        '" style="background:hsl(' + x.h + ' ' + x.s + '% ' + x.l + '%)"></button>';
    }).join("");

    var segMode = ["light", "dark", "system"].map(function (m) {
      return '<button type="button" data-set-mode="' + m + '">' +
        ({ light: "浅色", dark: "深色", system: "跟随系统" })[m] + "</button>";
    }).join("");

    var segFont = FONTS.map(function (f) {
      return '<button type="button" data-set-font="' + f.id + '" style="font-family:' +
        ({ xingkai: '"STXingkai","华文行楷","Xingkai SC","KaiTi",serif',
           kaiti: '"KaiTi","楷体","Kaiti SC",serif',
           songti: '"SimSun","宋体","Songti SC",serif',
           round: '"YouYuan","幼圆","Yuanti SC",sans-serif' })[f.id] + '">' + f.name + "</button>";
    }).join("");

    var segLayout = '<button type="button" data-set-layout="list">列表</button>' +
      '<button type="button" data-set-layout="grid">网格</button>';

    var segTex = TEXTURES.map(function (t) {
      return '<button type="button" data-set-texture="' + t.id + '">' + t.name + "</button>";
    }).join("");

    var html =
      '<div class="panel__head"><h2>主页主题</h2>' +
      '<button class="iconbtn" id="panelClose" type="button" aria-label="关闭">' + ICON.close + "</button></div>" +

      '<div class="field"><label class="field__label" for="hue"><span>主题色</span><b id="hueVal">' + state.hue + "</b></label>" +
      '<input type="range" id="hue" min="0" max="360" step="1" value="' + state.hue + '">' +
      '<div class="swatches">' + swatches + "</div></div>" +

      '<div class="field"><span class="field__label">外观</span><div class="seg">' + segMode + "</div></div>" +
      '<div class="field"><span class="field__label">字体</span><div class="seg">' + segFont + "</div></div>" +
      '<div class="field"><span class="field__label">布局</span><div class="seg">' + segLayout + "</div></div>" +
      '<div class="field"><span class="field__label">背景纹理</span><div class="textures">' + segTex + "</div></div>" +

      '<button class="reset" id="resetBtn" type="button">恢复默认</button>';

    var panel = document.createElement("aside");
    panel.className = "panel";
    panel.id = "panel";
    panel.setAttribute("aria-hidden", "true");
    panel.innerHTML = html;

    var scrim = document.createElement("div");
    scrim.className = "scrim";
    scrim.id = "scrim";

    document.body.appendChild(scrim);
    document.body.appendChild(panel);
  }

  function openPanel(open) {
    var panel = document.getElementById("panel");
    var scrim = document.getElementById("scrim");
    var btn = document.getElementById("panelBtn");
    if (!panel) return;
    panel.classList.toggle("is-open", open);
    scrim.classList.toggle("is-open", open);
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
  }

  /* ---------- 初始化 ---------- */
  apply();
  initFeathers();
  buildPanel();
  apply();

  var panelBtn = document.getElementById("panelBtn");
  if (panelBtn) panelBtn.innerHTML = ICON.palette;

  if (panelBtn) panelBtn.addEventListener("click", function () {
    openPanel(!document.getElementById("panel").classList.contains("is-open"));
  });
  var closeBtn = document.getElementById("panelClose");
  if (closeBtn) closeBtn.addEventListener("click", function () { openPanel(false); });
  var scrim = document.getElementById("scrim");
  if (scrim) scrim.addEventListener("click", function () { openPanel(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") openPanel(false);
  });

  // 顶栏图标：浅↔深直接切换；面板里可以选"跟随系统"
  var themeBtn = document.getElementById("themeBtn");
  if (themeBtn) themeBtn.addEventListener("click", function () {
    set("mode", effectiveTheme() === "dark" ? "light" : "dark");
  });

  var hueInput = document.getElementById("hue");
  if (hueInput) hueInput.addEventListener("input", function () {
    set("hue", Number(this.value));
  });

  each("[data-hue]", function (b) {
    b.addEventListener("click", function () {
      state.hue = Number(this.getAttribute("data-hue"));
      state.sat = Number(this.getAttribute("data-sat"));
      state.light = Number(this.getAttribute("data-light"));
      apply();
      save();
    });
  });

  each("[data-set-mode]", function (b) {
    b.addEventListener("click", function () { set("mode", this.getAttribute("data-set-mode")); });
  });
  each("[data-set-font]", function (b) {
    b.addEventListener("click", function () { set("font", this.getAttribute("data-set-font")); });
  });
  each("[data-set-layout]", function (b) {
    b.addEventListener("click", function () {
      set("layout", this.getAttribute("data-set-layout"));
      var list = document.getElementById("posts");
      if (list) list.classList.remove("is-filtering");
    });
  });
  each("[data-set-texture]", function (b) {
    b.addEventListener("click", function () { set("texture", this.getAttribute("data-set-texture")); });
  });

  var resetBtn = document.getElementById("resetBtn");
  if (resetBtn) resetBtn.addEventListener("click", function () {
    for (var k in DEFAULTS) state[k] = DEFAULTS[k];
    apply();
    save();
  });

  // 跟随系统时，系统切换深浅要实时响应
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var onSys = function () { if (state.mode === "system") apply(); };
    if (mq.addEventListener) mq.addEventListener("change", onSys);
    else if (mq.addListener) mq.addListener(onSys);
  }

  // 顶栏：滚过首屏后变成毛玻璃
  var topbar = document.getElementById("topbar");
  if (topbar && document.body.classList.contains("has-hero")) {
    var onScroll = function () {
      topbar.classList.toggle("is-stuck", window.scrollY > 40);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  window.BlogTheme = {
    get: function () { return state; },
    set: set,
    apply: apply,
    effectiveTheme: effectiveTheme
  };
})();
