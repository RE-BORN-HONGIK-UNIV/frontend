import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  LoadingBar,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { ApiError } from '@/lib/api/client';
import type { CalibrationResult } from '@/lib/api/types';
import { GUIDE_ITEMS } from '@/features/voice/constants';
import { overallScore } from '@/features/voice/feedback';
import { localProgress } from '@/features/progress/localProgress';
import { useAnalyze } from '@/features/voice/queries';
import { saveStage1Detail } from '@/features/report/stageDetails';
import { CalibrationStep } from '@/features/voice/CalibrationStep';
import { HaruChat } from '@/features/haru/HaruChat';
import { linkStyle } from '@/features/haru/styles';
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

/* ── 하루와 목소리 대화 (경량 웹 1단계에서 가져옴) ─────────────────── */

/** 하루와 대화하면서, 사용자가 말하는 구간만 이어 녹음해 둔다. 대화가 끝나면 녹음 파일을 넘긴다. */
type TalkRecording = Awaited<ReturnType<ReturnType<typeof useAnswerRecorder>['finish']>>;

function HaruVoiceTalk({ onFinished }: { onFinished: (rec: TalkRecording) => void }) {
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
  const navigate = useNavigate();
  const result = analyze.data ?? null;
  const turnStartsRef = useRef<number[]>([]);

  // 분석이 끝나면: 대시보드용 완료 메모 + 최종 리포트(3단계 뒤)에 쓸 세부값을 이 기기에 남긴다.
  // 1단계 결과는 여기서 따로 보여 주지 않고 3단계 뒤 통합 리포트에서 한 번에 보여 준다(경량 웹 흐름).
  useEffect(() => {
    if (!result) return;
    localProgress.markStage1Done(overallScore(result.scores));
    saveStage1Detail(result, turnStartsRef.current);
  }, [result]);

  const reset = () => {
    setCalibration(null);
    setTalkDone(false);
    setNoAudio(false);
    setTalkKey((k) => k + 1);
    analyze.reset();
  };

  const handleTalkFinished = (rec: TalkRecording) => {
    setTalkDone(true);
    if (!rec) return setNoAudio(true);
    turnStartsRef.current = rec.turnStarts;
    analyze.mutate({ file: rec.file, calibration });
  };

  return (
    <Box style={{ minHeight: '100dvh', background: 'var(--rb-bg)', paddingBottom: 60 }}>
      <PageHeader
        eyebrow="1단계 · 하루와 목소리 대화"
        title="보이스 터치"
        subtitle="하루와 편하게 이야기해요. 대답한 목소리는 3단계까지 마친 뒤 최종 리포트에서 함께 살펴봐요."
      />

      <Box style={{ maxWidth: MAXW, margin: '0 auto', padding: '20px 16px 0' }}>
        {!calibration ? (
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
                      <LoadingBar label="대답한 목소리 정리하는 중" />
                      <Text fz={12} c="var(--rb-ink-faint)">
                        30초~2분 정도 걸려요. 결과는 3단계를 마친 뒤 최종 리포트에서 함께 보여 드려요.
                      </Text>
                    </>
                  )}
                  {result && (
                    <>
                      <Text fz={13} c="var(--rb-ink-soft)">
                        목소리 정리가 끝났어요. 결과는 3단계를 마친 뒤 최종 리포트에서 함께 보여 드려요.
                      </Text>
                      <Button radius="md" onClick={() => navigate('/face')}>
                        2단계 하루와 영상 통화하러 가기 →
                      </Button>
                      <button type="button" onClick={reset} style={linkStyle}>
                        하루와 다시 이야기할래요
                      </button>
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