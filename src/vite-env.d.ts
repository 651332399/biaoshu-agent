/// <reference types="vite/client" />

// 加载项与后端不同源，基地址由构建期注入。
interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_BROWSER_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
