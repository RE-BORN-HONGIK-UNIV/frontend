import { useState } from 'react';
import { Box, Button, Stack, Text } from '@mantine/core';
import { PageHeader } from '@/components/PageHeader';

// 3단계는 앞으로 도입 -> 예열질문 -> 본질문 -> 결과 순으로 확장될 예정.
// 지금은 '도입(intro)' 단계만 구현.
type Step = 'intro' | 'warmup' | 'question' | 'result';

function IntroView({ onStart }: { onStart: () => void }) {
  return (
    <Stack align="center" gap={20} ta="center" style={{ paddingTop: 40 }}>
      {/* 아바타 자리 - 나중에 실제 아바타(이미지/영상)로 교체 예정 */}
      <Box
        style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          background: 'var(--rb-surface)',
          border: '1.5px dashed var(--rb-line-strong)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text fz={36}>🙂</Text>
      </Box>

      <Stack gap={8}>
        <Text fz={17} fw={600}>
          안녕하세요, 오늘 함께 연습해볼게요
        </Text>
        <Text fz={13} c="var(--rb-ink-soft)" style={{ maxWidth: 320, lineHeight: 1.6 }}>
          이건 실제 면접이 아니라 연습이에요. 편하게 준비되면 시작해주세요.
          언제든 중간에 쉬거나 멈출 수 있어요.
        </Text>
      </Stack>

      <Button color="brand" radius="md" size="md" onClick={onStart}>
        준비됐어요
      </Button>
    </Stack>
  );
}

export default function InterviewStage() {
  const [step, setStep] = useState<Step>('intro');

  return (
    <Box style={{ minHeight: '100dvh', background: 'var(--rb-bg)', paddingBottom: 60 }}>
      <PageHeader
        back="/dashboard"
        eyebrow="3단계 · 실전 면접 시뮬레이션"
        title="면접 시뮬레이터"
        subtitle="1,2단계 진단 결과를 바탕으로 난이도가 조절된 실전 면접을 진행합니다."
      />

      <Box style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 0' }}>
        {step === 'intro' && (
          <IntroView
            onStart={() => {
              // TODO: 예열 질문 화면(warmup)으로 전환하는 로직은 다음 단계에서 구현
              setStep('warmup');
            }}
          />
        )}

        {step === 'warmup' && (
          <Text ta="center" c="var(--rb-ink-soft)" mt={40}>
            (다음 단계: 예열 질문 화면 — 아직 구현 전)
          </Text>
        )}
      </Box>
    </Box>
  );
}