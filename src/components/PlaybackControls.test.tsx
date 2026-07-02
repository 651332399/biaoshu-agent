import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { PlaybackControls } from './PlaybackControls';

describe('PlaybackControls', () => {
  test('play button fires onPlay when paused', () => {
    const onPlay = vi.fn();
    render(
      <PlaybackControls
        status="paused"
        speed={1}
        onPlay={onPlay}
        onPause={vi.fn()}
        onStep={vi.fn()}
        onSpeed={vi.fn()}
      />
    );
    screen.getByRole('button', { name: '播放' }).click();
    expect(onPlay).toHaveBeenCalled();
  });

  test('shows pause button when playing', () => {
    const onPause = vi.fn();
    render(
      <PlaybackControls
        status="playing"
        speed={1}
        onPlay={vi.fn()}
        onPause={onPause}
        onStep={vi.fn()}
        onSpeed={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: '暂停' })).toBeInTheDocument();
    screen.getByRole('button', { name: '暂停' }).click();
    expect(onPause).toHaveBeenCalled();
  });
});
