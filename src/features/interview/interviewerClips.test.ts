import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ALL_CLIPS, lipsyncClip } from './interviewerClips';
import { CLOSING_LINE, GREETING_LINE } from './interviewers';

describe('lipsyncClip', () => {
  it('입 모양 영상이 있는 대사는 그 영상을 고른다', () => {
    expect(lipsyncClip(GREETING_LINE)).toBe('iv-hello');
    expect(lipsyncClip(CLOSING_LINE)).toBe('iv-bye');
    expect(lipsyncClip('본인의 강점을 하나 꼽는다면 무엇인가요?')).toBe('iv-q-standard-3');
  });

  it('영상이 없거나 AI가 새로 만든 문장은 null(mp3와 말하기 반복 영상으로)', () => {
    expect(lipsyncClip('그때 어떤 기분이 들었는지 궁금해요.')).toBeNull();
    expect(lipsyncClip('편의점에서 일하며 가장 힘들었던 순간은요?')).toBeNull();
  });

  it('쓰는 영상 파일이 모두 있다', () => {
    for (const c of ALL_CLIPS) expect(existsSync(`public/interviewer/clips/${c}.mp4`), c).toBe(true);
  });
});
