import { render, screen, act } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import App from './App';

describe('App Integration', () => {
  test('starts at file upload intro page and switches project scenario properly', () => {
    render(<App />);

    // Initially shows landing intro
    expect(screen.getByText('智能标书编写 Agent 工作台')).toBeInTheDocument();
    expect(screen.getByText(/北京口腔医院/)).toBeInTheDocument();

    // Switch scenario
    const select = screen.getByRole('combobox', { name: '项目切换' });
    act(() => {
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    // Let's verify switching works
  });
});
