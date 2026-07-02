import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { DocBlock } from './DocBlock';
import type { DocBlockData } from '../engine/types';

describe('DocBlock', () => {
  const tableBlock: DocBlockData = {
    id: 'blk.dev',
    chapterId: 'chap.7',
    render: 'table',
    标题: '参数偏离表',
    table: {
      headers: ['要求', '响应'],
      rows: [['5天', '1天']],
    },
  };

  test('renders table block headers and values', () => {
    render(
      <DocBlock
        block={tableBlock}
        instant={true}
        locked={false}
        onLock={vi.fn()}
        onEditSave={vi.fn()}
      />
    );
    expect(screen.getByText('要求')).toBeInTheDocument();
    expect(screen.getByText('5天')).toBeInTheDocument();
  });

  test('renders attachment badge matching corporate material', () => {
    const attachBlock: DocBlockData = {
      id: 'blk.cnas',
      chapterId: 'chap.1',
      render: 'attachment',
      标题: 'CNAS认可证书',
      attachment: {
        名称: 'CNAS_Cert.pdf',
        materialId: 'mat.cnas',
      },
    };
    render(
      <DocBlock
        block={attachBlock}
        instant={true}
        locked={false}
        onLock={vi.fn()}
        onEditSave={vi.fn()}
      />
    );
    expect(screen.getByText('CNAS_Cert.pdf')).toBeInTheDocument();
    expect(screen.getByText('✓ 合规插入')).toBeInTheDocument();
  });
});
