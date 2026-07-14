import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, test, expect, vi } from 'vitest';
import { ProjectsList, RecentProjectRow, type RecentProject } from './ProjectsList';

const PROJECTS = [
  { id: 'p1', name: '真实项目一', status: 'active', completed_steps: 6, total_steps: 9, current_node: 'generate', updated_at: 3 },
  { id: 'p2', name: '真实项目二', status: 'exported', completed_steps: 9, total_steps: 9, current_node: null, updated_at: 2 },
  { id: 'p3', name: '真实项目三', status: 'draft', completed_steps: 0, total_steps: 9, current_node: 'ingest', updated_at: 1 },
] as const;

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(PROJECTS), {
    status: 200, headers: { 'content-type': 'application/json' },
  })));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ProjectsList', () => {
  test('renders projects returned by the backend with their status labels', async () => {
    render(<ProjectsList onNew={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('真实项目一')).toBeInTheDocument());
    expect(screen.getByText('真实项目二')).toBeInTheDocument();
    expect(screen.getByText('真实项目三')).toBeInTheDocument();

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

  test('clicking a project row triggers onOpen with its id', async () => {
    const onOpen = vi.fn();
    render(<ProjectsList onOpen={onOpen} onNew={vi.fn()} />);

    fireEvent.click(await screen.findByText('真实项目二'));
    expect(onOpen).toHaveBeenCalledWith('p2');
  });
});

describe('RecentProjectRow', () => {
  test('renders each status with its own badge style', () => {
    const projects: RecentProject[] = [
      { id: 'a', name: 'A', status: 'active', meta: 'x' },
      { id: 'b', name: 'B', status: 'exported', meta: 'x' },
      { id: 'c', name: 'C', status: 'draft', meta: 'x' },
    ];
    for (const project of projects) {
      const { unmount } = render(<RecentProjectRow project={project} />);
      const label = project.status === 'active' ? '进行中' : project.status === 'exported' ? '已导出' : '草稿';
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });

  test('omitting onOpen does not throw when clicked', () => {
    const project: RecentProject = { id: 'a', name: 'A', status: 'active', meta: 'x' };
    render(<RecentProjectRow project={project} />);
    expect(() => fireEvent.click(screen.getByText(project.name))).not.toThrow();
  });
});
