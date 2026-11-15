# 我的小站 · 静态网站模板

一个不依赖任何框架、不需要服务器、不需要构建的个人网站。双击 `home.html` 就能看效果，整个文件夹推上 GitHub Pages 就能上线。

## 文件说明

```
blog/
├── home.html         ★ 主页（含 番剧/游戏/留言板 区块）
├── post.html         文章页
├── css/style.css     全部样式
├── js/posts.js       ★ 内容都在这里：站点信息、文章、番剧/游戏、公告、管理密码
├── js/theme.js       主题设置（主题色 / 深浅色 / 字体 / 纹理 / 羽毛动效）
├── js/admin.js       管理模式（页脚「管理」入口）
├── js/home.js        首页逻辑（轮播、打字机、日历、统计、筛选）
├── js/media.js       番剧区 / 游戏区（增删改 + 视频弹层）
├── js/board.js       留言板（留言 / 点赞 / 回复 / 管理删除）
├── js/post.js        文章页渲染 + 阅读进度条
└── .nojekyll         让 GitHub 跳过 Jekyll 处理
```

**重要：上传到 GitHub 时，把 `home.html` 改名为 `index.html`**（GitHub Pages 只认 index.html 作为首页）。本地叫 home.html 是为了避开你电脑上的清理软件；上线后 GitHub 不会动它。

## 功能速览

| 功能 | 说明 |
|---|---|
| 主题色 | 色相滑条 + 8 预设色，一个变量带动全站 |
| 深浅色 | 浅色 / 深色 / **跟随系统** 三档 |
| 字体 | 行楷（默认）/ 楷体 / 宋体 / 圆体，设置面板里切换 |
| 背景纹理 | 无 / 极客点阵 / **飘落羽毛**（会动的） |
| 区块 | 主页 / 番剧 / 游戏 / 留言板，顶部导航切换，「归档」= 回到顶部 |
| 侧栏 | 左：头像·公告·分类；右：统计·日历（窄屏自动隐藏） |
| 管理模式 | 页脚「管理」→ 输密码 → 编辑公告、增删改番剧游戏、删留言、导出内容 |

## 日常改内容：只动 js/posts.js

### 站点信息

```js
const SITE = {
  name: "我的小站",            // 导航栏、侧栏、页脚（想好名字改这一处）
  title: "欢迎来到我的小站",    // 首屏大字
  motto: "保持热爱，奔赴山海。", // 侧栏头像下的一句话
  since: "2026-11-01",        // 建站日期（右侧「运行天数」用它）
};
```

### 文章

往 `POSTS` 数组最前面加一项，字段含义见文件内注释，字数自动统计。

### 番剧 / 游戏

在 `MEDIA` 数组里加一项：

```js
{ id: "a4", type: "anime",        // anime=番剧，game=游戏
  title: "作品名",
  cover: "images/封面.jpg",        // 留空显示首字母占位图
  rating: 9.0, status: "在看",
  desc: "一句话介绍",
  video: "" }                     // 可选：视频地址
```

也可以在网页上直接操作：页脚「管理」输密码后，番剧/游戏区右上角出现「＋ 添加」，每张卡片有编辑/删除。**网页上的改动只存在你自己浏览器里**——点页脚「导出内容」会生成代码（复制到剪贴板 + 下载文件），粘贴覆盖 `posts.js` 里对应的 `NOTICE` 和 `MEDIA`，再上传 GitHub 才算真正发布。

### 视频插入

`video` 字段两种填法：
- **B 站 / YouTube**：分享 → 复制嵌入代码，取其中 `src="..."` 引号里的网址
- **本地 mp4**：建 `videos/` 文件夹放进去，填 `videos/xxx.mp4`

点击卡片封面弹出播放器。

## 管理密码

`posts.js` 里的 `ADMIN.passcode`，**上线前务必改掉**。说明：纯静态网站没有服务器，密码就写在源码里，它防的是访客顺手乱点，防不了存心翻源码的人——这是所有无后端网站的共同限制。

## 留言板

默认模式：留言、点赞、回复保存在**每位访问者自己的浏览器**里（互相看不到）。这是无后端静态站的限制。

想让全站访客共用（自带点赞，且你能在后台删留言）：
1. 仓库公开，并开启 Discussions（Settings → General → Discussions）
2. 用 GitHub 账号打开 `https://giscus.app/zh-CN`，填仓库名，选一个分类
3. 把生成的 `repo`、`repoId`、`category`、`categoryId` 填进 `posts.js` 的 `SITE_GISCUS`
4. 留言区自动切换为 giscus：访客用 GitHub 账号登录留言，你在 GitHub Discussions 后台可删除任何留言

## 字体说明

行楷/楷体/宋体/圆体用的是**系统字体**，不需要下载文件。Windows 自带华文行楷、楷体、宋体、幼圆；Mac 有对应简体字体。访客电脑上没装的就回退到楷体/宋体。想要所有人都看到同一个字体，需要嵌入字体文件（几 MB），想要再说。

## 换成自己的背景图

1. 建 `images/` 文件夹，放一张 `banner.jpg`（横幅比例，建议 1920×1080）
2. 打开 `js/posts.js`，把 `SCENES` 里某一项改成 `look: "photo"`（CSS 里已写好 `images/banner.jpg` 的引用，图片不存在时自动用渐变兜底，不会白屏）
3. 侧栏头像同理：放一张 `images/avatar.jpg`

## 上传到 GitHub Pages

### 方式一：网页拖拽（最快）

1. 新建空仓库（不要勾 README）
2. `Add file → Upload files`，把 `blog` 文件夹**里面的所有文件**拖进去（先把 `home.html` 改名为 `index.html`！）
3. `Settings → Pages → Deploy from a branch → main → / (root)`，保存
4. 等 1～2 分钟，访问 `https://你的用户名.github.io/仓库名/`

### 方式二：命令行

```bash
git init
git add .
git commit -m "初始化"
git branch -M main
git remote add origin https://github.com/你的用户名/仓库名.git
git push -u origin main
```

密码填 **Personal Access Token**（github.com/settings/tokens 生成，勾 repo），不是账号密码。

## 三个容易踩的坑

1. **路径大小写**：GitHub 服务器区分大小写，`css/style.css` 保持全小写
2. **不要用绝对路径**：一律相对写法，否则子路径部署全 404
3. **改了内容页面没变**：浏览器缓存，`Ctrl + F5` 强刷
