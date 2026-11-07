import { auth } from '@/lib/auth';
import type { AnalyzeResult, GazeBlinkResult } from '@/lib/api/types';

/**
 * 최종 통합 리포트(3단계 뒤)에 쓸 1·2단계 분석 결과를 이 기기에 남겨 둔다.
 * 서버에는 단계별 요약 점수만 저장돼서(Stage1Result·Stage2Result), 채움말 위치·시선 흐름 같은 세부값은
 * 분석 직후 받은 응답에만 있다 — 그래서 받은 그대로(숫자·구간만, 영상 클립 제외) 기기에 둔다.
 * 기기를 바꾸면 세부값 없이 서버 요약 점수만으로 리포트를 그린다(buildReport 참고). 계정별로 따로 둔다.
 */

export interface StageDetails {
  /** turnStarts: 녹음 파일 안에서 대답 하나하나가 시작된 시각(초) — "첫마디" 문구 판단용 */
  stage1?: { at: string; result: AnalyzeResult; turnStarts?: number[] };
  stage2?: { at: string; result: GazeBlinkResult };
  /*
   * 2·3단계 대답 목소리도 1단계처럼 분석하면 여기에 저장한다 → 말하기 습관의 1→2→3단계 흐름 막대가 채워짐.
   * 3단계는 2026-11부터 면접 대답을 이어 녹음해 /analyze(stage=3)로 보낸다(QuestionView). 2단계 목소리는 아직 없음.
   */
  stage2Voice?: { at: string; result: AnalyzeResult };
  stage3Voice?: { at: string; result: AnalyzeResult };
  /** 3단계 목소리 분석 상태 — pending이면 리포트가 "정리하고 있어요", failed면 "정리하지 못했어요" */
  stage3VoiceStatus?: 'pending' | 'failed';
  /** 3단계 질문별로 받아쓴 대답에 표시를 입힌 글 — [f:음](말버릇) [l:저어는](소리 늘이기) [p:3초 멈춤] [k:바라보며 말한 부분]
   * 3단계 목소리 분석의 Whisper 단어·채움말·긴 멈춤·소리 늘이기 시각으로 만든다(report/stage3Marks.ts). */
  stage3Marks?: { question: string; script: string }[];
  /** 3단계 면접 중 대답하는 동안의 깜빡임·시선·표정(2단계와 같은 실시간 분석, 2단계 이력에는 안 남김) */
  stage3Face?: { at: string; result: GazeBlinkResult };
}

/** 세부값이 바뀌면 알린다 — 3단계 목소리 분석은 리포트가 열린 뒤에 끝나서, 열린 리포트가 다시 읽게 */
export const STAGE_DETAILS_EVENT = 'rb:stage-details';

const KEY = 'rb.report.details';

function owner() {
  return auth.email || 'anonymous';
}

export function loadStageDetails(): StageDetails {
  try {
    const raw = localStorage.getItem(KEY);
    const rec = raw ? (JSON.parse(raw) as StageDetails & { owner?: string }) : null;
    if (rec && rec.owner === owner()) {
      const { owner: _owner, ...details } = rec;
      void _owner;
      return details;
    }
  } catch {
    /* 깨졌거나 못 읽으면 없는 것으로 */
  }
  return {};
}

function save(next: StageDetails) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ owner: owner(), ...next }));
  } catch {
    /* 저장 못 해도 리포트는 서버 요약으로 그린다 */
  }
  try {
    window.dispatchEvent(new Event(STAGE_DETAILS_EVENT));
  } catch {
    /* 알림 실패는 무시 — 다음에 리포트를 열 때 읽힌다 */
  }
}

export function saveStage1Detail(result: AnalyzeResult, turnStarts: number[] = [], now = new Date()) {
  save({ ...loadStageDetails(), stage1: { at: now.toISOString(), result, turnStarts } });
}

/** 2단계 통화 목소리 분석 결과 — 리포트의 1→2→3단계 흐름 막대용. 받아쓴 단어는 남기지 않는다 */
export function saveStage2Voice(result: AnalyzeResult, now = new Date()) {
  const { words: _w, ...slim } = result;
  void _w;
  save({ ...loadStageDetails(), stage2Voice: { at: now.toISOString(), result: slim } });
}

export function saveStage2Detail(result: GazeBlinkResult, now = new Date()) {
  // 하이라이트 클립(data URL)은 크기가 커서 빼고 숫자·구간만 남긴다
  save({ ...loadStageDetails(), stage2: { at: now.toISOString(), result: slimFace(result) } });
}

const slimFace = (result: GazeBlinkResult): GazeBlinkResult => ({
  ...result,
  blink: { ...result.blink, highlight: null },
  gaze: { ...result.gaze, highlight: null },
  expression: { ...result.expression, highlight: null },
});

/** 새 3단계 면접을 시작할 때 — 지난 면접의 3단계 값이 새 리포트에 섞이지 않게 지우고, 목소리는 정리 중으로 */
export function startStage3Details() {
  const { stage3Voice: _v, stage3Marks: _m, stage3Face: _f, stage3VoiceStatus: _s, ...rest } = loadStageDetails();
  void _v;
  void _m;
  void _f;
  void _s;
  save({ ...rest, stage3VoiceStatus: 'pending' });
}

export function saveStage3Face(result: GazeBlinkResult, now = new Date()) {
  save({ ...loadStageDetails(), stage3Face: { at: now.toISOString(), result: slimFace(result) } });
}

export function saveStage3Voice(result: AnalyzeResult, marks: { question: string; script: string }[], now = new Date()) {
  // 받아쓴 단어(words)는 표시를 만드는 데만 쓰고 기기에 남기지 않는다(대답 내용이 그대로 들어 있음)
  const { words: _w, ...slim } = result;
  void _w;
  const { stage3VoiceStatus: _s, ...rest } = loadStageDetails();
  void _s;
  save({ ...rest, stage3Voice: { at: now.toISOString(), result: slim }, stage3Marks: marks.length ? marks : undefined });
}

export function failStage3Voice() {
  save({ ...loadStageDetails(), stage3VoiceStatus: 'failed' });
}

/** 녹음이 없어서(마이크 실패·전부 넘김) 3단계 목소리를 분석하지 않을 때 */
export function skipStage3Voice() {
  const { stage3VoiceStatus: _s, ...rest } = loadStageDetails();
  void _s;
  save(rest);
}
