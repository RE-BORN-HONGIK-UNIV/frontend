import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box } from '@/components/ui';
import { StageHeader } from '@/components/StageHeader';
import { api } from '@/lib/api/client';
import type { InterviewResult } from '@/features/interview/resultSummary';
import { FinalReport } from '@/features/report/FinalReport';
import { SAMPLE_COACH, SAMPLE_DETAILS, SAMPLE_INTERVIEW } from '@/features/report/sample';

type Latest = { result: InterviewResult; at: string } | null;

/** 가장 최근에 끝까지 마친 면접(sessionId를 주면 그 면접 — 마이페이지 "지난 기록") — 질문·답변까지 불러온다.
 * 없거나 못 불러오면 null */
async function loadLatestInterview(sessionId?: number): Promise<Latest> {
  let id = sessionId;
  if (id === undefined) {
    const { sessions } = await api.listInterviewSessions();
    const done = sessions.filter((s) => s.completedAt).sort((a, b) => (b.completedAt! > a.completedAt! ? 1 : -1))[0];
    if (!done) return null;
    id = done.id;
  }
  const d = await api.getInterviewSession(id);
  return {
    at: d.completedAt ?? d.startedAt,
    result: {
      sessionId: d.id,
      startedAt: Date.parse(d.startedAt),
      endedAt: Date.parse(d.completedAt ?? d.startedAt),
      turns: d.turns.map((t) => ({ kind: t.kind, question: t.question, answer: t.answer ?? '' })),
    },
  };
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Box style={{ minHeight: '100dvh', background: 'var(--rb-bg)', paddingBottom: 60 }}>
      <StageHeader current={4} />
      <Box style={{ maxWidth: 1072, margin: '0 auto', padding: '20px 16px 0' }}>{children}</Box>
    </Box>
  );
}

/**
 * 대시보드에서 최종 통합 리포트 다시 보기 (/report).
 * 1·2단계는 이 기기 기록(없으면 서버 요약), 3단계는 서버에 저장된 가장 최근 완료 면접.
 * 리포트 모양은 면접 직후와 같다.
 */
export default function ReportPage() {
  const [latest, setLatest] = useState<Latest | undefined>(undefined);
  // /report?session=12 — 마이페이지 "지난 기록"에서 고른 면접
  const [params] = useSearchParams();
  const sessionParam = Number(params.get('session'));
  const sessionId = Number.isInteger(sessionParam) && sessionParam > 0 ? sessionParam : undefined;

  useEffect(() => {
    let cancelled = false;
    loadLatestInterview(sessionId)
      .catch(() => null)
      .then((r) => !cancelled && setLatest(r));
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <Shell>
      <FinalReport interview={latest === undefined ? undefined : (latest?.result ?? null)} date={latest?.at} />
    </Shell>
  );
}

/**
 * 예시 리포트 (/report/sample) — 로그인 없이 리포트 모양을 볼 수 있게(판넬·팀 확인용).
 * 값은 전부 sample.ts의 예시이고 실제 기록이 아니라고 맨 위에 표시한다. 서버 요청·AI 호출 없음.
 */
export function SampleReportPage() {
  return (
    <Shell>
      <FinalReport
        details={SAMPLE_DETAILS}
        interview={SAMPLE_INTERVIEW}
        sampleCoach={SAMPLE_COACH}
        date="2026-10-31T10:32:00Z"
        notice={
          <div className="sample-note" role="note">
            <b>예시 화면이에요.</b> 실제 사용자의 기록이 아니라, 리포트가 어떻게 보이는지 보여 주려고 넣은 값이에요.
          </div>
        }
      />
    </Shell>
  );
}
