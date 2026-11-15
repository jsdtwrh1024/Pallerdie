/* =========================================================
   home.js —— 首页逻辑
   区块路由（主页/番剧/游戏/留言板）、轮播、打字机、
   侧栏（公告/分类/统计/日历）、文章列表与筛选
   ========================================================= */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- 站点信息 ---------- */
  $("brandName").textContent = SITE.name;
  $("sideName").textContent = SITE.name;
  $("sideMotto").textContent = SITE.motto;
  $("footText").textContent = SITE.footer;
  $("footName").textContent = SITE.name;
  $("year").textContent = String(new Date().getFullYear());
  document.title = SITE.name;

  var desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute("content", SITE.desc);

  /* ---------- 首屏轮播 ----------
     图片和文案都在 posts.js 的 SCENES 里配置：
       { src: "images/bg1.jpg", sub: "一句话文案" }
     没写 src（或图片加载失败）时，自动退回原来的色块场景 look:"dusk"。 */
  var slideBox = $("heroSlides");
  var slides = (typeof SCENES !== "undefined" && SCENES.length) ? SCENES : [{ look: "dusk", sub: "" }];

  var slideHtml = "";
  for (var i = 0; i < slides.length; i++) {
    var s = slides[i];
    var cls = "hero__slide" + (i === 0 ? " is-active" : "");
    if (s.src) {
      slideHtml += '<div class="' + cls + ' hero__slide--img">' +
        '<img src="' + String(s.src).replace(/"/g, "&quot;") + '" alt="" aria-hidden="true" loading="' +
        (i === 0 ? "eager" : "lazy") + '"></div>';
    } else {
      slideHtml += '<div class="' + cls + ' scene--' + (s.look || "dusk") + '"></div>';
    }
  }
  slideBox.innerHTML = slideHtml;
  var slideEls = slideBox.children;

  // 图片挂掉（路径写错 / 没上传）→ 这一屏退回色块，不至于白屏
  for (var j = 0; j < slideEls.length; j++) {
    var img = slideEls[j].querySelector("img");
    if (img) {
      img.addEventListener("error", function () {
        var host = this.parentNode;
        host.classList.remove("hero__slide--img");
        host.classList.add("scene--dusk");
        this.remove();
      });
    }
  }

  function showSlide(n) {
    for (var k = 0; k < slideEls.length; k++) {
      slideEls[k].classList.toggle("is-active", k === n);
    }
  }

  /* ---------- 打字机 + 轮播联动 ---------- */
  var typed = $("typed");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var idx = 0;
  var chars = 0;
  var phase = "type";

  function loop() {
    var text = slides[idx % slides.length].sub || "";
    // 只有一张图时不用反复重打，直接显示
    if (slides.length < 2) { typed.textContent = text; return; }
    if (phase === "type") {
      chars++;
      typed.textContent = text.slice(0, chars);
      if (chars >= text.length) { phase = "hold"; setTimeout(loop, 2600); return; }
      setTimeout(loop, reduce ? 0 : 70 + Math.random() * 70);
      return;
    }
    if (phase === "hold") { phase = "erase"; setTimeout(loop, 60); return; }
    if (phase === "erase") {
      chars--;
      typed.textContent = text.slice(0, Math.max(chars, 0));
      if (chars <= 0) { phase = "gap"; setTimeout(loop, 320); return; }
      setTimeout(loop, reduce ? 0 : 28);
      return;
    }
    idx++;
    showSlide(idx % slides.length);
    phase = "type";
    setTimeout(loop, 150);
  }
  loop();

  /* ---------- 区块路由 ---------- */
  var VIEWS = { home: { name: SITE.title } };
  for (var sk in SECTIONS) VIEWS[sk] = SECTIONS[sk];

  function currentView() {
    var h = (location.hash || "#home").replace("#", "");
    return VIEWS[h] ? h : "home";
  }

  function route() {
    var view = currentView();
    document.body.setAttribute("data-view", view);

    each(".view", function (v) { v.hidden = v.getAttribute("data-view") !== view; });
    each(".nav a[data-view]", function (a) {
      a.classList.toggle("is-on", a.getAttribute("data-view") === view);
    });

    var heroTitle = $("heroTitle");
    if (view === "home") {
      heroTitle.textContent = SITE.title;
      document.title = SITE.name;
    } else {
      heroTitle.textContent = VIEWS[view].name;
      document.title = VIEWS[view].name + " · " + SITE.name;
    }

    renderSectionList(view);

    if (view === "home") window.scrollTo({ top: 0 });
  }

  /* 学习 / 生活这类区块：显示分类名与区块同名的文章卡片 */
  function renderSectionList(view) {
    var box2 = document.querySelector('[data-list="' + view + '"]');
    if (!box2 || !SECTIONS[view]) return;
    var list = allPosts().filter(function (p) { return p.cat === SECTIONS[view].name; });
    // 学习区块：MLP 实验室固定排第一
    var head = view === "study" ? mlpCard() : "";
    box2.innerHTML = head + (list.length
      ? list.map(card).join("")
      : '<p class="empty">这里还没有内容 —— 发一篇分类为「' + SECTIONS[view].name + '」的文章，就会自动出现在这里。</p>');
    if (BlogAdmin.is()) {
      box2.innerHTML += '<button type="button" class="addcard" data-addcat="' + SECTIONS[view].name + '">＋ 点击添加内容</button>';
    }
  }

  function each(sel, fn) {
    var arr = document.querySelectorAll(sel);
    for (var i = 0; i < arr.length; i++) fn(arr[i]);
  }

  each(".nav a[data-view]", function (a) {
    a.addEventListener("click", function () {
      // 点当前区块时再次回到顶部
      if (this.getAttribute("data-view") === currentView()) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  });

  // 「归档」= 回到顶部
  var archive = document.getElementById("navArchive");
  if (archive) archive.addEventListener("click", function (e) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("hashchange", route);
  route();
  // 管理员身份变化（登录/退出）后重渲染，让末尾的加号卡片跟着出现/消失
  document.addEventListener("admin:change", function () { renderList(); route(); });

  /* ---------- 公告 ---------- */
  function renderNotice() {
    $("noticeText").textContent = BlogAdmin.load("site:notice", NOTICE);
  }
  renderNotice();

  var noticeEdit = $("noticeEdit");
  if (noticeEdit) noticeEdit.addEventListener("click", function () {
    var next = window.prompt("编辑公告：", BlogAdmin.load("site:notice", NOTICE));
    if (next === null) return;
    BlogAdmin.store("site:notice", next);
    renderNotice();
    BlogAdmin.toast("公告已更新（本机）");
  });

  /* ---------- 分类（侧栏 + 胶囊共用一套筛选） ---------- */
  var pillsBox = $("pills");
  var listBox = $("posts");
  var current = "全部";
  /* 本地添加/修改的文章（管理模式下网页端改的）合并进列表 */
  function allPosts() {
    return window.BlogEditor ? BlogEditor.mergedPosts() : POSTS.concat(BlogAdmin.load("site:posts", []));
  }

  /* 分类列表统一交给 cats.js：文章用过的 + 网页上新建的 + posts.js 声明的 */
  function catAll() {
    if (window.BlogCats) return BlogCats.all();
    var out = [];
    allPosts().forEach(function (p) {
      var c = String(p.cat || "").trim();
      if (c && out.indexOf(c) < 0) out.push(c);
    });
    return out;
  }

  function countOf(cat) {
    return allPosts().filter(function (p) { return p.cat === cat; }).length;
  }

  function renderPills() {
    // 分类可能因为新增/编辑文章而变化，每次重算
    var html = pill("全部", allPosts().length);
    catAll().forEach(function (c) { html += pill(c, countOf(c)); });
    pillsBox.innerHTML = html;
  }

  function pill(name, count) {
    return '<button type="button" class="pill' + (name === current ? " is-on" : "") +
      '" data-cat="' + escAttr(name) + '">' + escHtml(name) + "<b>" + count + "</b></button>";
  }

  function renderCats() {
    var box = $("catList");
    var list = catAll();
    var html = "";
    list.forEach(function (c) {
      var n = countOf(c);
      html += '<span class="catrowwrap">' +
        '<button type="button" class="catrow' + (c === current ? " is-on" : "") +
          '" data-cat="' + escAttr(c) + '"><span>' + escHtml(c) + "</span><b>" + n + "</b></button>" +
        '<button type="button" class="catrow__del admin-only" data-delcat="' + escAttr(c) +
          '" title="删除分类「' + escAttr(c) + '」" aria-label="删除分类">✕</button>' +
      "</span>";
    });
    if (!list.length) {
      html = '<p class="catlist__empty">还没有分类 —— 发第一篇内容，或点下面的「＋ 新建分类」。</p>';
    }
    html += '<button type="button" class="catadd admin-only" id="catAddBtn">＋ 新建分类</button>';
    box.innerHTML = html;
  }

  /* 新建分类：自绘输入框（样式统一，回车即建） */
  function askNewCat() {
    var ov = document.createElement("div");
    ov.className = "confirm";
    ov.innerHTML =
      '<div class="confirm__box confirm__box--input" role="dialog" aria-modal="true">' +
        '<p class="confirm__text">新建一个分类</p>' +
        '<input class="confirm__input" maxlength="12" placeholder="例如：旅行、读书、代码…" autocomplete="off">' +
        '<div class="confirm__ops">' +
          '<button type="button" class="confirm__btn" data-no>取消</button>' +
          '<button type="button" class="confirm__btn confirm__btn--yes" data-yes>创建</button>' +
        "</div>" +
      "</div>";
    document.body.appendChild(ov);
    requestAnimationFrame(function () { ov.classList.add("is-in"); });
    var input = ov.querySelector(".confirm__input");
    input.focus();

    function done(save) {
      var name = input.value.trim();
      document.removeEventListener("keydown", onKey);
      ov.classList.remove("is-in");
      setTimeout(function () { ov.remove(); }, 160);
      if (!save) return;
      if (!name) { BlogAdmin.toast("分类名不能为空"); return; }
      if (catAll().indexOf(name) >= 0) { BlogAdmin.toast("「" + name + "」已经有了"); return; }
      if (window.BlogCats) BlogCats.add(name);
      renderPills(); renderCats();
      BlogAdmin.toast("已新建分类「" + name + "」（本机，导出后全站生效）");
    }
    function onKey(e) {
      if (e.key === "Escape") done(false);
      if (e.key === "Enter") { e.preventDefault(); done(true); }
    }
    document.addEventListener("keydown", onKey);
    ov.addEventListener("click", function (e) {
      if (e.target === ov) { done(false); return; }
      if (e.target.closest("[data-yes]")) { done(true); return; }
      if (e.target.closest("[data-no]")) { done(false); }
    });
  }

  /* 删除分类：确认后删掉；里面还有文章时提示先改文章分类 */
  function askDelCat(name) {
    // 区块名（学习 / 生活）是导航用的固定分类，不能删
    if (window.BlogCats && BlogCats.sections().indexOf(name) >= 0) {
      BlogAdmin.toast("「" + name + "」是左侧导航区块的分类，不能删除");
      return;
    }
    var n = countOf(name);
    if (n > 0) {
      BlogAdmin.toast("「" + name + "」下还有 " + n + " 篇内容，先把它们的分类改掉再删");
      return;
    }
    if (!window.confirm("删除分类「" + name + "」？")) return;
    if (window.BlogCats) BlogCats.remove(name);
    if (current === name) current = "全部";
    renderPills(); renderCats(); renderList();
    BlogAdmin.toast("已删除分类「" + name + "」");
  }


  function card(p) {
    var slugAttr = String(p.slug).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    var tags = (p.tags || []).map(function (t) {
      var tAttr = String(t).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
      return '<button type="button" class="tag" data-tagsearch="' + tAttr + '">#' + t + "</button>";
    }).join("");
    var mediaBadge = (p.media && p.media.length)
      ? '<span class="meta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M3.5 16.5l4.2-4 3.3 3 3-2.6 6.5 5.6"/></svg>' + p.media.length + " 个附件</span>"
      : "";
    return '<a class="post" href="post.html?p=' + encodeURIComponent(p.slug) + '" data-slug="' + slugAttr + '">' +
      '<button type="button" class="post__edit admin-only" data-editpost="' + slugAttr + '" title="编辑这篇">编辑</button>' +
      '<h2 class="post__title">' + p.title + "</h2>" +
      '<div class="post__meta">' +
        '<span class="meta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></svg>' + p.date + "</span>" +
        '<span class="meta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2.5h6A2.5 2.5 0 0 1 20.5 10v7A2.5 2.5 0 0 1 18 19.5H6A2.5 2.5 0 0 1 3.5 17Z"/></svg>' + p.cat + "</span>" +
        '<span class="meta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M7 4h7l4 4v12a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5.5A1.5 1.5 0 0 1 7.5 4Z"/><path d="M9.5 12h5M9.5 15.5h5"/></svg>' + wordCount(p) + " 字</span>" +
        mediaBadge +
      "</div>" +
      '<p class="post__excerpt">' + p.excerpt + "</p>" +
      '<div class="post__tags">' + tags + "</div>" +
      '<span class="post__arrow" aria-hidden="true">›</span>' +
      "</a>";
  }

  /* MLP 实验室特制卡片：学习区块永远的第一项 */
  function mlpCard() {
    return '<a class="post post--mlp" href="mlp/index.html">' +
      '<h2 class="post__title">MLP 训练实验室</h2>' +
      '<div class="post__meta">' +
        '<span class="meta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></svg>2026-11-14</span>' +
        '<span class="meta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2.5h6A2.5 2.5 0 0 1 20.5 10v7A2.5 2.5 0 0 1 18 19.5H6A2.5 2.5 0 0 1 3.5 17Z"/></svg>学习成果</span>' +
      "</div>" +
      '<p class="post__excerpt">在浏览器里亲手训练一个三层感知机：画点生成数据、实时看决策边界 / 损失曲线 / 权重矩阵，还能单步解剖反向传播。点右侧箭头直接开始 →</p>' +
      '<div class="post__tags">' +
        '<button type="button" class="tag" data-tagsearch="MLP">#MLP</button>' +
        '<button type="button" class="tag" data-tagsearch="反向传播">#反向传播</button>' +
        '<button type="button" class="tag" data-tagsearch="可视化">#可视化</button>' +
        '<button type="button" class="tag" data-tagsearch="机器学习">#机器学习</button>' +
      "</div>" +
      '<span class="post__arrow post__arrow--big" aria-hidden="true">›</span>' +
      "</a>";
  }

  /* ---------- 标签检索（支持多选：and 关系） ---------- */
  var currentTags = [];          // 已选标签（数组，顺序 = 点击顺序）
  var MLP_TAGS = ["MLP", "反向传播", "可视化", "机器学习"];

  function hasTag(p, t) { return (p.tags || []).indexOf(t) >= 0; }

  /* 一篇是否同时拥有所有已选标签 */
  function matchAll(p) {
    for (var i = 0; i < currentTags.length; i++) {
      if (!hasTag(p, currentTags[i])) return false;
    }
    return true;
  }

  /* MLP 实验室卡片挂了固定 4 个标签，参与筛选 */
  function mlpMatches() {
    for (var i = 0; i < currentTags.length; i++) {
      if (MLP_TAGS.indexOf(currentTags[i]) < 0) return false;
    }
    return currentTags.length > 0;
  }

  function allTags() {
    var set = [], seen = {};
    // MLP 实验室的固定标签也算进去
    ["MLP", "反向传播", "可视化", "机器学习"].forEach(function (t) {
      if (!seen[t]) { seen[t] = 1; set.push(t); }
    });
    allPosts().forEach(function (p) {
      (p.tags || []).forEach(function (t) {
        if (!seen[t]) { seen[t] = 1; set.push(t); }
      });
    });
    return set;
  }

  function renderTagList() {
    var dl = $("tagList");
    if (dl) dl.innerHTML = allTags().map(function (t) {
      return '<option value="' + t + '"></option>';
    }).join("");
  }

  function setTags(list) {
    currentTags = (list || []).filter(function (t, i, a) { return t && a.indexOf(t) === i; });
    drawTagBanner();
    // 有标签时跳到主页看结果
    if (currentTags.length && currentView() !== "home") location.hash = "#home";
    renderPills(); renderCats(); renderList();
  }

  /* 点文章下的标签 = 加入筛选；再点同一个 = 取消它 */
  function toggleTag(tag) {
    tag = String(tag || "").trim();
    if (!tag) return;
    var i = currentTags.indexOf(tag);
    if (i >= 0) currentTags.splice(i, 1);
    else currentTags.push(tag);
    setTags(currentTags);
  }

  /* 标签包横幅：标签包 ｜[#a ×][#b ×] …｜ 清除所有标签 */
  function drawTagBanner() {
    var banner = $("tagBanner");
    if (!banner) return;
    if (!currentTags.length) {
      banner.hidden = true;
      banner.innerHTML = "";
      return;
    }
    var n = allPosts().filter(matchAll).length + (mlpMatches() ? 1 : 0);
    banner.hidden = false;
    banner.innerHTML =
      '<span class="tagbanner__label">标签包</span>' +
      '<span class="tagbanner__chips">' +
        currentTags.map(function (t, i) {
          return '<span class="tagchip" data-chipped="' + escAttr(t) + '">' +
            '<span class="tagchip__text">#' + escHtml(t) + "</span>" +
            '<button type="button" class="tagchip__x" data-rmtag="' + escAttr(t) +
              '" title="移除这个标签" aria-label="移除标签 ' + escAttr(t) + '">✕</button>' +
          "</span>";
        }).join("") +
      "</span>" +
      '<span class="tagbanner__count">' + n + " 篇</span>" +
      '<button type="button" class="tagbanner__clear" data-cleartag>清除所有标签</button>';
  }

  function escHtml(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function escAttr(s) {
    return escHtml(s).replace(/"/g, "&quot;");
  }

  /* 清除所有标签：≥3 个时先弹确认窗口 */
  function askClearTags() {
    if (currentTags.length >= 3) {
      confirmClear(function (yes) { if (yes) setTags([]); });
      return;
    }
    setTags([]);
  }

  /* 自绘确认框：约半个文章标题框大小，右下 / 左下各一个按钮 */
  function confirmClear(onAnswer) {
    var ov = document.createElement("div");
    ov.className = "confirm";
    ov.innerHTML =
      '<div class="confirm__box" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">' +
        '<p class="confirm__text" id="confirmTitle">确定要清除所有已选标签吗？</p>' +
        '<div class="confirm__ops">' +
          '<button type="button" class="confirm__btn" data-no>否</button>' +
          '<button type="button" class="confirm__btn confirm__btn--yes" data-yes>是</button>' +
        "</div>" +
      "</div>";
    document.body.appendChild(ov);
    requestAnimationFrame(function () { ov.classList.add("is-in"); });

    function done(ans) {
      document.removeEventListener("keydown", onKey);
      ov.classList.remove("is-in");
      setTimeout(function () { ov.remove(); }, 160);
      onAnswer(ans);
    }
    function onKey(e) {
      if (e.key === "Escape") done(false);
      if (e.key === "Enter") done(true);
    }
    document.addEventListener("keydown", onKey);
    ov.addEventListener("click", function (e) {
      if (e.target === ov) { done(false); return; }          // 点遮罩=否
      if (e.target.closest("[data-yes]")) { done(true); return; }
      if (e.target.closest("[data-no]")) { done(false); }
    });
    var yes = ov.querySelector("[data-yes]");
    if (yes) yes.focus();
  }

  function renderList() {
    var filtering = currentTags.length > 0;
    var byDate = !!activeDate;
    var list = allPosts().filter(function (p) {
      if (byDate) return String(p.date || "").slice(0, 10) === activeDate;
      if (filtering) return matchAll(p);
      return current === "全部" || p.cat === current;
    });

    drawDateBanner();

    if (byDate) {
      if (!list.length) {
        listBox.innerHTML = '<p class="empty">' + escHtml(activeDate) + " 这天还没有内容。" +
          '<button type="button" class="linkbtn" data-cleardate>取消日期筛选</button></p>';
      } else {
        listBox.innerHTML = list.map(card).join("");
      }
    } else if (filtering) {
      var head = mlpMatches() ? mlpCard() : "";
      if (!list.length && !head) {
        listBox.innerHTML = '<p class="empty">没有同时带 ' +
          currentTags.map(function (t) { return "「#" + escHtml(t) + "」"; }).join("、") +
          " 这些标签的文章。试着去掉一个标签？</p>";
      } else {
        listBox.innerHTML = head + list.map(card).join("");
      }
    } else if (!list.length) {
      listBox.innerHTML = '<p class="empty">这个分类下还没有内容。</p>';
    } else {
      listBox.innerHTML = list.map(card).join("");
    }
    if (BlogAdmin.is() && !filtering) {
      listBox.innerHTML += '<button type="button" class="addcard" data-addcat="' + current + '">＋ 点击添加内容</button>';
    }
    listBox.classList.remove("is-filtering");
    void listBox.offsetWidth;
    listBox.classList.add("is-filtering");
  }

  /* 日期筛选提示条：藏在上面的 tagbar 位置，点 ✕ 取消 */
  function drawDateBanner() {
    var bar = $("dateBanner");
    if (!bar) return;
    if (!activeDate) {
      bar.hidden = true;
      bar.innerHTML = "";
      return;
    }
    var n = allPosts().filter(function (p) { return String(p.date || "").slice(0, 10) === activeDate; }).length;
    var d = new Date(activeDate + "T00:00:00");
    var label = (d.getMonth() + 1) + " 月 " + d.getDate() + " 日";
    bar.hidden = false;
    bar.innerHTML =
      '<span class="tagbanner__label">日期</span>' +
      '<span class="datetag">' + escHtml(label) +
        '<span class="datetag__src">' + escHtml(activeDate) + "</span>" +
        '<button type="button" class="tagchip__x is-on" data-cleardate title="取消日期筛选" aria-label="取消日期筛选">✕</button>' +
      "</span>" +
      '<span class="tagbanner__count">' + n + " 篇</span>" +
      '<button type="button" class="tagbanner__clear" data-cleardate>看全部</button>';
  }

  /* ---------- 管理员：新增 / 编辑文章（逻辑在 editor.js） ---------- */
  function openPostEditor(post, cat) {
    BlogEditor.postEditor(post, { cat: cat });
  }

  function refreshAll() {
    renderPills(); renderCats(); renderList(); renderTagList();
    for (var v in SECTIONS) renderSectionList(v);
    renderStats(); renderCalendar();
  }

  function addOrEdit() {
    // 列表 / 学习 / 生活 / 全部区块统一走这里
    document.addEventListener("click", function (e) {
      // 点文章下的标签 = 加入 / 取消该标签（在任何页面都生效）
      var tagBtn = e.target.closest ? e.target.closest("[data-tagsearch]") : null;
      if (tagBtn) {
        e.preventDefault();
        e.stopPropagation();
        toggleTag(tagBtn.getAttribute("data-tagsearch"));
        return;
      }
      // 标签 chip 右上角的 ✕：移除单个标签
      var rmBtn = e.target.closest ? e.target.closest("[data-rmtag]") : null;
      if (rmBtn) {
        e.preventDefault();
        var gone = rmBtn.getAttribute("data-rmtag");
        setTags(currentTags.filter(function (t) { return t !== gone; }));
        return;
      }
      // 「清除所有标签」
      var clearBtn = e.target.closest ? e.target.closest("[data-cleartag]") : null;
      if (clearBtn) { e.preventDefault(); askClearTags(); return; }

      // 「取消日期筛选」（提示条上的 ✕ / 看全部 / 空态按钮都走这里）
      var clearDate = e.target.closest ? e.target.closest("[data-cleardate]") : null;
      if (clearDate) { e.preventDefault(); setDateFilter(activeDate); return; }

      var editBtn = e.target.closest ? e.target.closest("[data-editpost]") : null;
      if (editBtn) {
        e.preventDefault();       // 卡片本身是链接，别跳走
        e.stopPropagation();
        if (!BlogAdmin.is()) { BlogAdmin.toast("需要管理模式"); return; }
        var slug = editBtn.getAttribute("data-editpost");
        var post = allPosts().filter(function (x) { return x.slug === slug; })[0];
        if (post) openPostEditor(post);
        return;
      }

      var addBtn = e.target.closest ? e.target.closest("[data-addcat]") : null;
      if (!addBtn) return;
      if (!BlogAdmin.is()) { BlogAdmin.toast("需要管理模式"); return; }
      var cat = addBtn.getAttribute("data-addcat");
      openPostEditor(null, cat === "全部" ? "随笔" : cat);
    });

    // 标签搜索框：回车或选中建议即「加入」一个标签
    var tagInput = $("tagSearch");
    if (tagInput) {
      function addFromInput() {
        var v = tagInput.value.trim();
        if (!v) return;
        // 支持一次输入多个：MLP 可视化
        v.split(/[\s,，、]+/).filter(Boolean).forEach(function (t) {
          if (currentTags.indexOf(t) < 0) currentTags.push(t);
        });
        tagInput.value = "";
        setTags(currentTags);
      }
      tagInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); addFromInput(); }
      });
      // datalist 选中（change）也触发
      tagInput.addEventListener("change", function () {
        if (tagInput.value.trim()) addFromInput();
      });
    }

    // 内容变化（保存 / 删除）后刷新所有区块
    document.addEventListener("content:change", refreshAll);
  }
  addOrEdit();

  function setFilter(cat) {
    current = cat;
    activeDate = null;                       // 点分类 = 退出日期筛选
    if (currentTags.length) setTags([]);     // 换分类时清掉标签检索
    renderPills();
    renderCats();
    renderList();
    renderCalendar();
  }

  pillsBox.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest(".pill") : null;
    if (btn) setFilter(btn.getAttribute("data-cat"));
  });

  $("catList").addEventListener("click", function (e) {
    var addBtn = e.target.closest ? e.target.closest("#catAddBtn") : null;
    if (addBtn) {
      if (!BlogAdmin.is()) { BlogAdmin.toast("需要管理模式（页脚「管理」）"); return; }
      askNewCat();
      return;
    }
    var delBtn = e.target.closest ? e.target.closest("[data-delcat]") : null;
    if (delBtn) {
      if (!BlogAdmin.is()) { BlogAdmin.toast("需要管理模式"); return; }
      askDelCat(delBtn.getAttribute("data-delcat"));
      return;
    }
    var btn = e.target.closest ? e.target.closest(".catrow") : null;
    if (!btn) return;
    setFilter(btn.getAttribute("data-cat"));
    if (currentView() !== "home") location.hash = "#home";
    else window.scrollTo({ top: 0, behavior: "smooth" });
  });

  renderPills();
  renderCats();
  renderList();
  renderTagList();

  /* ---------- 右侧：统计 ---------- */
  /* 「最近更新」取「内容的最新时间」：编辑/新增会写入 editedAt（毫秒），
     没有编辑记录的文章退回它的发布日 date。两者取最大。 */
  function editingTime(p) {
    if (p.editedAt) return Number(p.editedAt) || 0;
    if (p.date) return new Date(p.date + "T00:00:00").getTime();
    return 0;
  }

  function relativeFrom(ms) {
    if (!ms) return "—";
    var diff = Date.now() - ms;
    if (diff < 0) diff = 0;
    var days = Math.floor(diff / 86400000);
    if (days <= 0) {
      var mins = Math.floor(diff / 60000);
      if (mins < 1) return "刚刚";
      if (mins < 60) return mins + " 分钟前";
      return Math.floor(mins / 60) + " 小时前";
    }
    if (days === 1) return "昨天";
    if (days < 30) return days + " 天前";
    var d = new Date(ms);
    return (d.getMonth() + 1) + " 月 " + d.getDate() + " 日";
  }

  /* ---------- 访问数（已移除显示，保留清理逻辑，避免旧数据残留） ---------- */
  function dropLegacyVisits() {
    try {
      localStorage.removeItem("site:visits");
      sessionStorage.removeItem("site:visited");
    } catch (err) { /* 隐私模式忽略 */ }
  }
  dropLegacyVisits();

  function renderStats() {
    var posts = allPosts();
    var words = 0;
    posts.forEach(function (p) { words += wordCount(p); });
    var since = new Date(SITE.since + "T00:00:00");
    var days = Math.max(1, Math.floor((Date.now() - since.getTime()) / 86400000) + 1);

    // 最近更新 = 所有内容里最新的那一次（发布 or 编辑）
    var latestMs = 0;
    posts.forEach(function (p) { latestMs = Math.max(latestMs, editingTime(p)); });
    // 番剧 / 游戏 / 动态 的改动也算更新
    try {
      var media = (typeof BlogEditor !== "undefined") ? BlogEditor.mergedMedia() : [];
      media.forEach(function (m) {
        if (m.editedAt) latestMs = Math.max(latestMs, Number(m.editedAt) || 0);
      });
    } catch (err) { /* ignore */ }
    var rel = relativeFrom(latestMs);

    // 内容数 = 文章 + 番剧/游戏
    var extra = 0;
    try {
      extra = ((typeof BlogEditor !== "undefined") ? BlogEditor.mergedMedia() : []).length;
    } catch (err) { extra = 0; }

    var sp = $("statPosts"); if (sp) sp.textContent = String(posts.length + extra);
    var sw = $("statWords"); if (sw) sw.textContent = words >= 10000 ? (words / 10000).toFixed(1) + " 万" : String(words);
    var sd = $("statDays"); if (sd) sd.textContent = String(days);
    var su = $("statUpdate");
    if (su) {
      su.textContent = rel;
      su.title = latestMs ? new Date(latestMs).toLocaleString("zh-CN") : "暂无内容";
    }
  }
  renderStats();

  // 管理员登录 / 退出后重算（管理员访问不计数）
  document.addEventListener("admin:change", renderStats);

  /* ---------- 右侧：日历 ----------
     三种状态（互不冲突）：
       · 有文章的日期  → 灰色小方块（可点）
       · 正在筛选的日期 → 黑色方块（"点亮"），再点一次取消
       · 今天          → 描边圈，始终保留，不会被筛选状态覆盖
     点某天 = 只看当天的文章；和分类、标签三者可以叠加。                */
  var calTitle = $("calTitle");
  var calGrid = $("calGrid");
  var today = new Date();
  var calY = today.getFullYear();
  var calM = today.getMonth();   // 0-based
  var activeDate = null;         // "YYYY-MM-DD" 或 null

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  /* 每个日期有几篇文章：{ "2026-11-14": 2, ... } */
  function dateCounts() {
    var map = {};
    allPosts().forEach(function (p) {
      var d = String(p.date || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
      map[d] = (map[d] || 0) + 1;
    });
    return map;
  }

  function renderCalendar() {
    calTitle.textContent = calY + "年" + (calM + 1) + "月";
    var marks = dateCounts();
    var html = "";
    ["一", "二", "三", "四", "五", "六", "日"].forEach(function (w) {
      html += '<span class="cal__wd">' + w + "</span>";
    });
    var startDow = (new Date(calY, calM, 1).getDay() + 6) % 7;         // 周一=0
    var days = new Date(calY, calM + 1, 0).getDate();
    var prevDays = new Date(calY, calM, 0).getDate();
    var cells = [];
    for (var p = startDow - 1; p >= 0; p--) cells.push({ d: prevDays - p, out: true });
    for (var d = 1; d <= days; d++) cells.push({ d: d, out: false });
    while (cells.length % 7 !== 0 || cells.length < 35) {
      cells.push({ d: cells.length - startDow - days + 1, out: true });
      if (cells.length >= 42) break;
    }
    cells.forEach(function (c) {
      var isToday = !c.out && c.d === today.getDate() && calM === today.getMonth() && calY === today.getFullYear();
      if (c.out) {
        html += '<span class="cal__d is-out">' + c.d + "</span>";
        return;
      }
      var key = calY + "-" + pad2(calM + 1) + "-" + pad2(c.d);
      var n = marks[key] || 0;
      var on = activeDate === key;
      var cls = "cal__d" + (n ? " has-post" : "") + (on ? " is-active" : "") + (isToday ? " is-today" : "");
      var tip = n ? key + " · " + n + " 篇" + (on ? "（点击取消筛选）" : "（点击只看这天）") : key;

      html += n
        ? '<button type="button" class="' + cls + '" data-day="' + key + '" title="' + tip +
            '" aria-pressed="' + (on ? "true" : "false") + '">' + c.d +
            '<i class="cal__dot" aria-hidden="true"></i></button>'
        : '<span class="' + cls + '" title="' + tip + '">' + c.d + "</span>";
    });
    calGrid.innerHTML = html;
  }

  /* 点日历上的日期：点亮 / 取消点亮 */
  function setDateFilter(date) {
    activeDate = (activeDate === date) ? null : date;
    if (activeDate) {
      current = "全部";                       // 日期筛选和分类筛选互斥，避免"筛出 0 篇"的困惑
      if (currentTags.length) setTags([]);    // 也不保留标签，规则简单些
    }
    renderPills(); renderCats(); renderList(); renderCalendar();
    if (currentView() !== "home") location.hash = "#home";
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  calGrid.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-day]") : null;
    if (!b) return;
    setDateFilter(b.getAttribute("data-day"));
  });

  $("calPrev").addEventListener("click", function () {
    calM--; if (calM < 0) { calM = 11; calY--; }
    renderCalendar();
  });
  $("calNext").addEventListener("click", function () {
    calM++; if (calM > 11) { calM = 0; calY++; }
    renderCalendar();
  });
  renderCalendar();
})();
