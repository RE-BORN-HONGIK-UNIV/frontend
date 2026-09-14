import { describe, expect, it } from 'vitest';
import { scoreColor } from './scoreColor';

describe('scoreColor', () => {
  it('75 이상은 green', () => {
    expect(scoreColor(75)).toBe('#1e8a57');
    expect(scoreColor(100)).toBe('#1e8a57');
  });

  it('55~74는 amber', () => {
    expect(scoreColor(74)).toBe('#b07a00');
    expect(scoreColor(55)).toBe('#b07a00');
  });

  it('55 미만은 red', () => {
    expect(scoreColor(54)).toBe('#a32d2d');
    expect(scoreColor(0)).toBe('#a32d2d');
  });
});
