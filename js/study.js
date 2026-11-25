/* 学习区块的固定项目卡片：和 MLP 训练实验室一样，不依赖文章数据。 */
(function () {
  "use strict";

  var box = document.querySelector('[data-list="study"]');
  if (!box) return;

  function ensureAgentLabCard() {
    if (box.querySelector("[data-agent-lab-card]")) return;

    var card = document.createElement("a");
    card.className = "post post--mlp";
    card.href = "agent-lab.html";
    card.setAttribute("data-agent-lab-card", "");
    card.innerHTML =
      '<h2 class="post__title">Agent 使用展示</h2>' +
      '<div class="post__meta"><span class="meta">项目展示 · JavaScript</span></div>' +
      '<p class="post__excerpt">从建站、功能开发到测试与部署，看看 Agent 如何参与一个个人网站的完整制作过程。</p>' +
      '<div class="post__tags"><span class="tag">#Agent</span><span class="tag">#项目复盘</span></div>' +
      '<span class="post__arrow post__arrow--big" aria-hidden="true">›</span>';

    var mlpCard = box.querySelector(".post--mlp");
    if (mlpCard) mlpCard.insertAdjacentElement("afterend", card);
    else box.insertBefore(card, box.firstChild);
  }

  ensureAgentLabCard();
  new MutationObserver(ensureAgentLabCard).observe(box, { childList: true });
})();
