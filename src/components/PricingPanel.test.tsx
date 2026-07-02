import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { PricingPanel } from './PricingPanel';
import type { Pricing } from '../engine/types';

describe('PricingPanel', () => {
  const mockPricing: Pricing = {
    lines: [{ 项目: '物理检定', 数量: 10, 单价: 100, 小计: 1000 }],
    限价: 2000,
    报价: 1980,
    利用率: '99.00%',
    压线告警: '高能竞争贴底风险',
  };

  test('displays prices, utilization metrics, and warnings', () => {
    render(<PricingPanel pricing={mockPricing} />);
    expect(screen.getByText(/¥1,980/)).toBeInTheDocument();
    expect(screen.getByText(/利用率 99.00%/)).toBeInTheDocument();
    expect(screen.getByText(/高能竞争贴底风险/)).toBeInTheDocument();
  });
});
