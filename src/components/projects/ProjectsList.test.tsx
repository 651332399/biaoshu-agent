import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, test, expect, vi } from 'vitest';
import { ProjectsList, RecentProjectRow, RECENT_PROJECTS } from './ProjectsList';

afterEach(cleanup);

describe('ProjectsList', () => {
  test('renders all recent projects with their three status labels', () => {
    render(<ProjectsList onNew={vi.fn()} />);

    expect(screen.getByText('北京口腔医院 2026 医用设备计量检测')).toBeInTheDocument();
    expect(screen.getByText('海淀区疾控中心检验设备维保')).toBeInTheDocument();
    expect(screen.getByText('协和医院影像设备计量校准')).toBeInTheDocument();

    expect(screen.getByText('进行中')).toBeInTheDocument();
    expect(screen.getByText('已导出')).toBeInTheDocument();
    expect(screen.getByText('草稿')).toBeInTheDocument();
  });

  test('clicking new-project button triggers onNew', () => {
    const onNew = vi.fn();
    render(<ProjectsList onNew={onNew} />);

    fireEvent.click(screen.getByRole('button', { name: '＋ 新建标书' }));
    expect(onNew).toHaveBeenCalled();
  });

  test('clicking a project row triggers onOpen with its id', () => {
    const onOpen = vi.fn();
    render(<ProjectsList onOpen={onOpen} onNew={vi.fn()} />);

    fireEvent.click(screen.getByText('海淀区疾控中心检验设备维保'));
    expect(onOpen).toHaveBeenCalledWith('haidian-cdc');
  });
});

describe('RecentProjectRow', () => {
  test('renders each status with its own badge style', () => {
    for (const project of RECENT_PROJECTS) {
      const { unmount } = render(<RecentProjectRow project={project} />);
      const label = project.status === 'active' ? '进行中' : project.status === 'exported' ? '已导出' : '草稿';
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });

  test('omitting onOpen does not throw when clicked', () => {
    const project = RECENT_PROJECTS[0];
    render(<RecentProjectRow project={project} />);
    expect(() => fireEvent.click(screen.getByText(project.name))).not.toThrow();
  });
});
