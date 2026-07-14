import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { EvidenceConfirmBar } from './EvidenceConfirmBar';
import type { EvidenceChipData } from '../../engine/demo/types';

describe('EvidenceConfirmBar', () => {
  test('renders confirm bar for hit chip', () => {
    const chips: EvidenceChipData[] = [
      { text: 'CNAS认可证书', materialId: 'mat.cnas', status: 'hit' },
    ];
    render(<EvidenceConfirmBar chips={chips} />);
    expect(screen.getByText(/证据已插入/)).toBeInTheDocument();
    expect(screen.getByText(/mat.cnas/)).toBeInTheDocument();
  });

  test('does not render for missing chip', () => {
    const chips: EvidenceChipData[] = [
      { text: 'ISO9001', materialId: 'mat.iso', status: 'missing' },
    ];
    const { container } = render(<EvidenceConfirmBar chips={chips} />);
    expect(container).toBeEmptyDOMElement();
  });
});
