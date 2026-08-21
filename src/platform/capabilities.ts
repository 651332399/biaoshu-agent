// 运行时探测与单例。业务代码用 getRuntime()，不自己 new。

import { BrowserRuntime } from './BrowserRuntime';
import { WpsRuntime, getWpsGlobal } from './WpsRuntime';
import type { RuntimeAdapter, RuntimeKind } from './RuntimeAdapter';

/**
 * 判据是「有没有 FileSystem 桥」，不是 UA 串。
 * 任务窗格的 UA 是普通 Chrome 加一段 `WpsOfficeApp/…`，靠 UA 判会把
 * 「WPS 里打开的普通网页」也误判成加载项环境——那里没有 JSAPI 桥。
 */
export function detectRuntime(): RuntimeKind {
  const wps = getWpsGlobal();
  return typeof wps?.FileSystem?.ReadFileAsArrayBuffer === 'function' ? 'wps' : 'browser';
}

export function createRuntime(kind: RuntimeKind = detectRuntime()): RuntimeAdapter {
  return kind === 'wps' ? new WpsRuntime() : new BrowserRuntime();
}

let cached: RuntimeAdapter | null = null;

export function getRuntime(): RuntimeAdapter {
  if (!cached) cached = createRuntime();
  return cached;
}

/** 测试用：清掉单例，避免用例间互相污染。 */
export function resetRuntime(): void {
  cached = null;
}
