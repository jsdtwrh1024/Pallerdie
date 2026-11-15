/* =========================================================
   admin.js —— 管理模式
   页脚有个不起眼的「管理」入口，输入 ADMIN.passcode 后解锁：
   - 编辑公告
   - 增删改番剧 / 游戏条目
   - 删除留言
   - 导出内容（把本地改动变成可粘贴进 posts.js 的代码）
   改动保存在本机浏览器；要发布就导出后粘进 posts.js 再上传 GitHub。
   ========================================================= */
(function () {
  "use strict";

  var SKEY = "site:admin";

  function unlocked() {
    try { return sessionStorage.getItem(SKEY) === "1"; } catch (e) { return false; }
  }

  function refresh() {
    var on = unlocked();
    document.body.classList.toggle("is-admin", on);
    // 通知各区块重渲染：管理员才有「＋ 点击添加内容」，身份一变就得刷新
    try {
      document.dispatchEvent(new CustomEvent("admin:change", { detail: { admin: on } }));
    } catch (e) {}
  }

  function toast(msg) {
    var t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add("is-in"); }, 10);
    setTimeout(function () { t.classList.remove("is-in"); }, 2600);
    setTimeout(function () { t.remove(); }, 3000);
  }

  window.BlogAdmin = {
    is: unlocked,
    toast: toast,
    refresh: refresh,
    /* 读"数据 + 本地修改"的统一入口 */
    load: function (key, fallback) {
      try {
        var raw = JSON.parse(localStorage.getItem(key) || "null");
        if (raw !== null && raw !== undefined) return raw;
      } catch (e) {}
      return fallback;
    },
    store: function (key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    }
  };

  function exportData() {
    var text = window.BlogEditor ? BlogEditor.exportSnippet() : (function () {
      // 兜底：editor.js 未加载时只导公告
      return "const NOTICE = " + JSON.stringify(
        BlogAdmin.load("site:notice", typeof NOTICE !== "undefined" ? NOTICE : ""), null, 2) + ";";
    })();

    var copied = false, downloaded = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch (e) {}
    try {
      var blob = new Blob([text], { type: "text/javascript" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "posts-覆盖段.js";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      downloaded = true;
    } catch (e) {}

    // 弹一个说明框：怎么用、导出了什么
    var n = window.BlogEditor ? BlogEditor.mergedPosts().length : 0;
    var m = window.BlogEditor ? BlogEditor.mergedMedia().length : 0;
    exportTip({
      posts: n, media: m, copied: copied, downloaded: downloaded, text: text
    });
  }

  /* 导出后的说明弹窗（自带「再复制一次」按钮，防止剪贴板被拒） */
  function exportTip(info) {
    var ov = document.createElement("div");
    ov.className = "player form";
    ov.innerHTML =
      '<div class="player__box form__box export">' +
        '<h3 class="form__title">已导出内容</h3>' +
        '<p class="form__note">文章 ' + info.posts + " 篇 · 番剧/游戏 " + info.media + " 条 · 动态与公告</p>" +
        '<ul class="export__steps">' +
          "<li>用 VS Code 打开 <code>js/posts.js</code></li>" +
          "<li>把里面的 <code>const NOTICE</code>、<code>POSTS</code>、<code>MEDIA</code>、" +
            "<code>MOMENTS</code> 四段，分别换成下面导出的同名内容</li>" +
          "<li>保存 → 提交并推送到 GitHub（Pages 会自动更新）</li>" +
          "<li>回到网站按 <b>F12</b> → 控制台，执行导出末尾那行代码清掉本机临时改动</li>" +
        "</ul>" +
        '<p class="form__note">' +
          (info.copied ? "✓ 内容已复制到剪贴板" : "⚠ 请点下面「复制这段代码」手动复制") +
          (info.downloaded ? " · ✓ 同时下载了 posts-覆盖段.js" : "") +
        "</p>" +
        '<textarea class="export__text" readonly rows="8"></textarea>' +
        '<div class="form__ops">' +
          '<button type="button" data-copy>复制这段代码</button>' +
          '<button type="button" data-cancel>关闭</button>' +
        "</div>" +
      "</div>";
    document.body.appendChild(ov);
    requestAnimationFrame(function () { ov.classList.add("is-in"); });

    var ta = ov.querySelector(".export__text");
    ta.value = info.text;

    ov.querySelector("[data-copy]").addEventListener("click", function () {
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) {}
      if (!ok && navigator.clipboard) {
        try { navigator.clipboard.writeText(info.text); ok = true; } catch (e) {}
      }
      toast(ok ? "已复制" : "复制失败，请手动全选复制");
    });
    function close() { ov.remove(); }
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    ov.querySelector("[data-cancel]").addEventListener("click", close);
  }

  function initFooter() {
    var foot = document.getElementById("footExtra");
    if (!foot || foot.dataset.ready) return;
    foot.dataset.ready = "1";

    var admin = document.createElement("button");
    admin.type = "button";
    admin.className = "foot__link";
    admin.textContent = "管理";
    admin.addEventListener("click", function () {
      if (unlocked()) return;
      var code = window.prompt("输入管理密码：");
      if (code === null) return;
      if (code === ADMIN.passcode) {
        try { sessionStorage.setItem(SKEY, "1"); } catch (e) {}
        refresh();
        BlogAdmin.toast("管理模式已开启");
      } else if (code !== "") {
        BlogAdmin.toast("密码不对");
      }
    });

    var exit = document.createElement("button");
    exit.type = "button";
    exit.className = "foot__link admin-only";
    exit.textContent = "退出管理";
    exit.addEventListener("click", function () {
      try { sessionStorage.removeItem(SKEY); } catch (e) {}
      refresh();
      BlogAdmin.toast("已退出管理模式");
    });

    var exp = document.createElement("button");
    exp.type = "button";
    exp.className = "foot__link admin-only";
    exp.textContent = "导出内容";
    exp.addEventListener("click", exportData);

    var sep = document.createElement("span");
    sep.className = "foot__sep admin-only";
    sep.textContent = "·";
    var sep2 = document.createElement("span");
    sep2.className = "foot__sep admin-only";
    sep2.textContent = "·";

    foot.appendChild(admin);
    foot.appendChild(sep);
    foot.appendChild(exp);
    foot.appendChild(sep2);
    foot.appendChild(exit);
  }

  refresh();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFooter);
  } else {
    initFooter();
  }
})();
