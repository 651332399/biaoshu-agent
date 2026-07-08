import { describe, test, expect } from 'vitest';
import { ScenarioEngine } from './ScenarioEngine';
import type { Scenario, Step } from './demo/types';
import type { Scheduler } from './scheduler';

function makeScenario(steps: Step[]): Scenario {
  return {
    id: 'kqyy',
    meta: {
      项目名: 'T',
      采购人: 'T',
      采购方式: 'T',
      评审办法: 'T',
      限价: 1,
      报价: 1,
      报价利用率: '1',
      保证金: 1,
      服务周期: 'T',
    },
    strategy: { method: 'composite', 基调: 'T', 报价基调: 'T' },
    volumes: [{ id: 'vol.1', 名称: '响应文件', 单独密封: false, chapters: [] }],
    requirements: [],
    mapping: [],
    materials: [],
    blocks: [{ id: 'blk.1', chapterId: 'c', render: 'prose', 标题: '服务方案', prose: '内容' }],
    redlines: [{ id: 'rl.1', 项: '报价≤限价', 结果: 'pass' }],
    pricing: { lines: [], 限价: 1, 报价: 1, 利用率: '1' },
    steps,
  };
}

class FakeClock implements Scheduler {
  private q: { id: number; fn: () => void; ms: number }[] = [];
  private seq = 1;
  lastMs = -1;

  setTimeout(fn: () => void, ms: number) {
    const id = this.seq++;
    this.q.push({ id, fn, ms });
    this.lastMs = ms;
    return id;
  }

  clearTimeout(id: number) {
    this.q = this.q.filter((t) => t.id !== id);
  }

  flush(max = 1000) {
    let n = 0;
    while (this.q.length && n++ < max) {
      const t = this.q.shift()!;
      t.fn();
    }
  }
}

