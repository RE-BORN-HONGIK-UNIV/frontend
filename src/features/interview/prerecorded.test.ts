import { describe, expect, it } from 'vitest';
import { prerecordedUrls } from './prerecorded';
import { FOLLOW_UP_BANK, QUESTION_BANK } from './difficulty';
import { CLOSING_LINE, INTERVIEWERS } from './interviewers';
import { fallbackLine, NODS, STAGE1_QUESTIONS, STAGE2_QUESTIONS } from '@/features/haru/script';

describe('미리 녹음한 대사', () => {
  it('정해 둔 문장은 모두 mp3가 있다(문장을 고치면 여기서 걸린다)', () => {
    const fixed = [
      CLOSING_LINE,
      ...INTERVIEWERS.map((i) => i.firstQuestion),
      ...Object.values(QUESTION_BANK).flat(),
      ...Object.values(FOLLOW_UP_BANK).flat(),
      ...STAGE1_QUESTIONS.map((q) => q.q),
      ...STAGE2_QUESTIONS.map((q) => q.q),
      ...NODS,
    ];
    expect(fixed.filter((t) => prerecordedUrls(t)?.length !== 1)).toEqual([]);
  });

  it('공감 한마디 + 다음 질문은 두 mp3를 이어 튼다, 없는 문장은 null', () => {
    expect(prerecordedUrls(fallbackLine(STAGE1_QUESTIONS, 1))).toEqual(['/audio/lines/haru-nod-2.mp3', '/audio/lines/haru-s1-2.mp3']);
    expect(prerecordedUrls('처음 듣는 문장이에요.')).toBeNull();
  });
});
