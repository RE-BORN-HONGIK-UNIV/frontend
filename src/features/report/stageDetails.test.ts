import { beforeEach, describe, expect, it } from 'vitest';
import type { AnalyzeResult } from '@/lib/api/types';
import { failStage3Voice, loadStageDetails, saveStage2Voice, saveStage3Voice, startStage3Details } from './stageDetails';

const voice = { scores: { stability: 80 }, words: [{ text: '저는', start: 0, end: 0.4 }] } as unknown as AnalyzeResult;

describe('2단계 통화 목소리 저장', () => {
  beforeEach(() => localStorage.clear());

  it('점수는 남기고 받아쓴 단어(대답 내용)는 기기에 남기지 않는다', () => {
    saveStage2Voice(voice);
    const d = loadStageDetails();
    expect(d.stage2Voice?.result.scores).toEqual({ stability: 80 });
    expect(d.stage2Voice?.result.words).toBeUndefined();
  });
});

describe('3단계 분석값 저장', () => {
  beforeEach(() => localStorage.clear());

  it('새 면접을 시작하면 지난 3단계 값을 지우고 목소리는 정리 중으로', () => {
    saveStage3Voice(voice, [{ question: 'Q', script: '저는' }]);
    startStage3Details();
    const d = loadStageDetails();
    expect(d.stage3Voice).toBeUndefined();
    expect(d.stage3Marks).toBeUndefined();
    expect(d.stage3VoiceStatus).toBe('pending');
  });

  it('목소리 결과를 저장하면 정리 중 표시를 지우고, 받아쓴 단어(대답 내용)는 기기에 남기지 않는다', () => {
    startStage3Details();
    saveStage3Voice(voice, [{ question: 'Q', script: '저는' }]);
    const d = loadStageDetails();
    expect(d.stage3VoiceStatus).toBeUndefined();
    expect(d.stage3Voice?.result.words).toBeUndefined();
    expect(d.stage3Marks).toEqual([{ question: 'Q', script: '저는' }]);
  });

  it('분석이 실패하면 실패로 남긴다', () => {
    startStage3Details();
    failStage3Voice();
    expect(loadStageDetails().stage3VoiceStatus).toBe('failed');
  });
});
