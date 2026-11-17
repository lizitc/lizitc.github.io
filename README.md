# 栗子tc 的个人网站

线上地址：<https://lizitc.github.io/>

一个 Galgame 标题画面风格的个人主页：看板娘、ADV 对话框、樱花粒子、白天 / 夜晚双主题，以及我在 GitHub 上的几个项目。

纯静态页面，没有构建步骤，也没有依赖。

```text
index.html           页面
assets/css/style.css 样式
assets/js/main.js    交互（花瓣、打字机、视差、设定面板、GitHub 实时数据）
assets/img/          图片素材
serve.ps1            本地预览用的 PowerShell 静态服务器
```

## 本地预览

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```

然后打开 <http://localhost:8787/>。

## 素材说明

- 看板娘「小栗」是本站原创角色，由 AI 辅助绘制。
- 同人项目（千绘莉、莓华）中的角色与原作素材，版权归原作者及权利方所有，仅作非商业展示。
