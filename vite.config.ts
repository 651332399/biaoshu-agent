import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type {Plugin} from 'vite';
import {defineConfig} from 'vitest/config';

// 产物里出现 Chromium 100 不认识的布局查询就让构建失败：这类规则被静默丢弃，只有钉钉真机才看得出来（GUIX-471）。
function assertWebViewCss(): Plugin {
  return {
    name: 'assert-webview-css',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type !== 'asset' || !file.fileName.endsWith('.css')) continue;
        // Tailwind 会把源码里出现的 @container 生成成类名 .\@container，那不是容器查询，不拦。
        const found = /(?<!\\)@container\b|@media[^{]*\(\s*(?:width|height)\s*[<>]/.exec(String(file.source));
        if (found) this.error(`${file.fileName} 含 Chromium 100 不支持的规则：${found[0]}。断点用 max-width，容器宽度用 ResizeObserver。`);
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), assertWebViewCss()],
    build: {
      // 钉钉 Android 内置浏览器是 Chromium 100；不固定的话 CSS 可能被压成它不认识的范围语法，窄屏断点失效。
      target: 'chrome100',
      cssTarget: 'chrome100',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify: file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: './vitest.setup.ts',
      globals: false,
    },
  };
});
