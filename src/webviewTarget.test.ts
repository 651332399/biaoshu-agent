// @vitest-environment node
// GUIX-471：钉钉 Android 内置浏览器是 Chromium 100。CSS 规则被它丢弃时只有真机才看得出来。
import { resolveConfig, type Plugin } from 'vite';
import { describe, expect, test } from 'vitest';

const build = () => resolveConfig({}, 'build');

function runGuard(guard: Plugin, css: string): string[] {
  const errors: string[] = [];
  const hook = guard.generateBundle as (this: unknown, options: unknown, bundle: unknown) => void;
  hook.call({ error: (message: string) => errors.push(message) }, {}, {
    'app.css': { type: 'asset', fileName: 'app.css', source: css },
  });
  return errors;
}

describe('钉钉内核构建基线', () => {
  test('build.target 和 cssTarget 固定 chrome100', async () => {
    const { build: options } = await build();
    expect(options.target).toBe('chrome100');
    expect(options.cssTarget).toBe('chrome100');
  });

  test('产物含范围语法或 @container 时构建失败', async () => {
    const guard = (await build()).plugins.find((plugin) => plugin.name === 'assert-webview-css');
    expect(guard).toBeDefined();
    expect(runGuard(guard!, '@media (width<=420px){a{top:0}}')).toHaveLength(1);
    expect(runGuard(guard!, '@container (min-width:1px){a{top:0}}')).toHaveLength(1);
    expect(runGuard(guard!, '@media (max-width:420px){a{top:0}}')).toEqual([]);
    expect(runGuard(guard!, '.\\@container{container-type:inline-size}')).toEqual([]);
  });
});
