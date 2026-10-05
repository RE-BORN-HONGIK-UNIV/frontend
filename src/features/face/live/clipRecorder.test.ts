import { describe, expect, it } from 'vitest';
import { pickRecorderMimeType } from './clipRecorder';

describe('pickRecorderMimeType', () => {
  it('지원되는 첫 후보(우선순위: vp9 > vp8 > webm > mp4)를 고른다', () => {
    expect(pickRecorderMimeType(() => true)).toBe('video/webm;codecs=vp9');
    expect(pickRecorderMimeType((t) => t !== 'video/webm;codecs=vp9')).toBe('video/webm;codecs=vp8');
  });
  it('Safari처럼 mp4만 되면 mp4', () => {
    expect(pickRecorderMimeType((t) => t === 'video/mp4')).toBe('video/mp4');
  });
  it('아무것도 안 되면 null(녹화 없이 분석만 진행)', () => {
    expect(pickRecorderMimeType(() => false)).toBeNull();
  });
});
