/* Agent Lab 的入口脚本。
   保留根目录旧路径作为兼容来源；页面统一通过 js/agent-lab.js 加载。 */
(function () {
  "use strict";
  var currentScript = document.currentScript;
  var legacyScript = document.createElement("script");
  legacyScript.src = new URL("../agent-lab.js", currentScript.src).href;
  legacyScript.onerror = function () {
    console.error("Agent Lab 脚本加载失败：", legacyScript.src);
  };
  document.head.appendChild(legacyScript);
})();
