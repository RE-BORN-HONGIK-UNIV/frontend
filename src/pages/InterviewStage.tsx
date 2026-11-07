import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box } from '@/components/ui';
import { StageHeader } from '@/components/StageHeader';
import { localProgress } from '@/features/progress/localProgress';
import { useMediaPreview } from '@/features/interview/useMediaPreview';
import type { DifficultyTier } from '@/features/interview/difficulty';
import { Stage3PrepView } from '@/features/interview/views/Stage3PrepView';
import { QuestionView } from '@/features/interview/views/QuestionView';
import { ResultView } from '@/features/interview/views/ResultView';
import type { InterviewResult } from '@/features/interview/resultSummary';
import { HaruProfileView } from '@/features/haru/HaruProfileView';
import { FinalReport } from '@/features/report/FinalReport';
import { aboutMeLines, loadHaruTalk, profileIsCurrent, profileSourceItems } from '@/features/haru/store';

/**
 * about: "하루가 이렇게 이해했어요" 카드(1·2단계에서 하루와 나눈 대답이 이 기기에 있을 때만) →
 * prep: "이제 실전 면접이에요" + 마이크·카메라 확인(경량 웹 Prep3, 난이도는 1·2단계 점수로 자동) →
 * question: 면접 질문 → result
 * 2026-11 경량 웹 흐름으로 바꾸며 예전 intro(면접관 고르기)·test(기기 점검)·ready(면접관 인사)는 뺐다.
 * 예열 질문은 따로 두지 않고, 첫 질문을 가벼운 질문으로 시작해 면접 안에서 자연스럽게 풀어감.
 * 3단계는 실전 단계라 첫 질문도 분석 점수에 포함함.
 */
type Step = 'about' | 'prep' | 'question' | 'result';

export default function InterviewStage() {
  // 2단계 끝에서 "하루가 이렇게 이해했어요"를 이미 확인하고 왔으면(넘겨받은 값, 또는 기기에 남은 지금 대답 기준 카드)
  // 다시 묻지 않고 면접관 소개부터. 대시보드 등에서 바로 왔고 확인한 카드가 없으면 예전처럼 카드부터 보여 준다.
  const location = useLocation();
  const [initial] = useState(() => {
    const passed = (location.state as { aboutMe?: string[] } | null)?.aboutMe;
    if (passed) return { step: 'prep' as Step, aboutMe: passed };
    const rec = loadHaruTalk();
    if (profileIsCurrent(rec)) return { step: 'prep' as Step, aboutMe: aboutMeLines(rec.profile?.items) };
    return { step: (profileSourceItems(rec).length ? 'about' : 'prep') as Step, aboutMe: [] as string[] };
  });
  const [step, setStep] = useState<Step>(initial.step);
  // 사용자가 카드에서 확인한 자기 이야기 — 기본 질문의 소재로 서버에 넘긴다(없으면 빈 목록)
  const [aboutMe, setAboutMe] = useState<string[]>(initial.aboutMe);
  // 1·2단계 점수로 자동으로 정한 면접관 tier(Stage3PrepView). 이후 음성·질문 난이도 모두 이 값 기준
  const [tier, setTier] = useState<DifficultyTier>('standard');
  // 면접을 끝까지 마친 뒤 결과 화면에 넘겨줄 이번 면접의 질문·답변 (면접 중 메모리에 모아둔 것)
  const [result, setResult] = useState<InterviewResult | null>(null);
  // 시작 화면에서 연결해 면접 끝까지 살아있게 최상위에서 관리. 음량 막대는 이제 쓰지 않음(면접 중에는 질문 화면이 따로 측정함)
  const media = useMediaPreview({ measureLevel: false });
  const navigate = useNavigate();
  // 면접관과 대화하는 구간에서만 헤더를 숨김
  const focusMode = step === 'question';

  // 집중 모드에서는 메뉴가 없어서 나갈 방법이 따로 필요함. 실수로 누르는 경우 대비해 한 번 더 확인
  const handleExit = () => {
    if (window.confirm('면접을 그만둘까요? 진행 중인 면접은 처음부터 다시 해야 해요.')) {
      navigate('/dashboard');
    }
  };

  const handlePrepStart = (auto: DifficultyTier) => {
    setTier(auto);
    setStep('question');
  };

  // 면접 중(question)은 경량 웹처럼 헤더 없이 어두운 면접실 화면만 — 스크롤·메뉴 때문에 시선이 흩어지지 않게(QuestionView가 화면을 다 채움)
  if (focusMode) {
    return (
      <QuestionView
        stream={media.stream}
        tier={tier}
        aboutMe={aboutMe}
        onQuit={handleExit}
        onAllDone={(r) => {
          // 끝까지 마친 면접만 완료로 기록 (대시보드 3단계 카드·진행률에 반영)
          localProgress.markStage3Done(tier);
          setResult(r);
          setStep('result');
        }}
      />
    );
  }

  return (
    <Box
      style={{
        minHeight: '100dvh',
        background: 'var(--rb-bg)',
        paddingBottom: step === 'prep' ? 0 : 60,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 면접이 끝나면(result) 최종 통합 리포트를 보여 주므로 4단계 "결과"로 표시 */}
      <StageHeader current={step === 'result' ? 4 : 3} />

      {/* 시작 화면(prep)은 머리줄 아래 남은 높이의 가운데에 — 위·아래 여백을 같게(예전엔 위 20px, 아래가 크게 비었음) */}
      <Box
        style={
          step === 'prep'
            ? { flex: 1, width: '100%', maxWidth: 960, margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }
            : { width: '100%', maxWidth: step === 'result' ? 1072 : 960, margin: '0 auto', padding: '20px 16px 0' }
        }
      >
        {step === 'about' && (
          <HaruProfileView
            onNext={(lines) => {
              setAboutMe(lines);
              setStep('prep');
            }}
          />
        )}

        {step === 'prep' && <Stage3PrepView media={media} onStart={handlePrepStart} />}

        {/* 3단계를 마치면 1·2·3단계를 한 장에 모은 최종 리포트(경량 웹 흐름). 3단계 부분은 기존 결과 화면 그대로 */}
        {step === 'result' && result && (
          <FinalReport
            writingIntro
            answeredCount={result.turns.filter((t) => t.answer.trim()).length}
            interview={
              <ResultView
                result={result}
                tier={tier}
                onRetry={() => {
                  setResult(null);
                  setStep('prep'); // 시작 화면부터 다시 (카메라·마이크 연결은 유지됨)
                }}
              />
            }
          />
        )}
      </Box>
    </Box>
  );
}