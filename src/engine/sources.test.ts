import { describe, expect, test, vi, afterEach } from 'vitest';
import { LiveSource, makeLiveScenario } from './sources';

function message(data: unknown, id: string) {
  return { data: JSON.stringify(data), lastEventId: id } as MessageEvent<string>;
}

describe('LiveSource', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('consumes shared-style events into EngineState', async () => {
    const source = new LiveSource(makeLiveScenario(), () => ({ addEventListener() {}, close() {} }) as unknown as EventSource);
    const states: string[] = [];
    source.subscribe((state) => states.push(state.status));

    await source.handleEvent('run_started', message({ project_id: 'p1', resume_from: null }, '1'));
    await source.handleEvent('node_started', message({ node: 'ingest', stage_index: 1 }, '2'));
    await source.handleEvent('node_progress', message({ node: 'ingest', message: '读取文件', pct: 10 }, '3'));

    expect(source.getState().activeStage).toBe(1);
    expect(source.getState().logs.map((log) => log.text)).toContain('读取文件');
    expect(states).toContain('playing');
  });

  test('loads requirements artifact and creates confirmation card', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([
      {
        id: 'req-0001',
        type: '废标',
        text: '不得超过最高限价',
        page: 1,
        mandatory: true,
        score_weight: null,
      },
    ]), { status: 200, headers: { 'content-type': 'application/json' } })));
    const scenario = makeLiveScenario();
    const source = new LiveSource(scenario, () => ({ addEventListener() {}, close() {} }) as unknown as EventSource);

    await source.handleEvent('artifact_ready', message({ node: 'analyze', artifact_type: 'requirements', url: '/r.json' }, '4'));
    await source.handleEvent('confirm_request', message({ checkpoint: 1, artifact_url: '/r.json' }, '5'));

    expect(source.getState().backendRequirements).toHaveLength(1);
    expect(scenario.requirements[0].标识).toBe('★');
    expect(scenario.requirements[0].类型).toBe('废标');
    expect(scenario.requirements[0].page).toBe(1);
    expect(source.getState().status).toBe('awaiting');
    expect(source.getState().pendingCard?.kind).toBe('checkpoint');
  });

  test('confirmCheckpoint without edits sends approve, with edits sends edit payload', async () => {
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'POST') {
        calls.push({ url, body: JSON.parse(String(init.body)) });
        return new Response(JSON.stringify({ status: 'accepted' }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url.endsWith('/state')) {
        return new Response(JSON.stringify({
          project_id: 'p1',
          completed_nodes: ['ingest', 'analyze'],
          current_node: null,
          awaiting_checkpoint: 1,
          artifacts: [],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
    }));
    const source = new LiveSource(makeLiveScenario(), () => ({ addEventListener() {}, close() {} }) as unknown as EventSource);
    await source.restoreProject('p1');

    await source.confirmCheckpoint();
    expect(calls.at(-1)?.body.action).toBe('approve');
    expect(calls.at(-1)?.body.edited_artifact).toBeUndefined();

    const edited = [{ id: 'req-0001', type: '废标' as const, text: '改写后', page: 1, mandatory: true, score_weight: null }];
    await source.confirmCheckpoint(edited);
    expect(calls.at(-1)?.body.action).toBe('edit');
    expect(calls.at(-1)?.body.edited_artifact).toHaveLength(1);
    expect(source.getState().backendRequirements[0].text).toBe('改写后');
  });

  test('run_failed becomes visible error state', async () => {
    const source = new LiveSource(makeLiveScenario(), () => ({ addEventListener() {}, close() {} }) as unknown as EventSource);
    await source.handleEvent('run_failed', message({ node: 'analyze', error_type: 'RuntimeError', message: 'no key' }, '2'));

    expect(source.getState().status).toBe('paused');
    expect(source.getState().error).toContain('no key');
    expect(source.getState().logs.at(-1)?.text).toContain('RuntimeError');
  });

  test('restoreProject rebuilds awaiting checkpoint from state and artifacts', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/state')) {
        return new Response(JSON.stringify({
          project_id: 'p1',
          completed_nodes: ['ingest', 'analyze'],
          current_node: 'outline',
          awaiting_checkpoint: 1,
          artifacts: ['requirements.json'],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return new Response(JSON.stringify([
        {
          id: 'req-0001',
          type: '资质',
          text: '具备 CMA 资质',
          page: 2,
          mandatory: true,
          score_weight: null,
        },
      ]), { status: 200, headers: { 'content-type': 'application/json' } });
    }));
    const source = new LiveSource(makeLiveScenario(), () => ({ addEventListener() {}, close() {} }) as unknown as EventSource);

    await source.restoreProject('p1');

    expect(source.getState().backendRequirements).toHaveLength(1);
    expect(source.getState().pendingCard?.kind).toBe('checkpoint');
    expect(source.getState().status).toBe('awaiting');
  });

  test('checkpoint 2 and 3 confirmations send edited outline/report artifacts', async () => {
    const posts: Record<string, unknown>[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        posts.push(JSON.parse(String(init.body)));
      }
      return new Response(JSON.stringify({ status: 'accepted' }), { status: 200, headers: { 'content-type': 'application/json' } });
    }));
    const source = new LiveSource(makeLiveScenario(), () => ({ addEventListener() {}, close() {} }) as unknown as EventSource);
    (source as unknown as { projectId: string }).projectId = 'p1';

    await source.handleEvent('confirm_request', message({ checkpoint: 2, artifact_url: '/outline.json' }, '20'));
    const outline = { sections: [{ title: '确认后大纲', maps_to_requirement_ids: ['req-1'], asset_refs: [] }] };
    await source.confirmCheckpoint(outline);
    expect(posts.at(-1)).toEqual({ checkpoint: 2, action: 'edit', edited_artifact: outline });

    await source.handleEvent('confirm_request', message({ checkpoint: 3, artifact_url: '/report.json' }, '21'));
    const report = { coverage: { total: 1, responded: 1, missing: [], 废标风险项: [] }, deviations: [] };
    await source.confirmCheckpoint(report);
    expect(posts.at(-1)).toEqual({ checkpoint: 3, action: 'edit', edited_artifact: report });
  });

  test('section drafts land by section_index even when events arrive out of order', async () => {
    const drafts: Record<string, unknown> = {
      '/d/2.json': { title: '第二章', content: '乙', maps_to_requirement_ids: ['req-0002'] },
      '/d/1.json': { title: '第一章', content: '甲', maps_to_requirement_ids: ['req-0001'] },
    };
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) =>
      new Response(JSON.stringify(drafts[String(input)]), { status: 200, headers: { 'content-type': 'application/json' } })));
    const scenario = makeLiveScenario();
    const source = new LiveSource(scenario, () => ({ addEventListener() {}, close() {} }) as unknown as EventSource);

    await source.handleEvent('artifact_ready', message({ artifact_type: 'section_draft', url: '/d/2.json', section_index: 2, section_title: '第二章' }, '6'));
    await source.handleEvent('artifact_ready', message({ artifact_type: 'section_draft', url: '/d/1.json', section_index: 1, section_title: '第一章' }, '7'));
    // 重复补发第 2 章：应覆盖而非追加
    await source.handleEvent('artifact_ready', message({ artifact_type: 'section_draft', url: '/d/2.json', section_index: 2, section_title: '第二章' }, '8'));

    expect(scenario.blocks).toHaveLength(2);
    expect(scenario.blocks.find((b) => b.chapterId === 'live-chapter-1')?.prose).toBe('甲');
    expect(scenario.blocks.find((b) => b.chapterId === 'live-chapter-2')?.prose).toBe('乙');
  });

  test('coverage report expands into per-risk and negative-deviation redlines', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      coverage: { total: 10, responded: 8, missing: ['req-0003', 'req-0004'], 废标风险项: ['req-0003'] },
      deviations: [
        { requirement_id: 'req-0005', 招标要求原文: '工期 30 天', 应答内容: '工期 45 天', deviation: '负偏离', 说明: '工期超出' },
        { requirement_id: 'req-0006', 招标要求原文: 'CMA 资质', 应答内容: '具备', deviation: '无偏离', 说明: '—' },
      ],
    }), { status: 200, headers: { 'content-type': 'application/json' } })));
    const scenario = makeLiveScenario();
    const source = new LiveSource(scenario, () => ({ addEventListener() {}, close() {} }) as unknown as EventSource);

    await source.handleEvent('artifact_ready', message({ artifact_type: 'coverage', url: '/report.json' }, '9'));

    expect(scenario.redlines.map((r) => r.id)).toEqual(['coverage', 'risk-req-0003', 'deviation-req-0005']);
    expect(scenario.redlines[1].结果).toBe('fail');
    expect(scenario.redlines[2].结果).toBe('warn');
    expect(source.getState().revealedRedlines).toHaveLength(3);
  });

  test('escalate_request raises decision card, chooseOption posts decision and resumes', async () => {
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), body: init?.body ? JSON.parse(String(init.body)) : {} });
      return new Response(JSON.stringify({ status: 'accepted' }), { status: 200, headers: { 'content-type': 'application/json' } });
    }));
    const source = new LiveSource(makeLiveScenario(), () => ({ addEventListener() {}, close() {} }) as unknown as EventSource);
    await source.handleEvent('run_started', message({ project_id: 'p1', resume_from: null }, '1'));
    // handleEvent 不设 projectId，走 restore 路径太重——直接用内部上传路径的等价物：
    (source as unknown as { projectId: string }).projectId = 'p1';

    await source.handleEvent('escalate_request', message({
      escalation_id: 'assets-placeholder',
      node: 'retrieve',
      title: '素材库未配置',
      body: '仅有占位素材。',
      confidence: 0.4,
      options: [{ label: '继续用占位素材生成' }, { label: '记录待补充素材，先用占位继续' }],
    }, '14'));

    const card = source.getState().pendingCard;
    expect(source.getState().status).toBe('awaiting');
    expect(card?.kind).toBe('escalate');
    expect(card?.escalateTitle).toBe('素材库未配置');
    expect(card?.options).toHaveLength(2);

    await source.chooseOption(1);
    expect(source.getState().pendingCard).toBeNull();
    expect(source.getState().status).toBe('playing');
    const escalateCall = calls.find((c) => c.url.includes('/escalate'));
    expect(escalateCall?.body).toEqual({ escalation_id: 'assets-placeholder', option_index: 1 });

    await source.handleEvent('escalate_response', message({
      escalation_id: 'assets-placeholder', option_index: 1, label: '记录待补充素材，先用占位继续',
    }, '15'));
    expect(source.getState().logs.at(-1)?.text).toContain('记录待补充素材');
  });

  test('assets artifact populates materials drawer, project_meta fills TopBar meta', async () => {
    const payloads: Record<string, unknown> = {
      '/assets.json': [{ asset_id: 'cma-cert', score: 0.9, content: 'CMA 计量认证证书' }],
      '/meta.json': { 项目名: '北京口腔医院计量检测', 采购人: '北京口腔医院', 限价: 270000 },
    };
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) =>
      new Response(JSON.stringify(payloads[String(input)]), { status: 200, headers: { 'content-type': 'application/json' } })));
    const scenario = makeLiveScenario();
    const source = new LiveSource(scenario, () => ({ addEventListener() {}, close() {} }) as unknown as EventSource);

    await source.handleEvent('artifact_ready', message({ artifact_type: 'assets', url: '/assets.json' }, '10'));
    await source.handleEvent('artifact_ready', message({ artifact_type: 'project_meta', url: '/meta.json' }, '11'));

    expect(scenario.materials[0].id).toBe('cma-cert');
    expect(scenario.materials[0].命中).toBe(true);
    expect(source.getState().matchedMaterials).toEqual(['cma-cert']);
    expect(scenario.meta.项目名).toBe('北京口腔医院计量检测');
    expect(scenario.meta.采购人).toBe('北京口腔医院');
    expect(scenario.meta.限价).toBe(270000);
  });
});
