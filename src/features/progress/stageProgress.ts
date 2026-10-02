import type { GazeBlinkLatest, Stage1Latest } from '@/lib/api/types';
import type { Stage1Progress } from './localProgress';

/** 서버 조회 상태 — TanStack Query의 status와 같은 값. */
export type QueryStatus = 'pending' | 'error' | 'success';

export interface Stage2Progress {
  done: boolean;
  score: number | null;
  at: string | null;
}

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

/** 2단계 진행 상태. 서버(Stage2Result)에 기록이 있으면 완료. 조회 중·실패면 미완료로 둔다(브라우저엔 완료 플래그가 없음). */
export function resolveStage2Progress(
  status: QueryStatus,
  server: GazeBlinkLatest | null | undefined,
): Stage2Progress {
  if (status !== 'success' || !server) return { done: false, score: null, at: null };
  return { done: true, score: Math.round(server.overallScore), at: parseServerTime(server.at) };
}
