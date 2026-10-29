import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { DropdownMenu } from '../vendor/zy-ui';

export const EMPLOYEE_NAME = '标书生成员';
export const PLATFORM_URL = 'https://zhiyuan.guixucloud.cn/';

type Account = { displayName: string; tenantName: string };

function isEmbedded() {
  try {
    return window.top !== window.self;
  } catch {
    return true; // 跨域父页面
  }
}

/** 平台会话与本应用同域（/biaoshu/ 子路径），直接读平台 /api/auth/me；独立部署或未登录时不显示账号区。 */
function usePlatformAccount() {
  const [account, setAccount] = useState<Account | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then((response) => (response.ok ? response.json() : null))
      .then((me: { displayName?: string | null; email?: string; activeTenant?: { name?: string } | null } | null) => {
        const displayName = me?.displayName || me?.email;
        if (!cancelled && displayName) setAccount({ displayName, tenantName: me?.activeTenant?.name ?? '' });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return account;
}

/** 平台登出需要 CSRF token，按需签发后提交，最后回到平台登录页。 */
async function logout() {
  try {
    const me = await fetch('/api/auth/me', { credentials: 'same-origin', headers: { 'X-CSRF-Issue': '1' } });
    const csrf = me.ok ? ((await me.json()) as { csrfToken?: string }).csrfToken : undefined;
    if (csrf) await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': csrf } });
  } finally {
    (window.top ?? window).location.href = '/login';
  }
}

/** 智员员工应用统一顶栏（平台 DESIGN.md「员工应用规范 · 应用外壳」）。被平台 iframe 内嵌时隐藏 logo 与返回入口。 */
export function AppTopbar() {
  const embedded = isEmbedded();
  const account = usePlatformAccount();
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--zy-line)] bg-[var(--zy-surface)] px-6 z-30">
      <div className="flex items-center gap-3">
        {!embedded && (
          <>
            <img className="h-6" src="/assets/brand/zhiyuan-logo-v1.svg" alt="智员" />
            <span className="h-4 w-px bg-[var(--zy-line)]" aria-hidden="true" />
          </>
        )}
        <span className="text-sm font-bold text-[var(--zy-text)]">{EMPLOYEE_NAME}</span>
      </div>
      <div className="flex items-center gap-4">
        {!embedded && (
          <a className="text-[13px] font-medium text-[var(--zy-blue)] hover:text-[var(--zy-blue-dark)]" href={PLATFORM_URL} target="_top">
            返回智员平台
          </a>
        )}
        {account && (
          <DropdownMenu
            trigger={
              <button
                type="button"
                className="flex items-center gap-2 rounded-[10px] px-1.5 py-1 text-[13px] text-[var(--zy-text)] hover:bg-[var(--zy-bg)]"
                aria-label={`账号：${account.displayName}`}
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-[var(--zy-blue-bg)] text-[13px] font-bold text-[var(--zy-blue)]"
                  aria-hidden="true"
                >
                  {account.displayName.slice(0, 1)}
                </span>
                <span>{account.displayName}</span>
                <ChevronDown size={14} aria-hidden="true" className="text-[var(--zy-muted)]" />
              </button>
            }
            items={[
              ...(account.tenantName ? [{ label: account.tenantName, disabled: true, onSelect: () => {} }] : []),
              { label: '退出登录', onSelect: () => void logout() },
            ]}
          />
        )}
      </div>
    </header>
  );
}
