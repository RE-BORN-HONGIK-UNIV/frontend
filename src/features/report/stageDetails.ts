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
}

const KEY = 'rb.report.details';

function owner() {
  return auth.email || 'anonymous';
}

export function loadStageDetails(): StageDetails {
  try {
    const raw = localStorage.getItem(KEY);
    const rec = raw ? (JSON.parse(raw) as StageDetails & { owner?: string }) : null;
    if (rec && rec.owner === owner()) return { stage1: rec.stage1, stage2: rec.stage2 };
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
}

export function saveStage1Detail(result: AnalyzeResult, turnStarts: number[] = [], now = new Date()) {
  save({ ...loadStageDetails(), stage1: { at: now.toISOString(), result, turnStarts } });
}

export function saveStage2Detail(result: GazeBlinkResult, now = new Date()) {
  // 하이라이트 클립(data URL)은 크기가 커서 빼고 숫자·구간만 남긴다
  const slim: GazeBlinkResult = {
    ...result,
    blink: { ...result.blink, highlight: null },
    gaze: { ...result.gaze, highlight: null },
    expression: { ...result.expression, highlight: null },
  };
  save({ ...loadStageDetails(), stage2: { at: now.toISOString(), result: slim } });
}
