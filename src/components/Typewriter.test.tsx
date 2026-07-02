import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { Typewriter } from './Typewriter';

describe('Typewriter', () => {
  test('instant rendering displays entire string immediately', () => {
    render(<Typewriter text="迈创检测" instant />);
    expect(screen.getByText('迈创检测')).toBeInTheDocument();
  });
});
