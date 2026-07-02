import { render, screen, act } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { UploadIntro } from './UploadIntro';

describe('UploadIntro', () => {
  test('allows quick-starting and triggers parsing progress', () => {
    vi.useFakeTimers();
    const onStart = vi.fn();
    render(<UploadIntro onStart={onStart} projectName="北京口腔医院检测项目" />);

    // Click direct load
    screen.getByRole('button', { name: /直接加载预置的/ }).click();
    expect(screen.getByText(/AI 正在解构版面并提取关键控制红线/)).toBeInTheDocument();

    // Fast-forward parsing simulation
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onStart).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
