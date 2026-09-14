import { useEffect, useState } from 'react';
import {
  Alert,
  Anchor,
  Box,
  Button,
  Dropzone,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { ApiError } from '@/lib/api/client';
import type { AnalyzeResult } from '@/lib/api/types';
import { AXES, GUIDE_ITEMS, TRAINING_TIPS, scoreColor, type AxisKey } from '@/features/voice/constants';
import { overallScore } from '@/features/voice/feedback';
import { localProgress } from '@/features/progress/localProgress';
import { useAnalyze } from '@/features/voice/queries';
import { VoiceRadar } from '@/features/voice/VoiceRadar';
import { Step1FeedbackCoach } from '@/features/voice/Step1FeedbackCoach';

const MAXW = 720;

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--rb-primary-strong)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text fz={13} fw={700} c="var(--rb-primary-strong)" style={{ letterSpacing: '0.08em' }}>
      {children}
    </Text>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <Paper p={24} radius="lg" withBorder style={{ background: 'var(--rb-surface)', borderColor: 'var(--rb-line)' }}>
      {children}
    </Paper>
  );
}

/* ── result view ─────────────────────────────────────────── */

function ResultView({ result, onReset }: { result: AnalyzeResult; onReset: () => void }) {
  const { scores } = result;
  const ov = overallScore(scores);
  const sorted = [...(Object.entries(scores) as [AxisKey, number][])].sort((a, b) => b[1] - a[1]);
  const strengths = sorted.slice(0, 2);
  const weaknesses = sorted.slice(-2).reverse();
  const worst = sorted[sorted.length - 1][0];

  const metrics = [
    { label: '음성 길이', value: result.pause_detail.total_duration_sec, unit: '초' },
    {
      label: '채움말 / 전체 구간',
      value: `${result.filler_detail.filler_count}/${result.filler_detail.sound_segment_count}`,
      unit: '개',
    },
    {
      label: '불안 멈춤 / 전체 멈춤',
      value: `${result.pause_detail.anxious_pause_count}/${result.pause_detail.pause_count}`,
      unit: '개',
    },
    { label: '음성 떨림 지수', value: result.probabilities.tremor, unit: '%' },
  ];

  return (
    <Stack gap={20}>
      <Button variant="default" radius="md" onClick={onReset} fullWidth>
        ↺ 새 파일로 다시 분석
      </Button>

      <Box
        style={{
          border: '1.5px solid var(--rb-line-strong)',
          background: 'var(--rb-primary-tint)',
          borderRadius: 12,
          padding: '12px 16px',
        }}
      >
        <Text fz={14} fw={600} c="var(--rb-primary-strong)">
          CNN 모델 직접 점수
        </Text>
        <Group gap={6} mt={8} wrap="wrap">
          {Object.entries(result.model_scores).map(([k, v]) => (
            <Text
              key={k}
              fz={12}
              style={{ background: 'rgba(255,255,255,0.7)', padding: '2px 10px', borderRadius: 20 }}
            >
              {k}: <strong>{v}점</strong>
            </Text>
          ))}
        </Group>
        {result.demo_mode && (
          <Text fz={11} c="var(--rb-ink-faint)" mt={6}>
            ※ 모델 파일 없음 — 데모 모드 (CNN 3지표는 참고용)
          </Text>
        )}
      </Box>

      <SectionLabel>발화 역량 오각형 분석</SectionLabel>
      <Panel>
        <VoiceRadar scores={scores} />
        <Stack gap={8} mt={12}>
          {AXES.map((a) => {
            const v = scores[a.key];
            return (
              <Group key={a.key} gap={8} wrap="nowrap">
                <Text fz={13} fw={600} style={{ flex: '0 0 84px' }}>
                  {a.label}
                </Text>
                <Box style={{ flex: 1, height: 5, background: 'var(--rb-line)', borderRadius: 4 }}>
                  <Box
                    style={{
                      width: `${v}%`,
                      height: '100%',
                      borderRadius: 4,
                      background: scoreColor(v),
                    }}
                  />
                </Box>
                <Text fz={13} fw={700} style={{ flex: '0 0 30px', textAlign: 'right', color: scoreColor(v) }}>
                  {v}
                </Text>
              </Group>
            );
          })}
          <Group justify="space-between" mt={6} pt={10} style={{ borderTop: '1px solid var(--rb-line)' }}>
            <Text fz={13} c="var(--rb-ink-soft)">
              종합 점수
            </Text>
            <Text fz={22} fw={700} style={{ color: scoreColor(ov) }}>
              {ov}
              <Text component="span" fz={13} c="var(--rb-ink-faint)">
                {' '}
                / 100
              </Text>
            </Text>
          </Group>
        </Stack>
      </Panel>

      <SectionLabel>상세 측정 지표</SectionLabel>
      <Panel>
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing={10}>
          {metrics.map((m) => (
            <Stack key={m.label} gap={4} align="center" ta="center" style={{ background: 'var(--rb-bg)', borderRadius: 10, padding: '12px 8px' }}>
              <Text fz={11} c="var(--rb-ink-faint)">
                {m.label}
              </Text>
              <Text fz={20} fw={600}>
                {m.value ?? '–'}
              </Text>
              <Text fz={11} c="var(--rb-ink-faint)">
                {m.unit}
              </Text>
            </Stack>
          ))}
        </SimpleGrid>
      </Panel>

      <SectionLabel>맞춤 피드백</SectionLabel>
      <Panel>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={12}>
          <Stack gap={8}>
            <Text fz={13} fw={700} c="#1e8a57">
              ✓ 강점
            </Text>
            {strengths.map(([key, val]) => {
              const axis = AXES.find((a) => a.key === key)!;
              return (
                <Box key={key} style={{ background: '#f0fbf5', border: '1px solid #8dddb5', borderRadius: 10, padding: '10px 12px' }}>
                  <Text fz={13} fw={600}>
                    {axis.label} <Text component="span" c="#1e8a57">{val}점</Text>
                  </Text>
                  <Text fz={12} c="var(--rb-ink-soft)" mt={2}>
                    {axis.desc}
                  </Text>
                </Box>
              );
            })}
          </Stack>
          <Stack gap={8}>
            <Text fz={13} fw={700} c="#b07a00">
              ! 보완점
            </Text>
            {weaknesses.map(([key, val]) => {
              const axis = AXES.find((a) => a.key === key)!;
              return (
                <Box key={key} style={{ background: '#fffbea', border: '1px solid #f5e17a', borderRadius: 10, padding: '10px 12px' }}>
                  <Text fz={13} fw={600}>
                    {axis.label} <Text component="span" c="#b07a00">{val}점</Text>
                  </Text>
                  <Text fz={12} c="var(--rb-ink-soft)" mt={2}>
                    {axis.desc}
                  </Text>
                </Box>
              );
            })}
          </Stack>
        </SimpleGrid>

        <Step1FeedbackCoach result={result} />

        <Box style={{ background: 'var(--rb-primary-tint)', border: '1px solid var(--rb-line)', borderRadius: 10, padding: '12px 14px', marginTop: 10 }}>
          <Text fz={12} fw={700} c="var(--rb-primary-strong)" mb={4}>
            다음 훈련 제안
          </Text>
          <Text fz={13} style={{ lineHeight: 1.7 }}>
            {TRAINING_TIPS[worst]}
          </Text>
        </Box>
      </Panel>
    </Stack>
  );
}

