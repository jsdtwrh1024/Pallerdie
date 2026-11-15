/* =========================================================
   board.js —— 留言板（首页 + 文章页通用组件）
   访客可以：留言、点赞、回复
   管理模式（页脚「管理」）下可以：删除任意留言
   ----------------------------------------------------------
   默认留言存在每位访问者自己的浏览器里，适合演示和自用。
   想让全站共用：在 posts.js 里配置 SITE_GISCUS（giscus.app），
   配置后这里自动换成 GitHub Discussions 评论系统。
   ========================================================= */
(function () {
  "use strict";

  var KEY = "site:board";

  function mount(container, threadId, title) {
    if (!container) return;
    if (SITE_GISCUS) { giscus(container); return; }
    local(container, threadId, title);
  }

  /* ---------- 方案一：giscus（全站共享，需要 GitHub 登录） ---------- */
  function giscus(container) {
    var s = document.createElement("script");
    s.src = "https://giscus.app/client.js";
    s.setAttribute("data-repo", SITE_GISCUS.repo);
    s.setAttribute("data-repo-id", SITE_GISCUS.repoId);
    s.setAttribute("data-category", SITE_GISCUS.category);
    s.setAttribute("data-category-id", SITE_GISCUS.categoryId);
    s.setAttribute("data-mapping", "pathname");
    s.setAttribute("data-strict", "0");
    s.setAttribute("data-reactions-enabled", "1");
    s.setAttribute("data-emit-metadata", "0");
    s.setAttribute("data-input-position", "top");
    s.setAttribute("data-theme", "light");
    s.setAttribute("data-lang", "zh-CN");
    s.setAttribute("crossorigin", "anonymous");
    s.async = true;
    container.appendChild(s);
  }

  /* ---------- 方案二：本地留言板 ---------- */
  function loadAll() {
    return BlogAdmin.load(KEY, {});
  }

  function saveAll(all) {
    BlogAdmin.store(KEY, all);
  }

  function loadThread(id) {
    var all = loadAll();
    return all[id] || [];
  }

  function saveThread(id, list) {
    var all = loadAll();
    all[id] = list;
    saveAll(all);
  }

  function fmtTime(ts) {
    var d = new Date(ts);
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return (d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function local(container, threadId, title) {
    var likedKey = "site:board:liked";
    var liked = {};
    try { liked = JSON.parse(localStorage.getItem(likedKey) || "{}"); } catch (e) {}

    container.innerHTML =
      '<div class="board__form">' +
      '<input class="board__name" maxlength="20" placeholder="昵称（留空则为匿名）">' +
      '<textarea class="board__input" rows="3" maxlength="500" placeholder="' + (title ? "说点什么…" : "留下你的脚印…") + '"></textarea>' +
      '<div class="board__ops"><span class="board__hint">留言保存在你自己的浏览器里</span>' +
      '<button type="button" class="board__send">发布</button></div></div>' +
      '<div class="board__list"></div>';

    var nameInput = container.querySelector(".board__name");
    var input = container.querySelector(".board__input");
    var send = container.querySelector(".board__send");
    var list = container.querySelector(".board__list");

    // 昵称框永远空着打开（placeholder 当提示）；
    // 旧版本存过「你的名字」这类占位字，顺手清掉，别再冒出来
    try {
      var lastName = localStorage.getItem("site:board:name");
      if (!lastName || lastName === "路人" || lastName === "你的名字") {
        localStorage.removeItem("site:board:name");
      }
    } catch (e) {}

    function nickname() {
      var n = nameInput.value.trim();
      if (n === "你的名字") n = "";          // 防御：就算被填了占位字也当没填
      try {
        if (n) localStorage.setItem("site:board:name", n);
        else localStorage.removeItem("site:board:name");
      } catch (e) {}
      return n;   // 允许为空字符串
    }

    /* 名字为空时显示成"匿名"样式（不显示字母头像，也不占位） */
    function nameHtml(n) {
      return n ? "<b>" + esc(n) + "</b>" : '<b class="msg__anon">匿名</b>';
    }

    function render() {
      var msgs = loadThread(threadId);
      if (!msgs.length) {
        list.innerHTML = '<p class="empty">还没有留言，来做第一个吧。</p>';
        return;
      }
      list.innerHTML = msgs.map(function (m) {
        var likedNow = !!liked[m.id];
        var replies = (m.replies || []).map(function (r) {
          return '<div class="reply">' + nameHtml(r.name) + "<span>" + esc(r.text) + "</span>" +
            '<time>' + fmtTime(r.time) + "</time></div>";
        }).join("");
        return '<div class="msg" data-id="' + m.id + '">' +
          (m.name ? '<span class="msg__ava">' + esc(m.name.slice(0, 1)) + "</span>"
                  : '<span class="msg__ava msg__ava--anon">·</span>') +
          '<div class="msg__body">' +
            '<div class="msg__head">' + nameHtml(m.name) + "<time>" + fmtTime(m.time) + "</time></div>" +
            '<p class="msg__text">' + esc(m.text) + "</p>" +
            '<div class="msg__ops">' +
              '<button type="button" data-op="like" class="' + (likedNow ? "is-liked" : "") + '">♥ <i>' + (m.likes || 0) + "</i></button>" +
              '<button type="button" data-op="reply">回复</button>' +
              '<button type="button" data-op="del" class="admin-only">删除</button>' +
            "</div>" +
            (replies ? '<div class="msg__replies">' + replies + "</div>" : "") +
            '<div class="msg__replybox" hidden><input maxlength="100" placeholder="回复…"><button type="button" data-op="send">发送</button></div>' +
          "</div></div>";
      }).join("");
    }

    send.addEventListener("click", function () {
      var text = input.value.trim();
      if (!text) { BlogAdmin.toast("先写点内容再发布"); return; }
      var msgs = loadThread(threadId);
      msgs.unshift({ id: "m" + Date.now(), name: nickname(), text: text, time: Date.now(), likes: 0, replies: [] });
      saveThread(threadId, msgs);
      input.value = "";
      nameInput.value = "";      // 昵称也清空：每次打开都是空档，想署名再填
      render();
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send.click();
    });

    list.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest("[data-op]") : null;
      if (!btn) return;
      var box = btn.closest(".msg");
      var id = box.getAttribute("data-id");
      var msgs = loadThread(threadId);
      var msg = null;
      for (var i = 0; i < msgs.length; i++) if (msgs[i].id === id) { msg = msgs[i]; break; }
      if (!msg) return;
      var op = btn.getAttribute("data-op");

      if (op === "like") {
        if (liked[id]) { BlogAdmin.toast("已经赞过了"); return; }
        msg.likes = (msg.likes || 0) + 1;
        liked[id] = 1;
        try { localStorage.setItem(likedKey, JSON.stringify(liked)); } catch (e2) {}
        saveThread(threadId, msgs);
        render();
      } else if (op === "reply") {
        var rb = box.querySelector(".msg__replybox");
        rb.hidden = !rb.hidden;
        if (!rb.hidden) rb.querySelector("input").focus();
      } else if (op === "send") {
        var text = btn.previousElementSibling.value.trim();
        if (!text) return;
        msg.replies = msg.replies || [];
        msg.replies.push({ name: nickname(), text: text, time: Date.now() });
        saveThread(threadId, msgs);
        render();
      } else if (op === "del") {
        if (!BlogAdmin.is()) { BlogAdmin.toast("需要管理模式"); return; }
        if (window.confirm("删除这条留言？")) {
          saveThread(threadId, msgs.filter(function (x) { return x.id !== id; }));
          render();
        }
      }
    });

    render();
  }

  window.BlogBoard = { mount: mount };
})();
