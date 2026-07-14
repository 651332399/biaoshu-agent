import type { BackendCoverageReport, BackendExportPlan, BackendOutline, BackendReport, BackendRequirement, BackendTenderSpec } from './types';
import type { Focus, Scenario, Step, StepKind } from './demo/types';
import { type Scheduler, realScheduler } from './scheduler';

export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'awaiting';

export interface EngineState {
  status: PlaybackStatus;
  cursor: number;
  speed: number;
  activeStage: number;
  logs: { id: string; text: string; stage: number }[];
  grownVolumes: string[];
  revealedBlocks: string[];
  matchedMaterials: string[];
  revealedRedlines: string[];
  pricingRevealed: boolean;
  focus: Focus | null;
  pendingCard: Step | null;
  redlineOverrides: Record<string, 'pass' | 'warn' | 'fail'>;
  backendRequirements: BackendRequirement[];
  backendTenderSpec: BackendTenderSpec | null;
  backendExportPlan: BackendExportPlan | null;
  backendOutline: BackendOutline | null;
  backendCoverage: BackendCoverageReport | null;
  backendReport: BackendReport | null;
  serverDocxUrl: string | null;
  serverPackageUrl: string | null;
  error: string | null;
  mode: 'demo' | 'live';
}

export function blocking(kind: StepKind): boolean {
  return kind === 'checkpoint' || kind === 'escalate' || kind === 'export';
}

function initialState(): EngineState {
  return {
    status: 'idle',
    cursor: 0,
    speed: 1,
    activeStage: 0,
    logs: [],
    grownVolumes: [],
    revealedBlocks: [],
    matchedMaterials: [],
    revealedRedlines: [],
    pricingRevealed: false,
    focus: null,
    pendingCard: null,
    redlineOverrides: {},
    backendRequirements: [],
    backendTenderSpec: null,
    backendExportPlan: null,
    backendOutline: null,
    backendCoverage: null,
    backendReport: null,
    serverDocxUrl: null,
    serverPackageUrl: null,
    error: null,
    mode: 'demo',
  };
}

export class ScenarioEngine {
  protected scenario: Scenario;
  protected steps: Step[];
  protected state: EngineState;
  private listeners = new Set<(s: EngineState) => void>();
  private scheduler: Scheduler;
  private timer: number | null = null;

  constructor(scenario: Scenario, scheduler: Scheduler = realScheduler) {
    this.scenario = scenario;
    this.ensureBlocksExist();
    this.steps = [...scenario.steps];
    this.state = initialState();
    this.scheduler = scheduler;
  }

