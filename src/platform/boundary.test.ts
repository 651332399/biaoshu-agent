// 边界断言：全局 `wps` / `window.Application` 只准出现在 WpsRuntime.ts 里。
//
// 这条不是洁癖。交互形态 P4 之后要按实测重估是否把 Copilot 移进任务窗格
// （tasks/wps-addon-end-to-end-flow-2026-08-18.md §8.3）。散落的 `wps.xxx`
// 会让那次重估从「改一个 adapter」变成「翻整个 src」。仓库的 lint 是
// `tsc --noEmit`，没有 ESLint 规则可挂，所以做成测试。

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, test } from 'vitest';

// 用 cwd 而非 import.meta.url：vitest 在 jsdom 环境下会把模块 URL 重写成
// `/src/platform/...`，pathname 拿到的是 `/src` 这种假路径。
const SRC = join(process.cwd(), 'src');

/**
 * 唯一允许直接访问 JSAPI 桥的文件。
 * 本文件也在列——它必须写出这些字面量才能查别人，检查器查不了自己。
 */
const ALLOWED = new Set(['platform/WpsRuntime.ts', 'platform/boundary.test.ts']);

const FORBIDDEN: { pattern: RegExp; why: string }[] = [
  { pattern: /\bwindow\s*\.\s*wps\b/, why: 'window.wps' },
  { pattern: /\bwindow\s*\.\s*Application\b/, why: 'window.Application' },
  { pattern: /\bglobalThis\s*\.\s*wps\b/, why: 'globalThis.wps' },
  { pattern: /\bglobalThis\s*\.\s*Application\b/, why: 'globalThis.Application' },
  // 裸 `wps.Xxx`。`wps_version` / `wps-evidence` / `WpsAcceptanceChecks` 不会命中：
  // 前两个没有点，第三个首字母大写。
  { pattern: /(^|[^\w.$'"`])wps\s*\.\s*[A-Za-z_]/, why: '裸 wps.xxx' },
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return entry === 'node_modules' ? [] : walk(full);
    return /\.(ts|tsx)$/.test(entry) ? [full] : [];
  });
}

describe('运行时边界', () => {
  test('只有 WpsRuntime.ts 直接访问全局 wps / Application', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const rel = relative(SRC, file);
      if (ALLOWED.has(rel)) continue;
      const source = readFileSync(file, 'utf8');
      source.split('\n').forEach((line, index) => {
        // 跳过注释行——本文件和文档注释里会提到这些名字
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        for (const { pattern, why } of FORBIDDEN) {
          if (pattern.test(line)) offenders.push(`${rel}:${index + 1} ${why}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
