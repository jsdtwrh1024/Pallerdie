/* =========================================================
   cats.js —— 分类管理
   ----------------------------------------------------------
   分类分两种来源：
     1. 自动分类：任何文章用过的 cat（含区块名「学习」「生活」）——
        不用手动维护，写了就自动出现在侧栏，数量归零也会保留。
     2. 手动分类：在侧栏点「＋ 新建分类」加的，存在本机 site:cats，
        即使一篇文章都没有也会显示，用来提前占位（例：先建好「旅行」）。
   新建/删除只影响本机；导出内容时手动分类会一起写进 posts.js 的 CATS。
   ========================================================= */
(function () {
  "use strict";

  var KEY = "site:cats";

  function load() {
    var v = BlogAdmin.load(KEY, []);
    return Array.isArray(v) ? v.filter(function (c) { return c && c !== "全部"; }) : [];
  }

  function store(list) {
    BlogAdmin.store(KEY, list.filter(function (c, i, a) { return a.indexOf(c) === i; }));
  }

  /* posts.js 里声明的空分类（可选，加了才生效） */
  function declared() {
    return (typeof CATS !== "undefined" && Array.isArray(CATS))
      ? CATS.filter(function (c) { return c && c !== "全部"; })
      : [];
  }

  /* 区块名（学习 / 生活 …）也能当分类用：
     写作时可以直接归到区块下，于是这些名字常驻在列表里，
     就算暂时没有文章也不会从下拉框消失。
     动态 / 番剧 / 游戏 / 留言板 是独立区块，不参与文章分类。 */
  function sectionNames() {
    var out = [];
    if (typeof SECTIONS === "undefined") return out;
    Object.keys(SECTIONS).forEach(function (k) {
      if (k === "moments" || k === "anime" || k === "game" || k === "board") return;
      var n = SECTIONS[k] && SECTIONS[k].name;
      if (n && out.indexOf(n) < 0) out.push(n);
    });
    return out;
  }

  function posts() {
    return window.BlogEditor ? BlogEditor.mergedPosts()
      : (typeof POSTS !== "undefined" ? POSTS : []);
  }

  /* 当前所有文章用到的分类（保持出现顺序） */
  function usedCats() {
    var out = [];
    posts().forEach(function (p) {
      var c = String(p.cat || "").trim();
      if (c && c !== "全部" && out.indexOf(c) < 0) out.push(c);
    });
    return out;
  }

  /* 最终列表：文章用到的 + 区块名 + 手动新建的 + posts.js 声明的（去重，按此顺序） */
  function all() {
    var out = usedCats();
    sectionNames().concat(declared()).concat(load()).forEach(function (c) {
      if (out.indexOf(c) < 0) out.push(c);
    });
    return out;
  }

  /* 新建：返回 false 表示已存在 */
  function add(name) {
    name = String(name || "").trim();
    if (!name || name === "全部") return false;
    if (all().indexOf(name) >= 0) return false;
    var list = load();
    list.push(name);
    store(list);
    return true;
  }

  /* 删除手动分类。
     如果有文章还在用这个分类，文章那部分没法在"删分类"里动，
     所以只是去掉手动占位，返回 isAuto=true 让调用方提示用户。 */
  function remove(name) {
    var list = load();
    var has = list.indexOf(name) >= 0;
    if (has) store(list.filter(function (c) { return c !== name; }));
    var left = 0;
    posts().forEach(function (p) { if (p.cat === name) left++; });
    return { ok: has, isAuto: left > 0, left: left };
  }

  function count(name) {
    return posts().filter(function (p) { return p.cat === name; }).length;
  }

  window.BlogCats = {
    all: all,
    used: usedCats,
    manual: load,
    declared: declared,
    sections: sectionNames,
    add: add,
    remove: remove,
    count: count
  };
})();
