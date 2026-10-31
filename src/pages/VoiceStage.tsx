import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Group,
  LoadingBar,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { ApiError } from '@/lib/api/client';
import type { AnalyzeResult, CalibrationResult } from '@/lib/api/types';
import { AXES, GUIDE_ITEMS, TRAINING_TIPS, scoreColor, type AxisKey } from '@/features/voice/constants';
import { overallScore } from '@/features/voice/feedback';
import { localProgress } from '@/features/progress/localProgress';
import { useAnalyze } from '@/features/voice/queries';
import { VoiceRadar } from '@/features/voice/VoiceRadar';
import { Step1FeedbackCoach } from '@/features/voice/Step1FeedbackCoach';
import { CalibrationStep } from '@/features/voice/CalibrationStep';
import { HaruChat } from '@/features/haru/HaruChat';
import { STAGE1_QUESTIONS } from '@/features/haru/script';
import { saveStageAnswers } from '@/features/haru/store';
import { useAnswerRecorder } from '@/features/haru/useAnswerRecorder';
import { useHaruTalk } from '@/features/haru/useHaruTalk';

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

/* ── result view  ────────────────────── */

function ResultView({ result, onReset }: { result: AnalyzeResult; onReset: () => void }) {
  const navigate = useNavigate();
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
        ↺ 하루와 다시 이야기하기
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

      <Button fullWidth radius="md" onClick={() => navigate('/face')}>
        2단계 하루와 영상 통화하러 가기 →
      </Button>
    </Stack>
  );
}

/* ── 하루와 목소리 대화 (경량 웹 1단계에서 가져옴) ─────────────────── */

/** 하루와 대화하면서, 사용자가 말하는 구간만 이어 녹음해 둔다. 대화가 끝나면 녹음 파일을 넘긴다. */
function HaruVoiceTalk({ onFinished }: { onFinished: (rec: { file: File; spokenSec: number } | null) => void }) {
  const finishRef = useRef<ReturnType<typeof useAnswerRecorder>['finish'] | null>(null);
  const talk = useHaruTalk(STAGE1_QUESTIONS, (answers) => {
    saveStageAnswers(1, answers);
    void (finishRef.current?.() ?? Promise.resolve(null)).then(onFinished);
  });
  const recorder = useAnswerRecorder(talk.phase === 'listen');
  finishRef.current = recorder.finish;

  return (
    <Panel>
      <HaruChat talk={talk} />
      {recorder.error && (
        <Alert color="gray" variant="light" mt={12} p="xs" fz={13}>
          마이크를 쓸 수 없어서 목소리 분석은 못 해요. 대화는 계속할 수 있어요.
        </Alert>
      )}
    </Panel>
  );
}

/* ── page ────────────────────────────────────────────────── */

export default function VoiceStage() {
  const [calibration, setCalibration] = useState<CalibrationResult | null>(null);
  // 하루와 대화를 마쳤는지, 녹음이 비었는지(마이크를 못 썼거나 대답을 다 넘김)
  const [talkDone, setTalkDone] = useState(false);
  const [noAudio, setNoAudio] = useState(false);
  const [talkKey, setTalkKey] = useState(0);
  const analyze = useAnalyze();
  const result = analyze.data ?? null;

  useEffect(() => {
    if (result) localProgress.markStage1Done(overallScore(result.scores));
  }, [result]);

  const reset = () => {
    setCalibration(null);
    setTalkDone(false);
    setNoAudio(false);
    setTalkKey((k) => k + 1);
    analyze.reset();
  };

  const handleTalkFinished = (rec: { file: File; spokenSec: number } | null) => {
    setTalkDone(true);
    if (!rec) return setNoAudio(true);
    analyze.mutate({ file: rec.file, calibration });
  };

  return (
    <Box style={{ minHeight: '100dvh', background: 'var(--rb-bg)', paddingBottom: 60 }}>
      <PageHeader
        back="/dashboard"
        eyebrow="1단계 · 하루와 목소리 대화"
        title="보이스 터치"
        subtitle="하루와 편하게 이야기하면, 대답한 목소리를 5가지 지표로 살펴보고 함께 연습할 부분을 짚어줍니다."
      />

      <Box style={{ maxWidth: MAXW, margin: '0 auto', padding: '20px 16px 0' }}>
        {result ? (
          <ResultView result={result} onReset={reset} />
        ) : !calibration ? (
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

            <Alert color="brand" variant="light" p="sm" fz={13}>
              하루가 대답에 맞춰 반응할 수 있게, 대답은 글로 받아써서(크롬은 Google 음성 인식 사용) AI로 보내요.
              대답 목소리는 분석에만 쓰고 저장하지 않아요. 하루와 나눈 이야기는 3단계 면접 질문을 만들 때 쓰도록 이
              기기에만 남겨 두고, 3단계 시작 화면에서 언제든 지울 수 있어요.
            </Alert>

            <SectionLabel>마이크 캘리브레이션</SectionLabel>
            <Panel>
              <CalibrationStep onComplete={setCalibration} />
            </Panel>
          </Stack>
        ) : (
          <Stack gap={20}>
            <SectionLabel>하루와 이야기하기</SectionLabel>
            {!talkDone ? (
              <HaruVoiceTalk key={talkKey} onFinished={handleTalkFinished} />
            ) : (
              <Panel>
                <Stack gap={12} align="center" ta="center">
                  <Text fz={17} fw={700}>
                    1단계를 마쳤어요
                  </Text>
                  <Text fz={13} c="var(--rb-ink-soft)">
                    목소리로 질문 {STAGE1_QUESTIONS.length}개를 끝까지 마쳤어요.
                  </Text>
                  {analyze.isPending && (
                    <>
                      <LoadingBar label="대답한 목소리 살펴보는 중" />
                      <Text fz={12} c="var(--rb-ink-faint)">
                        30초~2분 정도 걸려요
                      </Text>
                    </>
                  )}
                  {(noAudio || analyze.isError) && (
                    <>
                      <Alert color="red" variant="light" p="xs" fz={13}>
                        {noAudio
                          ? '녹음된 대답이 없어서 목소리를 살펴보지 못했어요.'
                          : analyze.error instanceof ApiError
                            ? analyze.error.message
                            : '서버에 연결할 수 없어요. 잠시 뒤에 다시 해 주세요.'}
                      </Alert>
                      <Button variant="default" radius="md" onClick={reset}>
                        ↺ 하루와 다시 이야기하기
                      </Button>
                    </>
                  )}
                </Stack>
              </Panel>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
}