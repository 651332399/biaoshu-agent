import { describe, expect, test, vi, afterEach } from 'vitest';
import { LiveSource, makeLiveScenario } from './sources';

function message(data: unknown, id: string) {
  return { data: JSON.stringify(data), lastEventId: id } as MessageEvent<string>;
}

function makeTenderSpec() {
  return {
    project_meta: {
      项目名: '聚合规格测试项目',
      项目编号: 'TS-001',
      包号: null,
      采购人: '测试采购人',
      供应商占位: '【待填写】',
      服务周期: null,
      限价: 100000,
      evidence: ['项目名称：聚合规格测试项目', '项目编号 TS-001'],
      evidence_by_field: { 项目名: ['项目名称：聚合规格测试项目'], 项目编号: ['项目编号 TS-001'], 采购人: ['采购人：测试采购人'] },
      confirmed_fields: [],
    },
    export_plan: {
      output_mode: 'single',
      volumes: [{
        volume_id: 'response',
        cover_title: '响应文件',
        file_name: '响应文件.docx',
        section_ids: ['section-1'],
        sealed_separately: false,
        requires_toc: true,
        requires_seal_page: true,
        requires_index_table: false,
        evidence: ['投标文件一册装订'],
        required_forms: ['投标函'],
      }],
      package_zip: false,
      naming_pattern: '{cover_title}.docx',
      template_family: 'single_response',
    },
    style_spec: {
      body_font: '宋体', body_size_pt: 12, body_color: '000000',
      heading_fonts: {}, heading_sizes_pt: {}, heading_colors: {},
      line_spacing: 1.5, line_spacing_pt: null, margins_cm: {}, page_size: 'A4',
      toc_levels: '1-3', header_text: null, page_number: null, binding: null, evidence: [],
    },
    submission_spec: {
      copies: {}, original_copy_marking: false, sealing_groups: [],
      cross_page_seal: null, binding: null, e_version: null, evidence: [],
    },
    forms: [{
      form_id: 'form-1', volume_id: 'response', title: '投标函',
      fill_mode: 'copy_verbatim', source_status: 'available',
      source_evidence: ['投标函原表'], header_snapshot: [],
    }],
    needs_confirmation: true,
    confirmation_reasons: ['请核对分册结构'],
  };
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

  test('loads tender_spec as the source of truth and derives the editable export plan view', async () => {
    const tenderSpec = makeTenderSpec();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(tenderSpec), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));
    const scenario = makeLiveScenario();
    const source = new LiveSource(scenario, () => ({ addEventListener() {}, close() {} }) as unknown as EventSource);

    await source.handleEvent('artifact_ready', message({
      node: 'export_plan', artifact_type: 'tender_spec', url: '/tender_spec.json',
    }, '40'));

    expect(source.getState().backendTenderSpec).toEqual(tenderSpec);
    expect(source.getState().backendExportPlan).toEqual(tenderSpec.export_plan);
    expect(scenario.volumes[0]).toMatchObject({ id: 'response', 名称: '响应文件' });
  });

  test('outline enriches an existing multi-volume plan without collapsing it', async () => {
    const tenderSpec = makeTenderSpec();
    tenderSpec.export_plan.volumes = [
      { ...tenderSpec.export_plan.volumes[0], volume_id: 'business', cover_title: '商务册', section_ids: ['section-1'] },
      { ...tenderSpec.export_plan.volumes[0], volume_id: 'technical', cover_title: '技术册', section_ids: ['section-2'] },
    ];
    const payloads: Record<string, unknown> = {
      '/tender.json': tenderSpec,
      '/outline.json': { sections: [
        { id: 'section-1', title: '商务响应', maps_to_requirement_ids: [], asset_refs: [] },
        { id: 'section-2', title: '技术方案', maps_to_requirement_ids: [], asset_refs: [] },
      ] },
    };
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => new Response(
      JSON.stringify(payloads[String(input)]),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )));
    const scenario = makeLiveScenario();
    const source = new LiveSource(scenario, () => ({ addEventListener() {}, close() {} }) as unknown as EventSource);

    await source.handleEvent('artifact_ready', message({ artifact_type: 'tender_spec', url: '/tender.json' }, '45'));
    await source.handleEvent('artifact_ready', message({ artifact_type: 'outline', url: '/outline.json' }, '46'));

    expect(scenario.volumes.map((volume) => volume.id)).toEqual(['business', 'technical']);
    expect(scenario.volumes.map((volume) => volume.chapters[0].标题)).toEqual(['商务响应', '技术方案']);
  });

  test('checkpoint 4 merges an edited export plan into and submits the complete TenderSpec', async () => {
    const tenderSpec = makeTenderSpec();
    const posts: Record<string, unknown>[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') posts.push(JSON.parse(String(init.body)));
      return new Response(JSON.stringify(tenderSpec), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }));
    const source = new LiveSource(makeLiveScenario(), () => ({ addEventListener() {}, close() {} }) as unknown as EventSource);
    (source as unknown as { projectId: string }).projectId = 'p1';
    await source.handleEvent('artifact_ready', message({ artifact_type: 'tender_spec', url: '/tender_spec.json' }, '41'));
    await source.handleEvent('confirm_request', message({ checkpoint: 4, artifact_url: '/tender_spec.json' }, '42'));
    const editedExportPlan = {
      ...tenderSpec.export_plan,
      volumes: [{ ...tenderSpec.export_plan.volumes[0], file_name: '编辑后响应文件.docx' }],
    };

    await source.confirmCheckpoint(editedExportPlan);

    expect(posts.at(-1)).toEqual({
      checkpoint: 4,
      action: 'edit',
      edited_artifact: { ...tenderSpec, export_plan: editedExportPlan },
    });
    expect(source.getState().backendTenderSpec?.export_plan).toEqual(editedExportPlan);
    expect(source.getState().backendExportPlan).toEqual(editedExportPlan);
  });

  test('checkpoint 4 keeps approve semantics when the TenderSpec export plan was not edited', async () => {
    const tenderSpec = makeTenderSpec();
    const posts: Record<string, unknown>[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') posts.push(JSON.parse(String(init.body)));
      return new Response(JSON.stringify(tenderSpec), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }));
    const source = new LiveSource(makeLiveScenario(), () => ({ addEventListener() {}, close() {} }) as unknown as EventSource);
    (source as unknown as { projectId: string }).projectId = 'p1';
    await source.handleEvent('artifact_ready', message({ artifact_type: 'tender_spec', url: '/tender_spec.json' }, '43'));
    await source.handleEvent('confirm_request', message({ checkpoint: 4, artifact_url: '/tender_spec.json' }, '44'));

    await source.confirmCheckpoint();

    expect(posts.at(-1)).toEqual({ checkpoint: 4, action: 'approve' });
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

  test('restoreProject prefers tender_spec and falls back to legacy export_plan only when needed', async () => {
    const tenderSpec = makeTenderSpec();
    const requested: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      requested.push(url);
      if (url.endsWith('/state')) {
        return new Response(JSON.stringify({
          project_id: 'p1', completed_nodes: ['export_plan'], current_node: 'outline',
          awaiting_checkpoint: 4, artifacts: ['tender_spec.json', 'export_plan.json'],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return new Response(JSON.stringify(tenderSpec), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }));
    const source = new LiveSource(makeLiveScenario(), () => ({ addEventListener() {}, close() {} }) as unknown as EventSource);

    await source.restoreProject('p1');

    expect(requested).toContain('/api/projects/p1/artifacts/tender_spec.json');
    expect(requested).not.toContain('/api/projects/p1/artifacts/export_plan.json');
    expect(source.getState().backendTenderSpec).toEqual(tenderSpec);
    expect(source.getState().backendExportPlan).toEqual(tenderSpec.export_plan);
  });

  test('restoreProject loads draft artifacts in numeric section order', async () => {
    const requestedDrafts: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/state')) {
        return new Response(JSON.stringify({
          project_id: 'p1', completed_nodes: ['generate'], current_node: null,
          awaiting_checkpoint: null,
          artifacts: ['draft/section-10.json', 'draft/section-2.json'],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      requestedDrafts.push(url);
      return new Response(JSON.stringify({
        section_id: url.includes('section-2') ? 'section-2' : 'section-10',
        title: url, content: url, blocks: [], maps_to_requirement_ids: [],
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }));
    const source = new LiveSource(makeLiveScenario(), () => ({ addEventListener() {}, close() {} }) as unknown as EventSource);

    await source.restoreProject('p1');

    expect(requestedDrafts).toEqual([
      '/api/projects/p1/artifacts/draft/section-2.json',
      '/api/projects/p1/artifacts/draft/section-10.json',
    ]);
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

  test('section draft with blocks (llm mode, content left empty) renders from blocks, not the empty content', async () => {
    const draft = {
      title: '废标响应与佐证',
      content: '',
      maps_to_requirement_ids: ['req-0001'],
      blocks: [
        { kind: 'paragraph', level: 'body', spans: [{ text: '我方已', emphasis: 'none' }, { text: '完全响应', emphasis: 'strong' }], maps_to_requirement_ids: [] },
        { kind: 'table', header: ['要求', '应答'], rows: [['req-0001', '已响应']], col_widths_cm: null, style_id: 'BidTable' },
      ],
    };
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify(draft), { status: 200, headers: { 'content-type': 'application/json' } })));
    const scenario = makeLiveScenario();
    const source = new LiveSource(scenario, () => ({ addEventListener() {}, close() {} }) as unknown as EventSource);

    await source.handleEvent('artifact_ready', message({ artifact_type: 'section_draft', url: '/d/1.json', section_index: 1, section_title: '废标响应与佐证' }, '6'));

    // paragraph 和 table 拆成各自的块，table 走 render:'table' 交给 PaperCanvas 的
    // Tiptap Table 扩展渲染成真表格，不再拍扁成"| a | b |"纯文本塞进 prose。
    expect(scenario.blocks).toHaveLength(2);
    expect(scenario.blocks[0].render).toBe('prose');
    expect(scenario.blocks[0].prose).toContain('我方已完全响应');
    expect(scenario.blocks[1].render).toBe('table');
    expect(scenario.blocks[1].table).toEqual({ headers: ['要求', '应答'], rows: [['req-0001', '已响应']] });
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
