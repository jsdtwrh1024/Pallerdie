/* =========================================================
   media.js —— 番剧区 & 游戏区
   数据来自 posts.js 的 MEDIA；管理模式下可增删改，改动存本机，
   页脚「导出内容」可把改动变成粘贴回 posts.js 的代码。
   ========================================================= */
(function () {
  "use strict";

  function getMedia() {
    // 编辑 / 删除逻辑统一在 editor.js，这里只取合并后的结果
    if (window.BlogEditor) return BlogEditor.mergedMedia();
    return BlogAdmin.load("site:media", MEDIA);
  }

  function itemById(id) {
    return getMedia().filter(function (m) { return m.id === id; })[0] || null;
  }

  function coverHtml(m) {
    if (m.cover) {
      return '<img class="mcard__img" src="' + m.cover + '" alt="' + m.title + '" loading="lazy">';
    }
    return '<span class="mcard__ph">' + m.title.slice(0, 1) + "</span>";
  }

  function card(m) {
    // 编辑入口只留封面上那个角标，避免和底部按钮重复
    var edit =
      '<div class="mcard__ops admin-only">' +
      '<button type="button" data-act="del" data-id="' + m.id + '">删除</button>' +
      "</div>";
    var badge =
      '<button type="button" class="mcard__fix admin-only" data-act="edit" data-id="' + m.id + '" title="编辑">✎</button>';
    return '<div class="mcard" data-id="' + m.id + '">' +
      badge +
      '<button type="button" class="mcard__cover" data-act="open" data-id="' + m.id + '" aria-label="打开 ' + m.title + '">' +
        coverHtml(m) +
        '<b class="mcard__rating">★ ' + m.rating + "</b>" +
      "</button>" +
      '<h3 class="mcard__title">' + m.title + "</h3>" +
      '<span class="pill pill--mini">' + m.status + "</span>" +
      (m.desc ? '<p class="mcard__desc">' + m.desc + "</p>" : "") +
      edit +
      "</div>";
  }

  function render() {
    ["anime", "game"].forEach(function (type) {
      var box = document.getElementById(type === "anime" ? "animeGrid" : "gameGrid");
      if (!box) return;
      var list = getMedia().filter(function (m) { return m.type === type; });
      box.innerHTML = (list.length
        ? list.map(card).join("")
        : '<p class="empty">还没有内容。</p>') +
        (BlogAdmin.is() ? '<button type="button" class="addcard" data-act="add" data-type="' + type + '">＋ 点击添加内容</button>' : "");
    });
  }

  /* ---------- 播放弹层 ---------- */
  function openVideo(m) {
    if (!m.video) { BlogAdmin.toast("这条还没配视频"); return; }
    var isEmbed = /^https?:/.test(m.video) && !/\.(mp4|webm)$/i.test(m.video);
    var inner = isEmbed
      ? '<iframe src="' + m.video + '" allowfullscreen allow="autoplay; fullscreen"></iframe>'
      : '<video src="' + m.video + '" controls autoplay></video>';
    var ov = document.createElement("div");
    ov.className = "player";
    ov.innerHTML = '<div class="player__box"><button class="player__x iconbtn" type="button">✕</button>' + inner + "</div>";
    document.body.appendChild(ov);
    requestAnimationFrame(function () { ov.classList.add("is-in"); });
    ov.addEventListener("click", function (e) {
      if (e.target === ov || e.target.closest(".player__x")) {
        ov.classList.remove("is-in");
        setTimeout(function () { ov.remove(); }, 250);
      }
    });
  }

  /* ---------- 事件 ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-act]") : null;
    if (!t) return;
    var act = t.getAttribute("data-act");
    var id = t.getAttribute("data-id");
    var m = itemById(id);

    if (act === "open" && m) { openVideo(m); return; }

    if (!BlogAdmin.is()) return;

    if (act === "del" && m) {
      if (window.confirm("确定删除《" + m.title + "》？")) {
        BlogEditor.deleteMedia(id);
        render();
        BlogAdmin.toast("已删除（本机），发布到全网请用页脚「导出内容」");
      }
    } else if (act === "edit") {
      // 新增与编辑都用同一个编辑器；没有现成条目时按类型新建
      BlogEditor.mediaEditor(m, t.getAttribute("data-type") || (m && m.type) || "anime", render);
    } else if (act === "add") {
      BlogEditor.mediaEditor(null, t.getAttribute("data-type") || "anime", render);
    }
  });

  document.addEventListener("content:change", render);
  render();
  // 管理员身份变化（登录/退出）后重新渲染，让末尾的加号卡片跟着出现/消失
  document.addEventListener("admin:change", render);
  window.BlogMedia = { render: render };
})();
