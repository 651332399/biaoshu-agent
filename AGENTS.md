# AGENTS.md

## 前端规范
- 遵循智员平台仓库（luyaoze3258-ship-it/agent-platform）根目录 `DESIGN.md`「员工应用规范」及 Components / 表单 / 表格规范。
- 控件只用 `src/vendor/zy-ui`（平台 `packages/ui` 的拷贝），不写原生 `<select>`、checkbox、radio、可见的文件选择；隐藏的文件输入用 `HiddenFileInput`。
- 颜色只用 `--zy-*` token（`src/vendor/zy-ui/zy-1.0.0.css`），页面代码不写 hex / rgb；Tailwind 色阶已在 `src/index.css` 的 `@theme` 映射到 token。`src/designSpec.test.ts` 会拦截违规。
- 顶栏 `src/components/AppTopbar.tsx` 是规范要求的统一外壳（智员 logo、员工名、返回智员平台、账号区；iframe 内嵌时隐藏 logo 与返回入口）。

## vendor 来源
- `src/vendor/zy-ui/`：agent-platform `packages/ui/src` 与 `packages/design-tokens/releases/zy-1.0.0.css`，来源提交 `9e7b6da3d92a5e74371cb45f832bf1714c36d236`（GUIX-375）。升级时整目录按新提交重新拷贝，不在本仓库改 vendor 文件。

## 验证与发布
- `npm run lint`、`npm test`、`npm run build -- --base=/biaoshu/`。
- 发布方式见 biaoshu-engine `deploy/tencent-cloud/README.md`（本地构建后替换线上 `biaoshu-web` 镜像）。
