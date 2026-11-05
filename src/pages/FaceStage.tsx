import { useCallback, useState } from 'react';
import { Box } from '@/components/ui';
import { StageHeader } from '@/components/StageHeader';
import type { GazeBlinkResult } from '@/lib/api/types';
import { HaruCallView } from '@/features/face/live/HaruCallView';
import { localProgress } from '@/features/progress/localProgress';
import { stage2OverallScore } from '@/features/progress/stageProgress';
import { saveStage2Detail } from '@/features/report/stageDetails';

/** 통화 대기실·통화 화면은 경량 웹처럼 넓게(하루·내 카메라 두 칸) */
const CALL_MAXW = 1180;

/* ── page ────────────────────────────────────────────────── */

export default function FaceStage() {
  // 2단계는 하루와 영상 통화하는 동안 실시간 분석만 한다(HaruCallView — 경량 웹 2단계 화면을 가져옴).
  // 예전 "영상 업로드" 모드(POST /analyze/gaze-blink)는 2026-10-31 팀 결정으로 폐기.
  // 결과는 여기서 따로 보여 주지 않고 3단계를 마친 뒤 최종 통합 리포트에서 한 번에 보여 준다(경량 웹 흐름).
  // 예전 "2단계를 마쳤어요" 카드는 뺐다 — 통화 화면에서 빨간 버튼으로 끊으면 그 옆에 "3단계 시작하기"가 나온다.
  const [callKey, setCallKey] = useState(0);

  // 분석 결과가 나오면: 대시보드용 완료 메모(서버 조회가 안 될 때 대신 씀) + 최종 리포트에 쓸 세부값을 이 기기에 남긴다
  const save = useCallback((result: GazeBlinkResult) => {
    localProgress.markStage2Done(
      stage2OverallScore({
        blink: result.blink.score,
        gaze: result.gaze.score,
        expression: result.expression.score,
      }),
    );
    saveStage2Detail(result);
  }, []);

  return (
    <Box style={{ minHeight: '100dvh', background: 'var(--rb-bg)', paddingBottom: 60 }}>
      <StageHeader current={2} />

      <Box style={{ maxWidth: CALL_MAXW, margin: '0 auto', padding: '40px 16px 0' }}>
        {/* 경량 웹 대기실 화면 그대로 — 예전 체크리스트 6칸·"하루와 영상 통화" 라벨은 뺐다(안내는 대기실 화면 안에) */}
        <HaruCallView key={callKey} onComplete={save} onRestart={() => setCallKey((k) => k + 1)} />
      </Box>
    </Box>
  );
}
