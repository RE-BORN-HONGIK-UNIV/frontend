import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@/components/ui';
import { StageHeader } from '@/components/StageHeader';
import type { GazeBlinkResult } from '@/lib/api/types';
import { HaruCallView } from '@/features/face/live/HaruCallView';
import { HaruProfileView } from '@/features/haru/HaruProfileView';
import { loadHaruTalk, profileSourceItems } from '@/features/haru/store';
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
  // 통화를 끝내면(빨간 버튼) 경량 웹처럼 "하루가 이렇게 이해했어요" 카드가 나오고, 확인하면 3단계로 간다.
  // 카드에서 확인한 내용은 기기에 남아 3단계가 다시 묻지 않는다(InterviewStage).
  const [profile, setProfile] = useState(false);
  const navigate = useNavigate();
  const handleHungUp = useCallback(() => {
    // 하루와 나눈 대답이 하나도 없으면(전부 넘김) 정리할 게 없으니 바로 3단계로
    if (profileSourceItems(loadHaruTalk()).length) setProfile(true);
    else navigate({ pathname: '/interview', search: window.location.search });
  }, [navigate]);

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
        {profile ? (
          <HaruProfileView
            badge="2단계를 마쳤어요"
            // 주소 뒤 ?test=1(개발용 3단계 테스트 모드)은 3단계로 그대로 넘긴다
            onNext={(lines) => navigate({ pathname: '/interview', search: window.location.search }, { state: { aboutMe: lines } })}
            onQuit={() => navigate('/dashboard')}
          />
        ) : (
          // 경량 웹 대기실 화면 그대로 — 예전 체크리스트 6칸·"하루와 영상 통화" 라벨은 뺐다(안내는 대기실 화면 안에)
          <HaruCallView onComplete={save} onHungUp={handleHungUp} />
        )}
      </Box>
    </Box>
  );
}
