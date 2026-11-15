/* =========================================================
   editor.js —— 文章 / 番剧 / 游戏的「编辑已有内容」
   ----------------------------------------------------------
   数据保存在本机浏览器：
     site:posts   —— 新增与修改过的文章（键为 slug）
     site:media   —— 新增与修改过的番剧 / 游戏（键为 id）
     site:deleted —— 被删掉的 slug / id（避免原始数据又冒出来）
   页脚「导出内容」会把这些改动变成可直接粘贴进 posts.js 的代码。
   ========================================================= */
(function () {
  "use strict";

  var POSTS_KEY = "site:posts";
  var MEDIA_KEY = "site:media";
  var DEL_KEY = "site:deleted";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  /* ---------- 删除记录 ---------- */
  function deleted() {
    return BlogAdmin.load(DEL_KEY, { posts: [], media: [] });
  }
  function markDeleted(kind, key) {
    var d = deleted();
    if (d[kind].indexOf(key) < 0) d[kind].push(key);
    BlogAdmin.store(DEL_KEY, d);
  }

  /* ---------- 文章：原始 + 本地改动 ---------- */
  function localPosts() { return BlogAdmin.load(POSTS_KEY, []); }

  function findOriginalPost(slug) {
    for (var i = 0; i < POSTS.length; i++) if (POSTS[i].slug === slug) return POSTS[i];
    return null;
  }

  /* 合并后的文章列表。
     ---------------------------------------------------------
     规则（重要）：以 posts.js 为"唯一真相来源"。
       · 本机没有副本的文章        → 直接用 posts.js 里的
       · 本机有副本且标记了 dirty  → 用本机副本（你在网页上改过、还没导出）
       · 本机有副本但没标 dirty    → 用 posts.js 里的（你已在 VS Code 里改过并
                                     导出替换过，本机旧副本不再生效）
     这样在 VS Code 里改标题/日期/分类，刷新后一定生效，不会被浏览器旧数据盖住。 */
  function mergedPosts() {
    var loc = localPosts();
    var del = deleted().posts;
    var map = {}, order = [];

    POSTS.forEach(function (p) {
      if (del.indexOf(p.slug) >= 0) return;
      order.push(p.slug);
      map[p.slug] = p;
    });

    loc.forEach(function (p) {
      if (del.indexOf(p.slug) >= 0) return;
      var isNewPost = !findOriginalPost(p.slug);      // 网页上新增、posts.js 里没有
      if (isNewPost || p.dirty) {
        if (!map[p.slug]) order.unshift(p.slug);      // 新增的排前面
        map[p.slug] = p;
      }
    });

    return order.map(function (s) { return map[s]; });
  }

  /* 保存一篇：打上 dirty 标记，表示"这是一份还没导出回 posts.js 的本地修改" */
  function savePost(post) {
    var copy = JSON.parse(JSON.stringify(post));
    copy.dirty = true;
    var loc = localPosts().filter(function (p) { return p.slug !== copy.slug; });
    loc.unshift(copy);
    BlogAdmin.store(POSTS_KEY, loc);
  }

  function deletePost(slug) {
    BlogAdmin.store(POSTS_KEY, localPosts().filter(function (p) { return p.slug !== slug; }));
    if (findOriginalPost(slug)) markDeleted("posts", slug);
  }

  /* ---------- 番剧 / 游戏合并 ----------
     优先用本机改动；本机没有就退回 posts.js 的 MEDIA。
     注意：不要就地修改 MEDIA（那会让「有没有本机改动」的判断失效）。 */
  function mergedMedia() {
    var loc = BlogAdmin.load(MEDIA_KEY, null);
    var del = deleted().media;
    var base = (loc || MEDIA).filter(function (m) { return del.indexOf(m.id) < 0; });
    return base;
  }

  function saveMediaItem(item) {
    var list = BlogAdmin.load(MEDIA_KEY, null) || JSON.parse(JSON.stringify(MEDIA));
    list = list.filter(function (x) { return x.id !== item.id; });
    // 位置：原来在 MEDIA 里的话，保持它原来的次序，避免编辑后卡片跑到最后
    var origIndex = -1;
    for (var i = 0; i < MEDIA.length; i++) if (MEDIA[i].id === item.id) { origIndex = i; break; }
    if (origIndex >= 0) {
      list.splice(Math.min(origIndex, list.length), 0, item);
    } else {
      list.unshift(item);
    }
    BlogAdmin.store(MEDIA_KEY, list);
  }

  /* 删除一条番剧 / 游戏：从本机列表移除，并记下原始 id 免得又冒出来 */
  function deleteMedia(id) {
    var list = (BlogAdmin.load(MEDIA_KEY, null) || JSON.parse(JSON.stringify(MEDIA)))
      .filter(function (x) { return x.id !== id; });
    BlogAdmin.store(MEDIA_KEY, list);
    markDeleted("media", id);
  }

  /* ---------- 弹层骨架 ---------- */
  function openModal(html, onReady) {
    var ov = document.createElement("div");
    ov.className = "player form";
    ov.innerHTML = '<div class="player__box form__box form__box--wide">' + html + "</div>";
    document.body.appendChild(ov);
    requestAnimationFrame(function () { ov.classList.add("is-in"); });

    function close() { ov.remove(); }
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    var cancel = ov.querySelector("[data-cancel]");
    if (cancel) cancel.addEventListener("click", close);
    onReady(ov, close);
    return ov;
  }

  function field(label, inner) {
    return '<label class="form__row"><span>' + label + "</span>" + inner + "</label>";
  }

  /* 分类下拉框：选项 = 全部分类（帖子用过的 + 区块里的），当前值不在列表时会补进去，
     这样老文章的"机器学习""建站"等自定义分类也不会丢 */
  function catSelect(current) {
    var cur = current || "随笔";
    var seen = {}, list = [];
    function push(c) {
      c = String(c || "").trim();
      if (c && !seen[c] && c !== "全部") { seen[c] = 1; list.push(c); }
    }
    // 统一走 cats.js：文章用过的 + 网页上新建的 + posts.js 声明的
    if (window.BlogCats) {
      BlogCats.all().forEach(push);
    } else {
      (typeof POSTS !== "undefined" ? POSTS : []).forEach(function (p) { push(p.cat); });
      if (typeof SECTIONS !== "undefined") {
        Object.keys(SECTIONS).forEach(function (k) {
          if (k !== "moments" && k !== "anime" && k !== "game" && k !== "board") push(SECTIONS[k].name);
        });
      }
    }
    push(cur);
    push("随笔");

    return '<select name="cat" class="form__select">' +
      list.map(function (c) {
        return '<option value="' + esc(c) + '"' + (c === cur ? " selected" : "") + ">" + esc(c) + "</option>";
      }).join("") +
      "</select>";
  }

  /* 站点里出现过的所有标签（给编辑器的「已有标签」建议用） */
  function allTagOptions() {
    var seen = {}, out = [];
    ["MLP", "反向传播", "可视化", "机器学习"].forEach(function (t) {
      if (!seen[t]) { seen[t] = 1; out.push(t); }
    });
    mergedPosts().forEach(function (p) {
      (p.tags || []).forEach(function (t) {
        if (t && !seen[t]) { seen[t] = 1; out.push(t); }
      });
    });
    return out;
  }

  /* =========================================================
     文章编辑器
     post 为 null 时是新建；cat 为当前区块名
     ========================================================= */
  function postEditor(post, options) {
    options = options || {};
    var isNew = !post;
    var isOriginal = !isNew && !!findOriginalPost(post.slug);
    var p = post ? JSON.parse(JSON.stringify(post)) : {
      slug: "local-" + Date.now(),
      title: "", date: today(), cat: options.cat || "随笔",
      tags: [], excerpt: "", body: []
    };

    var html =
      '<h3 class="form__title">' + (isNew ? "添加内容" : "编辑内容") +
        (options.cat ? "（" + esc(options.cat) + "）" : "") + "</h3>" +
      (isOriginal ? '<p class="form__note">这是 posts.js 里的原始文章。保存后会在本机生成一份修改版，' +
        "原始数据不会被破坏；想彻底生效请用页脚「导出内容」。</p>" : "") +
      field("标题", '<input name="title" value="' + esc(p.title) + '">') +
      field("日期",
        '<input class="input--readonly" value="' + esc(p.date || today()) + '" readonly tabindex="-1">') +
      field("分类", catSelect(p.cat)) +
      field("标签（回车或点「＋」添加，可多个）",
        '<div class="tagedit">' +
          '<div class="tagedit__chips"></div>' +
          '<div class="tagedit__addrow">' +
            '<input class="tagedit__input" placeholder="输入标签后回车，如：MLP">' +
            '<button type="button" class="tagedit__add">＋ 添加</button>' +
          "</div>" +
        "</div>" +
        (allTagOptions().length
          ? '<div class="tagedit__hint">已有标签：' + allTagOptions().slice(0, 14).map(function (t) {
              return '<button type="button" class="tagedit__sug" data-sug="' + esc(t) + '">#' + esc(t) + "</button>";
            }).join("") + "</div>"
          : "")) +
      field("摘要（列表里显示的两行）",
        '<input name="excerpt" value="' + esc(p.excerpt) + '">') +
      '<div class="form__row"><span>图片 / 视频附件</span>' +
        '<div class="postmedia"></div>' +
        '<div class="moment__addrow">' +
          '<label class="mini-btn">＋ 上传本地文件<input type="file" accept="image/*,video/*" multiple hidden></label>' +
          '<input class="moment__url" placeholder="或粘贴图片/视频网址，回车添加">' +
        "</div>" +
        '<p class="moment__tip">本机文件会转存到浏览器（建议单个小于 3MB，过大存不下）；要长期展示请把文件放进 images/ 后填网址，或导出前先用图片床。</p>' +
      "</div>" +
      field("正文",
        '<textarea name="body" rows="12" placeholder="空一行 = 分段；写 HTML 标签也可以（如 &lt;b&gt; 粗体）"></textarea>') +
      '<div class="form__ops">' +
        '<button type="button" data-ok>' + (isNew ? "发布" : "保存") + "</button>" +
        (isNew ? "" : '<button type="button" class="form__danger" data-del>删除</button>') +
        '<button type="button" data-cancel>取消</button>' +
      "</div>";

    openModal(html, function (ov, close) {
      // 正文：数组 → 纯文本；编辑时保留 HTML 标签，分段靠空行
      var ta = ov.querySelector('[name="body"]');
      ta.value = (p.body || []).join("\n\n")
        .replace(/<\/(p|h1|h2|h3|li|pre|blockquote)>/gi, "$&\n")
        .replace(/<li>/gi, "- ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      ta.style.cssText = "padding:10px 12px;border-radius:10px;border:1px solid var(--line);" +
        "background:var(--bg);color:var(--text);font:inherit;font-size:14px;resize:vertical;outline:none";

      /* ----- 标签：chip 化增删 ----- */
      p.tags = (p.tags || []).slice();
      var tagWrap = ov.querySelector(".tagedit__chips");
      var tagInput = ov.querySelector(".tagedit__input");

      function drawTags() {
        tagWrap.innerHTML = p.tags.length
          ? p.tags.map(function (t, i) {
              return '<span class="tagchip tagchip--edit">' +
                '<span class="tagchip__text">#' + esc(t) + "</span>" +
                '<button type="button" class="tagchip__x is-on" data-rmtag="' + i +
                  '" title="移除这个标签" aria-label="移除标签">✕</button>' +
                "</span>";
            }).join("")
          : '<span class="tagedit__empty">还没有标签</span>';
      }
      drawTags();

      function addTags(raw) {
        String(raw || "").split(/[\s,，、]+/).filter(Boolean).forEach(function (t) {
          if (p.tags.indexOf(t) < 0) p.tags.push(t);
        });
        drawTags();
      }

      tagWrap.addEventListener("click", function (e) {
        var b = e.target.closest ? e.target.closest("[data-rmtag]") : null;
        if (!b) return;
        p.tags.splice(Number(b.getAttribute("data-rmtag")), 1);
        drawTags();
      });
      tagInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); addTags(tagInput.value); tagInput.value = ""; }
        if (e.key === "Backspace" && !tagInput.value && p.tags.length) {
          p.tags.pop(); drawTags();           // 空输入时退格 = 删掉最后一个标签
        }
      });
      tagInput.addEventListener("blur", function () {
        if (tagInput.value.trim()) { addTags(tagInput.value); tagInput.value = ""; }
      });
      var tagAddBtn = ov.querySelector(".tagedit__add");
      if (tagAddBtn) tagAddBtn.addEventListener("click", function () {
        addTags(tagInput.value); tagInput.value = ""; tagInput.focus();
      });
      Array.prototype.forEach.call(ov.querySelectorAll("[data-sug]"), function (b) {
        b.addEventListener("click", function () {
          addTags(b.getAttribute("data-sug"));
        });
      });

      /* ----- 附件（图片/视频）：与动态区块同一套交互 ----- */
      p.media = p.media || [];
      var mediaBox = ov.querySelector(".postmedia");
      function drawMedia() {
        mediaBox.innerHTML = p.media.map(function (x, i) {
          var thumb = x.type === "video"
            ? '<span class="moment__mthumb">🎬 视频</span>'
            : '<img src="' + esc(x.src) + '" alt="">';
          return '<div class="moment__mitem">' + thumb +
            '<button type="button" data-rm="' + i + '">✕</button></div>';
        }).join("");
      }
      drawMedia();
      mediaBox.addEventListener("click", function (e) {
        var b = e.target.closest ? e.target.closest("[data-rm]") : null;
        if (!b) return;
        p.media.splice(Number(b.getAttribute("data-rm")), 1);
        drawMedia();
      });
      var fileInput = ov.querySelector('input[type="file"]');
      fileInput.addEventListener("change", function () {
        var files = Array.prototype.slice.call(fileInput.files || []);
        var pending = files.length;
        if (!pending) return;
        files.forEach(function (f) {
          var r = new FileReader();
          r.onload = function () {
            p.media.push({ type: /^video\//.test(f.type) ? "video" : "img", src: r.result });
            if (--pending === 0) { drawMedia(); fileInput.value = ""; }
          };
          r.readAsDataURL(f);
        });
      });
      var urlInput = ov.querySelector(".moment__url");
      urlInput.addEventListener("keydown", function (e) {
        if (e.key !== "Enter" || !urlInput.value.trim()) return;
        var v = urlInput.value.trim();
        p.media.push({ type: /\.(mp4|webm|ogg)(\?|$)/i.test(v) ? "video" : "img", src: v });
        urlInput.value = "";
        drawMedia();
        e.preventDefault();
      });

      ov.querySelector("[data-ok]").addEventListener("click", function () {
        var get = function (n) { return ov.querySelector('[name="' + n + '"]').value.trim(); };
        var title = get("title");
        if (!title) { BlogAdmin.toast("至少写个标题"); return; }

        // 正文：纯文本段落 → <p>，含标签的原样保留
        var raw = ta.value.trim();
        var body = raw
          ? raw.split(/\n\s*\n/).filter(function (s) { return s.trim(); }).map(function (s) {
              s = s.trim();
              if (/^\s*</.test(s)) return s;                        // 已经是 HTML
              return "<p>" + s.replace(/&/g, "&amp;").replace(/</g, "&lt;")
                .replace(/\n/g, "<br>") + "</p>";
            })
          : ["<p>（暂无正文）</p>"];

        // 标签：chip 里已收好的 + 输入框里没来得及添加的
        if (tagInput.value.trim()) { addTags(tagInput.value); tagInput.value = ""; }
        var tags = p.tags.slice();
        var excerpt = get("excerpt") ||
          body.join("").replace(/<[^>]+>/g, "").slice(0, 60);

        p.title = title;
        p.date = p.date || today();       // 日期固定，不允许改
        p.cat = get("cat") || p.cat;      // 分类可在下拉框里改
        p.tags = tags;
        p.excerpt = excerpt;
        p.body = body;
        p.media = p.media || [];
        p.editedAt = Date.now();          // 最近编辑时间：统计里的「最近更新」用它

        try {
          savePost(p);
        } catch (err) {
          BlogAdmin.toast("存不下了：附件太大，试试小一点的文件或改用网址");
          return;
        }
        close();
        if (options.onSaved) options.onSaved(p);
        document.dispatchEvent(new CustomEvent("content:change"));
        BlogAdmin.toast(isNew ? "已添加（本机），发布到全网请用页脚「导出内容」" : "已保存修改");
      });

      var del = ov.querySelector("[data-del]");
      if (del) del.addEventListener("click", function () {
        if (!window.confirm("删除《" + p.title + "》？此操作仅影响本机，导出后才会真正消失。")) return;
        deletePost(p.slug);
        close();
        document.dispatchEvent(new CustomEvent("content:change"));
        BlogAdmin.toast("已删除（本机），发布到全网请用页脚「导出内容」");
      });
    });
  }

  /* =========================================================
     番剧 / 游戏编辑器（复用 media.js 的 data-act 约定）
     ========================================================= */
  function mediaEditor(item, type, onDone) {
    var isNew = !item;
    var m = item ? JSON.parse(JSON.stringify(item)) : {
      id: type.slice(0, 1) + Date.now(), type: type, title: "",
      cover: "", rating: 8, status: "", desc: "", video: ""
    };

    var html =
      '<h3 class="form__title">' + (isNew ? "添加" : "编辑") +
        (type === "anime" ? "番剧" : "游戏") + "</h3>" +
      field("标题", '<input name="title" value="' + esc(m.title) + '">') +
      field("封面图地址（可留空）", '<input name="cover" value="' + esc(m.cover) + '" placeholder="images/xxx.jpg 或 https://...">') +
      field("评分（0 ~ 10）", '<input name="rating" type="number" min="0" max="10" step="0.1" value="' + esc(m.rating) + '">') +
      field("状态", '<input name="status" value="' + esc(m.status) + '" placeholder="在看 / 看完 / 排队">') +
      field("一句话介绍", '<input name="desc" value="' + esc(m.desc) + '">') +
      field("视频地址（可留空）", '<input name="video" value="' + esc(m.video) + '" placeholder="B站嵌入链接 或 videos/xxx.mp4">') +
      '<div class="form__ops">' +
        '<button type="button" data-ok>' + (isNew ? "添加" : "保存") + "</button>" +
        (isNew ? "" : '<button type="button" class="form__danger" data-del>删除</button>') +
        '<button type="button" data-cancel>取消</button>' +
      "</div>";

    openModal(html, function (ov, close) {
      ov.querySelector("[data-ok]").addEventListener("click", function () {
        var get = function (n) { return ov.querySelector('[name="' + n + '"]').value.trim(); };
        if (!get("title")) { BlogAdmin.toast("至少写个标题"); return; }
        m.title = get("title");
        m.cover = get("cover");
        m.rating = Math.max(0, Math.min(10, Number(get("rating")) || 0));
        m.status = get("status");
        m.desc = get("desc");
        m.video = get("video");
        m.editedAt = Date.now();

        saveMediaItem(m);
        close();
        if (onDone) onDone();
        document.dispatchEvent(new CustomEvent("content:change"));
        BlogAdmin.toast("已保存（本机），发布到全网请用页脚「导出内容」");
      });

      var del = ov.querySelector("[data-del]");
      if (del) del.addEventListener("click", function () {
        if (!window.confirm("删除《" + m.title + "》？")) return;
        var list = (BlogAdmin.load(MEDIA_KEY, null) || JSON.parse(JSON.stringify(MEDIA)))
          .filter(function (x) { return x.id !== m.id; });
        BlogAdmin.store(MEDIA_KEY, list);
        markDeleted("media", m.id);
        close();
        if (onDone) onDone();
        document.dispatchEvent(new CustomEvent("content:change"));
        BlogAdmin.toast("已删除（本机），发布到全网请用页脚「导出内容」");
      });
    });
  }

  /* =========================================================
     导出：把本机改动变成可粘贴的 posts.js 片段
     ========================================================= */
  function exportSnippet() {
    var moments = BlogAdmin.load("site:moments", typeof MOMENTS !== "undefined" ? MOMENTS : []);
    var out = [];
    out.push("/* ============================================================");
    out.push("   从网页「导出内容」得到的代码（" + new Date().toLocaleString("zh-CN") + "）");
    out.push("   用法：整段复制 → 打开 js/posts.js → 用这些 const 替换掉文件里");
    out.push("        同名的 const（NOTICE / CATS / POSTS / MEDIA / MOMENTS）→ 保存 → 推送到 GitHub。");
    out.push("   注意：等号后面的整段内容替换，别只粘一半；文件里其它部分（SITE、ADMIN、SCENES…）保持不动。");
    out.push("   ============================================================ */");
    out.push("");
    out.push("const NOTICE = " + JSON.stringify(
      BlogAdmin.load("site:notice", typeof NOTICE !== "undefined" ? NOTICE : ""), null, 2) + ";");
    out.push("");

    // 只有分类：在网页侧栏「＋ 新建分类」建的那些（还没有文章的空分类）
    var emptyCats = [];
    if (window.BlogCats) {
      var used = {};
      mergedPosts().forEach(function (p) { used[p.cat] = 1; });
      BlogCats.manual().forEach(function (c) {
        if (!used[c] && emptyCats.indexOf(c) < 0) emptyCats.push(c);
      });
    }
    if (emptyCats.length) {
      out.push("/* 侧栏里那些还没有文章的分类（网页上新建的） */");
      out.push("const CATS = " + JSON.stringify(emptyCats, null, 2) + ";");
      out.push("");
    }

    // 文章：用合并后的完整列表（含修改与新增，已排除删除）
    out.push("/* 完整文章列表（含你在网页上做的修改） */");
    out.push("const POSTS = " + JSON.stringify(mergedPosts(), null, 2) + ";");
    out.push("");

    // 番剧 / 游戏
    out.push("/* 番剧 / 游戏清单 */");
    out.push("const MEDIA = " + JSON.stringify(mergedMedia(), null, 2) + ";");
    out.push("");

    // 动态
    out.push("/* 动态（含本机发布的所有动态） */");
    out.push("const MOMENTS = " + JSON.stringify(moments, null, 2) + ";");
    out.push("");

    // 体积提示：图片/视频附件会变成超长 base64，直接粘进帖子会让文件巨大
    var big = [];
    mergedPosts().forEach(function (p) {
      (p.media || []).forEach(function (m) {
        if (m && typeof m.src === "string" && m.src.slice(0, 5) === "data:") big.push("文章《" + p.title + "》");
      });
    });
    moments.forEach(function (m) {
      (m.media || []).forEach(function (x) {
        if (x && typeof x.src === "string" && x.src.slice(0, 5) === "data:") big.push("一条动态");
      });
    });
    mergedMedia().forEach(function (x) {
      if (x && typeof x.cover === "string" && x.cover.slice(0, 5) === "data:") big.push("番剧/游戏《" + x.title + "》");
    });
    if (big.length) {
      out.push("/* 提醒：上面有 " + big.length + " 处附件是「本机上上传」的内嵌数据（base64），");
      out.push("   粘进 posts.js 会让文件变得很大。建议把图片放进 images/ 文件夹，");
      out.push("   然后在编辑器里把附件改成 images/xxx.jpg 这样的相对路径再导出。 */");
      out.push("");
    }

    // 清空本机改动的方法
    out.push("/* 粘贴并推送之后，本机的临时改动就可以清掉了：");
    out.push("   打开网站 → 按 F12 → 控制台(Console) → 粘贴执行下面这行 → 回车");
    out.push('   ["site:posts","site:media","site:deleted"].forEach(k=>localStorage.removeItem(k)); */');
    out.push("/* 清掉后页面显示的就是 posts.js 里的内容（也就是你刚推上去的版本）。 */");

    return out.join("\n");
  }

  window.BlogEditor = {
    postEditor: postEditor,
    mediaEditor: mediaEditor,
    mergedPosts: mergedPosts,
    mergedMedia: mergedMedia,
    saveMediaItem: saveMediaItem,
    deleteMedia: deleteMedia,
    deletePost: deletePost,
    markDeleted: markDeleted,
    exportSnippet: exportSnippet,
    today: today
  };
})();
