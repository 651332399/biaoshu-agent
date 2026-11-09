import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { afterEach, describe, test, expect, vi, beforeEach } from 'vitest';
import { MaterialsLibrary } from './MaterialsLibrary';
import type { BackendMaterial } from '../../engine/types';

vi.mock('../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api')>('../../lib/api');
  return {
    ...actual,
    listMaterials: vi.fn(),
    uploadMaterial: vi.fn(),
    deleteMaterial: vi.fn(),
  };
});

import { listMaterials, uploadMaterial, deleteMaterial } from '../../lib/api';

const backendMaterials: BackendMaterial[] = [
  { id: 'q1', category: 'qual', name: 'CMA 资质证书', keywords: ['CMA'], file_path: 'assets/q1.png' },
  { id: 'r1', category: 'record', name: '某三甲医院计量业绩', keywords: ['计量'] },
];

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listMaterials).mockResolvedValue(backendMaterials);
  vi.mocked(uploadMaterial).mockResolvedValue(backendMaterials[0]);
  vi.mocked(deleteMaterial).mockResolvedValue({ status: 'deleted' });
});

describe('MaterialsLibrary (backend-connected)', () => {
  test('loads and renders backend materials on mount', async () => {
    render(<MaterialsLibrary materials={[]} matched={[]} />);
    expect(await screen.findByText('CMA 资质证书')).toBeInTheDocument();
    expect(screen.getByText('某三甲医院计量业绩')).toBeInTheDocument();
    expect(screen.getByText('含文件')).toBeInTheDocument(); // file_path 素材显示附件标记
    expect(listMaterials).toHaveBeenCalled();
  });

  test('upload form posts metadata to backend and refreshes', async () => {
    render(<MaterialsLibrary materials={[]} matched={[]} />);
    await screen.findByText('CMA 资质证书');
    fireEvent.click(screen.getByText('＋ 上传资料'));
    fireEvent.change(screen.getByLabelText('素材名称'), { target: { value: '新增人员简历' } });
    fireEvent.change(screen.getByLabelText('关键词'), { target: { value: '工程师, 计量' } });
    fireEvent.click(screen.getByText('提交'));
    await waitFor(() => expect(uploadMaterial).toHaveBeenCalled());
    const [meta] = vi.mocked(uploadMaterial).mock.calls[0];
    expect(meta.name).toBe('新增人员简历');
    expect(meta.keywords).toEqual(['工程师', '计量']);
    expect(meta).not.toHaveProperty('id');
  });

  test('upload rejects empty name without calling backend', async () => {
    render(<MaterialsLibrary materials={[]} matched={[]} />);
    await screen.findByText('CMA 资质证书');
    fireEvent.click(screen.getByText('＋ 上传资料'));
    fireEvent.click(screen.getByText('提交'));
    expect(uploadMaterial).not.toHaveBeenCalled();
    expect(screen.getByText(/请填写素材名称/)).toBeInTheDocument();
  });

  test('delete calls backend', async () => {
    render(<MaterialsLibrary materials={[]} matched={[]} />);
    await screen.findByText('CMA 资质证书');
    fireEvent.click(screen.getByLabelText('删除 CMA 资质证书'));
    await waitFor(() => expect(deleteMaterial).toHaveBeenCalledWith('q1'));
  });

  test('falls back to demo materials when backend unreachable', async () => {
    vi.mocked(listMaterials).mockRejectedValueOnce(new Error('network'));
    render(
      <MaterialsLibrary
        materials={[{ id: 'demo1', category: 'template', 名称: '演示模板' }]}
        matched={[]}
      />,
    );
    expect(await screen.findByText('演示模板')).toBeInTheDocument();
    expect(screen.getByText(/演示数据/)).toBeInTheDocument();
  });
});
