import type { InterviewSessionSummary } from '@/lib/api/types';
import { parseServerTime } from './stageProgress';

/**
 * 대시보드(마이페이지) "지난 기록" — 지금 서버가 주는 것만으로 만든다.
 * - 1·2단계: 서버가 가장 최근 1건만 준다(/analyze/stage1/latest, /analyze/stage2/latest) → 최근 1건씩
 * - 3단계: 면접 목록(/interview/sessions) 중 끝까지 마친 것 전부 → 누르면 그 면접의 리포트(/report?session=id)
 * 점수·등급은 넣지 않는다(CLAUDE.md: 결과 화면에 평가 표현을 넣지 않음) — 언제 무엇을 했는지만.
 */
export interface HistoryItem {
  key: string;
  at: string;
  title: string;
  detail: string;
  /** 누르면 갈 곳(없으면 보기만) */
  to: string | null;
}

export function buildHistory(
  stage1At: string | null,
  stage2At: string | null,
  sessions: InterviewSessionSummary[],
  limit = 8,
): HistoryItem[] {
  const items: HistoryItem[] = [];
  if (stage1At) items.push({ key: 's1', at: stage1At, title: '1단계 목소리 대화', detail: '하루와 이야기했어요', to: null });
  if (stage2At) items.push({ key: 's2', at: stage2At, title: '2단계 영상 통화', detail: '하루와 영상 통화했어요', to: null });
  for (const s of sessions) {
    if (!s.completedAt) continue;
    items.push({
      key: `s3-${s.id}`,
      at: parseServerTime(s.completedAt),
      title: '3단계 실전 면접',
      detail: `질문 ${s.turnCount}개에 대답했어요 · 리포트 보기`,
      to: `/report?session=${s.id}`,
    });
  }
  return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, limit);
}

/** "11월 7일" / 오늘이면 "오늘", 어제면 "어제" */
export function formatHistoryDate(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86_400_000);
  if (diff === 0) return '오늘';
  if (diff === 1) return '어제';
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** "이어서 하기" — 아직 안 한 가장 앞 단계로. 다 했으면 리포트 */
export function nextStep(s1: boolean, s2: boolean, s3: boolean): { label: string; to: string } {
  if (!s1) return { label: '1단계 목소리 대화 시작하기', to: '/voice' };
  if (!s2) return { label: '이어서 하기 · 2단계 영상 통화', to: '/face' };
  if (!s3) return { label: '이어서 하기 · 3단계 실전 면접', to: '/interview' };
  return { label: '최종 리포트 보기', to: '/report' };
}
