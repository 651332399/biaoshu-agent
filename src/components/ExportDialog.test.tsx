import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { BackendExportPlan } from '../engine/types';
import type { Scenario } from '../engine/demo/types';
import { ExportDialog } from './ExportDialog';
import { setApiBase } from '../lib/apiBase';


class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readonly url: string;
  readonly listeners = new Map<string, EventListener>();
  close = vi.fn();

  constructor(url: string | URL) {
    this.url = String(url);
    FakeEventSource.instances.push(this);
  }

  addEventListener(name: string, listener: EventListener) {
    this.listeners.set(name, listener);
  }

  emit(name: string, data: Record<string, unknown>, lastEventId = '1') {
    const listener = this.listeners.get(name);
    listener?.({ data: JSON.stringify(data), lastEventId } as MessageEvent<string>);
  }
}


afterEach(() => {
  setApiBase('');
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  FakeEventSource.instances = [];
  window.history.pushState({}, '', '/');
});


function makeScenario(): Scenario {
  return {
    id: 'kqyy',
    meta: {
      项目名: '测试项目', 采购人: '测试单位', 采购方式: '公开招标', 评审办法: '综合评分法',
      限价: 1000000, 报价: 900000, 报价利用率: '90%', 保证金: 10000, 服务周期: '12个月',
    },
    strategy: { method: 'composite', 基调: '', 报价基调: '' },
    volumes: [{
      id: 'technical', 名称: '技术文件', 单独密封: false,
      chapters: [{ id: 'c1', 标题: '技术方案', 类型: '自撰区' }],
    }],
    requirements: [], mapping: [], materials: [], blocks: [], redlines: [],
    pricing: { lines: [], 限价: 1000000, 报价: 900000, 利用率: '90%' },
    steps: [],
  };
}


function makeExportPlan(): BackendExportPlan {
  return {
    output_mode: 'single', package_zip: true, naming_pattern: '*.docx',
    volumes: [{
      volume_id: 'technical', role: 'technical', cover_title: '技术文件',
      file_name: '技术文件.docx', section_ids: ['c1'], sealed_separately: false,
      requires_toc: true, requires_seal_page: false, requires_index_table: true, evidence: [],
    }],
  };
}


function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}


