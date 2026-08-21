// 后端基地址。浏览器里前后端同源，基地址是空串；WPS 任务窗格从
// http://127.0.0.1:3889 加载，与后端不同源，必须显式指定。
//
// 做成模块级可注入的一个值，而不是把 api.ts 重构成 ApiClient 类：
// 真实需求只有「换个基地址」，23 个调用点的签名不必为此改动。

let base = '';

/** 空串 = 同源。末尾斜杠会被去掉，避免拼出 `//api/...`。 */
export function setApiBase(value: string): void {
  base = value.replace(/\/+$/, '');
}

export function getApiBase(): string {
  return base;
}

/**
 * 拼接后端地址。已经是绝对地址的原样返回——预签名上传地址指向对象存储，
 * 套上基地址会直接打错目标。
 */
export function apiUrl(path: string): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) return path;
  return base ? `${base}${path}` : path;
}