  ensureBlocksExist() {
    const blocks = [...this.scenario.blocks];
    
    if (this.scenario.id === 'kqyy') {
      const dynamicBlocks = [
        {
          id: 'dyn.kqyy.chap.2',
          chapterId: 'chap.2',
          render: 'form',
          标题: '第二章 资格声明书 (完全响应采购合规要求)',
          form: [
            { label: '投标人名称', value: '迈创精准技术服务有限公司' },
            { label: '注册地址', value: '北京市海淀区中关村科技园区创新大厦 4 层' },
            { label: '企业类型', value: '有限责任公司 (自然人投资或控股)' },
            { label: '法定代表人', value: '吴建刚' },
            { label: '注册资本', value: '1,500.00 万元人民币' },
            { label: '独立承担民事责任能力', value: '具备 (具有独立法人资格，营业执照存续状态)' },
            { label: '近三年违法失信记录', value: '无 (已通过信用中国及中国政府采购网核查，零失信/零违法记录)' }
          ]
        },
        {
          id: 'dyn.kqyy.chap.3',
          chapterId: 'chap.3',
          render: 'prose',
          标题: '第三章 廉政与实质性条款响应联合承诺书',
          prose: '本投标人（迈创精准技术服务有限公司）针对北京口腔医院公开遴选项目，郑重做出如下联合承诺：\n\n1. 我司完全满足招标文件中列明的全部实质性要求（包括但不限于最高限价 27 万元、服务周期、检测报告资质要求等）。\n2. 承诺在开展现场检测服务中秉持公正客观原则，协助采购人完成国家规定的强检与强检送检申报工作，承诺该服务不收取额外协办费用。\n3. 我司承诺所提报的所有商务资质、技术人员、业绩材料均真实有效。若发生任何虚假响应，我司愿承担取消遴选资格及相应法律后果。'
        },
        {
          id: 'dyn.kqyy.chap.6',
          chapterId: 'chap.6',
          render: 'table',
          标题: '第六章 分项报价表 (精密设备计量收费细目)',
          table: {
            headers: ['序号', '检测设备项目', '数量', '单价 (元)', '小计 (元)'],
            rows: [
              ['1', '精密移液器校准 (10/20/50/100ul 常用规格)', '200 支', '120.00', '24,000.00'],
              ['2', '医用高频电刀专项校准与安全检测', '35 台', '800.00', '28,000.00'],
              ['3', '多参数监护仪、脉搏血氧仪校准与溯源', '180 台', '300.00', '54,000.00'],
              ['4', '放射类及牙科 X 射线设备检测与安全评价', '12 台', '8,000.00', '96,000.00'],
              ['5', '高压蒸汽灭菌器、离心机等物理检测辅助服务', '62 项', '1,093.87', '67,820.00'],
              ['合计', '本分册报价汇总 (总报价勾稽一致)', '-', '-', '¥269,820.00']
            ]
          }
        }
      ];
      
      dynamicBlocks.forEach((db) => {
        if (!blocks.some((b) => b.id === db.id)) {
          blocks.push(db as any);
        }
      });
    } else if (this.scenario.id === 'yy922') {
      const dynamicBlocks = [
        {
          id: 'dyn.yy922.chap.p2',
          chapterId: 'chap.p2',
          render: 'table',
          标题: '价格分册 · 分项报价明细表 (独立分装区)',
          table: {
            headers: ['服务模块', '计划周期/数量', '单价报价 (元)', '小计报价 (元)', '合规说明'],
            rows: [
              ['1. 医用设备强制检定与辅助检测服务', '2 年度 (周期性)', '52,000.00', '104,000.00', '包含全部一二级强检类器具校准'],
              ['2. 影像与临床强检专线仪器溯源出证及保密申报', '2 年度 (周期性)', '31,060.00', '62,120.00', '专人点对点协助保密流程与军标检验'],
              ['合计谈判总报价', '-', '-', '¥166,120.00', '完全符合限价 167,600 元要求']
            ]
          }
        },
        {
          id: 'dyn.yy922.chap.q1',
          chapterId: 'chap.q1',
          render: 'form',
          标题: '第三册 资格证明文件 (营业执照与对公在保社保证明汇总)',
          form: [
            { label: '统一社会信用代码', value: '91110108MA017XXXXX (迈创精准技术服务有限公司)' },
            { label: '企业注册住所', value: '北京市海淀区科技创新园 A 座 809' },
            { label: 'CMA 认证资质号', value: '20220108922C (已获准军队医院设备校准准入资格)' },
            { label: '项目团队在册人员', value: '吴建刚（一级计量师）、武文君（二级计量师）、颜园（在保技术员）' },
            { label: '社会保险存缴凭证', value: '已附由海淀区社保局出具 of 2026 年近 3 个月对公正常存缴对账底单 (拒绝代缴)' },
            { label: '军队黑名单与失信惩戒核查', value: '未处于军队采购网暂停/处罚期、无政府采购失信记录' }
          ]
        },
        {
          id: 'dyn.yy922.chap.q2',
          chapterId: 'chap.q2',
          render: 'prose',
          标题: '安全保密与派驻现场专项合规承诺书',
          prose: '针对中国人民解放军第 922 医院计量检测服务项目，我司郑重做出以下安全保密承诺：\n\n1. 严格遵守《中华人民共和国保守国家秘密法》及军队相关安全保密条例，项目组成员全员签署安全保密单向协议。\n2. 在进驻检测期间，绝不使用、记录或向外界透露任何与 922 医院诊疗网络、军事装备部署、官兵诊疗数据相关的敏感信息。\n3. 所有指派的技术专家及作业人员，均具备完全合法的在保社保证明（拒绝中介或临时雇佣），并已经过公司政审合规排查，确保入场安全。'
        }
      ];
      
      dynamicBlocks.forEach((db) => {
        if (!blocks.some((b) => b.id === db.id)) {
          blocks.push(db as any);
        }
      });
    }

    this.scenario.blocks = blocks;
  }