function stubGeneration(
  status: 'generation_started' | 'server_precheck_failed' | 'awaiting_wps_acceptance' | 'archiving' | 'accepted' | 'wps_verification_failed',
  options: {
    missing?: string[];
    issues?: { code: string; message: string }[];
    finalApproved?: boolean;
    archiveRetryable?: boolean;
    archivingIssues?: { code: string; message: string }[];
  } = {},
) {
  const finalApproved = options.finalApproved ?? status === 'accepted';
  const fetchMock = vi.fn(async (request: RequestInfo | URL, init?: RequestInit) => {
    const url = String(request);
    if (url.endsWith('/state')) {
      return jsonResponse({
        project_id: 'p1', completed_nodes: [], current_node: null, awaiting_checkpoint: null,
        awaiting_escalation: null, artifacts: [], generation_id: 'g1', generation_status: status,
        server_precheck_passed: true, final_delivery_approved: finalApproved,
      });
    }
    if (url.endsWith('/acceptance') && !init?.method) {
      return jsonResponse({
        project_id: 'p1', generation_id: 'g1', artifact_set_digest: 'digest', status,
        server_precheck_passed: true, final_delivery_approved: finalApproved,
        artifacts: [{
          artifact_id: 'technical-file', file_name: '技术文件.docx',
          required_evidence_types: ['final_docx', 'final_pdf', 'cover', 'font_status', 'typography_color'],
        }],
        required_evidence_slots: [
          'technical-file:final_docx', 'technical-file:final_pdf', 'technical-file:cover',
          'technical-file:font_status', 'technical-file:typography_color',
        ],
        missing_evidence_slots: options.missing ?? [], validation_issues: options.issues ?? [],
        archiving_issues: options.archivingIssues ?? [],
        archive_retryable: options.archiveRetryable ?? false,
        archive_location: status === 'accepted' ? { backend: 'immutable-object-store', objects: {} } : null,
      });
    }
    if (url.endsWith('/wps-acceptance')) return jsonResponse({ status: 'archiving' });
    if (url.endsWith('/wps-evidence')) return jsonResponse({ status: 'stored' });
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('EventSource', FakeEventSource);
  window.history.pushState({}, '', '/?project_id=p1');
  return fetchMock;
}


describe('ExportDialog WPS acceptance', () => {
  test.each(['awaiting_wps_acceptance', 'accepted'] as const)('子路径部署的 %s 请求、事件流和下载入口使用相同前缀', async (status) => {
    setApiBase('/biaoshu/');
    const fetchMock = stubGeneration(status);
    render(<ExportDialog scenario={makeScenario()} backendExportPlan={makeExportPlan()} />);

    const link = await screen.findByRole('link', { name: status === 'accepted' ? /最终交付包/ : /下载预验收包/ });
    expect(link).toHaveAttribute('href', `/biaoshu/api/projects/p1/generations/g1/${status === 'accepted' ? 'delivery-bundle' : 'server-precheck-package'}`);
    if (status === 'awaiting_wps_acceptance') {
      expect(screen.getByRole('link', { name: '下载 技术文件 DOCX' })).toHaveAttribute(
        'href', '/biaoshu/api/projects/p1/generations/g1/artifacts/technical-file/server-docx',
      );
    }
    expect(fetchMock.mock.calls.every(([url]) => String(url).startsWith('/biaoshu/api/'))).toBe(true);
    expect(FakeEventSource.instances[0].url).toBe('/biaoshu/api/projects/p1/generations/g1/acceptance/events');
  });

  test('renders the fixed WPS checklist without the legacy completion action', () => {
    render(<ExportDialog scenario={makeScenario()} backendExportPlan={makeExportPlan()} />);

    expect(screen.getByText('技术文件')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(10);
    for (const label of [
      '已确认 WPS 工作站本地字体可用',
      '已更新全部域',
      '已检查 TOC/PAGEREF',
      '已检查分页',
      '已检查表格',
      '已检查字体',
      '已检查颜色',
      '已保存、关闭并重新打开抽检',
      '已导出最终 PDF',
      '必需验收证据已齐全',
    ]) {
      expect(screen.getByRole('checkbox', { name: label })).not.toBeChecked();
    }
    expect(screen.queryByRole('button', { name: '完成终审' })).not.toBeInTheDocument();
  });

  test.each([
    ['generation_started', '正在生成新版本'],
    ['server_precheck_failed', '服务器预检未通过'],
  ] as const)('renders %s as a non-downloadable lifecycle state', async (status, label) => {
    stubGeneration(status);
    render(<ExportDialog scenario={makeScenario()} backendExportPlan={makeExportPlan()} />);

    expect(await screen.findByText(label)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /下载/ })).not.toBeInTheDocument();
  });

  test('awaiting generation exposes only precheck package and per-volume evidence slots', async () => {
    stubGeneration('awaiting_wps_acceptance', {
      missing: ['technical-file:final_docx', 'technical-file:final_pdf', 'technical-file:cover'],
    });
    render(<ExportDialog scenario={makeScenario()} backendExportPlan={makeExportPlan()} />);

    expect(await screen.findByText('待 WPS 验收')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /下载预验收包/ })).toHaveAttribute(
      'href', '/api/projects/p1/generations/g1/server-precheck-package',
    );
    expect(screen.getByRole('link', { name: '下载 技术文件 DOCX' })).toHaveAttribute(
      'href', '/api/projects/p1/generations/g1/artifacts/technical-file/server-docx',
    );
    expect(screen.getByLabelText('上传 技术文件 最终 DOCX')).toBeInTheDocument();
    expect(screen.getByLabelText('上传 技术文件 最终 PDF')).toBeInTheDocument();
    expect(screen.getByLabelText('上传 技术文件 封面截图')).toBeInTheDocument();
    expect(screen.getByLabelText('上传 技术文件 字体状态')).toBeInTheDocument();
    expect(screen.getByLabelText('上传 技术文件 排版与颜色')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /最终交付包/ })).not.toBeInTheDocument();
    expect(FakeEventSource.instances[0].url).toBe(
      '/api/projects/p1/generations/g1/acceptance/events',
    );
  });

  test('submits acceptance only through the generation endpoint', async () => {
    const fetchMock = stubGeneration('awaiting_wps_acceptance');
    render(<ExportDialog scenario={makeScenario()} backendExportPlan={makeExportPlan()} />);

    const inventory = new File([JSON.stringify({
      os_version: 'Windows 11', wps_version: '12.1',
      fonts: [{ requested_family: 'SimSun', actual_family: 'SimSun', embedded: true, matched: true }],
    })], 'font-inventory.json', { type: 'application/json' });
    fireEvent.change(await screen.findByLabelText('上传 WPS 工作站字体清单'), {
      target: { files: [inventory] },
    });

    const button = await screen.findByRole('button', { name: '提交 WPS 验收' });
    expect(button).toBeDisabled();
    for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox);
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/projects/p1/generations/g1/wps-acceptance',
      expect.objectContaining({ method: 'POST' }),
    ));
    const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/wps-acceptance'));
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
      checks: {
        local_fonts_confirmed: true,
        all_fields_updated: true,
        toc_pageref_checked: true,
        pagination_checked: true,
        tables_checked: true,
        fonts_checked: true,
        colors_checked: true,
        saved_reopened_checked: true,
        final_pdf_exported: true,
        evidence_slots_complete: true,
      },
      font_inventory: { os_version: 'Windows 11', wps_version: '12.1' },
    });
  });

  test('shows validation issues and archiving state', async () => {
    stubGeneration('archiving', {
      issues: [{ code: 'font_mismatch', message: '宋体被替换' }],
    });
    render(<ExportDialog scenario={makeScenario()} backendExportPlan={makeExportPlan()} />);

    expect(await screen.findByText('正在归档')).toBeInTheDocument();
    expect(screen.getByText('宋体被替换')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /最终交付包/ })).not.toBeInTheDocument();
  });

  test('archiving failure displays issues and retries with the frozen request', async () => {
    const fetchMock = stubGeneration('archiving', {
      archiveRetryable: true,
      archivingIssues: [{ code: 'archive_unavailable', message: '对象存储暂不可用' }],
    });
    render(<ExportDialog scenario={makeScenario()} backendExportPlan={makeExportPlan()} />);

    expect(await screen.findByText('对象存储暂不可用')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '重试不可变归档' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/projects/p1/generations/g1/wps-acceptance',
      expect.objectContaining({ method: 'POST', body: undefined }),
    ));
  });

  test('delivery_accepted refreshes the generation into its final state', async () => {
    let accepted = false;
    const fetchMock = vi.fn(async (request: RequestInfo | URL) => {
      const url = String(request);
      if (url.endsWith('/state')) return jsonResponse({
        project_id: 'p1', completed_nodes: [], current_node: null,
        awaiting_checkpoint: null, awaiting_escalation: null, artifacts: [],
        generation_id: 'g1', generation_status: accepted ? 'accepted' : 'archiving',
        server_precheck_passed: true, final_delivery_approved: accepted,
      });
      if (url.endsWith('/acceptance')) return jsonResponse({
        project_id: 'p1', generation_id: 'g1', artifact_set_digest: 'digest',
        status: accepted ? 'accepted' : 'archiving', server_precheck_passed: true,
        final_delivery_approved: accepted, artifacts: [], required_evidence_slots: [],
        missing_evidence_slots: [], validation_issues: [], archiving_issues: [],
        archive_retryable: false,
        archive_location: accepted ? { backend: 'immutable-object-store', objects: {} } : null,
      });
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('EventSource', FakeEventSource);
    window.history.pushState({}, '', '/?project_id=p1');
    render(<ExportDialog scenario={makeScenario()} backendExportPlan={makeExportPlan()} />);
    expect(await screen.findByText('正在归档')).toBeInTheDocument();

    accepted = true;
    FakeEventSource.instances[0].emit('delivery_accepted', { final_delivery_approved: true });

    expect(await screen.findByText('已通过 WPS 验收')).toBeInTheDocument();
  });

  test('accepted generation exposes the final bundle and hides precheck download', async () => {
    stubGeneration('accepted');
    render(<ExportDialog scenario={makeScenario()} backendExportPlan={makeExportPlan()} />);

    expect(await screen.findByText('已通过 WPS 验收')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /下载最终交付包/ })).toHaveAttribute(
      'href', '/api/projects/p1/generations/g1/delivery-bundle',
    );
    expect(screen.queryByRole('link', { name: /下载预验收包/ })).not.toBeInTheDocument();
  });

  test('accepted status without final approval does not expose the final bundle', async () => {
    stubGeneration('accepted', { finalApproved: false });
    render(<ExportDialog scenario={makeScenario()} backendExportPlan={makeExportPlan()} />);

    expect(await screen.findByText('已通过 WPS 验收')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /最终交付包/ })).not.toBeInTheDocument();
  });

  test('online re-export supersedes the old stream and switches to the replacement generation', async () => {
    let stateReads = 0;
    const fetchMock = vi.fn(async (request: RequestInfo | URL) => {
      const url = String(request);
      if (url.endsWith('/state')) {
        stateReads += 1;
        const generationId = stateReads === 1 ? 'g1' : 'g2';
        return jsonResponse({
          project_id: 'p1', completed_nodes: [], current_node: null,
          awaiting_checkpoint: null, awaiting_escalation: null, artifacts: [],
          generation_id: generationId,
          generation_status: generationId === 'g1' ? 'accepted' : 'awaiting_wps_acceptance',
          server_precheck_passed: true,
          final_delivery_approved: generationId === 'g1',
        });
      }
      if (url.includes('/generations/g1/acceptance')) {
        return jsonResponse({
          project_id: 'p1', generation_id: 'g1', artifact_set_digest: 'old', status: 'accepted',
          server_precheck_passed: true, final_delivery_approved: true, artifacts: [],
          required_evidence_slots: [], missing_evidence_slots: [], validation_issues: [],
          archive_location: 'archive/g1',
        });
      }
      if (url.includes('/generations/g2/acceptance')) {
        return jsonResponse({
          project_id: 'p1', generation_id: 'g2', artifact_set_digest: 'new',
          status: 'awaiting_wps_acceptance', server_precheck_passed: true,
          final_delivery_approved: false, artifacts: [], required_evidence_slots: [],
          missing_evidence_slots: [], validation_issues: [], archive_location: null,
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('EventSource', FakeEventSource);
    window.history.pushState({}, '', '/?project_id=p1');
    render(<ExportDialog scenario={makeScenario()} backendExportPlan={makeExportPlan()} />);

    expect(await screen.findByRole('link', { name: /下载最终交付包/ })).toHaveAttribute(
      'href', '/api/projects/p1/generations/g1/delivery-bundle',
    );
    FakeEventSource.instances[0].emit('superseded', {
      replacement_generation_id: 'g2',
      superseded_at: '2026-07-16T01:02:03+00:00',
    });

    await waitFor(() => expect(FakeEventSource.instances[0].close).toHaveBeenCalled());
    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(2));
    expect(FakeEventSource.instances[1].url).toBe(
      '/api/projects/p1/generations/g2/acceptance/events',
    );
    expect(await screen.findByText('Generation: g2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /下载预验收包/ })).toHaveAttribute(
      'href', '/api/projects/p1/generations/g2/server-precheck-package',
    );
    expect(screen.queryByRole('link', { name: /最终交付包/ })).not.toBeInTheDocument();
  });
});
