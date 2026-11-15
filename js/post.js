/* =========================================================
   post.js —— 文章页：从 ?p=slug 读出文章并渲染 + 留言区
   ========================================================= */
(function () {
  "use strict";

  var box = document.getElementById("article");
  var brandName = document.getElementById("brandName");
  if (brandName) brandName.textContent = SITE.name;

  var slug = new URLSearchParams(location.search).get("p");
  var post = null;

  // 优先取「原始 + 本机修改」合并后的版本，网页上改过的内容也能正确显示
  var pool = window.BlogEditor ? BlogEditor.mergedPosts() : POSTS;
  for (var i = 0; i < pool.length; i++) {
    if (pool[i].slug === slug) { post = pool[i]; break; }
  }

  if (!post) {
    document.title = "找不到这篇内容 · " + SITE.name;
    box.innerHTML =
      '<p class="article__loading">找不到这篇内容。</p>' +
      '<p class="article__loading">可能是链接里的 <code>?p=</code> 参数不对，或者它已经被改名了。</p>';
    return;
  }

  document.title = post.title + " · " + SITE.name;

  var tags = post.tags.map(function (t) { return '<span class="tag">#' + t + "</span>"; }).join("");

  box.innerHTML =
    '<header class="article__head">' +
      '<h1 class="article__title">' + post.title + "</h1>" +
      '<div class="article__meta">' +
        '<span class="meta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></svg>' + post.date + "</span>" +
        '<span class="meta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2.5h6A2.5 2.5 0 0 1 20.5 10v7A2.5 2.5 0 0 1 18 19.5H6A2.5 2.5 0 0 1 3.5 17Z"/></svg>' + post.cat + "</span>" +
        '<span class="meta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M7 4h7l4 4v12a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5.5A1.5 1.5 0 0 1 7.5 4Z"/><path d="M9.5 12h5M9.5 15.5h5"/></svg>' + wordCount(post) + " 字</span>" +
        '<span class="meta">' + SITE.author + "</span>" +
      "</div>" +
      '<div class="post__tags" style="margin-top:14px">' + tags + "</div>" +
      '<button type="button" class="article__edit admin-only" data-edithere>编辑这篇</button>' +
    "</header>" +
    ((post.media || []).length
      ? '<div class="article__media">' +
        post.media.map(function (x) {
          return x.type === "video"
            ? '<video src="' + x.src + '" controls preload="metadata"></video>'
            : '<img src="' + x.src + '" alt="" loading="lazy">';
        }).join("") +
        "</div>"
      : "") +
    '<div class="prose">' + post.body.join("") + "</div>" +
    '<section class="card board-wrap"><div class="card__title">留言</div>' +
      '<div id="postBoard"></div>' +
    "</section>";

  /* board.js 在本文件之后加载，等全部脚本就绪再挂留言区 */
  document.addEventListener("DOMContentLoaded", function () {
    BlogBoard.mount(document.getElementById("postBoard"), "post:" + post.slug, post.title);
  });

  /* 文章页直接编辑：保存后刷新回列表页即可看到 */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("[data-edithere]") : null;
    if (!btn) return;
    if (!BlogAdmin.is()) { BlogAdmin.toast("需要管理模式（页脚「管理」）"); return; }
    BlogEditor.postEditor(post, { onSaved: function (next) {
      // 页面上的文字即时更新，不用手动刷新
      var t = document.querySelector(".article__title");
      var p = document.querySelector(".prose");
      if (t) t.textContent = next.title;
      if (p) p.innerHTML = next.body.join("");
      document.title = next.title + " · " + SITE.name;
    } });
  });

  /* 阅读进度条 */
  var bar = document.getElementById("progress");
  function onScroll() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var pct = h > 0 ? (window.scrollY / h) * 100 : 0;
    bar.style.width = Math.min(Math.max(pct, 0), 100) + "%";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
})();