describe('ScenarioEngine', () => {
  test('fresh engine is idle at cursor 0 with empty derived state', () => {
    const e = new ScenarioEngine(makeScenario([]));
    const s = e.getState();
    expect(s.status).toBe('idle');
    expect(s.cursor).toBe(0);
    expect(s.logs).toEqual([]);
    expect(s.revealedBlocks).toEqual([]);
  });

  test('stepOnce on a log step pushes log and advances cursor, staying paused', () => {
    const e = new ScenarioEngine(
      makeScenario([{ id: 's1', stage: 1, kind: 'log', duration: 100, log: '解析招标文件' }])
    );
    e.stepOnce();
    const s = e.getState();
    expect(s.logs.map((l) => l.text)).toEqual(['解析招标文件']);
    expect(s.cursor).toBe(1);
    expect(s.status).toBe('paused');
    expect(s.activeStage).toBe(1);
  });

  test('stepOnce on genBlock reveals the block; growTree grows the volume; matchMaterial records material', () => {
    const e = new ScenarioEngine(
      makeScenario([
        { id: 's1', stage: 3, kind: 'growTree', duration: 100, treeVolumeId: 'vol.1' },
        {
          id: 's2',
          stage: 5,
          kind: 'matchMaterial',
          duration: 100,
          log: '命中',
          focus: { material: 'mat.x', drawer: 'people' },
        },
        { id: 's3', stage: 6, kind: 'genBlock', duration: 100, blockId: 'blk.1' },
      ])
    );
    e.stepOnce();
    e.stepOnce();
    e.stepOnce();
    const s = e.getState();
    expect(s.grownVolumes).toContain('vol.1');
    expect(s.matchedMaterials).toContain('mat.x');
    expect(s.focus).toEqual({ material: 'mat.x', drawer: 'people' });
    expect(s.revealedBlocks).toContain('blk.1');
  });

  test('reset returns to initial derived state', () => {
    const e = new ScenarioEngine(
      makeScenario([{ id: 's1', stage: 1, kind: 'log', duration: 100, log: 'x' }])
    );
    e.stepOnce();
    e.reset();
    expect(e.getState().cursor).toBe(0);
    expect(e.getState().logs).toEqual([]);
  });

  test('play runs auto steps to completion (idle) via fake clock', () => {
    const clock = new FakeClock();
    const e = new ScenarioEngine(
      makeScenario([
        { id: 's1', stage: 1, kind: 'log', duration: 100, log: 'a' },
        { id: 's2', stage: 1, kind: 'log', duration: 100, log: 'b' },
      ]),
      clock
    );
    e.play();
    clock.flush();
    const s = e.getState();
    expect(s.logs.map((l) => l.text)).toEqual(['a', 'b']);
    expect(s.status).toBe('idle');
  });

  test('play stops at a blocking step in awaiting', () => {
    const clock = new FakeClock();
    const e = new ScenarioEngine(
      makeScenario([
        { id: 's1', stage: 1, kind: 'log', duration: 100, log: 'a' },
        { id: 's2', stage: 2, kind: 'checkpoint', duration: 0, checkpointTitle: '确认策略' },
        { id: 's3', stage: 3, kind: 'log', duration: 100, log: 'c' },
      ]),
      clock
    );
    e.play();
    clock.flush();
    const s = e.getState();
    expect(s.status).toBe('awaiting');
    expect(s.pendingCard?.id).toBe('s2');
    expect(s.logs.map((l) => l.text)).toEqual(['a']); // c not played yet
  });

  test('setSpeed scales the scheduled delay', () => {
    const clock = new FakeClock();
    const e = new ScenarioEngine(
      makeScenario([
        { id: 's1', stage: 1, kind: 'log', duration: 200, log: 'a' },
        { id: 's2', stage: 1, kind: 'log', duration: 200, log: 'b' },
      ]),
      clock
    );
    e.setSpeed(2);
    e.play();
    expect(clock.lastMs).toBe(100); // 200 / 2
  });

  test('pause halts auto-advance', () => {
    const clock = new FakeClock();
    const e = new ScenarioEngine(
      makeScenario([
        { id: 's1', stage: 1, kind: 'log', duration: 100, log: 'a' },
        { id: 's2', stage: 1, kind: 'log', duration: 100, log: 'b' },
      ]),
      clock
    );
    e.play(); // triggers first loop step
    e.pause();
    clock.flush();
    expect(e.getState().status).toBe('paused');
    expect(e.getState().logs.map((l) => l.text)).toEqual(['a']);
  });

  test('confirmCheckpoint advances past the card and resumes', () => {
    const clock = new FakeClock();
    const e = new ScenarioEngine(
      makeScenario([
        { id: 's1', stage: 2, kind: 'checkpoint', duration: 0, checkpointTitle: '确认策略' },
        { id: 's2', stage: 3, kind: 'log', duration: 100, log: 'after' },
      ]),
      clock
    );
    e.play();
    clock.flush();
    expect(e.getState().status).toBe('awaiting');
    e.confirmCheckpoint();
    clock.flush();
    expect(e.getState().logs.map((l) => l.text)).toEqual(['after']);
    expect(e.getState().status).toBe('idle');
  });

  test('escalate + insert effect splices sub-steps after the card', () => {
    const clock = new FakeClock();
    const e = new ScenarioEngine(
      makeScenario([
        {
          id: 's1',
          stage: 5,
          kind: 'escalate',
          duration: 0,
          escalateTitle: '业绩口径',
          options: [
            {
              label: '去补充业绩',
              effect: {
                type: 'insert',
                steps: [{ id: 'ins1', stage: 5, kind: 'log', duration: 50, log: '补料：插入北京 3 例' }],
              },
            },
            { label: '按现状继续', effect: { type: 'continue' } },
          ],
        },
        { id: 's2', stage: 6, kind: 'log', duration: 50, log: '继续生成' },
      ]),
      clock
    );
    e.play();
    clock.flush();
    e.chooseOption(0);
    clock.flush();
    expect(e.getState().logs.map((l) => l.text)).toEqual(['补料：插入北京 3 例', '继续生成']);
  });

  test('escalate + patch effect overrides a redline result', () => {
    const clock = new FakeClock();
    const e = new ScenarioEngine(
      makeScenario([
        {
          id: 's1',
          stage: 7,
          kind: 'escalate',
          duration: 0,
          escalateTitle: '报价压线',
          options: [
            {
              label: '维持压线报价',
              effect: { type: 'patch', set: { redlineId: 'rl.price', 结果: 'warn' } },
            },
          ],
        },
      ]),
      clock
    );
    e.play();
    clock.flush();
    e.chooseOption(0);
    expect(e.getState().redlineOverrides['rl.price']).toBe('warn');
  });
});
