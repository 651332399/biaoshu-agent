import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, test } from 'vitest';

// 平台 DESIGN.md「员工应用规范」：不出现浏览器原生下拉 / 勾选 / 单选 / 文件选择，颜色只来自 --zy-*。
// vendor/zy-ui 是平台组件库拷贝；wps/ 是 WPS 加载项任务窗格，不在网页外壳内。
const ROOT = join(__dirname);
const SKIP = ['vendor', 'wps'];

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return SKIP.includes(name) ? [] : sources(path);
    return /\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('智员员工应用规范', () => {
  test('no native select / checkbox / radio / file inputs', () => {
    const offenders = sources(ROOT).filter((path) =>
      /<select\b|type=["'](checkbox|radio|file)["']/.test(readFileSync(path, 'utf8')),
    );
    expect(offenders.map((path) => relative(ROOT, path))).toEqual([]);
  });

  test('no hex or rgb colors outside the token stylesheet', () => {
    const offenders = sources(ROOT).filter((path) => /#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(readFileSync(path, 'utf8')));
    expect(offenders.map((path) => relative(ROOT, path))).toEqual([]);
  });
});
