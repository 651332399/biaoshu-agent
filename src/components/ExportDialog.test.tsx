import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, test, expect, vi } from 'vitest';
import { ExportDialog } from './ExportDialog';
import type { BackendExportPlan } from '../engine/types';
import type { Scenario } from '../engine/demo/types';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.pushState({}, '', '/');
});

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
    render(<ExportDialog scenario={scenario} onConfirm={vi.fn()} />);

    expect(screen.getByText('📕 商务卷')).toBeInTheDocument();
    expect(screen.getByText('📕 资质卷')).toBeInTheDocument();
    expect(screen.getByText('· 公司简介')).toBeInTheDocument();
    expect(screen.getByText('· 资质证书')).toBeInTheDocument();
  });

  test('prefers backend export plan volume names and file names', () => {
    const scenario = makeScenario();
    const backendExportPlan: BackendExportPlan = {
      output_mode: 'three_volume',
      package_zip: true,
      naming_pattern: '*.docx',
      volumes: [
        {
          volume_id: 'qualification',
          cover_title: '资格证明文件',
          file_name: '资格证明文件-测试项目.docx',
          section_ids: ['s1'],
          sealed_separately: true,
          requires_toc: true,
          requires_seal_page: true,
          requires_index_table: true,
          evidence: [],
        },
      ],
    };
    render(
      <ExportDialog
        scenario={scenario}
        backendExportPlan={backendExportPlan}
        backendOutline={{ sections: [{ id: 's1', title: '资格审查索引表', maps_to_requirement_ids: [], asset_refs: [] }] }}
        serverDocxUrl="/api/projects/p/artifacts/export.zip"
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText('📕 资格证明文件')).toBeInTheDocument();
    expect(screen.getByText('文件命名：资格证明文件-测试项目.docx')).toBeInTheDocument();
    expect(screen.getByText('· 资格审查索引表')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /下载分册打包 ZIP/ })).toBeInTheDocument();
    expect(screen.queryByText('📕 商务卷')).not.toBeInTheDocument();
  });

  test('shows seal warning only for volumes with 单独密封 true', () => {
    const scenario = makeScenario();
    render(<ExportDialog scenario={scenario} onConfirm={vi.fn()} />);

    const sealWarnings = screen.getAllByText('需单独签章密封');
    expect(sealWarnings).toHaveLength(1);
    expect(screen.getByText('★ 须单独密封')).toBeInTheDocument();
  });

  test('confirm button is disabled until all checklist items are checked', () => {
    const scenario = makeScenario();
    const onConfirm = vi.fn();
    render(<ExportDialog scenario={scenario} onConfirm={onConfirm} />);

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
    render(<ExportDialog scenario={scenario} onConfirm={onConfirm} />);

    checkAllItems();

    const confirmButton = screen.getByRole('button', { name: '完成终审' });
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('server download regenerates from current editor blocks before opening artifact', async () => {
    window.history.pushState({}, '', '/?project_id=p1');
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      status: 'exported', url: '/api/projects/p1/artifacts/export/fresh.zip',
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const scenario = makeScenario({
      blocks: [{ id: 'b1', chapterId: 'c1', render: 'prose', 标题: '公司简介', prose: '人工编辑' }],
    });
    render(
      <ExportDialog
        scenario={scenario}
        serverDocxUrl="/api/projects/p1/artifacts/export/old.zip"
        onConfirm={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /下载分册打包 ZIP/ }));

    await waitFor(() => expect(open).toHaveBeenCalledWith(
      '/api/projects/p1/artifacts/export/fresh.zip', '_blank', 'noopener,noreferrer',
    ));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ blocks: scenario.blocks });
  });
});
