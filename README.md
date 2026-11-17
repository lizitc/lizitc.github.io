# 栗子tc · Kuri's Atelier

栗子tc 的个人网站：一个「Galgame 标题画面 × 魔法阵」风格的单页主页。

纯静态页面，没有构建步骤，也没有任何第三方脚本。

## 内容

| 章节 | 说明 |
|---|---|
| 序章 · 标题画面 | 看板娘「小栗」、旋转魔法阵、ADV 对话框（AUTO / SKIP / LOG）、标题菜单 |
| 01 · 角色档案 | 角色卡、关于我、属性雷达图、特性 |
| 02 · 作品鉴赏 | 雪村千绘莉、御园莓华、栗子图库；Star / Fork 从 GitHub 实时同步，「详细」弹窗 |
| 03 · 攻略路线 | 已攻略 / 攻略中 / 未解锁的项目时间线，随滚动点亮 |
| 04 · 技能与装备 | 工具跑马灯、技能卡、显卡与显存、支线任务（日语 N4 → N1） |
| 05 · 记忆存档 | ChatGPT 的记忆档案做成 9 个存档位，点开即「读档」 |
| 终章 | GitHub 卡片与 Staff 名单 |

## 互动

- 点小栗的不同部位（耳朵、发卡、脸、平板、尾巴……）有不同反应；在头顶左右来回移动鼠标 = 摸头。好感度会记在浏览器里。
- 右上角切换昼夜（支持的浏览器里会有圆形扩散过渡）。
- 设置面板：樱花粒子、鼠标星屑、文字速度、迷你看板娘。
- 在页面上依次按 `k` `u` `r` `i`。

## 目录

```text
index.html            页面（全部文字内容都在这里，改文案直接改它）
assets/css/style.css  样式（顶部是昼 / 夜两套颜色变量）
assets/js/main.js     交互（台词在文件开头的 LINES 里）
assets/img/           图片素材
serve.ps1             本地预览用的 PowerShell 静态服务器
deploy.ps1            不用 git，通过 GitHub API 发布到 lizitc.github.io
```

## 本地预览

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 8790
```

然后打开 <http://localhost:8790/>。

## 发布到 GitHub Pages

把有 `repo` 权限的 GitHub token 放进同目录的 `githubkey.txt`（已在 `.gitignore` 里，不会被上传），然后：

```powershell
powershell -ExecutionPolicy Bypass -File deploy.ps1 -Message "New site"
```

注意：这会用本目录的文件**整体替换** `lizitc.github.io` 仓库里的内容。

## 素材说明

- 看板娘「小栗」是本站原创角色，由 AI 辅助绘制。
- 同人项目（千绘莉、莓华）中的角色与原作素材，版权归原作者及权利方所有，仅作非商业展示。
- 字体来自 Google Fonts，加载失败时会自动回退到系统字体，不影响页面显示。
