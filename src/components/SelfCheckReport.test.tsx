import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { SelfCheckReport } from './SelfCheckReport';
import type { RedlineCheck } from '../engine/types';

describe('SelfCheckReport', () => {
  const mockRedlines: RedlineCheck[] = [
    { id: 'rl.1', 项: '控标底限价校验', 结果: 'pass' },
    { id: 'rl.2', 项: '索引表漏填自检', 结果: 'fail' },
  ];

  test('filters checks to only show revealed items and applies overrides', () => {
    render(
      <SelfCheckReport
        redlines={mockRedlines}
        revealed={['rl.1', 'rl.2']}
        overrides={{ 'rl.2': 'warn' }}
      />
    );
    expect(screen.getByText('控标底限价校验')).toBeInTheDocument();
    expect(screen.getByText('索引表漏填自检')).toBeInTheDocument();

    const redlineElement = screen.getByText('索引表漏填自检').closest('li');
    expect(redlineElement).toHaveAttribute('data-result', 'warn');
  });
});
