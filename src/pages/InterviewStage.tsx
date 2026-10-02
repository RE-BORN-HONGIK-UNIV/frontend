import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Text } from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { localProgress } from '@/features/progress/localProgress';
import { useMediaPreview } from '@/features/interview/useMediaPreview';
import type { DifficultyTier } from '@/features/interview/difficulty';
import { IntroView } from '@/features/interview/views/IntroView';
import { MediaTestView } from '@/features/interview/views/MediaTestView';
import { ReadyView } from '@/features/interview/views/ReadyView';
import { QuestionView } from '@/features/interview/views/QuestionView';
import { ResultView } from '@/features/interview/views/ResultView';
import type { InterviewResult } from '@/features/interview/resultSummary';

/**
 * intro: 면접관 소개·선택 → test: 기기 점검 → ready: 면접관 인사·진행 안내
 * → question: 면접 질문 → result
 * 예열 질문은 따로 두지 않고, 첫 질문을 가벼운 질문으로 시작해 면접 안에서 자연스럽게 풀어감.
 * 3단계는 실전 단계라 첫 질문도 분석 점수에 포함함.
 */
type Step = 'intro' | 'test' | 'ready' | 'question' | 'result';

export default function InterviewStage() {
  const [step, setStep] = useState<Step>('intro');
  // IntroView에서 유저가 최종 선택한 면접관 tier. 이후 음성·질문 난이도 모두 이 값 기준
  const [tier, setTier] = useState<DifficultyTier>('standard');
  // 면접을 끝까지 마친 뒤 결과 화면에 넘겨줄 이번 면접의 질문·답변 (면접 중 메모리에 모아둔 것)
  const [result, setResult] = useState<InterviewResult | null>(null);
  // 기록 저장·AI 코치 노트 동의 여부 — IntroView에서 정한 값. false면 서버에 아무것도 저장·전송하지 않음
  const [consent, setConsent] = useState(false);
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

  const handleIntroStart = (selected: DifficultyTier, agreed: boolean) => {
    setTier(selected);
    setConsent(agreed);
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
        // PageHeader는 title이 필수라 intro가 아닐 땐 빈 문자열로 넘겨서 제목 줄만 비움
        <PageHeader
          back="/dashboard"
          eyebrow="3단계 · 실전 면접 시뮬레이션"
          title={step === 'intro' ? '면접 시뮬레이터' : ''}
          subtitle={
            step === 'intro'
              ? '1,2단계 진단 결과를 바탕으로 난이도가 조절된 실전 면접을 진행합니다.'
              : undefined
          }
        />
      )}

      <Box style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px 0' }}>
        {step === 'intro' && <IntroView onStart={handleIntroStart} />}

        {step === 'test' && <MediaTestView media={media} onNext={() => setStep('ready')} />}

        {step === 'ready' && <ReadyView tier={tier} onStart={() => setStep('question')} />}

        {step === 'question' && (
          <QuestionView
            stream={media.stream}
            tier={tier}
            consent={consent}
            onAllDone={(r) => {
              // 끝까지 마친 면접만 완료로 기록 (대시보드 3단계 카드·진행률에 반영)
              localProgress.markStage3Done(tier);
              setResult(r);
              setStep('result');
            }}
          />
        )}

        {step === 'result' && result && (
          <ResultView
            result={result}
            tier={tier}
            consent={consent}
            onRetry={() => {
              setResult(null);
              setStep('intro'); // 면접관 선택부터 다시 (카메라·마이크 연결은 유지됨)
            }}
          />
        )}
      </Box>
    </Box>
  );
}