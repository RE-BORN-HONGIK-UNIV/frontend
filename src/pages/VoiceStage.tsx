import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  LoadingBar,
  Paper,
  Stack,
  Text,
} from '@/components/ui';
import { StageHeader } from '@/components/StageHeader';
import { ApiError } from '@/lib/api/client';
import type { CalibrationResult } from '@/lib/api/types';
import { GUIDE_ITEMS } from '@/features/voice/constants';
import { overallScore } from '@/features/voice/feedback';
import { localProgress } from '@/features/progress/localProgress';
import { useAnalyze } from '@/features/voice/queries';
import { saveStage1Detail } from '@/features/report/stageDetails';
import { CalibrationStep, CheckRow } from '@/features/voice/CalibrationStep';
import { GuideChecklist } from '@/features/voice/GuideChecklist';
import { HaruChat } from '@/features/haru/HaruChat';
import { linkStyle } from '@/features/haru/styles';
import { STAGE1_QUESTIONS } from '@/features/haru/script';
import { saveStageAnswers } from '@/features/haru/store';
import { useAnswerRecorder } from '@/features/haru/useAnswerRecorder';
import { useHaruTalk } from '@/features/haru/useHaruTalk';

const MAXW = 720;
/** 하루와 대화하는 동안은 경량 웹처럼 하루 칸 + 대화 칸 두 칸이라 더 넓게 */
const TALK_MAXW = 1180;

function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3z" />
    </svg>
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
    <Stack gap={12}>
      {recorder.error && (
        <Alert color="gray" variant="light" p="xs" fz={13}>
          마이크를 쓸 수 없어서 목소리 분석은 못 해요. 대화는 계속할 수 있어요.
        </Alert>
      )}
      <HaruChat talk={talk} />
    </Stack>
  );
}

/* ── page ────────────────────────────────────────────────── */

export default function VoiceStage() {
  // checked: 마이크 확인(캘리브레이션)이 끝난 값, calibration: "1단계 시작하기"를 눌러 대화에 넘긴 값
  const [checked, setChecked] = useState<CalibrationResult | null>(null);
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
    setChecked(null);
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
      <StageHeader current={1} />

      <Box style={{ maxWidth: calibration && !talkDone ? TALK_MAXW : MAXW, margin: '0 auto', padding: '40px 16px 0' }}>
        {!calibration ? (
          <Stack gap={16}>
            {/* 위: 가장 중요한 체크리스트 3개 */}
            <GuideChecklist items={GUIDE_ITEMS} />

            {/* 아래: 경량 웹 1단계 시작 화면 — 마이크 확인(캘리브레이션) + 개인정보 안내 + 시작 버튼 */}
            <Box
              style={{
                background: 'var(--rb-surface)',
                border: '1px solid var(--rb-line)',
                borderRadius: 24,
                padding: 'clamp(22px, 5vw, 40px)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.05)',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontFamily: 'var(--rb-font-display)',
                  fontSize: 'clamp(24px, 4.5vw, 34px)',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: 'var(--rb-ink)',
                }}
              >
                시작하기 전에 <span style={{ color: 'var(--rb-primary)' }}>마이크</span>만 확인할게요
              </h2>
              <Text fz={15} c="var(--rb-ink-soft)" mt={10}>
                브라우저가 마이크를 써도 되는지 물어보면 &quot;허용&quot;을 눌러 주세요. 크롬·엣지에서 가장 잘 돼요.
              </Text>

              <Stack gap={12} mt={24}>
                <CalibrationStep onComplete={setChecked} />
                <CheckRow icon={<ShieldIcon />} title="녹음은 분석이 끝나면 바로 지워요">
                  <Text fz={13} c="var(--rb-ink-soft)" mt={4} style={{ lineHeight: 1.6 }}>
                    하루가 대답에 맞춰 반응할 수 있게 대답은 글로 받아써서(크롬은 Google 음성 인식) AI로 보내요. 하루와 나눈
                    이야기는 3단계 면접 질문을 만들 때 쓰도록 이 기기에만 남고, 3단계 시작 화면에서 지울 수 있어요. 카메라는
                    2단계에서 따로 물어볼게요.
                  </Text>
                </CheckRow>
              </Stack>

              <Box mt={24} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <Text fz={13} c="var(--rb-ink-soft)">
                  하루의 질문 {STAGE1_QUESTIONS.length}개 · 5분쯤 걸려요
                </Text>
                <Button radius="md" size="lg" disabled={!checked} onClick={() => checked && setCalibration(checked)}>
                  1단계 시작하기
                </Button>
              </Box>
              {!checked && (
                <Text fz={12} c="var(--rb-ink-faint)" mt={8} ta="right">
                  마이크 확인을 마치면 시작할 수 있어요.
                </Text>
              )}
            </Box>
          </Stack>
        ) : (
          <Stack gap={20}>
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