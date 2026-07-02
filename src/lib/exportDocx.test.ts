import { describe, test, expect } from 'vitest';
import { buildDocx } from './exportDocx';
import { kqyy } from '../scenarios/kqyy';

describe('exportDocx', () => {
  test('buildDocx compiles scenario text blocks into a non-empty docx binary blob', async () => {
    const blob = await buildDocx(kqyy);
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toContain('officedocument.wordprocessingml');
  });
});
