import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Text } from '@/components/ui';
import { StageHeader } from '@/components/StageHeader';
import { localProgress } from '@/features/progress/localProgress';
import { useMediaPreview } from '@/features/interview/useMediaPreview';
import type { DifficultyTier } from '@/features/interview/difficulty';
import { IntroView } from '@/features/interview/views/IntroView';
import { MediaTestView } from '@/features/interview/views/MediaTestView';
import { ReadyView } from '@/features/interview/views/ReadyView';
import { QuestionView } from '@/features/interview/views/QuestionView';
import { ResultView } from '@/features/interview/views/ResultView';
import type { InterviewResult } from '@/features/interview/resultSummary';
import { HaruProfileView } from '@/features/haru/HaruProfileView';
import { FinalReport } from '@/features/report/FinalReport';
import { aboutMeLines, loadHaruTalk, profileIsCurrent, profileSourceItems } from '@/features/haru/store';

/**
 * about: "하루가 이렇게 이해했어요" 카드(1·2단계에서 하루와 나눈 대답이 이 기기에 있을 때만) →
 * intro: 면접관 소개·선택 → test: 기기 점검 → ready: 면접관 인사·진행 안내
 * → question: 면접 질문 → result
 * 예열 질문은 따로 두지 않고, 첫 질문을 가벼운 질문으로 시작해 면접 안에서 자연스럽게 풀어감.
 * 3단계는 실전 단계라 첫 질문도 분석 점수에 포함함.
 */
type Step = 'about' | 'intro' | 'test' | 'ready' | 'question' | 'result';

export default function InterviewStage() {
  // 2단계 끝에서 "하루가 이렇게 이해했어요"를 이미 확인하고 왔으면(넘겨받은 값, 또는 기기에 남은 지금 대답 기준 카드)
  // 다시 묻지 않고 면접관 소개부터. 대시보드 등에서 바로 왔고 확인한 카드가 없으면 예전처럼 카드부터 보여 준다.
  const location = useLocation();
  const [initial] = useState(() => {
    const passed = (location.state as { aboutMe?: string[] } | null)?.aboutMe;
    if (passed) return { step: 'intro' as Step, aboutMe: passed };
    const rec = loadHaruTalk();
    if (profileIsCurrent(rec)) return { step: 'intro' as Step, aboutMe: aboutMeLines(rec.profile?.items) };
    return { step: (profileSourceItems(rec).length ? 'about' : 'intro') as Step, aboutMe: [] as string[] };
  });
  const [step, setStep] = useState<Step>(initial.step);
  // 사용자가 카드에서 확인한 자기 이야기 — 기본 질문의 소재로 서버에 넘긴다(없으면 빈 목록)
  const [aboutMe, setAboutMe] = useState<string[]>(initial.aboutMe);
  // IntroView에서 유저가 최종 선택한 면접관 tier. 이후 음성·질문 난이도 모두 이 값 기준
  const [tier, setTier] = useState<DifficultyTier>('standard');
  // 면접을 끝까지 마친 뒤 결과 화면에 넘겨줄 이번 면접의 질문·답변 (면접 중 메모리에 모아둔 것)
  const [result, setResult] = useState<InterviewResult | null>(null);
  // intro 넘어가면서부터 계속 살아있게 최상위에서 관리.
  // 음량 측정은 기기 점검 화면에서만 (면접 중에는 질문 화면이 따로 측정함)
  const media = useMediaPreview({ measureLevel: step === 'test' });
  const navigate = useNavigate();
  // 면접관과 대화하는 구간에서만 헤더를 숨김
  const focusMode = step === 'ready' || step === 'question';

  // 집중 모드에서는 메뉴가 없어서 나갈 방법이 따로 필요함. 실수로 누르는 경우 대비해 한 번 더 확인
  const handleExit = () => {
    if (window.confirm('면접을 그만둘까요? 진행 중인 면접은 처음부터 다시 해야 해요.')) {
      navigate('/dashboard');
    }
  };

  const handleIntroStart = (selected: DifficultyTier) => {
    setTier(selected);
    setStep('test');
  };

  return (
    <Box style={{ minHeight: '100dvh', background: 'var(--rb-bg)', paddingBottom: 60 }}>
      {/* 면접관과 실제로 대화하는 구간(ready·question)은 헤더를 통째로 숨기는 집중 모드.
          스크롤·메뉴 때문에 시선이 흩어지면 2단계 시선 분석 결과가 틀어지기 때문.
          그 외 단계는 헤더 유지. 제목·설명 두 줄은 처음 화면(intro)에서만 표시 */}
      {focusMode ? (
        <Box style={{ padding: '12px 20px 0' }}>
          <button
            type="button"
            onClick={handleExit}
            style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
          >
            <Text fz={13} c="var(--rb-ink-faint)">
              ✕ 나가기
            </Text>
          </button>
        </Box>
      ) : (
        // 면접이 끝나면(result) 최종 통합 리포트를 보여 주므로 4단계 "결과"로 표시
        <StageHeader current={step === 'result' ? 4 : 3} />
      )}

      <Box style={{ maxWidth: step === 'result' ? 1072 : 960, margin: '0 auto', padding: '20px 16px 0' }}>
        {step === 'about' && (
          <HaruProfileView
            onNext={(lines) => {
              setAboutMe(lines);
              setStep('intro');
            }}
          />
        )}

        {step === 'intro' && <IntroView onStart={handleIntroStart} />}

        {step === 'test' && <MediaTestView media={media} onNext={() => setStep('ready')} />}

        {step === 'ready' && <ReadyView tier={tier} onStart={() => setStep('question')} />}

        {step === 'question' && (
          <QuestionView
            stream={media.stream}
            tier={tier}
            aboutMe={aboutMe}
            onAllDone={(r) => {
              // 끝까지 마친 면접만 완료로 기록 (대시보드 3단계 카드·진행률에 반영)
              localProgress.markStage3Done(tier);
              setResult(r);
              setStep('result');
            }}
          />
        )}

        {/* 3단계를 마치면 1·2·3단계를 한 장에 모은 최종 리포트(경량 웹 흐름). 3단계 부분은 기존 결과 화면 그대로 */}
        {step === 'result' && result && (
          <FinalReport
            answeredCount={result.turns.filter((t) => t.answer.trim()).length}
            interview={
              <ResultView
                result={result}
                tier={tier}
                onRetry={() => {
                  setResult(null);
                  setStep('intro'); // 면접관 선택부터 다시 (카메라·마이크 연결은 유지됨)
                }}
              />
            }
          />
        )}
      </Box>
    </Box>
  );
}