# WPS 加载项

薄加载项。窗格只做「一键上传 + 只读进度 + 排版执行 + 证据回传」，对话 / 确认点 /
要求清单在浏览器 Copilot 里 —— 形态决策见
`../../tasks/wps-addon-end-to-end-flow-2026-08-18.md` §8.3，别往这里搬编辑器组件。

## 结构

```
wps-addon/
  shell/            静态外壳，原样拷进 dist（vite 的 publicDir）
    index.html      WPS 的加载项入口
    js/ribbon.js    OnAddinLoad / OnAction，非模块脚本
    ribbon.xml      功能区
    manifest.xml    加载项元信息
  dist/             构建产物 = 可直接部署的加载项包（gitignored）
```

任务窗格的 React 源码在 `../src/wps/`，构建配置在 `../vite.config.wps.ts`。
JSAPI 只准经 `../src/platform/RuntimeAdapter` 访问，`src/platform/boundary.test.ts` 强制这条。

## 构建

```bash
npm run build:wps      # → wps-addon/dist/
npm run dev:wps        # vite dev server，固定 3889
```

## 部署到一台机器

**不需要 `wpsjs` CLI。** 实测 `wpsjs debug` 只做两件事：写一行注册、起 vite。

1. 把 `dist/` 放到目标机，用任意静态服务起在 **3889**：

   ```bash
   cd <dist> && python3 -m http.server 3889 --bind 127.0.0.1
   ```

   端口只能是 3889 —— 一变，预置的 `authaddin.json` 立刻失效并重新弹授信框。

2. 注册。Linux 路径 `~/.local/share/Kingsoft/wps/jsaddons/publish.xml`：

   ```xml
   <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
   <jsplugins>
     <jspluginonline name="wpsprobe" type="wps" url="http://127.0.0.1:3889/" debug="" enable="enable_dev" install="null"/>
   </jsplugins>
   ```

   > `name="wpsprobe"` 是**开发期遗留**。`authaddin.json` 的授信 token 绑定
   > 「加载项名 + URL」，改名会让预置失效、需要人在机器屏幕上手工点一次授信。
   > 正式打包分发时统一改名并重新捕获一次，见 todo-9 §3 未决 2。
   > `manifest.xml` 里的 `<Name>标书助手</Name>` 是显示名，改它不影响 token（已实测）。

3. 授信。同目录放 `authaddin.json`。**不用算 token**——手工授信一次后把文件存下来复用，
   只要加载项名与端口不变就一直有效（`tasks/…§7.1`）。这是**每台机器一次性**的动作。

4. 起 WPS 并打开任意文档。`OnAddinLoad` 会在 3 秒后自动开窗格，无需点按钮。

## 验证状态

2026-08-21 在 `zhaoxin-ts`（兆芯 KX-7000 / UOS Desktop 20 Pro / WPS 12.8.2.21176）
全程零点击跑通：ribbon 出「标书助手」页签，任务窗格自动打开，能力自检显示
`运行时=wps` / `可读文档字节=是` / `应用版本=12.0 / 12.8.2.21176`。

**未验**：Windows、macOS。macOS 是 P2 的阻断项（`wps.FileSystem` 在该平台是否存在未知）。