  getState(): EngineState {
    return this.state;
  }

  subscribe(fn: (s: EngineState) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  protected emit() {
    this.state = { ...this.state };
    this.listeners.forEach((l) => l(this.state));
  }

  reset() {
    this.pause();
    this.steps = [...this.scenario.steps];
    this.state = initialState();
    this.emit();
  }

  loadScenario(scenario: Scenario) {
    this.pause();
    this.scenario = scenario;
    this.ensureBlocksExist();
    this.reset();
  }

  protected fire(): 'advanced' | 'blocked' | 'end' {
    if (this.state.cursor >= this.steps.length) {
      this.state.status = 'idle';
      return 'end';
    }
    const s = this.steps[this.state.cursor];
    this.state.activeStage = s.stage;
    if (s.focus) {
      this.state.focus = s.focus;
    }

    switch (s.kind) {
      case 'log':
        this.state.logs = [
          ...this.state.logs,
          { id: s.id, text: s.log ?? '', stage: s.stage },
        ];
        break;
      case 'growTree':
        if (s.treeVolumeId && !this.state.grownVolumes.includes(s.treeVolumeId)) {
          this.state.grownVolumes = [...this.state.grownVolumes, s.treeVolumeId];
        }
        if (s.log) {
          this.state.logs = [
            ...this.state.logs,
            { id: s.id, text: s.log, stage: s.stage },
          ];
        }
        break;
      case 'matchMaterial':
        if (s.focus?.material && !this.state.matchedMaterials.includes(s.focus.material)) {
          this.state.matchedMaterials = [...this.state.matchedMaterials, s.focus.material];
        }
        if (s.log) {
          this.state.logs = [
            ...this.state.logs,
            { id: s.id, text: s.log, stage: s.stage },
          ];
        }
        break;
      case 'genBlock':
        if (s.blockId && !this.state.revealedBlocks.includes(s.blockId)) {
          this.state.revealedBlocks = [...this.state.revealedBlocks, s.blockId];
        }
        if (s.log) {
          this.state.logs = [
            ...this.state.logs,
            { id: s.id, text: s.log, stage: s.stage },
          ];
        }
        break;
      case 'redlineResult':
        if (s.redlineId && !this.state.revealedRedlines.includes(s.redlineId)) {
          this.state.revealedRedlines = [...this.state.revealedRedlines, s.redlineId];
        }
        break;
      case 'pricing':
        this.state.pricingRevealed = true;
        if (s.log) {
          this.state.logs = [
            ...this.state.logs,
            { id: s.id, text: s.log, stage: s.stage },
          ];
        }
        break;
      case 'checkpoint':
      case 'escalate':
      case 'export':
      case 'supplement':
        this.state.pendingCard = s;
        this.state.status = 'awaiting';
        return 'blocked';
    }

    this.state.cursor += 1;
    return 'advanced';
  }

  stepOnce() {
    if (this.state.status === 'awaiting') return;
    const res = this.fire();
    if (res !== 'end' && (this.state.status as any) !== 'awaiting') {
      this.state.status = 'paused';
    }
    this.emit();
  }

  setSpeed(x: number) {
    this.state.speed = x;
    this.emit();
  }

  play() {
    if (this.state.status === 'awaiting') return;
    this.state.status = 'playing';
    this.emit();
    this.loop();
  }

  pause() {
    if (this.timer !== null) {
      this.scheduler.clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.state.status === 'playing') {
      this.state.status = 'paused';
      this.emit();
    }
  }

  private loop() {
    if (this.state.status !== 'playing') return;
    const fired = this.steps[this.state.cursor];
    const res = this.fire();
    this.emit();
    if (res === 'blocked' || res === 'end') return;
    this.timer = this.scheduler.setTimeout(() => {
      this.timer = null;
      if (this.state.status === 'playing') {
        this.loop();
      }
    }, (fired?.duration ?? 0) / this.state.speed);
  }

  confirmCheckpoint(_requirements?: unknown) {
    if (this.state.status !== 'awaiting') return;
    const card = this.state.pendingCard;
    if (!card || (card.kind !== 'checkpoint' && card.kind !== 'export')) return;
    this.state.pendingCard = null;
    this.state.cursor += 1;
    this.state.status = 'playing';
    this.emit();
    this.loop();
  }

  chooseOption(index: number) {
    if (this.state.status !== 'awaiting') return;
    const card = this.state.pendingCard;
    if (!card || card.kind !== 'escalate' || !card.options?.[index]) return;
    const effect = card.options[index].effect;
    if (effect.type === 'insert' && effect.steps) {
      this.steps.splice(this.state.cursor + 1, 0, ...effect.steps);
    } else if (effect.type === 'patch' && effect.set?.redlineId && effect.set.结果) {
      this.state.redlineOverrides = {
        ...this.state.redlineOverrides,
        [effect.set.redlineId]: effect.set.结果,
      };
    }
    this.state.pendingCard = null;
    this.state.cursor += 1;
    this.state.status = 'playing';
    this.emit();
    this.loop();
  }

  provideSupplement(type: 'social' | 'pricing' | 'tax') {
    if (this.state.status !== 'awaiting') return;
    const card = this.state.pendingCard;
    if (!card || card.kind !== 'supplement') return;

    this.state.pendingCard = null;

    let userMsg = '';
    let replyText = '';
    let files: { name: string; type: string }[] = [];

    if (type === 'social') {
      userMsg = '【手动补件】补充提交项目组核心专家近3个月在保社保证明截图，请进行多模态核对与印章识别。';
      files = [{ name: '项目组核心专家近3个月在保社保证明截图.png', type: '图片/扫描件' }];
      replyText = `🎯 [多模态社保凭证解析成功] Agent 已成功解析并高精度对标您补充的「拟派项目团队近3个月在保社保证明截图」！\n\n1. 自动识别并核对出核心技术专家在册参保证明，状态均为：「正常在保」。\n2. 经多模态指印核验，完全满足招标要求「严禁挂靠及社保代缴」的★级硬性合规条款。\n3. 社保明细证据已自动拼装附于标书对应章节大纲中，合规红线审查自动转为：🟢 绿色合规（PASS）。`;
      if (this.scenario.id === 'kqyy') {
        this.revealChapterManually('chap.2');
        this.revealChapterManually('chap.8');
      } else if (this.scenario.id === 'yy922') {
        this.revealChapterManually('chap.q1');
        this.revealChapterManually('chap.q2');
      }
    } else if (type === 'tax') {
      userMsg = '【手动补件】补充提交2026年上半年企业对公电子完税缴纳凭证截图，进行财务信用红线校验。';
      files = [{ name: '2026年上半年企业对公电子完税缴纳凭证截图.jpg', type: '图片/扫描件' }];
      replyText = `🎯 [多模态纳税凭证解析成功] Agent 已深度核验并完成您补充的「近半年对公电子缴税凭证/完税截图」！\n\n1. 成功提取企业纳税条码及防伪戳记，确认迈创精准在海淀区依法按期足额纳税，无欠税及失信惩戒行为。\n2. 完税及信用数据已自动更新并填充至《资格声明书》与《合规承诺书》中的表单及段落。\n3. 信用及纳税合规证据已完成归档，自动排除政府采购信用初筛层面的出局风险。`;
      if (this.scenario.id === 'kqyy') {
        this.revealChapterManually('chap.2');
        this.revealChapterManually('chap.3');
      } else if (this.scenario.id === 'yy922') {
        this.revealChapterManually('chap.q1');
        this.revealChapterManually('chap.q2');
      }
    } else if (type === 'pricing') {
      userMsg = '【手动补件】补充提交分项报价精算对标试算表，请核算各项计量收费小计并校准大纲中的分项报价表。';
      files = [{ name: '分项报价精算对标试算表.xlsx', type: '表格文件' }];
      replyText = `💰 [多模态报价对标核算成功] 收到人工补充的「分项报价明细与估算试算底单」！\n\n1. 价格计算引擎已对医疗设备计量等收费项目进行精确勾稽测算。\n2. 分项报价汇总金额与开标一览表大写金额完美对应，实现 0.00 元零阶计算误差，确保无废标红线风险。\n3. 右侧标书画布中的「分项报价表」已解锁且展示最新校准版本，已开通双击编辑数值及实时重算功能。`;
      this.state.pricingRevealed = true;
      if (this.scenario.id === 'kqyy') {
        this.revealChapterManually('chap.6');
        this.revealChapterManually('chap.5');
      } else if (this.scenario.id === 'yy922') {
        this.revealChapterManually('chap.p2');
        this.revealChapterManually('chap.p1');
      }
    }

    const stage = this.state.activeStage || 1;
    const fileSuffix = files.length > 0 ? ` [📎 附件: ${files[0].name} (${files[0].type})]` : '';

    this.state.logs = [
      ...this.state.logs,
      {
        id: `user-msg-${Date.now()}`,
        text: `👤 用户指示: ${userMsg}${fileSuffix}`,
        stage: stage
      }
    ];

    this.state.status = 'playing';
    this.emit();

    setTimeout(() => {
      this.state.logs = [
        ...this.state.logs,
        {
          id: `agent-reply-${Date.now()}`,
          text: replyText,
          stage: stage
        }
      ];
      this.state.cursor += 1;
      this.state.status = 'playing';
      this.emit();
      this.loop();
    }, 1200);
  }

  revealChapterManually(chapterId: string) {
    const vol = this.scenario.volumes.find((v) => v.chapters.some((c) => c.id === chapterId));
    if (vol) {
      if (!this.state.grownVolumes.includes(vol.id)) {
        this.state.grownVolumes = [...this.state.grownVolumes, vol.id];
      }
    }
    const blocks = this.scenario.blocks.filter((b) => b.chapterId === chapterId);
    blocks.forEach((b) => {
      if (!this.state.revealedBlocks.includes(b.id)) {
        this.state.revealedBlocks = [...this.state.revealedBlocks, b.id];
      }
    });
    this.state.focus = {
      ...this.state.focus,
      chapter: chapterId,
      volume: vol?.id,
    };
    this.emit();
  }

  revealVolumeManually(volumeId: string) {
    if (!this.state.grownVolumes.includes(volumeId)) {
      this.state.grownVolumes = [...this.state.grownVolumes, volumeId];
    }
    const vol = this.scenario.volumes.find((v) => v.id === volumeId);
    if (vol) {
      vol.chapters.forEach((c) => {
        const blocks = this.scenario.blocks.filter((b) => b.chapterId === c.id);
        blocks.forEach((b) => {
          if (!this.state.revealedBlocks.includes(b.id)) {
            this.state.revealedBlocks = [...this.state.revealedBlocks, b.id];
          }
        });
      });
      this.state.focus = {
        ...this.state.focus,
        volume: volumeId,
        chapter: vol.chapters[0]?.id,
      };
    }
    this.emit();
  }

  addCustomUserMessage(text: string, files?: { name: string; type: string }[]) {
    this.pause();

    const stage = this.state.activeStage || 1;
    let fileSuffix = '';
    if (files && files.length > 0) {
      fileSuffix = ` [📎 附件: ${files.map(f => `${f.name} (${f.type})`).join(', ')}]`;
    }
    
    this.state.logs = [
      ...this.state.logs,
      {
        id: `user-msg-${Date.now()}`,
        text: `👤 用户指示: ${text}${fileSuffix}`,
        stage: stage
      }
    ];
    this.state.status = 'playing';
    this.emit();

    setTimeout(() => {
      let replyText = '';
      const textLower = text.toLowerCase();
      
      if (textLower.includes('社保')) {
        replyText = `🎯 [多模态社保凭证解析成功] Agent 已成功解析并高精度对标您补充的「拟派项目团队近3个月在保社保证明截图」！\n\n1. 自动识别并核对出核心技术专家在册参保证明，状态均为：「正常在保」。\n2. 经多模态指印核验，完全满足招标要求「严禁挂靠及社保代缴」的★级硬性合规条款。\n3. 社保明细证据已自动拼装附于标书对应章节大纲中，合规红线审查自动转为：🟢 绿色合规（PASS）。`;
        if (this.scenario.id === 'kqyy') {
          this.revealChapterManually('chap.2');
          this.revealChapterManually('chap.8');
        } else if (this.scenario.id === 'yy922') {
          this.revealChapterManually('chap.q1');
          this.revealChapterManually('chap.q2');
        }
      } else if (textLower.includes('纳税') || textLower.includes('完税') || textLower.includes('税')) {
        replyText = `🎯 [多模态纳税凭证解析成功] Agent 已深度核验并完成您补充的「近半年对公电子缴税凭证/完税截图」！\n\n1. 成功提取企业纳税条码及防伪戳记，确认迈创精准在海淀区依法按期足额纳税，无欠税及失信惩戒行为。\n2. 完税及信用数据已自动更新并填充至《资格声明书》与《合规承诺书》中的表单及段落。\n3. 信用及纳税合规证据已完成归档，自动排除政府采购信用初筛层面的出局风险。`;
        if (this.scenario.id === 'kqyy') {
          this.revealChapterManually('chap.2');
          this.revealChapterManually('chap.3');
        } else if (this.scenario.id === 'yy922') {
          this.revealChapterManually('chap.q1');
          this.revealChapterManually('chap.q2');
        }
      } else if (textLower.includes('报价') || textLower.includes('价格') || textLower.includes('钱') || textLower.includes('分项') || textLower.includes('估算')) {
        replyText = `💰 [多模态报价对标核算成功] 收到人工补充的「分项报价明细与估算试算底单」！\n\n1. 价格计算引擎已对医疗设备计量等收费项目进行精确勾稽测算。\n2. 分项报价汇总金额与开标一览表大写金额完美对应，实现 0.00 元零阶计算误差，确保无废标红线风险。\n3. 右侧标书画布中的「分项报价表」已解锁且展示最新校准版本，已开通双击编辑数值及实时重算功能。`;
        this.state.pricingRevealed = true;
        if (this.scenario.id === 'kqyy') {
          this.revealChapterManually('chap.6');
          this.revealChapterManually('chap.5');
        } else if (this.scenario.id === 'yy922') {
          this.revealChapterManually('chap.p2');
          this.revealChapterManually('chap.p1');
        }
      } else if (textLower.includes('多模态') || textLower.includes('图片') || textLower.includes('截图') || textLower.includes('pdf') || (files && files.length > 0)) {
        replyText = `🎯 [多模态解析成功] Agent 已成功识别您上传的资质截图/PDF说明书！\n\n1. 自动提取出其中的主要指标并同步至后台。\n2. 依据这些补充资质，我已重构「资格声明书」和对应章节的检测方案细节。\n3. 当前处于完全响应合规状态，人工审计和编辑接口已刷新。`;
        if (this.scenario.id === 'kqyy') {
          this.revealChapterManually('chap.2');
          this.revealChapterManually('chap.3');
        } else if (this.scenario.id === 'yy922') {
          this.revealChapterManually('chap.q1');
          this.revealChapterManually('chap.q2');
        }
      } else if (textLower.includes('审核') || textLower.includes('人工') || textLower.includes('修改') || textLower.includes('修正')) {
        replyText = `✍️ [进入协作审查模式] Agent 已按您的要求为您开启全册自由编辑与手动纠偏权限。\n\n您现在可以在右侧「标书大纲画布」中任意点击、甚至双击输入框、或者勾选质检条目。AI 将实时保存您的修改并重新运行合规审计。`;
      } else {
        replyText = `🤖 [Agent 响应] 收到您的实时指令: \"${text}\"。\n\n我已将该要求纳入全局生成策略。目前已优先编排生成对应的分册和章节，并且正在重新检索迈创精准技术服务的「历史对公在保社保」、「CMA/CNAS 计量检测资质证书」，请在右侧画布中滑动审查生成的文案及表格。`;
        
        this.scenario.volumes.forEach((v) => {
          if (!this.state.grownVolumes.includes(v.id)) {
            this.state.grownVolumes.push(v.id);
          }
          v.chapters.forEach((c) => {
            const blocks = this.scenario.blocks.filter((b) => b.chapterId === c.id);
            blocks.forEach((b) => {
              if (!this.state.revealedBlocks.includes(b.id)) {
                this.state.revealedBlocks.push(b.id);
              }
            });
          });
        });
      }

      this.state.logs = [
        ...this.state.logs,
        {
          id: `agent-reply-${Date.now()}`,
          text: replyText,
          stage: stage
        }
      ];
      this.state.status = 'paused';
      this.emit();
    }, 1500);
  }
}
