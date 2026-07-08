import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { DocTree } from './DocTree';
import { kqyy } from '../scenarios/kqyy';

describe('DocTree', () => {
  const engine = {
    revealChapterManually: () => {},
    revealVolumeManually: () => {},
  } as any;

  test('displays waiting state when no volumes are grown', () => {
    render(<DocTree volumes={kqyy.volumes} grownVolumes={[]} focus={null} engine={engine} />);
    expect(screen.getByText(/确定结构后此处长出大纲文件树/)).toBeInTheDocument();
  });

  test('only displays grown volumes and highlights focused chapter', () => {
    render(
      <DocTree
        volumes={kqyy.volumes}
        grownVolumes={['vol.1']}
        focus={{ chapter: 'chap.1' }}
        engine={engine}
      />
    );
    expect(screen.getByText(/第一章 营业执照与 CMA\/CNAS 资质/)).toBeInTheDocument();
    const chapterElement = screen.getByText(/第一章 营业执照与 CMA\/CNAS 资质/).closest('div');
    expect(chapterElement).toHaveClass('font-semibold');
  });
});
