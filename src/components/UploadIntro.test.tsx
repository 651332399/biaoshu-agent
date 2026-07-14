import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { UploadIntro } from './UploadIntro';

describe('UploadIntro', () => {
  test('uploads a real local file and triggers backend start', async () => {
    const onStart = vi.fn();
    render(<UploadIntro onStart={onStart} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['招标文件'], '真实招标文件.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => {
      expect(screen.getByText(/AI 正在解构版面并提取关键控制红线/)).toBeInTheDocument();
    });

    expect(onStart).toHaveBeenCalledWith(file);
  });
});