/* ── page ────────────────────────────────────────────────── */

export default function VoiceStage() {
  const [file, setFile] = useState<File | null>(null);
  const analyze = useAnalyze();
  const result = analyze.data ?? null;

  useEffect(() => {
    if (result) localProgress.markStage1Done(overallScore(result.scores));
  }, [result]);

  const reset = () => {
    setFile(null);
    analyze.reset();
  };

  return (
    <Box style={{ minHeight: '100dvh', background: 'var(--rb-bg)', paddingBottom: 60 }}>
      <PageHeader
        back="/dashboard"
        eyebrow="1단계 · 음성 정밀 진단"
        title="보이스 터치"
        subtitle="발화를 올리면 5가지 지표를 오각형 그래프로 진단하고, 함께 연습할 부분을 짚어줍니다."
      />

      <Box style={{ maxWidth: MAXW, margin: '0 auto', padding: '20px 16px 0' }}>
        {result ? (
          <ResultView result={result} onReset={reset} />
        ) : (
          <Stack gap={20}>
            <SectionLabel>분석 전 체크리스트</SectionLabel>
            <SimpleGrid cols={{ base: 2, sm: 3 }} spacing={10}>
              {GUIDE_ITEMS.map((g) => (
                <Stack key={g.title} gap={6} style={{ background: 'var(--rb-surface)', border: '1px solid var(--rb-line)', borderRadius: 12, padding: '14px 12px' }}>
                  <Check />
                  <Text fz={13} fw={600} c="var(--rb-primary-strong)">
                    {g.title}
                  </Text>
                  <Text fz={11} c="var(--rb-ink-soft)" style={{ lineHeight: 1.5 }}>
                    {g.desc}
                  </Text>
                </Stack>
              ))}
            </SimpleGrid>

            <SectionLabel>음성 파일 업로드</SectionLabel>
            <Panel>
              <Dropzone
                onDrop={(files) => setFile(files[0] ?? null)}
                onReject={() => setFile(null)}
                accept={{ 'audio/wav': ['.wav'], 'audio/x-wav': ['.wav'], 'audio/wave': ['.wav'] }}
                maxFiles={1}
                multiple={false}
                radius="md"
                style={{ border: '2px dashed var(--rb-line-strong)', background: 'var(--rb-bg)' }}
              >
                <Stack align="center" gap={6} py={24} style={{ pointerEvents: 'none' }}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--rb-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 15V3M7 8l5-5 5 5" />
                    <path d="M20 17v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3" />
                  </svg>
                  <Text fz={14} fw={500}>
                    음성 파일을 업로드하세요
                  </Text>
                  <Text fz={12} c="var(--rb-ink-faint)">
                    WAV 형식 · 드래그하거나 클릭
                  </Text>
                </Stack>
              </Dropzone>

              {file && !analyze.isPending && (
                <Group mt={10} gap={10} style={{ background: 'var(--rb-bg)', border: '1px solid var(--rb-line-strong)', borderRadius: 10, padding: '10px 14px' }}>
                  <Text fz={13} style={{ flex: 1, wordBreak: 'break-all' }}>
                    {file.name}
                  </Text>
                  <Anchor fz={13} c="var(--rb-ink-faint)" onClick={reset}>
                    ✕
                  </Anchor>
                </Group>
              )}

              {analyze.isPending && (
                <Group mt={14} gap={10} justify="center">
                  <Loader size="sm" color="brand" />
                  <Text fz={13} c="var(--rb-ink-soft)">
                    분석 중… (음성 길이에 따라 30초~2분 정도 걸려요)
                  </Text>
                </Group>
              )}

              {analyze.isError && (
                <Alert color="red" variant="light" mt={10} p="xs" fz={13}>
                  {analyze.error instanceof ApiError
                    ? analyze.error.message
                    : '백엔드에 연결할 수 없어요. (localhost:5000 실행 확인)'}
                </Alert>
              )}

              <Button
                mt={12}
                fullWidth
                color="brand"
                radius="md"
                disabled={!file}
                loading={analyze.isPending}
                onClick={() => file && analyze.mutate(file)}
              >
                AI 분석 시작
              </Button>
            </Panel>
          </Stack>
        )}
      </Box>
    </Box>
  );
}
