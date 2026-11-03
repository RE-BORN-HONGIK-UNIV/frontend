import { beforeEach, describe, expect, it } from 'vitest';
import { auth } from '@/lib/auth';
import {
  aboutMeLines,
  clearHaruTalk,
  latestAnswerAt,
  loadHaruTalk,
  profileIsCurrent,
  profileSourceItems,
  saveProfile,
  saveStageAnswers,
} from './store';
import { fallbackLine, NODS, STAGE1_QUESTIONS, STAGE2_QUESTIONS } from './script';
import { mergeAnswer } from './useHaruTalk';

const a = (label: string, answer: string) => ({ label, question: `${label}?`, answer });

describe('하루 대답 저장', () => {
  beforeEach(() => {
    localStorage.clear();
    auth.signIn('token', '지우', 'jiwoo@example.com');
  });

  it('1·2단계 대답을 순서대로 이해 카드 재료로 모은다', () => {
    saveStageAnswers(2, [a('나의 장점', '끝까지 해요')], new Date('2026-10-02'));
    saveStageAnswers(1, [a('부를 이름', '지우')], new Date('2026-10-01'));
    expect(profileSourceItems(loadHaruTalk()).map((x) => x.label)).toEqual(['부를 이름', '나의 장점']);
    expect(latestAnswerAt(loadHaruTalk())).toBe('2026-10-02T00:00:00.000Z');
  });

  it('대답이 전부 비었으면 카드를 보여 줄 재료가 없다', () => {
    saveStageAnswers(1, [a('부를 이름', ''), a('관심 있는 것', '  ')]);
    expect(profileSourceItems(loadHaruTalk())).toEqual([]);
  });

  it('다른 계정으로 로그인하면 이전 계정의 대답을 읽지 않는다', () => {
    saveStageAnswers(1, [a('부를 이름', '지우')]);
    auth.signIn('token2', '민수', 'minsu@example.com');
    expect(profileSourceItems(loadHaruTalk())).toEqual([]);
  });

  it('카드를 확인한 뒤 1·2단계를 다시 하면 카드를 새로 만들어야 한다', () => {
    saveStageAnswers(1, [a('부를 이름', '지우')], new Date('2026-10-01'));
    saveProfile([{ label: '부를 이름', value: '지우' }]);
    expect(profileIsCurrent(loadHaruTalk())).toBe(true);
    saveStageAnswers(2, [a('나의 장점', '꾸준함')], new Date('2026-10-05'));
    expect(profileIsCurrent(loadHaruTalk())).toBe(false);
  });

  it('지우면 아무것도 남지 않는다', () => {
    saveStageAnswers(1, [a('부를 이름', '지우')]);
    clearHaruTalk();
    expect(loadHaruTalk().stage1).toBeUndefined();
  });

  it('저장된 값이 깨져 있어도 빈 기록으로 읽는다', () => {
    localStorage.setItem('rb.haru.talk', '{not json');
    expect(loadHaruTalk().stage1).toBeUndefined();
  });
});

describe('3단계로 넘기는 이야기', () => {
  it('빈 항목은 빼고 "항목: 내용"으로 만든다', () => {
    expect(
      aboutMeLines([
        { label: '관심 있는 것', value: ' 요리 ' },
        { label: '해 본 일', value: '' },
      ]),
    ).toEqual(['관심 있는 것: 요리']);
    expect(aboutMeLines(undefined)).toEqual([]);
  });
});

describe('대화 진행 도우미', () => {
  it('다시 물어서 두 번 답하면 이어 붙인다', () => {
    expect(mergeAnswer('', '요리요')).toBe('요리요');
    expect(mergeAnswer('음', ' 요리를 좋아해요 ')).toBe('음 요리를 좋아해요');
    expect(mergeAnswer('요리요', '')).toBe('요리요');
  });

  it('서버 반응이 없으면 공감 한마디 + 다음 질문으로 넘어간다', () => {
    expect(fallbackLine(STAGE1_QUESTIONS, 1)).toBe(`${NODS[1]} ${STAGE1_QUESTIONS[1].q}`);
  });

  it('질문마다 이해 카드 항목 이름이 겹치지 않는다', () => {
    const labels = [...STAGE1_QUESTIONS, ...STAGE2_QUESTIONS].map((q) => q.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
