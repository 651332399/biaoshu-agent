import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, test, expect } from 'vitest';
import { RequirementListDoc } from './RequirementListDoc';
import type { BackendRequirement } from '../../engine/types';

afterEach(cleanup);

function req(overrides: Partial<BackendRequirement>): BackendRequirement {
  return {
    id: 'req-0001',
    type: '资质',
    text: '要求文本',
    page: null,
    mandatory: false,
    score_weight: null,
    ...overrides,
  };
}

describe('RequirementListDoc', () => {
  test('shows waiting placeholder when there are no requirements', () => {
    render(<RequirementListDoc requirements={[]} />);
    expect(screen.getByText('等待后端解析招标文件,抽取要求清单…')).toBeInTheDocument();
  });

  test('groups requirements by type in GROUP_ORDER, skipping empty groups', () => {
    const requirements = [
      req({ id: 'req-0001', type: '评分', text: '评分项要求' }),
      req({ id: 'req-0002', type: '废标', text: '废标红线要求', mandatory: true }),
    ];
    render(<RequirementListDoc requirements={requirements} />);

    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    // 废标 排在评分之前(GROUP_ORDER 顺序),即使数组中评分先出现
    expect(headings[0]).toContain('废标红线(强制性)');
    expect(headings[1]).toContain('评分项');
    // 未出现的类型分组不渲染
    expect(screen.queryByText(/资质要求/)).not.toBeInTheDocument();
  });

  test('renders mandatory marker, page number and score for a requirement', () => {
    const requirements = [
      req({ id: 'req-0003', type: '技术参数', text: '需带页码与分值', mandatory: true, page: 12, score_weight: 5 }),
    ];
    render(<RequirementListDoc requirements={requirements} />);

    expect(screen.getByText('需带页码与分值')).toBeInTheDocument();
    expect(screen.getByText('★')).toBeInTheDocument();
    expect(screen.getByText('第 12 页')).toBeInTheDocument();
    expect(screen.getByText('5 分')).toBeInTheDocument();
  });

  test('summarizes total count and mandatory count in header', () => {
    const requirements = [
      req({ id: 'req-0001', type: '资质', mandatory: true }),
      req({ id: 'req-0002', type: '商务条款', mandatory: false }),
    ];
    render(<RequirementListDoc requirements={requirements} />);
    expect(screen.getByText((_, element) => element?.tagName === 'P' && /共 2 项/.test(element.textContent ?? ''))).toBeInTheDocument();
  });

  test('renders collapsed summary with original text folded, no summary falls back to full text', () => {
    const requirements = [
      req({
        id: 'req-0001',
        type: '废标',
        mandatory: true,
        text: '这是一句很长的原文，用来在没有摘要时确认前端仍然整段展示',
        summary: '一句话摘要',
      }),
      req({ id: 'req-0002', type: '资质', text: '没有摘要的短要求' }),
    ];
    render(<RequirementListDoc requirements={requirements} />);

    expect(screen.getByText('一句话摘要')).toBeInTheDocument();
    expect(screen.getByText('这是一句很长的原文，用来在没有摘要时确认前端仍然整段展示')).toBeInTheDocument();
    expect(screen.getByText('没有摘要的短要求')).toBeInTheDocument();
  });

  test('shows screenshot badge when needs_manual_screenshot is true', () => {
    const requirements = [
      req({ id: 'req-0001', type: '废标', needs_manual_screenshot: true }),
      req({ id: 'req-0002', type: '资质', needs_manual_screenshot: false }),
    ];
    render(<RequirementListDoc requirements={requirements} />);

    expect(screen.getAllByText('📷 需截图留证')).toHaveLength(1);
  });
});
