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
    // Click drawer to open
    screen.getByRole('button', { name: /公司资料库/ }).click();
    expect(screen.getByText(/CNAS 认可证书/)).toBeInTheDocument();
    expect(screen.getByText('✓ 选中')).toBeInTheDocument();
    expect(screen.getByText(/口径置信度需人工决断/)).toBeInTheDocument();
  });
});
