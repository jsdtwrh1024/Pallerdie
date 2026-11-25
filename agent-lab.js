/* =========================================================
   agent-lab.js —— 「Agent 使用展示」全部逻辑
   ----------------------------------------------------------
   ★ 想改内容 / 加链接，只改下面的 AGENT_DATA 就行 ★
   页面结构会自动跟着数据长出来：概览 → 任务清单 → 时间线 →
   数据统计 → 模型分工 → 改造前后 → 其他对话链接。

   纯原生 JS，不依赖任何库；图表用 Canvas 手绘，
   配色直接从 CSS 变量读，所以深浅色 / 主题色都能跟着变。
   ========================================================= */
(function () {
  "use strict";

  /* =========================================================
     一、数据（改这里）
     ========================================================= */
  var AGENT_DATA = {
    /* ---------- 页头 ---------- */
    title: "Agent 使用展示",
    subtitle: "我和AI携手做了什么",
    since: "2026-10-16",          // 第一次用 Agent 的日期，用于算天数
    until: "",                    // 留空 = 算到今天

    /* 顶部一句话总结 */
    lead: "总结我用AI工作和学习的经历" +
      "我把每次对话都在同一个项目里接着说下去，于是它记住了前面所有的决定 —— " +
      "连贯的对话让我们越来越“默契”",

    /* ---------- 概览卡 ---------- */
    overview: [
      { k: "对话轮次", v: 20, unit: "轮+", note: "同一个项目里持续追加" },
      { k: "站点文件", v: 25, unit: "个", note: "全部手写，零依赖" },
      { k: "功能点", v: 18, unit: "项", note: "从骨架到细化" },
      { k: "回归测试", v: 331, unit: "项", note: "每次改动后全量重跑" },
      { k: "使用天数", v: "auto", unit: "天", note: "自然日连续投入" }
    ],

    /* ---------- 任务清单（按模块分组） ---------- */
    groups: [
      {
        name: "建站",
        desc: "从零到能访问",
        items: [
          { t: "纯静态站点骨架", ok: true, d: "HTML/CSS/JS 三个文件，不租服务器、不装框架、不跑构建" },
          { t: "主题色与深浅色切换", ok: true, d: "改一个 --h 色相值全站跟着变，配色面板可拖动" },
          { t: "Hash 路由单页", ok: true, d: "主页 / 动态 / 学习 / 生活 / 番剧 / 游戏 / 留言板，一页切换" },
          { t: "GitHub Pages 部署", ok: true, d: "相对路径 + .nojekyll，子路径仓库也不 404" }
        ]
      },
      {
        name: "内容管理",
        desc: "网页上就能改，不用碰代码",
        items: [
          { t: "管理员模式", ok: true, d: "页脚不起眼入口，密码解锁后才出现编辑按钮" },
          { t: "文章增删改", ok: true, d: "本机改动 → 导出代码 → 粘进 posts.js 推送即生效" },
          { t: "番剧 / 游戏清单", ok: true, d: "评分、状态、封面，卡片角标编辑" },
          { t: "动态区块（仿空间）", ok: true, d: "发布、点赞踩、评论区、置顶与隐藏" },
          { t: "留言板", ok: true, d: "回复、点赞、昵称为空时显示「匿名」" },
          { t: "本地媒体上传", ok: true, d: "图片/视频转 DataURL 存浏览器，超量时给提示" },
          { t: "新建分类", ok: true, d: "侧栏「＋ 新建分类」，文章用过的分类自动收录" },
          { t: "标签检索（多选 and）", ok: true, d: "点标签叠加筛选，chip 可单独移除、可一键清空" }
        ]
      },
      {
        name: "视觉与交互",
        desc: "那些「再改一下」的部分",
        items: [
          { t: "首屏多图轮播", ok: true, d: "纯淡入淡出，图片固定不动；加载失败自动退回色块" },
          { t: "三层无缝波浪", ok: true, d: "同形波形 + 宽度 200% + 位移 50%，循环看不到接缝" },
          { t: "欢迎弹窗", ok: true, d: "昵称或跳过，游客自动发编号" },
          { t: "日历点亮", ok: true, d: "有文章的日子灰方块，点一下变黑并只看当天" },
          { t: "极简图标替换", ok: true, d: "emoji 放大镜 → 内联 SVG 线性图形" }
        ]
      },
      {
        name: "作业",
        desc: "课程要求",
        items: [
          { t: "MLP 训练实验室", ok: true, d: "手写前向/反向传播，决策边界 + 损失曲线 + 权重热力图 + 单步解剖" }
        ]
      }
    ],

    /* ---------- 关键决策时间线 ---------- */
    timeline: [
      { date: "11-13", tag: "起点", t: "决定做纯静态站", d: "不租服务器、不装框架、不跑构建。改完保存刷新就能看到结果，这条硬约束后面一次都没破。" },
      { date: "11-13", tag: "作业", t: "MLP 训练实验室上线", d: "把「实现」和「可视化」拆成 nn.js 与 app.js 两个文件，正好对应作业的两个评分点。数据从团块换成三类螺旋，否则看不出隐藏层的作用。" },
      { date: "11-13", tag: "部署", t: "GitHub Pages 打通", d: "踩了四个坑：路径大小写、以斜杠开头、Jekyll 预处理、中文目录名。" },
      { date: "11-14", tag: "大改", t: "整套视觉重做", d: "推翻第一版，改成侧栏卡片式布局，加公告 / 分类 / 统计 / 日历四个侧栏模块。" },
      { date: "11-14", tag: "系统", t: "管理员模式 + 编辑器", d: "从「只能看」变成「能在网页上改」。核心是设计了一套「本机改动 → 导出 → 粘贴」的工作流。" },
      { date: "11-14", tag: "细节", t: "标签检索与统计", d: "多标签 and 筛选、chip 单独移除、清除前二次确认、统计跟着编辑时间走。" },
      { date: "11-14", tag: "打磨", t: "波浪与轮播", d: "波浪改了三版才无缝：path 复制段误用直线、CSS 宽度写成 100%、底部差 1px 露缝。轮播砍掉了推近效果，只留渐变。" },
      { date: "11-15", tag: "加料", t: "分类管理与日历点亮", d: "分类开始有「自动收录 + 手动新建」两条来路；日历变成可按日期筛选的入口。" }
    ],

    /* ---------- 数据统计 ---------- */
    /* 圆环图：需求类型分布（自己按印象估，加起来 100） */
    donut: {
      title: "这段时间我在让它干什么",
      note: "按提需求的次数粗略归类",
      data: [
        { label: "功能开发", v: 38, color: "#c2603a" },
        { label: "视觉打磨", v: 27, color: "#378add" },
        { label: "修 Bug", v: 22, color: "#ba7517" },
        { label: "答疑与讲解", v: 13, color: "#6b8e5a" }
      ]
    },

    /* 柱状图：改动规模（文件数 / 新增或修改的行数，按时间顺序的批次） */
    bars: {
      title: "每次改动的规模",
      note: "横轴 = 改动批次，纵轴 = 涉及文件数",
      rows: [
        { label: "骨架", v: 3 },
        { label: "作业", v: 5 },
        { label: "改版", v: 6 },
        { label: "编辑器", v: 4 },
        { label: "标签", v: 2 },
        { label: "波浪", v: 3 },
        { label: "轮播", v: 3 },
        { label: "细节", v: 4 },
        { label: "分类", v: 6 },
        { label: "日历", v: 3 }
      ]
    },

    /* 堆叠条：代码量构成 */
    stack: {
      title: "站点代码构成",
      note: "自己写的纯 HTML / CSS / JS，无任何依赖",
      rows: [
        { label: "style.css", v: 2480, color: "#c2603a" },
        { label: "home.js", v: 900, color: "#d98b5f" },
        { label: "editor.js", v: 540, color: "#378add" },
        { label: "moments.js", v: 340, color: "#6b8e5a" },
        { label: "board.js", v: 200, color: "#ba7517" },
        { label: "其余脚本", v: 700, color: "#8c877d" }
      ]
    },

    /* ---------- 多模型分工 ---------- */
    models: [
      {
        name: "WorkBuddy（本对话）",
        role: "主开发",
        color: "#c2603a",
        share: 62,
        points: [
          "整站代码从零搭建，全部功能实现",
          "每次改完自己跑回归测试，331 项断言",
          "用无头浏览器截图核对视觉效果",
          "记住前面所有决定，不用反复解释上下文"
        ]
      },
      {
        name: "DeepSeek",
        role: "思路讨论与方案对比",
        color: "#378add",
        share: 23,
        points: [
          "开始前比较几种建站路线，定下纯静态这一条",
          "讨论过布局与信息密度该怎么取舍",
          "代码片段级别的问题排查"
        ],
        links: [
          { t: "DeepSeek 对话 1", u: "https://chat.deepseek.com/share/lhxteg2f0ohyv7qeng" },
          { t: "DeepSeek 对话 2", u: "https://chat.deepseek.com/share/z2g9x7z5c00en3krt1" },
          { t: "DeepSeek 对话 3", u: "https://chat.deepseek.com/share/xz061aaxyl3bir6syw" }
        ]
      },
      {
        name: "豆包",
        role: "文案与零散问题",
        color: "#ba7517",
        share: 15,
        points: [
          "措辞与自我介绍那类文字打磨",
          "遇到报错的即时问答",
          "补充一些概念的通俗解释"
        ],
        links: [
          { t: "豆包对话 1", u: "https://www.doubao.com/thread/xaKrx5a4moD5ur9Xi" },
          { t: "豆包对话 2", u: "https://www.doubao.com/thread/xDde5hmRZg4UqYLfm" },
          { t: "豆包对话 3", u: "https://www.doubao.com/thread/xKD4fwEUH894r0HXu" }
        ]
      }
    ],

    /* ---------- 改造前后对比 ---------- */
    before: [
      "一个 HTML 文件里塞满内容",
      "改标题要翻半天源码",
      "发一篇要动代码再推一遍",
      "换配色靠全局搜索替换"
    ],
    after: [
      "数据、样式、逻辑三层分开",
      "网页上点「编辑」就能改",
      "导出代码粘进一个文件即发布",
      "改一个色相值全站跟着变"
    ],

    /* ---------- 收尾 ---------- */
    takeaways: [
      "「在同一处接着说」比「每次都重新解释」省下的力气最多。",
      "让它自己跑测试、自己截图核对，比我说「好像不太对」有效得多。",
      "需求描述得越具体，返工越少 —— 比如「只要渐变，不要先拉近」这种话说清楚，一版就过。",
      "AI 写得再快，最后检查路径、压缩图片、点「部署」的还是我自己。"
    ]
  };

  /* =========================================================
     二、下面不用改
     ========================================================= */

  var $ = function (s, r) { return (r || document).querySelector(s); };

  /* ---------- 时间工具 ---------- */
  function parseDay(s) {
    var d = new Date(String(s) + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  }
  function daysBetween(a, b) {
    if (!a || !b) return 0;
    // 只比日期，不受时分秒影响
    var x = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    var y = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((y - x) / 86400000) + 1;
  }
  function today() { return new Date(); }

  /* 主题色：从 body 的 CSS 变量里读，页面换主题这里跟着变 */
  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* =========================================================
     三、渲染各部分
     ========================================================= */

  /* ---------- 概览 ---------- */
  function renderOverview() {
    var box = $("#ovGrid");
    if (!box) return;
    var d = AGENT_DATA;
    var since = parseDay(d.since);
    var days = daysBetween(since, d.until ? parseDay(d.until) : today());

    box.innerHTML = d.overview.map(function (o, i) {
      var v = o.v === "auto" ? days : o.v;
      return '<div class="ov" style="--i:' + i + '">' +
        '<div class="ov__v"><b data-count="' + (typeof v === "number" ? v : 0) + '">' +
          (typeof v === "number" ? "0" : esc(v)) + "</b>" +
        '<i>' + esc(o.unit) + "</i></div>" +
        '<div class="ov__k">' + esc(o.k) + "</div>" +
        '<div class="ov__n">' + esc(o.note) + "</div>" +
        "</div>";
    }).join("");

    // 数字滚动：进入视口才跑，避免一打开就一堆动画
    var nums = box.querySelectorAll("[data-count]");
    var done = false;
    function run() {
      if (done) return;
      done = true;
      Array.prototype.forEach.call(nums, function (el) {
        var target = Number(el.getAttribute("data-count")) || 0;
        var start = performance.now();
        var dur = 900;
        function tick(now) {
          var p = Math.min(1, (now - start) / dur);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = String(Math.round(target * eased));
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = String(target);
        }
        requestAnimationFrame(tick);
      });
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { run(); io.disconnect(); } });
      }, { threshold: .25 });
      io.observe(box);
    } else { run(); }
  }

  /* ---------- 任务清单 ---------- */
  function renderTasks() {
    var box = $("#taskGrid");
    if (!box) return;
    var total = 0, doneN = 0;
    AGENT_DATA.groups.forEach(function (g) {
      g.items.forEach(function (it) { total++; if (it.ok) doneN++; });
    });

    box.innerHTML = AGENT_DATA.groups.map(function (g, gi) {
      var okN = g.items.filter(function (x) { return x.ok; }).length;
      return '<section class="grp" style="--i:' + gi + '">' +
        '<div class="grp__head">' +
          "<h3>" + esc(g.name) + "</h3>" +
          '<span class="grp__desc">' + esc(g.desc) + "</span>" +
          '<span class="grp__n">' + okN + " / " + g.items.length + "</span>" +
        "</div>" +
        '<ul class="grp__list">' + g.items.map(function (it) {
          return '<li class="task' + (it.ok ? " is-ok" : "") + '">' +
            '<i class="task__mark" aria-hidden="true">' + (it.ok ? "✓" : "·") + "</i>" +
            '<div><b>' + esc(it.t) + "</b><span>" + esc(it.d) + "</span></div>" +
          "</li>";
        }).join("") + "</ul>" +
      "</section>";
    }).join("");

    var bar = $("#taskBar");
    if (bar) {
      bar.style.width = Math.round(doneN / Math.max(total, 1) * 100) + "%";
      var lab = $("#taskLabel");
      if (lab) lab.textContent = doneN + " / " + total + " 项已完成";
    }
  }

  /* ---------- 时间线 ---------- */
  function renderTimeline() {
    var box = $("#tlList");
    if (!box) return;
    box.innerHTML = AGENT_DATA.timeline.map(function (t, i) {
      return '<li class="tl" style="--i:' + i + '">' +
        '<span class="tl__dot" aria-hidden="true"></span>' +
        '<div class="tl__body">' +
          '<div class="tl__top"><time>' + esc(t.date) + "</time>" +
          '<span class="tl__tag">' + esc(t.tag) + "</span></div>" +
          '<h3>' + esc(t.t) + "</h3>" +
          "<p>" + esc(t.d) + "</p>" +
        "</div></li>";
    }).join("");
  }

  /* ---------- Canvas 自适应 ---------- */
  /* 每个 canvas 都按 CSS 像素 × dpr 设尺寸，避免在高分屏上糊 */
  function fitCanvas(cv) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return null;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    var ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }

  var ink = function () { return cssVar("--text", "#1d1c1a"); };
  var dim = function () { return cssVar("--text-mute", "#8c877d"); };
  var line = function () { return cssVar("--line", "#e4e0d9"); };
  var FONT = '600 11px Inter, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
  var FONT_SM = '400 10.5px Inter, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';

  /* ---------- 圆环图 ---------- */
  function drawDonut() {
    var cv = $("#donutCv");
    var d = AGENT_DATA.donut;
    if (!cv) return;

    // 图例（顺便放百分比）
    var legend = $("#donutLegend");
    if (legend) {
      legend.innerHTML = d.data.map(function (x) {
        return '<li><i style="background:' + x.color + '"></i>' +
          '<span class="lg__label">' + esc(x.label) + "</span>" +
          '<b>' + x.v + "%</b></li>";
      }).join("");
    }

    var fit = fitCanvas(cv);
    if (!fit) return;
    var ctx = fit.ctx, w = fit.w, h = fit.h;
    var cx = w / 2, cy = h / 2;
    var R = Math.min(w, h) / 2 - 8;
    var r = R * .62;
    var total = d.data.reduce(function (s, x) { return s + x.v; }, 0) || 1;

    var start = -Math.PI / 2;
    d.data.forEach(function (x) {
      var ang = (x.v / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, R, start + .012, start + ang - .012);
      ctx.arc(cx, cy, r, start + ang - .012, start + .012, true);
      ctx.closePath();
      ctx.fillStyle = x.color;
      ctx.fill();
      start += ang;
    });

    // 中心：最大的那一项
    var top = d.data.slice().sort(function (a, b) { return b.v - a.v; })[0];
    ctx.fillStyle = ink();
    ctx.textAlign = "center";
    ctx.font = '650 20px Inter, -apple-system, "Segoe UI", "PingFang SC", sans-serif';
    ctx.fillText(top.v + "%", cx, cy + 2);
    ctx.font = FONT_SM;
    ctx.fillStyle = dim();
    ctx.fillText(top.label, cx, cy + 18);
  }

  /* ---------- 柱状图 ---------- */
  function drawBars() {
    var cv = $("#barCv");
    if (!cv) return;
    var d = AGENT_DATA.bars;
    var fit = fitCanvas(cv);
    if (!fit) return;
    var ctx = fit.ctx, w = fit.w, h = fit.h;

    var padL = 4, padR = 4, padT = 16, padB = 22;
    var plotW = w - padL - padR, plotH = h - padT - padB;
    var rows = d.rows;
    var max = Math.max.apply(null, rows.map(function (r) { return r.v; })) || 1;
    var gap = Math.max(6, plotW / rows.length * .32);
    var bw = (plotW - gap * (rows.length - 1)) / rows.length;

    // 基线
    ctx.strokeStyle = line();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT + plotH + .5);
    ctx.lineTo(padL + plotW, padT + plotH + .5);
    ctx.stroke();

    var accent = cssVar("--accent", "#c2603a");

    rows.forEach(function (r, i) {
      var bh = Math.max(3, (r.v / max) * plotH);
      var x = padL + i * (bw + gap);
      var y = padT + plotH - bh;

      // 柱子：上浅下深的竖向渐变
      var g = ctx.createLinearGradient(0, y, 0, y + bh);
      g.addColorStop(0, accent);
      g.addColorStop(1, hexA(accent, .28));
      ctx.fillStyle = g;
      roundRect(ctx, x, y, bw, bh, Math.min(5, bw / 2));
      ctx.fill();

      // 数值
      ctx.fillStyle = ink();
      ctx.font = FONT;
      ctx.textAlign = "center";
      ctx.fillText(String(r.v), x + bw / 2, y - 4);

      // 标签
      ctx.fillStyle = dim();
      ctx.font = FONT_SM;
      ctx.fillText(r.label, x + bw / 2, h - 6);
    });
  }

  /* 把 --accent 这种 hsl(...) 转成带透明度的颜色：用取色法最稳，
     直接给 fillStyle 设 hsl 再读回来浏览器会归一化 */
  function hexA(color, a) {
    try {
      if (color.indexOf("hsl") === 0) {
        // hsl(345 72% 58%) → 手动转 rgba
        var m = /hsl\(\s*([\d.]+)\s*[\s,]\s*([\d.]+)%\s*[\s,]\s*([\d.]+)%/.exec(color);
        if (m) {
          var rgb = hsl2rgb(+m[1], +m[2] / 100, +m[3] / 100);
          return "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + a + ")";
        }
      }
      if (color[0] === "#" && color.length === 7) {
        var n = parseInt(color.slice(1), 16);
        return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
      }
    } catch (e) {}
    return color;
  }

  function hsl2rgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    var q = l < .5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    function f(t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)];
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* ---------- 堆叠条 ---------- */
  function renderStack() {
    var box = $("#stackRows");
    if (!box) return;
    var rows = AGENT_DATA.stack.rows;
    var total = rows.reduce(function (s, r) { return s + r.v; }, 0) || 1;

    box.innerHTML = rows.map(function (r, i) {
      var pct = (r.v / total * 100);
      return '<div class="stk__row" style="--i:' + i + '">' +
        '<span class="stk__name">' + esc(r.label) + "</span>" +
        '<span class="stk__track"><i style="width:' + pct.toFixed(1) + "%;background:" + r.color + '"></i></span>' +
        '<b class="stk__n">' + r.v + " 行</b>" +
      "</div>";
    }).join("");

    var sum = $("#stackTotal");
    if (sum) sum.textContent = total.toLocaleString("en-US") + " 行手写代码";
  }

  /* ---------- 模型分工 ---------- */
  function renderModels() {
    var box = $("#modelGrid");
    if (!box) return;
    box.innerHTML = AGENT_DATA.models.map(function (m, i) {
      var links = (m.links || []).map(function (l) {
        return '<a class="mlink" href="' + esc(l.u) + '" target="_blank" rel="noopener">' +
          esc(l.t) + '<span aria-hidden="true">↗</span></a>';
      }).join("");
      return '<article class="mdl" style="--i:' + i + ';--mc:' + m.color + '">' +
        '<div class="mdl__head">' +
          '<span class="mdl__dot" aria-hidden="true"></span>' +
          "<div><h3>" + esc(m.name) + "</h3>" +
          '<span class="mdl__role">' + esc(m.role) + "</span></div>" +
          '<b class="mdl__share">' + m.share + "%</b>" +
        "</div>" +
        '<div class="mdl__track"><i style="width:' + m.share + '%"></i></div>' +
        '<ul class="mdl__pts">' + m.points.map(function (p) {
          return "<li>" + esc(p) + "</li>";
        }).join("") + "</ul>" +
        (links ? '<div class="mdl__links">' + links + "</div>" : "") +
      "</article>";
    }).join("");
  }

  /* ---------- 对比 ---------- */
  function renderCompare() {
    var b = $("#beforeList"), a = $("#afterList");
    if (b) b.innerHTML = AGENT_DATA.before.map(function (x) {
      return "<li>" + esc(x) + "</li>";
    }).join("");
    if (a) a.innerHTML = AGENT_DATA.after.map(function (x) {
      return "<li>" + esc(x) + "</li>";
    }).join("");
  }

  /* ---------- 收尾 ---------- */
  function renderTakeaways() {
    var box = $("#takeList");
    if (!box) return;
    box.innerHTML = AGENT_DATA.takeaways.map(function (t, i) {
      return '<li style="--i:' + i + '"><span>' + String(i + 1).padStart(2, "0") + "</span>" + esc(t) + "</li>";
    }).join("");
  }

  /* =========================================================
     四、启动
     ========================================================= */
  function boot() {
    var t = $("#agTitle"), s = $("#agSub"), l = $("#agLead");
    if (t) t.textContent = AGENT_DATA.title;
    if (s) s.textContent = AGENT_DATA.subtitle;
    if (l) l.textContent = AGENT_DATA.lead;

    var extra = $("#agSince");
    if (extra) {
      var since = parseDay(AGENT_DATA.since);
      extra.textContent = since
        ? since.getFullYear() + " 年 " + (since.getMonth() + 1) + " 月 " + since.getDate() + " 日 起"
        : "";
    }

    renderOverview();
    renderTasks();
    renderTimeline();
    drawDonut();
    drawBars();
    renderStack();
    renderModels();
    renderCompare();
    renderTakeaways();

    // 尺寸变了重画图（画布不是矢量的，必须重算）
    var rt = null;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () { drawDonut(); drawBars(); }, 120);
    });

    // 主题切换（页面上如果有触发的话）也跟着重画
    document.addEventListener("theme:change", function () { drawDonut(); drawBars(); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // 方便以后从控制台临时改数据看效果
  window.AgentLab = {
    data: AGENT_DATA,
    redraw: function () { drawDonut(); drawBars(); }
  };
})();
