// WPS 加载项构建。产出 `wps-addon/dist/`，直接就是可部署的加载项包。
//
// 不依赖 `wpsjs` CLI：实测它只做两件事——往
// `~/.local/share/Kingsoft/wps/jsaddons/publish.xml` 写一行注册，然后起 vite。
// 注册文件是纯 XML（见 wps-addon/README.md），自己写更可控，也省掉一条工具链依赖。
//
// root 设在 `src/wps`，taskpane.html 才能落在 dist 根目录而不是嵌套路径——
// 加载项里的 `CreateTaskPane(GetUrlPath() + '/taskpane.html')` 要的是这个平铺结构。
// publicDir 指向 `wps-addon/shell`，那些文件原样拷进 dist：index.html 是 WPS 的
// 入口，ribbon.js 必须以非模块脚本被加载（要在全局挂 OnAddinLoad），不能过 vite 转换。

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: here('./src/wps'),
  // 加载项从 http://127.0.0.1:3889/ 加载，资源必须走相对路径
  base: './',
  publicDir: here('./wps-addon/shell'),
  plugins: [react()],
  resolve: {
    alias: { '@': here('./src') },
  },
  build: {
    outDir: here('./wps-addon/dist'),
    emptyOutDir: true,
    // 入口是 taskpane.html 而不是默认的 index.html——dist 里的 index.html 来自
    // publicDir（WPS 的加载项入口），不参与打包。
    rollupOptions: { input: here('./src/wps/taskpane.html') },
  },
  server: {
    port: 3889,
    strictPort: true, // 端口一变，预置的 authaddin.json 立刻失效并重新弹授信框
    host: '127.0.0.1',
  },
});
