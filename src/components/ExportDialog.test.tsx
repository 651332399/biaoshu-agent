import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, test, expect, vi } from 'vitest';
import { ExportDialog } from './ExportDialog';
import type { Scenario } from '../engine/demo/types';

afterEach(cleanup);

function makeScenario(overrides?: Partial<Scenario>): Scenario {
  return {
    id: 'kqyy',
    meta: {
      项目名: '测试项目',
      采购人: '测试单位',
      采购方式: '公开招标',
      评审办法: '综合评分法',
      限价: 1000000,
      报价: 900000,
      报价利用率: '90%',
      保证金: 10000,
      服务周期: '12个月',
    },
    strategy: { method: 'composite', 基调: '', 报价基调: '' },
    volumes: [
      {
        id: 'v1',
        名称: '商务卷',
        单独密封: false,
        chapters: [{ id: 'c1', 标题: '公司简介', 类型: '自撰区' }],
      },
      {
        id: 'v2',
        名称: '资质卷',
        单独密封: true,
        chapters: [{ id: 'c2', 标题: '资质证书', 类型: '填空区' }],
      },
    ],
    requirements: [],
    mapping: [],
    materials: [],
    blocks: [],
    redlines: [],
    pricing: { lines: [], 限价: 1000000, 报价: 900000, 利用率: '90%' },
    steps: [],
    ...overrides,
  };
}

function checkAllItems() {
  fireEvent.click(screen.getByRole('checkbox', { name: '格式合规自检已通过' }));
  fireEvent.click(screen.getByRole('checkbox', { name: '偏离表已核对' }));
  fireEvent.click(screen.getByRole('checkbox', { name: '资料库缺失项已清零' }));
  fireEvent.click(screen.getByRole('checkbox', { name: '密封/签章要求已逐册确认' }));
}

describe('ExportDialog', () => {
  test('renders volume list with names and chapters', () => {
    const scenario = makeScenario();
    render(<ExportDialog scenario={scenario} onClose={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.getByText('📕 商务卷')).toBeInTheDocument();
    expect(screen.getByText('📕 资质卷')).toBeInTheDocument();
    expect(screen.getByText('· 公司简介')).toBeInTheDocument();
    expect(screen.getByText('· 资质证书')).toBeInTheDocument();
  });

  test('shows seal warning only for volumes with 单独密封 true', () => {
    const scenario = makeScenario();
    render(<ExportDialog scenario={scenario} onClose={vi.fn()} onConfirm={vi.fn()} />);

    const sealWarnings = screen.getAllByText('需单独签章密封');
    expect(sealWarnings).toHaveLength(1);
    expect(screen.getByText('★ 须单独密封')).toBeInTheDocument();
  });

  test('confirm button is disabled until all checklist items are checked', () => {
    const scenario = makeScenario();
    const onConfirm = vi.fn();
    render(<ExportDialog scenario={scenario} onClose={vi.fn()} onConfirm={onConfirm} />);

    const confirmButton = screen.getByRole('button', { name: '完成终审' });
    expect(confirmButton).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox', { name: '格式合规自检已通过' }));
    expect(confirmButton).toBeDisabled();

    fireEvent.click(confirmButton);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test('confirm button becomes enabled and triggers onConfirm once all items are checked', () => {
    const scenario = makeScenario();
    const onConfirm = vi.fn();
    render(<ExportDialog scenario={scenario} onClose={vi.fn()} onConfirm={onConfirm} />);

    checkAllItems();

    const confirmButton = screen.getByRole('button', { name: '完成终审' });
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
