/* =========================================================
   moments.js —— 动态区块
   访客：看动态、赞/踩（各限一次、可换边）、评论
   管理模式（页脚「管理」）：发布 / 编辑 / 删除 / 置顶 / 设为他人不可见
   ----------------------------------------------------------
   发布后的动态存在本机浏览器；页脚「导出内容」会把它变成代码，
   粘贴覆盖 posts.js 里的 MOMENTS 再上传，别人才能看到。
   ========================================================= */
(function () {
  "use strict";

  var KEY = "site:moments";
  var VOTED = "site:moments:voted";

  function list() {
    return BlogAdmin.load(KEY, typeof MOMENTS !== "undefined" ? MOMENTS : []);
  }

  function save(all) {
    BlogAdmin.store(KEY, all);
  }

  function votes() {
    try { return JSON.parse(localStorage.getItem(VOTED) || "{}"); } catch (e) { return {}; }
  }

  function setVotes(v) {
    try { localStorage.setItem(VOTED, JSON.stringify(v)); } catch (e) {}
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* 站主头像：用 images/avatar.jpg；没这张图时退回"站"字色块 */
  var AVATAR_SRC = "images/avatar.jpg";
  function avatarHtml() {
    return '<img class="moment__ava-img" src="' + AVATAR_SRC + '" alt="" ' +
      'onerror="this.style.display=\'none\';this.parentNode.classList.add(\'moment__ava--fallback\');' +
      'this.parentNode.textContent=\'' + esc((SITE.author || "站").slice(0, 1)) + '\';">';
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function fmtFull(ts) {
    var d = new Date(ts);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function fmtShort(ts) {
    var d = new Date(ts);
    return pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  var box = null;

  function render() {
    if (!box) return;
    var all = list();
    var isAdmin = BlogAdmin.is();

    // 他人不可见的动态：非管理模式不显示
    var visible = all.filter(function (m) { return isAdmin || !m.hidden; });

    // 置顶在前，其余按最初发布时间倒序
    visible.sort(function (a, b) {
      if (!!b.pinned - !!a.pinned !== 0) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      return b.time - a.time;
    });

    if (!visible.length) {
      box.innerHTML = '<p class="empty">站主未发布任何动态~</p>' +
        (isAdmin ? '<button type="button" class="addcard" data-op="new">＋ 点击添加内容</button>' : "");
      return;
    }

    var voted = votes();
    box.innerHTML = visible.map(function (m) {
      var my = voted[m.id];
      var media = (m.media || []).map(function (x) {
        return x.type === "video"
          ? '<video class="moment__video" src="' + esc(x.src) + '" controls preload="metadata"></video>'
          : '<img class="moment__img" src="' + esc(x.src) + '" alt="" loading="lazy">';
      }).join("");

      var comments = (m.comments || []).map(function (c) {
        var who = c.name ? "<b>" + esc(c.name) + "</b>" : '<b class="moment__anon">匿名</b>';
        return '<div class="moment__cmt">' + who + "<span>" + esc(c.text) +
          "</span><time>" + fmtShort(c.time) + "</time></div>";
      }).join("");

      return '<article class="moment' + (m.pinned ? " is-pinned" : "") + '" data-id="' + m.id + '">' +
        '<div class="moment__head">' +
          '<span class="moment__ava">' + avatarHtml() + "</span>" +
          '<div class="moment__who"><b>' + esc(SITE.author || "站主") +
            '<i class="moment__badge">站主</i></b>' +
            '<span class="moment__time">' + fmtFull(m.time) +
              (m.edited ? " · 已编辑 " + fmtShort(m.edited) : "") + "</span>" +
          "</div>" +
          (m.pinned ? '<span class="moment__pin">置顶</span>' : "") +
          (m.hidden ? '<span class="moment__pin moment__pin--dim">仅自己可见</span>' : "") +
        "</div>" +
        (m.text ? '<p class="moment__text">' + esc(m.text).replace(/\n/g, "<br>") + "</p>" : "") +
        (media ? '<div class="moment__media' + ((m.media || []).length === 1 ? " is-one" : "") + '">' + media + "</div>" : "") +
        '<div class="moment__ops">' +
          '<button type="button" data-op="up" class="' + (my === "up" ? "is-voted" : "") + '">👍 <i>' + (m.up || 0) + "</i></button>" +
          '<button type="button" data-op="down" class="' + (my === "down" ? "is-voted" : "") + '">👎 <i>' + (m.down || 0) + "</i></button>" +
          '<button type="button" data-op="cmt">💬 <i>' + (m.comments || []).length + "</i></button>" +
          '<span class="moment__spacer"></span>' +
          '<button type="button" data-op="edit" class="admin-only">编辑</button>' +
          '<button type="button" data-op="pin" class="admin-only">' + (m.pinned ? "取消置顶" : "置顶") + "</button>" +
          '<button type="button" data-op="hide" class="admin-only">' + (m.hidden ? "公开" : "隐藏") + "</button>" +
          '<button type="button" data-op="del" class="admin-only">删除</button>' +
        "</div>" +
        '<div class="moment__cmts" hidden>' +
          (comments ? '<div class="moment__cmtlist">' + comments + "</div>" : "") +
          '<div class="moment__cmtform"><input maxlength="200" placeholder="写下你的评论…">' +
          '<button type="button" data-op="send">发送</button></div>' +
        "</div>" +
        "</article>";
    }).join("") +
      (isAdmin ? '<button type="button" class="addcard" data-op="new">＋ 点击添加内容</button>' : "");
  }

  function find(id) {
    var all = list();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return { m: all[i], all: all };
    return null;
  }

  /* ---------- 发布 / 编辑弹层 ---------- */
  function editor(existing) {
    var isNew = !existing;
    var m = existing || { id: "m" + Date.now(), text: "", media: [], time: 0, edited: null, pinned: false, hidden: false, up: 0, down: 0, comments: [] };

    var ov = document.createElement("div");
    ov.className = "player form";
    ov.innerHTML =
      '<div class="player__box form__box form__box--wide">' +
      '<h3 class="form__title">' + (isNew ? "发布动态" : "编辑动态") + "</h3>" +
      '<textarea class="moment__ta" name="text" rows="4" maxlength="2000" placeholder="说点什么…（支持换行）">' + esc(m.text || "") + "</textarea>" +
      '<div class="moment__medialist"></div>' +
      '<div class="moment__addrow">' +
        '<label class="mini-btn">＋ 选择图片/视频<input type="file" accept="image/*,video/*" multiple hidden></label>' +
        '<input class="moment__url" placeholder="或粘贴图片/视频网址，回车添加">' +
      "</div>" +
      '<p class="moment__tip">本机文件会转存到浏览器（建议单个小于 3MB，过大存不下）；要长期展示请把文件放进 images/ 后填网址，或用「导出内容」。</p>' +
      '<div class="form__ops"><button type="button" data-ok>' + (isNew ? "发布" : "保存") + "</button>" +
      '<button type="button" data-cancel>取消</button></div></div>';

    document.body.appendChild(ov);
    requestAnimationFrame(function () { ov.classList.add("is-in"); });

    var mediaList = ov.querySelector(".moment__medialist");
    function drawMedia() {
      mediaList.innerHTML = m.media.map(function (x, i) {
        var thumb = x.type === "video"
          ? '<span class="moment__mthumb">🎬 视频</span>'
          : '<img src="' + esc(x.src) + '" alt="">';
        return '<div class="moment__mitem">' + thumb +
          '<button type="button" data-rm="' + i + '">✕</button></div>';
      }).join("");
    }
    drawMedia();

    mediaList.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-rm]") : null;
      if (!b) return;
      m.media.splice(Number(b.getAttribute("data-rm")), 1);
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
          m.media.push({ type: /^video\//.test(f.type) ? "video" : "img", src: r.result });
          if (--pending === 0) { drawMedia(); fileInput.value = ""; }
        };
        r.readAsDataURL(f);
      });
    });

    var urlInput = ov.querySelector(".moment__url");
    urlInput.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" || !urlInput.value.trim()) return;
      var v = urlInput.value.trim();
      m.media.push({ type: /\.(mp4|webm|ogg)(\?|$)/i.test(v) ? "video" : "img", src: v });
      urlInput.value = "";
      drawMedia();
      e.preventDefault();
    });

    ov.querySelector("[data-cancel]").addEventListener("click", function () { ov.remove(); });
    ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); });

    ov.querySelector("[data-ok]").addEventListener("click", function () {
      m.text = ov.querySelector('[name="text"]').value.trim();
      if (!m.text && !m.media.length) { BlogAdmin.toast("写点文字或加张图再发布"); return; }
      var all = list();
      if (isNew) {
        m.time = Date.now();
        all.unshift(m);
      } else {
        for (var i = 0; i < all.length; i++) {
          if (all[i].id === m.id) { m.edited = Date.now(); all[i] = m; break; }
        }
      }
      try {
        save(all);
      } catch (err) {
        BlogAdmin.toast("存不下了：媒体文件太大，试试小一点的图或用网址");
        return;
      }
      ov.remove();
      render();
      BlogAdmin.toast(isNew ? "已发布（本机），发布到全网请用页脚「导出内容」" : "已保存修改");
    });
  }

  /* ---------- 事件 ---------- */
  function bind() {
    var addBtn = document.getElementById("momentAdd");
    if (addBtn) addBtn.addEventListener("click", function () {
      if (!BlogAdmin.is()) { BlogAdmin.toast("需要管理模式（页脚「管理」）"); return; }
      editor(null);
    });

    box.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest("[data-op]") : null;
      if (!btn) return;
      var op = btn.getAttribute("data-op");

      // 末尾的「＋ 点击添加内容」（不在任何 .moment 里）
      if (op === "new") {
        if (!BlogAdmin.is()) { BlogAdmin.toast("需要管理模式（页脚「管理」）"); return; }
        editor(null);
        return;
      }

      var card = btn.closest(".moment");
      if (!card) return;
      var id = card.getAttribute("data-id");
      var found = find(id);
      if (!found) return;
      var m = found.m;

      if (op === "up" || op === "down") {
        var voted = votes();
        if (voted[id] === op) {          // 再点一次 = 取消
          if (op === "up") m.up = Math.max(0, (m.up || 0) - 1); else m.down = Math.max(0, (m.down || 0) - 1);
          delete voted[id];
        } else {
          if (voted[id] === "up") m.up = Math.max(0, (m.up || 0) - 1);
          if (voted[id] === "down") m.down = Math.max(0, (m.down || 0) - 1);
          if (op === "up") m.up = (m.up || 0) + 1; else m.down = (m.down || 0) + 1;
          voted[id] = op;
        }
        setVotes(voted);
        save(found.all);
        render();
        return;
      }

      if (op === "cmt") {
        var area = card.querySelector(".moment__cmts");
        area.hidden = !area.hidden;
        return;
      }

      if (!BlogAdmin.is()) { BlogAdmin.toast("需要管理模式（页脚「管理」）"); return; }

      if (op === "edit") {
        editor(m);
      } else if (op === "pin") {
        m.pinned = !m.pinned;
        save(found.all); render();
        BlogAdmin.toast(m.pinned ? "已置顶" : "已取消置顶");
      } else if (op === "hide") {
        m.hidden = !m.hidden;
        save(found.all); render();
        BlogAdmin.toast(m.hidden ? "已设为他人不可见" : "已公开");
      } else if (op === "del") {
        if (window.confirm("删除这条动态？")) {
          save(found.all.filter(function (x) { return x.id !== id; }));
          render();
        }
      }
    });

    // 评论发送（事件委托到 container，评论框是动态生成的）
    box.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest('[data-op="send"]') : null;
      if (!btn) return;
      var card = btn.closest(".moment");
      var input = card.querySelector(".moment__cmtform input");
      var text = input.value.trim();
      if (!text) return;
      var found = find(card.getAttribute("data-id"));
      if (!found) return;
      var name;
      try { name = localStorage.getItem("site:board:name") || ""; } catch (err) {}
      name = String(name).trim();
      if (name === "路人" || name === "你的名字") name = "";   // 旧版本的占位字不再使用
      found.m.comments = found.m.comments || [];
      found.m.comments.push({ name: name, text: text, time: Date.now() });
      save(found.all);
      render();
    });
  }

  function mount(el) {
    box = el;
    if (!box) return;
    bind();
    render();
  }

  // 管理模式切换时（导出/退出会改 body class），重新渲染以显示/隐藏按钮
  var mo = window.MutationObserver ? new MutationObserver(render) : null;
  if (mo) {
    document.addEventListener("DOMContentLoaded", function () {
      mo.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    });
  }

  mount(document.getElementById("momentsBox"));

  window.BlogMoments = { mount: mount, render: render };
})();
