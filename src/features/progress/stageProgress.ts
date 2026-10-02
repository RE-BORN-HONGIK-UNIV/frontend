import type { GazeBlinkLatest, InterviewSessionSummary, Stage1Latest } from '@/lib/api/types';
import type { Stage1Progress, Stage2Progress, Stage3Progress } from './localProgress';

/** 서버 조회 상태 — TanStack Query의 status와 같은 값. */
export type QueryStatus = 'pending' | 'error' | 'success';

/**
 * 서버가 주는 시각(`created_at.isoformat()`)은 UTC인데 타임존 표시가 없다("2026-10-02T01:11:04").
 * 그대로 `new Date()`에 넣으면 브라우저가 로컬 시각으로 해석해서 "N일 전" 계산이 시차만큼 틀어진다.
 * 타임존 표시(Z, +09:00 등)가 없으면 UTC로 간주해 Z를 붙인다.
 */
export function parseServerTime(iso: string): string {
  return /(Z|[+-]\d{2}:?\d{2})$/i.test(iso) ? iso : `${iso}Z`;
}

/**
 * 1단계 진행 상태. 서버(Stage1Result)가 기준이다 — 기기를 바꿔도 같고, 3단계가 난이도 산정에
 * 쓰는 값과 같은 출처라 "대시보드는 완료인데 면접에선 1단계부터 하라고 한다"는 불일치가 없다.
 * - 조회 성공: 서버 기록 유무만 본다. 예전에 브라우저에만 남은 완료 기록은 무시한다
 *   (서버엔 점수가 없어 3단계가 쓸 수 없으므로 다시 해야 하는 게 맞음).
 * - 조회 중·실패: 화면이 비거나 깨지지 않게 브라우저 기록으로 대신 보여준다.
 */
export function resolveStage1Progress(
  status: QueryStatus,
  server: Stage1Latest | null | undefined,
  local: Stage1Progress,
): Stage1Progress {
  if (status !== 'success') return local;
  if (!server) return { done: false, score: null, at: null };
  return { done: true, score: Math.round(server.overallScore), at: parseServerTime(server.at) };
}

/**
 * 2단계 진행 상태. 1단계와 같은 규칙 — 서버(Stage2Result)가 기준이고, 조회 중·실패일 때만
 * 브라우저 기록으로 대신 보여준다.
 */
export function resolveStage2Progress(
  status: QueryStatus,
  server: GazeBlinkLatest | null | undefined,
  local: Stage2Progress,
): Stage2Progress {
  if (status !== 'success') return local;
  if (!server) return { done: false, score: null, at: null };
  return { done: true, score: Math.round(server.overallScore), at: parseServerTime(server.at) };
}

/** 2단계 종합 점수 = 깜빡임·시선·표정 점수의 평균(반올림). 서버 /analyze/stage2/latest의 overallScore와 같은 공식. */
export function stage2OverallScore(scores: { blink: number; gaze: number; expression: number }): number {
  return Math.round((scores.blink + scores.gaze + scores.expression) / 3);
}

/**
 * 3단계 진행 상태. 서버에 "끝까지 마친" 면접(completedAt이 있는 것)이 있으면 완료이고, 가장 최근에
 * 마친 면접의 면접관(tier)을 보여준다. 서버 목록은 최신순이라 처음 만나는 완료 건이 가장 최근 것이다.
 *
 * 1·2단계와 달리 서버에 기록이 없어도 브라우저 완료 메모가 있으면 완료로 본다(합집합). 1·2단계는
 * 3단계가 서버 점수를 쓰기 때문에 "서버에 없으면 미완료"가 맞지만, 3단계 완료는 다른 곳에서 서버
 * 값을 쓰지 않아서, 이 기능이 생기기 전에 면접을 마친 사람의 완료 표시를 지울 이유가 없다.
 * 조회 중·실패일 때도 브라우저 메모를 쓴다.
 */
export function resolveStage3Progress(
  status: QueryStatus,
  sessions: InterviewSessionSummary[] | undefined,
  local: Stage3Progress,
): Stage3Progress {
  if (status === 'success') {
    const latestDone = (sessions ?? []).find((s) => s.completedAt !== null);
    if (latestDone) {
      return { done: true, tier: latestDone.tier, at: parseServerTime(latestDone.completedAt as string) };
    }
  }
  return local;
}
