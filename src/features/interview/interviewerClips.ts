/** 면접관 영상 고르기 — 대사마다 입 모양 영상이 있는지(public/interviewer/clips). 영상 틀기는 InterviewerVideo.tsx */
import { lineId } from './prerecorded';

// 입 모양 영상이 있는 대사 — 새 영상을 넣으면 여기에 이름을 더한다. 없는 대사는 mp3·말하기 반복 영상으로
const LIPSYNC = new Set([
  'iv-hello', 'iv-bye', 'iv-first-warmup', 'iv-first-standard', 'iv-first-practice', 'iv-ack-2', 'iv-ack-3',
  ...[1, 2, 3, 4, 5, 6].flatMap((i) => [`iv-q-standard-${i}`, `iv-q-warmup-${i}`]),
  'iv-q-practice-1', 'iv-q-practice-2', 'iv-q-practice-3', 'iv-q-practice-4',
  'iv-f-standard-1', 'iv-f-standard-2', 'iv-f-standard-3', 'iv-f-standard-4', 'iv-f-warmup-1', 'iv-f-warmup-2', 'iv-f-warmup-3',
  'iv-f-warmup-4', 'iv-f-practice-1', 'iv-f-practice-2', 'iv-f-practice-3', 'iv-f-practice-4',
]);
const LOOPS = ['loop-listen', 'loop-think', 'loop-talk'];

export type Clip = string;
export const ALL_CLIPS: Clip[] = [...LOOPS, ...LIPSYNC];
export const isLipsync = (clip: Clip) => LIPSYNC.has(clip);

/** 이 문장의 입 모양 영상 이름. 없으면 null(소리는 mp3로, 영상은 말하기 반복) */
export function lipsyncClip(text: string): Clip | null {
  const id = lineId(text);
  return id && LIPSYNC.has(id) ? id : null;
}
