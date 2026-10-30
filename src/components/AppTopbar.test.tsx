import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { AppTopbar, PLATFORM_URL } from './AppTopbar';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stubMe(body: unknown, ok = true) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok, json: async () => body })));
}

describe('AppTopbar', () => {
  test('shows brand, employee name, return link and the platform account', async () => {
    stubMe({ displayName: '张三', email: 'z@x.cn', activeTenant: { name: '演示企业' } });
    render(<AppTopbar />);
    expect(screen.getByAltText('智员')).toBeInTheDocument();
    expect(screen.getByText('标书生成员')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回智员平台' })).toHaveAttribute('href', PLATFORM_URL);
    expect(await screen.findByRole('button', { name: '账号：张三' })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('/api/auth/me', expect.objectContaining({ credentials: 'same-origin' }));
  });

  test('hides the account area when the platform session is unavailable', async () => {
    stubMe(null, false);
    render(<AppTopbar />);
    await Promise.resolve();
    expect(screen.queryByRole('button', { name: /账号/ })).not.toBeInTheDocument();
  });

  test('hides logo and return link when embedded in the platform iframe', () => {
    stubMe(null, false);
    vi.spyOn(window, 'top', 'get').mockReturnValue({} as Window);
    render(<AppTopbar />);
    expect(screen.queryByAltText('智员')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '返回智员平台' })).not.toBeInTheDocument();
    expect(screen.getByText('标书生成员')).toBeInTheDocument();
  });

  describe('logout', () => {
    async function runLogout({ logoutStatus = 204, issueStatus = 200 } = {}) {
      const top = { location: { href: '/biaoshu/' } };
      vi.spyOn(window, 'top', 'get').mockReturnValue(top as unknown as Window);
      const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        if (url === '/api/auth/logout') return { ok: logoutStatus < 300, status: logoutStatus };
        if ((init?.headers as Record<string, string> | undefined)?.['X-CSRF-Issue']) {
          return { ok: issueStatus < 300, status: issueStatus, json: async () => ({ csrfToken: 'csrf-1' }) };
        }
        return { ok: true, status: 200, json: async () => ({ displayName: '张三', activeTenant: { name: '演示企业' } }) };
      });
      vi.stubGlobal('fetch', fetchMock);
      render(<AppTopbar />);
      const account = await screen.findByRole('button', { name: '账号：张三' });
      fireEvent.keyDown(account, { key: 'ArrowDown' });
      fireEvent.click(await screen.findByRole('menuitem', { name: '退出登录' }));
      await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(issueStatus < 300 ? 3 : 2));
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      return { top, fetchMock };
    }

    test('navigates to the platform login after a successful logout', async () => {
      const { top, fetchMock } = await runLogout();
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST', headers: { 'X-CSRF-Token': 'csrf-1' } }));
      expect(top.location.href).toBe('/login');
    });

    test('navigates to login when the session has already expired', async () => {
      const { top } = await runLogout({ issueStatus: 401 });
      expect(top.location.href).toBe('/login');
    });

    test('stays on the page and reports failure when logout is rejected', async () => {
      const { top } = await runLogout({ logoutStatus: 403 });
      expect(top.location.href).toBe('/biaoshu/');
      expect(await screen.findByRole('alert')).toHaveTextContent('退出失败');
      expect(screen.getByRole('button', { name: '账号：张三' })).toBeInTheDocument();
    });

    test('does not navigate with a live session when CSRF issuance fails', async () => {
      const { top, fetchMock } = await runLogout({ issueStatus: 503 });
      expect(fetchMock.mock.calls.some(([url]) => url === '/api/auth/logout')).toBe(false);
      expect(top.location.href).toBe('/biaoshu/');
      expect(await screen.findByRole('alert')).toHaveTextContent('退出失败');
    });
  });
});
