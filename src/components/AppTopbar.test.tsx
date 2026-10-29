import { cleanup, render, screen } from '@testing-library/react';
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
});
