import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import App from './App';

describe('App Integration', () => {
  test('starts in live backend upload mode without demo controls', () => {
    render(<App />);

    expect(screen.getByText('智能标书编写 Agent 工作台')).toBeInTheDocument();
    // 1c 全局左侧菜单常驻(编辑 / 资料库 / 项目)
    expect(screen.getByRole('button', { name: /资料库/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '选择本地真实招标文件并接入后端' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: '项目切换' })).not.toBeInTheDocument();
    expect(screen.queryByText('Demo')).not.toBeInTheDocument();
  });
});
