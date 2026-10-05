import type { GazeBlinkResult } from '@/lib/api/types';

/**
 * 실시간 촬영의 하이라이트 구간 계산 (순수 함수).
 *
 * 업로드 모드는 backend `build_highlight_clip`(app.py)이 서버에서 ffmpeg로 구간을
 * 잘라 이어붙인 mp4를 만들지만, 실시간 모드는 영상이 서버로 안 가므로 브라우저가
 * 촬영 중 녹화해 둔 전체 영상(blob)에서 "어느 구간을 재생할지"만 계산한다 —
 * 실제 편집은 안 하고 HighlightPlayer가 구간만 이어서 재생한다.
 *
 * 구간 선택 규칙은 backend와 같다: 깜빡임은 이벤트 전부, 시선은 회피(aversion)
 * 구간, 표정은 neutral이 아닌 구간(미소·긴장). 앞뒤 0.3초 여유, 총 15초 상한.
 * 다른 점 하나 — backend는 여유를 붙인 구간끼리 겹쳐도 그대로 이어붙여 같은
 * 장면이 두 번 나올 수 있는데, 여기선 겹치면 하나로 합친다(재생 중 반복 방지).
 */

export interface ClipRange {
  start: number;
  end: number;
}

export const HIGHLIGHT_PAD_SEC = 0.3;
export const HIGHLIGHT_MAX_TOTAL_SEC = 15;
/** backend와 같은 값 — 이보다 짧은 조각은 재생 가치가 없어 버린다. */
const MIN_CLIP_SEC = 0.05;

export type HighlightMetric = 'blink' | 'gaze' | 'expression';

/** 지표별로 "눈에 띄는" 구간을 고른다 (backend app.py의 하이라이트 재료 선택과 동일). */
export function pickHighlightIntervals(
  metric: HighlightMetric,
  result: Pick<GazeBlinkResult, 'blink' | 'gaze' | 'expression'>,
): ClipRange[] {
  if (metric === 'blink') {
    return result.blink.events.map((e) => ({ start: e.start, end: e.end }));
  }
  if (metric === 'gaze') {
    return result.gaze.segments.filter((s) => s.type === 'aversion').map((s) => ({ start: s.start, end: s.end }));
  }
  return result.expression.segments.filter((s) => s.type !== 'neutral').map((s) => ({ start: s.start, end: s.end }));
}

/**
 * 세션 시각 기준 구간 → 녹화 파일 기준 재생 구간.
 * @param intervals 세션 시작 기준 초 단위 구간
 * @param offsetSec 녹화가 세션 시작보다 몇 초 뒤에 시작됐는지 (구간 시각에서 뺀다)
 * @param recordingDurationSec 녹화 길이 — 이 범위를 벗어난 구간은 잘라내거나 버린다
 */
export function buildHighlightRanges(
  intervals: ClipRange[],
  offsetSec: number,
  recordingDurationSec: number,
  padSec = HIGHLIGHT_PAD_SEC,
  maxTotalSec = HIGHLIGHT_MAX_TOTAL_SEC,
): ClipRange[] {
  const padded = intervals
    .map((r) => ({
      start: Math.max(0, r.start - offsetSec - padSec),
      end: Math.min(recordingDurationSec, r.end - offsetSec + padSec),
    }))
    .filter((r) => r.end - r.start > MIN_CLIP_SEC)
    .sort((a, b) => a.start - b.start);

  const merged: ClipRange[] = [];
  for (const r of padded) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end) {
      last.end = Math.max(last.end, r.end);
    } else {
      merged.push({ ...r });
    }
  }

  const out: ClipRange[] = [];
  let total = 0;
  for (const r of merged) {
    const remaining = maxTotalSec - total;
    if (remaining <= MIN_CLIP_SEC) break;
    const len = Math.min(r.end - r.start, remaining);
    out.push({ start: r.start, end: r.start + len });
    total += len;
  }
  return out;
}

export type PlaybackStep =
  | { kind: 'continue' }
  | { kind: 'jump'; index: number; time: number }
  | { kind: 'done' };

/**
 * 재생 중 현재 시각을 보고 다음에 할 일을 정한다 — 현재 구간 끝에 닿으면 다음
 * 구간 시작으로 건너뛰고, 마지막 구간이 끝나면 done.
 */
export function nextPlaybackStep(currentTime: number, ranges: ClipRange[], index: number): PlaybackStep {
  const cur = ranges[index];
  if (!cur || currentTime < cur.end) return { kind: 'continue' };
  const next = index + 1;
  if (next < ranges.length) return { kind: 'jump', index: next, time: ranges[next].start };
  return { kind: 'done' };
}
