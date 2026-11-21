(function() {
  // ================= 配置区 =================
  const GITHUB_USER = "jsdtwrh1024"; // 你的 GitHub 用户名
  const GITHUB_REPO = "PallerDie";   // 你的仓库名
  const FILE_PATH = "js/posts.js";   // 你的数据文件路径
  const GITHUB_TOKEN = "ghp_你的Token"; // ⚠️ 替换为你申请的真实 Token
  // =========================================

  // 1. 当点击“发布动态”按钮时，显示我们的云端面板
  const addBtn = document.getElementById('momentAdd');
  const cloudPanel = document.getElementById('cloudPublishPanel');
  if (addBtn && cloudPanel) {
    addBtn.addEventListener('click', function() {
      cloudPanel.style.display = cloudPanel.style.display === 'none' ? 'block' : 'none';
    });
  }

  // 2. 点击“发布到云端”的执行逻辑
  const publishBtn = document.getElementById('cloudPublishBtn');
  const statusMsg = document.getElementById('cloudStatus');
  
  if (publishBtn) {
    publishBtn.addEventListener('click', async function() {
      const content = document.getElementById('cloudPostContent').value.trim();
      if (!content) return alert("内容不能为空");

      statusMsg.innerText = "正在向 GitHub 提交，请稍候...";
      statusMsg.style.color = "blue";

      try {
        // 获取当前 posts.js 文件内容
        const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
        const res = await fetch(url, {
          headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });
        const fileData = await res.json();
        const rawContent = decodeURIComponent(escape(atob(fileData.content)));

        // 格式化新动态，注意：动态里如果有引号需要用 \` 包裹
        const dateStr = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
        const newMomentCode = `\n  { date: "${dateStr}", text: \`${content}\`, images: [] },`;

        // 将新动态插入到 const MOMENTS = [ 的下一行
        let newContent = rawContent.replace(/const MOMENTS = \[/, `const MOMENTS = [${newMomentCode}`);

        // 转回 Base64 提交
        const encodedContent = btoa(unescape(encodeURIComponent(newContent)));
        
        const updateRes = await fetch(url, {
          method: "PUT",
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: "网页端自动发布动态",
            content: encodedContent,
            sha: fileData.sha
          })
        });

        if (updateRes.ok) {
          statusMsg.innerText = "发布成功！";
          statusMsg.style.color = "green";
          document.getElementById('cloudPostContent').value = "";
          // 清除本地缓存，让页面刷新后显示最新的代码数据
          localStorage.removeItem("site:moments"); 
          setTimeout(() => location.reload(), 1500);
        } else {
          statusMsg.innerText = "发布失败，可能是 Token 权限不足。";
          statusMsg.style.color = "red";
        }
      } catch (err) {
        console.error(err);
        statusMsg.innerText = "网络错误，请检查控制台。";
        statusMsg.style.color = "red";
      }
    });
  }
})();
