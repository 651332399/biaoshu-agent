import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, test, expect } from 'vitest';
import { MaterialsLibrary } from './MaterialsLibrary';
import { kqyy } from '../../scenarios/kqyy';

afterEach(cleanup);

describe('MaterialsLibrary', () => {
  test('renders four status states: used / available / warn / missing', () => {
    render(<MaterialsLibrary materials={kqyy.materials} matched={['mat.cnas']} />);
    // 命中(used)
    expect(screen.getAllByText('本项目已用').length).toBeGreaterThan(0);
    // 可用(available)
    expect(screen.getAllByText('可用').length).toBeGreaterThan(0);
    // 口径警告(warn)
    expect(screen.getByText('⚠️ 口径警告')).toBeInTheDocument();
    // 缺失(missing) — kqyy 场景数据中 'device' 分类没有任何资料
    expect(screen.getByText('⛔ 缺失', { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/暂无该分类资料/)).toBeInTheDocument();
  });

  test('simulated upload appends a pending material card', () => {
    render(<MaterialsLibrary materials={kqyy.materials} matched={[]} />);

    const file = new File(['dummy'], 'new-cert.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText('上传资料文件') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText('待审核')).toBeInTheDocument();
    expect(screen.getByText('new-cert.pdf')).toBeInTheDocument();
  });
});
