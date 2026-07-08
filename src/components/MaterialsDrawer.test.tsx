import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { MaterialsDrawer } from './MaterialsDrawer';
import { kqyy } from '../scenarios/kqyy';

describe('MaterialsDrawer', () => {
  test('renders matching elements and displays warnings correctly', () => {
    render(
      <MaterialsDrawer
        materials={kqyy.materials}
        matched={['mat.cnas']}
        focus={{ material: 'mat.cnas', drawer: 'qual' }}
      />
    );
    // Focused drawer opens automatically; the toggle is labelled for assistive tech.
    expect(screen.getByRole('button', { name: '资料库' })).toBeInTheDocument();
    expect(screen.getByText(/CNAS 认可证书/)).toBeInTheDocument();
    expect(screen.getByText('✓ 选中')).toBeInTheDocument();
    expect(screen.getByText(/口径置信度需人工决断/)).toBeInTheDocument();
  });
});
