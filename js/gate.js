/* =========================================================
   gate.js —— 首次访问弹窗：欢迎 + 选择身份
   游客：填昵称或跳过（跳过则生成编号：用户+年月日+时间+随机4位）
   管理员：输入管理密码，成功后解锁网页编辑
   选择结果存在 localStorage，之后访问不再弹出；
   删掉 localStorage 的 site:gate 可重新弹出（换身份同理）。
   ========================================================= */
(function () {
  "use strict";

  var KEY = "site:gate";
  var NAME_KEY = "site:board:name";   // 与留言板/评论共用一个昵称来源

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; }
  }

  function saveIdentity(id) {
    try { localStorage.setItem(KEY, JSON.stringify(id)); } catch (e) {}
  }

  /* 北京时间（UTC+8）的 年月日 时分 秒 → 纯数字 */
  function beijingStamp(ts) {
    var d = new Date(ts + 8 * 3600 * 1000);
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return "" + d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) +
      p(d.getUTCHours()) + p(d.getUTCMinutes());
  }

  function randChar() {
    var pool = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return pool.charAt(Math.floor(Math.random() * pool.length));
  }

  function guestId() {
    return "用户" + beijingStamp(Date.now()) + randChar() + randChar() + randChar() + randChar();
  }

  /* ---------- 解锁管理员 ---------- */
  function unlockAdmin() {
    try { sessionStorage.setItem("site:admin", "1"); } catch (e) {}
    if (window.BlogAdmin && window.BlogAdmin.refresh) window.BlogAdmin.refresh();
    if (window.BlogAdmin) window.BlogAdmin.toast("管理员已登录，可以编辑内容了");
  }

  /* ---------- 弹窗 ---------- */
  function build() {
    var scrim = document.createElement("div");
    scrim.className = "scrim is-open";
    scrim.id = "gateScrim";

    var box = document.createElement("div");
    box.className = "gate";
    box.id = "gate";

    box.innerHTML =
      '<div class="gate__body">' +
        '<h2 class="gate__title">欢迎访问</h2>' +
        '<p class="gate__sub">' + esc(SITE.name) + '</p>' +

        '<div class="gate__step" data-step="choose">' +
          '<p class="gate__ask">请选择你的身份</p>' +
          '<div class="gate__roles">' +
            '<button type="button" class="gate__role" data-role="guest"><b>游客</b></button>' +
            '<button type="button" class="gate__role" data-role="admin"><b>管理员</b></button>' +
          "</div>" +
        "</div>" +

        '<div class="gate__step" data-step="guest" hidden>' +
          '<p class="gate__ask">怎么称呼你？（可以留空跳过）</p>' +
          '<input class="gate__input" maxlength="20" placeholder="你的昵称">' +
          '<div class="gate__ops">' +
            '<button type="button" class="gate__btn" data-go="enter">进入</button>' +
            '<button type="button" class="gate__link" data-go="skip">跳过</button>' +
          "</div>" +
          '<button type="button" class="gate__back" data-back>← 返回</button>' +
        "</div>" +

        '<div class="gate__step" data-step="admin" hidden>' +
          '<p class="gate__ask">请输入管理密码</p>' +
          '<input class="gate__input" type="password" placeholder="管理密码">' +
          '<div class="gate__ops"><button type="button" class="gate__btn" data-go="login">登录</button></div>' +
          '<button type="button" class="gate__back" data-back>← 返回</button>' +
        "</div>" +

      "</div>" +
      '<img class="gate__img" src="images/welcome.jpg" alt="">';

    document.body.appendChild(scrim);
    document.body.appendChild(box);

    var steps = box.querySelectorAll(".gate__step");
    function show(name) {
      for (var i = 0; i < steps.length; i++) {
        steps[i].hidden = steps[i].getAttribute("data-step") !== name;
      }
    }

    function close() {
      scrim.remove();
      box.remove();
    }

    function finish(identity) {
      saveIdentity(identity);
      try { localStorage.setItem(NAME_KEY, identity.name); } catch (e) {}
      close();
      if (window.BlogMoments) window.BlogMoments.render();
    }

    box.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest("[data-role],[data-go],[data-back]") : null;
      if (!t) return;

      if (t.hasAttribute("data-back")) { show("choose"); return; }

      var role = t.getAttribute("data-role");
      if (role === "guest") { show("guest"); return; }
      if (role === "admin") { show("admin"); return; }

      var go = t.getAttribute("data-go");
      if (go === "enter" || go === "skip") {
        var input = box.querySelector('[data-step="guest"] .gate__input');
        var name = (input.value || "").trim();
        if (go === "skip" || !name) name = guestId();
        finish({ role: "guest", name: name, first: Date.now() });
        return;
      }

      if (go === "login") {
        var pwd = box.querySelector('[data-step="admin"] .gate__input').value;
        if (pwd === ADMIN.passcode) {
          unlockAdmin();
          finish({ role: "admin", name: (SITE.author || "站主"), first: Date.now() });
        } else {
          var step = box.querySelector('[data-step="admin"]');
          step.classList.add("is-shake");
          setTimeout(function () { step.classList.remove("is-shake"); }, 500);
          box.querySelector('[data-step="admin"] .gate__input').value = "";
          if (window.BlogAdmin) window.BlogAdmin.toast("密码不对");
        }
      }
    });

    box.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      var step = e.target.closest(".gate__step");
      if (!step) return;
      var btn = step.querySelector(".gate__btn");
      if (btn) btn.click();
    });
  }

  /* ---------- 启动 ---------- */
  function start() {
    var id = read();
    if (id && id.role) {
      // 已经选过身份：管理员刷新页面后保持解锁
      if (id.role === "admin") {
        try { sessionStorage.setItem("site:admin", "1"); } catch (e) {}
        if (window.BlogAdmin && window.BlogAdmin.refresh) window.BlogAdmin.refresh();
      }
      return;
    }
    build();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  window.BlogGate = {
    identity: read,
    displayName: function () {
      var id = read();
      return (id && id.name) || "路人";
    }
  };
})();
