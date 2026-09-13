import { useState } from 'react';
import { Box } from '@mantine/core';
import { PageHeader } from '@/components/PageHeader';
import { useMediaPreview } from '@/features/interview/useMediaPreview';
import { getAnxietyScore, getTier, type TierInfo } from '@/features/interview/difficulty';
import { IntroView } from '@/features/interview/views/IntroView';
import { MediaTestView } from '@/features/interview/views/MediaTestView';
import { WarmupView } from '@/features/interview/views/WarmupView';
import { QuestionView } from '@/features/interview/views/QuestionView';
import { ResultView } from '@/features/interview/views/ResultView';

type Step = 'intro' | 'test' | 'warmup' | 'question' | 'result';

export default function InterviewStage() {
  const [step, setStep] = useState<Step>('intro');
  const [tier, setTier] = useState<TierInfo | null>(null);
  const media = useMediaPreview(); // intro 넘어가면서부터 계속 살아있게 최상위에서 관리

  const handleWarmupDone = async () => {
    // TODO: Stage1/2 연동 전까지는 mock 점수. 연동되면 getAnxietyScore() 내부만 교체하면 됨.
    const score = await getAnxietyScore();
    setTier(getTier(score));
    setStep('question');
  };

  return (
    <Box style={{ minHeight: '100dvh', background: 'var(--rb-bg)', paddingBottom: 60 }}>
      <PageHeader
        back="/dashboard"
        eyebrow="3단계 · 실전 면접 시뮬레이션"
        title="면접 시뮬레이터"
        subtitle="1,2단계 진단 결과를 바탕으로 난이도가 조절된 실전 면접을 진행합니다."
      />

      <Box style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px 0' }}>
        {step === 'intro' && <IntroView onStart={() => setStep('test')} />}

        {step === 'test' && <MediaTestView media={media} onNext={() => setStep('warmup')} />}

        {step === 'warmup' && (
          <WarmupView stream={media.stream} onDone={handleWarmupDone} />
        )}

        {step === 'question' && tier && (
          <QuestionView
            stream={media.stream}
            tier={tier.tier}
            onAllDone={() => setStep('result')}
          />
        )}

        {step === 'result' && <ResultView />}
      </Box>
    </Box>
  );
}
