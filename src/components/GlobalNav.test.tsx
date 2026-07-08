import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, test, expect, vi } from 'vitest';
import { GlobalNav } from './GlobalNav';

afterEach(cleanup);

describe('GlobalNav', () => {
  test('renders the three top-level nav items', () => {
    render(<GlobalNav view="editor" onNavigate={() => {}} />);
    expect(screen.getByRole('button', { name: /编辑/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /资料库/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /项目/ })).toBeInTheDocument();
  });

  test('marks only the active view as current and highlights it', () => {
    render(<GlobalNav view="library" onNavigate={() => {}} />);
    const editorBtn = screen.getByRole('button', { name: /编辑/ });
    const libraryBtn = screen.getByRole('button', { name: /资料库/ });
    const projectsBtn = screen.getByRole('button', { name: /项目/ });

    expect(libraryBtn).toHaveAttribute('aria-current', 'page');
    expect(editorBtn).not.toHaveAttribute('aria-current');
    expect(projectsBtn).not.toHaveAttribute('aria-current');
  });

  test('clicking each of the three items calls onNavigate with its view', () => {
    const onNavigate = vi.fn();
    render(<GlobalNav view="editor" onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole('button', { name: /资料库/ }));
    expect(onNavigate).toHaveBeenLastCalledWith('library');

    fireEvent.click(screen.getByRole('button', { name: /项目/ }));
    expect(onNavigate).toHaveBeenLastCalledWith('projects');

    fireEvent.click(screen.getByRole('button', { name: /编辑/ }));
    expect(onNavigate).toHaveBeenLastCalledWith('editor');

    expect(onNavigate).toHaveBeenCalledTimes(3);
  });
});
