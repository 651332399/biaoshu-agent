import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, test, expect } from 'vitest';
import { RiskWarningCard } from './RiskWarningCard';
import type { PricingWarning } from '../../engine/demo/types';

afterEach(cleanup);

describe('RiskWarningCard', () => {
  test('renders nothing when there are no items', () => {
    const { container } = render(<RiskWarningCard items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('renders a high-risk item with red styling', () => {
    const items: PricingWarning[] = [
      { level: 'high', title: '报价异常低', detail: '低于成本价 12%,存在废标风险' },
    ];
    render(<RiskWarningCard items={items} />);
    expect(screen.getByText('高危')).toBeInTheDocument();
    expect(screen.getByText(/报价异常低/)).toBeInTheDocument();
    expect(screen.getByText(/低于成本价 12%,存在废标风险/)).toBeInTheDocument();

    const card = screen.getByText('高危').closest('div.flex');
    expect(card).toHaveClass('border-red-200', 'bg-red-50', 'text-red-700');
  });

  test('renders a medium-risk item with amber styling', () => {
    const items: PricingWarning[] = [
      { level: 'medium', title: '费率超标', detail: '管理费率超过限价要求上限' },
    ];
    render(<RiskWarningCard items={items} />);
    expect(screen.getByText('中危')).toBeInTheDocument();

    const card = screen.getByText('中危').closest('div.flex');
    expect(card).toHaveClass('border-amber-200', 'bg-amber-50', 'text-amber-700');
  });

  test('renders multiple items together', () => {
    const items: PricingWarning[] = [
      { level: 'high', title: '关键项漏报', detail: '未见检测周期报价' },
      { level: 'medium', title: '费率超标', detail: '管理费率超过限价要求上限' },
    ];
    render(<RiskWarningCard items={items} />);
    expect(screen.getByText(/关键项漏报/)).toBeInTheDocument();
    expect(screen.getByText(/费率超标/)).toBeInTheDocument();
  });
});
